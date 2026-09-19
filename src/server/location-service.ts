import dns from "node:dns/promises";

// Cache for Nominatim queries (1 hour TTL)
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}
const nominatimCache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL_MS = 60 * 60 * 1000;

// Global rate limiting queue for Nominatim (1 req per 1.1s)
let lastNominatimRequestTime = 0;
const NOMINATIM_INTERVAL_MS = 1100;
let queuePromise = Promise.resolve();

function scheduleNominatim<T>(task: () => Promise<T>): Promise<T> {
  const next = queuePromise.then(async () => {
    const now = Date.now();
    const waitTime = Math.max(0, lastNominatimRequestTime + NOMINATIM_INTERVAL_MS - now);
    if (waitTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
    lastNominatimRequestTime = Date.now();
    return task();
  });
  queuePromise = next.then(
    () => {},
    () => {},
  );
  return next;
}

/**
 * Checks whether an IP address is internal, private, loopback, or cloud-metadata.
 */
export function isPrivateIp(ip: string): boolean {
  // Normalize IPv6 mapped IPv4
  let cleanIp = ip.trim();
  if (cleanIp.startsWith("::ffff:")) {
    cleanIp = cleanIp.substring(7);
  }

  // IPv4 checks
  if (cleanIp.includes(".")) {
    const parts = cleanIp.split(".").map(Number);
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
      return true; // invalid format -> block
    }
    const [p0, p1] = parts;
    // 0.0.0.0/8 (current network)
    if (p0 === 0) return true;
    // 127.0.0.0/8 (loopback)
    if (p0 === 127) return true;
    // 10.0.0.0/8 (private)
    if (p0 === 10) return true;
    // 172.16.0.0/12 (private: 172.16.x.x - 172.31.x.x)
    if (p0 === 172 && p1 !== undefined && p1 >= 16 && p1 <= 31) return true;
    // 192.168.0.0/16 (private)
    if (p0 === 192 && p1 === 168) return true;
    // 169.254.0.0/16 (link-local, cloud metadata service 169.254.169.254)
    if (p0 === 169 && p1 === 254) return true;
    // 100.64.0.0/10 (carrier-grade NAT)
    if (p0 === 100 && p1 !== undefined && p1 >= 64 && p1 <= 127) return true;
    // 224.0.0.0/4 (multicast)
    if (p0 !== undefined && p0 >= 224) return true;
    return false;
  }

  // IPv6 checks
  const lower = cleanIp.toLowerCase();
  if (lower === "::1" || lower === "::" || lower === "0:0:0:0:0:0:0:1") return true;
  // Unique local addresses (fc00::/7)
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
  // Link-local addresses (fe80::/10)
  if (
    lower.startsWith("fe8") ||
    lower.startsWith("fe9") ||
    lower.startsWith("fea") ||
    lower.startsWith("feb")
  ) {
    return true;
  }

  return false;
}

const ALLOWED_GOOGLE_HOSTS = new Set([
  "maps.google.com",
  "google.com",
  "www.google.com",
  "maps.app.goo.gl",
  "goo.gl",
]);

/**
 * Validates whether a URL is a legitimate Google Maps URL and safe from SSRF.
 */
export async function validateGoogleMapsUrl(
  targetUrl: string,
): Promise<{ valid: boolean; url?: URL; error?: string }> {
  try {
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== "https:") {
      return { valid: false, error: "Only HTTPS Google Maps URLs are allowed." };
    }

    const host = parsed.hostname.toLowerCase();
    const isAllowedHost =
      ALLOWED_GOOGLE_HOSTS.has(host) ||
      host.endsWith(".google.com") ||
      host === "maps.google.com" ||
      host.endsWith(".goo.gl");

    if (!isAllowedHost) {
      return { valid: false, error: "URL host is not a valid Google Maps domain." };
    }

    // SSRF DNS check
    const lookupResult = await dns.lookup(host, { all: true });
    for (const record of lookupResult) {
      if (isPrivateIp(record.address)) {
        return {
          valid: false,
          error: "Access to private or internal network is blocked (SSRF protection).",
        };
      }
    }

    return { valid: true, url: parsed };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { valid: false, error: `Invalid URL format: ${msg}` };
  }
}

/**
 * Parses coordinates from any known Google Maps URL structure.
 * Supports:
 * - ?q=LAT,LNG
 * - /@LAT,LNG,ZOOMz
 * - !3dLAT!4dLNG
 * - ?ll=LAT,LNG
 * - destination=LAT,LNG or daddr=LAT,LNG
 */
