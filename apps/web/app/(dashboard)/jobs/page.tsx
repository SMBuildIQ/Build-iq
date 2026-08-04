import type { Metadata } from "next";
import { Button } from "@/components/Button";
import { HeroBand } from "@/components/HeroBand";
import { ListRow } from "@/components/ListRow";
import { StatusBadge } from "@/components/StatusBadge";
import { formatAddress, formatCurrency, formatSf, labelStatus, projectStatusTone } from "@/lib/format";
import { mockJobs, mockSession } from "@/lib/mock-data";

export const metadata: Metadata = { title: "Jobs" };

export default function JobsPage() {
  return (
    <>
      <HeroBand
        eyebrow={mockSession.companyName ?? "Your company"}
        title="Jobs"
        support="Plans, takeoffs, and bids — one millwork-grade ledger for every active project."
        actions={
          <Button variant="inverse" type="button">
            New job
          </Button>
        }
      />

      <div className="bq-content" style={{ paddingTop: 32 }}>
        {mockJobs.length === 0 ? (
          <div className="bq-empty">
            <p className="bq-label">BuildIQ</p>
            <p className="bq-hand">Ready when you are</p>
            <h2 className="bq-display">No jobs yet</h2>
            <p className="bq-body" style={{ color: "var(--bq-text-secondary)", margin: "8px 0 24px" }}>
              Create a job to upload plans and run AI takeoff.
            </p>
            <Button variant="primary">New job</Button>
          </div>
        ) : (
          <div className="bq-list" role="list">
            {mockJobs.map((job) => (
              <ListRow
                key={job.id}
                href={`/jobs/${job.id}`}
                title={job.name}
                badge={<StatusBadge label={labelStatus(job.status)} tone={projectStatusTone(job.status)} />}
                meta={
                  <>
                    <span>{formatAddress(job.address, job.city, job.state)}</span>
                    <span>{formatSf(job.squareFeet)}</span>
                    <span>
                      {job.blueprintCount} plans · {job.materialCount} materials · {job.bidCount} bids
                    </span>
                  </>
                }
                price={formatCurrency(job.estimateGrandTotal)}
                sub="Estimate"
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
