import Link from "next/link";
import { MarketingShell } from "@/components/AppShell";

export const metadata = {
  title: "Privacy Policy — BuildIQ",
  description: "How BuildIQ collects, uses, and protects builder data.",
};

export default function PrivacyPage() {
  const entity = process.env.LEGAL_ENTITY_NAME || "BuildIQ";
  const address = process.env.LEGAL_ENTITY_ADDRESS || "";
  const privacyEmail = process.env.PRIVACY_EMAIL || "privacy@buildiq.app";

  return (
    <MarketingShell>
      <main id="main-content" className="mx-auto max-w-2xl px-4 py-10 prose-buildiq">
        <h1 className="font-display text-3xl font-semibold">Privacy Policy</h1>
        <p className="mt-2 text-sm text-[var(--sage)]">Last updated: August 4, 2026</p>

        <Section title="Who we are">
          {entity} (“we”, “us”) provides a residential construction estimating application for building companies.
          {address ? <> Mailing address: {address}.</> : null}
          {" "}Contact: <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a>.
          Confirm legal entity details before App Store / Play submission.
        </Section>

        <Section title="Data we collect">
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--ink-soft)]">
            <li>Account data: name, email, password (hashed), company name, role, Terms acceptance timestamp, email verification status</li>
            <li>Job data: project addresses, plan files you upload, takeoffs, estimates, bids</li>
            <li>Commerce data: cart items, order totals, payment method type (e.g. Apple Pay), shipping address</li>
            <li>Integrations: ECI Spruce credentials you choose to store; AI analysis of plan metadata</li>
            <li>Device/diagnostics: basic app performance and error logs (not used for advertising)</li>
          </ul>
        </Section>

        <Section title="How we use data">
          We use data to operate BuildIQ: authentication, estimating workflows, AI takeoff assistance, material package ordering,
          payment processing via Stripe, and optional Spruce sync. We do not sell personal information and we do not use data for
          third-party advertising or cross-app tracking.
        </Section>

        <Section title="Payments">
          Card and wallet payments (Apple Pay, Google Pay) are processed by Stripe. BuildIQ does not store full card numbers.
          After account deletion, payment records may be retained by Stripe as required for fraud prevention, tax, and financial compliance.
        </Section>

        <Section title="AI processing">
          Plan filenames, project size, and related metadata may be processed by AI services (including OpenAI when configured)
          to generate material takeoffs. AI outputs are drafts until reviewed. Do not upload documents you are not authorized to process.
        </Section>

        <Section title="Sharing & subprocessors">
          We share data only with service providers needed to run the app (hosting, Stripe, optional AI/Spruce providers),
          or when required by law. Company workspace data is visible to members of your company account.
        </Section>

        <Section title="Cookies & sessions">
          We use an HTTP-only session cookie to keep you signed in. We do not use advertising cookies or third-party ad trackers.
        </Section>

        <Section title="Retention & deletion">
          We retain account and job data while your account is active. Blueprint files are deleted when you delete your account
          (or when a sole-owner company workspace is removed). Export or delete in Settings → Account.
          Deleted accounts are removed from the application database; backups may linger up to 30 days.
        </Section>

        <Section title="Security">
          We use HTTPS/TLS, hashed passwords (bcrypt), HTTP-only session cookies, company-scoped access controls, RBAC,
          upload validation, login lockout, and rate limiting on authentication endpoints.
        </Section>

        <Section title="Children">
          BuildIQ is a business productivity tool. It is not directed to children under 13 and is not intended for users under 16.
        </Section>

        <Section title="Your choices (including CCPA)">
          Access/export your data, delete your account, and manage Spruce credentials in the app. We do not sell or “share”
          personal information for cross-context behavioral advertising under CCPA/CPRA.
          Contact <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a>.
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
