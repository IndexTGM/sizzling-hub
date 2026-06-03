"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon for Leaflet + Next.js/Webpack — runs only in browser
let iconReady = false;
function ensureLeafletIcons() {
  if (typeof window === "undefined" || iconReady) return;
  iconReady = true;
  const L = require("leaflet");
  const DefaultIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
  L.Marker.prototype.options.icon = DefaultIcon;
}

interface AddressParts {
  street: string;
  city: string;
  province: string;
  zip: string;
  lat: number;
  lng: number;
}

interface MapPickerProps {
  initialLat?: number;
  initialLng?: number;
  onAddressChange: (parts: AddressParts) => void;
}

interface SearchResult {
  lat: string;
  lon: string;
  display_name: string;
}

// Component to fly the map when lat/lng changes
function MapFlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  const prevRef = useRef({ lat, lng });
  useEffect(() => {
    if (prevRef.current.lat !== lat || prevRef.current.lng !== lng) {
      map.flyTo([lat, lng], 16, { duration: 0.8 });
      prevRef.current = { lat, lng };
    }
  }, [lat, lng, map]);
  return null;
}

// Reverse geocode from lat/lng using Nominatim
async function reverseGeocode(lat: number, lng: number): Promise<Partial<AddressParts>> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=18`
    );
    const data = await res.json();
    const addr = data.address || {};
    return {
      street: [addr.road, addr.house_number].filter(Boolean).join(" ") || addr.neighbourhood || addr.suburb || "",
      city: addr.city || addr.town || addr.municipality || addr.county || addr.village || "",
      province: addr.state || addr.region || "",
      zip: addr.postcode || "",
    };
  } catch {
    return {};
  }
}

function DraggableMarker({ lat, lng, onDragEnd }: { lat: number; lng: number; onDragEnd: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onDragEnd(e.latlng.lat, e.latlng.lng);
    },
  });
  return (
    <Marker
      position={[lat, lng]}
      draggable
      eventHandlers={{
        dragend: async (e) => {
          const marker = e.target;
          const pos = marker.getLatLng();
          onDragEnd(pos.lat, pos.lng);
        },
      }}
    />
  );
}

export default function MapPicker({ initialLat = 14.5995, initialLng = 120.9842, onAddressChange }: MapPickerProps) {
  const [lat, setLat] = useState(initialLat);
  const [lng, setLng] = useState(initialLng);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    ensureLeafletIcons();
    setMounted(true);
  }, []);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (abortRef.current) abortRef.current.abort();
    if (query.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=ph&addressdetails=1`,
        { signal: controller.signal }
      );
      const results: SearchResult[] = await res.json();
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }
    setSearching(false);
  }, []);

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const handlePositionChange = useCallback(
    async (newLat: number, newLng: number) => {
      setLat(newLat);
      setLng(newLng);
      const parts = await reverseGeocode(newLat, newLng);
      // Always call onAddressChange with whatever we have
      onAddressChange({
        street: parts.street || "",
        city: parts.city || "",
        province: parts.province || "",
        zip: parts.zip || "",
        lat: newLat,
        lng: newLng,
      });
    },
    [onAddressChange]
  );

  useEffect(() => {
    if (mounted) {
      handlePositionChange(initialLat, initialLng);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  async function selectSuggestion(result: SearchResult) {
    const newLat = parseFloat(result.lat);
    const newLng = parseFloat(result.lon);
    setLat(newLat);
    setLng(newLng);
    setSearchQuery(result.display_name);
    setShowSuggestions(false);
    // Keep suggestions in state so re-focus can show them again
    setInputFocused(false);
    // Geocode and fill address fields
    const parts = await reverseGeocode(newLat, newLng);
    onAddressChange({
      street: parts.street || result.display_name.split(",")[0]?.trim() || "",
      city: parts.city || "",
      province: parts.province || "",
      zip: parts.zip || "",
      lat: newLat,
      lng: newLng,
    });
  }

  if (!mounted) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-100 flex items-center justify-center" style={{ height: 280 }}>
        <span className="text-sm text-gray-400">Loading map…</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search bar with autocomplete */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={() => {
            setInputFocused(true);
            if (suggestions.length > 0) setShowSuggestions(true);
          }}
          onBlur={() => {
            setTimeout(() => {
              setInputFocused(false);
              setShowSuggestions(false);
            }, 200);
          }}
          placeholder="Search address in Philippines..."
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-300"
        />
        {searching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-gray-200 rounded-full animate-spin" style={{ borderTopColor: "#dc2626" }} />
          </div>
        )}

        {/* Dropdown suggestions */}
        {showSuggestions && suggestions.length > 0 && inputFocused && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-[999] overflow-hidden max-h-56 overflow-y-auto">
            {suggestions.map((result, idx) => (
              <button
                key={idx}
                onMouseDown={(e) => { e.preventDefault(); selectSuggestion(result); }}
                className="w-full text-left px-4 py-3 hover:bg-red-50 transition-colors border-b border-gray-50 last:border-b-0"
              >
                <div className="flex items-start gap-2">
                  <span className="text-sm flex-shrink-0 mt-0.5">📍</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 line-clamp-2">{result.display_name}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="rounded-xl overflow-hidden border border-gray-200" style={{ height: 280 }}>
        <MapContainer
          center={[lat, lng]}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapFlyTo lat={lat} lng={lng} />
          <DraggableMarker lat={lat} lng={lng} onDragEnd={handlePositionChange} />
        </MapContainer>
      </div>

      <p className="text-xs text-gray-400">Click on the map or drag the pin to adjust. Type to search your area.</p>
    </div>
  );
}