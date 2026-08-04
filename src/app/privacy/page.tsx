import Link from "next/link";
import { MarketingShell } from "@/components/AppShell";
import { LEGAL, draftPolicyBanner } from "@/lib/legal";

export const metadata = {
  title: "Privacy Policy (Draft) — BuildIQ",
  description: "Draft privacy policy for BuildIQ by Supply Monkey Lumber & Materials Co — requires attorney review.",
  robots: LEGAL.policiesAreDrafts ? { index: false, follow: false } : undefined,
};

export default function PrivacyPage() {
  const { entityName, addressLines, privacyEmail, productName, policiesAreDrafts } = LEGAL;

  return (
    <MarketingShell>
      <main id="main-content" className="mx-auto max-w-2xl px-4 py-10 prose-buildiq">
        {policiesAreDrafts && (
          <p
            className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950"
            role="status"
          >
            {draftPolicyBanner()}
          </p>
        )}

        <h1 className="mt-6 font-display text-3xl font-semibold">
          Privacy Policy{policiesAreDrafts ? " (Draft)" : ""}
        </h1>
        <p className="mt-2 text-sm text-[var(--sage)]">Last updated: August 4, 2026</p>

        <Section title="Who we are">
          {productName} is operated by <strong>{entityName}</strong> (“we”, “us”).
          <br />
          {addressLines.map((line) => (
            <span key={line}>
              {line}
              <br />
            </span>
          ))}
          Privacy contact: <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a>.
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
          We use data to operate {productName}: authentication, estimating workflows, AI takeoff assistance, material package ordering,
          payment processing via Stripe, and optional Spruce sync. We do not sell personal information and we do not use data for
          third-party advertising or cross-app tracking.
        </Section>

        <Section title="Payments">
          Card and wallet payments (Apple Pay, Google Pay) are processed by Stripe. {productName} does not store full card numbers.
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
          For deletion help, email <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a>.
          Deleted accounts are removed from the application database; backups may linger up to 30 days.
        </Section>

        <Section title="Security">
          We use HTTPS/TLS, hashed passwords (bcrypt), HTTP-only session cookies, company-scoped access controls, RBAC,
          upload validation, login lockout, and rate limiting on authentication endpoints.
        </Section>

        <Section title="Children">
          {productName} is a business productivity tool. It is not directed to children under 13 and is not intended for users under 16.
        </Section>

        <Section title="Your choices (including CCPA)">
          Access/export your data, delete your account, and manage Spruce credentials in the app. We do not sell or “share”
          personal information for cross-context behavioral advertising under CCPA/CPRA.
          Contact <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a>.
        </Section>

        <Section title="Legal notice">
          {policiesAreDrafts
            ? "This Privacy Policy is a draft generated for engineering readiness. It requires review and approval by qualified legal counsel before it is treated as a final, published policy for App Store, Google Play, or customer contracting."
            : `This Privacy Policy is maintained by ${entityName}.`}
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
