import Link from "next/link";
import { MarketingShell } from "@/components/AppShell";
import { BlueprintHeroArt } from "@/components/BlueprintHeroArt";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const user = await getSession();
  if (user) redirect("/dashboard");

  return (
    <MarketingShell>
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-8">
        <section className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon-192.png"
            alt="BuildIQ"
            className="mx-auto h-24 w-24 rounded-[1.35rem] shadow-lg shadow-[var(--copper)]/20 animate-rise"
          />
          <p className="animate-rise mt-6 font-display text-5xl font-semibold tracking-tight text-[var(--ink)]">
            BuildIQ
          </p>
          <h1 className="animate-rise-delay-1 mx-auto mt-3 max-w-sm text-xl font-medium leading-snug text-[var(--ink-soft)]">
            Residential takeoffs that build themselves.
          </h1>
          <p className="animate-rise-delay-2 mx-auto mt-3 max-w-md text-sm leading-relaxed text-[var(--sage)]">
            Upload blueprints. AI finds materials. Get estimates, bid packages, Excel export, and ECI Spruce sync — as an installable app.
          </p>
          <div className="animate-rise-delay-2 mt-8 flex flex-col gap-3 sm:mx-auto sm:max-w-xs">
            <Link href="/register" className="btn-copper w-full !rounded-xl !py-3.5">
              Open BuildIQ
            </Link>
            <Link href="/login" className="btn-secondary w-full !rounded-xl !py-3.5">
              Sign in
            </Link>
          </div>
          <p className="mt-4 text-xs text-[var(--sage)]">
            Demo: demo@buildiq.app / demo1234
          </p>
        </section>

        <div className="relative mt-10 animate-rise-delay-1">
          <BlueprintHeroArt />
        </div>

        <section id="how" className="mt-12 rounded-2xl bg-[var(--ink)] px-5 py-8 text-[var(--paper)]">
          <h2 className="font-display text-2xl font-semibold">How the app works</h2>
          <ol className="mt-6 space-y-5">
            {[
              ["01", "Upload blueprints", "Drop PDF or image plan sets from your phone or desktop."],
              ["02", "AI material ID", "BuildIQ maps framing, finishes, and MEP to Spruce SKUs."],
              ["03", "Estimate & bids", "Cost rollups plus trade-ready subcontractor packages."],
              ["04", "Excel & Spruce", "Export the workbook or push a quote into ECI Spruce."],
            ].map(([step, title, body]) => (
              <li key={step} className="flex gap-4">
                <span className="text-xs font-semibold tracking-[0.2em] text-[var(--copper)]">{step}</span>
                <div>
                  <h3 className="font-display text-lg font-semibold">{title}</h3>
                  <p className="mt-1 text-sm text-[var(--mist)]">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </MarketingShell>
  );
}
