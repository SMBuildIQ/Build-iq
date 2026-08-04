import type { CSSProperties, ReactNode } from "react";
import { heroPhoto, type HeroTone } from "@buildiq/design-tokens";

export interface HeroBandProps {
  eyebrow: string;
  title: string;
  support?: string;
  actions?: ReactNode;
  /** Theme photo matched to Supply Monkey site content */
  tone?: HeroTone;
}

export function HeroBand({
  eyebrow,
  title,
  support,
  actions,
  tone = "jobs",
}: HeroBandProps) {
  const photo = heroPhoto(tone);
  const bgStyle = {
    ["--bq-hero-image" as string]: `url("${photo.path}")`,
  } as CSSProperties;

  return (
    <header className="bq-hero" aria-label={title}>
      <div className="bq-hero-bg" style={bgStyle} aria-hidden="true" />
      <span className="sr-only">{photo.alt}</span>
      <div className="bq-hero-inner">
        <div className="bq-hero-copy">
          <p className="bq-hand">{eyebrow}</p>
          <h1 className="bq-display">{title}</h1>
          {support ? <p className="bq-hero-support bq-body">{support}</p> : null}
        </div>
        {actions ? <div className="bq-hero-actions">{actions}</div> : null}
      </div>
    </header>
  );
}
