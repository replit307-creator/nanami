import { createServerFn } from "@tanstack/react-start";
import type {
  MenuItem,
  Order,
  Voucher,
  Promo,
  Account,
  StaffMember,
  Settings,
  CmsContent,
  MediaAsset,
} from "../types";

async function getDb() {
  const { sql, initDb, seedDbIfEmpty } = await import("./db");
  return { sql, initDb, seedDbIfEmpty };
}

export function getEnvAccounts(): Account[] {
  const accounts: Account[] = [];
  const envOwnerEmail = process.env["OWNER_EMAIL"]?.trim().toLowerCase();
  const envOwnerPass = process.env["OWNER_PASSWORD"];
  if (envOwnerEmail && envOwnerPass) {
    accounts.push({
      id: "env-owner",
      email: envOwnerEmail,
      password: envOwnerPass,
      name: "Nanami Owner",
      phone: "0834567890",
      role: "owner",
      address: "HQ Nanami Kitchen, Jakarta",
      addresses: ["HQ Nanami Kitchen, Jakarta"],
      points: 1500,
    });
  }

  const envAdminEmail = process.env["ADMIN_EMAIL"]?.trim().toLowerCase();
  const envAdminPass = process.env["ADMIN_PASSWORD"];
  if (envAdminEmail && envAdminPass) {
    accounts.push({
      id: "env-admin",
      email: envAdminEmail,
      password: envAdminPass,
      name: "Kitchen Admin",
      phone: "0823456789",
      role: "admin",
      address: "Kitchen 1, Nanami Kitchen",
      addresses: ["Kitchen 1, Nanami Kitchen"],
      points: 120,
    });
  }

  const envStaffEmail = process.env["STAFF_EMAIL"]?.trim().toLowerCase();
  const envStaffPass = process.env["STAFF_PASSWORD"];
  if (envStaffEmail && envStaffPass) {
    accounts.push({
      id: "env-staff",
      email: envStaffEmail,
      password: envStaffPass,
      name: "Kitchen Staff",
      phone: "0812-5555-6666",
      role: "staff",
      address: "Nanami Kitchen Line 1",
      addresses: ["Nanami Kitchen Line 1"],
      points: 0,
    });
  }

  return accounts;
}

export const loginServerFn = createServerFn({ method: "POST" })
  .validator((d: { email: string; password: string }) => d)
  .handler(async ({ data }) => {
    const cleanEmail = data.email.trim().toLowerCase();
    const cleanPassword = data.password;

    // 1. Check process.env accounts
    const envAccounts = getEnvAccounts();
    const envMatch = envAccounts.find(
      (a) => a.email.toLowerCase() === cleanEmail && a.password === cleanPassword,
    );
    if (envMatch) {
      return { ok: true, account: envMatch };
    }

    // 2. Check PostgreSQL database
    const { sql, createSessionDb, getSessionProfileDb } = await getDb();
    if (sql) {
      try {
        const rows = (await sql`
          SELECT * FROM accounts 
          WHERE LOWER(email) = ${cleanEmail} AND password = ${cleanPassword} 
          LIMIT 1
        `) as any[];
        if (rows.length > 0) {
          const a = rows[0];
          const account = {
            id: a.id,
            email: a.email,
            password: a.password,
            name: a.name,
            phone: a.phone,
            role: (a.role || "user") as "user" | "admin" | "owner" | "staff",
            address: a.address,
            addresses: a.addresses || [],
            points: a.points || 0,
          };
          const token = await createSessionDb(account);
          return {
            ok: true,
            account,
            token,
          };
        }
      } catch (err) {
        console.warn("DB login lookup failed:", err);
      }
    }

    // 3. Check seed accounts
    const { seedAccounts } = await import("./seed-data");
    const seedMatch = seedAccounts.find(
      (a) => a.email.toLowerCase() === cleanEmail && a.password === cleanPassword,
    );
    if (seedMatch) {
      const account = seedMatch as unknown as Account;
      const token = await createSessionDb(account);
      return { ok: true, account, token };
    }

    return { ok: false, error: "Invalid email or password." };
  });

export const logoutServerFn = createServerFn({ method: "POST" })
  .validator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    const { deleteSessionDb } = await import("./db");
    await deleteSessionDb(data.token);
    return { ok: true };
  });

