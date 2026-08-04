import type { Metadata } from "next";
import { cookies } from "next/headers";
import { DemoNotice } from "@/components/DemoNotice";
import { HeroBand } from "@/components/HeroBand";
import { ListRow } from "@/components/ListRow";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCurrency } from "@/lib/format";
import { TOKEN_COOKIE } from "@/lib/cookies";
import { fetchOrders, tokenFromCookieHeader, type OrderTimelineStep } from "@/lib/data";
import type { BadgeTone } from "@/lib/format";

export const metadata: Metadata = { title: "Orders" };

function orderTone(status: string): BadgeTone {
  const s = status.toUpperCase();
  if (s === "DELIVERED" || status === "Delivered") return "success";
  if (s === "PLACED" || status === "Placed") return "draft";
  return "progress";
}

function labelOrderStatus(status: string): string {
  const map: Record<string, string> = {
    PLACED: "Placed",
    CONFIRMED: "Confirmed",
    FULFILLING: "Fulfilling",
    SHIPPED: "In transit",
    DELIVERED: "Delivered",
    CANCELLED: "Cancelled",
  };
  return map[status] ?? status;
}

function timelineDone(steps: OrderTimelineStep[], index: number): boolean {
  const activeIdx = steps.findIndex((s) => s.active);
  if (activeIdx < 0) {
    // All complete when last step has an `at` and none active
    return Boolean(steps[index]?.at);
  }
  return index < activeIdx;
}

export default async function OrdersPage() {
  const jar = await cookies();
  const token = tokenFromCookieHeader(jar.get(TOKEN_COOKIE)?.value);
  const { data: orders, demo } = await fetchOrders(token);

  return (
    <>
      <HeroBand
        tone="orders"
        eyebrow="Fulfillment"
        title="Orders"
        support="Track yard picks and deliveries from package checkout through site drop."
      />

      <div className="bq-content" style={{ paddingTop: 32 }}>
        <DemoNotice show={demo} />
        <div className="bq-list" style={{ marginBottom: 40 }}>
          {orders.map((order) => (
            <ListRow
              key={order.id}
              title={`${order.number} · ${order.projectName}`}
              badge={
                <StatusBadge label={labelOrderStatus(order.status)} tone={orderTone(order.status)} />
              }
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

        {orders.map((order) => (
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
                  {order.timeline.map((step, idx) => (
                    <li
                      key={step.key}
                      className="bq-timeline-item"
                      data-active={step.active ? "true" : "false"}
                      data-done={timelineDone(order.timeline, idx) ? "true" : "false"}
                    >
                      <span className="bq-timeline-node" aria-hidden="true" />
                      <div>
                        <p className="bq-body" style={{ margin: 0, fontWeight: 600 }}>
                          {step.label}
                        </p>
                        {step.at ? (
                          <p className="bq-mono" style={{ margin: "4px 0 0", color: "var(--bq-text-muted)" }}>
                            {step.at.length > 12 ? step.at.slice(0, 10) : step.at}
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
