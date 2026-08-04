import React, { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import type { ProposalCategory } from "@buildiq/types";
import {
  Button,
  FilterChip,
  HeroBand,
  Screen,
  useTheme,
} from "../../src/ui";
import { useCart } from "../../src/context/CartContext";
import { MOCK_PACKAGES, formatCurrency } from "../../src/data/mock";

const CATEGORIES = ["All", "Windows", "Doors", "Lumber", "Trusses", "Cabinetry", "Millwork"] as const;

/** M6 — Shop with square FilterChips */
export default function ShopScreen() {
  const { theme, gutter } = useTheme();
  const { addPackage } = useCart();
  const [filter, setFilter] = useState<(typeof CATEGORIES)[number]>("All");

  const packages = useMemo(
    () =>
      filter === "All"
        ? MOCK_PACKAGES
        : MOCK_PACKAGES.filter((p) => p.category === (filter as ProposalCategory)),
    [filter]
  );

  return (
    <Screen edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: theme.space[8] }}
        showsVerticalScrollIndicator={false}
      >
        <HeroBand
          eyebrow="Supply Monkey yard"
          title="Material packages"
          supporting="Curated bundles ready for estimate attach and checkout."
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: gutter,
            paddingVertical: theme.space[4],
            gap: theme.space[2],
          }}
        >
          {CATEGORIES.map((c) => (
            <FilterChip
              key={c}
              label={c}
              active={filter === c}
              onPress={() => setFilter(c)}
            />
          ))}
        </ScrollView>

        <View style={{ paddingHorizontal: gutter, gap: theme.space[5] }}>
          {packages.map((pkg) => (
            <View
              key={pkg.id}
              style={{
                backgroundColor: theme.colors.surface,
                borderWidth: theme.stroke.hairline,
                borderColor: theme.colors.border,
                padding: theme.space[5],
                gap: theme.space[4],
              }}
            >
              <View style={{ gap: theme.space[1] }}>
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
                  {pkg.category}
                </Text>
                <Text
                  style={{
                    fontFamily: "Staatliches",
                    fontSize: 28,
                    letterSpacing: 1.12,
                    textTransform: "uppercase",
                    color: theme.colors.text,
                  }}
                >
                  {pkg.name}
                </Text>
                <Text
                  style={{
                    fontFamily: "Questrial",
                    fontSize: 15,
                    lineHeight: 22,
                    color: theme.colors.textSecondary,
                  }}
                >
                  {pkg.description}
                </Text>
              </View>

              <View style={{ gap: theme.space[2] }}>
                {pkg.contents.map((item) => (
                  <Text
                    key={item}
                    style={{
                      fontFamily: "Questrial",
                      fontSize: 14,
                      color: theme.colors.text,
                    }}
                  >
                    —  {item}
                  </Text>
                ))}
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                  gap: theme.space[4],
                  borderTopWidth: theme.stroke.hairline,
                  borderTopColor: theme.colors.border,
                  paddingTop: theme.space[4],
                }}
              >
                <View>
                  <Text
                    style={{
                      fontFamily: "Staatliches",
                      fontSize: 32,
                      letterSpacing: 1.28,
                      color: theme.colors.accent,
                    }}
                  >
                    {formatCurrency(pkg.unitPrice)}
                  </Text>
                  <Text
                    style={{
                      fontFamily: "Questrial",
                      fontSize: 12,
                      color: theme.colors.textMuted,
                    }}
                  >
                    {pkg.leadDays} day lead
                  </Text>
                </View>
                <Button
                  label="Add to cart"
                  compact
                  onPress={() => addPackage(pkg)}
                  style={{ minWidth: 140 }}
                />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
