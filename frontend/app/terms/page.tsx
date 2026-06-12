import type { Metadata } from "next";
import Link from "next/link";

import { LegalDocument, SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Terms of Service",
  description: "The terms that govern use of the Atlas FieldOps website, web application, and Android mobile app, including acceptable use, customer data, subscriptions, and liability.",
  path: "/terms",
});

const sections = [
  {
    id: "acceptance",
    title: "1. Acceptance of These Terms",
    content: (
      <>
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your access to and use of the Atlas FieldOps website at{" "}
          <Link href="/">atlasfieldops.com</Link> (the &quot;Website&quot;), our web application (the
          &quot;Platform&quot;), and our Android mobile application (the &quot;Mobile App&quot;), together the
          &quot;Services,&quot; provided by Atlas FieldOps (&quot;Atlas FieldOps,&quot; &quot;we,&quot; &quot;us,&quot; or
          &quot;our&quot;).
        </p>
        <p>
          By accessing or using the Services, you agree to be bound by these Terms. If you are using the Services on
          behalf of an organization, you represent that you have authority to bind that organization, and
          &quot;you&quot; refers to both you and that organization. If you do not agree to these Terms, do not access
          or use the Services.
        </p>
        <p>
          If your organization has a separate signed agreement or order form with Atlas FieldOps that governs use of
          the Platform (a &quot;Customer Agreement&quot;), that Customer Agreement controls to the extent it conflicts
          with these Terms.
        </p>
      </>
    ),
  },
  {
    id: "description",
    title: "2. Description of the Service",
    content: (
      <>
        <p>
          Atlas FieldOps provides a configurable platform for field data collection, monitoring, operations
          management, and reporting. The Services include:
        </p>
        <ul>
          <li>The public Website, which provides product information, resources, and ways to contact our team;</li>
          <li>The Platform, a web application used by Customer organizations to design forms, manage projects, users, submissions, beneficiaries or other records, maps, and reports; and</li>
          <li>The Mobile App, an Android application used by field staff to collect data &mdash; including offline &mdash; and synchronize it with the Platform.</li>
        </ul>
        <p>
          Access to the Platform and Mobile App requires an account provisioned by an authorized administrator of a
          Customer organization. The Website is available to the public without an account.
        </p>
      </>
    ),
  },
  {
    id: "accounts",
    title: "3. Accounts and Registration",
    content: (
      <>
        <p>
          To use the Platform or Mobile App, you must have an account created or invited by your organization&apos;s
          administrator. You are responsible for:
        </p>
        <ul>
          <li>Providing accurate account information and keeping it up to date;</li>
          <li>Maintaining the confidentiality of your login credentials and device PIN or biometric lock;</li>
          <li>All activity that occurs under your account, except to the extent caused by our breach of these Terms; and</li>
          <li>Promptly notifying your administrator or us if you suspect unauthorized use of your account or loss of a device with the Mobile App installed.</li>
        </ul>
        <p>
          Administrators of a Customer organization are responsible for managing the roles, permissions, and access
          of users within their organization, including suspending or removing accounts when a user no longer
          requires access.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "4. Acceptable Use",
    content: (
      <>
        <p>You agree not to, and not to permit others to:</p>
        <ul>
          <li>Access or use the Services in violation of applicable law, including data protection, privacy, and safeguarding laws;</li>
          <li>Attempt to access data, accounts, or systems belonging to another Customer organization, or to bypass role-based permissions or other access controls;</li>
          <li>Probe, scan, or test the vulnerability of the Services, or interfere with or disrupt the integrity or performance of the Services or data contained in them;</li>
          <li>Reverse engineer, decompile, or disassemble any part of the Services, except to the extent permitted by law;</li>
          <li>Upload or submit content that is unlawful, infringing, defamatory, or that you do not have the right to share;</li>
          <li>Use the Services to collect Personal Data about individuals without an appropriate legal basis or, where required, their informed consent; or</li>
          <li>Use automated means to access the Services in a manner that sends more requests than a human could reasonably produce, except through any APIs we may provide for that purpose.</li>
        </ul>
        <p>
          We may suspend or terminate access for any account that we reasonably believe violates this section, in
          accordance with Section 14.
        </p>
      </>
    ),
  },
  {
    id: "customer-data",
    title: "5. Customer Data",
    content: (
      <>
        <p>
          As between Atlas FieldOps and a Customer, the Customer owns all data submitted to the Platform or Mobile
          App by the Customer or its authorized users, including form designs, submissions, media, GPS data,
          beneficiary or entity records, and reports (&quot;Customer Data&quot;).
        </p>
        <p>
          Atlas FieldOps will not access, use, or disclose Customer Data except: (a) to provide, maintain, and
          support the Services; (b) at the Customer&apos;s direction; (c) as necessary to comply with law or respond
          to valid legal process; or (d) to investigate suspected abuse, security incidents, or violations of these
          Terms.
        </p>
        <p>
          Customers are responsible for the accuracy, quality, and legality of Customer Data and for the means by
          which it was collected, including obtaining any necessary consents from individuals whose data is included
          in Customer Data. See our <Link href="/privacy">Privacy Policy</Link> for more on how Customer Data is
          handled.
        </p>
        <p>
          On termination of a Customer&apos;s subscription, we will make Customer Data available for export for a
          reasonable period as described in the applicable Customer Agreement or, absent such an agreement, for at
          least 30 days, after which it may be deleted from our systems.
        </p>
      </>
    ),
  },
  {
    id: "subscriptions",
    title: "6. Subscriptions, Trials, and Fees",
    content: (
      <>
        <p>
          Access to the Platform and Mobile App for a Customer organization is subject to the subscription plan,
          pricing, and payment terms agreed between Atlas FieldOps and that Customer, whether through an order form,
          Customer Agreement, or the pricing presented at sign-up.
        </p>
        <p>
          We may offer trial or evaluation access to the Services on a limited-time or limited-feature basis. Trial
          access is provided &quot;as is&quot; and may be modified or discontinued at any time. At the end of a trial,
          continued access may require a paid subscription.
        </p>
        <p>
          Fees, where applicable, are described in the relevant order form or Customer Agreement and are
          non-refundable except as expressly stated there or as required by law.
        </p>
      </>
    ),
  },
  {
    id: "mobile-app",
    title: "7. Mobile Application Terms",
    content: (
      <>
        <p>
          The Mobile App is licensed, not sold, to you for use on Android devices in connection with your
          organization&apos;s subscription to the Services. We grant you a limited, non-exclusive, non-transferable,
          revocable license to install and use the Mobile App on devices you own or control, solely for your
          organization&apos;s internal business purposes.
        </p>
        <p>
          The Mobile App requests certain device permissions (such as location, camera, microphone, storage, and
          notifications) to support offline data collection and synchronization. These permissions and the data
          collected through them are described in our <Link href="/privacy">Privacy Policy</Link>. You may disable
          permissions through your device settings, but doing so may limit or disable related features of the Mobile
          App.
        </p>
        <p>
          The Mobile App is designed to allow data collection while offline, with synchronization to the Platform
          when connectivity is available. You are responsible for synchronizing data in a timely manner and for the
          security of any device on which the Mobile App is installed, including locking unsynced data behind a
          device passcode or biometric lock where required by your organization&apos;s policies.
        </p>
        <p>
          If you downloaded the Mobile App from Google Play, you may also be subject to Google Play&apos;s terms of
          service, which apply in addition to these Terms.
        </p>
      </>
    ),
  },
  {
    id: "intellectual-property",
    title: "8. Intellectual Property",
    content: (
      <p>
        Atlas FieldOps and its licensors retain all right, title, and interest in and to the Services, including the
        Website, Platform, Mobile App, and all software, designs, text, graphics, and trademarks used in connection
        with them, excluding Customer Data. Except for the limited rights expressly granted in these Terms, no rights
        are granted to you by implication, estoppel, or otherwise. You may not use Atlas FieldOps&apos; names, logos,
        or trademarks without our prior written consent.
      </p>
    ),
  },
  {
    id: "third-party-services",
    title: "9. Third-Party Services",
    content: (
      <p>
        The Services may link to, integrate with, or rely on third-party websites, services, or infrastructure (for
        example, mapping, email delivery, or analytics providers). We are not responsible for the content,
        availability, or practices of third-party services, and your use of them may be subject to separate terms and
        privacy policies provided by those third parties.
      </p>
    ),
  },
  {
    id: "confidentiality",
    title: "10. Confidentiality",
    content: (
      <p>
        Each party may have access to non-public information of the other party in connection with the Services
        (&quot;Confidential Information&quot;). Each party agrees to use the other party&apos;s Confidential
        Information only as necessary to exercise its rights and perform its obligations under these Terms, and to
        protect it using at least the same degree of care it uses to protect its own confidential information of a
        similar nature, but no less than reasonable care. This section does not apply to information that is or
        becomes publicly available through no fault of the receiving party, was already known to the receiving party
        without restriction, or is independently developed without use of the disclosing party&apos;s Confidential
        Information.
      </p>
    ),
  },
  {
    id: "disclaimers",
    title: "11. Disclaimers",
    content: (
      <p>
        THE SERVICES ARE PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE,&quot; WITHOUT WARRANTIES OF ANY KIND,
        WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
        PURPOSE, TITLE, AND NON-INFRINGEMENT, TO THE MAXIMUM EXTENT PERMITTED BY LAW. WE DO NOT WARRANT THAT THE
        SERVICES WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF HARMFUL COMPONENTS, OR THAT DATA WILL NOT BE LOST OR
        CORRUPTED, ALTHOUGH WE TAKE STEPS DESIGNED TO PREVENT THIS, INCLUDING THOSE DESCRIBED IN OUR{" "}
        <Link href="/security">security overview</Link>.
      </p>
    ),
  },
  {
    id: "limitation-of-liability",
    title: "12. Limitation of Liability",
    content: (
      <>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, ATLAS FIELDOPS AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS
          WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF
          PROFITS, REVENUE, DATA, OR GOODWILL, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICES, EVEN IF ADVISED
          OF THE POSSIBILITY OF SUCH DAMAGES.
        </p>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, ATLAS FIELDOPS&apos; TOTAL LIABILITY ARISING OUT OF OR RELATED TO
          THESE TERMS OR THE SERVICES WILL NOT EXCEED THE AMOUNT PAID BY YOUR ORGANIZATION FOR THE SERVICES IN THE
          TWELVE (12) MONTHS PRECEDING THE EVENT GIVING RISE TO THE CLAIM, OR, IF NO FEES HAVE BEEN PAID, ONE HUNDRED
          U.S. DOLLARS (USD $100).
        </p>
        <p>
          Nothing in these Terms limits liability that cannot be limited under applicable law, including liability
          for gross negligence, willful misconduct, or death or personal injury caused by negligence.
        </p>
      </>
    ),
  },
  {
    id: "indemnification",
    title: "13. Indemnification",
    content: (
      <p>
        You agree to defend, indemnify, and hold harmless Atlas FieldOps and its officers, directors, employees, and
        agents from and against any claims, liabilities, damages, losses, and expenses, including reasonable
        attorneys&apos; fees, arising out of or in any way connected with: (a) your use of the Services in violation
        of these Terms or applicable law; (b) Customer Data, including any claim that the collection or content of
        Customer Data violates the rights of a third party; or (c) your violation of any rights of another party.
      </p>
    ),
  },
  {
    id: "termination",
    title: "14. Term and Termination",
    content: (
      <>
        <p>
          These Terms remain in effect for as long as you use the Services. We may suspend or terminate your access
          to the Services, in whole or in part, if we reasonably believe you have violated these Terms, if required
          by law, or if continued provision of the Services becomes impractical for legal or technical reasons,
          subject to any notice requirements in a Customer Agreement.
        </p>
        <p>
          A Customer organization may stop using the Services at any time by ending its subscription in accordance
          with its order form or Customer Agreement, or, absent such an agreement, by contacting us. Sections of
          these Terms that by their nature should survive termination &mdash; including Customer Data export and
          deletion (Section 5), intellectual property (Section 8), confidentiality (Section 10), disclaimers (Section
          11), limitation of liability (Section 12), and indemnification (Section 13) &mdash; will survive.
        </p>
      </>
    ),
  },
  {
    id: "governing-law",
    title: "15. Governing Law and Disputes",
    content: (
      <p>
        Except as otherwise set out in a Customer Agreement, these Terms are governed by the laws applicable at Atlas
        FieldOps&apos; place of business, without regard to conflict-of-law principles. Any dispute arising out of or
        relating to these Terms or the Services will be resolved in the courts of competent jurisdiction at that
        location, and the parties consent to the personal jurisdiction of those courts, except where applicable law
        provides consumers or data subjects with a right to bring claims in their local courts.
      </p>
    ),
  },
  {
    id: "changes",
    title: "16. Changes to These Terms",
    content: (
      <p>
        We may update these Terms from time to time to reflect changes to the Services or for legal, regulatory, or
        operational reasons. If we make material changes, we will update the &quot;Last updated&quot; date at the top
        of this page and, where appropriate, provide additional notice to Customers. Continued use of the Services
        after a revised version takes effect constitutes acceptance of the revised Terms. If a Customer Agreement
        governs your use of the Services, changes to these Terms will not reduce the rights or protections granted to
        you under that Customer Agreement without your consent.
      </p>
    ),
  },
  {
    id: "contact",
    title: "17. Contact Us",
    content: (
      <>
        <p>If you have questions about these Terms, contact us:</p>
        <ul>
          <li>Email: <a href="mailto:legal@atlasfieldops.com">legal@atlasfieldops.com</a></li>
          <li>General support: <a href="mailto:support@atlasfieldops.com">support@atlasfieldops.com</a></li>
          <li>Via our <Link href="/contact">contact page</Link></li>
        </ul>
      </>
    ),
  },
];

export default function TermsPage() {
  return (
    <MarketingShell>
      <main>
        <SimplePageHero
          eyebrow="Terms of Service"
          title="Terms for using Atlas FieldOps"
          text="These Terms explain the rules for using our website, web application, and Android app, the boundary between public marketing content and the secure platform workspace, and how Customer Data is handled."
        />
        <LegalDocument
          intro={
            <p>
              These Terms apply to everyone who accesses our website or uses the Platform or Mobile App. If your
              organization has a separate signed agreement with Atlas FieldOps, that agreement takes priority over
              any conflicting terms here.
            </p>
          }
          lastUpdated="June 12, 2026"
          sections={sections}
        />
      </main>
    </MarketingShell>
  );
}
