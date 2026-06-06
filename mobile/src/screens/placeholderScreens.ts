import { buildAssignmentList } from "@/assignments/assignmentModels";
import type { MobileAppState } from "@/state/mobileAppState";
import { buildHomeScreenModel } from "@/screens/homeScreenModel";

export type PlaceholderScreen = {
  title: string;
  summary: string;
  primaryMetric: string;
  secondaryMetric: string;
};

export function homeScreen(state: MobileAppState): PlaceholderScreen {
  const model = buildHomeScreenModel(state);
  return {
    title: `Welcome, ${model.userName}`,
    summary: `${model.onlineLabel}. Last sync: ${model.lastSyncLabel}`,
    primaryMetric: `${model.todaysAssignments} active assignments`,
    secondaryMetric: `${model.pendingDrafts} pending drafts, ${model.failedSyncItems} failed sync items`,
  };
}

export function assignmentsScreen(state: MobileAppState): PlaceholderScreen {
  const assignments = buildAssignmentList(state.assignments);
  return {
    title: "Assignments",
    summary: "Assigned work from the web Field Operations module.",
    primaryMetric: `${assignments.length} assignments`,
    secondaryMetric: assignments[0]?.progressLabel ?? "No assignments downloaded yet",
  };
}

export function formsScreen(state: MobileAppState): PlaceholderScreen {
  return {
    title: "Forms",
    summary: "Published mobile-ready form versions downloaded from the web platform.",
    primaryMetric: `${state.forms.length} forms`,
    secondaryMetric: "Forms are read-only on mobile",
  };
}

export function submissionsScreen(state: MobileAppState): PlaceholderScreen {
  return {
    title: "Submissions",
    summary: "Drafts, queued submissions, and returned corrections stay available offline.",
    primaryMetric: `${state.drafts.length} local drafts`,
    secondaryMetric: `${state.drafts.filter((draft) => draft.status === "ReturnedForCorrection").length} returned for correction`,
  };
}

export function syncScreen(state: MobileAppState): PlaceholderScreen {
  return {
    title: "Sync Center",
    summary: "Queued field actions are retried safely when the device is online.",
    primaryMetric: `${state.syncQueue.length} queue items`,
    secondaryMetric: `${state.syncQueue.filter((item) => item.status === "Failed").length} failed`,
  };
}

export function settingsScreen(): PlaceholderScreen {
  return {
    title: "Settings",
    summary: "Future controls: Wi-Fi only sync, clear synced data, device info, PIN lock, language, and help.",
    primaryMetric: "Security ready",
    secondaryMetric: "Device registration placeholder enabled",
  };
}
