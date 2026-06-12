import type { Metadata } from "next";

import { FAQAccordion, SectionIntro, SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { faqSchema, JsonLd, marketingMetadata } from "@/lib/marketing/seo";

const mobileFaqs = [
  {
    answer:
      "Open the mobile app while online, sign in, run Sync Now, and confirm your assignments, forms, and assigned entities are visible before leaving for the field.",
    question: "What should field officers do before going offline?",
  },
  {
    answer:
      "Authorized field officers can sign in with their email and password or use QR login when their manager has issued a valid QR code from the field officer profile.",
    question: "Can field officers sign in with a QR code?",
  },
  {
    answer:
      "Drafts are saved locally on the device and remain in the sync queue until the app confirms they have been uploaded to the web platform.",
    question: "What happens to submissions without internet?",
  },
  {
    answer:
      "The app can capture GPS, timestamp, accuracy, source, attachments, and check-in or check-out evidence when the assigned form or approved activity requires it.",
    question: "How does the app prove field activity happened in the right place?",
  },
  {
    answer:
      "Open Settings, review Diagnostics, and send feedback with diagnostics so support can see device ID, app version, queue status, storage status, and failed sync counts.",
    question: "How should a field officer report a sync problem?",
  },
];

const sections = [
  {
    items: [
      "Charge the device and confirm the correct app version.",
      "Sign in while online with password or approved QR login.",
      "Run Sync Now to download your profile, permissions, projects, forms, locations, entities, supervisor, mobile rules, and returned submissions.",
      "Open Assignments and confirm the project, form, entity list, location scope, and supervisor instructions.",
      "Confirm any visit request or operational activity has been approved before travel when your supervisor requires it.",
      "Open Sync Center and confirm there are no failed items before travel.",
    ],
    title: "Before fieldwork",
  },
  {
    items: [
      "Open the assigned work, select or create the entity, and start the form.",
      "Use the help text shown under a question when a date, number, GPS, attachment, barcode, QR code, signature, or required field needs a specific format.",
      "Save drafts whenever fieldwork is interrupted.",
      "Use GPS and attachment questions when the form asks for evidence, and recapture GPS if accuracy is poor.",
      "Check in and check out for approved visits or operational activities when required.",
      "Queue the submission when the form is complete, even if the phone is offline.",
    ],
    title: "During collection",
  },
  {
    items: [
      "Reconnect to the internet and tap Sync Now.",
      "Keep the app open until queued submissions finish or show a clear failure.",
      "Retry failed submissions instead of deleting drafts.",
      "Confirm synced submissions leave the queue and appear as synced or waiting for web review.",
      "Review returned submissions, correct only the fields allowed by the reviewer, and resync.",
      "Send feedback with diagnostics if sync keeps failing.",
    ],
    title: "After collection",
  },
];

export const metadata: Metadata = marketingMetadata({
  title: "Mobile Field App Help",
  description:
    "Mobile field app help for Atlas FieldOps offline data collection, assignments, drafts, sync, diagnostics, and pilot support.",
  path: "/help/mobile",
});

export default function MobileHelpPage() {
  return (
    <MarketingShell>
      <JsonLd data={faqSchema(mobileFaqs)} />
      <main>
        <SimplePageHero
          eyebrow="Mobile help"
          text="Use this guide to prepare Android devices, collect data offline, protect drafts, sync submissions, and send useful diagnostics during pilots."
          title="Field app guidance for offline data collection"
        />
        <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-20 sm:px-6 md:grid-cols-3 lg:px-8">
          {sections.map((section) => (
            <article className="rounded-xl border border-black/10 bg-white p-6 shadow-sm" key={section.title}>
              <h2 className="text-lg font-semibold">{section.title}</h2>
              <ol className="mt-4 space-y-3 text-sm leading-6 text-[#5b6a65]">
                {section.items.map((item, index) => (
                  <li key={item}>
                    <span className="mr-2 font-semibold text-[#12332b]">{index + 1}.</span>
                    {item}
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </section>
        <section className="bg-white py-20">
          <SectionIntro eyebrow="FAQs" title="Common mobile field app questions" text="Quick answers for field officers preparing devices, collecting data offline, and syncing submissions." />
          <div className="mx-auto mt-12 max-w-4xl px-4 sm:px-6 lg:px-8">
            <FAQAccordion items={mobileFaqs} />
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
