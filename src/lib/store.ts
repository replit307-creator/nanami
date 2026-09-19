import { useRef, useSyncExternalStore } from "react";
import type {
  Category,
  OptionChoice,
  OptionGroup,
  MenuItem,
  CartLine,
  OrderStatus,
  Order,
  Promo,
  CmsFaq,
  MediaAsset,
  CheckoutCms,
  CmsContent,
  Voucher,
  Settings,
  Profile,
  Account,
  StaffRole,
  StaffMember,
  State,
} from "../types";
import { DEFAULT_CATEGORIES, CATEGORIES } from "../types";
import { defaultCmsContent, defaultCheckoutCms } from "./default-cms";
import { food1, food2, food3, food4 } from "./images";
import {
  getDatabaseState,
  saveMenuItemDb,
  deleteMenuItemDb,
  saveOrderDb,
  saveVoucherDb,
  deleteVoucherDb,
  savePromoDb,
  deletePromoDb,
  saveAccountDb,
  saveStaffDb,
  saveSettingsDb,
  saveCmsDb,
  saveMediaAssetDb,
  deleteMediaAssetDb,
  updateMediaAssetUsageDb,
  deleteAccountDb,
  loginServerFn,
} from "./server-functions";
import { formatCurrency, setCurrencySymbol } from "./currency";
import { resolveMenuImage, handleImageError } from "./images";
import {
  cleanWhatsappNumber,
  buildWhatsappMessage,
  formatWhatsappDisplayNumber,
  WHATSAPP_VARIABLES,
  WHATSAPP_PRESETS,
} from "./whatsapp";
import {
  resolveOrderType,
  validateNewOrderSubmission,
  getAvailableOrderTypes,
} from "./order-availability";

import { haversineKm } from "./geo";

export {
  resolveMenuImage,
  handleImageError,
  cleanWhatsappNumber,
  buildWhatsappMessage,
  formatWhatsappDisplayNumber,
  resolveOrderType,
  validateNewOrderSubmission,
  getAvailableOrderTypes,
  WHATSAPP_VARIABLES,
  WHATSAPP_PRESETS,
  haversineKm,
};
export { DEFAULT_CATEGORIES, CATEGORIES, defaultCmsContent, defaultCheckoutCms };
export type {
  Category,
  OptionChoice,
  OptionGroup,
  MenuItem,
  CartLine,
  OrderStatus,
  Order,
  Promo,
  CmsFaq,
  MediaAsset,
  CheckoutCms,
  CmsContent,
  Voucher,
  Settings,
  Profile,
  Account,
  StaffRole,
  StaffMember,
  State,
};

export function getAvailableCategories(
  cms?: Partial<CmsContent> | null,
  menu?: MenuItem[],
): string[] {
  const cmsOrder = (cms?.categoryOrder || []).filter(Boolean);
  const menuCats = (menu || []).map((m) => m.category).filter(Boolean);
  const list = Array.from(new Set([...cmsOrder, ...menuCats, ...DEFAULT_CATEGORIES]));
  return list.filter(Boolean);
}

const spice: OptionGroup = {
  id: "spice",
  name: "Spice Level",
  type: "single",
  enabled: true,
  choices: [
    { id: "mild", name: "Mild", price: 0 },
    { id: "medium", name: "Medium", price: 0 },
    { id: "hot", name: "Extra Hot", price: 5 },
  ],
};

