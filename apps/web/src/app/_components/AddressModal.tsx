"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { haversineDistance, STORE_LOCATION, MAX_DELIVERY_RADIUS_KM } from "@/lib/store-config";
import dynamic from "next/dynamic";

const MapPicker = dynamic(() => import("./MapPicker"), { ssr: false });

interface AddressEntry {
  id: string;
  user_id: string;
  label: string;
  street: string;
  city: string;
  province: string;
  zip: string | null;
  is_default: boolean;
  lat?: number;
  lng?: number;
}

interface AddressModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
}

export default function AddressModal({ open, onClose, userId }: AddressModalProps) {
  const [addresses, setAddresses] = useState<AddressEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [formLabel, setFormLabel] = useState("Home");
  const [formStreet, setFormStreet] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formProvince, setFormProvince] = useState("Metro Manila");
  const [formZip, setFormZip] = useState("");
  const [formLat, setFormLat] = useState(STORE_LOCATION.lat);
  const [formLng, setFormLng] = useState(STORE_LOCATION.lng);
  const [formDistance, setFormDistance] = useState(0);

  const sb = createClient();

  async function fetchAddresses() {
    setLoading(true);
    const { data } = await sb.from("addresses").select("*").eq("user_id", userId).order("is_default", { ascending: false });
    if (data) setAddresses(data as AddressEntry[]);
    setLoading(false);
  }

  useEffect(() => {
    if (open && userId) fetchAddresses();
  }, [open, userId]);

  async function handleSetDefault(addressId: string) {
    await sb.from("addresses").update({ is_default: false }).eq("user_id", userId);
    await sb.from("addresses").update({ is_default: true }).eq("id", addressId);
    await fetchAddresses();
  }

  async function handleDelete(addressId: string) {
    if (!confirm("Delete this address?")) return;
    await sb.from("addresses").delete().eq("id", addressId);
    await fetchAddresses();
  }

  async function handleSaveAddress() {
    if (!formStreet.trim()) { setError("Street address is required."); return; }
    if (!formCity.trim()) { setError("City is required."); return; }
    if (formDistance > MAX_DELIVERY_RADIUS_KM) { setError(`This address is ${formDistance.toFixed(1)} km away — our delivery range is ${MAX_DELIVERY_RADIUS_KM} km. Please choose a closer address.`); return; }
    setSaving(true);
    setError("");

    const hasDefault = addresses.some((a) => a.is_default);
    const { error: insertErr } = await sb.from("addresses").insert({
      user_id: userId,
      label: formLabel.trim() || "Home",
      street: formStreet.trim(),
      city: formCity.trim(),
      province: formProvince.trim() || "Metro Manila",
      zip: formZip.trim() || null,
      is_default: !hasDefault,
      lat: formLat,
      lng: formLng,
    });
    if (insertErr) {
      setError(insertErr.message);
      setSaving(false);
      return;
    }
    setSaving(false);
    setAdding(false);
    setFormStreet(""); setFormCity(""); setFormProvince("Metro Manila"); setFormZip(""); setFormLabel("Home");
    setFormLat(STORE_LOCATION.lat); setFormLng(STORE_LOCATION.lng); setFormDistance(0);
    await fetchAddresses();
  }

  function handleAddressChange(parts: { street: string; city: string; province: string; zip: string; lat: number; lng: number }) {
    if (parts.street) setFormStreet(parts.street);
    if (parts.city) setFormCity(parts.city);
    if (parts.province) setFormProvince(parts.province);
    if (parts.zip) setFormZip(parts.zip);
    setFormLat(parts.lat);
    setFormLng(parts.lng);
    setFormDistance(haversineDistance(STORE_LOCATION.lat, STORE_LOCATION.lng, parts.lat, parts.lng));
  }

  if (!open) return null;

  const hasAddress = addresses.length > 0;
  const isOutsideRadius = formDistance > MAX_DELIVERY_RADIUS_KM;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-[70]" onClick={onClose} />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-fade-in-scale">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#f3f4f6]">
            <h3 className="font-black text-base text-[#0a0a0a]">Delivery Addresses</h3>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f3f4f6] transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="#6b7280" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-3 border-gray-200 rounded-full animate-spin mx-auto" style={{ borderTopColor: "#dc2626" }} />
            </div>
          ) : !adding ? (
            <>
              <div className="px-5 py-4 space-y-3 max-h-[50vh] overflow-y-auto">
                {!hasAddress && (
                  <div className="text-center py-6">
                    <p className="text-4xl mb-2">📍</p>
                    <p className="text-sm font-semibold text-gray-400">No saved addresses</p>
                    <p className="text-xs text-gray-300 mt-1">Add one to place delivery orders.</p>
                  </div>
                )}
                {addresses.map((addr) => (
                  <div key={addr.id} className={`p-4 rounded-xl border transition-all ${addr.is_default ? "border-red-200 bg-red-50/30" : "border-gray-200 bg-gray-50"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-extrabold px-2 py-0.5 rounded bg-red-100 text-red-600">{addr.label}</span>
                          {addr.is_default && <span className="text-xs font-bold text-red-600">★ Default</span>}
                        </div>
                        <p className="text-sm font-semibold text-gray-800">{addr.street}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {addr.city}{addr.province ? `, ${addr.province}` : ""}{addr.zip ? ` ${addr.zip}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!addr.is_default && (
                          <button onClick={() => handleSetDefault(addr.id)} className="px-2 py-1 rounded-md text-xs font-semibold bg-gray-200 text-gray-500 hover:bg-gray-300 transition-colors">Set Default</button>
                        )}
                        <button onClick={() => handleDelete(addr.id)} className="p-1 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-[#f3f4f6] px-5 py-4">
                <button onClick={() => setAdding(true)} className="w-full py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors">+ Add New Address</button>
              </div>
            </>
          ) : (
            <>
              <div className="px-5 py-4 space-y-4 max-h-[65vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">Label</label>
                    <select value={formLabel} onChange={(e) => setFormLabel(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500/30">
                      <option value="Home">Home</option>
                      <option value="Work">Work</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">ZIP Code</label>
                    <input type="text" value={formZip} onChange={(e) => setFormZip(e.target.value)} placeholder="Optional" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-2">Pin Your Location</label>
                  <MapPicker initialLat={formLat} initialLng={formLng} onAddressChange={handleAddressChange} />
                </div>

                {formDistance > 0 && (
                  <div className={`p-3 rounded-xl border text-sm ${isOutsideRadius ? "bg-red-50 border-red-200 text-red-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
                    <p className="font-bold text-xs">
                      {isOutsideRadius ? "⚠️ Outside Delivery Zone" : "✅ Within Delivery Zone"}
                    </p>
                    <p className="text-xs mt-0.5 opacity-80">
                      Distance from store: {formDistance.toFixed(1)} km {isOutsideRadius ? `(max: ${MAX_DELIVERY_RADIUS_KM} km)` : ""}
                    </p>
                    {isOutsideRadius && (
                      <p className="text-xs mt-1 opacity-70">Delivery orders won't be available for this address. You can still place pickup orders.</p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Street</label>
                  <input type="text" value={formStreet} onChange={(e) => setFormStreet(e.target.value)} placeholder="House no., street name, barangay" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">City</label>
                    <input type="text" value={formCity} onChange={(e) => setFormCity(e.target.value)} placeholder="City/Municipality" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">Province</label>
                    <input type="text" value={formProvince} onChange={(e) => setFormProvince(e.target.value)} placeholder="Province" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30" />
                  </div>
                </div>

                {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
                <div className="flex gap-2">
                  <button onClick={() => { setAdding(false); setError(""); }} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-bold hover:bg-gray-200 transition-colors">Cancel</button>
                  <button onClick={handleSaveAddress} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50">{saving ? "Saving…" : "Save Address"}</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}