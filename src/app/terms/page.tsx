import Link from "next/link";
import { MarketingShell } from "@/components/AppShell";
import { LEGAL, draftPolicyBanner } from "@/lib/legal";

export const metadata = {
  title: "Terms of Service (Draft) — BuildIQ",
  robots: LEGAL.policiesAreDrafts ? { index: false, follow: false } : undefined,
};

export default function TermsPage() {
  const {
    entityName,
    addressLines,
    governingState,
    governingCountry,
    legalEmail,
    productName,
    policiesAreDrafts,
  } = LEGAL;

  return (
    <MarketingShell>
      <main id="main-content" className="mx-auto max-w-2xl px-4 py-10">
        {policiesAreDrafts && (
          <p
            className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950"
            role="status"
          >
            {draftPolicyBanner()}
          </p>
        )}

        <h1 className="mt-6 font-display text-3xl font-semibold">
          Terms of Service{policiesAreDrafts ? " (Draft)" : ""}
        </h1>
        <p className="mt-2 text-sm text-[var(--sage)]">Last updated: August 4, 2026</p>

        <Section title="Agreement">
          By creating a {productName} account or using the app, you agree to these Terms on behalf of yourself and your company
          with <strong>{entityName}</strong>.
        </Section>

        <Section title="Operator">
          {productName} is provided by {entityName}.
          <br />
          {addressLines.map((line) => (
            <span key={line}>
              {line}
              <br />
            </span>
          ))}
          Legal contact: <a href={`mailto:${legalEmail}`}>{legalEmail}</a>.
        </Section>

        <Section title="The service">
          {productName} provides estimating tools, AI-assisted takeoffs, bid packages, material package ordering, and optional ECI Spruce sync.
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
          Refunds for undelivered or incorrect materials are handled case-by-case via support at{" "}
          <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a>.
        </Section>

        <Section title="Subscriptions / stores">
          If you download {productName} from the Apple App Store or Google Play, those platforms’ standard EULA terms also apply.
          Physical goods are processed outside Apple/Google IAP where permitted.
        </Section>

        <Section title="Intellectual property">
          {productName} software and branding remain ours. Your plan files and job data remain yours. You grant a limited license to process that data to provide the service.
        </Section>

        <Section title="Disclaimer">
          THE SERVICE IS PROVIDED “AS IS.” TO THE MAXIMUM EXTENT ALLOWED BY LAW, WE DISCLAIM WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
        </Section>

        <Section title="Limitation of liability">
          To the maximum extent allowed by law, {entityName}’s total liability for claims relating to the service is limited to the amounts you paid us in the three months before the claim.
        </Section>

        <Section title="Governing law">
          These Terms are governed by the laws of the State of {governingState}, {governingCountry}, excluding conflict-of-law rules,
          unless mandatory local consumer law provides otherwise. Courts located in {governingState}, {governingCountry}, have exclusive
          jurisdiction for disputes arising from these Terms, except where arbitration or small-claims venues are required by applicable law or platform rules.
        </Section>

        <Section title="Termination">
          You may delete your account anytime in Settings. We may terminate access for Terms violations.
        </Section>

        <Section title="Legal notice">
          {policiesAreDrafts
            ? "These Terms are a draft generated for engineering readiness. They require review and approval by qualified legal counsel before use as a final, published customer agreement or store listing policy."
            : `These Terms are maintained by ${entityName}.`}
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
