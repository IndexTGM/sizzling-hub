import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";

export const BACKGROUND_LOCATION_TASK = "DELIVERY_LOCATION_TRACKING";

const STORAGE_KEY_ORDER_ID = "bg_location_order_id";
const STORAGE_KEY_DRIVER_ID = "bg_location_driver_id";

interface LocationData {
  locations: Location.LocationObject[];
}

TaskManager.defineTask<LocationData>(
  BACKGROUND_LOCATION_TASK,
  async ({ data, error }) => {
    if (error) {
      console.error("[BackgroundLocation] Task error:", error.message);
      return;
    }

    if (!data || !data.locations || data.locations.length === 0) {
      return;
    }

    // Read orderId/driverId from AsyncStorage (works reliably in background)
    const orderId = await AsyncStorage.getItem(STORAGE_KEY_ORDER_ID);
    const driverId = await AsyncStorage.getItem(STORAGE_KEY_DRIVER_ID);

    if (!orderId || !driverId) {
      console.warn("[BackgroundLocation] Missing orderId or driverId in storage");
      return;
    }

    const { locations } = data;
    const latest = locations[locations.length - 1];
    const { latitude, longitude, heading, speed } = latest.coords;

    await supabase.from("driver_locations").insert({
      order_id: orderId,
      driver_id: driverId,
      latitude,
      longitude,
      heading: heading ?? null,
      speed: speed ?? null,
    });
  }
);

/**
 * Start background GPS tracking for a delivery.
 * Call this when the driver accepts a delivery.
 */
export async function startLocationTracking(
  orderId: string,
  driverId: string
): Promise<void> {
  // Request foreground permission first
  const { status: fgStatus } =
    await Location.requestForegroundPermissionsAsync();
  if (fgStatus !== "granted") {
    throw new Error("Location permission denied");
  }

  // Request background permission
  const { status: bgStatus } =
    await Location.requestBackgroundPermissionsAsync();
  if (bgStatus !== "granted") {
    throw new Error("Background location permission denied");
  }

  // Store orderId/driverId in AsyncStorage so the background task can read it
  await AsyncStorage.setItem(STORAGE_KEY_ORDER_ID, orderId);
  await AsyncStorage.setItem(STORAGE_KEY_DRIVER_ID, driverId);

  // Check if task is already registered
  const isRegistered = await TaskManager.isTaskRegisteredAsync(
    BACKGROUND_LOCATION_TASK
  );

  // If already running, stop it first
  if (isRegistered) {
    await stopLocationTracking();
    // Short delay before restarting
    await new Promise((r) => setTimeout(r, 500));
  }

  // Start background location updates
  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    distanceInterval: 10, // meters — update every 10m movement
    deferredUpdatesInterval: 5000, // minimum 5s between updates
    foregroundService: {
      notificationTitle: "Sizzling Hub Delivery",
      notificationBody: "Tracking your delivery location",
      notificationColor: "#dc2626",
    },
    pausesUpdatesAutomatically: false,
    activityType: Location.ActivityType.AutomotiveNavigation,
    showsBackgroundLocationIndicator: true,
  });

  console.log(
    `[BackgroundLocation] Started tracking for order ${orderId}`
  );
}

/**
 * Stop background GPS tracking.
 * Call this when the driver marks the order as delivered.
 */
export async function stopLocationTracking(): Promise<void> {
  // Clear stored tracking context
  await AsyncStorage.removeItem(STORAGE_KEY_ORDER_ID);
  await AsyncStorage.removeItem(STORAGE_KEY_DRIVER_ID);

  const isRegistered = await TaskManager.isTaskRegisteredAsync(
    BACKGROUND_LOCATION_TASK
  );

  if (isRegistered) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    console.log("[BackgroundLocation] Stopped tracking");
  }
}

/**
 * Check if background tracking is currently active.
 */
export async function isLocationTrackingActive(): Promise<boolean> {
  return Location.hasStartedLocationUpdatesAsync(
    BACKGROUND_LOCATION_TASK
  );
}