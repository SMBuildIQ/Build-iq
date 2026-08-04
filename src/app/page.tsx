import Link from "next/link";
import { MarketingShell } from "@/components/AppShell";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const user = await getSession();
  if (user) redirect("/dashboard");

  return (
    <MarketingShell transparent>
      <main id="main-content">
        <section className="sm-hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/hero.jpg"
            alt="Lumber yard stacks at Supply Monkey"
            className="sm-hero__media"
          />
          <div className="sm-hero__overlay" />
          <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center px-4 pb-16 pt-10 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/logo-iq.png"
              alt="Supply Monkey IQ"
              className="animate-rise h-16 w-auto sm:h-20"
            />
            <p className="font-hand animate-rise-delay-1 mt-6 text-2xl text-[var(--orange)] sm:text-3xl">
              No more monkey business
            </p>
            <h1 className="animate-rise-delay-1 mt-3 font-display text-4xl text-[var(--orange)] sm:text-5xl md:text-6xl">
              BuildIQ for builders
            </h1>
            <p className="animate-rise-delay-2 mx-auto mt-4 max-w-lg text-base leading-relaxed text-white/95">
              Estimating from Supply Monkey — upload plans, run AI takeoffs, order packages, and keep your crew aligned.
              Premium materials. Aligned supply. Prescott, Arizona.
            </p>
            <div className="animate-rise-delay-2 mt-8 flex w-full max-w-sm flex-col gap-3">
              <Link href="/signup" className="btn-copper w-full !py-3.5 !text-lg">
                Builder signup
              </Link>
              <Link href="/login" className="btn-secondary w-full !border-white !text-white hover:!bg-white hover:!text-[var(--brown)] !py-3.5 !text-lg">
                Sign in
              </Link>
            </div>
          </div>
        </section>

        <section id="how" className="mx-auto max-w-3xl px-4 py-14">
          <p className="font-hand text-center text-xl text-[var(--orange)]">How it works</p>
          <h2 className="mt-2 text-center font-display text-3xl text-[var(--brown)] sm:text-4xl">
            From plans to packages
          </h2>
          <ol className="mt-10 space-y-8">
            {[
              ["01", "Company signs up", "Create your Supply Monkey builder workspace in under a minute."],
              ["02", "Invite your crew", "Share invite links so estimators join the same jobs."],
              ["03", "Estimate on site", "Upload plans, run AI takeoff, export Excel, sync ECI Spruce."],
              ["04", "Shop materials", "Order lumber, doors, windows, and more — track every delivery."],
            ].map(([step, title, body]) => (
              <li key={step} className="flex gap-4 border-l-4 border-[var(--orange)] pl-4">
                <span className="font-display text-2xl text-[var(--orange)]">{step}</span>
                <div>
                  <h3 className="font-display text-xl text-[var(--brown)]">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--sage)]">{body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-12 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/banana-icon.png" alt="" className="h-10 w-10 opacity-90" />
          </div>
          <p className="mt-4 text-center text-sm text-[var(--sage)]">
            Materials · Takeoffs · Delivery —{" "}
            <a
              href="https://supplymonkeyco.com"
              className="font-semibold text-[var(--orange)] underline-offset-2 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              supplymonkeyco.com
            </a>
          </p>
        </section>
      </main>
    </MarketingShell>
  );
}
