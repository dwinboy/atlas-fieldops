import * as ImagePicker from "expo-image-picker";
import { useCallback, useState } from "react";

export type PhotoResult = {
  uri: string;
  width: number;
  height: number;
  mimeType: string;
  fileName: string;
  fileSize: number | null;
};

export type PhotoCaptureState = {
  status: "idle" | "capturing" | "done" | "error" | "denied";
  result: PhotoResult | null;
  error: string | null;
  isCapturing: boolean;
};

export function usePhotoCapture() {
  const [state, setState] = useState<PhotoCaptureState>({
    status: "idle",
    result: null,
    error: null,
    isCapturing: false,
  });

  const takePhoto = useCallback(async (): Promise<PhotoResult | null> => {
    setState((s) => ({ ...s, status: "capturing", isCapturing: true, error: null }));
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        setState((s) => ({
          ...s,
          status: "denied",
          isCapturing: false,
          error: "Camera permission denied. Enable camera access in device settings.",
        }));
        return null;
      }

      const picked = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.82,
        allowsEditing: false,
      });

      if (picked.canceled || !picked.assets?.[0]) {
        setState((s) => ({ ...s, status: "idle", isCapturing: false }));
        return null;
      }

      const asset = picked.assets[0];
      const result: PhotoResult = {
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        mimeType: asset.mimeType ?? "image/jpeg",
        fileName: asset.fileName ?? `photo_${Date.now()}.jpg`,
        fileSize: asset.fileSize ?? null,
      };

      setState({ status: "done", result, error: null, isCapturing: false });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not open camera.";
      setState((s) => ({ ...s, status: "error", isCapturing: false, error: message }));
      return null;
    }
  }, []);

  const pickFromGallery = useCallback(async (): Promise<PhotoResult | null> => {
    setState((s) => ({ ...s, status: "capturing", isCapturing: true, error: null }));
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setState((s) => ({
          ...s,
          status: "denied",
          isCapturing: false,
          error: "Gallery permission denied.",
        }));
        return null;
      }

      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.82,
      });

      if (picked.canceled || !picked.assets?.[0]) {
        setState((s) => ({ ...s, status: "idle", isCapturing: false }));
        return null;
      }

      const asset = picked.assets[0];
      const result: PhotoResult = {
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        mimeType: asset.mimeType ?? "image/jpeg",
        fileName: asset.fileName ?? `photo_${Date.now()}.jpg`,
        fileSize: asset.fileSize ?? null,
      };

      setState({ status: "done", result, error: null, isCapturing: false });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not open gallery.";
      setState((s) => ({ ...s, status: "error", isCapturing: false, error: message }));
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ status: "idle", result: null, error: null, isCapturing: false });
  }, []);

  return { ...state, takePhoto, pickFromGallery, reset };
}
