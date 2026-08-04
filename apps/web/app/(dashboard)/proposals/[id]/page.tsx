import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Button } from "@/components/Button";
import { DemoNotice } from "@/components/DemoNotice";
import { HeroBand } from "@/components/HeroBand";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCurrency, labelStatus, proposalStatusTone } from "@/lib/format";
import { TOKEN_COOKIE } from "@/lib/cookies";
import { fetchProposalDetail, tokenFromCookieHeader } from "@/lib/data";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const jar = await cookies();
  const token = tokenFromCookieHeader(jar.get(TOKEN_COOKIE)?.value);
  const { data } = await fetchProposalDetail(id, token);
  return { title: data?.summary.number ?? "Proposal" };
}

export default async function ProposalDetailPage({ params }: Props) {
  const { id } = await params;
  const jar = await cookies();
  const token = tokenFromCookieHeader(jar.get(TOKEN_COOKIE)?.value);
  const { data: detail, demo } = await fetchProposalDetail(id, token);

  if (!detail) notFound();

  const { summary, sections, acceptedAt } = detail;

  return (
    <>
      <HeroBand
        eyebrow={summary.customerName ?? "Proposal"}
        title={summary.number}
        support={summary.title}
        actions={
          <div style={{ textAlign: "right" }}>
            <div className="bq-price" style={{ fontSize: 40, color: "var(--bq-accent-primary)" }}>
              {formatCurrency(summary.grandTotal)}
            </div>
            <p className="bq-body" style={{ color: "rgba(255,253,249,0.7)", margin: "4px 0 0" }}>
              Deposit {formatCurrency(summary.depositAmount)}
            </p>
          </div>
        }
      />

      <div className="bq-content" style={{ paddingTop: 24 }}>
        <DemoNotice show={demo} />
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
          <StatusBadge label={labelStatus(summary.status)} tone={proposalStatusTone(summary.status)} />
          {acceptedAt ? (
            <span className="bq-body" style={{ color: "var(--bq-text-secondary)" }}>
              Accepted {acceptedAt.slice(0, 10)}
            </span>
          ) : null}
        </div>

        <div className="bq-action-row">
          <Button variant="primary">PDF</Button>
          <Button variant="secondary">Send</Button>
          <Button variant="secondary">Copy link</Button>
          <Button variant="ghost">Edit</Button>
        </div>

        {sections.length === 0 ? (
          <div className="bq-panel">
            <p className="bq-body" style={{ margin: 0, color: "var(--bq-text-secondary)" }}>
              No line items yet.
            </p>
          </div>
        ) : (
          sections.map((section) => (
            <section key={section.category} className="bq-section">
              <div className="bq-section-head">
                <h2 className="bq-title">{section.category}</h2>
              </div>
              <div className="bq-panel">
                <table className="bq-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Qty</th>
                      <th>Unit</th>
                      <th>Unit price</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.lines.map((line, i) => (
                      <tr key={`${section.category}-${i}`}>
                        <td>{line.description}</td>
                        <td>{line.qty}</td>
                        <td>{line.unit}</td>
                        <td>{formatCurrency(line.unitPrice)}</td>
                        <td>{formatCurrency(line.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))
        )}
      </div>
    </>
  );
}
