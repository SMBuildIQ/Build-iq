import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/Button";
import { HeroBand } from "@/components/HeroBand";
import { StatusBadge } from "@/components/StatusBadge";
import { formatAddress, formatCurrency, formatSf, labelStatus, projectStatusTone } from "@/lib/format";
import { mockJobDetails, mockJobs } from "@/lib/mock-data";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const job = mockJobs.find((j) => j.id === id) ?? mockJobDetails[id]?.project;
  return { title: job?.name ?? "Job" };
}

export default async function JobDetailPage({ params }: Props) {
  const { id } = await params;
  const detail =
    mockJobDetails[id] ??
    (mockJobs.find((j) => j.id === id)
      ? {
          project: mockJobs.find((j) => j.id === id)!,
          blueprints: [] as { id: string; name: string; sheets: number; uploadedAt: string }[],
          estimate: {
            materialCost: 0,
            laborCost: 0,
            contingency: 0,
            overhead: 0,
            profit: 0,
            tax: 0,
            grandTotal: mockJobs.find((j) => j.id === id)!.estimateGrandTotal ?? 0,
          },
          takeoff: [] as {
            id: string;
            trade: string;
            item: string;
            qty: number;
            unit: string;
            unitCost: number;
            total: number;
          }[],
          bids: [] as { id: string; vendor: string; amount: number; status: string }[],
        }
      : null);

  if (!detail) notFound();

  const { project, blueprints, estimate, takeoff, bids } = detail;

  return (
    <>
      <HeroBand
        eyebrow={formatAddress(project.address, project.city, project.state)}
        title={project.name}
        support={`${formatSf(project.squareFeet)} · ${project.stories} stor${project.stories === 1 ? "y" : "ies"}`}
        actions={
          <StatusBadge label={labelStatus(project.status)} tone={projectStatusTone(project.status)} />
        }
      />

      <div className="bq-content" style={{ paddingTop: 24 }}>
        <div className="bq-action-row">
          <Button variant="primary">Run AI</Button>
          <Button variant="secondary">Export</Button>
          <Link href="/proposals">
            <Button variant="secondary">Create proposal</Button>
          </Link>
          <Button variant="ghost">Spruce</Button>
        </div>

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
                <p className="bq-body" style={{ color: "var(--bq-text-secondary)", margin: 0 }}>
                  No blueprints uploaded yet.
                </p>
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
              <span className="bq-price" style={{ fontSize: 28, color: "var(--bq-accent-primary)" }}>
                {formatCurrency(estimate.grandTotal)}
              </span>
            </div>
            <div className="bq-muted-panel">
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
            </div>
          </section>
        </div>

        <section className="bq-section">
          <div className="bq-section-head">
            <h2 className="bq-title">Takeoff</h2>
          </div>
          <div className="bq-panel">
            {takeoff.length === 0 ? (
              <p className="bq-body" style={{ color: "var(--bq-text-secondary)", margin: 0 }}>
                Run AI to generate takeoff lines.
              </p>
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
