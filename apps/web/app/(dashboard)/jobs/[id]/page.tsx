import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Button } from "@/components/Button";
import { DemoNotice } from "@/components/DemoNotice";
import { HeroBand } from "@/components/HeroBand";
import { RunAiButton } from "@/components/RunAiButton";
import { StatusBadge } from "@/components/StatusBadge";
import { formatAddress, formatCurrency, formatSf, labelStatus, projectStatusTone } from "@/lib/format";
import { TOKEN_COOKIE } from "@/lib/cookies";
import { fetchJobDetail, tokenFromCookieHeader } from "@/lib/data";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const jar = await cookies();
  const token = tokenFromCookieHeader(jar.get(TOKEN_COOKIE)?.value);
  const { data } = await fetchJobDetail(id, token);
  return { title: data?.project.name ?? "Job" };
}

export default async function JobDetailPage({ params }: Props) {
  const { id } = await params;
  const jar = await cookies();
  const token = tokenFromCookieHeader(jar.get(TOKEN_COOKIE)?.value);
  const { data: detail, demo } = await fetchJobDetail(id, token);

  if (!detail) notFound();

  const { project, blueprints, estimate, takeoff, bids } = detail;
  const hasEstimateBreakdown =
    estimate.materialCost > 0 ||
    estimate.laborCost > 0 ||
    estimate.grandTotal > 0;

  return (
    <>
      <HeroBand
        tone="jobDetail"
        eyebrow={formatAddress(project.address, project.city, project.state)}
        title={project.name}
        support={`${formatSf(project.squareFeet)} · ${project.stories} stor${project.stories === 1 ? "y" : "ies"}`}
        actions={
          <StatusBadge label={labelStatus(project.status)} tone={projectStatusTone(project.status)} />
        }
      />

      <div className="bq-content" style={{ paddingTop: 24 }}>
        <DemoNotice show={demo} />
        <div className="bq-action-row">
          <RunAiButton projectId={project.id} />
          <Button variant="secondary">Export</Button>
          <Link href="/proposals">
            <Button variant="secondary">Create proposal</Button>
          </Link>
          <Button variant="ghost">Spruce</Button>
        </div>

        {/* W3 — desktop grid: blueprints | estimate; takeoff full width below */}
        <div className="bq-grid-2">
          <section className="bq-section" style={{ marginTop: 8 }}>
            <div className="bq-section-head">
              <h2 className="bq-title">Blueprints</h2>
              <span className="bq-label" style={{ color: "var(--bq-text-muted)" }}>
                {blueprints.length} sets
              </span>
            </div>
            <div className="bq-panel">
              {blueprints.length === 0 ? (
                <div className="bq-empty" style={{ padding: "32px 16px" }}>
                  <p className="bq-hand" style={{ color: "var(--bq-accent-primary)", fontSize: 20 }}>
                    Plans await
                  </p>
                  <p className="bq-body" style={{ color: "var(--bq-text-secondary)", margin: "8px 0 0" }}>
                    No blueprints uploaded yet. Upload a plan set to begin takeoff.
                  </p>
                </div>
              ) : (
                <table className="bq-table">
                  <thead>
                    <tr>
                      <th>Set</th>
                      <th>Sheets</th>
                      <th>Uploaded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blueprints.map((bp) => (
                      <tr key={bp.id}>
                        <td>{bp.name}</td>
                        <td>{bp.sheets}</td>
                        <td className="bq-mono">{bp.uploadedAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          <section className="bq-section" style={{ marginTop: 8 }}>
            <div className="bq-section-head">
              <h2 className="bq-title">Cost estimate</h2>
              {hasEstimateBreakdown ? (
                <span className="bq-price" style={{ fontSize: 28, color: "var(--bq-accent-primary)" }}>
                  {formatCurrency(estimate.grandTotal)}
                </span>
              ) : null}
            </div>
            <div className="bq-muted-panel">
              {!hasEstimateBreakdown ? (
                <div className="bq-empty" style={{ padding: "32px 16px" }}>
                  <p className="bq-hand" style={{ color: "var(--bq-accent-primary)", fontSize: 20 }}>
                    No estimate yet
                  </p>
                  <p className="bq-body" style={{ color: "var(--bq-text-secondary)", margin: "8px 0 0" }}>
                    Run AI takeoff to generate material and labor totals.
                  </p>
                </div>
              ) : (
                <table className="bq-table">
                  <tbody>
                    {(
                      [
                        ["Material", estimate.materialCost],
                        ["Labor", estimate.laborCost],
                        ["Contingency", estimate.contingency],
                        ["Overhead", estimate.overhead],
                        ["Profit", estimate.profit],
                        ["Tax", estimate.tax],
                      ] as const
                    ).map(([label, value]) => (
                      <tr key={label}>
                        <td>{label}</td>
                        <td style={{ textAlign: "right" }}>{formatCurrency(value)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td>
                        <strong>Grand total</strong>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <strong style={{ color: "var(--bq-accent-primary)" }}>
                          {formatCurrency(estimate.grandTotal)}
                        </strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>

        <section className="bq-section">
          <div className="bq-section-head">
            <h2 className="bq-title">Takeoff</h2>
          </div>
          <div className="bq-panel">
            {takeoff.length === 0 ? (
              <div className="bq-empty" style={{ padding: "32px 16px" }}>
                <p className="bq-hand" style={{ color: "var(--bq-accent-primary)", fontSize: 20 }}>
                  Empty takeoff
                </p>
                <p className="bq-body" style={{ color: "var(--bq-text-secondary)", margin: "8px 0 0" }}>
                  Run AI to generate takeoff lines from uploaded plans.
                </p>
              </div>
            ) : (
              <table className="bq-table">
                <thead>
                  <tr>
                    <th>Trade</th>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Unit</th>
                    <th>Unit cost</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {takeoff.map((line) => (
                    <tr key={line.id}>
                      <td>{line.trade}</td>
                      <td>{line.item}</td>
                      <td>{line.qty}</td>
                      <td>{line.unit}</td>
                      <td>{formatCurrency(line.unitCost)}</td>
                      <td>{formatCurrency(line.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="bq-section">
          <div className="bq-section-head">
            <h2 className="bq-title">Bids</h2>
          </div>
          <div className="bq-list">
            {bids.length === 0 ? (
              <div className="bq-list-row">
                <div className="bq-list-row-main">
                  <span className="bq-body" style={{ color: "var(--bq-text-secondary)" }}>
                    No bids yet.
                  </span>
                </div>
              </div>
            ) : (
              bids.map((bid) => (
                <div key={bid.id} className="bq-list-row">
                  <div className="bq-list-row-main">
                    <div className="bq-list-row-title-row">
                      <span className="bq-list-row-title" style={{ fontSize: 20 }}>
                        {bid.vendor}
                      </span>
                      <StatusBadge label={bid.status} tone={bid.status === "Pending" ? "progress" : "success"} />
                    </div>
                  </div>
                  <div className="bq-list-row-trail">
                    <div className="bq-list-row-price">{formatCurrency(bid.amount)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </>
  );
}
