import Link from "next/link";
import { MarketingShell } from "@/components/AppShell";

export const metadata = {
  title: "Terms of Service — BuildIQ",
};

export default function TermsPage() {
  return (
    <MarketingShell>
      <main id="main-content" className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-display text-3xl font-semibold">Terms of Service</h1>
        <p className="mt-2 text-sm text-[var(--sage)]">Last updated: August 4, 2026</p>

        <Section title="Agreement">
          By creating a BuildIQ account or using the app, you agree to these Terms on behalf of yourself and your company.
          Replace governing-law placeholders with your operating entity before store submission.
        </Section>

        <Section title="The service">
          BuildIQ provides estimating tools, AI-assisted takeoffs, bid packages, material package ordering, and optional ECI Spruce sync.
          Estimates and AI outputs are decision-support tools — not stamped engineering, architectural, or bidding guarantees.
          You must field-verify quantities before purchasing or awarding work. AI outputs may contain errors; you remain responsible
          for job costs and purchasing decisions.
        </Section>

        <Section title="Accounts">
          You are responsible for account credentials and for activity under your company workspace. Invite only authorized team members.
          You must provide accurate company information and keep it updated. You must accept the Privacy Policy at signup.
        </Section>

        <Section title="Acceptable use">
          Do not upload unlawful content, attempt to break security, misuse payment features, scrape the service, or process plans you lack rights to use.
          We may suspend accounts that abuse the service or create risk for other customers.
        </Section>

        <Section title="Orders, payments & refunds">
          Material package purchases are for physical/construction materials fulfillment workflows. Payments may use Apple Pay, Google Pay, or card via Stripe.
          Taxes shown are estimates. Delivery timing depends on suppliers and tracking status in the app.
          Refunds for undelivered or incorrect material packages are handled case-by-case via support; digital estimating features are provided as a software service and are non-refundable except where required by law.
        </Section>

        <Section title="Subscriptions / stores">
          If you download BuildIQ from the Apple App Store or Google Play, those platforms’ standard EULA terms also apply to the distribution of the client app.
          In-app purchases of physical goods are processed outside Apple/Google IAP where permitted for physical goods.
        </Section>

        <Section title="Intellectual property">
          BuildIQ software and branding remain ours. Your plan files and job data remain yours. You grant us a limited license to process that data to provide the service.
        </Section>

        <Section title="Disclaimer">
          THE SERVICE IS PROVIDED “AS IS.” TO THE MAXIMUM EXTENT ALLOWED BY LAW, WE DISCLAIM WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
          AI takeoffs may contain errors.
        </Section>

        <Section title="Limitation of liability">
          To the maximum extent allowed by law, BuildIQ’s total liability for claims relating to the service is limited to the amounts you paid us in the three months before the claim.
          We are not liable for indirect, incidental, or consequential damages, including job cost overruns.
        </Section>

        <Section title="Governing law">
          These Terms are governed by the laws of the State of [Your State], USA, excluding conflict-of-law rules, unless mandatory local consumer law provides otherwise.
          Courts in that state have exclusive jurisdiction for disputes, except where arbitration or small-claims venues are required by applicable platform or consumer rules.
        </Section>

        <Section title="Termination">
          You may delete your account anytime in Settings. We may terminate access for Terms violations. Surviving clauses include IP, disclaimer, and liability limits.
        </Section>

        <Section title="Contact">
          Questions: <a href="mailto:legal@buildiq.app">legal@buildiq.app</a>
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
