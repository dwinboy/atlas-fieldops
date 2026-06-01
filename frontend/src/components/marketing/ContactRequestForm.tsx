"use client";

import { CheckCircle2, Send } from "lucide-react";
import { useState } from "react";

type DemoRequest = {
  name: string;
  email: string;
  organization: string;
  role: string;
  priority: string;
};

const initialRequest: DemoRequest = {
  name: "",
  email: "",
  organization: "",
  role: "",
  priority: ""
};

export function ContactRequestForm() {
  const [request, setRequest] = useState<DemoRequest>(initialRequest);
  const [submittedRequest, setSubmittedRequest] = useState<DemoRequest | null>(null);

  function updateField(field: keyof DemoRequest, value: string): void {
    setRequest((current) => ({ ...current, [field]: value }));
  }

  function submitRequest(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setSubmittedRequest(request);
  }

  if (submittedRequest) {
    return (
      <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm" aria-live="polite">
        <div className="flex items-start gap-3">
          <CheckCircle2 aria-hidden="true" className="mt-1 text-[#0f766e]" size={22} />
          <div>
            <h2 className="text-xl font-semibold text-[#10201c]">Demo request prepared</h2>
            <p className="mt-2 text-sm leading-6 text-[#52615d]">
              Thanks, {submittedRequest.name || "there"}. Your request is ready for the Atlas FieldOps team to review.
            </p>
          </div>
        </div>
        <div className="mt-5 rounded-xl border border-black/10 bg-[#f7faf8] p-4 text-sm text-[#10201c]">
          <p className="font-semibold">Request summary</p>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-[0.16em] text-[#52615d]">Organization</dt>
              <dd className="mt-1">{submittedRequest.organization || "Not provided"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.16em] text-[#52615d]">Work email</dt>
              <dd className="mt-1">{submittedRequest.email || "Not provided"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase tracking-[0.16em] text-[#52615d]">Priority</dt>
              <dd className="mt-1">{submittedRequest.priority || "Not provided"}</dd>
            </div>
          </dl>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            className="h-11 rounded-md bg-[#0f766e] px-5 text-sm font-semibold text-white transition hover:bg-[#115e59]"
            onClick={() => setSubmittedRequest(null)}
            type="button"
          >
            Edit request
          </button>
          <a className="inline-flex h-11 items-center rounded-md border border-black/10 px-5 text-sm font-semibold text-[#10201c] transition hover:bg-black/[0.03]" href="mailto:hello@atlasfieldops.com">
            Email sales
          </a>
        </div>
      </section>
    );
  }

  return (
    <form className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm" onSubmit={submitRequest}>
      <div className="grid gap-4 md:grid-cols-2">
        {[
          ["name", "Full name"],
          ["email", "Work email"],
          ["organization", "Organization"],
          ["role", "Role"]
        ].map(([field, label]) => (
          <label className="text-sm font-medium text-[#10201c]" key={field}>
            {label}
            <input
              className="mt-2 h-11 w-full rounded-md border border-black/10 px-3 outline-none transition focus:ring-2 focus:ring-[#0f766e]/25"
              onChange={(event) => updateField(field as keyof DemoRequest, event.target.value)}
              placeholder={label}
              required={field === "name" || field === "email"}
              type={field === "email" ? "email" : "text"}
              value={request[field as keyof DemoRequest]}
            />
          </label>
        ))}
      </div>
      <label className="mt-4 block text-sm font-medium text-[#10201c]">
        What are you trying to improve?
        <textarea
          className="mt-2 min-h-32 w-full rounded-md border border-black/10 p-3 outline-none transition focus:ring-2 focus:ring-[#0f766e]/25"
          onChange={(event) => updateField("priority", event.target.value)}
          placeholder="Field data collection, beneficiary tracking, reporting, offline sync..."
          value={request.priority}
        />
      </label>
      <button className="mt-5 inline-flex h-11 items-center gap-2 rounded-md bg-[#0f766e] px-5 text-sm font-semibold text-white transition hover:bg-[#115e59]" type="submit">
        <Send aria-hidden="true" size={16} />
        Request demo
      </button>
    </form>
  );
}
