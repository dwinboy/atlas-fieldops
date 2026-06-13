"use client";

import { CheckCircle2, Send } from "lucide-react";
import { useState } from "react";

import { createPublicLead, type PublicLeadCreate } from "@/lib/api";
import { SECTOR_TERMINOLOGY } from "@/lib/sectorTerminology";

type LeadFormState = Required<Omit<PublicLeadCreate, "metadata">> & {
  sector: string;
};

const sectorOptions = Object.values(SECTOR_TERMINOLOGY).map((sector) => ({
  id: sector.sectorId,
  name: sector.sectorName,
}));

const initialRequest: LeadFormState = {
  name: "",
  email: "",
  organization: "",
  country: "",
  phone: "",
  organization_size: "",
  interest_area: "",
  sector: "",
  source: "contact",
  message: "",
};

export function ContactRequestForm({
  source = "contact",
  title = "Request a demo",
}: {
  source?: string;
  title?: string;
}) {
  const [request, setRequest] = useState<LeadFormState>({ ...initialRequest, source });
  const [submittedRequest, setSubmittedRequest] = useState<LeadFormState | null>(null);
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "stored" | "prepared">("idle");

  function updateField(field: keyof LeadFormState, value: string): void {
    setRequest((current) => ({ ...current, [field]: value }));
  }

  async function submitRequest(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitState("submitting");
    try {
      const { sector, ...leadFields } = request;
      await createPublicLead({
        ...leadFields,
        metadata: {
          page_source: source,
          captured_in: "public_website",
          sector: sector || "unspecified",
        },
      });
      setSubmitState("stored");
    } catch {
      setSubmitState("prepared");
    }
    setSubmittedRequest(request);
  }

  if (submittedRequest) {
    return (
      <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm" aria-live="polite">
        <div className="flex items-start gap-3">
          <CheckCircle2 aria-hidden="true" className="mt-1 text-[#0d9488]" size={22} />
          <div>
            <h2 className="text-xl font-semibold text-[#0c1f1b]">
              {submitState === "stored" ? "Demo request received" : "Demo request prepared"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#5b6a65]">
              Thanks, {submittedRequest.name || "there"}.{" "}
              {submitState === "stored"
                ? "Your request is stored for the Atlas FieldOps team."
                : "Your request is ready. If this environment has no API URL configured, email sales directly."}
            </p>
          </div>
        </div>
        <div className="mt-5 rounded-xl border border-black/10 bg-[#fafaf8] p-4 text-sm text-[#0c1f1b]">
          <p className="font-semibold">Lead summary</p>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-[0.16em] text-[#5b6a65]">Organization</dt>
              <dd className="mt-1">{submittedRequest.organization || "Not provided"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.16em] text-[#5b6a65]">Country</dt>
              <dd className="mt-1">{submittedRequest.country || "Not provided"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.16em] text-[#5b6a65]">Work email</dt>
              <dd className="mt-1">{submittedRequest.email || "Not provided"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.16em] text-[#5b6a65]">Interest</dt>
              <dd className="mt-1">{submittedRequest.interest_area || "Not provided"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.16em] text-[#5b6a65]">Sector</dt>
              <dd className="mt-1">
                {submittedRequest.sector === "other"
                  ? "Other / multi-sector"
                  : sectorOptions.find((sector) => sector.id === submittedRequest.sector)?.name ||
                    "Not provided"}
              </dd>
            </div>
          </dl>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <a className="inline-flex h-11 items-center rounded-md bg-[#0d9488] px-5 text-sm font-semibold text-white transition hover:bg-[#0b7a70]" href="/demo">
            Explore the demo while you wait
          </a>
          <button
            className="h-11 rounded-md border border-black/10 px-5 text-sm font-semibold text-[#0c1f1b] transition hover:bg-black/[0.03]"
            onClick={() => {
              setSubmittedRequest(null);
              setSubmitState("idle");
            }}
            type="button"
          >
            Edit request
          </button>
          <a className="inline-flex h-11 items-center rounded-md border border-black/10 px-5 text-sm font-semibold text-[#0c1f1b] transition hover:bg-black/[0.03]" href="mailto:hello@atlasfieldops.com">
            Email sales
          </a>
        </div>
      </section>
    );
  }

  return (
    <form className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm" onSubmit={submitRequest}>
      <h2 className="text-xl font-semibold text-[#0c1f1b]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[#5b6a65]">
        Tell us about your organization, field teams, data collection workflow, and reporting needs.
      </p>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {[
          ["name", "Full name", "text"],
          ["email", "Work email", "email"],
          ["organization", "Organization", "text"],
          ["country", "Country", "text"],
          ["phone", "Phone", "tel"],
        ].map(([field, label, type]) => (
          <label className="text-sm font-medium text-[#0c1f1b]" key={field}>
            {label}
            <input
              className="mt-2 h-11 w-full rounded-md border border-black/10 px-3 outline-none transition focus:ring-2 focus:ring-[#0d9488]/25"
              onChange={(event) => updateField(field as keyof LeadFormState, event.target.value)}
              placeholder={label}
              required={field === "name" || field === "email"}
              type={type}
              value={request[field as keyof LeadFormState]}
            />
          </label>
        ))}
        <label className="text-sm font-medium text-[#0c1f1b]">
          Organization size
          <select
            className="mt-2 h-11 w-full rounded-md border border-black/10 bg-white px-3 outline-none transition focus:ring-2 focus:ring-[#0d9488]/25"
            onChange={(event) => updateField("organization_size", event.target.value)}
            value={request.organization_size}
          >
            <option value="">Select size</option>
            <option value="1-25">1-25 users</option>
            <option value="26-100">26-100 users</option>
            <option value="101-500">101-500 users</option>
            <option value="500+">500+ users</option>
          </select>
        </label>
        <label className="text-sm font-medium text-[#0c1f1b]">
          Primary sector
          <select
            className="mt-2 h-11 w-full rounded-md border border-black/10 bg-white px-3 outline-none transition focus:ring-2 focus:ring-[#0d9488]/25"
            onChange={(event) => updateField("sector", event.target.value)}
            value={request.sector}
          >
            <option value="">Select sector</option>
            {sectorOptions.map((sector) => (
              <option key={sector.id} value={sector.id}>{sector.name}</option>
            ))}
            <option value="other">Other / multi-sector</option>
          </select>
        </label>
        <label className="text-sm font-medium text-[#0c1f1b]">
          Interest area
          <select
            className="mt-2 h-11 w-full rounded-md border border-black/10 bg-white px-3 outline-none transition focus:ring-2 focus:ring-[#0d9488]/25"
            onChange={(event) => updateField("interest_area", event.target.value)}
            value={request.interest_area}
          >
            <option value="">Select interest</option>
            <option value="Monitoring and Evaluation">Monitoring and Evaluation</option>
            <option value="Offline Data Collection">Offline Data Collection</option>
            <option value="Survey Management">Survey Management</option>
            <option value="GIS Mapping">GIS Mapping</option>
            <option value="Indicator Tracking">Indicator Tracking</option>
            <option value="Donor Reporting">Donor Reporting</option>
            <option value="Data Quality">Data Quality</option>
            <option value="Enterprise Deployment">Enterprise Deployment</option>
          </select>
        </label>
        {request.sector && request.sector !== "other" ? (
          <p className="text-xs text-[#5b6a65] md:col-span-2">
            Your workspace will be prepared with the{" "}
            <span className="font-semibold text-[#0c1f1b]">
              {sectorOptions.find((sector) => sector.id === request.sector)?.name}
            </span>{" "}
            starter pack — sector terminology, forms, and indicators ready on day one.
          </p>
        ) : null}
      </div>
      <label className="mt-4 block text-sm font-medium text-[#0c1f1b]">
        What are you trying to improve?
        <textarea
          className="mt-2 min-h-32 w-full rounded-md border border-black/10 p-3 outline-none transition focus:ring-2 focus:ring-[#0d9488]/25"
          onChange={(event) => updateField("message", event.target.value)}
          placeholder="Field data collection, entity tracking, reporting, offline sync..."
          value={request.message}
        />
      </label>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          className="inline-flex h-11 items-center gap-2 rounded-md bg-[#0d9488] px-5 text-sm font-semibold text-white transition hover:bg-[#0b7a70] disabled:opacity-60"
          disabled={submitState === "submitting"}
          type="submit"
        >
          <Send aria-hidden="true" size={16} />
          {submitState === "submitting" ? "Sending..." : "Submit request"}
        </button>
        <p className="text-xs text-[#5b6a65]">We typically respond within 1 business day.</p>
      </div>
    </form>
  );
}
