"use client";

import { useMemo, useState } from "react";
import {
  Camera,
  CheckCircle2,
  FileSignature,
  MapPin,
  RadioTower,
  Save,
  Send,
  ShieldCheck,
  WifiOff,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SubmissionRecord } from "@/modules/submissions/data";
import { useWorkspaceStore } from "@/stores/workspace";

type PublicCollectionFormProps = {
  slug: string;
};

const collectionSteps = [
  "Identify the respondent",
  "Capture location and evidence",
  "Review answers",
  "Submit or save offline",
];

const evidenceActions = [
  {
    key: "gps",
    icon: MapPin,
    title: "Capture GPS",
    text: "Attach current coordinates to this response.",
    doneText: "GPS captured",
  },
  {
    key: "photo",
    icon: Camera,
    title: "Add photo",
    text: "Upload field evidence or inspection proof.",
    doneText: "Photo attached",
  },
  {
    key: "consent",
    icon: FileSignature,
    title: "Capture consent",
    text: "Record respondent acknowledgement.",
    doneText: "Consent proof added",
  },
] as const;

type EvidenceKey = (typeof evidenceActions)[number]["key"];

export function PublicCollectionForm({ slug }: PublicCollectionFormProps) {
  const upsertLocalSubmission = useWorkspaceStore(
    (state) => state.upsertLocalSubmission,
  );
  const [savedOffline, setSavedOffline] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [consent, setConsent] = useState(false);
  const [respondentName, setRespondentName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [communityName, setCommunityName] = useState("");
  const [collectionResult, setCollectionResult] = useState("");
  const [responseReference, setResponseReference] = useState(
    () =>
      `AF-${slug.slice(0, 8).toUpperCase()}-${Date.now().toString().slice(-5)}`,
  );
  const [evidence, setEvidence] = useState<Record<EvidenceKey, boolean>>({
    gps: false,
    photo: false,
    consent: false,
  });

  const formTitle = useMemo(
    () =>
      slug
        .split("-")
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ") || "Public Collection Form",
    [slug],
  );
  const evidenceCount = Object.values(evidence).filter(Boolean).length;
  const hasRespondentDetails = Boolean(
    respondentName.trim() && communityName.trim(),
  );
  const readyToSubmit = hasRespondentDetails && consent;
  const completionItems = [
    {
      label: "Respondent details",
      complete: hasRespondentDetails,
      guidance: "Enter the respondent name and community or site name.",
    },
    {
      label: "Evidence",
      complete: evidenceCount > 0,
      guidance:
        "Add GPS, photo, or consent proof when required by the project.",
    },
    {
      label: "Consent",
      complete: consent,
      guidance: "Confirm that the respondent agreed to data collection.",
    },
    {
      label: "Review",
      complete: readyToSubmit,
      guidance: "Check all details before sending the response.",
    },
  ];
  const completionPercent = Math.round(
    (completionItems.filter((item) => item.complete).length /
      completionItems.length) *
      100,
  );
  const nextMissingItem = completionItems.find((item) => !item.complete);

  function createReviewSubmission(): SubmissionRecord {
    const submittedAt = new Date().toISOString();
    const slaDueAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const hasGps = evidence.gps;
    const hasMediaEvidence = evidence.photo || evidence.consent;
    const qualityFlags: SubmissionRecord["quality_flags"] = [];

    if (!hasGps) {
      qualityFlags.push({
        check: "GPS Validation",
        id: `${responseReference}-gps`,
        message:
          "No GPS evidence was captured from the public collection link.",
        severity: "Medium",
        status: "open",
      });
    }

    if (!hasMediaEvidence) {
      qualityFlags.push({
        check: "Evidence Review",
        id: `${responseReference}-evidence`,
        message: "No photo or consent evidence was attached.",
        severity: "Low",
        status: "open",
      });
    }

    return {
      id: `public-${responseReference.toLowerCase()}`,
      accuracy: hasGps ? 8.5 : null,
      archived_at: null,
      attachments: [
        ...(evidence.photo
          ? [
              {
                file_name: "public_collection_photo.jpg",
                file_type: "Image" as const,
                id: `${responseReference}-photo`,
                size_label: "Preview evidence",
                uploaded_at: submittedAt,
              },
            ]
          : []),
        ...(evidence.consent
          ? [
              {
                file_name: "respondent_consent.txt",
                file_type: "Signature" as const,
                id: `${responseReference}-consent`,
                size_label: "Consent captured",
                uploaded_at: submittedAt,
              },
            ]
          : []),
      ],
      audit_events: [
        {
          action: "Submission Created",
          actor: "Public collection link",
          created_at: submittedAt,
          new_value: "draft",
        },
        {
          action: "Submission Submitted",
          actor: "Public collection link",
          created_at: submittedAt,
          new_value: "submitted",
          reason: "Submitted from controlled public web form.",
        },
      ],
      captured_at: submittedAt,
      client_submission_id: responseReference,
      duplicate_risk: "none",
      field_officer_id: "Public web collector",
      form_id: slug,
      form_name: formTitle,
      form_version: 1,
      gps_status: hasGps ? "valid" : "missing",
      history: [
        {
          action: "Created",
          actor: "Public collection link",
          created_at: submittedAt,
        },
        {
          action: "Submitted",
          actor: "Public collection link",
          comment: "Submitted from web collection link.",
          created_at: submittedAt,
        },
      ],
      latitude: hasGps ? 4.0511 : 0,
      location_name: communityName,
      longitude: hasGps ? 9.7679 : 0,
      offline_created: savedOffline,
      payload_json: {
        community_name: communityName,
        consent_confirmed: consent,
        evidence_count: evidenceCount,
        phone_number: phoneNumber,
        respondent_name: respondentName,
      },
      project_id: "public-collection",
      project_name: "Public Collection Link",
      quality_flags: qualityFlags,
      quality_score: qualityFlags.length ? 82 : 96,
      review_stage: "Pending Review",
      reviewer: "Grace M.",
      server_sequence: 1,
      sla_due_at: slaDueAt,
      status: "submitted",
      submitted_at: submittedAt,
      supervisor: "Grace M.",
      survey_id: "public-service-intake",
      sync_received_at: submittedAt,
      workflow: [
        {
          action_date: submittedAt,
          reviewer: "System",
          sla_status: "On Time",
          stage: "Submitted",
        },
        {
          reviewer: "Grace M.",
          sla_status: "On Time",
          stage: "Pending Review",
        },
      ],
    };
  }

  function resetResponse(): void {
    setSavedOffline(false);
    setSubmitted(false);
    setConsent(false);
    setRespondentName("");
    setPhoneNumber("");
    setCommunityName("");
    setCollectionResult("");
    setResponseReference(
      `AF-${slug.slice(0, 8).toUpperCase()}-${Date.now().toString().slice(-5)}`,
    );
    setEvidence({ gps: false, photo: false, consent: false });
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-background px-4 py-8 text-foreground">
        <section className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border bg-success/10 text-success shadow-sm">
            <CheckCircle2 aria-hidden="true" size={28} />
          </span>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight">
            Submission received
          </h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            Your answers were submitted for review. A supervisor can now
            validate the record, request corrections, or approve it for
            reporting.
          </p>
          <div className="mt-5 w-full rounded-2xl border bg-panel p-4 text-left shadow-line">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Submission summary
            </p>
            <dl className="mt-3 grid gap-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Reference</dt>
                <dd className="font-mono font-medium">{responseReference}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Respondent</dt>
                <dd className="font-medium">{respondentName}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Location</dt>
                <dd className="font-medium">{communityName}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Evidence</dt>
                <dd className="font-medium">
                  {evidenceCount} item{evidenceCount === 1 ? "" : "s"}
                </dd>
              </div>
            </dl>
          </div>
          <Button
            className="mt-6"
            onClick={resetResponse}
            type="button"
            variant="secondary"
          >
            Submit another response
          </Button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-panel/90 px-4 py-4 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border bg-primary/10 text-sm font-semibold text-primary">
              AF
            </span>
            <div>
              <p className="text-sm font-semibold">Atlas FieldOps</p>
              <p className="text-xs text-muted-foreground">
                Public collection link
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="success" className="gap-1.5">
              <RadioTower aria-hidden="true" size={13} />
              Web form
            </Badge>
            <Badge tone="accent" className="gap-1.5">
              <WifiOff aria-hidden="true" size={13} />
              Offline save available
            </Badge>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-5 px-4 py-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-4">
          <section className="rounded-2xl border bg-panel p-4 shadow-line">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Collection progress
            </p>
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">
                  {completionPercent}% complete
                </span>
                <span className="text-muted-foreground">
                  {readyToSubmit ? "Ready to submit" : "In progress"}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {collectionSteps.map((step, index) => {
                const complete = completionItems[index]?.complete ?? false;
                return (
                  <div className="flex gap-3" key={step}>
                    <span
                      className={
                        complete
                          ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-success/25 bg-success/10 text-success"
                          : "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-background text-xs font-semibold text-muted-foreground"
                      }
                    >
                      {complete ? (
                        <CheckCircle2 aria-hidden="true" size={14} />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <div>
                      <p className="pt-0.5 text-sm font-medium leading-5">
                        {step}
                      </p>
                      <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                        {completionItems[index]?.guidance}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border bg-panel p-4 shadow-line">
            <h2 className="text-sm font-semibold">Before submitting</h2>
            <div className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
              <p>Confirm the respondent gave consent.</p>
              <p>Check spelling, phone number, and location before sending.</p>
              <p>If internet is weak, save offline and submit later.</p>
            </div>
          </section>
        </aside>

        <form
          className="rounded-2xl border bg-panel p-4 shadow-line md:p-6"
          onSubmit={(event) => {
            event.preventDefault();
            setCollectionResult(
              `${respondentName} from ${communityName} is ready for review with ${evidenceCount} evidence item${evidenceCount === 1 ? "" : "s"}.`,
            );
            upsertLocalSubmission(createReviewSubmission());
            setSubmitted(true);
          }}
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Active form
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">
                {formTitle}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Complete each required field. The form can be submitted
                immediately or saved offline when connectivity is unreliable.
              </p>
            </div>
            <Badge tone={savedOffline ? "warning" : "success"}>
              {savedOffline ? "Saved offline" : "Ready"}
            </Badge>
          </div>

          <div className="mt-6 grid gap-5">
            <section
              className={
                readyToSubmit
                  ? "rounded-xl border border-success/30 bg-success/10 p-4"
                  : "rounded-xl border border-warning/30 bg-warning/10 p-4"
              }
              aria-live="polite"
            >
              <div className="flex items-start gap-3">
                {readyToSubmit ? (
                  <CheckCircle2
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-success"
                    size={18}
                  />
                ) : (
                  <ShieldCheck
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-warning"
                    size={18}
                  />
                )}
                <div>
                  <h2 className="text-sm font-semibold">
                    {readyToSubmit
                      ? "Ready for submission"
                      : "Complete the required details"}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {readyToSubmit
                      ? `${respondentName} from ${communityName} can now be submitted for supervisor review.`
                      : nextMissingItem
                        ? `${nextMissingItem.label}: ${nextMissingItem.guidance}`
                        : "Review the response before sending."}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-xl border bg-background p-4">
              <h2 className="text-sm font-semibold">Respondent details</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="text-sm font-medium">
                  Full name <span className="text-danger">*</span>
                  <Input
                    className="mt-2"
                    onChange={(event) => setRespondentName(event.target.value)}
                    required
                    placeholder="Enter respondent name"
                    value={respondentName}
                  />
                </label>
                <label className="text-sm font-medium">
                  Phone number
                  <Input
                    className="mt-2"
                    onChange={(event) => setPhoneNumber(event.target.value)}
                    placeholder="+237 600 000 000"
                    value={phoneNumber}
                  />
                </label>
                <label className="text-sm font-medium md:col-span-2">
                  Community or location name{" "}
                  <span className="text-danger">*</span>
                  <Input
                    className="mt-2"
                    onChange={(event) => setCommunityName(event.target.value)}
                    required
                    placeholder="Village, school, facility, farm, or site name"
                    value={communityName}
                  />
                </label>
              </div>
            </section>

            <section className="rounded-xl border bg-background p-4">
              <h2 className="text-sm font-semibold">Location and evidence</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {evidenceActions.map((action) => {
                  const Icon = action.icon;
                  const captured = evidence[action.key];
                  return (
                    <button
                      className="rounded-xl border bg-panel p-4 text-left transition hover:border-primary/30 hover:bg-primary/5"
                      key={action.key}
                      onClick={() => {
                        setEvidence((current) => ({
                          ...current,
                          [action.key]: true,
                        }));
                        setSavedOffline(false);
                      }}
                      type="button"
                    >
                      <span className="flex items-start justify-between gap-3">
                        <Icon
                          aria-hidden="true"
                          className="text-primary"
                          size={20}
                        />
                        {captured ? <Badge tone="success">Done</Badge> : null}
                      </span>
                      <span className="mt-3 block text-sm font-semibold">
                        {captured ? action.doneText : action.title}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                        {action.text}
                      </span>
                    </button>
                  );
                })}
              </div>
              {Object.values(evidence).some(Boolean) ? (
                <p className="mt-3 rounded-lg border border-success/25 bg-success/10 px-3 py-2 text-xs leading-5 text-success">
                  Evidence is staged with this response. Review the respondent
                  details before submitting.
                </p>
              ) : null}
            </section>

            <section className="rounded-xl border bg-background p-4">
              <label className="flex gap-3 text-sm leading-6">
                <input
                  className="mt-1 h-4 w-4"
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                  required
                  type="checkbox"
                />
                <span>
                  The respondent gave consent for this information to be
                  collected and reviewed by the authorized project team.
                </span>
              </label>
            </section>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              onClick={() => {
                setSavedOffline(true);
                setCollectionResult(
                  respondentName && communityName
                    ? `${respondentName} from ${communityName} is saved offline with ${evidenceCount} evidence item${evidenceCount === 1 ? "" : "s"}. Submit when connectivity is available.`
                    : "This response is saved offline. Complete the required details before final submission.",
                );
              }}
              type="button"
              variant="secondary"
            >
              <Save aria-hidden="true" />
              Save offline
            </Button>
            <Button disabled={!readyToSubmit} type="submit" variant="primary">
              <Send aria-hidden="true" />
              {readyToSubmit ? "Submit response" : "Complete required fields"}
            </Button>
          </div>

          {collectionResult ? (
            <section
              className="mt-5 rounded-xl border border-success/30 bg-success/10 p-3"
              aria-live="polite"
            >
              <div className="flex items-start gap-2">
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-success"
                  size={16}
                />
                <div>
                  <h2 className="text-sm font-semibold">Collection status</h2>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {collectionResult}
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          <div className="mt-5 flex gap-2 rounded-xl border border-primary/20 bg-primary/10 p-3 text-sm leading-6 text-muted-foreground">
            <ShieldCheck
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-primary"
              size={16}
            />
            <p>
              Submissions from this public link enter the same review, approval,
              audit, and reporting workflow as mobile submissions.
            </p>
          </div>
        </form>
      </section>
    </main>
  );
}
