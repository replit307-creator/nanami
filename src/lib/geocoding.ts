import { searchLocationsFn, reverseGeocodeFn, resolveMapsLinkFn } from "./server-functions";

export interface GeocodeResult {
  placeId: string;
  name: string;
  displayName: string;
  lat: number;
  lng: number;
}

export interface ResolvedLocation {
  success: boolean;
  lat?: number;
  lng?: number;
  mapsUrl?: string;
  error?: string;
}

/**
 * Geocodes an address or place search query using the server's throttled Nominatim proxy.
 * Prioritizes Windhoek, Namibia. Returns empty array on error or rate-limit.
 */
export async function geocode(query: string): Promise<GeocodeResult[]> {
  if (!query || query.trim().length < 3) return [];
  try {
    const res = await searchLocationsFn({ data: { query: query.trim() } });
    return (res?.results as GeocodeResult[]) || [];
  } catch (err) {
    console.warn("Geocoding query failed gracefully:", err);
    return [];
  }
}

/**
 * Reverse geocodes a coordinate (lat, lng) to a human-readable address.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  if (isNaN(lat) || isNaN(lng)) return null;
  try {
    const res = await reverseGeocodeFn({ data: { lat, lng } });
    return res?.address || null;
  } catch (err) {
    console.warn("Reverse geocoding failed gracefully:", err);
    return null;
  }
}

/**
 * Resolves a Google Maps URL (regular or short link like maps.app.goo.gl)
 * via server-side redirect follower with SSRF protection.
 */
export async function resolveGoogleMapsUrl(url: string): Promise<ResolvedLocation> {
  if (!url || !url.trim()) {
    return { success: false, error: "Please enter a valid Google Maps link." };
  }
  try {
    const res = await resolveMapsLinkFn({ data: { url: url.trim() } });
    return res as ResolvedLocation;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg || "Failed to resolve Google Maps link." };
  }
}
