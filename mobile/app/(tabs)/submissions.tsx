import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppContext } from "@/context/AppContext";
import { localDatabase } from "@/storage/localDatabase";
import type { MobileSubmission } from "@/models/contracts";

type FilterTab = "all" | "draft" | "queued" | "failed" | "synced";

const FILTER_TABS: Array<{ key: FilterTab; label: string }> = [
  { key: "all", label: "All" },
  { key: "draft", label: "Drafts" },
  { key: "queued", label: "Queued" },
  { key: "failed", label: "Failed" },
  { key: "synced", label: "Synced" },
];

export default function SubmissionsScreen() {
  const router = useRouter();
  const { refreshKey, isSyncing, syncQueue } = useAppContext();
  const [filter, setFilter] = useState<FilterTab>("all");

  const submissions = useMemo(() => {
    const all = localDatabase.draftSubmissions.list().sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    if (filter === "all") return all;
    if (filter === "draft") return all.filter((s) => s.status === "Draft" || s.status === "ReturnedForCorrection");
    if (filter === "queued") return all.filter((s) => s.status === "ReadyToSubmit" || s.status === "Queued");
    if (filter === "failed") return all.filter((s) => s.status === "SyncFailed");
    if (filter === "synced") return all.filter((s) => s.status === "Synced");
    return all;
  }, [filter, refreshKey]);

  const counts = useMemo(() => {
    const all = localDatabase.draftSubmissions.list();
    return {
      draft: all.filter((s) => s.status === "Draft" || s.status === "ReturnedForCorrection").length,
      queued: all.filter((s) => s.status === "ReadyToSubmit" || s.status === "Queued").length,
      failed: all.filter((s) => s.status === "SyncFailed").length,
      synced: all.filter((s) => s.status === "Synced").length,
    };
  }, [refreshKey]);

  function formName(formId: string) {
    return localDatabase.forms.list().find((f) => f.id === formId)?.name ?? "Unknown form";
  }

  function entityName(entityId: string | null) {
    if (!entityId) return null;
    const e = localDatabase.entities.list().find((en) => en.id === entityId);
    return e?.name ?? null;
  }

  function statusInfo(s: MobileSubmission): { label: string; color: string; bg: string } {
    switch (s.status) {
      case "Draft": return { label: "Draft", color: "#49635a", bg: "#f0f5f3" };
      case "ReturnedForCorrection": return { label: "Returned", color: "#9a3412", bg: "#fff7ed" };
      case "ReadyToSubmit":
      case "Queued": return { label: "Queued", color: "#0f766e", bg: "#d7efe7" };
      case "SyncFailed": return { label: "Failed", color: "#b42318", bg: "#fee2e2" };
      case "Synced": return { label: "Synced ✓", color: "#15803d", bg: "#dcfce7" };
      default: return { label: s.status, color: "#49635a", bg: "#f0f5f3" };
    }
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f6faf8" }} edges={["bottom"]}>
      {/* Filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 48 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: "center" }}>
        {FILTER_TABS.map(({ key, label }) => {
          const count = key === "all" ? undefined : counts[key as keyof typeof counts];
          const active = filter === key;
          return (
            <Pressable
              key={key}
              onPress={() => setFilter(key)}
              style={{
                backgroundColor: active ? "#12332b" : "white",
                borderColor: active ? "#12332b" : "#dbe7e2",
                borderRadius: 20,
                borderWidth: 1,
                paddingHorizontal: 14,
                paddingVertical: 6,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Text style={{ color: active ? "white" : "#12332b", fontWeight: "700", fontSize: 13 }}>
                {label}
              </Text>
              {count !== undefined && count > 0 && (
                <View style={{ backgroundColor: active ? "white" : "#12332b", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 }}>
                  <Text style={{ color: active ? "#12332b" : "white", fontSize: 11, fontWeight: "800" }}>{count}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        contentContainerStyle={{ gap: 10, padding: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={isSyncing} onRefresh={syncQueue} tintColor="#12332b" />
        }
      >
        {counts.failed > 0 && (
          <Pressable
            onPress={syncQueue}
            style={{ backgroundColor: "#fff7ed", borderColor: "#fed7aa", borderRadius: 14, borderWidth: 1, padding: 14 }}
          >
            <Text style={{ color: "#9a3412", fontWeight: "800" }}>
              ⚠ {counts.failed} submission(s) failed — tap to retry upload
            </Text>
          </Pressable>
        )}

        {submissions.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 48, gap: 8 }}>
            <Text style={{ fontSize: 40 }}>📭</Text>
            <Text style={{ color: "#49635a", fontWeight: "700" }}>No submissions here</Text>
            <Text style={{ color: "#8aa79b", fontSize: 13 }}>
              {filter === "all" ? "Open an assignment to start collecting." : `No ${filter} submissions.`}
            </Text>
          </View>
        ) : (
          submissions.map((s) => {
            const { label, color, bg } = statusInfo(s);
            const isDraft = s.status === "Draft" || s.status === "ReturnedForCorrection";
            const entity = entityName(s.entityId);

            return (
              <Pressable
                key={s.localId}
                onPress={() => isDraft ? router.push(`/form-fill/${s.localId}`) : undefined}
                style={{
                  backgroundColor: "white",
                  borderColor: "#dbe7e2",
                  borderRadius: 16,
                  borderWidth: 1,
                  padding: 14,
                  gap: 6,
                  opacity: isDraft ? 1 : 0.85,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <Text style={{ color: "#12332b", fontWeight: "800", fontSize: 15, flex: 1, marginRight: 8 }}>
                    {formName(s.formId)}
                  </Text>
                  <View style={{ backgroundColor: bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
                    <Text style={{ color, fontWeight: "700", fontSize: 12 }}>{label}</Text>
                  </View>
                </View>

                {entity && <Text style={{ color: "#49635a", fontSize: 13 }}>👤 {entity}</Text>}

                {s.location?.latitude != null && (
                  <Text style={{ color: "#49635a", fontSize: 13 }}>
                    📍 {s.location.latitude.toFixed(5)}, {s.location.longitude?.toFixed(5)}
                  </Text>
                )}

                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: "#8aa79b", fontSize: 12 }}>
                    {s.responses.length} answer(s) · {formatDate(s.updatedAt)}
                  </Text>
                  {isDraft && (
                    <Text style={{ color: "#12332b", fontWeight: "700", fontSize: 12 }}>Continue →</Text>
                  )}
                </View>

                {s.status === "ReturnedForCorrection" && (
                  <View style={{ backgroundColor: "#fff7ed", borderRadius: 8, padding: 8 }}>
                    <Text style={{ color: "#9a3412", fontSize: 12, fontWeight: "600" }}>
                      Returned for correction — tap to review and resubmit.
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
