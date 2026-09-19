import { formatCurrency } from "../lib/currency";
import { getCatalogItem, type MenuItem } from "../lib/catalogData";
import type { CartLine, Order, Settings } from "../lib/store";
import { buildWhatsappMessage } from "../lib/whatsapp";

function calculateUnitPrice(
  item: MenuItem,
  selectedChoiceIds: string[],
): { unitPrice: number; labels: string[] } {
  let price = item.price;
  const labels: string[] = [];
  item.groups
    .filter((g) => g.enabled !== false)
    .forEach((g) => {
      g.choices.forEach((c) => {
        if (selectedChoiceIds.includes(c.id)) {
          price += c.price;
          labels.push(c.name);
        }
      });
    });
  return { unitPrice: price, labels };
}

async function runPhase5Regression() {
  const rupiah = (n: number) => formatCurrency(n, "N$");

  console.log("=========================================================================");
  console.log("PHASE 5 REGRESSION TEST: VAT, COD TOGGLE, AND E-WALLET");
  console.log("=========================================================================");

  const item = getCatalogItem("m1")!;
  const calc = calculateUnitPrice(item, ["large"]); // Base 95 + 15 = 110
  const cartLine: CartLine = {
    id: `cart-p5-${Date.now()}`,
    itemId: item.id,
    name: item.name,
    unitPrice: calc.unitPrice,
    qty: 1,
    optionLabels: calc.labels,
    note: "Test order phase 5",
  };

  // -------------------------------------------------------------
  // TEST SCENARIO A: VAT ENABLED = true (vatPercent = 15)
  // -------------------------------------------------------------
  const orderA: Order = {
    id: `ord-a-${Math.floor(1000 + Math.random() * 9000)}`,
    code: `NK-5001`,
    createdAt: Date.now(),
    type: "delivery",
    lines: [cartLine],
    subtotal: 110,
    vatAmount: Math.round(110 * 0.15), // 17
    vatPercent: 15,
    discount: 0,
    voucherCode: "",
    deliveryFee: 25,
    total: 110 + 17 + 25, // 152
    status: "Pending Payment",
    paid: false,
    paymentMethod: "eWallet / Pay2Cell",
    pointsEarned: 1,
    etaMinutes: 35,
    customer: {
      name: "David Ndikwetepo",
      phone: "+264811234567",
      address: "12 Independence Ave, Windhoek",
      deliveryNote: "2nd Floor",
    },
  };

  console.log(`\n--- SCENARIO A: VAT ENABLED (VAT = 15%) ---`);
  console.log(`[Order Code]   : ${orderA.code}`);
  console.log(`[Subtotal]     : ${rupiah(orderA.subtotal)}`);
  console.log(`[VAT (15%)]    : ${rupiah(orderA.vatAmount || 0)}`);
  console.log(`[Delivery Fee] : ${rupiah(orderA.deliveryFee)}`);
  console.log(`[Total Amount] : ${rupiah(orderA.total)}`);

  const waTextA = buildWhatsappMessage(orderA, "N$");
  console.log(`\n[GENERATED WHATSAPP MESSAGE (VAT ON)]:\n${waTextA}`);

  if (!waTextA.includes("VAT (15%)") || !waTextA.includes("N$ 17")) {
    throw new Error(
      "Regression test failed: VAT line missing in WhatsApp message when vatEnabled = true!",
    );
  }

  // -------------------------------------------------------------
  // TEST SCENARIO B: VAT ENABLED = false
  // -------------------------------------------------------------
  const orderB: Order = {
    id: `ord-b-${Math.floor(1000 + Math.random() * 9000)}`,
    code: `NK-5002`,
    createdAt: Date.now(),
    type: "delivery",
    lines: [cartLine],
    subtotal: 110,
    vatAmount: 0,
    vatPercent: 15,
    discount: 0,
    voucherCode: "",
    deliveryFee: 25,
    total: 110 + 25, // 135
    status: "Pending Payment",
    paid: false,
    paymentMethod: "Bank Transfer / EFT",
    pointsEarned: 1,
    etaMinutes: 35,
    customer: {
      name: "Anna Shipanga",
      phone: "+264818889900",
      address: "45 Sam Nujoma Drive, Windhoek",
      deliveryNote: "White gate",
    },
  };

  console.log(`\n--- SCENARIO B: VAT DISABLED ---`);
  console.log(`[Order Code]   : ${orderB.code}`);
  console.log(`[Subtotal]     : ${rupiah(orderB.subtotal)}`);
  console.log(`[VAT Amount]   : ${orderB.vatAmount || 0} (Omitted)`);
  console.log(`[Delivery Fee] : ${rupiah(orderB.deliveryFee)}`);
  console.log(`[Total Amount] : ${rupiah(orderB.total)}`);

  const waTextB = buildWhatsappMessage(orderB, "N$");
  console.log(`\n[GENERATED WHATSAPP MESSAGE (VAT OFF)]:\n${waTextB}`);

  if (waTextB.includes("VAT")) {
    throw new Error("Regression test failed: VAT line should not appear when vatEnabled = false!");
  }

  // -------------------------------------------------------------
  // TEST SCENARIO C: COD DISABLED (codEnabled = false)
  // -------------------------------------------------------------
  const settingsWithCodOff: Settings = {
    currencySymbol: "N$",
    storeName: "Nanami Kitchen",
    storeTagline: "",
    storeAddress: "",
    storeOpen: true,
    deliveryOn: true,
    pickupOn: true,
    codEnabled: false,
    vatEnabled: true,
    vatPercent: 15,
    whatsapp: "27812345678",
    baseFee: 25,
    feePerKm: 5,
    maxRadiusKm: 15,
    storeMapsUrl: "",
    storeLat: 0,
    storeLng: 0,
    minFee: 25,
    freeDeliveryAbove: 250,
    routeFactor: 1.3,
    bankName: "FNB",
    bankAccount: "123",
    bankHolder: "Nanami",
    ewallet: "081",
    openHours: "",
    pointsPer10k: 1,
    adminPassword: "123",
  };

  const paymentOptionsBase = [
    { id: "ewallet", label: "eWallet / Pay2Cell" },
    { id: "bank", label: "Bank Transfer" },
    { id: "cod", label: "Cash on Delivery" },
  ];
  const filteredPaymentOptions = paymentOptionsBase.filter(
    (opt) => opt.id !== "cod" || settingsWithCodOff.codEnabled !== false,
  );

  console.log(`\n--- SCENARIO C: COD DISABLED CHECK ---`);
  console.log(`[codEnabled]   : ${settingsWithCodOff.codEnabled}`);
  console.log(
    `[Available Payment Options]:`,
    filteredPaymentOptions.map((p) => p.id),
  );

  if (filteredPaymentOptions.some((p) => p.id === "cod")) {
    throw new Error(
      "Regression test failed: COD option should be filtered out when codEnabled = false!",
    );
  }

  // -------------------------------------------------------------
  // TEST SCENARIO D: DYNAMIC CURRENCY SYMBOL = "$"
  // -------------------------------------------------------------
  console.log(`\n--- SCENARIO D: DYNAMIC CURRENCY SYMBOL = "$" ---`);
  const waTextD = buildWhatsappMessage(orderA, "$");
  console.log(`[GENERATED WHATSAPP MESSAGE (CURRENCY SYMBOL = $)]:\n${waTextD}`);

  if (!waTextD.includes("$ 110") || !waTextD.includes("$ 17") || !waTextD.includes("$ 152")) {
    throw new Error(
      "Regression test failed: Dynamic currency symbol '$' was not correctly applied!",
    );
  }

  console.log("=========================================================================");
  console.log("ALL PHASE 5 REGRESSION TESTS PASSED SUCCESSFULLY!");
  console.log("=========================================================================");
}

runPhase5Regression().catch(console.error);
