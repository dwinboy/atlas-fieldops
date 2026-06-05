"use client";

import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Activity,
  DatabaseZap,
  Eye,
  EyeOff,
  Fingerprint,
  KeyRound,
  LogIn,
  RadioTower,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ApiError, login } from "@/lib/api";
import { useWorkspaceStore } from "@/stores/workspace";

type AuthPanelProps = {
  onAuthenticated: (token: string) => void;
};

export function AuthPanel({ onAuthenticated }: AuthPanelProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationSlug, setOrganizationSlug] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const demoLoginEnabled = process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === "true";

  const pushToast = useWorkspaceStore((state) => state.pushToast);

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (response) => {
      pushToast({
        title: "Signed in",
        description: "Workspace ready",
        tone: "success",
      });
      onAuthenticated(response.access_token);
    },
  });

  const signInErrorMessage =
    mutation.error instanceof ApiError && mutation.error.status === 422
      ? "Check that the organization slug is correct and the email address uses a valid business email format."
      : "Sign in failed. Check the organization slug, email, password, and that the account is active in that organization.";

  function useDemoCredentials(): void {
    setOrganizationSlug("atlas-demo");
    setEmail("superadmin@example.com");
    setPassword("ChangeMe12345!");
    pushToast({
      title: "Demo credentials filled",
      description: "Local development sign-in fields are ready.",
      tone: "success",
    });
  }

  return (
    <section className="min-h-screen bg-background lg:grid lg:grid-cols-[1fr_440px]">
      <div className="relative hidden items-center overflow-hidden bg-[#022f32] px-6 py-10 lg:flex">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url("/login-field-monitoring.webp")' }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(1,22,24,0.88)_0%,rgba(2,47,50,0.72)_42%,rgba(2,47,50,0.4)_100%)]" />
        <div className="absolute inset-x-8 top-8 hidden h-px bg-gradient-to-r from-transparent via-white/20 to-transparent lg:block" />
        <motion.div
          className="relative z-10 mx-auto grid w-full max-w-4xl gap-10 xl:grid-cols-[1fr_320px] xl:items-end"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24 }}
        >
          <div>
            <Badge tone="accent" className="mb-8 gap-2 border-white/15 bg-white/12 !text-white shadow-line">
              <ShieldCheck aria-hidden="true" size={14} />
              Atlas FieldOps
            </Badge>
            <h1 className="text-balance text-4xl font-semibold tracking-tight !text-white md:text-5xl">
              Field data your team can trust.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 !text-white">
              Build forms, guide field officers, review submissions, and keep
              work moving even when connectivity is unreliable.
            </p>
            <div className="mt-10 grid max-w-2xl grid-cols-3 border-y border-white/18 py-5 text-sm text-white">
              {[
                ["128.4k", "saved today"],
                ["96.8%", "clean submissions"],
                ["812", "waiting to sync"],
              ].map(([value, label]) => (
                <div
                  key={label}
                  className="border-r border-white/16 px-4 first:pl-0 last:border-r-0"
                >
                  <p className="text-xl font-semibold tracking-tight">
                    {value}
                  </p>
                  <p className="mt-1 text-xs text-white/62">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden rounded-2xl border border-white/14 bg-white/10 p-5 text-white shadow-elevated backdrop-blur-xl xl:block">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/62">
                Today’s status
              </p>
              <Badge tone="success" className="gap-1.5 border-white/15 bg-white/12 text-white">
                <RadioTower aria-hidden="true" size={13} />
                Online
              </Badge>
            </div>
            <div className="mt-5 space-y-4">
              {[
                ["Organization", "Ready", "100%"],
                ["Review history", "Recording", "Live"],
                ["Offline sync", "Waiting", "812"],
              ].map(([label, status, value]) => (
                <div
                  key={label}
                  className="grid grid-cols-[1fr_auto] gap-3 border-t border-white/12 pt-4 first:border-t-0 first:pt-0"
                >
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="mt-1 text-xs text-white/62">
                      {status}
                    </p>
                  </div>
                  <p className="font-mono text-xs text-white/62">
                    {value}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-2 rounded-md border border-white/12 bg-white/10 px-3 py-2 text-xs text-white/72">
              <Activity aria-hidden="true" size={14} />
              Access rules and review history are active
            </div>
          </div>
        </motion.div>
      </div>

      <form
        className="flex min-h-screen items-start bg-panel/95 px-5 py-8 shadow-elevated backdrop-blur sm:items-center sm:px-6 sm:py-10 lg:min-h-0 lg:border-l"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate({
            email,
            password,
            organization_slug: organizationSlug,
          });
        }}
      >
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border bg-primary/10 text-primary shadow-sm">
              <DatabaseZap aria-hidden="true" size={21} />
            </div>
            <Badge tone="success" className="gap-2">
              <Fingerprint aria-hidden="true" size={13} />
              Secure access
            </Badge>
          </div>
          <h2 className="text-xl font-semibold tracking-tight">Sign in</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Use your organization slug, work email, and password to continue.
          </p>
          {demoLoginEnabled ? (
            <button
              className="mt-4 flex w-full items-start gap-3 rounded-xl border bg-background/80 p-3 text-left transition hover:border-primary/30 hover:bg-primary/5"
              onClick={useDemoCredentials}
              type="button"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-primary/10 text-primary">
                <KeyRound aria-hidden="true" size={16} />
              </span>
              <span>
                <span className="block text-sm font-semibold">
                  Use local demo credentials
                </span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  Fills the demo slug, admin email, and temporary password for
                  local development.
                </span>
              </span>
            </button>
          ) : null}

          <label
            className="mt-6 block text-sm font-medium"
            htmlFor="organization"
          >
            Organization login slug
          </label>
          <Input
            id="organization"
            className="mt-2 h-10"
            value={organizationSlug}
            onChange={(event) => setOrganizationSlug(event.target.value)}
            autoComplete="organization"
            required
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Enter the slug created for your organization, for example{" "}
            <span className="font-mono text-foreground">acme-health</span>.
          </p>

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
          <div className="relative mt-2">
            <Input
              id="password"
              className="h-10 pr-10"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              minLength={12}
              required
            />
            <button
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => setShowPassword((value) => !value)}
              type="button"
            >
              {showPassword ? (
                <EyeOff aria-hidden="true" size={15} />
              ) : (
                <Eye aria-hidden="true" size={15} />
              )}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Use the password provided by your administrator. Temporary passwords
            should be changed after first sign-in.
          </p>

          {mutation.isError ? (
            <p
              className="mt-4 rounded-md border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger"
              role="alert"
            >
              {signInErrorMessage}
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
              pushToast({
                title: "Preview mode",
                description:
                  "Loaded demo workspace without backend credentials",
                tone: "neutral",
              });
              onAuthenticated("preview-token");
            }}
            type="button"
            variant="secondary"
          >
            Preview workspace
          </Button>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">
            Access is limited to your organization, and important actions are
            recorded for review.
          </p>
        </div>
      </form>
    </section>
  );
}
