import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Location from "expo-location";
import { WebView } from "react-native-webview";
import { STORE_LOCATION } from "@/lib/store-config";
import {
  startLocationTracking,
  stopLocationTracking,
} from "@/lib/background-location-task";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState, useRef, useMemo } from "react";

const PRIMARY = "#dc2626";
const GREEN = "#10b981";

function buildMapHtml(
  customerLat: number | null,
  customerLng: number | null,
  customerLabel: string | null
): string {
  const csLat = customerLat ?? STORE_LOCATION.lat;
  const csLng = customerLng ?? STORE_LOCATION.lng;
  const csPopup = (customerLabel || "Customer").replace(/'/g, "\\'");
  // OSRM free routing service — returns road-following GeoJSON paths
  const OSRM_BASE = "https://router.project-osrm.org";
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body,#map{width:100%;height:100%;touch-action:manipulation}
  .route-line{stroke:#dc2626;stroke-width:5;stroke-linecap:round;stroke-linejoin:round;fill:none;opacity:0.85}
</style>
</head>
<body>
<div id="map"></div>
<script>
  var STORE_LAT=${STORE_LOCATION.lat};
  var STORE_LNG=${STORE_LOCATION.lng};
  var CUST_LAT=${csLat};
  var CUST_LNG=${csLng};
  var OSRM="${OSRM_BASE}";

  var map=L.map('map',{zoomControl:true,scrollWheelZoom:true,tap:true,touchZoom:true,dragging:true});
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap'}).addTo(map);

  var storeIcon=L.divIcon({html:'<div style="background:#fbbf24;width:18px;height:18px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>',className:'',iconSize:[18,18],iconAnchor:[9,9]});
  var storeMarker=L.marker([STORE_LAT,STORE_LNG],{icon:storeIcon}).addTo(map).bindPopup("Ben's Tapsihan (Store)");

  var custIcon=L.divIcon({html:'<div style="background:#3b82f6;width:20px;height:20px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:bold">📍</div>',className:'',iconSize:[20,20],iconAnchor:[10,10]});
  var custMarker=L.marker([CUST_LAT,CUST_LNG],{icon:custIcon}).addTo(map).bindPopup('${csPopup}');

  var driverIcon=L.divIcon({html:'<div style="background:#dc2626;width:28px;height:28px;border-radius:50%;border:4px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,0.4)"></div>',className:'',iconSize:[28,28],iconAnchor:[14,14]});
  var driverMarker=L.marker([STORE_LAT,STORE_LNG],{icon:driverIcon}).addTo(map).bindPopup('You are here');
  driverMarker.setOpacity(0);

  // ——— Road route polyline layer ———
  var routeLayer=L.polyline([],{className:'route-line'}).addTo(map);
  var prevCoords="";

  // Fetch road-following route from OSRM and draw it
  function fetchRoute(fromLat,fromLng,toLat,toLng){
    var url=OSRM+'/route/v1/driving/'+fromLng+','+fromLat+';'+toLng+','+toLat+'?overview=full&geometries=geojson';
    fetch(url).then(function(r){return r.json();}).then(function(data){
      if(!data || !data.routes || !data.routes[0]) return;
      var geom=data.routes[0].geometry;
      // OSRM returns [lng,lat] pairs → swap to [lat,lng] for Leaflet
      var pts=geom.coordinates.map(function(c){return [c[1],c[0]];});
      routeLayer.setLatLngs(pts);
    }).catch(function(){});
  }

  // Route only drawn when driver GPS position arrives via moveDriver()

  var group=L.featureGroup([storeMarker,custMarker]);
  map.fitBounds(group.getBounds().pad(0.2));

  function moveDriver(lat,lng){
    if(!driverMarker)return;
    driverMarker.setLatLng([lat,lng]);
    if(driverMarker._icon)driverMarker._icon.style.opacity='1';
    driverMarker.setOpacity(1);
    // Re-fetch road route from current driver position → customer
    var ck=lat.toFixed(4)+','+lng.toFixed(4);
    if(ck!==prevCoords){
      prevCoords=ck;
      fetchRoute(lat,lng,CUST_LAT,CUST_LNG);
    }
    var all=L.featureGroup([storeMarker,custMarker,driverMarker]);
    map.fitBounds(all.getBounds().pad(0.1));
  }
  window.ReactNativeWebView.postMessage('ready');
<\/script>
</body>
</html>`;
}

export default function DriverMapScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    orderId: string;
    customerLat: string;
    customerLng: string;
    customerLabel: string;
  }>();

  const orderId = params.orderId ?? "";
  const customerLat = params.customerLat ? parseFloat(params.customerLat) : null;
  const customerLng = params.customerLng ? parseFloat(params.customerLng) : null;
  const customerLabel = params.customerLabel ?? null;

  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const mapRef = useRef<WebView | null>(null);
  const [driverLocation, setDriverLocation] = useState<{
    latitude: number;
    longitude: number;
    heading: number | null;
  } | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const mapHtml = useMemo(
    () => buildMapHtml(customerLat, customerLng, customerLabel),
    [customerLat, customerLng, customerLabel]
  );

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (locationSubRef.current) return;
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled || status !== "granted") return;

      if (orderId && user?.id) {
        await startLocationTracking(orderId, user.id);
      }

      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 5,
          timeInterval: 3000,
        },
        (loc) => {
          if (cancelled) return;
          const { latitude, longitude, heading } = loc.coords;
          setDriverLocation({ latitude, longitude, heading: heading ?? null });
          mapRef.current?.injectJavaScript(
            `moveDriver(${latitude},${longitude});true;`
          );
        }
      );
      if (!cancelled) {
        locationSubRef.current = sub;
      } else {
        sub.remove();
      }
    }

    start();

    return () => {
      cancelled = true;
      if (locationSubRef.current) {
        locationSubRef.current.remove();
        locationSubRef.current = null;
      }
    };
  }, [orderId, user?.id]);

  const handleStop = async () => {
    await stopLocationTracking();
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleStop} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>🛵 Live Tracking</Text>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.livePillText}>LIVE</Text>
          </View>
        </View>
        <View style={{ width: 60 }} />
      </View>

      {customerLabel && (
        <View style={styles.destinationBar}>
          <Text style={styles.destinationText} numberOfLines={1}>
            📍 {customerLabel}
          </Text>
        </View>
      )}

      <View style={styles.mapWrap}>
        <WebView
          ref={(r) => {
            mapRef.current = r;
          }}
          source={{ html: mapHtml }}
          style={styles.map}
          scrollEnabled={false}
          javaScriptEnabled={true}
          onMessage={(e) => {
            if (e.nativeEvent.data === "ready") setMapReady(true);
          }}
        />
        {!mapReady && (
          <View style={styles.mapOverlay}>
            <ActivityIndicator size="large" color={PRIMARY} />
            <Text style={styles.waitingText}>Loading map…</Text>
          </View>
        )}
      </View>

      {driverLocation && (
        <View style={styles.coordsBar}>
          <Text style={styles.coordsText}>
            Lat: {driverLocation.latitude.toFixed(5)} | Lng:{" "}
            {driverLocation.longitude.toFixed(5)}
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.stopBtn}
          onPress={handleStop}
          activeOpacity={0.7}
        >
          <Text style={styles.stopBtnText}>⏹ Stop Tracking</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backBtn: { paddingVertical: 6, paddingRight: 12 },
  backBtnText: { fontSize: 15, fontWeight: "700", color: PRIMARY },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1f2937" },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: GREEN },
  livePillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#065f46",
    letterSpacing: 0.5,
  },
  destinationBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#eff6ff",
    borderBottomWidth: 1,
    borderBottomColor: "#dbeafe",
  },
  destinationText: { fontSize: 13, fontWeight: "600", color: "#1e40af" },
  mapWrap: { flex: 1 },
  map: { flex: 1 },
  mapOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  waitingText: { fontSize: 13, fontWeight: "600", color: "#9ca3af" },
  coordsBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  coordsText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#9ca3af",
    textAlign: "center",
    fontFamily: "monospace",
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  stopBtn: {
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  stopBtnText: { fontSize: 15, fontWeight: "700", color: PRIMARY },
});