export const getDatabaseState = createServerFn({ method: "POST" })
  .validator((data?: { sessionToken?: string }) => data)
  .handler(async ({ data }) => {
    const envAccounts = getEnvAccounts();
    const { getStorageData } = await import("../server/persistent-storage");
    const fallback = getStorageData();

    const { sql, initDb, seedDbIfEmpty, getSessionProfileDb } = await getDb();
    if (!sql) {
      const mergedAccounts: Account[] = [...envAccounts];
      for (const sa of fallback.accounts) {
        if (!mergedAccounts.some((a) => a.email.toLowerCase() === sa.email.toLowerCase())) {
          mergedAccounts.push(sa);
        }
      }
      return {
        ...fallback,
        accounts: mergedAccounts,
        activeProfile: null,
      };
    }
    try {
      const ok = await initDb();
      if (!ok) {
        const mergedAccounts: Account[] = [...envAccounts];
        for (const sa of fallback.accounts) {
          if (!mergedAccounts.some((a) => a.email.toLowerCase() === sa.email.toLowerCase())) {
            mergedAccounts.push(sa);
          }
        }
        return {
          ...fallback,
          accounts: mergedAccounts,
          activeProfile: null,
        };
      }

      // Seed default if database is freshly created and has no records
      await seedDbIfEmpty(fallback as any);

      const [settings, cms, menu, orders, promos, vouchers, accounts, staff, media] =
        await Promise.all([
          sql`SELECT data FROM app_settings WHERE id = 'main_settings' LIMIT 1` as Promise<any[]>,
          sql`SELECT data FROM cms_content WHERE id = 'main_cms' LIMIT 1` as Promise<any[]>,
          sql`SELECT * FROM menu_items ORDER BY id` as Promise<any[]>,
          sql`SELECT * FROM orders ORDER BY created_at DESC` as Promise<any[]>,
          sql`SELECT * FROM promos ORDER BY id` as Promise<any[]>,
          sql`SELECT * FROM vouchers ORDER BY code` as Promise<any[]>,
          sql`SELECT * FROM accounts ORDER BY id` as Promise<any[]>,
          sql`SELECT * FROM staff ORDER BY created_at DESC` as Promise<any[]>,
          sql`SELECT * FROM media_assets ORDER BY uploaded_at DESC` as Promise<any[]>,
        ]);

      let activeProfile = null;
      if (data?.sessionToken) {
        activeProfile = await getSessionProfileDb(data.sessionToken);
      }

      const mappedAccounts: Account[] = accounts.map((a) => ({
        id: a.id,
        email: a.email,
        password: a.password,
        name: a.name,
        phone: a.phone,
        role: a.role,
        address: a.address,
        addresses: a.addresses,
        points: a.points,
      }));

      const mergedAccounts: Account[] = [...envAccounts];
      for (const a of mappedAccounts) {
        if (!mergedAccounts.some((ea) => ea.email.toLowerCase() === a.email.toLowerCase())) {
          mergedAccounts.push(a);
        }
      }

      return {
        settings: settings[0]?.data ?? fallback.settings,
        cms: cms[0]?.data ?? fallback.cms,
        menu: menu.map((m) => ({
          id: m.id,
          name: m.name,
          description: m.description,
          price: Number(m.price),
          category: m.category,
          image: m.image,
          available: m.available,
          prepMinutes: m.prep_minutes !== undefined ? Number(m.prep_minutes) : 15,
          badges: Array.isArray(m.badges) ? m.badges : [],
          stock: m.stock !== null && m.stock !== undefined ? Number(m.stock) : null,
          groups: Array.isArray(m.groups) ? m.groups : [],
          specialRequestEnabled:
            m.special_request_enabled !== undefined ? Boolean(m.special_request_enabled) : true,
        })),
        orders: orders.map((o) => ({
          id: o.id,
          code: o.code,
          createdAt: Number(o.created_at),
          type: o.type,
          lines: o.lines,
          subtotal: Number(o.subtotal),
          discount: Number(o.discount),
          voucherCode: o.voucher_code,
          deliveryFee: Number(o.delivery_fee),
          total: Number(o.total),
          status: o.status,
          paid: o.paid,
          paymentMethod: o.payment_method,
          pointsEarned: o.points_earned,
          etaMinutes: o.eta_minutes,
          customer: o.customer,
          accountId: o.account_id || null,
        })),
        promos: promos.map((p) => ({
          id: p.id,
          title: p.title,
          subtitle: p.subtitle,
          badge: p.badge,
          imageUrl: p.image_url,
          link: p.link,
          active: p.active,
        })),
        vouchers: vouchers.map((v) => ({
          code: v.code,
          type: v.type,
          value: Number(v.value),
          minSpend: Number(v.min_spend),
          active: v.active,
        })),
        accounts: mergedAccounts,
        staff: staff.map((s) => ({
          id: s.id,
          name: s.name,
          email: s.email,
          phone: s.phone,
          role: s.role,
          active: s.active,
          createdAt: Number(s.created_at),
        })),
        mediaAssets: media.map((m) => ({
          id: m.id,
          url: m.url,
          filename: m.filename,
          uploadedAt: Number(m.uploaded_at),
          usedByMenuIds: m.used_by_menu_ids || [],
        })),
        activeProfile,
      };
    } catch (error) {
      console.warn(
        "Error fetching state from PostgreSQL database (using persistent storage fallback):",
        error,
      );
      const mergedAccounts: Account[] = [...envAccounts];
      for (const sa of fallback.accounts) {
        if (!mergedAccounts.some((a) => a.email.toLowerCase() === sa.email.toLowerCase())) {
          mergedAccounts.push(sa);
        }
      }
      return {
        ...fallback,
        accounts: mergedAccounts,
        activeProfile: null,
      };
    }
  });

