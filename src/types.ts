export type Category = string;
export const DEFAULT_CATEGORIES: Category[] = ["Meals", "Snacks", "Drinks", "Combos", "Others"];
export const CATEGORIES: Category[] = DEFAULT_CATEGORIES;

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
  category: Category;
  image: string;
  available: boolean;
  prepMinutes: number;
  badges: string[];
  stock?: number | null;
  groups: OptionGroup[];
  specialRequestEnabled?: boolean;
};

export type CartLine = {
  id: string;
  itemId: string;
  name: string;
  unitPrice: number;
  qty: number;
  optionLabels: string[];
  note: string;
};

export type OrderStatus =
  | "Pending Payment"
  | "Cooking"
  | "Out for Delivery"
  | "Ready for Pickup"
  | "Completed"
  | "Cancelled";

export type Order = {
  id: string;
  code: string;
  createdAt: number;
  type: "pickup" | "delivery";
  lines: CartLine[];
  subtotal: number;
  vatAmount?: number | undefined;
  vatPercent?: number | undefined;
  discount: number;
  voucherCode: string;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  paid: boolean;
  paymentMethod: string;
  pointsEarned: number;
  etaMinutes: number;
  customer: {
    name: string;
    phone: string;
    address: string;
    deliveryNote: string;
    lat?: number;
    lng?: number;
    mapsUrl?: string;
  };
  accountId?: string | null;
};

export type Promo = {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  imageUrl?: string;
  link?: string;
  active?: boolean;
};

export type CmsFaq = {
  id: string;
  question: string;
  answer: string;
  active: boolean;
};

export type MediaAsset = {
  id: string;
  url: string;
  filename: string;
  uploadedAt: number;
  usedByMenuIds: string[];
};

export type CheckoutCms = {
  // Your Details
  detailsTitle: string;
  fullNameLabel: string;
  defaultFullName: string;
  phoneLabel: string;
  defaultPhone: string;
  // Payment methods
  ewalletEnabled: boolean;
  ewalletLabel: string;
  ewalletSub: string;
  bankEnabled: boolean;
  bankLabel: string;
  bankSub: string;
  codEnabled: boolean;
  codLabel: string;
  codSub: string;
  // Payment instructions
  instructionsTitle: string;
  step1Text: string;
  ewalletTitle: string;
  ewalletAccountName: string;
  ewalletNumber: string;
  copyButtonText: string;
  bankTitle: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  codInstructions: string;
  step2Text: string;
};

export type CmsContent = {
  logoUrl: string;
  brandName: string;
  brandSuffix: string;
  tagline: string;
  description: string;
  heroImage: string;
  heroTitleLine1: string;
  heroTitleLine2: string;
  heroSlogan: string;
  heroCtaText: string;
  heroActive: boolean;
  announcement: {
    enabled: boolean;
    text: string;
    type: "info" | "promo" | "warning";
    link?: string;
  };
  welcomeScreen: {
    enabled: boolean;
    durationSec: number;
    title: string;
    subtitle: string;
    slogan: string;
    imageUrl: string;
  };
  socials: {
    instagram: string;
    tiktok: string;
    whatsapp: string;
    mapsUrl: string;
    active: boolean;
  };
  aboutStory: string;
  faqs: CmsFaq[];
  mustTryItemIds: string[];
  categoryOrder: Category[];
  categoryNames: Record<Category, string>;
  checkout: CheckoutCms;
};

export type Voucher = {
  code: string;
  type: "percent" | "fixed";
  value: number;
  minSpend: number;
  active: boolean;
};

export type Settings = {
  currencySymbol?: string;
  storeName: string;
  storeTagline: string;
  storeAddress: string;
  storeOpen: boolean;
  deliveryOn: boolean;
  pickupOn: boolean;
  codEnabled: boolean;
  vatEnabled: boolean;
  vatPercent: number;
  whatsapp: string;
  baseFee: number;
  feePerKm: number;
  maxRadiusKm: number;
  storeMapsUrl: string;
  storeLat: number;
  storeLng: number;
  minFee: number;
  freeDeliveryAbove: number;
  routeFactor: number;
  bankName: string;
  bankAccount: string;
  bankHolder: string;
  ewallet: string;
  openHours: string;
  pointsPer10k: number;
  adminPassword: string;
  whatsappTemplate?: string;
  whatsappHeader?: string;
  whatsappFooter?: string;
  whatsappPreset?: "standard" | "compact" | "receipt" | "custom";
};

export type Profile = {
  name: string;
  phone: string;
  email: string;
  address: string;
  addresses: string[];
  points: number;
  signedIn: boolean;
  method: string;
  role?: "user" | "admin" | "owner" | "staff" | undefined;
};

export type Account = {
  id: string;
  email: string;
  password: string;
  name: string;
  phone: string;
  role?: "user" | "admin" | "owner" | "staff" | undefined;
  address?: string | undefined;
  addresses?: string[] | undefined;
  points?: number | undefined;
};

export type StaffRole = "owner" | "admin" | "staff";

export type StaffMember = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  active: boolean;
  createdAt: number;
};

export type State = {
  orderType: "pickup" | "delivery";
  orderTypeChosen: boolean;
  distanceKm: number;
  customerMapsUrl: string;
  menu: MenuItem[];
  cart: CartLine[];
  orders: Order[];
  settings: Settings;
  profile: Profile;
  promos: Promo[];
  vouchers: Voucher[];
  voucherCode: string;
  accounts: Account[];
  staff: StaffMember[];
  mediaAssets: MediaAsset[];
  adminUnlocked: boolean;
  cms: CmsContent;
};
