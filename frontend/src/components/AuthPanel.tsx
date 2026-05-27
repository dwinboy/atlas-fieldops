"use client";

import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { DatabaseZap, Fingerprint, LogIn, ShieldCheck } from "lucide-react";
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
      <div className="flex items-center px-6 py-10">
        <motion.div
          className="mx-auto max-w-3xl"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24 }}
        >
          <Badge tone="accent" className="mb-8 gap-2">
            <ShieldCheck aria-hidden="true" size={14} />
            Secure enterprise workspace
          </Badge>
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
            Operational data collection, governed from one place.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
            Secure access to tenant collection workflows, field teams, validation queues, and live
            submission analytics.
          </p>
          <div className="mt-10 grid gap-3 text-sm sm:grid-cols-3">
            {[
              ["Tenant scoped", "Every action carries org context"],
              ["Audit ready", "Immutable security trail"],
              ["Offline aware", "Designed for field reliability"]
            ].map(([label, detail]) => (
              <div key={label} className="rounded-lg border bg-panel p-4 shadow-line">
                <p className="font-medium">{label}</p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p>
              </div>
            ))}
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
