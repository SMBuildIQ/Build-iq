import type { Metadata } from "next";
import { cookies } from "next/headers";
import { depositAmount } from "@buildiq/pricing";
import { Button } from "@/components/Button";
import { DemoNotice } from "@/components/DemoNotice";
import { HeroBand } from "@/components/HeroBand";
import { ListRow } from "@/components/ListRow";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCurrency, labelStatus, proposalStatusTone } from "@/lib/format";
import { fetchJobs, fetchProposals, tokenFromCookieHeader } from "@/lib/data";
import { TOKEN_COOKIE } from "@/lib/cookies";

export const metadata: Metadata = { title: "Proposals" };

export default async function ProposalsPage() {
  const jar = await cookies();
  const token = tokenFromCookieHeader(jar.get(TOKEN_COOKIE)?.value);
  const [{ data: proposals, demo }, { data: jobs }] = await Promise.all([
    fetchProposals(token),
    fetchJobs(token),
  ]);

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
        <DemoNotice show={demo} />
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
                {jobs.map((j) => (
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
          {proposals.map((p) => {
            const pct = p.depositPct > 1 ? p.depositPct / 100 : p.depositPct;
            return (
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
                sub={`Deposit ${formatCurrency(p.depositAmount || depositAmount(p.grandTotal, pct))} (${Math.round(pct * 100)}%)`}
              />
            );
          })}
        </div>
      </div>
    </>
  );
}
