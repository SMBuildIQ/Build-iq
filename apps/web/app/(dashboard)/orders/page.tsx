import type { Metadata } from "next";
import { HeroBand } from "@/components/HeroBand";
import { ListRow } from "@/components/ListRow";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCurrency } from "@/lib/format";
import { mockOrders } from "@/lib/mock-data";
import type { BadgeTone } from "@/lib/format";

export const metadata: Metadata = { title: "Orders" };

function orderTone(status: string): BadgeTone {
  if (status === "Delivered") return "success";
  if (status === "Placed") return "draft";
  return "progress";
}

export default function OrdersPage() {
  return (
    <>
      <HeroBand
        eyebrow="Fulfillment"
        title="Orders"
        support="Track yard picks and deliveries from package checkout through site drop."
      />

      <div className="bq-content" style={{ paddingTop: 32 }}>
        <div className="bq-list" style={{ marginBottom: 40 }}>
          {mockOrders.map((order) => (
            <ListRow
              key={order.id}
              title={`${order.number} · ${order.projectName}`}
              badge={<StatusBadge label={order.status} tone={orderTone(order.status)} />}
              meta={
                <>
                  <span>Placed {order.placedAt}</span>
                  <span>
                    {order.items.length} item{order.items.length === 1 ? "" : "s"}
                  </span>
                </>
              }
              price={formatCurrency(order.total)}
            />
          ))}
        </div>

        {mockOrders.map((order) => (
          <section key={`${order.id}-detail`} className="bq-section" style={{ marginTop: 0, marginBottom: 40 }}>
            <div className="bq-section-head">
              <h2 className="bq-title">{order.number}</h2>
              <span className="bq-label" style={{ color: "var(--bq-text-muted)" }}>
                Timeline
              </span>
            </div>
            <div className="bq-grid-2">
              <div className="bq-panel">
                <ul className="bq-timeline">
                  {order.steps.map((step) => (
                    <li
                      key={step.label}
                      className="bq-timeline-item"
                      data-active={step.active ? "true" : "false"}
                      data-done={step.done ? "true" : "false"}
                    >
                      <span className="bq-timeline-node" aria-hidden="true" />
                      <div>
                        <p className="bq-body" style={{ margin: 0, fontWeight: 600 }}>
                          {step.label}
                        </p>
                        {step.at ? (
                          <p className="bq-mono" style={{ margin: "4px 0 0", color: "var(--bq-text-muted)" }}>
                            {step.at}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bq-muted-panel">
                <p className="bq-label" style={{ marginBottom: 12 }}>
                  Line items
                </p>
                <table className="bq-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Qty</th>
                      <th>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item) => (
                      <tr key={item.name}>
                        <td>{item.name}</td>
                        <td>{item.qty}</td>
                        <td>{formatCurrency(item.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
