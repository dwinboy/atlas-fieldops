import type { MobileAppState } from "@/state/mobileAppState";

export type HomeScreenModel = {
  userName: string;
  onlineLabel: string;
  lastSyncLabel: string;
  todaysAssignments: number;
  pendingDrafts: number;
  failedSyncItems: number;
  returnedSubmissions: number;
};

export function buildHomeScreenModel(state: MobileAppState): HomeScreenModel {
  return {
    userName: state.bootstrap?.user.fullName ?? "Field officer",
    onlineLabel: state.network.isOnline ? "Online" : "Offline",
    lastSyncLabel: state.bootstrap?.lastSync.lastSyncedAt ?? "Never synced",
    todaysAssignments: state.assignments.filter((assignment) => assignment.status === "Assigned" || assignment.status === "InProgress").length,
    pendingDrafts: state.drafts.filter((draft) => draft.status === "Draft" || draft.status === "ReadyToSubmit").length,
    failedSyncItems: state.syncQueue.filter((item) => item.status === "Failed").length,
    returnedSubmissions: state.drafts.filter((draft) => draft.status === "ReturnedForCorrection").length,
  };
}
