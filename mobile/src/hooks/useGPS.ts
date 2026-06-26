import * as Location from "expo-location";
import { useCallback, useState } from "react";

export type GPSResult = {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
  timestamp: string;
  source: "GPS";
};

export type GPSState = {
  status: "idle" | "requesting" | "locating" | "done" | "error" | "denied";
  result: GPSResult | null;
  error: string | null;
  isCapturing: boolean;
};

export function useGPS() {
  const [state, setState] = useState<GPSState>({
    status: "idle",
    result: null,
    error: null,
    isCapturing: false,
  });

  const capture = useCallback(async (): Promise<GPSResult | null> => {
    setState((s) => ({ ...s, status: "requesting", isCapturing: true, error: null }));

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setState((s) => ({
          ...s,
          status: "denied",
          isCapturing: false,
          error: "Location permission was denied. Enable it in your device settings.",
        }));
        return null;
      }

      setState((s) => ({ ...s, status: "locating" }));

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const result: GPSResult = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        altitude: location.coords.altitude ?? null,
        accuracy: location.coords.accuracy ?? null,
        timestamp: new Date(location.timestamp).toISOString(),
        source: "GPS",
      };

      setState({ status: "done", result, error: null, isCapturing: false });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not get GPS. Move to open area and try again.";
      setState((s) => ({ ...s, status: "error", isCapturing: false, error: message }));
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ status: "idle", result: null, error: null, isCapturing: false });
  }, []);

  const watchPosition = useCallback(
    async (
      onUpdate: (result: GPSResult) => void,
      options?: { timeInterval?: number; distanceInterval?: number },
    ): Promise<Location.LocationSubscription | null> => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setState((s) => ({
          ...s,
          status: "denied",
          error: "Location permission was denied. Enable it in your device settings.",
        }));
        return null;
      }
      return Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: options?.timeInterval ?? 3000,
          distanceInterval: options?.distanceInterval ?? 0,
        },
        (location) => {
          onUpdate({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            altitude: location.coords.altitude ?? null,
            accuracy: location.coords.accuracy ?? null,
            timestamp: new Date(location.timestamp).toISOString(),
            source: "GPS",
          });
        },
      );
    },
    [],
  );

  return { ...state, capture, watchPosition, reset };
}
