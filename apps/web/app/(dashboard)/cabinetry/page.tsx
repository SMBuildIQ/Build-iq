import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/Button";
import { HeroBand } from "@/components/HeroBand";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCurrency } from "@/lib/format";
import { mockCabinetryOpps } from "@/lib/mock-data";
import type { BadgeTone } from "@/lib/format";

export const metadata: Metadata = { title: "Cabinetry" };

function stageTone(stage: string): BadgeTone {
  if (stage.toLowerCase().includes("accept")) return "success";
  if (stage.toLowerCase().includes("lead")) return "draft";
  return "progress";
}

const PRODUCT_LINES = [
  { name: "Shaker Oak — Studio", finish: "White oak / clear", lead: "18–24 days" },
  { name: "Paint-grade inset", finish: "MDF / enamel", lead: "14–18 days" },
  { name: "Flat-panel walnut", finish: "Walnut / oil", lead: "21–28 days" },
];

export default function CabinetryPage() {
  return (
    <>
      <HeroBand
        eyebrow="Millwork studio"
        title="Cabinetry"
        support="Opportunities, product lines, and proposal handoff for cabinetry sales."
        actions={
          <Link href="/proposals">
            <Button variant="inverse">Open proposals</Button>
          </Link>
        }
      />

      <div className="bq-content" style={{ paddingTop: 32 }}>
        <section className="bq-section" style={{ marginTop: 0 }}>
          <div className="bq-section-head">
            <h2 className="bq-title">Opportunities</h2>
          </div>
          <div className="bq-panel">
            <table className="bq-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Product line</th>
                  <th>Stage</th>
                  <th>Designer</th>
                  <th>Value</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {mockCabinetryOpps.map((opp) => (
                  <tr key={opp.id}>
                    <td>{opp.projectName}</td>
                    <td>{opp.productLine}</td>
                    <td>
                      <StatusBadge label={opp.stage} tone={stageTone(opp.stage)} />
                    </td>
                    <td>{opp.designer}</td>
                    <td>{formatCurrency(opp.value)}</td>
                    <td className="bq-mono">{opp.updatedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bq-section">
          <div className="bq-section-head">
            <h2 className="bq-title">Product lines</h2>
          </div>
          <div className="bq-grid-3">
            {PRODUCT_LINES.map((line) => (
              <div key={line.name} className="bq-panel">
                <p className="bq-label" style={{ color: "var(--bq-accent-primary)", marginBottom: 8 }}>
                  Line
                </p>
                <h3 className="bq-title" style={{ fontSize: 24 }}>
                  {line.name}
                </h3>
                <p className="bq-body" style={{ color: "var(--bq-text-secondary)", margin: "12px 0 4px" }}>
                  {line.finish}
                </p>
                <p className="bq-mono" style={{ color: "var(--bq-text-muted)", margin: 0 }}>
                  Lead {line.lead}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