export function extractCoordinatesFromUrl(urlString: string): { lat: number; lng: number } | null {
  try {
    const url = new URL(urlString);

    // 1. Check query parameter: q=LAT,LNG
    const q = url.searchParams.get("q") || url.searchParams.get("query");
    if (q) {
      const match = q.match(/^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/);
      if (match) {
        const lat = parseFloat(match[1]!);
        const lng = parseFloat(match[2]!);
        if (isValidCoordinate(lat, lng)) return { lat, lng };
      }
    }

    // 2. Check query parameter: ll=LAT,LNG
    const ll = url.searchParams.get("ll") || url.searchParams.get("sll");
    if (ll) {
      const match = ll.match(/^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/);
      if (match) {
        const lat = parseFloat(match[1]!);
        const lng = parseFloat(match[2]!);
        if (isValidCoordinate(lat, lng)) return { lat, lng };
      }
    }

    // 3. Check destination or daddr=LAT,LNG
    const dest = url.searchParams.get("destination") || url.searchParams.get("daddr");
    if (dest) {
      const match = dest.match(/^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/);
      if (match) {
        const lat = parseFloat(match[1]!);
        const lng = parseFloat(match[2]!);
        if (isValidCoordinate(lat, lng)) return { lat, lng };
      }
    }

    // 4. Check data param or path with !3dLAT!4dLNG
    const fullText = decodeURIComponent(urlString);
    const dataMatch = fullText.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (dataMatch) {
      const lat = parseFloat(dataMatch[1]!);
      const lng = parseFloat(dataMatch[2]!);
      if (isValidCoordinate(lat, lng)) return { lat, lng };
    }

    // 5. Check path structure: /@LAT,LNG,ZOOMz or /@LAT,LNG
    const atMatch = fullText.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) {
      const lat = parseFloat(atMatch[1]!);
      const lng = parseFloat(atMatch[2]!);
      if (isValidCoordinate(lat, lng)) return { lat, lng };
    }

    return null;
  } catch {
    // Attempt regex fallback if URL constructor fails
    const fullText = decodeURIComponent(urlString);
    const atMatch = fullText.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) {
      const lat = parseFloat(atMatch[1]!);
      const lng = parseFloat(atMatch[2]!);
      if (isValidCoordinate(lat, lng)) return { lat, lng };
    }
    const dataMatch = fullText.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (dataMatch) {
      const lat = parseFloat(dataMatch[1]!);
      const lng = parseFloat(dataMatch[2]!);
      if (isValidCoordinate(lat, lng)) return { lat, lng };
    }
    const qMatch = fullText.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (qMatch) {
      const lat = parseFloat(qMatch[1]!);
      const lng = parseFloat(qMatch[2]!);
      if (isValidCoordinate(lat, lng)) return { lat, lng };
    }
    return null;
  }
}

function isValidCoordinate(lat: number, lng: number): boolean {
  return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * Resolves a Google Maps link (including short links like maps.app.goo.gl),
 * following up to 5 redirects with SSRF protection, and returns parsed coordinates.
 * NEVER returns raw body from fetch.
 */
export async function resolveGoogleMapsLink(inputUrl: string): Promise<{
  success: boolean;
  lat?: number;
  lng?: number;
  mapsUrl?: string;
  error?: string;
}> {
  let currentUrl = inputUrl.trim();
  if (!currentUrl.startsWith("http://") && !currentUrl.startsWith("https://")) {
    currentUrl = "https://" + currentUrl;
  }

  // 1. Direct coordinate check first
  const directCoords = extractCoordinatesFromUrl(currentUrl);
  if (directCoords) {
    return {
      success: true,
      lat: directCoords.lat,
      lng: directCoords.lng,
      mapsUrl: `https://www.google.com/maps?q=${directCoords.lat.toFixed(6)},${directCoords.lng.toFixed(6)}`,
    };
  }

  // 2. Follow redirects safely
  const MAX_REDIRECTS = 5;
  let redirectsCount = 0;

  while (redirectsCount < MAX_REDIRECTS) {
    const val = await validateGoogleMapsUrl(currentUrl);
    if (!val.valid) {
      return { success: false, error: val.error || "Security validation failed." };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(currentUrl, {
        method: "HEAD",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "NanamiKitchen/1.4.0 (contact: order@nanamikitchen.com)",
        },
      });
      clearTimeout(timeout);

      // Check if location header exists
      const location = response.headers.get("location");
      if (location && [301, 302, 303, 307, 308].includes(response.status)) {
        redirectsCount++;
        const resolvedLocation = new URL(location, currentUrl).toString();
        const coords = extractCoordinatesFromUrl(resolvedLocation);
        if (coords) {
          return {
            success: true,
            lat: coords.lat,
            lng: coords.lng,
            mapsUrl: `https://www.google.com/maps?q=${coords.lat.toFixed(6)},${coords.lng.toFixed(6)}`,
          };
        }
        currentUrl = resolvedLocation;
        continue;
      }

      // If GET needed because HEAD gave 200 or no location
      const getController = new AbortController();
      const getTimeout = setTimeout(() => getController.abort(), 5000);
      const getResponse = await fetch(currentUrl, {
        method: "GET",
        redirect: "follow",
        signal: getController.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });
      clearTimeout(getTimeout);

      const finalUrl = getResponse.url;
      const coords = extractCoordinatesFromUrl(finalUrl);
      if (coords) {
        return {
          success: true,
          lat: coords.lat,
          lng: coords.lng,
          mapsUrl: `https://www.google.com/maps?q=${coords.lat.toFixed(6)},${coords.lng.toFixed(6)}`,
        };
      }

      // Check small initial slice of response text for meta refresh or URL patterns
      const text = await getResponse.text();
      const snippet = text.slice(0, 8000);
      const htmlCoords = extractCoordinatesFromUrl(snippet);
      if (htmlCoords) {
        return {
          success: true,
          lat: htmlCoords.lat,
          lng: htmlCoords.lng,
          mapsUrl: `https://www.google.com/maps?q=${htmlCoords.lat.toFixed(6)},${htmlCoords.lng.toFixed(6)}`,
        };
      }

      return {
        success: false,
        error:
          "Could not extract coordinates from this Google Maps link. Please try tapping on the map or using GPS.",
      };
    } catch (err: unknown) {
      clearTimeout(timeout);
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: `Failed to resolve link: ${msg}` };
    }
  }

  return { success: false, error: "Too many redirects when resolving link." };
}

