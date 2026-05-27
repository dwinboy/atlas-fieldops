"use client";

import { useMutation } from "@tanstack/react-query";
import { LogIn, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/Button";
import { login } from "@/lib/api";

type AuthPanelProps = {
  onAuthenticated: (token: string) => void;
};

export function AuthPanel({ onAuthenticated }: AuthPanelProps) {
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("");
  const [organizationSlug, setOrganizationSlug] = useState("acme");

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (response) => onAuthenticated(response.access_token)
  });

  return (
    <section className="grid min-h-screen bg-slate-50 lg:grid-cols-[1fr_480px]">
      <div className="flex items-center px-6 py-10">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 inline-flex h-12 w-12 items-center justify-center rounded border border-teal-200 bg-teal-50 text-teal-800">
            <ShieldCheck aria-hidden="true" size={24} />
          </div>
          <h1 className="text-3xl font-semibold text-slate-950">Enterprise data operations</h1>
          <p className="mt-3 max-w-xl text-base leading-7 text-slate-600">
            Secure access to tenant collection workflows, field teams, validation queues, and live
            submission analytics.
          </p>
          <div className="mt-8 grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
            {["Tenant scoped", "Audit ready", "Offline aware"].map((label) => (
              <div key={label} className="rounded border border-slate-200 bg-white p-4">
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      <form
        className="flex items-center border-l border-slate-200 bg-white px-6 py-10"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate({ email, password, organization_slug: organizationSlug });
        }}
      >
        <div className="mx-auto w-full max-w-sm">
          <h2 className="text-xl font-semibold text-slate-950">Sign in</h2>
          <p className="mt-2 text-sm text-slate-600">Use a tenant account to continue.</p>

          <label className="mt-6 block text-sm font-medium text-slate-700" htmlFor="organization">
            Organization
          </label>
          <input
            id="organization"
            className="mt-2 h-11 w-full rounded border border-slate-300 px-3 text-sm"
            value={organizationSlug}
            onChange={(event) => setOrganizationSlug(event.target.value)}
            autoComplete="organization"
            required
          />

          <label className="mt-4 block text-sm font-medium text-slate-700" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className="mt-2 h-11 w-full rounded border border-slate-300 px-3 text-sm"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />

          <label className="mt-4 block text-sm font-medium text-slate-700" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            className="mt-2 h-11 w-full rounded border border-slate-300 px-3 text-sm"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            minLength={12}
            required
          />

          {mutation.isError ? (
            <p className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
              Sign in failed. Check the organization, email, and password.
            </p>
          ) : null}

          <Button
            className="mt-6 w-full"
            disabled={mutation.isPending}
            icon={<LogIn aria-hidden="true" size={18} />}
            type="submit"
            variant="primary"
          >
            {mutation.isPending ? "Signing in" : "Sign in"}
          </Button>
        </div>
      </form>
    </section>
  );
}

