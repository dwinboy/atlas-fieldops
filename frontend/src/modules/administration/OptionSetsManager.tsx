"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2 } from "lucide-react";

import {
  createOptionItem,
  deleteOptionItem,
  getOptionSets,
  reorderOptionSet,
  resetOptionSet,
  updateOptionItem,
  type OptionItem,
  type OptionSet,
} from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyMini } from "@/components/ui/empty-mini";
import { Input } from "@/components/ui/input";
import { useWorkspaceStore } from "@/stores/workspace";

type OptionSetsManagerProps = {
  token: string | null;
  canManage: boolean;
};

function messageFrom(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const detail = String((error as { message: unknown }).message ?? "").trim();
    if (detail) return detail.length > 200 ? `${detail.slice(0, 200)}…` : detail;
  }
  return fallback;
}

export function OptionSetsManager({ token, canManage }: OptionSetsManagerProps) {
  const enabled = Boolean(token && token !== "preview-token");
  const queryClient = useQueryClient();
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [newValue, setNewValue] = useState("");

  const catalogQuery = useQuery({
    queryKey: ["reference", "option-sets", token],
    queryFn: () => getOptionSets(token ?? ""),
    enabled,
  });

  const sets = useMemo(() => catalogQuery.data?.sets ?? [], [catalogQuery.data]);
  const activeSet: OptionSet | undefined = useMemo(
    () => sets.find((set) => set.key === activeKey) ?? sets[0],
    [sets, activeKey],
  );

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["reference"] });
  }

  const addMutation = useMutation({
    mutationFn: () => createOptionItem(token ?? "", activeSet!.key, { value: newValue.trim() }),
    onSuccess: async () => {
      setNewValue("");
      await refresh();
      pushToast({ title: "Option added", tone: "success" });
    },
    onError: (error) => pushToast({ title: "Could not add option", description: messageFrom(error, "It may already exist."), tone: "danger" }),
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { item: OptionItem; patch: { label?: string; is_active?: boolean } }) =>
      updateOptionItem(token ?? "", vars.item.set_key, vars.item.id, vars.patch),
    onSuccess: refresh,
    onError: (error) => pushToast({ title: "Could not save option", description: messageFrom(error, "Try again."), tone: "danger" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (item: OptionItem) => deleteOptionItem(token ?? "", item.set_key, item.id),
    onSuccess: async () => {
      await refresh();
      pushToast({ title: "Option removed", tone: "success" });
    },
    onError: (error) => pushToast({ title: "Could not remove option", description: messageFrom(error, "Built-in options can only be deactivated."), tone: "danger" }),
  });

  const reorderMutation = useMutation({
    mutationFn: (ids: string[]) => reorderOptionSet(token ?? "", activeSet!.key, ids),
    onSuccess: refresh,
  });

  const resetMutation = useMutation({
    mutationFn: () => resetOptionSet(token ?? "", activeSet!.key),
    onSuccess: async () => {
      await refresh();
      pushToast({ title: "Reset to defaults", tone: "success" });
    },
    onError: (error) => pushToast({ title: "Could not reset", description: messageFrom(error, "Try again."), tone: "danger" }),
  });

  function move(item: OptionItem, direction: -1 | 1) {
    if (!activeSet) return;
    const ordered = [...activeSet.items].sort((a, b) => a.sort_order - b.sort_order);
    const index = ordered.findIndex((candidate) => candidate.id === item.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    reorderMutation.mutate(ordered.map((entry) => entry.id));
  }

  if (!enabled) {
    return (
      <EmptyMini label="Sign in to manage your organization's option sets." />
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">Option sets</h3>
        <p className="text-sm text-muted-foreground">
          Owner-managed dropdown vocabularies (project types, entity types, frequencies, and more). Built-in
          options can be renamed, reordered, or deactivated; add your own with <strong>Add option</strong>.
          Changes apply across the workspace.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[260px_1fr]">
        {/* Set list */}
        <div className="space-y-1 rounded-lg border border-border p-2">
          {sets.map((set) => {
            const selected = activeSet?.key === set.key;
            return (
              <button
                key={set.key}
                type="button"
                onClick={() => setActiveKey(set.key)}
                className={`flex w-full flex-col rounded-md px-3 py-2 text-left text-sm transition ${
                  selected ? "bg-primary/10 text-primary" : "hover:bg-muted"
                }`}
              >
                <span className="font-medium">{set.label}</span>
                <span className="text-xs text-muted-foreground">
                  {set.module} · {set.items.filter((item) => item.is_active).length} active
                </span>
              </button>
            );
          })}
          {!sets.length && !catalogQuery.isLoading ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">No option sets available.</p>
          ) : null}
        </div>

        {/* Item editor */}
        <div className="space-y-3 rounded-lg border border-border p-4">
          {activeSet ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">{activeSet.label}</h4>
                  <p className="text-xs text-muted-foreground">{activeSet.description}</p>
                </div>
                {canManage ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => resetMutation.mutate()}
                    disabled={resetMutation.isPending}
                  >
                    <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset to default
                  </Button>
                ) : null}
              </div>

              <ul className="divide-y divide-border rounded-md border border-border">
                {[...activeSet.items]
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((item, index, all) => (
                    <li key={item.id} className="flex items-center gap-2 px-3 py-2">
                      <div className="flex flex-col">
                        <button
                          type="button"
                          aria-label="Move up"
                          disabled={!canManage || index === 0 || reorderMutation.isPending}
                          onClick={() => move(item, -1)}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Move down"
                          disabled={!canManage || index === all.length - 1 || reorderMutation.isPending}
                          onClick={() => move(item, 1)}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <Input
                        defaultValue={item.label}
                        disabled={!canManage}
                        aria-label={`Label for ${item.value}`}
                        className={item.is_active ? "" : "opacity-50 line-through"}
                        onBlur={(event) => {
                          const label = event.target.value.trim();
                          if (label && label !== item.label) {
                            updateMutation.mutate({ item, patch: { label } });
                          }
                        }}
                      />

                      {item.is_system ? <Badge tone="neutral">Built-in</Badge> : <Badge tone="accent">Custom</Badge>}

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={!canManage || updateMutation.isPending}
                        onClick={() => updateMutation.mutate({ item, patch: { is_active: !item.is_active } })}
                      >
                        {item.is_active ? "Deactivate" : "Activate"}
                      </Button>

                      {!item.is_system ? (
                        <button
                          type="button"
                          aria-label={`Delete ${item.value}`}
                          disabled={!canManage || deleteMutation.isPending}
                          onClick={() => deleteMutation.mutate(item)}
                          className="text-muted-foreground hover:text-destructive disabled:opacity-30"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null}
                    </li>
                  ))}
              </ul>

              {canManage ? (
                <form
                  className="flex items-center gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (newValue.trim()) addMutation.mutate();
                  }}
                >
                  <Input
                    value={newValue}
                    onChange={(event) => setNewValue(event.target.value)}
                    placeholder="Add a new option…"
                    aria-label="New option value"
                  />
                  <Button type="submit" size="sm" disabled={!newValue.trim() || addMutation.isPending}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add option
                  </Button>
                </form>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {catalogQuery.isLoading ? "Loading option sets…" : "Select an option set to edit."}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
