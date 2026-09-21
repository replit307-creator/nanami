import postgres from "postgres";
import type { State } from "../types";

const connectionString = process.env["DATABASE_URL"];

export const sql = connectionString
  ? postgres(connectionString, {
      ssl: connectionString.includes("sslmode=") ? false : "prefer",
      max: 10,
      idle_timeout: 20,
      connect_timeout: 2,
    })
  : null;

let isInitialized: boolean | null = null;
let lastInitAttempt = 0;
let initPromise: Promise<boolean> | null = null;

export function isDbReady(): boolean {
  return isInitialized === true;
}

export async function initDb(): Promise<boolean> {
  if (!sql) {
    return false;
  }

  if (isInitialized === true) {
    return true;
  }

  // If previous attempt failed recently (< 4 seconds ago), return false quickly to prevent blocking
  if (isInitialized === false && Date.now() - lastInitAttempt < 4000) {
    return false;
  }

  if (initPromise) {
    return initPromise;
  }

  lastInitAttempt = Date.now();

  initPromise = (async () => {
    try {
      if (typeof window === "undefined") {
        try {
          const { ensurePostgresService } = await import("../server/pg-service");
          await ensurePostgresService();
        } catch (err) {
          console.debug("Could not ensure postgres service in db.ts:", err);
        }
      }

      // Test the connection quickly first with a 3-second timeout
      const pingPromise = sql`SELECT 1`;
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("PostgreSQL connection timeout")), 3000),
      );
      await Promise.race([pingPromise, timeoutPromise]);

      // 1. Create tables
      await sql`
        CREATE TABLE IF NOT EXISTS app_settings (
          id VARCHAR(50) PRIMARY KEY,
          data JSONB NOT NULL
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS cms_content (
          id VARCHAR(50) PRIMARY KEY,
          data JSONB NOT NULL
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS menu_items (
          id VARCHAR(50) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          price NUMERIC NOT NULL,
          category VARCHAR(100) NOT NULL,
          image TEXT,
          available BOOLEAN NOT NULL DEFAULT TRUE,
          prep_minutes INTEGER NOT NULL DEFAULT 15,
          badges JSONB NOT NULL DEFAULT '[]'::jsonb,
          stock INTEGER,
          groups JSONB NOT NULL DEFAULT '[]'::jsonb,
          special_request_enabled BOOLEAN NOT NULL DEFAULT TRUE
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS orders (
          id VARCHAR(50) PRIMARY KEY,
          code VARCHAR(50) NOT NULL UNIQUE,
          created_at BIGINT NOT NULL,
          type VARCHAR(20) NOT NULL,
          lines JSONB NOT NULL,
          subtotal NUMERIC NOT NULL,
          discount NUMERIC NOT NULL,
          voucher_code VARCHAR(50),
          delivery_fee NUMERIC NOT NULL,
          total NUMERIC NOT NULL,
          status VARCHAR(50) NOT NULL,
          paid BOOLEAN NOT NULL DEFAULT FALSE,
          payment_method VARCHAR(100) NOT NULL,
          points_earned INTEGER NOT NULL DEFAULT 0,
          eta_minutes INTEGER NOT NULL DEFAULT 15,
          customer JSONB NOT NULL,
          account_id VARCHAR(50)
        )
      `;

      // Ensure non-destructive backward-compatible column migrations
      await sql`
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS account_id VARCHAR(50);
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS promos (
          id VARCHAR(50) PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          subtitle TEXT NOT NULL,
          badge VARCHAR(100) NOT NULL,
          image_url TEXT,
          link TEXT,
          active BOOLEAN NOT NULL DEFAULT TRUE
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS vouchers (
          code VARCHAR(50) PRIMARY KEY,
          type VARCHAR(20) NOT NULL,
          value NUMERIC NOT NULL,
          min_spend NUMERIC NOT NULL,
          active BOOLEAN NOT NULL DEFAULT TRUE
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS media_assets (
          id VARCHAR(50) PRIMARY KEY,
          url TEXT NOT NULL,
          filename VARCHAR(255) NOT NULL,
          uploaded_at BIGINT NOT NULL,
          used_by_menu_ids JSONB NOT NULL DEFAULT '[]'::jsonb
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS accounts (
          id VARCHAR(50) PRIMARY KEY,
          email VARCHAR(255) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          phone VARCHAR(100) NOT NULL,
          role VARCHAR(20) NOT NULL DEFAULT 'user',
          address TEXT,
          addresses JSONB NOT NULL DEFAULT '[]'::jsonb,
          points INTEGER NOT NULL DEFAULT 0
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS staff (
          id VARCHAR(50) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          phone VARCHAR(100) NOT NULL,
          role VARCHAR(50) NOT NULL,
          active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at BIGINT NOT NULL
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS user_sessions (
          id VARCHAR(100) PRIMARY KEY,
          account_id VARCHAR(50) NOT NULL,
          email VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL,
          created_at BIGINT NOT NULL,
          expires_at BIGINT NOT NULL
        )
      `;

      await syncEnvAccounts();

      console.log("PostgreSQL tables checked/created successfully.");
      isInitialized = true;
      return true;
    } catch (error) {
      // PostgreSQL is unreachable or offline in this environment.
      // Fall back silently to the default state/in-memory store.
      console.warn(
        "PostgreSQL not accessible, using in-memory store fallback:",
        (error as Error)?.message || error,
      );
      isInitialized = false;
      return false;
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

export async function syncEnvAccounts() {
  if (!sql) return;
  try {
    const envAccounts = [
      process.env["OWNER_EMAIL"] && process.env["OWNER_PASSWORD"]
        ? {
            id: "env-owner",
            email: process.env["OWNER_EMAIL"].trim().toLowerCase(),
            password: process.env["OWNER_PASSWORD"],
            name: "Nanami Owner",
            phone: "+264811234567",
            role: "owner",
            address: "Nanami Kitchen HQ, Independence Ave, Windhoek, Namibia",
            addresses: ["Nanami Kitchen HQ, Independence Ave, Windhoek, Namibia"],
            points: 1500,
          }
        : null,
      process.env["ADMIN_EMAIL"] && process.env["ADMIN_PASSWORD"]
        ? {
            id: "env-admin",
            email: process.env["ADMIN_EMAIL"].trim().toLowerCase(),
            password: process.env["ADMIN_PASSWORD"],
            name: "Kitchen Admin",
            phone: "0823456789",
            role: "admin",
            address: "Kitchen 1, Nanami Kitchen",
            addresses: ["Kitchen 1, Nanami Kitchen"],
            points: 120,
          }
        : null,
      process.env["STAFF_EMAIL"] && process.env["STAFF_PASSWORD"]
        ? {
            id: "env-staff",
            email: process.env["STAFF_EMAIL"].trim().toLowerCase(),
            password: process.env["STAFF_PASSWORD"],
            name: "Kitchen Staff",
            phone: "0812-5555-6666",
            role: "staff",
            address: "Nanami Kitchen Line 1",
            addresses: ["Nanami Kitchen Line 1"],
            points: 0,
          }
        : null,
    ].filter(Boolean);

    for (const acc of envAccounts) {
      if (!acc) continue;
      await sql`
        INSERT INTO accounts (id, email, password, name, phone, role, address, addresses, points)
        VALUES (${acc.id}, ${acc.email}, ${acc.password}, ${acc.name}, ${acc.phone}, ${acc.role}, ${acc.address}, ${sql.json(acc.addresses)}, ${acc.points})
        ON CONFLICT (email) DO UPDATE SET
          password = EXCLUDED.password,
          role = EXCLUDED.role,
          name = EXCLUDED.name
      `;
      await sql`
        INSERT INTO staff (id, name, email, phone, role, active, created_at)
        VALUES (${acc.id}, ${acc.name}, ${acc.email}, ${acc.phone}, ${acc.role}, true, ${Date.now()})
        ON CONFLICT (email) DO UPDATE SET
          role = EXCLUDED.role,
          name = EXCLUDED.name,
          active = true
      `;
    }
  } catch (err) {
    console.warn("Could not sync env account into db:", err);
  }
}

export async function seedDbIfEmpty(defaultState: Partial<State>) {
  if (!sql) return;

  try {
    // Seed Settings
    if (defaultState.settings) {
      const settingsCount = (await sql`SELECT COUNT(*) FROM app_settings`) as any[];
      if (parseInt(settingsCount[0]?.count || "0") === 0) {
        await sql`
          INSERT INTO app_settings (id, data) 
          VALUES ('main_settings', ${sql.json(defaultState.settings)})
        `;
        console.log("Seeded app_settings.");
      }
    }

    // Seed CMS
    if (defaultState.cms) {
      const cmsCount = (await sql`SELECT COUNT(*) FROM cms_content`) as any[];
      if (parseInt(cmsCount[0]?.count || "0") === 0) {
        await sql`
          INSERT INTO cms_content (id, data) 
          VALUES ('main_cms', ${sql.json(defaultState.cms)})
        `;
        console.log("Seeded cms_content.");
      }
    }

    // Seed Menu
    if (defaultState.menu && defaultState.menu.length > 0) {
      const menuCount = (await sql`SELECT COUNT(*) FROM menu_items`) as any[];
      if (parseInt(menuCount[0]?.count || "0") === 0) {
        for (const item of defaultState.menu) {
          await sql`
            INSERT INTO menu_items (id, name, description, price, category, image, available, prep_minutes, badges, stock, groups)
            VALUES (
              ${item.id}, 
              ${item.name}, 
              ${item.description}, 
              ${item.price}, 
              ${item.category}, 
              ${item.image}, 
              ${item.available}, 
              ${item.prepMinutes}, 
              ${sql.json(item.badges)}, 
              ${item.stock || null}, 
              ${sql.json(item.groups)}
            )
          `;
        }
        console.log("Seeded menu_items.");
      }
    }

    // Seed Promos
    if (defaultState.promos && defaultState.promos.length > 0) {
      const promosCount = (await sql`SELECT COUNT(*) FROM promos`) as any[];
      if (parseInt(promosCount[0]?.count || "0") === 0) {
        for (const promo of defaultState.promos) {
          await sql`
            INSERT INTO promos (id, title, subtitle, badge, image_url, link, active)
            VALUES (${promo.id}, ${promo.title}, ${promo.subtitle}, ${promo.badge}, ${promo.imageUrl || null}, ${promo.link || null}, ${promo.active ?? true})
          `;
        }
        console.log("Seeded promos.");
      }
    }

    // Seed Vouchers
    if (defaultState.vouchers && defaultState.vouchers.length > 0) {
      const vouchersCount = (await sql`SELECT COUNT(*) FROM vouchers`) as any[];
      if (parseInt(vouchersCount[0]?.count || "0") === 0) {
        for (const v of defaultState.vouchers) {
          await sql`
            INSERT INTO vouchers (code, type, value, min_spend, active)
            VALUES (${v.code}, ${v.type}, ${v.value}, ${v.minSpend}, ${v.active})
          `;
        }
        console.log("Seeded vouchers.");
      }
    }

    // Seed Accounts
    if (defaultState.accounts && defaultState.accounts.length > 0) {
      const accountsCount = (await sql`SELECT COUNT(*) FROM accounts`) as any[];
      if (parseInt(accountsCount[0]?.count || "0") === 0) {
        for (const acc of defaultState.accounts) {
          await sql`
            INSERT INTO accounts (id, email, password, name, phone, role, address, addresses, points)
            VALUES (${acc.id}, ${acc.email}, ${acc.password}, ${acc.name}, ${acc.phone}, ${acc.role || "user"}, ${acc.address || null}, ${sql.json(acc.addresses || [])}, ${acc.points || 0})
          `;
        }
        console.log("Seeded accounts.");
      }
    }

    // Seed Staff
    if (defaultState.staff && defaultState.staff.length > 0) {
      const staffCount = (await sql`SELECT COUNT(*) FROM staff`) as any[];
      if (parseInt(staffCount[0]?.count || "0") === 0) {
        for (const st of defaultState.staff) {
          await sql`
            INSERT INTO staff (id, name, email, phone, role, active, created_at)
            VALUES (${st.id}, ${st.name}, ${st.email}, ${st.phone}, ${st.role}, ${st.active}, ${st.createdAt})
          `;
        }
        console.log("Seeded staff.");
      }
    }
  } catch (error) {
    console.error("Failed to seed database:", error);
  }
}

export async function createSessionDb(account: {
  id: string;
  email: string;
  role: string;
}): Promise<string | null> {
  if (!sql) return null;
  try {
    const token = "sess_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
    await sql`
      INSERT INTO user_sessions (id, account_id, email, role, created_at, expires_at)
      VALUES (${token}, ${account.id}, ${account.email}, ${account.role || "user"}, ${Date.now()}, ${expiresAt})
    `;
    return token;
  } catch (err) {
    console.warn("Failed to create session in PostgreSQL:", err);
    return null;
  }
}

export async function getSessionProfileDb(token: string) {
  if (!sql || !token) return null;
  try {
    const rows = (await sql`
      SELECT s.id as session_id, s.role, s.email, a.id as account_id, a.name, a.phone, a.address, a.addresses, a.points
      FROM user_sessions s
      JOIN accounts a ON a.id = s.account_id
      WHERE s.id = ${token} AND s.expires_at > ${Date.now()}
      LIMIT 1
    `) as any[];
    if (rows.length > 0) {
      const r = rows[0];
      return {
        signedIn: true,
        name: r.name,
        email: r.email,
        phone: r.phone,
        role: r.role as "user" | "admin" | "owner" | "staff",
        address: r.address || "",
        addresses: Array.isArray(r.addresses) ? r.addresses : [],
        points: r.points !== undefined ? Number(r.points) : 0,
        method: "Session",
      };
    }
    return null;
  } catch (err) {
    console.warn("Failed to retrieve session from PostgreSQL:", err);
    return null;
  }
}

export async function deleteSessionDb(token: string): Promise<boolean> {
  if (!sql || !token) return false;
  try {
    await sql`DELETE FROM user_sessions WHERE id = ${token}`;
    return true;
  } catch (err) {
    console.warn("Failed to delete session from PostgreSQL:", err);
    return false;
  }
}
