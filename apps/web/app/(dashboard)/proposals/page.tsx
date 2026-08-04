import type { Metadata } from "next";
import { depositAmount } from "@buildiq/pricing";
import { Button } from "@/components/Button";
import { HeroBand } from "@/components/HeroBand";
import { ListRow } from "@/components/ListRow";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCurrency, labelStatus, proposalStatusTone } from "@/lib/format";
import { mockJobs, mockProposals } from "@/lib/mock-data";

export const metadata: Metadata = { title: "Proposals" };

export default function ProposalsPage() {
  return (
    <>
      <HeroBand
        eyebrow="Customer-facing"
        title="Proposals"
        support="Compose packages from job takeoffs — PDF, send, and track acceptance."
        actions={
          <Button variant="inverse" type="button">
            Create
          </Button>
        }
      />

      <div className="bq-content" style={{ paddingTop: 32 }}>
        <section className="bq-muted-panel" style={{ marginBottom: 24 }}>
          <p className="bq-label" style={{ marginBottom: 12 }}>
            Compose
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
            <div className="bq-field" style={{ flex: "1 1 240px" }}>
              <label htmlFor="project">Project</label>
              <select id="project" className="bq-input" defaultValue="">
                <option value="" disabled>
                  Select a job…
                </option>
                {mockJobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.name}
                  </option>
                ))}
              </select>
            </div>
            <Button variant="primary" type="button">
              Create proposal
            </Button>
          </div>
        </section>

        <div className="bq-list">
          {mockProposals.map((p) => (
            <ListRow
              key={p.id}
              href={`/proposals/${p.id}`}
              title={`${p.number} · ${p.title}`}
              badge={<StatusBadge label={labelStatus(p.status)} tone={proposalStatusTone(p.status)} />}
              meta={
                <>
                  <span>{p.customerName ?? "Customer TBD"}</span>
                  <span>{p.sectionCount} categories</span>
                </>
              }
              price={formatCurrency(p.grandTotal)}
              sub={`Deposit ${formatCurrency(depositAmount(p.grandTotal, p.depositPct / 100))} (${p.depositPct}%)`}
            />
          ))}
        </div>
      </div>
    </>
  );
}
