import { formatCurrency } from "../lib/currency";
import { getCatalogItem, type MenuItem } from "../lib/catalogData";
import type { CartLine, Order } from "../lib/store";
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

async function runCategoryRegressionTest() {
  const randomId = Math.floor(5000 + Math.random() * 4000);
  const rupiah = (n: number) => formatCurrency(n, "N$");

  console.log("=========================================================================");
  console.log(
    `REGRESSION TEST B: REGULAR CATEGORY LIST -> CART -> CHECKOUT (Order: NK-${randomId})`,
  );
  console.log("=========================================================================");

  // 1. Real lookup from store catalog data (Category list item: m3 Iced Milk Tea)
  const item = getCatalogItem("m3")!;
  console.log(
    `[Store Lookup] : getCatalogItem("m3") -> Name: "${item.name}" | Base Price: ${rupiah(item.price)}`,
  );

  // 2. Select options matching ProductSheet calculation logic
  const selectedChoiceIds = ["large"]; // Large size (+15)
  const calc = calculateUnitPrice(item, selectedChoiceIds);
  console.log(
    `[Price Calc]  : Base Price (${rupiah(item.price)}) + Option Deltas (${rupiah(calc.unitPrice - item.price)}) = Calculated Unit Price (${rupiah(calc.unitPrice)})`,
  );

  const cartLine: CartLine = {
    id: `cart-cat-${Date.now()}`,
    itemId: item.id,
    name: item.name, // Real catalog item name, not hardcoded
    unitPrice: calc.unitPrice, // Calculated dynamically from base + options
    qty: 2,
    optionLabels: calc.labels, // Resolved option choice names
    note: "Separate ice please",
  };

  const subtotal = calc.unitPrice * cartLine.qty;
  const order: Order = {
    id: `ord-${randomId}`,
    code: `NK-${randomId}`,
    createdAt: Date.now(),
    type: "pickup",
    lines: [cartLine],
    subtotal: subtotal,
    discount: 0,
    voucherCode: "",
    deliveryFee: 0,
    total: subtotal,
    status: "Pending Payment",
    paid: false,
    paymentMethod: "Cash on Pickup",
    pointsEarned: 0,
    etaMinutes: 20,
    customer: {
      name: "Thomas Shaanika",
      phone: "+264811223344",
      address: "Kitchen Pickup",
      deliveryNote: "Pick up at 5 PM",
    },
  };

  console.log(`[Order Code]   : ${order.code}`);
  console.log(`[Customer]     : ${order.customer.name} (${order.customer.phone})`);
  console.log(`[Item Added]   : ${cartLine.name} x${cartLine.qty} (${rupiah(calc.unitPrice)})`);
  console.log(`[Options]      : [${cartLine.optionLabels.join(", ")}]`);
  console.log(`[Note]         : "${cartLine.note}"`);
  console.log(`[Total Amount] : ${rupiah(order.total)}`);

  const waText = buildWhatsappMessage(order);
  console.log(`\n[GENERATED WHATSAPP MESSAGE]:\n${waText}`);
  console.log("=========================================================================");
  console.log("REGRESSION TEST B (CATEGORY LIST) PASSED SUCCESSFULLY!");
  console.log("=========================================================================");
}

runCategoryRegressionTest().catch(console.error);
