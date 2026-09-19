export type OptionChoice = { id: string; name: string; price: number };
export type OptionGroup = {
  id: string;
  name: string;
  type: "single" | "multi";
  enabled?: boolean;
  choices: OptionChoice[];
};
export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  available: boolean;
  prepMinutes: number;
  badges: string[];
  groups: OptionGroup[];
  specialRequestEnabled: boolean;
};

const size: OptionGroup = {
  id: "size",
  name: "Portion Size",
  type: "single",
  enabled: true,
  choices: [
    { id: "reg", name: "Regular", price: 0 },
    { id: "large", name: "Large", price: 15 },
  ],
};

const toppings: OptionGroup = {
  id: "topping",
  name: "Extra Toppings",
  type: "multi",
  enabled: true,
  choices: [
    { id: "egg", name: "Fried Egg", price: 15 },
    { id: "cheese", name: "Mozzarella Cheese", price: 20 },
    { id: "sambal", name: "Extra Chili Sauce", price: 10 },
  ],
};

const spice: OptionGroup = {
  id: "spice",
  name: "Spice Level",
  type: "single",
  enabled: true,
  choices: [
    { id: "s0", name: "Not Spicy", price: 0 },
    { id: "s1", name: "Medium Spicy", price: 0 },
    { id: "s2", name: "Extra Spicy", price: 5 },
  ],
};

export function getCatalogItem(id: string): MenuItem | undefined {
  return catalogItems.find((m) => m.id === id);
}

export const catalogItems: MenuItem[] = [
  {
    id: "m1",
    name: "Teriyaki Chicken Bento",
    description: "Grilled teriyaki chicken with warm rice and Japanese pickles.",
    price: 95,
    category: "Meals",
    image: "",
    available: true,
    prepMinutes: 15,
    badges: ["Halal-friendly", "Contains Soy"],
    groups: [size, toppings],
    specialRequestEnabled: true,
  },
  {
    id: "m2",
    name: "Crispy Smashed Chicken",
    description: "Crispy smashed chicken served with fresh chili sauce.",
    price: 85,
    category: "Meals",
    image: "",
    available: true,
    prepMinutes: 18,
    badges: ["Halal-friendly", "Spicy"],
    groups: [spice, toppings],
    specialRequestEnabled: true,
  },
  {
    id: "m3",
    name: "Iced Milk Tea",
    description: "House brewed tea with fresh milk and brown sugar.",
    price: 35,
    category: "Drinks",
    image: "",
    available: true,
    prepMinutes: 5,
    badges: ["Contains Dairy"],
    groups: [size],
    specialRequestEnabled: true,
  },
  {
    id: "m4",
    name: "Crispy Snack Platter",
    description: "Golden fried bites served with signature dipping sauce.",
    price: 65,
    category: "Snacks",
    image: "",
    available: true,
    prepMinutes: 12,
    badges: ["Contains Gluten"],
    groups: [toppings],
    specialRequestEnabled: true,
  },
  {
    id: "m5",
    name: "Crispy Chicken & Tea Combo",
    description: "Smashed chicken, fragrant rice, and iced milk tea.",
    price: 110,
    category: "Combos",
    image: "",
    available: true,
    prepMinutes: 20,
    badges: ["Halal-friendly", "Spicy"],
    groups: [spice],
    specialRequestEnabled: true,
  },
  {
    id: "m6",
    name: "Signature Chili Jar (150ml)",
    description: "Take our fiery chili sauce home. Fresh and spicy.",
    price: 45,
    category: "Others",
    image: "",
    available: true,
    prepMinutes: 2,
    badges: ["Spicy", "Vegan"],
    groups: [],
    specialRequestEnabled: true,
  },
];
