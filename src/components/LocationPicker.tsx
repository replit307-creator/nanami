import { useEffect, useRef, useState } from "react";
import {
  MapPin,
  Search,
  Navigation,
  Link2,
  AlertCircle,
  Loader2,
  Check,
  Building2,
  Compass,
} from "lucide-react";
import {
  geocode,
  reverseGeocode,
  resolveGoogleMapsUrl,
  type GeocodeResult,
} from "../lib/geocoding";
import { haversineKm } from "../lib/geo";

export interface LocationPickerProps {
  address: string;
  onAddressChange: (address: string) => void;
  lat?: number;
  lng?: number;
  onLocationChange: (loc: {
    lat?: number;
    lng?: number;
    address?: string;
    mapsUrl?: string;
    distanceKm?: number;
  }) => void;
  mapsUrl?: string;
  deliveryNote?: string;
  onDeliveryNoteChange?: (note: string) => void;
  storeLat: number;
  storeLng: number;
  maxRadiusKm: number;
  routeFactor?: number;
  savedAddresses?: string[];
  readOnly?: boolean;
}

export function LocationPicker({
  address,
  onAddressChange,
  lat,
  lng,
  onLocationChange,
  mapsUrl,
  deliveryNote = "",
  onDeliveryNoteChange,
  storeLat,
  storeLng,
  maxRadiusKm,
  routeFactor = 1.3,
  savedAddresses = [],
  readOnly = false,
}: LocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const customerMarkerRef = useRef<any>(null);
  const storeMarkerRef = useRef<any>(null);
  const radiusCircleRef = useRef<any>(null);

  const [activeTab, setActiveTab] = useState<"search" | "map" | "link">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const [linkInput, setLinkInput] = useState(mapsUrl || "");
  const [resolvingLink, setResolvingLink] = useState(false);
  const [locatingGps, setLocatingGps] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Calculate distance if lat/lng available
  const calculatedDistance =
    lat !== undefined && lng !== undefined
      ? Math.max(
          0.5,
          Math.round(
            haversineKm({ lat: storeLat, lng: storeLng }, { lat, lng }) * routeFactor * 10,
          ) / 10,
        )
      : undefined;

  const isOutOfRange = calculatedDistance !== undefined && calculatedDistance > maxRadiusKm;

  // Debounced search
  useEffect(() => {
    if (activeTab !== "search") return;
    const trimmed = searchQuery.trim();
    if (trimmed.length < 3) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await geocode(trimmed);
        setSearchResults(results);
      } finally {
        setSearching(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [searchQuery, activeTab]);

  // Leaflet Map Initialization (Client-side only)
  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    let isMounted = true;

    async function initMap() {
      const L = await import("leaflet");

      if (!isMounted || !mapContainerRef.current) return;
      if (mapInstanceRef.current) return; // already initialized

      const defaultCenter: [number, number] =
        lat !== undefined && lng !== undefined ? [lat, lng] : [storeLat, storeLng];

      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: lat !== undefined ? 15 : 13,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      // Store icon
      const storeIcon = L.divIcon({
        className: "custom-store-pin",
        html: `<div style="background-color:#e11d48;color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 6px rgba(0,0,0,0.3);border:2px solid white;font-size:16px;">🍱</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      storeMarkerRef.current = L.marker([storeLat, storeLng], {
        icon: storeIcon,
        interactive: true,
      })
        .addTo(map)
        .bindPopup("<b>Nanami Kitchen</b><br/>Cloud Kitchen HQ");

      // Radius circle
      radiusCircleRef.current = L.circle([storeLat, storeLng], {
        radius: maxRadiusKm * 1000,
        color: "#e11d48",
        fillColor: "#e11d48",
        fillOpacity: 0.08,
        weight: 1.5,
        dashArray: "4, 4",
      }).addTo(map);

      // Customer marker
      const customerIcon = L.divIcon({
        className: "custom-customer-pin",
        html: `<div style="background-color:#3b82f6;color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(0,0,0,0.4);border:2px solid white;font-weight:bold;font-size:16px;">📍</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 30],
      });

      if (lat !== undefined && lng !== undefined) {
        customerMarkerRef.current = L.marker([lat, lng], {
          icon: customerIcon,
          draggable: !readOnly,
        }).addTo(map);
      }

      // Map click handler to place/move pin
      if (!readOnly) {
        map.on("click", async (e: any) => {
          const clickLat = e.latlng.lat;
          const clickLng = e.latlng.lng;
          handleSetCoordinates(clickLat, clickLng, true);
        });
      }

      mapInstanceRef.current = map;
      setMapReady(true);
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [storeLat, storeLng]);

  // Update customer marker position when lat/lng changes externally
  useEffect(() => {
    if (!mapInstanceRef.current || lat === undefined || lng === undefined) return;
    import("leaflet").then((L) => {
      if (!mapInstanceRef.current) return;

      const customerIcon = L.divIcon({
        className: "custom-customer-pin",
        html: `<div style="background-color:#3b82f6;color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(0,0,0,0.4);border:2px solid white;font-weight:bold;font-size:16px;">📍</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 30],
      });

      if (customerMarkerRef.current) {
        customerMarkerRef.current.setLatLng([lat, lng]);
      } else {
        customerMarkerRef.current = L.marker([lat, lng], {
          icon: customerIcon,
          draggable: !readOnly,
        }).addTo(mapInstanceRef.current);

        customerMarkerRef.current.on("dragend", (e: any) => {
          const pos = e.target.getLatLng();
          handleSetCoordinates(pos.lat, pos.lng, true);
        });
      }
    });
  }, [lat, lng, readOnly]);

  async function handleSetCoordinates(
    newLat: number,
    newLng: number,
    reverseGeocodeAddress = true,
  ) {
    const dist = Math.max(
      0.5,
      Math.round(
        haversineKm({ lat: storeLat, lng: storeLng }, { lat: newLat, lng: newLng }) *
          routeFactor *
          10,
      ) / 10,
    );

    const gmapsUrl = `https://www.google.com/maps?q=${newLat.toFixed(6)},${newLng.toFixed(6)}`;

    // Pan map to new center
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo([newLat, newLng]);
    }

    onLocationChange({
      lat: newLat,
      lng: newLng,
      mapsUrl: gmapsUrl,
      distanceKm: dist,
    });

    if (reverseGeocodeAddress) {
      setReverseGeocoding(true);
      try {
        const foundAddress = await reverseGeocode(newLat, newLng);
        if (foundAddress) {
          onAddressChange(foundAddress);
          onLocationChange({
            lat: newLat,
            lng: newLng,
            address: foundAddress,
            mapsUrl: gmapsUrl,
            distanceKm: dist,
          });
          setStatusMessage({ type: "success", text: "Address auto-updated from pin location." });
        }
      } finally {
        setReverseGeocoding(false);
      }
    }
  }

  // Handle GPS location request
  function handleUseCurrentGps() {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setStatusMessage({ type: "error", text: "Geolocation is not supported by your browser." });
      return;
    }

    setLocatingGps(true);
    setStatusMessage({ type: "info", text: "Detecting current GPS location..." });

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLocatingGps(false);
        const gpsLat = pos.coords.latitude;
        const gpsLng = pos.coords.longitude;
        setStatusMessage({ type: "success", text: "GPS location acquired." });
        await handleSetCoordinates(gpsLat, gpsLng, true);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([gpsLat, gpsLng], 16);
        }
      },
      (err) => {
        setLocatingGps(false);
        if (err.code === 1) {
          setStatusMessage({
            type: "error",
            text: "Location access was denied. Please allow GPS or use search/pin.",
          });
        } else {
          setStatusMessage({ type: "error", text: `Unable to detect GPS: ${err.message}` });
        }
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  // Handle Google Maps Link Resolution
  async function handleResolveLink() {
    if (!linkInput.trim()) {
      setStatusMessage({ type: "error", text: "Please paste a Google Maps link first." });
      return;
    }

    setResolvingLink(true);
    setStatusMessage({ type: "info", text: "Resolving Google Maps link..." });

    try {
      const res = await resolveGoogleMapsUrl(linkInput.trim());
      if (res.success && res.lat !== undefined && res.lng !== undefined) {
        await handleSetCoordinates(res.lat, res.lng, true);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([res.lat, res.lng], 16);
        }
        setStatusMessage({
          type: "success",
          text: `Coordinates resolved: ${res.lat.toFixed(5)}, ${res.lng.toFixed(5)}`,
        });
      } else {
        setStatusMessage({
          type: "error",
          text:
            res.error || "Could not parse location from this link. Try tapping on the map instead.",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatusMessage({ type: "error", text: `Error resolving link: ${msg}` });
    } finally {
      setResolvingLink(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Input Mode Tabs */}
      {!readOnly && (
        <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-secondary/40 p-1 border border-input">
          <button
            type="button"
            onClick={() => setActiveTab("search")}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition ${
              activeTab === "search"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Search className="size-3.5" />
            <span>Search</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("map")}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition ${
              activeTab === "map"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MapPin className="size-3.5" />
            <span>Pin Map</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("link")}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition ${
              activeTab === "link"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Link2 className="size-3.5" />
            <span>Maps Link</span>
          </button>
        </div>
      )}

      {/* Tab 1: Search Autocomplete */}
      {activeTab === "search" && !readOnly && (
        <div className="relative">
          <div className="relative flex items-center">
            <Search className="absolute left-3 size-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search street, building, or area in Windhoek..."
              className="w-full pl-9 pr-8 py-2 rounded-lg border border-input bg-secondary/30 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition"
            />
            {searching && (
              <Loader2 className="absolute right-3 size-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Autocomplete dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute z-20 top-full left-0 right-0 mt-1 rounded-lg border border-input bg-card shadow-lg max-h-48 overflow-y-auto divide-y divide-border">
              {searchResults.map((res) => (
                <button
                  key={res.placeId}
                  type="button"
                  onClick={() => {
                    onAddressChange(res.displayName);
                    handleSetCoordinates(res.lat, res.lng, false);
                    setSearchQuery("");
                    setSearchResults([]);
                    setStatusMessage({
                      type: "success",
                      text: `Selected: ${res.name}`,
                    });
                  }}
                  className="w-full text-left p-2.5 text-xs hover:bg-secondary/40 transition flex items-start gap-2"
                >
                  <MapPin className="size-3.5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-foreground">{res.name}</div>
                    <div className="text-[11px] text-muted-foreground line-clamp-1">
                      {res.displayName}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Google Maps Link Paste */}
      {activeTab === "link" && !readOnly && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="url"
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              placeholder="Paste Google Maps URL or short link (maps.app.goo.gl)..."
              className="flex-1 px-3 py-2 rounded-lg border border-input bg-secondary/30 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition"
            />
            <button
              type="button"
              disabled={resolvingLink || !linkInput.trim()}
              onClick={handleResolveLink}
              className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition flex items-center gap-1.5 shrink-0"
            >
              {resolvingLink ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Compass className="size-3.5" />
              )}
              <span>Resolve</span>
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Share a pin from the Google Maps app and paste the link here.
          </p>
        </div>
      )}

      {/* Quick GPS button */}
      {!readOnly && (
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            disabled={locatingGps}
            onClick={handleUseCurrentGps}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-input bg-secondary/30 text-xs font-medium text-foreground hover:bg-secondary/60 transition"
          >
            {locatingGps ? (
              <Loader2 className="size-3.5 animate-spin text-primary" />
            ) : (
              <Navigation className="size-3.5 text-primary" />
            )}
            <span>Use My Current GPS</span>
          </button>

          {lat !== undefined && lng !== undefined && (
            <span className="text-[11px] text-muted-foreground font-mono">
              GPS: {lat.toFixed(4)}, {lng.toFixed(4)}
            </span>
          )}
        </div>
      )}

      {/* Interactive Leaflet Map Container */}
      <div className="relative rounded-xl overflow-hidden border border-input bg-muted/20">
        <div
          ref={mapContainerRef}
          className="w-full h-56 sm:h-64 z-0"
          style={{ minHeight: "220px" }}
        />

        {/* Map overlay controls & helper */}
        <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
          <div className="bg-card/90 backdrop-blur-sm border border-input rounded-md px-2 py-1 text-[10px] font-medium text-foreground shadow-sm">
            🔴 Kitchen HQ &nbsp;|&nbsp; 🔵 Delivery Pin
          </div>
        </div>

        {!readOnly && (
          <div className="absolute bottom-2 left-2 right-2 z-10 pointer-events-none">
            <div className="bg-card/90 backdrop-blur-sm border border-input rounded-md p-1.5 text-[11px] text-muted-foreground text-center shadow-sm">
              Tap anywhere on map or drag pin to adjust your exact delivery spot.
            </div>
          </div>
        )}
      </div>

      {/* Status / feedback alert */}
      {statusMessage && (
        <div
          className={`flex items-start gap-2 p-2 rounded-lg text-xs ${
            statusMessage.type === "error"
              ? "bg-destructive/10 text-destructive border border-destructive/20"
              : statusMessage.type === "success"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                : "bg-secondary/50 text-foreground border border-input"
          }`}
        >
          {statusMessage.type === "error" ? (
            <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
          ) : (
            <Check className="size-3.5 shrink-0 mt-0.5" />
          )}
          <span className="flex-1">{statusMessage.text}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            ×
          </button>
        </div>
      )}

      {/* Delivery Radius & Distance Status Indicator */}
      {calculatedDistance !== undefined && (
        <div
          className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
            isOutOfRange
              ? "bg-destructive/10 border-destructive/30 text-destructive font-semibold"
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-medium"
          }`}
        >
          <div className="flex items-center gap-1.5">
            {isOutOfRange ? (
              <AlertCircle className="size-4 shrink-0 text-destructive" />
            ) : (
              <Check className="size-4 shrink-0 text-emerald-500" />
            )}
            <span>
              {isOutOfRange
                ? `Out of delivery range (${calculatedDistance} km > max ${maxRadiusKm} km)`
                : `Within delivery range (~${calculatedDistance} km from kitchen)`}
            </span>
          </div>
        </div>
      )}

      {/* Saved Addresses quick selection (if available) */}
      {savedAddresses.length > 0 && !readOnly && (
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
            <Building2 className="size-3" />
            <span>Saved Addresses</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {savedAddresses.map((addr, idx) => (
              <button
                key={idx}
                type="button"
                onClick={async () => {
                  onAddressChange(addr);
                  // Geocode selected saved address
                  const res = await geocode(addr);
                  if (res.length > 0 && res[0]) {
                    handleSetCoordinates(res[0].lat, res[0].lng, false);
                  }
                }}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition ${
                  address === addr
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary/40 text-muted-foreground hover:text-foreground border-input"
                }`}
              >
                {addr.split(",")[0] || addr}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Editable Address Textarea */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-foreground flex items-center justify-between">
          <span>Delivery Address</span>
          {reverseGeocoding && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Loader2 className="size-2.5 animate-spin" />
              Updating address...
            </span>
          )}
        </label>
        <textarea
          rows={2}
          value={address}
          disabled={readOnly}
          onChange={(e) => onAddressChange(e.target.value)}
          placeholder="Building name, street, house number..."
          className="w-full px-3 py-2 rounded-lg border border-input bg-secondary/30 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition resize-none disabled:opacity-60"
        />
      </div>

      {/* Optional Delivery Landmark / Notes */}
      {onDeliveryNoteChange && (
        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground">
            Delivery Note / Landmarks{" "}
            <span className="text-muted-foreground font-normal">(Optional)</span>
          </label>
          <input
            type="text"
            value={deliveryNote}
            disabled={readOnly}
            onChange={(e) => onDeliveryNoteChange(e.target.value)}
            placeholder="Gate code, floor, drop-off instructions..."
            className="w-full px-3 py-2 rounded-lg border border-input bg-secondary/30 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition disabled:opacity-60"
          />
        </div>
      )}
    </div>
  );
}