export const saveMenuItemDb = createServerFn({ method: "POST" })
  .validator((item: MenuItem) => item)
  .handler(async ({ data: item }) => {
    // 1. Always persist to server storage first
    try {
      const { saveMenuItemStorage } = await import("../server/persistent-storage");
      saveMenuItemStorage(item);
    } catch (err) {
      console.error("Failed to save menu item to local storage:", err);
    }

    // 2. Persist to PostgreSQL if available
    const { sql } = await getDb();
    if (!sql) return { ok: true, source: "storage" };
    try {
      await sql`
        INSERT INTO menu_items (id, name, description, price, category, image, available, prep_minutes, badges, stock, groups, special_request_enabled)
        VALUES (
          ${item.id}, 
          ${item.name || ""}, 
          ${item.description || ""}, 
          ${Number(item.price) || 0}, 
          ${item.category || "Meals"}, 
          ${item.image || ""}, 
          ${item.available !== false}, 
          ${Number(item.prepMinutes) || 15}, 
          ${sql.json(item.badges || [])}, 
          ${item.stock !== undefined && item.stock !== null ? Number(item.stock) : null}, 
          ${sql.json(item.groups || [])},
          ${item.specialRequestEnabled !== false}
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          price = EXCLUDED.price,
          category = EXCLUDED.category,
          image = EXCLUDED.image,
          available = EXCLUDED.available,
          prep_minutes = EXCLUDED.prep_minutes,
          badges = EXCLUDED.badges,
          stock = EXCLUDED.stock,
          groups = EXCLUDED.groups,
          special_request_enabled = EXCLUDED.special_request_enabled
      `;
      return { ok: true, source: "database" };
    } catch (e) {
      console.warn("Failed to save menu item to PostgreSQL (fallback saved):", e);
      return { ok: true, source: "storage" };
    }
  });

export const deleteMenuItemDb = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    try {
      const { deleteMenuItemStorage } = await import("../server/persistent-storage");
      deleteMenuItemStorage(id);
    } catch (err) {
      console.error("Failed to delete menu item from local storage:", err);
    }

    const { sql } = await getDb();
    if (!sql) return { ok: true, source: "storage" };
    try {
      await sql`DELETE FROM menu_items WHERE id = ${id}`;
      return { ok: true, source: "database" };
    } catch (e) {
      console.warn("Failed to delete menu item from PostgreSQL (fallback deleted):", e);
      return { ok: true, source: "storage" };
    }
  });

async function isExistingOrder(orderId: string, orderCode?: string): Promise<boolean> {
  try {
    const { getStorageData } = await import("../server/persistent-storage");
    const current = getStorageData();
    if (current.orders.some((o) => o.id === orderId || (orderCode && o.code === orderCode))) {
      return true;
    }
  } catch (e) {
    // continue to database check
  }

  const { sql } = await getDb();
  if (sql) {
    try {
      const rows = await sql`
        SELECT id FROM orders 
        WHERE id = ${orderId} ${orderCode ? sql`OR code = ${orderCode}` : sql``}
        LIMIT 1
      `;
      if (rows && rows.length > 0) return true;
    } catch (e) {
      // continue
    }
  }

  return false;
}