export interface GeocodeResult {
  placeId: string;
  name: string;
  displayName: string;
  lat: number;
  lng: number;
}

/**
 * Searches locations using OpenStreetMap Nominatim with global server throttle & caching.
 * Prioritizes Windhoek, Namibia.
 */
export async function searchPlacesNominatim(query: string): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const cacheKey = `search:${trimmed.toLowerCase()}`;
  const cached = nominatimCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data as GeocodeResult[];
  }

  return scheduleNominatim(async () => {
    try {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("q", trimmed);
      url.searchParams.set("countrycodes", "na"); // Namibia
      // Bounding box around Windhoek/Khomas region: min_lon, max_lat, max_lon, min_lat
      url.searchParams.set("viewbox", "16.90,-22.45,17.25,-22.70");
      url.searchParams.set("bounded", "0");
      url.searchParams.set("limit", "6");
      url.searchParams.set("addressdetails", "1");

      const res = await fetch(url.toString(), {
        headers: {
          "User-Agent": "NanamiKitchen/1.4.0 (contact: order@nanamikitchen.com)",
          "Accept-Language": "en",
        },
      });

      if (!res.ok) {
        console.warn(`Nominatim search failed with status ${res.status}`);
        return [];
      }

      const raw = await res.json();
      if (!Array.isArray(raw)) return [];

      const results: GeocodeResult[] = raw.map((item: any) => ({
        placeId: String(item.place_id || item.osm_id || Math.random()),
        name: item.name || item.display_name.split(",")[0]?.trim() || trimmed,
        displayName: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      }));

      nominatimCache.set(cacheKey, { data: results, timestamp: Date.now() });
      return results;
    } catch (e) {
      console.warn("Nominatim search error (falling back smoothly):", e);
      return [];
    }
  });
}

/**
 * Reverse geocodes coordinates to address using Nominatim with global server throttle & caching.
 */
export async function reverseGeocodeNominatim(lat: number, lng: number): Promise<string | null> {
  const roundedLat = lat.toFixed(4);
  const roundedLng = lng.toFixed(4);
  const cacheKey = `reverse:${roundedLat},${roundedLng}`;
  const cached = nominatimCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data as string;
  }

  return scheduleNominatim(async () => {
    try {
      const url = new URL("https://nominatim.openstreetmap.org/reverse");
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("lat", lat.toString());
      url.searchParams.set("lon", lng.toString());
      url.searchParams.set("zoom", "18");
      url.searchParams.set("addressdetails", "1");

      const res = await fetch(url.toString(), {
        headers: {
          "User-Agent": "NanamiKitchen/1.4.0 (contact: order@nanamikitchen.com)",
          "Accept-Language": "en",
        },
      });

      if (!res.ok) {
        console.warn(`Nominatim reverse failed with status ${res.status}`);
        return null;
      }

      const raw = await res.json();
      const displayName = raw?.display_name || null;
      if (displayName) {
        nominatimCache.set(cacheKey, { data: displayName, timestamp: Date.now() });
      }
      return displayName;
    } catch (e) {
      console.warn("Nominatim reverse geocode error:", e);
      return null;
    }
  });
}
