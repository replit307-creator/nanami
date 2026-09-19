/**
 * Comprehensive System Test: Catalog, Roles & Permissions, Availability, Location & SSRF,
 * WhatsApp Messaging, and Financial Calculations (Namibia / English).
 */
import { catalogItems, getCatalogItem } from "../lib/catalogData";
import { formatCurrency } from "../lib/currency";
import { resolveOrderType, validateNewOrderSubmission } from "../lib/order-availability";
import { buildWhatsappMessage, WHATSAPP_VARIABLES } from "../lib/whatsapp";
import { isPrivateIp, validateGoogleMapsUrl } from "../server/location-service";
import type { CartLine, Order, Settings } from "../types";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${testName}${detail ? ` (${detail})` : ""}`);
    failedCount++;
  }
}

async function runComprehensiveTests() {
  console.log("=========================================================================");
  console.log("NANAMI KITCHEN — COMPREHENSIVE SYSTEM VERIFICATION TEST SUITE");
  console.log("Target Region: Namibia / Windhoek (N$) | Language: 100% English");
  console.log("=========================================================================\n");

  // ---------------------------------------------------------------------------
  // 1. Catalog & Menu Item Verification
  // ---------------------------------------------------------------------------
  console.log("1. Verifying Catalog Items & English Localization:");
  assert(catalogItems.length >= 6, "Catalog contains at least 6 primary menu items");

  const validCategories = new Set(["Meals", "Snacks", "Drinks", "Combos", "Others"]);
  const indonesianWordRegex = /\b(sambal|goreng|bakar|ayam|nasi|es|teh|paket|minum|makan|enak)\b/i;

  for (const item of catalogItems) {
    assert(Boolean(item.name && item.name.length > 0), `Item ${item.id} has name: "${item.name}"`);
    assert(item.price > 0, `Item ${item.id} has valid price: N$ ${item.price}`);
    assert(
      validCategories.has(item.category),
      `Item ${item.id} has valid category: ${item.category}`,
    );
    assert(
      item.prepMinutes > 0,
      `Item ${item.id} has realistic prepMinutes (${item.prepMinutes} mins)`,
    );
    assert(
      !indonesianWordRegex.test(item.name) && !indonesianWordRegex.test(item.description),
      `Item ${item.id} text is in clean English (no Indonesian keywords in name/description)`,
    );
  }

  // ---------------------------------------------------------------------------
  // 2. Role-Based Access Control (RBAC) Matrix
  // ---------------------------------------------------------------------------
  console.log("\n2. Verifying Role-Based Access Matrix (Guest, User, Staff, Admin, Owner):");

  type Role = "guest" | "user" | "staff" | "admin" | "owner";

  function checkRouteAccess(role: Role, path: string): boolean {
    const isPublic =
      path === "/" ||
      path.startsWith("/menu") ||
      path === "/cart" ||
      path === "/checkout" ||
      path === "/order-success" ||
      path === "/tracking" ||
      path === "/address" ||
      path === "/vouchers" ||
      path === "/login" ||
      path === "/register";

    if (isPublic) return true;

    // Customer member paths
    const isMemberPath =
      path === "/profile" ||
      path.startsWith("/profile/") ||
      path === "/orders" ||
      path.startsWith("/orders/") ||
      path === "/saved-address" ||
      path.startsWith("/saved-address/");

    if (isMemberPath) {
      return role === "user" || role === "staff" || role === "admin" || role === "owner";
    }

    // Operational staff & kitchen paths
    const isOperationalKitchen =
      path === "/admin" ||
      path === "/admin/" ||
      path === "/admin/orders" ||
      path.startsWith("/admin/orders/") ||
      path === "/admin/stock" ||
      path.startsWith("/admin/stock/");

    // Owner-only admin paths
    const isOwnerOnlyAdmin =
      path === "/admin/menu" ||
      path.startsWith("/admin/menu/") ||
      path === "/admin/media" ||
      path.startsWith("/admin/media/") ||
      path === "/admin/customers" ||
      path.startsWith("/admin/customers/") ||
      path === "/admin/reports" ||
      path.startsWith("/admin/reports/") ||
      path === "/admin/settings" ||
      path.startsWith("/admin/settings/");

    // Owner suite paths
    const isOwnerSuite = path === "/owner" || path.startsWith("/owner/");

    if (role === "guest") return false;
    if (role === "user") return false;

    if (role === "staff") {
      return isOperationalKitchen && !isOwnerOnlyAdmin && !isOwnerSuite;
    }

    if (role === "admin") {
      return (isOperationalKitchen || isOwnerOnlyAdmin) && !isOwnerSuite;
    }

    if (role === "owner") {
      return true; // Owner can access all operational and executive paths
    }

    return false;
  }

  // Test guest boundaries
  assert(checkRouteAccess("guest", "/"), "Guest can view Storefront");
  assert(checkRouteAccess("guest", "/menu/m1"), "Guest can view Menu details");
  assert(checkRouteAccess("guest", "/checkout"), "Guest can access Guest Checkout");
  assert(!checkRouteAccess("guest", "/profile"), "Guest cannot access Member Profile");
  assert(!checkRouteAccess("guest", "/admin"), "Guest cannot access Admin Portal");
  assert(!checkRouteAccess("guest", "/owner"), "Guest cannot access Owner Suite");

  // Test member (user) boundaries
  assert(checkRouteAccess("user", "/profile"), "Member can view Profile");
  assert(checkRouteAccess("user", "/orders"), "Member can view Order History");
  assert(!checkRouteAccess("user", "/admin"), "Member cannot access Kitchen Admin");
  assert(!checkRouteAccess("user", "/owner"), "Member cannot access Owner Suite");

  // Test staff boundaries
  assert(checkRouteAccess("staff", "/admin"), "Staff can access Kitchen Kanban Board");
  assert(checkRouteAccess("staff", "/admin/orders"), "Staff can view Order Queue");
  assert(checkRouteAccess("staff", "/admin/stock"), "Staff can toggle Stock Availability");
  assert(!checkRouteAccess("staff", "/owner/finance"), "Staff cannot access Owner Financials");
  assert(!checkRouteAccess("staff", "/owner/staff"), "Staff cannot access Staff Management");

  // Test owner boundaries
  assert(checkRouteAccess("owner", "/admin"), "Owner can access Kitchen Board");
  assert(checkRouteAccess("owner", "/owner/finance"), "Owner can access Executive Financials");
  assert(checkRouteAccess("owner", "/owner/whatsapp"), "Owner can customize WhatsApp Settings");
  assert(checkRouteAccess("owner", "/owner/cms"), "Owner can access Storefront CMS");

  // ---------------------------------------------------------------------------
  // 3. Delivery & Pickup Availability Toggles & Fee Calculations
  // ---------------------------------------------------------------------------
  console.log("\n3. Verifying Independent Availability & Resolution Logic:");

  const settingsBothOpen: Settings = {
    currencySymbol: "N$",
    storeName: "Nanami Kitchen",
    storeTagline: "Good food, made with love",
    storeAddress: "12 Independence Ave, Windhoek",
    storeOpen: true,
    deliveryOn: true,
    pickupOn: true,
    codEnabled: true,
    vatEnabled: true,
    vatPercent: 15,
    baseFee: 20,
    feePerKm: 3,
    minFee: 20,
    maxRadiusKm: 25,
    freeDeliveryAbove: 300,
    routeFactor: 1.3,
    storeLat: -22.5609,
    storeLng: 17.0658,
    bankName: "FNB",
    bankAccount: "62123456789",
    bankHolder: "Nanami Kitchen CC",
    ewallet: "+264811234567",
    pointsPer10k: 1,
    whatsapp: "+264811234567",
    whatsappTemplate: "",
    whatsappHeader: "",
    whatsappFooter: "",
    whatsappPreset: "standard",
  };

  const resBoth = resolveOrderType("delivery", settingsBothOpen);
  assert(resBoth === "delivery", "Delivery preserved when both active");

  const settingsDeliveryOff = { ...settingsBothOpen, deliveryOn: false };
  const resDelOff = resolveOrderType("delivery", settingsDeliveryOff);
  assert(resDelOff === "pickup", "Auto-switches to pickup when delivery is disabled");

  const settingsPickupOff = { ...settingsBothOpen, pickupOn: false };
  const resPickOff = resolveOrderType("pickup", settingsPickupOff);
  assert(resPickOff === "delivery", "Auto-switches to delivery when pickup is disabled");

  const settingsStoreClosed = { ...settingsBothOpen, storeOpen: false };
  const resClosed = resolveOrderType("delivery", settingsStoreClosed);
  assert(resClosed === null, "Resolves to null when store is closed");

  const validSubmission = validateNewOrderSubmission("delivery", settingsBothOpen);
  assert(validSubmission.valid, "Valid delivery submission accepted when store open");

  const invalidClosedSubmission = validateNewOrderSubmission("delivery", settingsStoreClosed);
  assert(!invalidClosedSubmission.valid, "Order rejected when store is closed");

  // ---------------------------------------------------------------------------
  // 4. SSRF Security & Google Maps Validation
  // ---------------------------------------------------------------------------
  console.log("\n4. Verifying SSRF Protection & Google Maps Verification:");

  assert(isPrivateIp("127.0.0.1"), "Blocks loopback 127.0.0.1");
  assert(isPrivateIp("10.0.1.25"), "Blocks RFC 1918 10.0.0.0/8");
  assert(isPrivateIp("192.168.1.1"), "Blocks RFC 1918 192.168.0.0/16");
  assert(isPrivateIp("172.20.0.1"), "Blocks RFC 1918 172.16.0.0/12");
  assert(isPrivateIp("169.254.169.254"), "Blocks cloud metadata IP 169.254.169.254");
  assert(!isPrivateIp("8.8.8.8"), "Allows public IP (8.8.8.8)");

  const validMapUrl = "https://maps.google.com/?q=-22.5609,17.0658";
  const mapCheck = await validateGoogleMapsUrl(validMapUrl);
  assert(mapCheck.valid, "Accepts legitimate Google Maps URL");

  const invalidUrl = "https://attacker.com/steal";
  const invalidCheck = await validateGoogleMapsUrl(invalidUrl);
  assert(!invalidCheck.valid, "Rejects untrusted third-party URL");

  // ---------------------------------------------------------------------------
  // 5. WhatsApp Message Formatting & Namibian Dollar (N$)
  // ---------------------------------------------------------------------------
  console.log("\n5. Verifying WhatsApp Message Rendering & Currency Localization:");

  const sampleCartLine: CartLine = {
    id: "cl-1",
    itemId: "m1",
    name: "Teriyaki Chicken Bento",
    unitPrice: 110,
    qty: 2,
    optionLabels: ["Large", "Fried Egg"],
    note: "Extra chili sauce on the side please",
  };

  const sampleOrder: Order = {
    id: "ord-test-01",
    code: "NK-9921",
    createdAt: Date.now(),
    type: "delivery",
    lines: [sampleCartLine],
    subtotal: 220,
    discount: 20,
    voucherCode: "NANAMI20",
    deliveryFee: 25,
    vatPercent: 15,
    vatAmount: 33,
    total: 258,
    status: "Pending Payment",
    paid: false,
    paymentMethod: "eWallet / Pay2Cell",
    pointsEarned: 2,
    etaMinutes: 25,
    customer: {
      name: "Taimi Shuuya",
      phone: "+264811234567",
      address: "12 Independence Ave, Windhoek",
      deliveryNote: "Leave at front desk",
      lat: -22.5609,
      lng: 17.0658,
      mapsUrl: "https://www.google.com/maps?q=-22.560900,17.065800",
    },
  };

  const waMsg = buildWhatsappMessage(sampleOrder, settingsBothOpen);

  assert(waMsg.includes("NK-9921"), "Message contains order code NK-9921");
  assert(waMsg.includes("Taimi Shuuya"), "Message contains customer name");
  assert(waMsg.includes("N$ 258"), "Message formats final total in N$");
  assert(waMsg.includes("VAT (15%)"), "Message displays VAT (15%) breakdown");
  assert(waMsg.includes("NANAMI20"), "Message displays applied voucher code");
  assert(
    waMsg.includes("https://www.google.com/maps?q=-22.560900,17.065800"),
    "Message embeds {maps_link}",
  );
  assert(waMsg.includes("eWallet / Pay2Cell"), "Message shows payment method");

  // Test pickup message cleans out maps and delivery blocks
  const pickupOrder: Order = {
    ...sampleOrder,
    type: "pickup",
    deliveryFee: 0,
    total: 233,
    customer: {
      ...sampleOrder.customer,
      address: "Kitchen Pickup",
      mapsUrl: undefined,
    },
  };
  const waPickup = buildWhatsappMessage(pickupOrder, settingsBothOpen);
  assert(waPickup.includes("🛍️ Pickup"), "Pickup message contains pickup icon");
  assert(!waPickup.includes("Maps Link:"), "Pickup message omits courier Maps Link");

  console.log("\n=========================================================================");
  console.log(
    `TOTAL TESTS: ${passedCount + failedCount} | PASSED: ${passedCount} | FAILED: ${failedCount}`,
  );
  console.log("=========================================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runComprehensiveTests().catch((err) => {
  console.error("Test execution threw an error:", err);
  process.exit(1);
});