async function getEffectiveServerSettings(): Promise<Settings> {
  try {
    const { sql } = await getDb();
    if (sql) {
      const rows = await sql`SELECT data FROM app_settings WHERE id = 'main_settings' LIMIT 1`;
      if (rows && rows.length > 0 && rows[0]?.data) {
        return rows[0].data as Settings;
      }
    }
  } catch (e) {
    // fallback
  }
  const { getStorageData } = await import("../server/persistent-storage");
  return getStorageData().settings;
}

export const saveOrderDb = createServerFn({ method: "POST" })
  .validator((order: Order) => order)
  .handler(async ({ data: order }) => {
    // 1. Determine if this is an existing order by checking if id or code is already in storage/DB
    const isExisting = await isExistingOrder(order.id, order.code);

    // 2. If it's a NEW order, enforce server-side validation: storeOpen and orderType availability
    if (!isExisting) {
      const currentSettings = await getEffectiveServerSettings();
      const { validateNewOrderSubmission } = await import("./order-availability");
      const validation = validateNewOrderSubmission(order.type, currentSettings);
      if (!validation.valid) {
        return { ok: false, error: validation.error, rejected: true };
      }
    }

    try {
      const { saveOrderStorage } = await import("../server/persistent-storage");
      saveOrderStorage(order);
    } catch (err) {
      console.error("Failed to save order to local storage:", err);
    }

    const { sql } = await getDb();
    if (!sql) return { ok: true, source: "storage" };
    try {
      await sql`
        INSERT INTO orders (id, code, created_at, type, lines, subtotal, discount, voucher_code, delivery_fee, total, status, paid, payment_method, points_earned, eta_minutes, customer, account_id)
        VALUES (
          ${order.id}, 
          ${order.code}, 
          ${order.createdAt}, 
          ${order.type}, 
          ${sql.json(order.lines)}, 
          ${order.subtotal}, 
          ${order.discount}, 
          ${order.voucherCode || null}, 
          ${order.deliveryFee}, 
          ${order.total}, 
          ${order.status}, 
          ${order.paid}, 
          ${order.paymentMethod}, 
          ${order.pointsEarned}, 
          ${order.etaMinutes}, 
          ${sql.json(order.customer)},
          ${order.accountId || null}
        )
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          paid = EXCLUDED.paid,
          eta_minutes = EXCLUDED.eta_minutes
      `;
      return { ok: true, source: "database" };
    } catch (e) {
      console.warn("Failed to save order to PostgreSQL (fallback saved):", e);
      return { ok: true, source: "storage" };
    }
  });

export const deleteOrderDb = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    try {
      const { deleteOrderStorage } = await import("../server/persistent-storage");
      deleteOrderStorage(id);
    } catch (err) {
      console.error("Failed to delete order from local storage:", err);
    }

    const { sql } = await getDb();
    if (!sql) return { ok: true, source: "storage" };
    try {
      await sql`DELETE FROM orders WHERE id = ${id}`;
      return { ok: true, source: "database" };
    } catch (e) {
      console.warn("Failed to delete order from PostgreSQL (fallback deleted):", e);
      return { ok: true, source: "storage" };
    }
  });

export const searchLocationsFn = createServerFn({ method: "POST" })
  .validator((data: { query: string }) => data)
  .handler(async ({ data }) => {
    const { searchPlacesNominatim } = await import("../server/location-service");
    const results = await searchPlacesNominatim(data.query);
    return { results };
  });

export const reverseGeocodeFn = createServerFn({ method: "POST" })
  .validator((data: { lat: number; lng: number }) => data)
  .handler(async ({ data }) => {
    const { reverseGeocodeNominatim } = await import("../server/location-service");
    const address = await reverseGeocodeNominatim(data.lat, data.lng);
    return { address };
  });

export const resolveMapsLinkFn = createServerFn({ method: "POST" })
  .validator((data: { url: string }) => data)
  .handler(async ({ data }) => {
    const { resolveGoogleMapsLink } = await import("../server/location-service");
    return await resolveGoogleMapsLink(data.url);
  });