const size: OptionGroup = {
  id: "size",
  name: "Size",
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

export const seedMenu: MenuItem[] = [
  {
    id: "m1",
    name: "Teriyaki Chicken Bento",
    description: "Grilled teriyaki chicken with warm rice and Japanese pickles.",
    price: 95,
    category: "Meals",
    image: food1,
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
    image: food2,
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
    image: food3,
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
    image: food4,
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
    image: food2,
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
    image: food2,
    available: true,
    prepMinutes: 2,
    badges: ["Spicy", "Vegan"],
    groups: [],
    specialRequestEnabled: true,
  },
];

export const DEMO_ACCOUNTS: Account[] = [
  {
    id: "demo-owner",
    email: "owner@nanami.id",
    password: "owner123",
    name: "Nanami Owner",
    phone: "+264811234567",
    role: "owner",
    address: "Nanami Kitchen HQ, Independence Ave, Windhoek, Namibia",
    addresses: ["Nanami Kitchen HQ, Independence Ave, Windhoek, Namibia"],
    points: 1500,
  },
  {
    id: "demo-admin",
    email: "admin@nanami.id",
    password: "admin123",
    name: "Kitchen Admin",
    phone: "+264812345678",
    role: "admin",
    address: "Kitchen 1, Nanami Kitchen, Windhoek",
    addresses: ["Kitchen 1, Nanami Kitchen, Windhoek"],
    points: 120,
  },
  {
    id: "demo-staff",
    email: "staff@nanami.id",
    password: "staff123",
    name: "Kitchen Staff",
    phone: "+264813456789",
    role: "staff",
    address: "Nanami Kitchen Line 1, Windhoek",
    addresses: ["Nanami Kitchen Line 1, Windhoek"],
    points: 0,
  },
  {
    id: "demo-user",
    email: "user@nanami.id",
    password: "user123",
    name: "Customer Nanami",
    phone: "+264814567890",
    role: "user",
    address: "15 Sam Nujoma Drive, Windhoek, Namibia",
    addresses: ["15 Sam Nujoma Drive, Windhoek, Namibia"],
    points: 350,
  },
  {
    id: "legacy-user",
    email: "user@nanamikitchen.com",
    password: "user123",
    name: "David Smith",
    phone: "0812345678",
    role: "user",
    address: "12 Independence Avenue, Windhoek Central, Windhoek",
    addresses: [
      "12 Independence Avenue, Windhoek Central, Windhoek",
      "45 Sam Nujoma Drive, Klein Windhoek, Windhoek",
    ],
    points: 350,
  },
  {
    id: "legacy-admin",
    email: "admin@nanamikitchen.com",
    password: "admin123",
    name: "Sarah Jenkins",
    phone: "+264812345678",
    role: "admin",
    address: "Kitchen 2, Maerua Mall, Windhoek",
    addresses: ["Kitchen 2, Maerua Mall, Windhoek"],
    points: 120,
  },
  {
    id: "legacy-staff",
    email: "staff@nanamikitchen.com",
    password: "staff123",
    name: "David Miller (Kitchen)",
    phone: "+264813456789",
    role: "staff",
    address: "Nanami Kitchen Line 1, Windhoek",
    addresses: ["Nanami Kitchen Line 1, Windhoek"],
    points: 0,
  },
  {
    id: "legacy-owner",
    email: "owner@nanamikitchen.com",
    password: "owner123",
    name: "Nanami Miller",
    phone: "+264811234567",
    role: "owner",
    address: "HQ Nanami Kitchen, Windhoek Central, Windhoek",
    addresses: ["HQ Nanami Kitchen, Windhoek Central, Windhoek"],
    points: 1500,
  },
];

const defaultState: State = {
  orderType: "delivery",
  orderTypeChosen: false,
  distanceKm: 3,
  customerMapsUrl: "",
  menu: seedMenu,
  cart: [],
  orders: [],
  settings: {
    currencySymbol: "N$",
    storeName: "Nanami Kitchen",
    storeTagline: "Japanese comfort food, made fresh daily",
    storeAddress: "12 Rosebank Road, Rosebank, Johannesburg",
    storeOpen: true,
    deliveryOn: true,
    pickupOn: true,
    codEnabled: true,
    vatEnabled: false,
    vatPercent: 15,
    whatsapp: "27812345678",
    baseFee: 25,
    feePerKm: 5,
    maxRadiusKm: 15,
    storeMapsUrl: "https://www.google.com/maps?q=-26.146,28.043",
    storeLat: -26.146,
    storeLng: 28.043,
    minFee: 25,
    freeDeliveryAbove: 250,
    routeFactor: 1.3,
    bankName: "Standard Bank / FNB",
    bankAccount: "62812345678",
    bankHolder: "Nanami Kitchen Pty Ltd",
    ewallet: "0812345678 (Capitec Pay / SnapScan)",
    openHours: "10:00 – 21:00 every day",
    pointsPer10k: 1,
    adminPassword: "nanami123",
  },
  profile: {
    name: "",
    phone: "",
    email: "",
    address: "",
    addresses: [],
    points: 0,
    signedIn: false,
    method: "",
    role: undefined,
  },
  promos: [
    {
      id: "p1",
      title: "Free delivery over N$ 250",
      subtitle: "Within 5 km radius of our kitchen",
      badge: "Delivery",
    },
    {
      id: "p2",
      title: "20% OFF all menu",
      subtitle: "Today only — use code NANAMI20",
      badge: "Special",
    },
    {
      id: "p3",
      title: "Earn points on every order",
      subtitle: "1 point for every N$ 100 spent",
      badge: "Loyalty",
    },
  ],
  vouchers: [
    { code: "NANAMI20", type: "percent", value: 20, minSpend: 0, active: true },
    { code: "SAVE20RAND", type: "fixed", value: 20, minSpend: 100, active: true },
  ],
  voucherCode: "",
  accounts: DEMO_ACCOUNTS,
  staff: [
    {
      id: "s1",
      name: "Nanami Owner",
      email: "owner@nanami.id",
      phone: "0812-1111-2222",
      role: "owner",
      active: true,
      createdAt: Date.parse("2025-01-10"),
    },
    {
      id: "s2",
      name: "Kitchen Admin",
      email: "admin@nanami.id",
      phone: "0812-3333-4444",
      role: "admin",
      active: true,
      createdAt: Date.parse("2025-03-02"),
    },
    {
      id: "s3",
      name: "Kitchen Staff",
      email: "staff@nanami.id",
      phone: "0812-5555-6666",
      role: "staff",
      active: true,
      createdAt: Date.parse("2025-06-18"),
    },
    {
      id: "s4",
      name: "Nanami Miller",
      email: "owner@nanamikitchen.com",
      phone: "0812-1111-2222",
      role: "owner",
      active: true,
      createdAt: Date.parse("2025-01-10"),
    },
  ],
  adminUnlocked: false,
  mediaAssets: [],
  cms: defaultCmsContent,
};

export function normalizeMenuItem(m: any): MenuItem {
  if (!m || typeof m !== "object") {
    return {
      id: uid(),
      name: "Unnamed Item",
      description: "",
      price: 0,
      category: "Meals",
      image: resolveMenuImage(undefined),
      prepMinutes: 15,
      badges: [],
      available: true,
      specialRequestEnabled: true,
      groups: [],
    };
  }
  return {
    id: String(m.id || uid()),
    name: String(m.name || "Unnamed Item"),
    description: String(m.description || ""),
    price: typeof m.price === "number" ? m.price : Number(m.price) || 0,
    category: String(m.category || "Meals"),
    image: resolveMenuImage(m.image),
    prepMinutes: typeof m.prepMinutes === "number" ? m.prepMinutes : Number(m.prepMinutes) || 15,
    badges: Array.isArray(m.badges) ? m.badges.filter(Boolean).map(String) : [],
    available: m.available !== false,
    stock: typeof m.stock === "number" ? m.stock : null,
    specialRequestEnabled: m.specialRequestEnabled !== false,
    groups: Array.isArray(m.groups)
      ? m.groups.map((g: any) => ({
          id: String(g.id || uid()),
          name: String(g.name || "Customization"),
          type: g.type === "multi" ? ("multi" as const) : ("single" as const),
          enabled: g.enabled !== false,
          choices: Array.isArray(g.choices)
            ? g.choices.map((c: any) => ({
                id: String(c.id || uid()),
                name: String(c.name || ""),
                price: typeof c.price === "number" ? c.price : Number(c.price) || 0,
              }))
            : [],
        }))
      : [],
  };
}

export function normalizeProfile(p: any): Profile {
  if (!p || typeof p !== "object") {
    return {
      name: "",
      phone: "",
      email: "",
      address: "",
      addresses: [],
      points: 0,
      signedIn: false,
      method: "",
      role: undefined,
    };
  }
  const address = String(p.address || "");
  let addresses = Array.isArray(p.addresses) ? p.addresses.filter(Boolean).map(String) : [];
  if (addresses.length === 0 && address) {
    addresses = [address];
  }
  return {
    name: String(p.name || ""),
    phone: String(p.phone || ""),
    email: String(p.email || ""),
    address,
    addresses,
    points: typeof p.points === "number" ? p.points : Number(p.points) || 0,
    signedIn: Boolean(p.signedIn),
    method: String(p.method || ""),
    role: p.role,
  };
}

export function normalizeOrder(o: any): Order {
  return {
    ...o,
    id: String(o.id || uid()),
    code: String(o.code || ""),
    createdAt: typeof o.createdAt === "number" ? o.createdAt : Date.now(),
    type: o.type === "pickup" ? "pickup" : "delivery",
    status: o.status || "Pending Payment",
    paymentMethod: o.paymentMethod || "eWallet / Pay2Cell",
    customer: o.customer
      ? {
          name: String(o.customer.name || "Guest"),
          phone: String(o.customer.phone || ""),
          address: String(o.customer.address || ""),
        }
      : { name: "Guest", phone: "", address: "" },
    lines: Array.isArray(o.lines)
      ? o.lines.map((l: any) => ({
          ...l,
          id: String(l.id || uid()),
          itemId: String(l.itemId || ""),
          name: String(l.name || "Item"),
          qty: typeof l.qty === "number" ? l.qty : Number(l.qty) || 1,
          unitPrice: typeof l.unitPrice === "number" ? l.unitPrice : Number(l.unitPrice) || 0,
          optionLabels: Array.isArray(l.optionLabels) ? l.optionLabels.map(String) : [],
        }))
      : [],
    subtotal: typeof o.subtotal === "number" ? o.subtotal : Number(o.subtotal) || 0,
    deliveryFee: typeof o.deliveryFee === "number" ? o.deliveryFee : Number(o.deliveryFee) || 0,
    discount: typeof o.discount === "number" ? o.discount : Number(o.discount) || 0,
    total: typeof o.total === "number" ? o.total : Number(o.total) || 0,
  };
}

if (typeof window !== "undefined") {
  try {
    const saved = localStorage.getItem("nanami_auth_profile");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.signedIn) {
        defaultState.profile = normalizeProfile(parsed);
        defaultState.adminUnlocked =
          parsed.role === "admin" || parsed.role === "owner" || parsed.role === "staff";
      }
    }
    const savedMenu = localStorage.getItem("nanami_catalog_menu");
    if (savedMenu) {
      const parsedMenu = JSON.parse(savedMenu);
      if (Array.isArray(parsedMenu) && parsedMenu.length > 0) {
        defaultState.menu = parsedMenu.map(normalizeMenuItem);
      }
    }
  } catch (e) {
    console.debug(e);
  }
}

