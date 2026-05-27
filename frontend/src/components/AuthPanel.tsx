"use client";

import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Activity, DatabaseZap, Fingerprint, LogIn, RadioTower, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { login } from "@/lib/api";
import { useWorkspaceStore } from "@/stores/workspace";

type AuthPanelProps = {
  onAuthenticated: (token: string) => void;
};

export function AuthPanel({ onAuthenticated }: AuthPanelProps) {
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("");
  const [organizationSlug, setOrganizationSlug] = useState("acme");

  const pushToast = useWorkspaceStore((state) => state.pushToast);

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (response) => {
      pushToast({ title: "Signed in", description: "Tenant workspace unlocked", tone: "success" });
      onAuthenticated(response.access_token);
    }
  });

  return (
    <section className="grid min-h-screen bg-background lg:grid-cols-[1fr_440px]">
      <div className="relative flex items-center overflow-hidden px-6 py-10">
        <div className="absolute inset-x-8 top-8 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent lg:block" />
        <motion.div
          className="mx-auto grid w-full max-w-4xl gap-10 xl:grid-cols-[1fr_320px] xl:items-end"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24 }}
        >
          <div>
            <Badge tone="accent" className="mb-8 gap-2">
              <ShieldCheck aria-hidden="true" size={14} />
              Atlas FieldOps
            </Badge>
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
              Govern field data from capture to approval.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
              A tenant-scoped operating layer for collection teams, validation queues, audit trails, and realtime submission flow.
            </p>
            <div className="mt-10 grid max-w-2xl grid-cols-3 border-y py-5 text-sm">
              {[
                ["128.4k", "accepted today"],
                ["96.8%", "validation accuracy"],
                ["182ms", "P95 API latency"]
              ].map(([value, label]) => (
                <div key={label} className="border-r px-4 first:pl-0 last:border-r-0">
                  <p className="text-xl font-semibold tracking-tight">{value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden rounded-lg border bg-panel p-4 shadow-line xl:block">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Live controls</p>
              <Badge tone="success" className="gap-1.5">
                <RadioTower aria-hidden="true" size={13} />
                Online
              </Badge>
            </div>
            <div className="mt-5 space-y-4">
              {[
                ["Tenant context", "Required", "100%"],
                ["Audit trail", "Streaming", "24 ms"],
                ["Offline sync", "Backlog", "812"]
              ].map(([label, status, value]) => (
                <div key={label} className="grid grid-cols-[1fr_auto] gap-3 border-t pt-4 first:border-t-0 first:pt-0">
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{status}</p>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              <Activity aria-hidden="true" size={14} />
              Policy engine healthy · RBAC enforced
            </div>
          </div>
        </motion.div>
      </div>

      <form
        className="flex items-center border-l bg-panel px-6 py-10 shadow-elevated"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate({ email, password, organization_slug: organizationSlug });
        }}
      >
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg border bg-primary/10 text-primary">
              <DatabaseZap aria-hidden="true" size={21} />
            </div>
            <Badge tone="success" className="gap-2">
              <Fingerprint aria-hidden="true" size={13} />
              RBAC
            </Badge>
          </div>
          <h2 className="text-xl font-semibold tracking-tight">Sign in</h2>
          <p className="mt-2 text-sm text-muted-foreground">Use a tenant account to continue.</p>

          <label className="mt-6 block text-sm font-medium" htmlFor="organization">
            Organization
          </label>
          <Input
            id="organization"
            className="mt-2 h-10"
            value={organizationSlug}
            onChange={(event) => setOrganizationSlug(event.target.value)}
            autoComplete="organization"
            required
          />

          <label className="mt-4 block text-sm font-medium" htmlFor="email">
            Email
          </label>
          <Input
            id="email"
            className="mt-2 h-10"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />

          <label className="mt-4 block text-sm font-medium" htmlFor="password">
            Password
          </label>
          <Input
            id="password"
            className="mt-2 h-10"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            minLength={12}
            required
          />

          {mutation.isError ? (
            <p className="mt-4 rounded-md border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
              Sign in failed. Check the organization, email, and password.
            </p>
          ) : null}

          <Button
            className="mt-6 w-full"
            disabled={mutation.isPending}
            type="submit"
            variant="primary"
          >
            <LogIn aria-hidden="true" />
            {mutation.isPending ? "Signing in" : "Sign in"}
          </Button>
          <Button
            className="mt-3 w-full"
            onClick={() => {
              pushToast({ title: "Preview mode", description: "Loaded demo workspace without backend credentials", tone: "neutral" });
              onAuthenticated("preview-token");
            }}
            type="button"
            variant="secondary"
          >
            Preview workspace
          </Button>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">
            Access is tenant-scoped and activity is recorded to the audit trail.
          </p>
        </div>
      </form>
    </section>
  );
}