export const saveVoucherDb = createServerFn({ method: "POST" })
  .validator((v: Voucher) => v)
  .handler(async ({ data: v }) => {
    try {
      const { saveVoucherStorage } = await import("../server/persistent-storage");
      saveVoucherStorage(v);
    } catch (err) {
      console.error("Failed to save voucher to local storage:", err);
    }

    const { sql } = await getDb();
    if (!sql) return { ok: true, source: "storage" };
    try {
      await sql`
        INSERT INTO vouchers (code, type, value, min_spend, active)
        VALUES (${v.code}, ${v.type}, ${v.value}, ${v.minSpend}, ${v.active})
        ON CONFLICT (code) DO UPDATE SET
          type = EXCLUDED.type,
          value = EXCLUDED.value,
          min_spend = EXCLUDED.min_spend,
          active = EXCLUDED.active
      `;
      return { ok: true, source: "database" };
    } catch (e) {
      console.warn("Failed to save voucher to PostgreSQL (fallback saved):", e);
      return { ok: true, source: "storage" };
    }
  });

export const deleteVoucherDb = createServerFn({ method: "POST" })
  .validator((code: string) => code)
  .handler(async ({ data: code }) => {
    try {
      const { deleteVoucherStorage } = await import("../server/persistent-storage");
      deleteVoucherStorage(code);
    } catch (err) {
      console.error("Failed to delete voucher from local storage:", err);
    }

    const { sql } = await getDb();
    if (!sql) return { ok: true, source: "storage" };
    try {
      await sql`DELETE FROM vouchers WHERE code = ${code}`;
      return { ok: true, source: "database" };
    } catch (e) {
      console.warn("Failed to delete voucher from PostgreSQL (fallback deleted):", e);
      return { ok: true, source: "storage" };
    }
  });

export const savePromoDb = createServerFn({ method: "POST" })
  .validator((p: Promo) => p)
  .handler(async ({ data: p }) => {
    try {
      const { savePromoStorage } = await import("../server/persistent-storage");
      savePromoStorage(p);
    } catch (err) {
      console.error("Failed to save promo to local storage:", err);
    }

    const { sql } = await getDb();
    if (!sql) return { ok: true, source: "storage" };
    try {
      await sql`
        INSERT INTO promos (id, title, subtitle, badge, image_url, link, active)
        VALUES (${p.id}, ${p.title}, ${p.subtitle}, ${p.badge}, ${p.imageUrl || null}, ${p.link || null}, ${p.active ?? true})
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          subtitle = EXCLUDED.subtitle,
          badge = EXCLUDED.badge,
          image_url = EXCLUDED.image_url,
          link = EXCLUDED.link,
          active = EXCLUDED.active
      `;
      return { ok: true, source: "database" };
    } catch (e) {
      console.warn("Failed to save promo to PostgreSQL (fallback saved):", e);
      return { ok: true, source: "storage" };
    }
  });

export const deletePromoDb = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    try {
      const { deletePromoStorage } = await import("../server/persistent-storage");
      deletePromoStorage(id);
    } catch (err) {
      console.error("Failed to delete promo from local storage:", err);
    }

    const { sql } = await getDb();
    if (!sql) return { ok: true, source: "storage" };
    try {
      await sql`DELETE FROM promos WHERE id = ${id}`;
      return { ok: true, source: "database" };
    } catch (e) {
      console.warn("Failed to delete promo from PostgreSQL (fallback deleted):", e);
      return { ok: true, source: "storage" };
    }
  });

export const saveAccountDb = createServerFn({ method: "POST" })
  .validator((acc: Account) => acc)
  .handler(async ({ data: acc }) => {
    try {
      const { saveAccountStorage } = await import("../server/persistent-storage");
      saveAccountStorage(acc);
    } catch (err) {
      console.error("Failed to save account to local storage:", err);
    }

    const { sql } = await getDb();
    if (!sql) return { ok: true, source: "storage" };
    try {
      await sql`
        INSERT INTO accounts (id, email, password, name, phone, role, address, addresses, points)
        VALUES (${acc.id}, ${acc.email}, ${acc.password}, ${acc.name}, ${acc.phone}, ${acc.role || "user"}, ${acc.address || null}, ${sql.json(acc.addresses || [])}, ${acc.points || 0})
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          password = EXCLUDED.password,
          name = EXCLUDED.name,
          phone = EXCLUDED.phone,
          role = EXCLUDED.role,
          address = EXCLUDED.address,
          addresses = EXCLUDED.addresses,
          points = EXCLUDED.points
      `;
      return { ok: true, source: "database" };
    } catch (e) {
      console.warn("Failed to save account to PostgreSQL (fallback saved):", e);
      return { ok: true, source: "storage" };
    }
  });

