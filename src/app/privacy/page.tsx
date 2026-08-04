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
          Contact: <a href="mailto:privacy@buildiq.app">privacy@buildiq.app</a>
        </Section>

        <Section title="Data we collect">
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--ink-soft)]">
            <li>Account data: name, email, password (hashed), company name, role</li>
            <li>Job data: project addresses, plan files you upload, takeoffs, estimates, bids</li>
            <li>Commerce data: cart items, order totals, payment method type (e.g. Apple Pay), shipping address</li>
            <li>Integrations: ECI Spruce credentials you choose to store; AI analysis of plan metadata</li>
            <li>Device/diagnostics: basic app performance logs needed to keep the service reliable</li>
          </ul>
        </Section>

        <Section title="How we use data">
          We use data to operate BuildIQ: authentication, estimating workflows, AI takeoff assistance, material package ordering,
          payment processing via Stripe, and optional Spruce sync. We do not sell personal information.
        </Section>

        <Section title="Payments">
          Card and wallet payments (Apple Pay, Google Pay) are processed by Stripe. BuildIQ does not store full card numbers.
          See Stripe’s privacy policy for processor practices.
        </Section>

        <Section title="AI processing">
          Plan filenames, project size, and related metadata may be processed by AI services (including OpenAI when configured)
          to generate material takeoffs. Do not upload documents you are not authorized to process.
        </Section>

        <Section title="Sharing">
          We share data only with service providers needed to run the app (hosting, Stripe, optional AI/Spruce providers),
          or when required by law. Company workspace data is visible to members of your company account.
        </Section>

        <Section title="Retention & deletion">
          We retain account and job data while your account is active. You may export or delete your account in Settings → Account.
          Apple App Store users can delete their account entirely in-app without contacting support.
        </Section>

        <Section title="Security">
          We use HTTPS, hashed passwords, HTTP-only session cookies, and access controls scoped to your company workspace.
        </Section>

        <Section title="Children">
          BuildIQ is a business tool for construction professionals and is not directed to children under 16.
        </Section>

        <Section title="Your choices">
          Access/export your data, delete your account, and manage Spruce credentials in the app. Contact privacy@buildiq.app for requests.
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