let state: State = defaultState;
const listeners = new Set<() => void>();

function set(updater: (s: State) => State) {
  state = updater(state);
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("nanami_auth_profile", JSON.stringify(state.profile));
      localStorage.setItem("nanami_admin_unlocked", JSON.stringify(state.adminUnlocked));
      localStorage.setItem("nanami_catalog_menu", JSON.stringify(state.menu));
    } catch (e) {
      console.debug(e);
    }
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function shallowEqual(a: unknown, b: unknown) {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  const ka = Object.keys(a as object);
  const kb = Object.keys(b as object);
  if (ka.length !== kb.length) return false;
  return ka.every((k) =>
    Object.is((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]),
  );
}

export function useStore<T>(selector: (s: State) => T): T {
  // Cache the derived snapshot so object-returning selectors stay referentially
  // stable between renders (otherwise useSyncExternalStore loops forever).
  const cache = useRef<{ value: T; base: State } | null>(null);

  const read = (base: State) => {
    if (cache.current && cache.current.base === base) {
      return cache.current.value;
    }
    const next = selector(base);
    if (cache.current && shallowEqual(cache.current.value, next)) {
      cache.current.base = base;
      return cache.current.value;
    }
    cache.current = { value: next, base };
    return next;
  };

  return useSyncExternalStore(
    subscribe,
    () => read(state),
    () => read(defaultState),
  );
}