export const saveStaffDb = createServerFn({ method: "POST" })
  .validator((s: StaffMember) => s)
  .handler(async ({ data: s }) => {
    try {
      const { saveStaffStorage } = await import("../server/persistent-storage");
      saveStaffStorage(s);
    } catch (err) {
      console.error("Failed to save staff member to local storage:", err);
    }

    const { sql } = await getDb();
    if (!sql) return { ok: true, source: "storage" };
    try {
      await sql`
        INSERT INTO staff (id, name, email, phone, role, active, created_at)
        VALUES (${s.id}, ${s.name}, ${s.email}, ${s.phone}, ${s.role}, ${s.active}, ${s.createdAt})
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          role = EXCLUDED.role,
          active = EXCLUDED.active
      `;
      return { ok: true, source: "database" };
    } catch (e) {
      console.warn("Failed to save staff to PostgreSQL (fallback saved):", e);
      return { ok: true, source: "storage" };
    }
  });

export const deleteStaffDb = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    try {
      const { deleteStaffStorage } = await import("../server/persistent-storage");
      deleteStaffStorage?.(id);
    } catch (err) {
      console.error("Failed to delete staff from local storage:", err);
    }

    const { sql } = await getDb();
    if (!sql) return { ok: true, source: "storage" };
    try {
      await sql`DELETE FROM staff WHERE id = ${id}`;
      return { ok: true, source: "database" };
    } catch (e) {
      console.warn("Failed to delete staff from PostgreSQL (fallback deleted):", e);
      return { ok: true, source: "storage" };
    }
  });

export const saveSettingsDb = createServerFn({ method: "POST" })
  .validator((settings: Settings) => settings)
  .handler(async ({ data: settings }) => {
    try {
      const { saveSettingsStorage } = await import("../server/persistent-storage");
      saveSettingsStorage(settings);
    } catch (err) {
      console.error("Failed to save settings to local storage:", err);
    }

    const { sql } = await getDb();
    if (!sql) return { ok: true, source: "storage" };
    try {
      await sql`
        INSERT INTO app_settings (id, data)
        VALUES ('main_settings', ${sql.json(settings)})
        ON CONFLICT (id) DO UPDATE SET
          data = EXCLUDED.data
      `;
      return { ok: true, source: "database" };
    } catch (e) {
      console.warn("Failed to save settings to PostgreSQL (fallback saved):", e);
      return { ok: true, source: "storage" };
    }
  });

export const saveCmsDb = createServerFn({ method: "POST" })
  .validator((cms: CmsContent) => cms)
  .handler(async ({ data: cms }) => {
    try {
      const { saveCmsStorage } = await import("../server/persistent-storage");
      saveCmsStorage(cms);
    } catch (err) {
      console.error("Failed to save CMS to local storage:", err);
    }

    const { sql } = await getDb();
    if (!sql) return { ok: true, source: "storage" };
    try {
      await sql`
        INSERT INTO cms_content (id, data)
        VALUES ('main_cms', ${sql.json(cms)})
        ON CONFLICT (id) DO UPDATE SET
          data = EXCLUDED.data
      `;
      return { ok: true, source: "database" };
    } catch (e) {
      console.warn("Failed to save CMS to PostgreSQL (fallback saved):", e);
      return { ok: true, source: "storage" };
    }
  });

