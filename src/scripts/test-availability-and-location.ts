/**
 * Comprehensive verification script for Delivery/Pickup Availability Logic & Location Infrastructure
 * Nanami Kitchen (Windhoek, Namibia)
 */

import {
  resolveOrderType,
  validateNewOrderSubmission,
  getAvailableOrderTypes,
  type AvailabilitySettings,
} from "../lib/order-availability";
import { deliveryFeeFor, cartTotals } from "../lib/store";
import { buildWhatsappMessage, WHATSAPP_VARIABLES, WHATSAPP_PRESETS } from "../lib/whatsapp";
import {
  extractCoordinatesFromUrl,
  validateGoogleMapsUrl,
  isPrivateIp,
} from "../server/location-service";
import type { Order, CartLine } from "../types";

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${name} ${detail ? `(${detail})` : ""}`);
    failed++;
  }
}

async function runTests() {
  console.log("\n=======================================================");
  console.log("TEST SUITE: Delivery/Pickup Availability & Location Verification");
  console.log("=======================================================\n");

  const baseSettings: AvailabilitySettings = {
    storeOpen: true,
    deliveryOn: true,
    pickupOn: true,
    maxRadiusKm: 15,
  };

  // --- 1. Availability & Auto-switch resolution ---
  console.log("1. Testing Availability & Auto-switch Resolution:");

  // Case 1A: Both on
  assert(
    resolveOrderType("delivery", baseSettings) === "delivery",
    "Both ON: 'delivery' stays 'delivery'",
  );
  assert(resolveOrderType("pickup", baseSettings) === "pickup", "Both ON: 'pickup' stays 'pickup'");

  // Case 1B: Delivery OFF, Pickup ON
  const deliveryOffSettings: AvailabilitySettings = {
    ...baseSettings,
    deliveryOn: false,
    pickupOn: true,
  };
  assert(
    resolveOrderType("delivery", deliveryOffSettings) === "pickup",
    "Delivery OFF: auto-switches requested 'delivery' to 'pickup'",
  );
  assert(
    resolveOrderType("pickup", deliveryOffSettings) === "pickup",
    "Delivery OFF: 'pickup' remains 'pickup'",
  );

  // Case 1C: Delivery ON, Pickup OFF
  const pickupOffSettings: AvailabilitySettings = {
    ...baseSettings,
    deliveryOn: true,
    pickupOn: false,
  };
  assert(
    resolveOrderType("pickup", pickupOffSettings) === "delivery",
    "Pickup OFF: auto-switches requested 'pickup' to 'delivery'",
  );
  assert(
    resolveOrderType("delivery", pickupOffSettings) === "delivery",
    "Pickup OFF: 'delivery' remains 'delivery'",
  );

  // Case 1D: Both OFF
  const bothOffSettings: AvailabilitySettings = {
    ...baseSettings,
    deliveryOn: false,
    pickupOn: false,
  };
  assert(
    resolveOrderType("delivery", bothOffSettings) === null,
    "Both OFF: returns null (no valid order type)",
  );

  // Case 1E: Store Closed
  const storeClosedSettings: AvailabilitySettings = { ...baseSettings, storeOpen: false };
  assert(
    resolveOrderType("delivery", storeClosedSettings) === null,
    "Store Closed: returns null regardless of toggles",
  );

  // --- 2. Order Submission Validation ---
  console.log("\n2. Testing Order Submission Validation:");

  const validDeliveryCheck = validateNewOrderSubmission("delivery", baseSettings);
  assert(
    validDeliveryCheck.valid,
    "Valid delivery submission accepted when store open & delivery ON",
  );

  const deliveryOffSubmission = validateNewOrderSubmission("delivery", deliveryOffSettings);
  assert(
    !deliveryOffSubmission.valid && deliveryOffSubmission.suggestedAlternative === "pickup",
    "Delivery OFF rejects delivery submission and suggests 'pickup'",
  );

  const pickupOffSubmission = validateNewOrderSubmission("pickup", pickupOffSettings);
  assert(
    !pickupOffSubmission.valid && pickupOffSubmission.suggestedAlternative === "delivery",
    "Pickup OFF rejects pickup submission and suggests 'delivery'",
  );

  const storeClosedSubmission = validateNewOrderSubmission("delivery", storeClosedSettings);
  assert(
    !storeClosedSubmission.valid && storeClosedSubmission.error?.includes("closed"),
    "Store Closed rejects order submission with clear closed message",
  );

  // --- 3. Delivery Fee & Rules for Pickup vs Delivery ---
  console.log("\n3. Testing Fee and Pickup Calculations:");

  const fullSettings = {
    ...baseSettings,
    storeLat: -22.5609,
    storeLng: 17.0658,
    baseFee: 15,
    feePerKm: 3.5,
    minFee: 15,
    freeDeliveryAbove: 300,
    routeFactor: 1.3,
  };

  // Pickup delivery fee must always be 0
  const pickupFee = deliveryFeeFor(fullSettings as any, "pickup", 8, 100);
  assert(pickupFee === 0, "Pickup delivery fee is strictly 0 regardless of distance");

  // Delivery fee calculated properly
  const deliveryFee = deliveryFeeFor(fullSettings as any, "delivery", 5, 100);
  assert(deliveryFee > 0, `Delivery fee properly calculated for 5 km: N$ ${deliveryFee}`);

  // Free delivery threshold
  const freeFee = deliveryFeeFor(fullSettings as any, "delivery", 5, 350);
  assert(freeFee === 0, "Delivery fee is 0 when subtotal exceeds freeDeliveryAbove threshold");

  // --- 4. Location URL Parser & SSRF Security Check ---
  console.log("\n4. Testing Location Service & SSRF Security Checks:");

  // SSRF protection
  assert(isPrivateIp("127.0.0.1"), "Blocks 127.0.0.1 loopback");
  assert(isPrivateIp("192.168.1.1"), "Blocks 192.168.x.x private LAN");
  assert(isPrivateIp("10.0.0.1"), "Blocks 10.x.x.x private range");
  assert(isPrivateIp("169.254.169.254"), "Blocks AWS/GCP cloud metadata IP");
  assert(isPrivateIp("::1"), "Blocks IPv6 localhost (::1)");
  assert(!isPrivateIp("8.8.8.8"), "Allows public IP address (8.8.8.8)");

  const safeMapCheck = await validateGoogleMapsUrl("https://maps.google.com/?q=-22.56,17.06");
  assert(safeMapCheck.valid, "Allows legitimate public Google Maps HTTPS URL");
  const internalCheck = await validateGoogleMapsUrl("http://localhost:3000/secret");
  assert(!internalCheck.valid, "Rejects non-Google or HTTP URL");

  // Coordinate parsing
  const parsed1 = extractCoordinatesFromUrl("https://www.google.com/maps?q=-22.5609,17.0658");
  assert(
    parsed1 !== null &&
      Math.abs(parsed1.lat - -22.5609) < 0.0001 &&
      Math.abs(parsed1.lng - 17.0658) < 0.0001,
    "Parses standard ?q=lat,lng Google Maps URL",
  );

  const parsed2 = extractCoordinatesFromUrl("https://www.google.com/maps/@-22.5700,17.0800,16z");
  assert(
    parsed2 !== null && Math.abs(parsed2.lat - -22.57) < 0.001,
    "Parses @lat,lng Google Maps URL",
  );

  // --- 5. WhatsApp Message Rendering with {maps_link} ---
  console.log("\n5. Testing WhatsApp Message Rendering with {maps_link}:");

  assert(
    WHATSAPP_VARIABLES.some((v) => v.token === "{maps_link}"),
    "{maps_link} token is registered in WHATSAPP_VARIABLES",
  );

  const sampleOrder: Order = {
    id: "test-ord-1",
    code: "NK-9999",
    createdAt: Date.now(),
    type: "delivery",
    lines: [
      {
        id: "l1",
        itemId: "m1",
        name: "Teriyaki Chicken Bento",
        unitPrice: 110,
        qty: 1,
      },
    ],
    subtotal: 110,
    deliveryFee: 25,
    total: 135,
    status: "Pending Payment",
    paid: false,
    paymentMethod: "eWallet / Pay2Cell",
    etaMinutes: 30,
    customer: {
      name: "Tate Ndikwetepo",
      phone: "+264811234567",
      address: "12 Sam Nujoma Drive, Windhoek",
      lat: -22.5609,
      lng: 17.0658,
      mapsUrl: "https://www.google.com/maps?q=-22.560900,17.065800",
    },
  };

  const sampleSettings: any = {
    whatsapp: "+264811234567",
    storeName: "Nanami Kitchen",
    whatsappTemplate:
      "ORDER {order_code}\nCustomer: {customer_name}\nAddress: {customer_address}\nMap: {maps_link}\nTotal: {total}",
  };

  const renderedMsg = buildWhatsappMessage(sampleOrder, sampleSettings);
  assert(
    renderedMsg.includes("https://www.google.com/maps?q=-22.560900,17.065800"),
    "Renders {maps_link} with actual Google Maps URL in WhatsApp message",
  );

  // Pickup WhatsApp message should not have empty gaps
  const pickupOrder: Order = {
    ...sampleOrder,
    type: "pickup",
    customer: {
      name: "Anna Shipanga",
      phone: "+264819876543",
      address: "Kitchen Pickup (Nanami Kitchen HQ)",
    },
  };
  const pickupMsg = buildWhatsappMessage(pickupOrder, sampleSettings);
  assert(
    pickupMsg.includes("Kitchen Pickup") && !pickupMsg.includes("{maps_link}"),
    "Renders pickup message cleanly without broken placeholders",
  );

  console.log("\n=======================================================");
  console.log(`SUMMARY: ${passed} passed, ${failed} failed.`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
