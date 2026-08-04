import Link from "next/link";
import { MarketingShell } from "@/components/AppShell";
import { LEGAL } from "@/lib/legal";

export const metadata = {
  title: "Support — BuildIQ",
};

export default function SupportPage() {
  const { entityName, addressLines, supportEmail, privacyEmail, productName, policiesAreDrafts } = LEGAL;

  return (
    <MarketingShell>
      <main id="main-content" className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-display text-3xl font-semibold">Support</h1>
        <p className="mt-2 text-sm text-[var(--sage)]">
          We’re here for builders using {productName} on web, iPhone, and Android.
        </p>

        <div className="mt-8 space-y-4 surface p-5 text-sm">
          <p>
            <span className="font-semibold">Operator:</span> {entityName}
          </p>
          <p>
            <span className="font-semibold">Business address:</span>
            <br />
            {addressLines.map((line) => (
              <span key={line}>
                {line}
                <br />
              </span>
            ))}
          </p>
          <p>
            <span className="font-semibold">Support email:</span>{" "}
            <a className="text-[var(--copper-deep)]" href={`mailto:${supportEmail}`}>
              {supportEmail}
            </a>
          </p>
          <p>
            <span className="font-semibold">Privacy / account deletion requests:</span>{" "}
            <a className="text-[var(--copper-deep)]" href={`mailto:${privacyEmail}`}>
              {privacyEmail}
            </a>
          </p>
          <p>
            <span className="font-semibold">Response time:</span> typically within 1–2 business days
          </p>
        </div>

        <h2 className="mt-10 font-display text-xl font-semibold">Common help</h2>
        <ul className="mt-3 space-y-3 text-sm text-[var(--ink-soft)]">
          <li>
            <strong>Delete my account:</strong> Settings → Account → Delete account (in-app path required by Apple).
            You may also email {privacyEmail} with the subject “Account deletion request”.
          </li>
          <li>
            <strong>Export my data:</strong> Settings → Account → Download my data.
          </li>
          <li>
            <strong>Payments:</strong> Apple Pay / Google Pay / card via Stripe. For charge issues, include your order number
            and email {supportEmail}.
          </li>
          <li>
            <strong>AI takeoffs:</strong> Always field-verify quantities before ordering materials or awarding bids.
          </li>
        </ul>

        {policiesAreDrafts && (
          <p className="mt-8 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Privacy Policy and Terms of Service are drafts pending attorney review and are not final published legal policies.
          </p>
        )}

        <p className="mt-10 text-sm text-[var(--sage)]">
          <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link> ·{" "}
          <Link href="/signup">Create account</Link>
        </p>
      </main>
    </MarketingShell>
  );
}
