import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  Button,
  EmptyState,
  HeroBand,
  Screen,
  Skeleton,
  useTheme,
} from "../../src/ui";
import { useCart } from "../../src/context/CartContext";
import { formatCurrency } from "../../src/data/mock";

/** M7 — Cart */
export default function CartScreen() {
  const { theme, gutter } = useTheme();
  const { lines, subtotal, tax, total, setQuantity, remove, clear } = useCart();
  const [totalsLoading, setTotalsLoading] = useState(true);

  useEffect(() => {
    setTotalsLoading(true);
    const t = setTimeout(() => setTotalsLoading(false), 450);
    return () => clearTimeout(t);
  }, [lines]);

  return (
    <Screen edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: theme.space[8], flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <HeroBand
          eyebrow="Checkout"
          title="Cart"
          supporting="Tax estimated for Texas yard pickup or delivery."
        />

        <View style={{ paddingHorizontal: gutter, paddingTop: theme.space[5], flex: 1, gap: theme.space[4] }}>
          {lines.length === 0 ? (
            <EmptyState
              hand="Your cart is clear"
              title="No packages"
              body="Browse the shop to add material packages."
            />
          ) : (
            <>
              {lines.map((line) => (
                <View
                  key={line.packageId}
                  style={{
                    borderTopWidth: theme.stroke.hairline,
                    borderTopColor: theme.colors.border,
                    paddingVertical: theme.space[4],
                    gap: theme.space[3],
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: theme.space[3] }}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text
                        style={{
                          fontFamily: "Questrial",
                          fontSize: 11,
                          fontWeight: "700",
                          letterSpacing: 1.76,
                          textTransform: "uppercase",
                          color: theme.colors.accent,
                        }}
                      >
                        {line.category}
                      </Text>
                      <Text
                        style={{
                          fontFamily: "Staatliches",
                          fontSize: 22,
                          letterSpacing: 0.88,
                          textTransform: "uppercase",
                          color: theme.colors.text,
                        }}
                      >
                        {line.name}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontFamily: "Staatliches",
                        fontSize: 24,
                        color: theme.colors.accent,
                      }}
                    >
                      {formatCurrency(line.unitPrice * line.quantity)}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: theme.space[3] }}>
                    <QtyButton
                      label="-"
                      onPress={() => setQuantity(line.packageId, line.quantity - 1)}
                    />
                    <Text
                      style={{
                        fontFamily: "Staatliches",
                        fontSize: 20,
                        minWidth: 28,
                        textAlign: "center",
                        color: theme.colors.text,
                      }}
                    >
                      {line.quantity}
                    </Text>
                    <QtyButton
                      label="+"
                      onPress={() => setQuantity(line.packageId, line.quantity + 1)}
                    />
                    <Pressable onPress={() => remove(line.packageId)} accessibilityRole="button">
                      <Text
                        style={{
                          fontFamily: "Questrial",
                          fontSize: 13,
                          color: theme.colors.danger,
                          marginLeft: theme.space[2],
                        }}
                      >
                        Remove
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))}

              <View
                style={{
                  backgroundColor: theme.colors.surface,
                  borderWidth: theme.stroke.hairline,
                  borderColor: theme.colors.border,
                  padding: theme.space[5],
                  gap: theme.space[3],
                  marginTop: theme.space[2],
                }}
              >
                {totalsLoading ? (
                  <>
                    <Skeleton height={16} width="40%" />
                    <Skeleton height={16} width="50%" />
                    <Skeleton height={28} width="60%" />
                  </>
                ) : (
                  <>
                    <TotalsRow label="Subtotal" value={formatCurrency(subtotal)} />
                    <TotalsRow label="Tax" value={formatCurrency(tax)} />
                    <TotalsRow label="Total" value={formatCurrency(total)} accent />
                  </>
                )}
              </View>

              <Button label="Pay with card" onPress={() => undefined} />
              <Button label="Apple Pay / Google Pay" variant="secondary" onPress={() => undefined} />
              <Button label="Clear cart" variant="ghost" onPress={clear} />
            </>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

function QtyButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label === "+" ? "Increase quantity" : "Decrease quantity"}
      style={{
        width: 36,
        height: 36,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: theme.stroke.hairline,
        borderColor: theme.colors.borderStrong,
        borderRadius: theme.radius.none,
      }}
    >
      <Text style={{ fontFamily: "Staatliches", fontSize: 20, color: theme.colors.text }}>
        {label}
      </Text>
    </Pressable>
  );
}

function TotalsRow({
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
          fontFamily: "Staatliches",
          fontSize: accent ? 28 : 18,
          letterSpacing: accent ? 1.12 : 0.72,
          color: accent ? theme.colors.accent : theme.colors.text,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