export const searchOrdersDb = createServerFn({ method: "POST" })
  .validator((params: { query?: string; statusFilter?: string }) => params)
  .handler(async ({ data: { query, statusFilter } }) => {
    const { sql } = await getDb();
    if (!sql) return null;
    try {
      const q = query ? `%${query.trim().toLowerCase()}%` : null;
      let rows;
      if (q && statusFilter && statusFilter !== "all") {
        rows = await sql`
          SELECT * FROM orders 
          WHERE status = ${statusFilter}
            AND (
              LOWER(code) LIKE ${q} 
              OR LOWER(COALESCE(customer->>'name', '')) LIKE ${q} 
              OR LOWER(COALESCE(customer->>'phone', '')) LIKE ${q}
            )
          ORDER BY created_at DESC
        `;
      } else if (q) {
        rows = await sql`
          SELECT * FROM orders 
          WHERE 
            LOWER(code) LIKE ${q} 
            OR LOWER(COALESCE(customer->>'name', '')) LIKE ${q} 
            OR LOWER(COALESCE(customer->>'phone', '')) LIKE ${q}
          ORDER BY created_at DESC
        `;
      } else if (statusFilter && statusFilter !== "all") {
        rows = await sql`
          SELECT * FROM orders 
          WHERE status = ${statusFilter}
          ORDER BY created_at DESC
        `;
      } else {
        rows = await sql`SELECT * FROM orders ORDER BY created_at DESC`;
      }
      return (rows as any[]).map((o) => ({
        id: o.id,
        code: o.code,
        createdAt: Number(o.created_at),
        type: o.type as "pickup" | "delivery",
        lines: o.lines,
        subtotal: Number(o.subtotal),
        discount: Number(o.discount),
        voucherCode: o.voucher_code,
        deliveryFee: Number(o.delivery_fee),
        total: Number(o.total),
        status: o.status,
        paid: o.paid,
        paymentMethod: o.payment_method,
        pointsEarned: o.points_earned,
        etaMinutes: o.eta_minutes,
        customer: o.customer,
        accountId: o.account_id || null,
      })) as Order[];
    } catch (e) {
      console.error("Failed to search orders in database:", e);
      return null;
    }
  });

export const saveMediaAssetDb = createServerFn({ method: "POST" })
  .validator((d: MediaAsset) => d)
  .handler(async ({ data: m }) => {
    try {
      const { saveMediaAssetStorage } = await import("../server/persistent-storage");
      saveMediaAssetStorage(m);
    } catch (err) {
      console.error("Failed to save media asset to local storage:", err);
    }

    const { sql } = await getDb();
    if (!sql) return { ok: true, source: "storage" };
    try {
      await sql`
        INSERT INTO media_assets (id, url, filename, uploaded_at, used_by_menu_ids)
        VALUES (${m.id}, ${m.url}, ${m.filename}, ${m.uploadedAt}, ${sql.json(m.usedByMenuIds)})
        ON CONFLICT (id) DO UPDATE SET
          url = EXCLUDED.url,
          filename = EXCLUDED.filename,
          used_by_menu_ids = EXCLUDED.used_by_menu_ids
      `;
      return { ok: true, source: "database" };
    } catch (e) {
      console.warn("Failed to save media asset to PostgreSQL (fallback saved):", e);
      return { ok: true, source: "storage" };
    }
  });

export const deleteMediaAssetDb = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    try {
      const { deleteMediaAssetStorage } = await import("../server/persistent-storage");
      deleteMediaAssetStorage(id);
    } catch (err) {
      console.error("Failed to delete media asset from local storage:", err);
    }

    const { sql } = await getDb();
    if (!sql) return { ok: true, source: "storage" };
    try {
      await sql`DELETE FROM media_assets WHERE id = ${id}`;
      return { ok: true, source: "database" };
    } catch (e) {
      console.warn("Failed to delete media asset from PostgreSQL (fallback deleted):", e);
      return { ok: true, source: "storage" };
    }
  });

export const updateMediaAssetUsageDb = createServerFn({ method: "POST" })
  .validator((d: { id: string; usedByMenuIds: string[] }) => d)
  .handler(async ({ data: d }) => {
    try {
      const { updateMediaAssetUsageStorage } = await import("../server/persistent-storage");
      updateMediaAssetUsageStorage(d.id, d.usedByMenuIds);
    } catch (err) {
      console.error("Failed to update media asset usage in local storage:", err);
    }

    const { sql } = await getDb();
    if (!sql) return { ok: true, source: "storage" };
    try {
      await sql`UPDATE media_assets SET used_by_menu_ids = ${sql.json(d.usedByMenuIds)} WHERE id = ${d.id}`;
      return { ok: true, source: "database" };
    } catch (e) {
      console.warn("Failed to update media asset usage in PostgreSQL (fallback updated):", e);
      return { ok: true, source: "storage" };
    }
  });

export const deleteAccountDb = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    try {
      const { deleteAccountStorage } = await import("../server/persistent-storage");
      deleteAccountStorage(id);
    } catch (err) {
      console.error("Failed to delete account from local storage:", err);
    }

    const { sql } = await getDb();
    if (!sql) return { ok: true, source: "storage" };
    try {
      await sql`DELETE FROM accounts WHERE id = ${id}`;
      return { ok: true, source: "database" };
    } catch (e) {
      console.warn("Failed to delete account from PostgreSQL (fallback deleted):", e);
      return { ok: true, source: "storage" };
    }
  });
