"use client";

import { createContext, createElement, useContext, useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

import { getOptionSet, getOptionSets, type OptionItem } from "@/lib/api";

export type OptionChoice = { value: string; label: string };

/**
 * Bundled defaults mirror the backend seed (app/core/option_sets.py). They are the
 * fallback when the reference-data API is unavailable, the session is a preview/no-token
 * context, or while the request is in flight — so dropdowns never come up empty and there
 * is no behavior change for an organization that has not customized anything.
 */
export const DEFAULT_OPTION_SETS: Record<string, string[]> = {
  "project.type": [
    "Agriculture",
    "Asset Management",
    "Audits",
    "Health",
    "Education",
    "Evaluation",
    "Government",
    "HR",
    "Humanitarian",
    "Inspections",
    "Inventory Management",
    "Livelihood",
    "Logistics",
    "Manufacturing",
    "Monitoring",
    "Protection",
    "Registration",
    "Research",
    "Retail",
    "Sales",
    "WASH",
    "Custom",
  ],
  "project.entity_type": [
    "Asset",
    "Audit Item",
    "Customer",
    "Employee",
    "Farmer",
    "Household",
    "Beneficiary",
    "Inspection Site",
    "Product",
    "Production Batch",
    "School",
    "Shipment",
    "Stock Item",
    "Facility",
    "Village",
    "Group",
    "Health Worker",
    "Custom Entity",
  ],
  "project.frequency": ["Monthly", "Quarterly", "Semi-annual", "Annual", "Seasonal", "Event-based"],
  "duplicate.field": [
    "External ID",
    "Code / SKU",
    "Phone",
    "National ID",
    "Household ID",
    "Name + Location",
    "Name + Village",
    "Name + Date of Birth",
    "Serial Number",
    "GPS",
  ],
  "submission.source": ["Field Submitted", "Mobile", "Web Entry", "Uploaded", "Imported"],
};

function defaultChoices(setKey: string): OptionChoice[] {
  return (DEFAULT_OPTION_SETS[setKey] ?? []).map((value) => ({ value, label: value }));
}

function isPreviewToken(token: string | null | undefined): boolean {
  return !token || token === "preview-token";
}

export type UseOptionSetResult = {
  options: OptionChoice[];
  values: string[];
  isLoading: boolean;
  isFallback: boolean;
};

/**
 * Returns a tenant's active options for a set, owner-managed and ordered, with the bundled
 * defaults as a resilient fallback. Drop-in replacement for the old hardcoded arrays.
 */
export function useOptionSet(setKey: string, token: string | null | undefined): UseOptionSetResult {
  const enabled = !isPreviewToken(token);
  const query = useQuery({
    queryKey: ["reference", "option-set", setKey, token],
    queryFn: () => getOptionSet(token as string, setKey),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const data = query.data;
  if (!data) {
    return { options: defaultChoices(setKey), values: DEFAULT_OPTION_SETS[setKey] ?? [], isLoading: enabled && query.isLoading, isFallback: true };
  }

  const active = data.items
    .filter((item: OptionItem) => item.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);
  const options = active.map((item) => ({ value: item.value, label: item.label }));
  return { options, values: options.map((o) => o.value), isLoading: false, isFallback: false };
}

/**
 * Resolves every registered option set once and shares the active choices through context,
 * so consumers deep in a tree (e.g. the project wizard) can read owner-managed options
 * without threading the auth token down. Falls back to bundled defaults per set.
 */
const OptionSetsContext = createContext<Record<string, OptionChoice[]> | null>(null);

export function OptionSetsProvider({ token, children }: { token: string | null | undefined; children: ReactNode }) {
  const enabled = !isPreviewToken(token);
  const query = useQuery({
    queryKey: ["reference", "option-sets", token],
    queryFn: () => getOptionSets(token as string),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const value = useMemo(() => {
    const map: Record<string, OptionChoice[]> = {};
    for (const set of query.data?.sets ?? []) {
      map[set.key] = set.items
        .filter((item) => item.is_active)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((item) => ({ value: item.value, label: item.label }));
    }
    return map;
  }, [query.data]);

  return createElement(OptionSetsContext.Provider, { value }, children);
}

/** Active choices for a set: owner-managed when a provider is present, else bundled defaults. */
export function useOptionChoices(setKey: string): OptionChoice[] {
  const context = useContext(OptionSetsContext);
  const fromContext = context?.[setKey];
  if (fromContext && fromContext.length) {
    return fromContext;
  }
  return defaultChoices(setKey);
}
