import type { ReactNode } from "react";

export interface HeroBandProps {
  eyebrow: string;
  title: string;
  support?: string;
  actions?: ReactNode;
}

export function HeroBand({ eyebrow, title, support, actions }: HeroBandProps) {
  return (
    <header className="bq-hero" aria-label={title}>
      <div className="bq-hero-bg" aria-hidden="true" />
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
