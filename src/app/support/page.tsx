import Link from "next/link";
import { MarketingShell } from "@/components/AppShell";

export const metadata = {
  title: "Support — BuildIQ",
};

export default function SupportPage() {
  return (
    <MarketingShell>
      <main id="main-content" className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-display text-3xl font-semibold">Support</h1>
        <p className="mt-2 text-sm text-[var(--sage)]">
          We’re here for builders using BuildIQ on web, iPhone, and Android.
        </p>

        <div className="mt-8 space-y-4 rounded-2xl border border-[var(--line)] bg-white/55 p-5 text-sm">
          <p>
            <span className="font-semibold">Email:</span>{" "}
            <a className="text-[var(--copper-deep)]" href="mailto:support@buildiq.app">
              support@buildiq.app
            </a>
          </p>
          <p>
            <span className="font-semibold">Privacy requests:</span>{" "}
            <a className="text-[var(--copper-deep)]" href="mailto:privacy@buildiq.app">
              privacy@buildiq.app
            </a>
          </p>
          <p>
            <span className="font-semibold">Response time:</span> typically within 1–2 business days
          </p>
        </div>

        <h2 className="mt-10 font-display text-xl font-semibold">Common help</h2>
        <ul className="mt-3 space-y-3 text-sm text-[var(--ink-soft)]">
          <li>
            <strong>Delete my account:</strong> Settings → Account → Delete account (required Apple path).
          </li>
          <li>
            <strong>Export my data:</strong> Settings → Account → Download my data.
          </li>
          <li>
            <strong>Payments:</strong> Apple Pay / Google Pay / card via Stripe. For charge issues, include your order number.
          </li>
          <li>
            <strong>AI takeoffs:</strong> Always field-verify quantities before ordering materials or awarding bids.
          </li>
        </ul>

        <p className="mt-10 text-sm text-[var(--sage)]">
          <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link> ·{" "}
          <Link href="/signup">Create account</Link>
        </p>
      </main>
    </MarketingShell>
  );
}
