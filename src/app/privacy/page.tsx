import Link from "next/link";
import { MarketingShell } from "@/components/AppShell";

export const metadata = {
  title: "Privacy Policy — BuildIQ",
  description: "How BuildIQ collects, uses, and protects builder data.",
};

export default function PrivacyPage() {
  return (
    <MarketingShell>
      <main id="main-content" className="mx-auto max-w-2xl px-4 py-10 prose-buildiq">
        <h1 className="font-display text-3xl font-semibold">Privacy Policy</h1>
        <p className="mt-2 text-sm text-[var(--sage)]">Last updated: August 4, 2026</p>

        <Section title="Who we are">
          BuildIQ (“we”, “us”) provides a residential construction estimating application for building companies.
          For privacy requests contact <a href="mailto:privacy@buildiq.app">privacy@buildiq.app</a>.
          Replace this contact with your operating legal entity name and mailing address before App Store / Play submission.
        </Section>

        <Section title="Data we collect">
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--ink-soft)]">
            <li>Account data: name, email, password (hashed), company name, role, Terms acceptance timestamp</li>
            <li>Job data: project addresses, plan files you upload, takeoffs, estimates, bids</li>
            <li>Commerce data: cart items, order totals, payment method type (e.g. Apple Pay), shipping address</li>
            <li>Integrations: ECI Spruce credentials you choose to store; AI analysis of plan metadata</li>
            <li>Device/diagnostics: basic app performance and error logs needed to keep the service reliable (not used for advertising)</li>
          </ul>
        </Section>

        <Section title="How we use data">
          We use data to operate BuildIQ: authentication, estimating workflows, AI takeoff assistance, material package ordering,
          payment processing via Stripe, and optional Spruce sync. We do not sell personal information and we do not use data for
          third-party advertising or cross-app tracking.
        </Section>

        <Section title="Legal bases (where applicable)">
          Depending on your location, we process data to perform our contract with you, for legitimate interests in securing and
          improving the service, and where required with your consent (for example accepting these Terms at signup).
        </Section>

        <Section title="Payments">
          Card and wallet payments (Apple Pay, Google Pay) are processed by Stripe. BuildIQ does not store full card numbers.
          After account deletion, payment records may be retained by Stripe as required for fraud prevention, tax, and financial
          compliance. See Stripe’s privacy policy for processor practices.
        </Section>

        <Section title="AI processing">
          Plan filenames, project size, and related metadata may be processed by AI services (including OpenAI when configured)
          to generate material takeoffs. Do not upload documents you are not authorized to process. AI providers process data
          under their terms as our subprocessors.
        </Section>

        <Section title="Sharing & subprocessors">
          We share data only with service providers needed to run the app (hosting, Stripe, optional AI/Spruce providers),
          or when required by law. Company workspace data is visible to members of your company account.
          International transfers may occur when providers process data in other countries, protected by appropriate safeguards
          offered by those providers.
        </Section>

        <Section title="Cookies & sessions">
          We use an HTTP-only session cookie to keep you signed in. We do not use advertising cookies or third-party ad trackers.
        </Section>

        <Section title="Retention & deletion">
          We retain account and job data while your account is active. Blueprint files on our servers are deleted when you delete
          your account (or when a sole-owner company workspace is removed). You may export or delete your account in Settings → Account.
          Apple App Store and Google Play users can delete their account entirely in-app without contacting support.
          Typical active-account retention: while the workspace remains open. Deleted accounts: removed from our application database;
          backups may linger up to 30 days before purge.
        </Section>

        <Section title="Security">
          We use HTTPS/TLS, hashed passwords (bcrypt), HTTP-only session cookies, company-scoped access controls, upload validation,
          and rate limiting on authentication endpoints.
        </Section>

        <Section title="Children">
          BuildIQ is a business productivity tool for construction professionals. It is not directed to children under 13
          (COPPA) and is not intended for users under 16. We do not knowingly collect data from children.
        </Section>

        <Section title="Your choices (including CCPA)">
          Access/export your data, delete your account, and manage Spruce credentials in the app. California residents may request
          access, deletion, or information about categories of personal information we collect. We do not sell or “share” personal
          information for cross-context behavioral advertising as those terms are used under CCPA/CPRA.
          Contact <a href="mailto:privacy@buildiq.app">privacy@buildiq.app</a> for requests.
        </Section>

        <p className="mt-10 text-sm text-[var(--sage)]">
          <Link href="/terms">Terms of Service</Link> · <Link href="/support">Support</Link>
        </p>
      </main>
    </MarketingShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <div className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">{children}</div>
    </section>
  );
}
