import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { HeroBand, ListRow, Screen, useTheme } from "../../src/ui";
import {
  MOCK_ORDERS,
  TRACK_STEPS,
  formatCurrency,
  type MockOrder,
} from "../../src/data/mock";
import { listOrders, type OrderSummary } from "../../src/api/resources";

function toMockOrder(o: OrderSummary): MockOrder {
  const activeFromTimeline = o.activeStep;
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    projectName: o.projectName ?? "Project",
    status: o.status as MockOrder["status"],
    activeStep: activeFromTimeline,
    subtotal: o.subtotal,
    tax: o.tax,
    total: o.total,
    createdAt: o.createdAt,
    items: o.items.map((i) => ({
      id: i.id,
      name: i.name,
      category: i.category,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      lineTotal: i.lineTotal,
    })),
  };
}

/** M8 — Track / Order detail (hidden tab; reachable from Cart + More) */
export default function TrackScreen() {
  const { theme, gutter } = useTheme();
  const [order, setOrder] = useState<MockOrder | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const orders = await listOrders();
    if (orders && orders.length > 0) {
      setOrder(toMockOrder(orders[0]!));
    } else {
      setOrder(MOCK_ORDERS[0] ?? null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading || !order) {
    return (
      <Screen edges={["top", "left", "right"]}>
        <HeroBand
          tone="track"
          eyebrow="Delivery"
          title="Track"
          supporting="Yard pull through jobsite delivery for open orders."
        />
        <View style={{ padding: gutter, alignItems: "center" }}>
          {loading ? (
            <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Loading order" />
          ) : (
            <Text style={{ fontFamily: "Questrial", color: theme.colors.textMuted }}>
              No open orders yet.
            </Text>
          )}
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: theme.space[10] }}
        showsVerticalScrollIndicator={false}
      >
        <HeroBand
          tone="track"
          eyebrow="Delivery"
          title="Track"
          supporting="Yard pull through jobsite delivery for open orders."
        />

        <View style={{ paddingHorizontal: gutter, paddingTop: theme.space[6], gap: theme.space[7] }}>
          <View style={{ gap: theme.space[2] }}>
            <Text
              style={{
                fontFamily: "Questrial",
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 1.76,
                textTransform: "uppercase",
                color: theme.colors.textMuted,
              }}
            >
              Order
            </Text>
            <Text
              style={{
                fontFamily: "Staatliches",
                fontSize: 28,
                letterSpacing: 1.12,
                textTransform: "uppercase",
                color: theme.colors.text,
              }}
              accessibilityRole="header"
            >
              {order.orderNumber}
            </Text>
            <Text style={{ fontFamily: "Questrial", fontSize: 15, color: theme.colors.textSecondary }}>
              {order.projectName}
              {"  ·  "}
              Placed {new Date(order.createdAt).toLocaleDateString()}
            </Text>
            <Text
              style={{
                fontFamily: "Staatliches",
                fontSize: 32,
                letterSpacing: 1.28,
                color: theme.colors.accent,
              }}
            >
              {formatCurrency(order.total)}
            </Text>
          </View>

          <View
            style={{ gap: 0 }}
            accessibilityRole="summary"
            accessibilityLabel={`Order timeline, current step ${TRACK_STEPS[order.activeStep]?.label}`}
          >
            {TRACK_STEPS.map((step, index) => {
              const active = index <= order.activeStep;
              const current = index === order.activeStep;
              return (
                <View
                  key={step.key}
                  accessible
                  accessibilityLabel={`${step.label}${current ? ", current" : active ? ", complete" : ", upcoming"}`}
                  style={{ flexDirection: "row", gap: theme.space[4], minHeight: 56 }}
                >
                  <View style={{ alignItems: "center", width: 16 }}>
                    <View
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: theme.radius.none,
                        borderWidth: 1.5,
                        borderColor: active ? theme.colors.accent : theme.colors.borderStrong,
                        backgroundColor: current ? theme.colors.accent : "transparent",
                      }}
                    />
                    {index < TRACK_STEPS.length - 1 ? (
                      <View
                        style={{
                          flex: 1,
                          width: 2,
                          backgroundColor:
                            index < order.activeStep ? theme.colors.accent : theme.colors.border,
                        }}
                      />
                    ) : null}
                  </View>
                  <Text
                    style={{
                      fontFamily: current ? "Staatliches" : "Questrial",
                      fontSize: current ? 18 : 15,
                      letterSpacing: current ? 0.72 : 0.15,
                      textTransform: current ? "uppercase" : "none",
                      color: active ? theme.colors.text : theme.colors.textMuted,
                      paddingBottom: theme.space[4],
                    }}
                  >
                    {step.label}
                  </Text>
                </View>
              );
            })}
          </View>

          <View style={{ gap: theme.space[3] }}>
            <Text
              style={{
                fontFamily: "Staatliches",
                fontSize: 22,
                letterSpacing: 0.88,
                textTransform: "uppercase",
                color: theme.colors.text,
              }}
            >
              Line items
            </Text>
            {order.items.map((item) => (
              <ListRow
                key={item.id}
                title={item.name}
                meta={`${item.category}  ·  qty ${item.quantity}`}
                price={formatCurrency(item.lineTotal)}
              />
            ))}
            <View
              style={{
                borderTopWidth: theme.stroke.hairline,
                borderTopColor: theme.colors.border,
                paddingTop: theme.space[3],
                gap: theme.space[2],
              }}
            >
              <Meta label="Subtotal" value={formatCurrency(order.subtotal)} />
              <Meta label="Tax" value={formatCurrency(order.tax)} />
              <Meta label="Total" value={formatCurrency(order.total)} accent />
            </View>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

function Meta({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Text
        style={{
          fontFamily: "Questrial",
          fontSize: 11,
          fontWeight: "700",
          letterSpacing: 1.76,
          textTransform: "uppercase",
          color: theme.colors.textMuted,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontFamily: accent ? "Staatliches" : "Questrial",
          fontSize: accent ? 22 : 15,
          color: accent ? theme.colors.accent : theme.colors.text,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
