import type { Metadata } from "next";

import { FAQAccordion, SectionIntro, SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { faqSchema, JsonLd, marketingMetadata } from "@/lib/marketing/seo";

const mobileFaqs = [
  {
    answer:
      "Open the mobile app while online, sign in, run Sync Now, and confirm your assignments, forms, and assigned beneficiaries are visible before leaving for the field.",
    question: "What should field officers do before going offline?",
  },
  {
    answer:
      "Drafts are saved locally on the device and remain in the sync queue until the app confirms they have been uploaded to the web platform.",
    question: "What happens to submissions without internet?",
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
      "Sign in while online and sync assigned work.",
      "Open Assignments and confirm the project, form, and beneficiary list.",
      "Open Sync Center and confirm there are no failed items before travel.",
    ],
    title: "Before fieldwork",
  },
  {
    items: [
      "Open the assigned work, select or create the beneficiary, and start the form.",
      "Save drafts whenever fieldwork is interrupted.",
      "Use GPS and attachment questions only when the form asks for evidence.",
      "Queue the submission when the form is complete, even if the phone is offline.",
    ],
    title: "During collection",
  },
  {
    items: [
      "Reconnect to the internet and tap Sync Now.",
      "Keep the app open until queued submissions finish or show a clear failure.",
      "Retry failed submissions instead of deleting drafts.",
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
              <ol className="mt-4 space-y-3 text-sm leading-6 text-[#52615d]">
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
