import { sql, initDb, seedDbIfEmpty } from "../lib/db";
import { seedState } from "../lib/seed-data";
import {
  getStorageData,
  saveMenuItemStorage,
  deleteMenuItemStorage,
  saveOrderStorage,
  saveVoucherStorage,
  deleteVoucherStorage,
  savePromoStorage,
  deletePromoStorage,
  saveCmsStorage,
  saveSettingsStorage,
  saveStaffStorage,
} from "./persistent-storage";

export async function handleApiRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (!pathname.startsWith("/api/")) {
    return null;
  }

  const corsHeaders: Record<string, string> = {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "access-control-allow-headers": "Content-Type, Authorization",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const fallback = getStorageData();

    // 1. Health Check
    if (pathname === "/api/health") {
      let dbStatus = "offline (using robust local fallback state)";
      if (sql) {
        try {
          const isConnected = await initDb();
          dbStatus = isConnected ? "connected" : "offline (using robust local fallback state)";
        } catch {
          dbStatus = "connection_failed";
        }
      }

      return new Response(
        JSON.stringify(
          {
            status: "ok",
            service: "Nanami Kitchen API Server",
            stack: {
              frontend: "React 19 (TypeScript + Tailwind CSS)",
              backend: "ExpressJS & Full-Stack Node Engine",
              database: "PostgreSQL",
            },
            database: {
              driver: "postgres.js",
              status: dbStatus,
              configured: Boolean(process.env["DATABASE_URL"]),
            },
            timestamp: new Date().toISOString(),
          },
          null,
          2,
        ),
        { status: 200, headers: corsHeaders },
      );
    }

    // 2. Full State Sync
    if (pathname === "/api/state") {
      const dbReady = await initDb();
      if (!sql || !dbReady) {
        return new Response(
          JSON.stringify({
            source: "persistent-storage",
            state: fallback,
            settings: fallback.settings,
            cms: fallback.cms,
            menu: fallback.menu,
            orders: fallback.orders,
            promos: fallback.promos,
            vouchers: fallback.vouchers,
            accounts: fallback.accounts,
            staff: fallback.staff,
            mediaAssets: fallback.mediaAssets,
          }),
          {
            status: 200,
            headers: corsHeaders,
          },
        );
      }
      await seedDbIfEmpty(fallback as any);

      const [settings, cms, menu, orders, promos, vouchers, accounts, staff, media] =
        await Promise.all([
          sql`SELECT data FROM app_settings WHERE id = 'main_settings' LIMIT 1`,
          sql`SELECT data FROM cms_content WHERE id = 'main_cms' LIMIT 1`,
          sql`SELECT * FROM menu_items ORDER BY id`,
          sql`SELECT * FROM orders ORDER BY created_at DESC`,
          sql`SELECT * FROM promos ORDER BY id`,
          sql`SELECT * FROM vouchers ORDER BY code`,
          sql`SELECT * FROM accounts ORDER BY id`,
          sql`SELECT * FROM staff ORDER BY created_at DESC`,
          sql`SELECT * FROM media_assets ORDER BY uploaded_at DESC`,
        ]);

      return new Response(
        JSON.stringify({
          source: "postgresql",
          settings: settings[0]?.["data"] ?? fallback.settings,
          cms: cms[0]?.["data"] ?? fallback.cms,
          menu: menu.map((m: any) => ({
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
          orders: orders.map((o: any) => ({
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
          promos: promos.map((p: any) => ({
            id: p.id,
            title: p.title,
            subtitle: p.subtitle,
            badge: p.badge,
            imageUrl: p.image_url,
            link: p.link,
            active: p.active,
          })),
          vouchers: vouchers.map((v: any) => ({
            code: v.code,
            type: v.type,
            value: Number(v.value),
            minSpend: Number(v.min_spend),
            active: v.active,
          })),
          accounts: accounts.map((a: any) => ({
            id: a.id,
            email: a.email,
            password: a.password,
            name: a.name,
            phone: a.phone,
            role: a.role,
            address: a.address,
            addresses: a.addresses,
            points: a.points,
          })),
          staff: staff.map((s: any) => ({
            id: s.id,
            name: s.name,
            email: s.email,
            phone: s.phone,
            role: s.role,
            active: s.active,
            createdAt: Number(s.created_at),
          })),
          mediaAssets: media.map((m: any) => ({
            id: m.id,
            url: m.url,
            filename: m.filename,
            uploadedAt: Number(m.uploaded_at),
            usedByMenuIds: m.used_by_menu_ids || [],
          })),
        }),
        { status: 200, headers: corsHeaders },
      );
    }

    // 3. Menu Items
    if (pathname === "/api/menu") {
      const dbReady = await initDb();
      if (request.method === "GET") {
        if (!sql || !dbReady) {
          return new Response(JSON.stringify({ menu: fallback.menu || [] }), {
            status: 200,
            headers: corsHeaders,
          });
        }
        const rows = (await sql`SELECT * FROM menu_items ORDER BY category, name`) as any[];
        return new Response(
          JSON.stringify({
            menu: rows.map((m: any) => ({
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
          }),
          {
            status: 200,
            headers: corsHeaders,
          },
        );
      }

      if (request.method === "POST" || request.method === "PUT") {
        const item = (await request.json()) as Record<string, any>;
        if (!item || !item.id || !item.name) {
          return new Response(JSON.stringify({ error: "Invalid menu item data" }), {
            status: 400,
            headers: corsHeaders,
          });
        }

        // Always save to persistent storage
        saveMenuItemStorage(item as any);

        if (sql && dbReady) {
          try {
            await sql`
              INSERT INTO menu_items (
                id, name, description, price, category, image, available, prep_minutes, badges, stock, groups, special_request_enabled
              ) VALUES (
                ${item.id}, ${item.name}, ${item.description || ""}, ${item.price || 0}, ${item.category || "Meals"},
                ${item.image || ""}, ${item.available !== false}, ${item.prepMinutes || 15},
                ${sql.json(item.badges || [])}, ${item.stock ?? null}, ${sql.json(item.groups || [])},
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
          } catch (e) {
            console.warn("Could not write menu item to PostgreSQL:", e);
          }
        }
        return new Response(JSON.stringify({ success: true, item }), {
          status: 200,
          headers: corsHeaders,
        });
      }
    }

    // 4. Single Menu Item
    if (pathname.startsWith("/api/menu/")) {
      const id = pathname.replace("/api/menu/", "");
      const dbReady = await initDb();

      if (request.method === "DELETE") {
        deleteMenuItemStorage(id);
        if (sql && dbReady) {
          try {
            await sql`DELETE FROM menu_items WHERE id = ${id}`;
          } catch (e) {
            console.warn("Could not delete menu item from PostgreSQL:", e);
          }
        }
        return new Response(JSON.stringify({ success: true, id }), {
          status: 200,
          headers: corsHeaders,
        });
      }

      if (!sql || !dbReady) {
        const item = fallback.menu?.find((m) => m.id === id);
        return item
          ? new Response(JSON.stringify({ item }), { status: 200, headers: corsHeaders })
          : new Response(JSON.stringify({ error: "Item not found" }), {
              status: 404,
              headers: corsHeaders,
            });
      }
      const rows = await sql`SELECT * FROM menu_items WHERE id = ${id} LIMIT 1`;
      return rows.length
        ? new Response(JSON.stringify({ item: rows[0] }), { status: 200, headers: corsHeaders })
        : new Response(JSON.stringify({ error: "Item not found" }), {
            status: 404,
            headers: corsHeaders,
          });
    }

    // 5. Orders List & Creation
    if (pathname === "/api/orders") {
      const dbReady = await initDb();
      if (request.method === "GET") {
        if (!sql || !dbReady) {
          return new Response(JSON.stringify({ orders: fallback.orders || [] }), {
            status: 200,
            headers: corsHeaders,
          });
        }
        const rows = await sql`SELECT * FROM orders ORDER BY created_at DESC LIMIT 100`;
        return new Response(JSON.stringify({ orders: rows.length ? rows : fallback.orders }), {
          status: 200,
          headers: corsHeaders,
        });
      }

      if (request.method === "POST") {
        const order = (await request.json()) as Record<string, unknown>;
        if (!order || !order["id"] || !order["lines"]) {
          return new Response(JSON.stringify({ error: "Invalid order data" }), {
            status: 400,
            headers: corsHeaders,
          });
        }

        saveOrderStorage(order as any);

        if (!sql || !dbReady) {
          return new Response(
            JSON.stringify({ success: true, order, storage: "persistent-storage" }),
            {
              status: 201,
              headers: corsHeaders,
            },
          );
        }
        const orderId = String(order["id"]);
        const orderCode = String(order["code"]);
        const createdAt = Number(order["createdAt"]) || Date.now();
        const orderType = String(order["type"]);
        const lines = JSON.stringify(order["lines"]);
        const subtotal = Number(order["subtotal"]) || 0;
        const discount = Number(order["discount"]) || 0;
        const voucherCode = order["voucherCode"] ? String(order["voucherCode"]) : null;
        const deliveryFee = Number(order["deliveryFee"]) || 0;
        const total = Number(order["total"]) || 0;
        const status = order["status"] ? String(order["status"]) : "Pending Payment";
        const paid = Boolean(order["paid"]);
        const paymentMethod = order["paymentMethod"]
          ? String(order["paymentMethod"])
          : "Bank Transfer";
        const pointsEarned = Number(order["pointsEarned"]) || 0;
        const etaMinutes = Number(order["etaMinutes"]) || 20;
        const customer = JSON.stringify(order["customer"] || {});
        const accountId = order["accountId"] ? String(order["accountId"]) : null;

        try {
          await sql`
            INSERT INTO orders (
              id, code, created_at, type, lines, subtotal, discount, voucher_code,
              delivery_fee, total, status, paid, payment_method, points_earned,
              eta_minutes, customer, account_id
            ) VALUES (
              ${orderId}, ${orderCode}, ${createdAt}, ${orderType},
              ${lines}::jsonb, ${subtotal}, ${discount},
              ${voucherCode}, ${deliveryFee}, ${total},
              ${status}, ${paid},
              ${paymentMethod}, ${pointsEarned},
              ${etaMinutes}, ${customer}::jsonb, ${accountId}
            )
            ON CONFLICT (id) DO UPDATE SET
              status = EXCLUDED.status,
              paid = EXCLUDED.paid,
              eta_minutes = EXCLUDED.eta_minutes
          `;
        } catch (e) {
          console.warn("Could not write order to PostgreSQL:", e);
        }
        return new Response(JSON.stringify({ success: true, order, storage: "postgresql" }), {
          status: 201,
          headers: corsHeaders,
        });
      }
    }

    // 5b. Update Order by ID
    if (pathname.startsWith("/api/orders/")) {
      const orderId = pathname.replace("/api/orders/", "");
      const dbReady = await initDb();
      if (request.method === "PATCH" || request.method === "PUT") {
        const body = (await request.json()) as Record<string, any>;
        const existingOrder = fallback.orders.find((o) => o.id === orderId || o.code === orderId);
        if (existingOrder) {
          saveOrderStorage({
            ...existingOrder,
            ...(body.status !== undefined ? { status: body.status } : {}),
            ...(body.paid !== undefined ? { paid: body.paid } : {}),
            ...(body.etaMinutes !== undefined ? { etaMinutes: body.etaMinutes } : {}),
          });
        }
        if (sql && dbReady) {
          try {
            if (body.status !== undefined && body.paid !== undefined) {
              await sql`
                UPDATE orders 
                SET status = ${body.status}, paid = ${body.paid} 
                WHERE id = ${orderId} OR code = ${orderId}
              `;
            } else if (body.status !== undefined) {
              await sql`
                UPDATE orders 
                SET status = ${body.status} 
                WHERE id = ${orderId} OR code = ${orderId}
              `;
            } else if (body.paid !== undefined) {
              await sql`
                UPDATE orders 
                SET paid = ${body.paid} 
                WHERE id = ${orderId} OR code = ${orderId}
              `;
            }
          } catch (e) {
            console.warn("Could not update order in PostgreSQL:", e);
          }
        }
        return new Response(JSON.stringify({ success: true, orderId }), {
          status: 200,
          headers: corsHeaders,
        });
      }
    }

    // 6. Vouchers
    if (pathname === "/api/vouchers") {
      const dbReady = await initDb();
      if (request.method === "GET") {
        if (!sql || !dbReady) {
          return new Response(JSON.stringify({ vouchers: fallback.vouchers || [] }), {
            status: 200,
            headers: corsHeaders,
          });
        }
        const rows = await sql`SELECT * FROM vouchers WHERE active = true`;
        return new Response(JSON.stringify({ vouchers: rows.length ? rows : fallback.vouchers }), {
          status: 200,
          headers: corsHeaders,
        });
      }

      if (request.method === "POST" || request.method === "PUT") {
        const voucher = (await request.json()) as Record<string, any>;
        if (voucher && voucher.code) {
          saveVoucherStorage(voucher as any);
        }
        if (sql && dbReady && voucher.code) {
          try {
            await sql`
              INSERT INTO vouchers (code, type, value, min_spend, active)
              VALUES (${voucher.code.toUpperCase()}, ${voucher.type || "percent"}, ${voucher.value || 0}, ${voucher.minSpend || 0}, ${voucher.active !== false})
              ON CONFLICT (code) DO UPDATE SET
                type = EXCLUDED.type,
                value = EXCLUDED.value,
                min_spend = EXCLUDED.min_spend,
                active = EXCLUDED.active
            `;
          } catch (e) {
            console.warn("Could not write voucher to PostgreSQL:", e);
          }
        }
        return new Response(JSON.stringify({ success: true, voucher }), {
          status: 200,
          headers: corsHeaders,
        });
      }
    }

    if (pathname.startsWith("/api/vouchers/")) {
      const code = pathname.replace("/api/vouchers/", "");
      deleteVoucherStorage(code);
      const dbReady = await initDb();
      if (request.method === "DELETE" && sql && dbReady) {
        try {
          await sql`DELETE FROM vouchers WHERE UPPER(code) = UPPER(${code})`;
        } catch (e) {
          console.warn("Could not delete voucher from PostgreSQL:", e);
        }
      }
      return new Response(JSON.stringify({ success: true, code }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    // 6b. Promos
    if (pathname === "/api/promos") {
      const dbReady = await initDb();
      if (request.method === "GET") {
        if (!sql || !dbReady) {
          return new Response(JSON.stringify({ promos: fallback.promos || [] }), {
            status: 200,
            headers: corsHeaders,
          });
        }
        const rows = await sql`SELECT * FROM promos ORDER BY id`;
        return new Response(JSON.stringify({ promos: rows.length ? rows : fallback.promos }), {
          status: 200,
          headers: corsHeaders,
        });
      }

      if (request.method === "POST" || request.method === "PUT") {
        const promo = (await request.json()) as Record<string, any>;
        if (promo && promo.id) {
          savePromoStorage(promo as any);
        }
        if (sql && dbReady && promo.id) {
          try {
            await sql`
              INSERT INTO promos (id, title, subtitle, badge, image_url, link, active)
              VALUES (${promo.id}, ${promo.title || ""}, ${promo.subtitle || ""}, ${promo.badge || "Special"}, ${promo.imageUrl || null}, ${promo.link || null}, ${promo.active !== false})
              ON CONFLICT (id) DO UPDATE SET
                title = EXCLUDED.title,
                subtitle = EXCLUDED.subtitle,
                badge = EXCLUDED.badge,
                image_url = EXCLUDED.image_url,
                link = EXCLUDED.link,
                active = EXCLUDED.active
            `;
          } catch (e) {
            console.warn("Could not write promo to PostgreSQL:", e);
          }
        }
        return new Response(JSON.stringify({ success: true, promo }), {
          status: 200,
          headers: corsHeaders,
        });
      }
    }

    if (pathname.startsWith("/api/promos/")) {
      const promoId = pathname.replace("/api/promos/", "");
      deletePromoStorage(promoId);
      const dbReady = await initDb();
      if (request.method === "DELETE" && sql && dbReady) {
        try {
          await sql`DELETE FROM promos WHERE id = ${promoId}`;
        } catch (e) {
          console.warn("Could not delete promo from PostgreSQL:", e);
        }
      }
      return new Response(JSON.stringify({ success: true, promoId }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    // 7. CMS
    if (pathname === "/api/cms") {
      const dbReady = await initDb();
      if (request.method === "POST" || request.method === "PUT") {
        const cmsData = await request.json();
        saveCmsStorage(cmsData);
        if (sql && dbReady) {
          try {
            await sql`
              INSERT INTO cms_content (id, data)
              VALUES ('main_cms', ${sql.json(cmsData)})
              ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
            `;
          } catch (e) {
            console.warn("Could not write CMS to PostgreSQL:", e);
          }
        }
        return new Response(JSON.stringify({ success: true, cms: cmsData }), {
          status: 200,
          headers: corsHeaders,
        });
      }

      if (!sql || !dbReady) {
        return new Response(JSON.stringify({ cms: fallback.cms }), {
          status: 200,
          headers: corsHeaders,
        });
      }
      const rows = await sql`SELECT data FROM cms_content WHERE id = 'main_cms' LIMIT 1`;
      return new Response(JSON.stringify({ cms: rows[0]?.["data"] ?? fallback.cms }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    // 8. Settings
    if (pathname === "/api/settings") {
      const dbReady = await initDb();
      if (request.method === "POST" || request.method === "PUT") {
        const settingsData = await request.json();
        saveSettingsStorage(settingsData);
        if (sql && dbReady) {
          try {
            await sql`
              INSERT INTO app_settings (id, data)
              VALUES ('main_settings', ${sql.json(settingsData)})
              ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
            `;
          } catch (e) {
            console.warn("Could not write settings to PostgreSQL:", e);
          }
        }
        return new Response(JSON.stringify({ success: true, settings: settingsData }), {
          status: 200,
          headers: corsHeaders,
        });
      }

      if (!sql || !dbReady) {
        return new Response(JSON.stringify({ settings: fallback.settings }), {
          status: 200,
          headers: corsHeaders,
        });
      }
      const rows = await sql`SELECT data FROM app_settings WHERE id = 'main_settings' LIMIT 1`;
      return new Response(JSON.stringify({ settings: rows[0]?.["data"] ?? fallback.settings }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    // 9. Staff
    if (pathname === "/api/staff") {
      const dbReady = await initDb();
      if (request.method === "GET") {
        if (!sql || !dbReady) {
          return new Response(JSON.stringify({ staff: fallback.staff || [] }), {
            status: 200,
            headers: corsHeaders,
          });
        }
        const rows = await sql`SELECT * FROM staff ORDER BY created_at DESC`;
        return new Response(JSON.stringify({ staff: rows.length ? rows : fallback.staff }), {
          status: 200,
          headers: corsHeaders,
        });
      }

      if (request.method === "POST" || request.method === "PUT") {
        const member = (await request.json()) as Record<string, any>;
        if (member && member.id && member.email) {
          saveStaffStorage(member as any);
        }
        if (sql && dbReady && member.id && member.email) {
          try {
            await sql`
              INSERT INTO staff (id, name, email, phone, role, active, created_at)
              VALUES (${member.id}, ${member.name || ""}, ${member.email}, ${member.phone || ""}, ${member.role || "staff"}, ${member.active !== false}, ${member.createdAt || Date.now()})
              ON CONFLICT (email) DO UPDATE SET
                name = EXCLUDED.name,
                phone = EXCLUDED.phone,
                role = EXCLUDED.role,
                active = EXCLUDED.active
            `;
          } catch (e) {
            console.warn("Could not write staff to PostgreSQL:", e);
          }
        }
        return new Response(JSON.stringify({ success: true, member }), {
          status: 200,
          headers: corsHeaders,
        });
      }
    }

    // 10. Auth Check
    if (pathname === "/api/auth/login" && request.method === "POST") {
      const body = (await request.json()) as { email?: string; password?: string };
      const email = body["email"]?.trim().toLowerCase();
      const password = body["password"];
      const dbReady = await initDb();

      let found: any = null;

      // Check PostgreSQL
      if (sql && dbReady && email) {
        const rows = (await sql`
          SELECT * FROM accounts 
          WHERE LOWER(email) = ${email} AND password = ${password} 
          LIMIT 1
        `) as any[];
        if (rows.length > 0) {
          found = rows[0];
        }
      }

      // Fallback check against storage & seed accounts
      if (!found && email) {
        const accounts = fallback.accounts || seedState.accounts || [];
        found = accounts.find(
          (a) => a.email.trim().toLowerCase() === email && a.password === password,
        );
      }

      if (!found) {
        return new Response(JSON.stringify({ error: "Invalid email or password", ok: false }), {
          status: 401,
          headers: corsHeaders,
        });
      }
      const { password: _, ...safeUser } = found;
      return new Response(
        JSON.stringify({ success: true, ok: true, user: safeUser, account: safeUser }),
        {
          status: 200,
          headers: corsHeaders,
        },
      );
    }

    return new Response(JSON.stringify({ error: "API route not found", path: pathname }), {
      status: 404,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("[API Handler] Error processing request:", error);
    return new Response(
      JSON.stringify({ error: "Internal Server Error", details: String(error) }),
      { status: 500, headers: corsHeaders },
    );
  }
}