export const actions = {
  async loadServerState() {
    try {
      const data = await getDatabaseState();
      if (data) {
        if (data.settings?.currencySymbol) {
          setCurrencySymbol(data.settings.currencySymbol);
        }
        set((s) => {
          const effectiveSettings = data.settings
            ? { ...s.settings, ...data.settings }
            : s.settings;
          const resolvedType = resolveOrderType(s.orderType, effectiveSettings) || s.orderType;
          return {
            ...s,
            settings: effectiveSettings,
            orderType: resolvedType,
            cms: data.cms
              ? {
                  ...s.cms,
                  ...data.cms,
                  checkout: {
                    ...defaultCheckoutCms,
                    ...(data.cms.checkout || {}),
                  },
                }
              : s.cms,
            menu: data.menu && data.menu.length ? data.menu.map(normalizeMenuItem) : s.menu,
            orders: data.orders && data.orders.length ? data.orders.map(normalizeOrder) : s.orders,
            promos: data.promos && data.promos.length ? data.promos : s.promos,
            vouchers: data.vouchers && data.vouchers.length ? data.vouchers : s.vouchers,
            accounts: data.accounts && data.accounts.length ? data.accounts : s.accounts,
            staff: data.staff && data.staff.length ? data.staff : s.staff,
          };
        });
        console.log("State synchronized from PostgreSQL database successfully.");
      }
    } catch (error) {
      console.warn("Failed to load state from database server. Using local memory state.", error);
    }
  },
  setOrderType(type: "pickup" | "delivery") {
    const resolved = resolveOrderType(type, state.settings) || type;
    set((s) => ({ ...s, orderType: resolved, orderTypeChosen: true }));
  },
  setDistanceKm(km: number) {
    set((s) => ({ ...s, distanceKm: Math.max(0.1, Math.round(km * 10) / 10) }));
  },
  /** Save customer's Google Maps point and the calculated distance. */
  setCustomerPoint(url: string, km: number) {
    set((s) => ({
      ...s,
      customerMapsUrl: url,
      distanceKm: Math.max(0.1, Math.round(km * 10) / 10),
    }));
  },
  setVoucherCode(code: string) {
    set((s) => ({ ...s, voucherCode: code.toUpperCase().trim() }));
  },
  saveVoucher(v: Voucher) {
    set((s) => ({
      ...s,
      vouchers: s.vouchers.some((x) => x.code === v.code)
        ? s.vouchers.map((x) => (x.code === v.code ? v : x))
        : [...s.vouchers, v],
    }));
    saveVoucherDb({ data: v }).catch(console.error);
  },
  deleteVoucher(code: string) {
    set((s) => ({ ...s, vouchers: s.vouchers.filter((v) => v.code !== code) }));
    deleteVoucherDb({ data: code }).catch(console.error);
  },
  savePromo(p: Promo) {
    set((s) => ({
      ...s,
      promos: s.promos.some((x) => x.id === p.id)
        ? s.promos.map((x) => (x.id === p.id ? p : x))
        : [...s.promos, p],
    }));
    savePromoDb({ data: p }).catch(console.error);
  },
  deletePromo(id: string) {
    set((s) => ({ ...s, promos: s.promos.filter((p) => p.id !== id) }));
    deletePromoDb({ data: id }).catch(console.error);
  },
  signUp(data: { name: string; email: string; phone: string; password: string }): {
    ok: boolean;
    error?: string;
    role?: "user" | "admin" | "owner" | "staff";
  } {
    const email = data.email.trim().toLowerCase();
    if (!email.includes("@")) return { ok: false, error: "Please enter a valid email address." };
    if (data.password.length < 6)
      return { ok: false, error: "Password must be at least 6 characters." };
    if (state.accounts.some((a) => a.email === email))
      return { ok: false, error: "This email is already registered. Please sign in." };
    const account: Account = {
      id: uid(),
      email,
      password: data.password,
      name: data.name.trim(),
      phone: data.phone.trim(),
    };
    set((s) => ({
      ...s,
      accounts: [...s.accounts, account],
      profile: {
        ...s.profile,
        name: account.name,
        email: account.email,
        phone: account.phone,
        role: "user",
        signedIn: true,
        method: "Email",
      },
    }));
    saveAccountDb({ data: account }).catch(console.error);
    return { ok: true, role: "user" };
  },
  async signIn(
    email: string,
    password: string,
  ): Promise<{ ok: boolean; error?: string; role?: "user" | "admin" | "owner" | "staff" }> {
    const clean = email.trim().toLowerCase();
    let account =
      state.accounts.find((a) => a.email.toLowerCase() === clean && a.password === password) ||
      DEMO_ACCOUNTS.find((a) => a.email.toLowerCase() === clean && a.password === password);

    if (!account) {
      try {
        const res = await loginServerFn({ data: { email: clean, password } });
        if (res.ok && res.account) {
          account = res.account;
          set((s) => ({
            ...s,
            accounts: s.accounts.some((a) => a.email.toLowerCase() === clean)
              ? s.accounts.map((a) => (a.email.toLowerCase() === clean ? account! : a))
              : [...s.accounts, account!],
          }));
        }
      } catch (err) {
        console.warn("Server login fallback error:", err);
      }
    }

    if (!account || account.password !== password)
      return { ok: false, error: "Invalid email or password." };

    const role = account.role ?? "user";
    set((s) => ({
      ...s,
      adminUnlocked: role === "admin" || role === "owner" || role === "staff",
      profile: {
        ...s.profile,
        name: account!.name,
        email: account!.email,
        phone: account!.phone,
        role,
        address: account!.address || s.profile.address,
        addresses:
          account!.addresses && account!.addresses.length
            ? account!.addresses
            : s.profile.addresses,
        points: account!.points !== undefined ? account!.points : s.profile.points,
        signedIn: true,
        method: "Email",
      },
    }));
    return { ok: true, role };
  },
  loginAsDemo(role: "user" | "admin" | "owner" | "staff"): {
    ok: boolean;
    error?: string;
    role?: "user" | "admin" | "owner" | "staff";
  } {
    const demo = DEMO_ACCOUNTS.find((a) => a.role === role);
    if (!demo) return { ok: false, error: "Demo account not found." };
    const cleanRole = demo.role ?? role;
    set((s) => ({
      ...s,
      adminUnlocked: cleanRole === "admin" || cleanRole === "owner" || cleanRole === "staff",
      profile: {
        ...s.profile,
        name: demo.name,
        email: demo.email,
        phone: demo.phone,
        role: cleanRole,
        address: demo.address || s.profile.address,
        addresses: demo.addresses && demo.addresses.length ? demo.addresses : s.profile.addresses,
        points: demo.points !== undefined ? demo.points : s.profile.points,
        signedIn: true,
        method: "Demo",
      },
    }));
    return { ok: true, role: cleanRole };
  },
  changePassword(currentPassword: string, newPassword: string): { ok: boolean; error?: string } {
    const email = state.profile.email;
    const account = state.accounts.find((a) => a.email === email);
    if (!account || account.password !== currentPassword)
      return { ok: false, error: "Current password is incorrect." };
    if (newPassword.length < 6)
      return { ok: false, error: "New password must be at least 6 characters." };
    set((s) => ({
      ...s,
      accounts: s.accounts.map((a) => (a.id === account.id ? { ...a, password: newPassword } : a)),
    }));
    return { ok: true };
  },
  signOut() {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("nanami_auth_profile");
        localStorage.removeItem("nanami_admin_unlocked");
      } catch (e) {
        console.debug(e);
      }
    }
    set((s) => ({ ...s, profile: { ...defaultState.profile }, adminUnlocked: false }));
  },
  unlockAdmin(password: string): boolean {
    if (password !== state.settings.adminPassword) return false;
    set((s) => ({ ...s, adminUnlocked: true }));
    return true;
  },
  lockAdmin() {
    set((s) => ({ ...s, adminUnlocked: false }));
  },
  setStock(id: string, stock: number | null) {
    set((s) => {
      const updatedMenu = s.menu.map((m) =>
        m.id === id ? { ...m, stock, available: stock === null ? m.available : stock > 0 } : m,
      );
      const updatedItem = updatedMenu.find((m) => m.id === id);
      if (updatedItem) {
        saveMenuItemDb({ data: updatedItem }).catch(console.error);
      }
      return { ...s, menu: updatedMenu };
    });
  },
  saveAddress(address: string) {
    set((s) => {
      const updatedProfile = {
        ...s.profile,
        address,
        addresses: s.profile.addresses.includes(address)
          ? s.profile.addresses
          : [address, ...s.profile.addresses].slice(0, 5),
      };

      // Sync profile's user account with db
      const account = s.accounts.find((a) => a.email === s.profile.email);
      if (account) {
        const updatedAcc = { ...account, address, addresses: updatedProfile.addresses };
        saveAccountDb({ data: updatedAcc }).catch(console.error);
      }

      return { ...s, profile: updatedProfile };
    });
  },
  removeAddress(address: string) {
    set((s) => {
      const updatedProfile = {
        ...s.profile,
        addresses: s.profile.addresses.filter((a) => a !== address),
      };

      const account = s.accounts.find((a) => a.email === s.profile.email);
      if (account) {
        const updatedAcc = { ...account, addresses: updatedProfile.addresses };
        saveAccountDb({ data: updatedAcc }).catch(console.error);
      }

      return { ...s, profile: updatedProfile };
    });
  },
  addToCart(line: Omit<CartLine, "id">) {
    set((s) => ({ ...s, cart: [...s.cart, { ...line, id: uid() }] }));
  },
  setQty(lineId: string, qty: number) {
    set((s) => ({
      ...s,
      cart:
        qty <= 0
          ? s.cart.filter((l) => l.id !== lineId)
          : s.cart.map((l) => (l.id === lineId ? { ...l, qty } : l)),
    }));
  },
  clearCart() {
    set((s) => ({ ...s, cart: [], voucherCode: "" }));
  },
  placeOrder(order: Omit<Order, "id" | "code" | "createdAt" | "status" | "paid" | "pointsEarned">) {
    const isMember = Boolean(state.profile.signedIn);
    const pointsEarned = isMember
      ? Math.floor(order.total / 10000) * state.settings.pointsPer10k
      : 0;
    const accountId = isMember
      ? state.accounts.find((a) => a.email.toLowerCase() === state.profile.email.toLowerCase())
          ?.id || null
      : null;

    const full: Order = {
      ...order,
      id: uid(),
      code: "NK-" + Math.floor(1000 + Math.random() * 9000),
      createdAt: Date.now(),
      status: "Pending Payment",
      paid: false,
      pointsEarned,
      accountId,
    };
    set((s) => {
      const updatedMenu = s.menu.map((m) => {
        if (m.stock === null || m.stock === undefined) return m;
        const ordered = full.lines
          .filter((l) => l.itemId === m.id)
          .reduce((sum, l) => sum + l.qty, 0);
        if (!ordered) return m;
        const stock = Math.max(0, m.stock - ordered);
        const updated = { ...m, stock, available: stock > 0 };
        saveMenuItemDb({ data: updated }).catch(console.error);
        return updated;
      });

      // Save order to db
      saveOrderDb({ data: full }).catch(console.error);

      // Save updated points for profile only if member
      let updatedPoints = s.profile.points;
      if (isMember && s.profile.email) {
        const account = s.accounts.find(
          (a) => a.email.toLowerCase() === s.profile.email.toLowerCase(),
        );
        updatedPoints = s.profile.points + pointsEarned;
        if (account) {
          const updatedAcc = { ...account, points: updatedPoints };
          saveAccountDb({ data: updatedAcc }).catch(console.error);
        }
      }

      return {
        ...s,
        orders: [full, ...s.orders],
        cart: [],
        voucherCode: "",
        menu: updatedMenu,
        profile: isMember ? { ...s.profile, points: updatedPoints } : s.profile,
      };
    });
    return full;
  },
  async submitOrder(
    orderData: Omit<Order, "id" | "code" | "createdAt" | "status" | "paid" | "pointsEarned">,
  ): Promise<{
    ok: boolean;
    order?: Order;
    error?: string;
    rejected?: boolean;
  }> {
    const clientValidation = validateNewOrderSubmission(orderData.type, state.settings);
    if (!clientValidation.valid) {
      return { ok: false, error: clientValidation.error, rejected: true };
    }

    const isMember = Boolean(state.profile.signedIn);
    const pointsEarned = isMember
      ? Math.floor(orderData.total / 10000) * state.settings.pointsPer10k
      : 0;
    const accountId = isMember
      ? state.accounts.find((a) => a.email.toLowerCase() === state.profile.email.toLowerCase())
          ?.id || null
      : null;

    const full: Order = {
      ...orderData,
      id: uid(),
      code: "NK-" + Math.floor(1000 + Math.random() * 9000),
      createdAt: Date.now(),
      status: "Pending Payment",
      paid: false,
      pointsEarned,
      accountId,
    };

    try {
      const res = await saveOrderDb({ data: full });
      if (!res.ok) {
        return {
          ok: false,
          error: res.error || "Order was rejected by server.",
          rejected: (res as any).rejected,
        };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: msg || "Failed to submit order to server." };
    }

    set((s) => {
      const updatedMenu = s.menu.map((m) => {
        if (m.stock === null || m.stock === undefined) return m;
        const ordered = full.lines
          .filter((l) => l.itemId === m.id)
          .reduce((sum, l) => sum + l.qty, 0);
        if (!ordered) return m;
        const stock = Math.max(0, m.stock - ordered);
        const updated = { ...m, stock, available: stock > 0 };
        saveMenuItemDb({ data: updated }).catch(console.error);
        return updated;
      });

      let updatedPoints = s.profile.points;
      if (isMember && s.profile.email) {
        const account = s.accounts.find(
          (a) => a.email.toLowerCase() === s.profile.email.toLowerCase(),
        );
        updatedPoints = s.profile.points + pointsEarned;
        if (account) {
          const updatedAcc = { ...account, points: updatedPoints };
          saveAccountDb({ data: updatedAcc }).catch(console.error);
        }
      }

      return {
        ...s,
        orders: [full, ...s.orders],
        cart: [],
        voucherCode: "",
        menu: updatedMenu,
        profile: isMember ? { ...s.profile, points: updatedPoints } : s.profile,
      };
    });

    return { ok: true, order: full };
  },
  setOrderStatus(id: string, status: OrderStatus) {
    set((s) => {
      const updatedOrders = s.orders.map((o) =>
        o.id === id ? { ...o, status, paid: o.paid || status !== "Pending Payment" } : o,
      );
      const updatedOrder = updatedOrders.find((o) => o.id === id);
      if (updatedOrder) {
        saveOrderDb({ data: updatedOrder }).catch(console.error);
      }
      return { ...s, orders: updatedOrders };
    });
  },
  markPaid(id: string) {
    set((s) => {
      const updatedOrders: Order[] = s.orders.map((o) =>
        o.id === id ? { ...o, paid: true, status: "Cooking" as OrderStatus } : o,
      );
      const updatedOrder = updatedOrders.find((o) => o.id === id);
      if (updatedOrder) {
        saveOrderDb({ data: updatedOrder }).catch(console.error);
      }
      return { ...s, orders: updatedOrders };
    });
  },
  async saveMenuItem(item: MenuItem) {
    const cleanItem: MenuItem = {
      ...item,
      specialRequestEnabled:
        item.specialRequestEnabled !== undefined ? Boolean(item.specialRequestEnabled) : true,
    };

    set((s) => {
      const oldItem = s.menu.find((m) => m.id === cleanItem.id);
      let updatedMediaAssets = [...s.mediaAssets];

      if (!oldItem || oldItem.image !== cleanItem.image) {
        if (oldItem && oldItem.image) {
          updatedMediaAssets = updatedMediaAssets.map((asset) => {
            if (asset.url === oldItem.image) {
              const newUsage = asset.usedByMenuIds.filter((id) => id !== cleanItem.id);
              updateMediaAssetUsageDb({ data: { id: asset.id, usedByMenuIds: newUsage } }).catch(
                console.error,
              );
              return { ...asset, usedByMenuIds: newUsage };
            }
            return asset;
          });
        }
        if (cleanItem.image) {
          updatedMediaAssets = updatedMediaAssets.map((asset) => {
            if (asset.url === cleanItem.image) {
              const newUsage = Array.from(new Set([...asset.usedByMenuIds, cleanItem.id]));
              updateMediaAssetUsageDb({ data: { id: asset.id, usedByMenuIds: newUsage } }).catch(
                console.error,
              );
              return { ...asset, usedByMenuIds: newUsage };
            }
            return asset;
          });
        }
      }

      return {
        ...s,
        menu: s.menu.some((m) => m.id === cleanItem.id)
          ? s.menu.map((m) => (m.id === cleanItem.id ? cleanItem : m))
          : [...s.menu, cleanItem],
        mediaAssets: updatedMediaAssets,
      };
    });

    try {
      await saveMenuItemDb({ data: cleanItem });
    } catch (err) {
      console.error("Failed to save menu item to database/server:", err);
    }
  },
  async deleteMenuItem(id: string) {
    set((s) => {
      const item = s.menu.find((m) => m.id === id);
      let updatedMediaAssets = [...s.mediaAssets];
      if (item && item.image) {
        updatedMediaAssets = updatedMediaAssets.map((asset) => {
          if (asset.url === item.image) {
            const newUsage = asset.usedByMenuIds.filter((uid) => uid !== id);
            updateMediaAssetUsageDb({ data: { id: asset.id, usedByMenuIds: newUsage } }).catch(
              console.error,
            );
            return { ...asset, usedByMenuIds: newUsage };
          }
          return asset;
        });
      }
      return {
        ...s,
        menu: s.menu.filter((m) => m.id !== id),
        mediaAssets: updatedMediaAssets,
      };
    });

    try {
      await deleteMenuItemDb({ data: id });
    } catch (err) {
      console.error("Failed to delete menu item from database/server:", err);
    }
  },
  toggleAvailability(id: string) {
    set((s) => {
      const updatedMenu = s.menu.map((m) => (m.id === id ? { ...m, available: !m.available } : m));
      const updatedItem = updatedMenu.find((m) => m.id === id);
      if (updatedItem) {
        saveMenuItemDb({ data: updatedItem }).catch(console.error);
      }
      return { ...s, menu: updatedMenu };
    });
  },
  setAvailability(id: string, available: boolean) {
    set((s) => {
      const updatedMenu = s.menu.map((m) => (m.id === id ? { ...m, available } : m));
      const updatedItem = updatedMenu.find((m) => m.id === id);
      if (updatedItem) {
        saveMenuItemDb({ data: updatedItem }).catch(console.error);
      }
      return { ...s, menu: updatedMenu };
    });
  },
  setAllAvailability(available: boolean) {
    set((s) => {
      s.menu.forEach((m) => {
        saveMenuItemDb({ data: { ...m, available } }).catch(console.error);
      });
      return { ...s, menu: s.menu.map((m) => ({ ...m, available })) };
    });
  },
  saveStaff(member: StaffMember) {
    set((s) => ({
      ...s,
      staff: s.staff.some((x) => x.id === member.id)
        ? s.staff.map((x) => (x.id === member.id ? member : x))
        : [...s.staff, member],
    }));
    saveStaffDb({ data: member }).catch(console.error);
  },
  updateStaff(id: string, patch: Partial<StaffMember>) {
    set((s) => {
      const updatedStaff = s.staff.map((x) => (x.id === id ? { ...x, ...patch } : x));
      const updatedMember = updatedStaff.find((x) => x.id === id);
      if (updatedMember) {
        saveStaffDb({ data: updatedMember }).catch(console.error);
      }
      return { ...s, staff: updatedStaff };
    });
  },
  deleteStaff(id: string) {
    set((s) => {
      const staffMember = s.staff.find((x) => x.id === id);
      if (staffMember) {
        // Soft delete/mark inactive in database
        saveStaffDb({ data: { ...staffMember, active: false } }).catch(console.error);
      }
      return { ...s, staff: s.staff.filter((x) => x.id !== id) };
    });
  },
  updateSettings(patch: Partial<Settings>) {
    set((s) => {
      if (patch.currencySymbol) {
        setCurrencySymbol(patch.currencySymbol);
      }
      const updated = { ...s.settings, ...patch };
      saveSettingsDb({ data: updated }).catch(console.error);
      const resolved = resolveOrderType(s.orderType, updated) || s.orderType;
      return { ...s, settings: updated, orderType: resolved };
    });
  },
  updateProfile(patch: Partial<Profile>) {
    set((s) => {
      const updatedProfile = { ...s.profile, ...patch };

      // Update matching user account in db only if user is logged in
      if (s.profile.signedIn && s.profile.email) {
        const account = s.accounts.find(
          (a) => a.email.toLowerCase() === s.profile.email.toLowerCase(),
        );
        if (account) {
          const updatedAcc = {
            ...account,
            name: updatedProfile.name || account.name,
            phone: updatedProfile.phone || account.phone,
            address: updatedProfile.address || account.address,
            addresses: updatedProfile.addresses.length
              ? updatedProfile.addresses
              : account.addresses,
            points: updatedProfile.points,
          };
          saveAccountDb({ data: updatedAcc }).catch(console.error);
        }
      }

      return { ...s, profile: updatedProfile };
    });
  },
  updateCms(patch: Partial<CmsContent>) {
    set((s) => {
      const updated = { ...s.cms, ...patch };
      saveCmsDb({ data: updated }).catch(console.error);
      return { ...s, cms: updated };
    });
  },
  updateCmsAnnouncement(patch: Partial<CmsContent["announcement"]>) {
    set((s) => {
      const updated = {
        ...s.cms,
        announcement: { ...s.cms.announcement, ...patch },
      };
      saveCmsDb({ data: updated }).catch(console.error);
      return { ...s, cms: updated };
    });
  },
  updateCmsWelcome(patch: Partial<CmsContent["welcomeScreen"]>) {
    set((s) => {
      const updated = {
        ...s.cms,
        welcomeScreen: { ...s.cms.welcomeScreen, ...patch },
      };
      saveCmsDb({ data: updated }).catch(console.error);
      return { ...s, cms: updated };
    });
  },
  updateCmsSocials(patch: Partial<CmsContent["socials"]>) {
    set((s) => {
      const updated = {
        ...s.cms,
        socials: { ...s.cms.socials, ...patch },
      };
      saveCmsDb({ data: updated }).catch(console.error);
      return { ...s, cms: updated };
    });
  },
  updateCmsCheckout(patch: Partial<CheckoutCms>) {
    set((s) => {
      const current = s.cms?.checkout || defaultCheckoutCms;
      const updatedCheckout = { ...current, ...patch };
      const updated = {
        ...s.cms,
        checkout: updatedCheckout,
      };
      saveCmsDb({ data: updated }).catch(console.error);
      return { ...s, cms: updated };
    });
  },
  addCmsFaq(faq: { question: string; answer: string; active?: boolean }) {
    const newFaq: CmsFaq = {
      id: "faq-" + uid(),
      question: faq.question.trim(),
      answer: faq.answer.trim(),
      active: faq.active ?? true,
    };
    set((s) => {
      const updated = {
        ...s.cms,
        faqs: [...s.cms.faqs, newFaq],
      };
      saveCmsDb({ data: updated }).catch(console.error);
      return { ...s, cms: updated };
    });
  },
  updateCmsFaq(id: string, patch: Partial<CmsFaq>) {
    set((s) => {
      const updated = {
        ...s.cms,
        faqs: s.cms.faqs.map((f) => (f.id === id ? { ...f, ...patch } : f)),
      };
      saveCmsDb({ data: updated }).catch(console.error);
      return { ...s, cms: updated };
    });
  },
  deleteCmsFaq(id: string) {
    set((s) => {
      const updated = {
        ...s.cms,
        faqs: s.cms.faqs.filter((f) => f.id !== id),
      };
      saveCmsDb({ data: updated }).catch(console.error);
      return { ...s, cms: updated };
    });
  },
  saveMediaAsset(asset: MediaAsset) {
    set((s) => ({
      ...s,
      mediaAssets: s.mediaAssets.some((m) => m.id === asset.id)
        ? s.mediaAssets.map((m) => (m.id === asset.id ? asset : m))
        : [...s.mediaAssets, asset],
    }));
    saveMediaAssetDb({ data: asset }).catch(console.error);
  },
  deleteMediaAsset(id: string) {
    set((s) => ({
      ...s,
      mediaAssets: s.mediaAssets.filter((m) => m.id !== id),
    }));
    deleteMediaAssetDb({ data: id }).catch(console.error);
  },
  saveAccount(acc: Account) {
    set((s) => ({
      ...s,
      accounts: s.accounts.some((a) => a.id === acc.id)
        ? s.accounts.map((a) => (a.id === acc.id ? acc : a))
        : [...s.accounts, acc],
    }));
    saveAccountDb({ data: acc }).catch(console.error);
  },
  deleteAccount(id: string) {
    set((s) => ({
      ...s,
      accounts: s.accounts.filter((a) => a.id !== id),
    }));
    deleteAccountDb({ data: id }).catch(console.error);
  },
  addCategory(name: string, displayName?: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    set((s) => {
      const currentOrder = s.cms?.categoryOrder?.length
        ? s.cms.categoryOrder
        : [...DEFAULT_CATEGORIES];
      const exists = currentOrder.some((c) => c.toLowerCase() === trimmed.toLowerCase());
      if (exists) return s;

      const newOrder = [...currentOrder, trimmed];
      const newNames = {
        ...(s.cms?.categoryNames || {}),
        [trimmed]: displayName?.trim() || trimmed,
      };
      const updatedCms: CmsContent = {
        ...s.cms,
        categoryOrder: newOrder,
        categoryNames: newNames,
      };
      saveCmsDb({ data: updatedCms }).catch(console.error);
      return { ...s, cms: updatedCms };
    });
  },
  updateCategory(oldName: string, newName: string, newDisplayName?: string) {
    const trimmedNew = newName.trim();
    if (!trimmedNew) return;
    set((s) => {
      const currentOrder = s.cms?.categoryOrder?.length
        ? s.cms.categoryOrder
        : [...DEFAULT_CATEGORIES];
      const newOrder = currentOrder.map((c) =>
        c.toLowerCase() === oldName.toLowerCase() ? trimmedNew : c,
      );

      const newNames: Record<string, string> = {};
      for (const [key, val] of Object.entries(s.cms?.categoryNames || {})) {
        if (key.toLowerCase() === oldName.toLowerCase()) {
          newNames[trimmedNew] = newDisplayName?.trim() || val || trimmedNew;
        } else {
          newNames[key] = val;
        }
      }
      if (!newNames[trimmedNew]) {
        newNames[trimmedNew] = newDisplayName?.trim() || trimmedNew;
      }

      const updatedMenu = s.menu.map((m) => {
        if (m.category.toLowerCase() === oldName.toLowerCase()) {
          const updatedItem = { ...m, category: trimmedNew };
          saveMenuItemDb({ data: updatedItem }).catch(console.error);
          return updatedItem;
        }
        return m;
      });

      const updatedCms: CmsContent = {
        ...s.cms,
        categoryOrder: newOrder,
        categoryNames: newNames,
      };
      saveCmsDb({ data: updatedCms }).catch(console.error);
      return { ...s, cms: updatedCms, menu: updatedMenu };
    });
  },
  deleteCategory(categoryName: string, fallbackCategory?: string) {
    set((s) => {
      const currentOrder = s.cms?.categoryOrder?.length
        ? s.cms.categoryOrder
        : [...DEFAULT_CATEGORIES];
      const remainingOrder = currentOrder.filter(
        (c) => c.toLowerCase() !== categoryName.toLowerCase(),
      );

      const targetFallback = fallbackCategory || remainingOrder[0] || "Meals";
      if (remainingOrder.length === 0) {
        remainingOrder.push(targetFallback);
      }

      const newNames = { ...(s.cms?.categoryNames || {}) };
      delete newNames[categoryName];
      if (!newNames[targetFallback]) {
        newNames[targetFallback] = targetFallback;
      }

      const updatedMenu = s.menu.map((m) => {
        if (m.category.toLowerCase() === categoryName.toLowerCase()) {
          const updatedItem = { ...m, category: targetFallback };
          saveMenuItemDb({ data: updatedItem }).catch(console.error);
          return updatedItem;
        }
        return m;
      });

      const updatedCms: CmsContent = {
        ...s.cms,
        categoryOrder: remainingOrder,
        categoryNames: newNames,
      };
      saveCmsDb({ data: updatedCms }).catch(console.error);
      return { ...s, cms: updatedCms, menu: updatedMenu };
    });
  },
  reorderCategories(newOrder: string[]) {
    set((s) => {
      const updatedCms: CmsContent = {
        ...s.cms,
        categoryOrder: newOrder,
      };
      saveCmsDb({ data: updatedCms }).catch(console.error);
      return { ...s, cms: updatedCms };
    });
  },
  resetCms() {
    set((s) => {
      saveCmsDb({ data: defaultCmsContent }).catch(console.error);
      return {
        ...s,
        cms: defaultCmsContent,
      };
    });
  },
};

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export { formatCurrency } from "./currency";

