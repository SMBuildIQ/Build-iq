import Link from "next/link";
import { MarketingShell } from "@/components/AppShell";

export const metadata = {
  title: "Terms of Service — BuildIQ",
};

export default function TermsPage() {
  const entity = process.env.LEGAL_ENTITY_NAME || "BuildIQ";
  const state = process.env.LEGAL_GOVERNING_STATE || "Oregon";
  const legalEmail = process.env.LEGAL_EMAIL || "legal@buildiq.app";

  return (
    <MarketingShell>
      <main id="main-content" className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-display text-3xl font-semibold">Terms of Service</h1>
        <p className="mt-2 text-sm text-[var(--sage)]">Last updated: August 4, 2026</p>

        <Section title="Agreement">
          By creating a {entity} account or using the app, you agree to these Terms on behalf of yourself and your company.
        </Section>

        <Section title="The service">
          BuildIQ provides estimating tools, AI-assisted takeoffs, bid packages, material package ordering, and optional ECI Spruce sync.
          Estimates and AI outputs are decision-support tools — not stamped engineering, architectural, or bidding guarantees.
          You must field-verify quantities before purchasing or awarding work. AI outputs are drafts until reviewed.
        </Section>

        <Section title="Accounts">
          You are responsible for account credentials and activity under your company workspace. Invite only authorized team members.
          You must accept the Privacy Policy at signup and verify your email when prompted.
        </Section>

        <Section title="Acceptable use">
          Do not upload unlawful content, attempt to break security, misuse payment features, scrape the service, or process plans you lack rights to use.
        </Section>

        <Section title="Orders, payments & refunds">
          Material package purchases are for physical/construction materials fulfillment. Payments may use Apple Pay, Google Pay, or card via Stripe.
          Refunds for undelivered or incorrect materials are handled case-by-case via support.
        </Section>

        <Section title="Subscriptions / stores">
          If you download BuildIQ from the Apple App Store or Google Play, those platforms’ standard EULA terms also apply.
          Physical goods are processed outside Apple/Google IAP where permitted.
        </Section>

        <Section title="Intellectual property">
          BuildIQ software and branding remain ours. Your plan files and job data remain yours. You grant a limited license to process that data to provide the service.
        </Section>

        <Section title="Disclaimer">
          THE SERVICE IS PROVIDED “AS IS.” TO THE MAXIMUM EXTENT ALLOWED BY LAW, WE DISCLAIM WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
        </Section>

        <Section title="Limitation of liability">
          To the maximum extent allowed by law, {entity}’s total liability for claims relating to the service is limited to the amounts you paid us in the three months before the claim.
        </Section>

        <Section title="Governing law">
          These Terms are governed by the laws of the State of {state}, USA, excluding conflict-of-law rules, unless mandatory local consumer law provides otherwise.
        </Section>

        <Section title="Termination">
          You may delete your account anytime in Settings. We may terminate access for Terms violations.
        </Section>

        <Section title="Contact">
          Questions: <a href={`mailto:${legalEmail}`}>{legalEmail}</a>
        </Section>

        <p className="mt-10 text-sm text-[var(--sage)]">
          <Link href="/privacy">Privacy Policy</Link> · <Link href="/support">Support</Link>
        </p>
      </main>
    </MarketingShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">{children}</p>
    </section>
  );
}
