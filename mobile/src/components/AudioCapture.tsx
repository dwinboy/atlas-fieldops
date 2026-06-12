import { Audio } from "expo-av";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";

export type AudioResult = {
  uri: string;
  durationMillis: number | null;
  capturedAt: string;
};

type AudioCaptureProps = {
  value: AudioResult | null;
  onChange: (result: AudioResult | null) => void;
  required?: boolean;
};

export function AudioCapture({ value, onChange, required = false }: AudioCaptureProps) {
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      recordingRef.current?.stopAndUnloadAsync().catch(() => undefined);
      soundRef.current?.unloadAsync().catch(() => undefined);
    };
  }, []);

  async function handleStart() {
    setError(null);
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        setError("Microphone permission denied. Enable microphone access in device settings.");
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recording.setOnRecordingStatusUpdate((status) => {
        if (status.isRecording) setElapsedMs(status.durationMillis);
      });
      await recording.startAsync();
      recordingRef.current = recording;
      setElapsedMs(0);
      setIsRecording(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start recording.");
    }
  }

  async function handleStop() {
    const recording = recordingRef.current;
    if (!recording) return;
    try {
      await recording.stopAndUnloadAsync();
      const status = await recording.getStatusAsync();
      const uri = recording.getURI();
      recordingRef.current = null;
      setIsRecording(false);
      if (uri) {
        onChange({ uri, durationMillis: status.durationMillis, capturedAt: new Date().toISOString() });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the recording.");
      setIsRecording(false);
    }
  }

  async function handlePlayPause() {
    if (!value) return;
    try {
      if (soundRef.current) {
        if (isPlaying) {
          await soundRef.current.pauseAsync();
          setIsPlaying(false);
        } else {
          await soundRef.current.playAsync();
          setIsPlaying(true);
        }
        return;
      }
      const { sound } = await Audio.Sound.createAsync({ uri: value.uri }, { shouldPlay: true });
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
          sound.setPositionAsync(0);
        }
      });
      setIsPlaying(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not play the recording.");
    }
  }

  function handleDiscard() {
    soundRef.current?.unloadAsync().catch(() => undefined);
    soundRef.current = null;
    setIsPlaying(false);
    onChange(null);
  }

  return (
    <View style={{ gap: 10 }}>
      {value ? (
        <View style={{
          alignItems: "center",
          backgroundColor: "#f0fdf4",
          borderColor: "#bbf7d0",
          borderRadius: 12,
          borderWidth: 1,
          flexDirection: "row",
          gap: 12,
          padding: 14,
        }}>
          <Pressable onPress={handlePlayPause} style={playButton}>
            <Text style={{ color: "white", fontSize: 16 }}>{isPlaying ? "⏸" : "▶"}</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#15803d", fontWeight: "700" }}>Audio recorded</Text>
            {value.durationMillis != null && (
              <Text style={{ color: "#49635a", fontSize: 12 }}>{formatDuration(value.durationMillis)}</Text>
            )}
          </View>
          <Pressable onPress={handleDiscard}>
            <Text style={{ color: "#b42318", fontWeight: "700", fontSize: 12 }}>Remove</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{
          backgroundColor: required ? "#fff7ed" : "#f6faf8",
          borderColor: required ? "#fed7aa" : "#dbe7e2",
          borderRadius: 12,
          borderWidth: 1,
          borderStyle: "dashed",
          padding: 24,
          alignItems: "center",
          gap: 6,
        }}>
          <Text style={{ fontSize: 28 }}>🎙</Text>
          <Text style={{ color: required ? "#9a3412" : "#49635a", fontWeight: "700", fontSize: 14 }}>
            {isRecording ? `Recording… ${formatDuration(elapsedMs)}` : required ? "Audio recording required" : "No audio recorded"}
          </Text>
        </View>
      )}

      <Pressable
        onPress={isRecording ? handleStop : handleStart}
        style={{
          alignItems: "center",
          backgroundColor: isRecording ? "#b42318" : "#12332b",
          borderRadius: 12,
          flexDirection: "row",
          justifyContent: "center",
          gap: 8,
          paddingVertical: 14,
        }}
      >
        <Text style={{ fontSize: 16 }}>{isRecording ? "⏹" : "🎙"}</Text>
        <Text style={{ color: "white", fontWeight: "700" }}>
          {isRecording ? "Stop recording" : value ? "Re-record" : "Start recording"}
        </Text>
      </Pressable>

      {error && (
        <View style={{ backgroundColor: "#fee2e2", borderRadius: 10, padding: 10 }}>
          <Text style={{ color: "#b42318", fontSize: 13 }}>{error}</Text>
        </View>
      )}
    </View>
  );
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

const playButton = {
  alignItems: "center",
  backgroundColor: "#12332b",
  borderRadius: 999,
  height: 36,
  justifyContent: "center",
  width: 36,
} as const;