export function rupiah(n: number) {
  return formatCurrency(n, state?.settings?.currencySymbol || "N$");
}

export function formatRand(n: number) {
  return rupiah(n);
}

export function cartTotals(cart: CartLine[]) {
  const subtotal = cart.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
  const items = cart.reduce((sum, l) => sum + l.qty, 0);
  return { subtotal, items };
}

/** Single source of truth for the delivery fee across cart, address and checkout. */
export function deliveryFeeFor(
  settings: Settings,
  orderType: "pickup" | "delivery",
  distanceKm: number,
  subtotal = 0,
) {
  if (orderType !== "delivery") return 0;
  if (settings.freeDeliveryAbove > 0 && subtotal >= settings.freeDeliveryAbove) return 0;
  const km = Math.max(0, Math.ceil(distanceKm * 10) / 10);
  const fee = settings.baseFee + km * settings.feePerKm;
  return Math.max(settings.minFee ?? 0, Math.round(fee));
}

export function findVoucher(vouchers: Voucher[], code: string) {
  const clean = code.trim().toUpperCase();
  return vouchers.find((v) => v.code === clean && v.active);
}

export function discountFor(subtotal: number, voucher?: Voucher) {
  if (!voucher || subtotal < voucher.minSpend) return 0;
  const value =
    voucher.type === "percent" ? Math.round((subtotal * voucher.value) / 100) : voucher.value;
  return Math.min(value, subtotal);
}
