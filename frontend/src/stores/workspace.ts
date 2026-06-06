"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ProjectListItemRead } from "@/lib/api";
import type { FieldAssignment } from "@/modules/field-operations/data";
import type { SubmissionRecord } from "@/modules/submissions/data";

export type ThemeMode = "light" | "dark";
export type WorkspaceView =
  | "platform"
  | "dashboard"
  | "ecosystem"
  | "enterprise"
  | "governance"
  | "workforce"
  | "data"
  | "dataQuality"
  | "programs"
  | "surveys"
  | "beneficiaries"
  | "indicators"
  | "cases"
  | "map"
  | "organizations"
  | "officers"
  | "forms"
  | "submissions"
  | "templates"
  | "analytics"
  | "workflows"
  | "connectivity"
  | "administration"
  | "help";

type Toast = {
  id: string;
  title: string;
  description?: string;
  tone?: "neutral" | "success" | "warning" | "danger";
};

export type LocalWorkspaceForm = {
  active_assignments: number;
  created_by: string;
  description?: string | null;
  form_type: string;
  has_quality_issues: boolean;
  id: string;
  owner: string;
  pending_approval: boolean;
  project_id?: string | null;
  project_name: string;
  quality_score: number;
  questions: number;
  recently_updated: boolean;
  sections: number;
  slug: string;
  status: string;
  survey_name: string;
  total_submissions: number;
  updated_at: string;
  version: number;
  name: string;
};

type WorkspaceState = {
  activeView: WorkspaceView;
  commandOpen: boolean;
  collapsedSidebar: boolean;
  lastActionResult: string;
  localAssignments: FieldAssignment[];
  localForms: LocalWorkspaceForm[];
  localProjects: ProjectListItemRead[];
  localSubmissions: SubmissionRecord[];
  pendingTemplateId: string | null;
  theme: ThemeMode;
  toasts: Toast[];
  upsertLocalAssignment: (assignment: FieldAssignment) => void;
  upsertLocalForm: (form: LocalWorkspaceForm) => void;
  upsertLocalProject: (project: ProjectListItemRead) => void;
  upsertLocalSubmission: (submission: SubmissionRecord) => void;
  setActiveView: (view: WorkspaceView) => void;
  setCommandOpen: (open: boolean) => void;
  setLastActionResult: (result: string) => void;
  setPendingTemplateId: (templateId: string | null) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  toggleTheme: () => void;
  pushToast: (toast: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
};

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      activeView: "dashboard",
      commandOpen: false,
      collapsedSidebar: false,
      lastActionResult: "",
      localAssignments: [],
      localForms: [],
      localProjects: [],
      localSubmissions: [],
      pendingTemplateId: null,
      theme: "light",
      toasts: [],
      upsertLocalAssignment: (assignment) =>
        set((state) => ({
          localAssignments: [
            assignment,
            ...state.localAssignments.filter(
              (candidate) => candidate.id !== assignment.id,
            ),
          ],
        })),
      upsertLocalForm: (form) =>
        set((state) => ({
          localForms: [
            form,
            ...state.localForms.filter((candidate) => candidate.id !== form.id),
          ],
        })),
      upsertLocalProject: (project) =>
        set((state) => ({
          localProjects: [
            project,
            ...state.localProjects.filter(
              (candidate) => candidate.id !== project.id,
            ),
          ],
        })),
      upsertLocalSubmission: (submission) =>
        set((state) => ({
          localSubmissions: [
            submission,
            ...state.localSubmissions.filter(
              (candidate) => candidate.id !== submission.id,
            ),
          ],
        })),
      setActiveView: (activeView) => set({ activeView }),
      setCommandOpen: (commandOpen) => set({ commandOpen }),
      setLastActionResult: (lastActionResult) => set({ lastActionResult }),
      setPendingTemplateId: (pendingTemplateId) => set({ pendingTemplateId }),
      setSidebarCollapsed: (collapsedSidebar) => set({ collapsedSidebar }),
      toggleSidebar: () =>
        set((state) => ({ collapsedSidebar: !state.collapsedSidebar })),
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),
      pushToast: (toast) =>
        set((state) => ({
          toasts: [
            ...state.toasts,
            {
              id: `${Date.now()}-${state.toasts.length}`,
              ...toast,
            },
          ].slice(-4),
        })),
      dismissToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((toast) => toast.id !== id),
        })),
    }),
    {
      name: "atlas-fieldops-workspace-preview",
      partialize: (state) => ({
        collapsedSidebar: state.collapsedSidebar,
        localAssignments: state.localAssignments,
        localForms: state.localForms,
        localProjects: state.localProjects,
        localSubmissions: state.localSubmissions,
        theme: state.theme,
      }),
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
