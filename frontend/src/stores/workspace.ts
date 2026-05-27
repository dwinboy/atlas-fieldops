"use client";

import { create } from "zustand";

export type ThemeMode = "light" | "dark";
export type WorkspaceView =
  | "dashboard"
  | "programs"
  | "beneficiaries"
  | "indicators"
  | "cases"
  | "map"
  | "organizations"
  | "officers"
  | "forms"
  | "submissions"
  | "analytics"
  | "workflows"
  | "connectivity";

type Toast = {
  id: string;
  title: string;
  description?: string;
  tone?: "neutral" | "success" | "warning" | "danger";
};

type WorkspaceState = {
  activeView: WorkspaceView;
  commandOpen: boolean;
  collapsedSidebar: boolean;
  theme: ThemeMode;
  toasts: Toast[];
  setActiveView: (view: WorkspaceView) => void;
  setCommandOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  toggleTheme: () => void;
  pushToast: (toast: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
};

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeView: "dashboard",
  commandOpen: false,
  collapsedSidebar: false,
  theme: "light",
  toasts: [],
  setActiveView: (activeView) => set({ activeView }),
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  toggleSidebar: () => set((state) => ({ collapsedSidebar: !state.collapsedSidebar })),
  toggleTheme: () => set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),
  pushToast: (toast) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        {
          id: `${Date.now()}-${state.toasts.length}`,
          ...toast
        }
      ].slice(-4)
    })),
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }))
}));
