import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { WebView } from "react-native-webview";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useBranch } from "@/lib/branch-context";
import { haversineDistance, STORE_LOCATION, MAX_DELIVERY_RADIUS_KM } from "@/lib/store-config";

const PRIMARY = "#dc2626";

interface SavedAddress {
  id: string;
  label: string;
  street: string;
  city: string;
  province: string;
  zip: string | null;
  is_default: boolean;
  lat: number;
  lng: number;
}

interface AddrParams {
  storeLat: number;
  storeLng: number;
}

function mapHtml(addr: AddrParams & { lat: number; lng: number }) {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body,#map { width:100%; height:100%; }
</style>
</head>
<body>
<div id="map"></div>
<script>
  var STORE_LAT = ${addr.storeLat};
  var STORE_LNG = ${addr.storeLng};
  var RADIUS = ${MAX_DELIVERY_RADIUS_KM * 1000};

  var map = L.map('map', { zoomControl: true, scrollWheelZoom: false, tap: true, touchZoom: true }).setView([${addr.lat},${addr.lng}], 16);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  // Store marker
  var storeIcon = L.divIcon({ html: '<div style="background:#10b981;width:16px;height:16px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>', className: '', iconSize: [16,16], iconAnchor: [8,8] });
  L.marker([STORE_LAT, STORE_LNG], { icon: storeIcon }).addTo(map).bindPopup('Store');

  // Delivery radius
  L.circle([STORE_LAT, STORE_LNG], { radius: RADIUS, color: '#dc2626', fillColor: '#dc2626', fillOpacity: 0.08, weight: 2, dashArray: '6 4' }).addTo(map);

  // User pin
  var userIcon = L.divIcon({ html: '<div style="background:#dc2626;width:24px;height:24px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>', className: '', iconSize: [24,24], iconAnchor: [12,12] });
  var marker = L.marker([${addr.lat},${addr.lng}], { icon: userIcon, draggable: true }).addTo(map);

  function sendPos(lat, lng) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'pinMoved', lat: lat, lng: lng }));
  }

  marker.on('dragend', function(e) {
    var pos = e.target.getLatLng();
    sendPos(pos.lat, pos.lng);
  });

  // Tap anywhere on map to move the pin
  map.on('click', function(e) {
    var pos = e.latlng;
    marker.setLatLng([pos.lat, pos.lng]);
    sendPos(pos.lat, pos.lng);
  });

  function setLocation(lat, lng) {
    marker.setLatLng([lat, lng]);
    map.setView([lat, lng], 16);
  }
