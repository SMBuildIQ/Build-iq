import Link from "next/link";
import type { ReactNode } from "react";

export interface ListRowProps {
  href?: string;
  title: string;
  badge?: ReactNode;
  meta?: ReactNode;
  price?: ReactNode;
  sub?: ReactNode;
}

export function ListRow({ href, title, badge, meta, price, sub }: ListRowProps) {
  const content = (
    <>
      <div className="bq-list-row-main">
        <div className="bq-list-row-title-row">
          <span className="bq-list-row-title">{title}</span>
          {badge}
        </div>
        {meta ? <div className="bq-list-row-meta">{meta}</div> : null}
      </div>
      {(price != null || sub != null) && (
        <div className="bq-list-row-trail">
          {price != null ? <div className="bq-list-row-price">{price}</div> : null}
          {sub != null ? <div className="bq-list-row-sub">{sub}</div> : null}
        </div>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className="bq-list-row">
        {content}
      </Link>
    );
  }

  return <div className="bq-list-row">{content}</div>;
}
