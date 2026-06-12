import type { Metadata } from "next";
import Link from "next/link";

import { LegalDocument, SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Privacy Policy",
  description: "How Atlas FieldOps collects, uses, shares, and protects information across our website, web application, and mobile app, including customer field data and mobile device permissions.",
  path: "/privacy",
});

const sections = [
  {
    id: "introduction",
    title: "1. Introduction",
    content: (
      <>
        <p>
          This Privacy Policy explains how Atlas FieldOps (&quot;Atlas FieldOps,&quot; &quot;we,&quot; &quot;us,&quot; or
          &quot;our&quot;) collects, uses, discloses, and protects information when you visit{" "}
          <Link href="/">atlasfieldops.com</Link> (the &quot;Website&quot;), use our web application (the
          &quot;Platform&quot;), or use our Android mobile application (the &quot;Mobile App&quot;), together the
          &quot;Services.&quot;
        </p>
        <p>
          We provide a field data collection, monitoring, and operations platform used by organizations such as NGOs,
          government agencies, donors, healthcare providers, agricultural programs, and other businesses
          (&quot;Customers&quot;) to manage forms, submissions, beneficiaries or records, field visits, media evidence,
          and reporting. Because of this, this policy describes two different relationships:
        </p>
        <ul>
          <li>
            <strong>Visitors and prospects</strong> who browse our Website or submit a contact, demo, careers, or
            resource request &mdash; for this information, Atlas FieldOps is the data controller.
          </li>
          <li>
            <strong>Customer organizations and their authorized users</strong> (such as field officers, supervisors,
            and administrators) who use the Platform and Mobile App to collect and manage operational data
            (&quot;Customer Data&quot;) &mdash; for this information, the Customer is generally the data controller and
            Atlas FieldOps acts as a data processor or service provider, as described in Section 13.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "definitions",
    title: "2. Definitions",
    content: (
      <ul>
        <li>
          <strong>&quot;Personal Data&quot;</strong> means any information that identifies, relates to, or could
          reasonably be linked to an identified or identifiable individual.
        </li>
        <li>
          <strong>&quot;Customer Data&quot;</strong> means data submitted to the Platform or Mobile App by a Customer
          or its authorized users in connection with their use of the Services, including form responses, GPS
          coordinates, photos, audio, video, signatures, attachments, beneficiary or entity records, indicators, and
          reports.
        </li>
        <li>
          <strong>&quot;Account Data&quot;</strong> means information about Customers and their authorized users used
          to provision and administer access to the Services, such as name, email address, organization, role, and
          login activity.
        </li>
        <li>
          <strong>&quot;Device Data&quot;</strong> means information collected from the Mobile App and the device it
          runs on, such as device identifiers, app version, operating system version, sync status, and diagnostic
          logs.
        </li>
      </ul>
    ),
  },
  {
    id: "information-we-collect",
    title: "3. Information We Collect",
    content: (
      <>
        <h3>3.1 Information from website visitors and prospects</h3>
        <p>
          When you submit a form on our Website &mdash; for example a contact request, demo booking, resource
          download, careers application, or newsletter signup &mdash; we collect the information you provide, which
          may include your name, work email address, organization, job title, country or region, phone number, and
          the content of your message.
        </p>
        <h3>3.2 Account Data</h3>
        <p>
          When a Customer creates an organization or invites users to the Platform, we collect Account Data such as
          name, email address, organization name, assigned role and permissions, and authentication activity (such
          as login timestamps and device registration).
        </p>
        <h3>3.3 Customer Data</h3>
        <p>
          Customers and their authorized users may submit Customer Data to the Services, including form responses,
          GPS coordinates and maps, photos, audio recordings, video, signatures, file attachments, and records about
          beneficiaries, entities, or other individuals relevant to the Customer&apos;s programs. Customer Data may
          include sensitive information depending on how a Customer configures and uses their forms (for example,
          health, demographic, or location information about program participants). Customer Data is controlled by
          the Customer; see Section 13 for more on this relationship.
        </p>
        <h3>3.4 Device and usage data</h3>
        <p>
          We automatically collect certain technical information when you use the Services, including IP address,
          browser type, device type, operating system, pages viewed, referring URLs, and timestamps. The Mobile App
          additionally collects Device Data such as a device identifier, app version, operating system version,
          sync queue status, and diagnostic information used for support and troubleshooting.
        </p>
        <h3>3.5 Cookies and analytics</h3>
        <p>
          The Website uses cookies and similar technologies as described in Section 6.
        </p>
      </>
    ),
  },
  {
    id: "how-we-use-information",
    title: "4. How We Use Information",
    content: (
      <>
        <p>We use the information described above to:</p>
        <ul>
          <li>Provide, operate, maintain, and improve the Website, Platform, and Mobile App;</li>
          <li>Create and administer Customer organizations, user accounts, roles, and permissions;</li>
          <li>Enable offline data collection, synchronization, media uploads, and reporting features;</li>
          <li>Respond to inquiries, demo requests, support tickets, and careers applications;</li>
          <li>Send service communications, such as account notices, security alerts, and sync or device status updates;</li>
          <li>Send marketing communications about our products and services, where permitted, and in line with your preferences;</li>
          <li>Monitor, detect, investigate, and prevent fraud, abuse, unauthorized access, and security incidents;</li>
          <li>Analyze usage trends to improve performance, reliability, and the design of our Services; and</li>
          <li>Comply with legal obligations and enforce our agreements, including our Terms of Service.</li>
        </ul>
      </>
    ),
  },
  {
    id: "legal-bases",
    title: "5. Legal Bases for Processing",
    content: (
      <>
        <p>
          If you are located in the European Economic Area, the United Kingdom, or another jurisdiction that requires
          a legal basis for processing Personal Data, we rely on the following bases:
        </p>
        <ul>
          <li>
            <strong>Contract:</strong> to provide the Services a Customer has subscribed to and to manage Account
            Data for authorized users;
          </li>
          <li>
            <strong>Legitimate interests:</strong> to secure our Services, respond to inquiries, improve our products,
            and communicate with prospects and Customers about relevant offerings;
          </li>
          <li>
            <strong>Consent:</strong> where required, such as for certain cookies, marketing communications, or
            device permissions on the Mobile App (for example, camera, microphone, or precise location); and
          </li>
          <li>
            <strong>Legal obligation:</strong> where we must retain or disclose information to comply with applicable
            law, regulation, legal process, or governmental request.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "cookies",
    title: "6. Cookies and Similar Technologies",
    content: (
      <>
        <p>
          We use cookies and similar technologies on the Website to operate core functionality (such as keeping you
          signed in), remember preferences, and understand how visitors use our site so we can improve it. The Mobile
          App does not use advertising cookies; it stores data locally on the device to support offline data
          collection and synchronization.
        </p>
        <p>
          Categories of cookies we may use include:
        </p>
        <ul>
          <li><strong>Essential cookies</strong> &mdash; required for authentication, security, and basic site functionality;</li>
          <li><strong>Preference cookies</strong> &mdash; remember settings such as language or display preferences; and</li>
          <li><strong>Analytics cookies</strong> &mdash; help us understand aggregate usage of the Website so we can improve content and navigation.</li>
        </ul>
        <p>
          You can control cookies through your browser settings, including blocking or deleting cookies. Blocking
          essential cookies may affect the availability of certain features.
        </p>
      </>
    ),
  },
  {
    id: "how-we-share-information",
    title: "7. How We Share Information",
    content: (
      <>
        <p>We do not sell Personal Data or Customer Data. We may share information in the following circumstances:</p>
        <ul>
          <li>
            <strong>Service providers and subprocessors</strong> who host, store, transmit, or process information on
            our behalf, such as cloud infrastructure, application hosting, email delivery, analytics, and customer
            support tooling providers, under contractual confidentiality and security obligations;
          </li>
          <li>
            <strong>Within a Customer organization</strong>, Customer Data and Account Data are visible to authorized
            users of that organization according to the roles and permissions configured by the Customer&apos;s
            administrators;
          </li>
          <li>
            <strong>Corporate transactions</strong>, such as a merger, acquisition, financing, or sale of assets, where
            information may be transferred as part of that transaction, subject to standard confidentiality
            arrangements;
          </li>
          <li>
            <strong>Legal and safety reasons</strong>, where we believe disclosure is necessary to comply with
            applicable law, regulation, legal process, or governmental request, or to protect the rights, property, or
            safety of Atlas FieldOps, our Customers, or others; and
          </li>
          <li>
            <strong>With your direction or consent</strong>, such as when you ask us to share information with a
            named third party.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "mobile-app-permissions",
    title: "8. Mobile App Permissions and Data",
    content: (
      <>
        <p>
          The Atlas FieldOps Mobile App is designed for field officers and other authorized users who need to collect
          data offline and synchronize it when connectivity is available. To support this, the Mobile App may request
          the following device permissions. You can manage these permissions in your device settings at any time;
          disabling a permission may limit related features.
        </p>
        <ul>
          <li><strong>Location (precise and approximate):</strong> to record GPS coordinates for form submissions, field visits, and boundary mapping;</li>
          <li><strong>Camera:</strong> to capture photo and video evidence attached to form submissions and field visit records;</li>
          <li><strong>Microphone:</strong> to record audio responses or notes attached to form submissions;</li>
          <li><strong>Photos and media storage:</strong> to attach existing photos or files to form submissions and to store captured media and offline data on the device;</li>
          <li><strong>Network state:</strong> to detect connectivity and manage offline queuing and synchronization; and</li>
          <li><strong>Notifications:</strong> to alert you about sync status, assignments, or returned submissions that need attention.</li>
        </ul>
        <p>
          Data collected through these permissions is stored locally on the device until it is synchronized to the
          Platform as part of Customer Data, and is then handled as described in Sections 3.3 and 13. We recommend
          that Customers configure permission requirements and consent language appropriate to their own program and
          applicable law before deploying the Mobile App to field staff.
        </p>
      </>
    ),
  },
  {
    id: "data-retention",
    title: "9. Data Retention",
    content: (
      <>
        <p>
          We retain Account Data and Customer Data for as long as the related Customer organization maintains an
          active subscription, plus a reasonable period afterward to allow for export, account recovery, backup
          rotation, and legal or audit requirements, unless a different retention period is agreed in a Customer
          contract or required by law.
        </p>
        <p>
          Information submitted through Website forms (such as contact or demo requests) is retained for as long as
          necessary to respond to your inquiry, maintain business records, and comply with legal obligations, after
          which it is deleted or anonymized.
        </p>
        <p>
          On the Mobile App, drafts and queued submissions remain on the device until they are successfully
          synchronized; previously synced data can be cleared from the device at any time from the app&apos;s settings
          without affecting data already stored on the Platform.
        </p>
      </>
    ),
  },
  {
    id: "data-security",
    title: "10. Data Security",
    content: (
      <>
        <p>
          We use administrative, technical, and organizational safeguards designed to protect information against
          unauthorized access, disclosure, alteration, and destruction, including encryption of data in transit,
          role-based access controls, audit logging of sensitive actions, and tenant separation between Customer
          organizations.
        </p>
        <p>
          No system can be guaranteed to be completely secure. If we become aware of a security incident affecting
          Personal Data, we will notify affected Customers and individuals as required by applicable law and our
          Customer agreements.
        </p>
      </>
    ),
  },
  {
    id: "international-transfers",
    title: "11. International Data Transfers",
    content: (
      <p>
        Atlas FieldOps and the service providers we use to deliver the Services may process and store information in
        countries other than the country where you or a Customer&apos;s program operates. Where we transfer Personal
        Data internationally, we use appropriate safeguards required by applicable data protection law, such as
        standard contractual clauses, to protect that information.
      </p>
    ),
  },
  {
    id: "your-rights",
    title: "12. Your Privacy Rights and Choices",
    content: (
      <>
        <p>
          Depending on your location and relationship with us, you may have rights to access, correct, export, or
          delete Personal Data we hold about you, to object to or restrict certain processing, and to withdraw
          consent where processing is based on consent.
        </p>
        <ul>
          <li>
            <strong>Website visitors and prospects:</strong> you can exercise these rights by contacting us using the
            details in Section 16, or by using any unsubscribe link included in our marketing communications.
          </li>
          <li>
            <strong>Customer platform users:</strong> because Customer Data and Account Data are controlled by the
            Customer organization, requests to access, correct, or delete that information should generally be
            directed to your organization&apos;s administrator. We will assist Customers in responding to such
            requests as required by our agreements and applicable law.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "customer-data-roles",
    title: "13. Customer Data and Controller/Processor Roles",
    content: (
      <>
        <p>
          When a Customer organization uses the Platform and Mobile App to collect and manage Customer Data
          (including data about beneficiaries, program participants, or other individuals), the Customer determines
          what data is collected, how it is configured within forms, who within their organization can access it, and
          how long it is retained on the Platform.
        </p>
        <p>
          In this relationship, the Customer acts as the data controller and Atlas FieldOps acts as a data processor
          or service provider, processing Customer Data only as necessary to provide the Services and according to
          the Customer&apos;s instructions and our agreement with the Customer. Customers are responsible for ensuring
          they have an appropriate legal basis to collect Customer Data (including any necessary consents from
          beneficiaries or program participants) and for configuring access controls, retention settings, and
          consent or safeguarding workflows appropriate to their program and applicable law.
        </p>
        <p>
          If you are an individual whose data was collected by an organization using Atlas FieldOps (for example, as
          a program participant or survey respondent), please direct privacy requests to that organization, as Atlas
          FieldOps does not have a direct relationship with you and may not be able to identify your records without
          the Customer&apos;s assistance.
        </p>
      </>
    ),
  },
  {
    id: "childrens-privacy",
    title: "14. Children's Privacy",
    content: (
      <p>
        The Website, Platform, and Mobile App are intended for business and organizational use by adults and are not
        directed to children. We do not knowingly collect Personal Data from children through the Website for our
        own purposes. Where Customer Data collected through the Platform or Mobile App includes information about
        minors (for example, beneficiary records in health, education, or protection programs), that data is
        controlled by the Customer organization as described in Section 13, and Customers are responsible for
        ensuring such collection complies with applicable law, including any required parental or guardian consent
        and safeguarding obligations.
      </p>
    ),
  },
  {
    id: "changes",
    title: "15. Changes to This Policy",
    content: (
      <p>
        We may update this Privacy Policy from time to time to reflect changes to our Services, legal requirements,
        or practices. If we make material changes, we will update the &quot;Last updated&quot; date at the top of this
        page and, where appropriate, provide additional notice to Customers (such as by email or in-app notice).
        Continued use of the Services after a revised policy takes effect indicates acceptance of the changes.
      </p>
    ),
  },
  {
    id: "contact",
    title: "16. Contact Us",
    content: (
      <>
        <p>If you have questions, requests, or concerns about this Privacy Policy or our data practices, contact us:</p>
        <ul>
          <li>Email: <a href="mailto:privacy@atlasfieldops.com">privacy@atlasfieldops.com</a></li>
          <li>General support: <a href="mailto:support@atlasfieldops.com">support@atlasfieldops.com</a></li>
          <li>Via our <Link href="/contact">contact page</Link></li>
        </ul>
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <MarketingShell>
      <main>
        <SimplePageHero
          eyebrow="Privacy Policy"
          title="Your privacy and your data, explained"
          text="This page explains what information Atlas FieldOps collects across our website, web application, and Android app, how it is used and shared, and the controls available to you and to organizations using our platform."
        />
        <LegalDocument
          intro={
            <p>
              This policy is written to cover two audiences: people who visit our website or get in touch with our
              team, and the organizations (and their staff) who use Atlas FieldOps to collect and manage field data.
              Section 13 explains how responsibility for &quot;Customer Data&quot; is shared between Atlas FieldOps and
              the organizations that use our platform.
            </p>
          }
          lastUpdated="June 12, 2026"
          sections={sections}
        />
      </main>
    </MarketingShell>
  );
}