</script>
</body>
</html>`;
}

export default function AddressesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { branchLocation } = useBranch();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Use branch location if available, otherwise fallback to main branch
  const storeLat = branchLocation.lat || STORE_LOCATION.lat;
  const storeLng = branchLocation.lng || STORE_LOCATION.lng;

  const [formLabel, setFormLabel] = useState("Home");
  const [formStreet, setFormStreet] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formProvince, setFormProvince] = useState("Metro Manila");
  const [formZip, setFormZip] = useState("");
  const [formLat, setFormLat] = useState(storeLat);
  const [formLng, setFormLng] = useState(storeLng);

  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const webRef = useRef<WebView>(null);

  // Rebuild map HTML when branch location changes
  const mapSource = useMemo(() => ({ html: mapHtml({ storeLat, storeLng, lat: formLat, lng: formLng }) }), [storeLat, storeLng]);

  async function fetchAddresses() {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from("addresses").select("*").eq("user_id", user.id).order("is_default", { ascending: false });
    if (data) setAddresses(data as SavedAddress[]);
    setLoading(false);
  }

  useEffect(() => { fetchAddresses(); }, [user]);

  // Update form coords when branch changes
  useEffect(() => {
    setFormLat(storeLat);
    setFormLng(storeLng);
  }, [storeLat, storeLng]);

  const distKm = haversineDistance(storeLat, storeLng, formLat, formLng);
  const isOutsideRadius = distKm > MAX_DELIVERY_RADIUS_KM;

  function moveMapTo(lat: number, lng: number) {
    setFormLat(lat); setFormLng(lng);
    webRef.current?.injectJavaScript(`setLocation(${lat}, ${lng}); true;`);
  }

  async function doSearch(q: string) {
    setSearch(q);
    if (q.trim().length < 3) { setSearchResults([]); return; }
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&countrycodes=ph`);
      const json = await res.json();
      setSearchResults(json);
    } catch { setSearchResults([]); }
  }

  function selectSearchResult(r: any) {
    const newLat = parseFloat(r.lat);
    const newLng = parseFloat(r.lon);
    moveMapTo(newLat, newLng);
    geoLookup(newLat, newLng);
    setSearchResults([]);
    setSearch("");
  }

  const geoLookup = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=18`, {
        headers: { "User-Agent": "SizzlingHub/1.0" },
      });
      if (!res.ok) {
        setFormStreet(`Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`);
        setFormCity("(reverse geocode failed)");
        return;
      }
      const data = await res.json();
      const addr = data.address || {};
      setFormStreet(addr.road || addr.street || addr.neighbourhood || addr.suburb || data.display_name || `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`);
      setFormCity(addr.city || addr.municipality || addr.town || addr.village || "");
      setFormProvince(addr.state || addr.province || "Metro Manila");
      setFormZip(addr.postcode || "");
    } catch (err) {
      setFormStreet(`Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`);
      setFormCity("(geocoding error)");
    }
  }, []);

  const handleMapMessage = useCallback((e: any) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === "pinMoved") {
        const lat = msg.lat as number;
        const lng = msg.lng as number;
        setFormLat(lat);
        setFormLng(lng);
        geoLookup(lat, lng);
      }
    } catch {}
  }, [geoLookup]);

  async function handleSave() {
    if (!formStreet.trim()) { setError("Street address is required."); return; }
    if (!formCity.trim()) { setError("City is required."); return; }
    // Distance check is informational only — addresses can be saved regardless.
    // The cart/checkout flow will validate distance at order time.
    setSaving(true); setError("");
    const hasDefault = addresses.some((a) => a.is_default);
    const { error: insertErr } = await supabase.from("addresses").insert({
      user_id: user!.id, label: formLabel, street: formStreet.trim(),
      city: formCity.trim(), province: formProvince.trim(),
      zip: formZip.trim() || null, is_default: !hasDefault,
      lat: formLat, lng: formLng,
    });
    setSaving(false);
    if (insertErr) { setError(insertErr.message); return; }
    setAdding(false); resetForm();
    await fetchAddresses();
  }

  function resetForm() {
    setFormLabel("Home"); setFormStreet(""); setFormCity(""); setFormProvince("Metro Manila"); setFormZip("");
    setFormLat(storeLat); setFormLng(storeLng); setError("");
  }

  async function handleSetDefault(id: string) {
    if (!user) return;
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
    await supabase.from("addresses").update({ is_default: true }).eq("id", id);
    await fetchAddresses();
  }

  async function handleDelete(id: string) {
    await supabase.from("addresses").delete().eq("id", id);
    await fetchAddresses();
  }

  const labels: string[] = ["Home", "Work", "Other"];

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{adding ? "Add Address" : "My Addresses"}</Text>
        <View style={{ width: 50 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        {loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color={PRIMARY} /></View>
        ) : adding ? (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Label + ZIP */}
            <View style={styles.row}>
              {labels.map((l) => (
                <TouchableOpacity key={l} onPress={() => setFormLabel(l)}
                  style={[styles.labelBtn, formLabel === l && styles.labelBtnActive]}>
                  <Text style={[styles.labelBtnText, formLabel === l && styles.labelBtnTextActive]}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={styles.input} value={formZip} onChangeText={setFormZip} placeholder="ZIP Code (optional)" placeholderTextColor="#9ca3af" keyboardType="number-pad" />

            {/* Search bar */}
            <View>
              <TextInput style={styles.input} value={search} onChangeText={doSearch} placeholder="Search your address..." placeholderTextColor="#9ca3af" returnKeyType="search" autoCorrect={false} />
              {searchResults.length > 0 && (
                <View style={styles.searchDropdown}>
                  {searchResults.map((r: any, i: number) => (
                    <TouchableOpacity key={i} style={styles.searchItem} onPress={() => selectSearchResult(r)}>
                      <Text style={styles.searchItemText} numberOfLines={2}>{r.display_name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Map */}
            <View style={styles.mapWrap}>
              {Platform.OS === "web" ? (
                <View style={styles.mapFallback}><Text style={styles.mapFallbackText}>Map not available on web.</Text></View>
              ) : (
                <WebView
                  ref={webRef}
                  source={mapSource}
                  style={styles.map}
                  onMessage={handleMapMessage}
                  scrollEnabled={true}
                  nestedScrollEnabled
                  bounces={false}
                  overScrollMode="never"
                  showsVerticalScrollIndicator={false}
                  showsHorizontalScrollIndicator={false}
                  geolocationEnabled={false}
                  javaScriptEnabled
                  originWhitelist={["*"]}
                  cacheEnabled={false}
                />
              )}
            </View>

            {/* Distance badge */}
            <View style={[styles.distBadge, isOutsideRadius ? styles.distBadgeOut : styles.distBadgeOk]}>
              <Text style={[styles.distBadgeText, isOutsideRadius ? styles.distBadgeTextOut : styles.distBadgeTextOk]}>
                {isOutsideRadius ? `⚠ Outside range: ${distKm.toFixed(1)} km (max ${MAX_DELIVERY_RADIUS_KM} km)` : `✓ Within range: ${distKm.toFixed(1)} km`}
              </Text>
            </View>

            {/* Address fields */}
            <View>
              <Text style={styles.fieldLabel}>Street</Text>
              <TextInput style={styles.input} value={formStreet} onChangeText={setFormStreet} placeholder="House no., street, barangay" placeholderTextColor="#9ca3af" />
            </View>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>City</Text>
                <TextInput style={styles.input} value={formCity} onChangeText={setFormCity} placeholder="City" placeholderTextColor="#9ca3af" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Province</Text>
                <TextInput style={styles.input} value={formProvince} onChangeText={setFormProvince} placeholder="Province" placeholderTextColor="#9ca3af" />
              </View>
            </View>

            {error ? <View style={styles.alertError}><Text style={styles.alertErrorText}>{error}</Text></View> : null}

            <View style={styles.row}>
              <TouchableOpacity onPress={() => { setAdding(false); resetForm(); }} style={styles.cancelBtn}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleSave} disabled={saving} style={[styles.saveBtn, saving && { opacity: 0.5 }]}><Text style={styles.saveBtnText}>{saving ? "Saving…" : "Save Address"}</Text></TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {addresses.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyTitle}>No saved addresses</Text>
                <Text style={styles.emptySub}>Add one to place delivery orders.</Text>
              </View>
            ) : (
              addresses.map((addr) => (
                <View key={addr.id} style={[styles.addrCard, addr.is_default && styles.addrCardDefault]}>
                  <View style={styles.addrHeader}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.addrLabelRow}>
                        <View style={[styles.addrLabel, addr.is_default && styles.addrLabelDefault]}>
                          <Text style={[styles.addrLabelText, addr.is_default && styles.addrLabelTextDefault]}>{addr.label}</Text>
                        </View>
                        {addr.is_default && <Text style={styles.addrDefaultStar}>★ Default</Text>}
                      </View>
                      <Text style={styles.addrStreet}>{addr.street}</Text>
                      <Text style={styles.addrCity}>{addr.city}{addr.province ? `, ${addr.province}` : ""}{addr.zip ? ` ${addr.zip}` : ""}</Text>
                      {addr.lat && addr.lng && (
                        <Text style={styles.addrDist}>{haversineDistance(storeLat, storeLng, addr.lat, addr.lng).toFixed(1)} km from store</Text>
                      )}
                    </View>
                    <View style={{ gap: 6 }}>
                      {!addr.is_default && (
                        <TouchableOpacity onPress={() => handleSetDefault(addr.id)} style={styles.setDefaultBtn}>
                          <Text style={styles.setDefaultText}>Set Default</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity onPress={() => handleDelete(addr.id)} style={styles.deleteBtn}>
                        <Text style={styles.deleteBtnText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            )}
            <TouchableOpacity onPress={() => setAdding(true)} style={styles.addBtn}>
              <Text style={styles.addBtnText}>+ Add New Address</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  backBtn: { fontSize: 15, fontWeight: "600", color: "#6b7280" },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#0a0a0a" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  row: { flexDirection: "row", gap: 8 },
  labelBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: "#f3f4f6", alignItems: "center" },
  labelBtnActive: { backgroundColor: PRIMARY },
  labelBtnText: { fontSize: 13, fontWeight: "600", color: "#6b7280" },
  labelBtnTextActive: { color: "#fff" },
  fieldLabel: { fontSize: 12, fontWeight: "600", color: "#6b7280", marginBottom: 4 },
  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#0a0a0a", backgroundColor: "#fff" },
  searchDropdown: { backgroundColor: "#fff", borderRadius: 10, marginTop: 4, borderWidth: 1, borderColor: "#e5e7eb", maxHeight: 160, overflow: "hidden" },
  searchItem: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  searchItemText: { fontSize: 12, color: "#374151" },
  mapWrap: { height: 220, borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: "#e5e7eb" },
  map: { flex: 1 },
  mapFallback: { flex: 1, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  mapFallbackText: { color: "#9ca3af", fontSize: 13 },
  distBadge: { borderRadius: 10, padding: 10 },
  distBadgeOk: { backgroundColor: "#ecfdf5", borderWidth: 1, borderColor: "#bbf7d0" },
  distBadgeOut: { backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca" },
  distBadgeText: { fontSize: 12, fontWeight: "700", textAlign: "center" },
  distBadgeTextOk: { color: "#065f46" },
  distBadgeTextOut: { color: PRIMARY },
  alertError: { backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca", padding: 10, borderRadius: 8 },
  alertErrorText: { color: PRIMARY, fontSize: 12, fontWeight: "500" },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: "#f3f4f6", alignItems: "center" },
  cancelBtnText: { fontSize: 14, fontWeight: "700", color: "#6b7280" },
  saveBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: PRIMARY, alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  emptyWrap: { alignItems: "center", paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#9ca3af", marginBottom: 4 },
  emptySub: { fontSize: 13, color: "#d1d5db" },
  addrCard: { backgroundColor: "#fff", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#e5e7eb" },
  addrCardDefault: { borderColor: PRIMARY + "40", backgroundColor: "#fef2f2" },
  addrHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  addrLabelRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  addrLabel: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: "#f3f4f6" },
  addrLabelDefault: { backgroundColor: PRIMARY + "20" },
  addrLabelText: { fontSize: 11, fontWeight: "700", color: "#6b7280" },
  addrLabelTextDefault: { color: PRIMARY },
  addrDefaultStar: { fontSize: 11, fontWeight: "700", color: PRIMARY },
  addrStreet: { fontSize: 14, fontWeight: "700", color: "#1f2937" },
  addrCity: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  addrDist: { fontSize: 11, color: "#9ca3af", marginTop: 4 },
  setDefaultBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: "#f3f4f6" },
  setDefaultText: { fontSize: 11, fontWeight: "700", color: "#6b7280" },
  deleteBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: "#fef2f2" },
  deleteBtnText: { fontSize: 14, fontWeight: "700", color: PRIMARY },
  addBtn: { backgroundColor: PRIMARY, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  addBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});