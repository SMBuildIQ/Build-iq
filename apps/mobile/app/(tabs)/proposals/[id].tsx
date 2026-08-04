import React, { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  Button,
  HeroBand,
  ListRow,
  Screen,
  StatusBadge,
  useTheme,
} from "../../../src/ui";
import { depositAmount } from "@buildiq/pricing";
import {
  MOCK_PROPOSALS,
  MOCK_TAKEOFF,
  formatCurrency,
  proposalStatusTone,
} from "../../../src/data/mock";

/** M5 — Proposal detail */
export default function ProposalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme, gutter } = useTheme();

  const proposal = useMemo(
    () => MOCK_PROPOSALS.find((p) => p.id === id) ?? MOCK_PROPOSALS[0],
    [id]
  );

  const deposit = proposal
    ? depositAmount(proposal.grandTotal, proposal.depositPct)
    : 0;

  if (!proposal) {
    return (
      <Screen gutter>
        <Text style={{ fontFamily: "Questrial", color: theme.colors.text }}>
          Proposal not found
        </Text>
      </Screen>
    );
  }

  return (
    <Screen edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: theme.space[10] }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={{
            position: "absolute",
            zIndex: 2,
            top: theme.space[4],
            left: gutter,
            paddingVertical: theme.space[2],
            paddingHorizontal: theme.space[3],
            backgroundColor: "rgba(22,20,18,0.55)",
          }}
        >
          <Text style={{ fontFamily: "Staatliches", color: "#FFFDF9", letterSpacing: 1.2 }}>
            Back
          </Text>
        </Pressable>

        <HeroBand
          tone="proposalDetail"
          eyebrow={proposal.number}
          title={proposal.title}
          supporting={`${formatCurrency(proposal.grandTotal)} total  ·  ${formatCurrency(deposit)} deposit (${Math.round(proposal.depositPct * 100)}%)`}
          action={
            <View style={{ flexDirection: "row", alignItems: "center", gap: theme.space[3] }}>
              <StatusBadge
                label={proposal.status}
                tone={proposalStatusTone(proposal.status)}
              />
            </View>
          }
        />

        <View style={{ paddingHorizontal: gutter, paddingTop: theme.space[5], gap: theme.space[5] }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.space[2] }}>
            <Button label="PDF" compact style={{ minWidth: 88 }} />
            <Button label="Send" compact style={{ minWidth: 88 }} />
            <Button label="Copy link" variant="secondary" compact />
            <Button label="Edit" variant="ghost" compact />
          </View>

          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderWidth: theme.stroke.hairline,
              borderColor: theme.colors.border,
              padding: theme.space[4],
              gap: theme.space[2],
            }}
          >
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
              Customer
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
              {proposal.customerName ?? "—"}
            </Text>
          </View>

          <Text
            style={{
              fontFamily: "Staatliches",
              fontSize: 24,
              letterSpacing: 0.96,
              textTransform: "uppercase",
              color: theme.colors.text,
            }}
          >
            Line items
          </Text>
          {MOCK_TAKEOFF.slice(0, 4).map((line) => (
            <ListRow
              key={line.name}
              title={line.name}
              meta={`${line.trade}  ·  ${line.qty} ${line.unit} @ ${formatCurrency(line.unitCost)}`}
              price={formatCurrency(line.qty * line.unitCost)}
            />
          ))}

          {proposal.status === "ACCEPTED" ? (
            <View
              style={{
                borderWidth: theme.stroke.hairline,
                borderColor: theme.colors.success,
                padding: theme.space[4],
                gap: theme.space[2],
              }}
            >
              <Text
                style={{
                  fontFamily: "Questrial",
                  fontSize: 11,
                  fontWeight: "700",
                  letterSpacing: 1.76,
                  textTransform: "uppercase",
                  color: theme.colors.success,
                }}
              >
                Accept record
              </Text>
              <Text style={{ fontFamily: "Questrial", fontSize: 15, color: theme.colors.text }}>
                Signed electronically. Deposit invoice queued to Spruce.
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}
