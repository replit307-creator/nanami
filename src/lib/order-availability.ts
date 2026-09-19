import type { Settings } from "../types";

export type OrderType = "delivery" | "pickup";

/**
 * Returns the list of order types currently accepted by the store.
 * Returns empty array if the store is closed or both modes are disabled.
 */
export function getAvailableOrderTypes(settings?: Partial<Settings> | null): OrderType[] {
  if (!settings || !settings.storeOpen) {
    return [];
  }

  const types: OrderType[] = [];
  if (settings.deliveryOn) types.push("delivery");
  if (settings.pickupOn) types.push("pickup");
  return types;
}

/**
 * Checks whether a specific order type is currently available for ordering.
 */
export function isOrderTypeAvailable(
  type: OrderType,
  settings?: Partial<Settings> | null,
): boolean {
  if (!settings || !settings.storeOpen) return false;
  if (type === "delivery") return Boolean(settings.deliveryOn);
  if (type === "pickup") return Boolean(settings.pickupOn);
  return false;
}

/**
 * Resolves the appropriate order type. If the current type is not available,
 * auto-switches to the available type. If neither is available or store is closed, returns null.
 */
export function resolveOrderType(
  current: OrderType | string | null | undefined,
  settings?: Partial<Settings> | null,
): OrderType | null {
  if (!settings || !settings.storeOpen) {
    return null;
  }

  const deliveryAvailable = Boolean(settings.deliveryOn);
  const pickupAvailable = Boolean(settings.pickupOn);

  if (!deliveryAvailable && !pickupAvailable) {
    return null;
  }

  // If only pickup is available, must be pickup
  if (!deliveryAvailable && pickupAvailable) {
    return "pickup";
  }

  // If only delivery is available, must be delivery
  if (deliveryAvailable && !pickupAvailable) {
    return "delivery";
  }

  // If both are available, respect user's valid choice
  return current === "pickup" ? "pickup" : "delivery";
}

/**
 * Check if the store can accept any orders at all right now.
 */
export function canPlaceAnyOrder(settings?: Partial<Settings> | null): {
  allowed: boolean;
  reason?: string;
} {
  if (!settings || !settings.storeOpen) {
    return { allowed: false, reason: "Store is currently closed" };
  }

  if (!settings.deliveryOn && !settings.pickupOn) {
    return { allowed: false, reason: "Ordering is temporarily unavailable" };
  }

  return { allowed: true };
}

/**
 * Validates whether a new order of the specified type can be placed under current settings.
 */
export function validateNewOrderSubmission(
  type: OrderType,
  settings?: Partial<Settings> | null,
): { valid: boolean; error?: string; suggestedAlternative?: OrderType } {
  if (!settings || !settings.storeOpen) {
    return {
      valid: false,
      error: "Store is currently closed. Orders cannot be placed at this time.",
    };
  }

  if (!settings.deliveryOn && !settings.pickupOn) {
    return {
      valid: false,
      error:
        "Ordering is temporarily unavailable. Both delivery and pickup are currently disabled.",
    };
  }

  if (type === "delivery" && !settings.deliveryOn) {
    return {
      valid: false,
      error: "Delivery service is currently turned off. Please choose Pickup instead.",
      suggestedAlternative: settings.pickupOn ? "pickup" : undefined,
    };
  }

  if (type === "pickup" && !settings.pickupOn) {
    return {
      valid: false,
      error: "Pickup service is currently turned off. Please choose Delivery instead.",
      suggestedAlternative: settings.deliveryOn ? "delivery" : undefined,
    };
  }

  return { valid: true };
}
