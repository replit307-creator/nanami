import http from "http";

const routes = [
  "/",
  "/menu",
  "/menu/m1",
  "/cart",
  "/checkout",
  "/order-success",
  "/orders",
  "/tracking",
  "/profile",
  "/address",
  "/saved-address",
  "/vouchers",
  "/login",
  "/register",
  "/auth",
  "/admin",
  "/admin/menu",
  "/admin/orders",
  "/admin/stock",
  "/admin/customers",
  "/admin/reports",
  "/admin/media",
  "/admin/settings",
  "/owner",
  "/owner/menu",
  "/owner/orders",
  "/owner/outlets",
  "/owner/shipping",
  "/owner/whatsapp",
  "/owner/vouchers",
  "/owner/cms",
  "/owner/staff",
  "/owner/finance",
  "/owner/customers",
  "/owner/media",
  "/owner/audit",
  "/owner/preview",
  "/owner/settings",
];

async function testPages() {
  console.log("Testing all routes on http://localhost:3000...\n");
  for (const path of routes) {
    await new Promise((resolve) => {
      const req = http.get(`http://localhost:3000${path}`, (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          const isErrorPage =
            body.includes("This page didn't load") ||
            (res.statusCode !== 200 && res.statusCode !== 307 && res.statusCode !== 302);
          if (isErrorPage) {
            console.error(`❌ [${res.statusCode}] ${path}`);
            console.error(`   Preview snippet:`, body.slice(0, 300).replace(/\n/g, " "));
          } else {
            console.log(`✅ [${res.statusCode}] ${path}`);
          }
          resolve(null);
        });
      });
      req.on("error", (err) => {
        console.error(`❌ [REQ ERROR] ${path}:`, err.message);
        resolve(null);
      });
    });
  }
}

testPages();
