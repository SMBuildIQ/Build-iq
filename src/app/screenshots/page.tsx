import Link from "next/link";
import { MarketingShell } from "@/components/AppShell";

const shots = [
  { src: "/screenshots/dashboard.png", title: "Jobs", note: "Premium job list with lumber hero band" },
  { src: "/screenshots/shop.png", title: "Shop", note: "Material packages with square filters" },
  { src: "/screenshots/proposals.png", title: "Proposals", note: "Customer proposal portfolio" },
  { src: "/screenshots/project.png", title: "Project", note: "Estimate + blueprints workspace" },
];

export default function ScreenshotsPage() {
  return (
    <MarketingShell>
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <p className="font-hand text-2xl text-[var(--orange-deep)]">Visual tour</p>
        <h1 className="mt-2 font-display text-5xl text-[var(--brown-ink)]">App screenshots</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--sage)]">
          Live captures of the premium Supply Monkey restyle. Open each image full-size if the chat
          viewer fails.
        </p>
        <div className="mt-10 grid gap-8">
          {shots.map((s) => (
            <figure key={s.src} className="site-panel overflow-hidden">
              <div className="border-b border-[var(--line)] px-5 py-4">
                <p className="site-kicker">{s.title}</p>
                <figcaption className="mt-1 text-sm text-[var(--sage)]">{s.note}</figcaption>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <a href={s.src} target="_blank" rel="noreferrer">
                <img src={s.src} alt={s.title} className="w-full bg-[var(--mist)] object-contain" />
              </a>
            </figure>
          ))}
        </div>
        <p className="mt-8 text-sm text-[var(--sage)]">
          <Link href="/login" className="font-semibold text-[var(--orange-deep)]">
            Sign in
          </Link>{" "}
          to use the live app · demo@buildiq.app / demo1234
        </p>
      </main>
    </MarketingShell>
  );
}
