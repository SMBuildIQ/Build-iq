import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { BlueprintHeroArt } from "@/components/BlueprintHeroArt";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const user = await getSession();
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen hero-wash">
      <AppNav />

      <main>
        <section className="relative mx-auto grid min-h-[calc(100vh-73px)] max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:py-0">
          <div>
            <p className="animate-rise font-display text-5xl font-semibold leading-[0.95] tracking-tight text-[var(--ink)] sm:text-6xl md:text-7xl">
              BuildIQ
            </p>
            <h1 className="animate-rise-delay-1 mt-5 max-w-xl text-2xl font-medium leading-snug text-[var(--ink-soft)] sm:text-3xl">
              Residential takeoffs that build themselves.
            </h1>
            <p className="animate-rise-delay-2 mt-4 max-w-md text-base leading-relaxed text-[var(--sage)]">
              Upload blueprints. AI finds the materials. You get a cost estimate, bid packages, Excel export, and ECI Spruce sync.
            </p>
            <div className="animate-rise-delay-2 mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="btn-copper">
                Create account
              </Link>
              <Link href="/login" className="btn-secondary">
                Sign in
              </Link>
            </div>
          </div>

          <div className="relative animate-rise-delay-1">
            <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-gradient-to-br from-[var(--copper)]/10 via-transparent to-[var(--sage)]/20" />
            <BlueprintHeroArt />
          </div>
        </section>

        <section id="how" className="border-t border-[var(--line)] bg-[var(--ink)] text-[var(--paper)]">
          <div className="mx-auto max-w-6xl px-5 py-20">
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">One path from plan to price</h2>
            <p className="mt-3 max-w-xl text-[var(--mist)]">
              BuildIQ replaces spreadsheet takeoffs with a single workflow built for residential builders.
            </p>

            <ol className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  step: "01",
                  title: "Upload blueprints",
                  body: "Drop PDF or image plan sets. BuildIQ classifies sheets and prepares them for takeoff.",
                },
                {
                  step: "02",
                  title: "AI material ID",
                  body: "Vision-ready AI maps framing, finishes, MEP, and more to a Spruce-linked catalog.",
                },
                {
                  step: "03",
                  title: "Estimate & bids",
                  body: "Cost rollups with waste, labor, contingency, and trade-ready bid packages.",
                },
                {
                  step: "04",
                  title: "Excel & Spruce",
                  body: "Export the full workbook or push a quote into ECI Spruce inventory and pricing.",
                },
              ].map((item) => (
                <li key={item.step}>
                  <p className="text-xs font-semibold tracking-[0.2em] text-[var(--copper)]">{item.step}</p>
                  <h3 className="mt-3 font-display text-xl font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--mist)]">{item.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <footer className="border-t border-[var(--line)] px-5 py-8 text-center text-sm text-[var(--sage)]">
          BuildIQ · Residential construction estimating · ECI Spruce connected
        </footer>
      </main>
    </div>
  );
}
