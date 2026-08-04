import React, { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import {
  Button,
  EmptyState,
  FilterChip,
  HeroBand,
  ListRow,
  Screen,
  useTheme,
} from "../../../src/ui";
import {
  MOCK_JOBS,
  MOCK_PROPOSALS,
  formatCurrency,
  proposalStatusTone,
} from "../../../src/data/mock";

/** M4 — Proposals list */
export default function ProposalsScreen() {
  const { theme, gutter } = useTheme();
  const [projectId, setProjectId] = useState(MOCK_JOBS[0]?.id ?? "");

  const proposals = MOCK_PROPOSALS;
  const selectedProject = useMemo(
    () => MOCK_JOBS.find((j) => j.id === projectId),
    [projectId]
  );

  return (
    <Screen edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: theme.space[8] }}
        showsVerticalScrollIndicator={false}
      >
        <HeroBand
          eyebrow="Commercial proposals"
          title="Proposals"
          supporting="Compose, send, and track deposits from the yard to the jobsite."
        />

        <View style={{ paddingHorizontal: gutter, paddingTop: theme.space[5], gap: theme.space[4] }}>
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderWidth: theme.stroke.hairline,
              borderColor: theme.colors.borderStrong,
              padding: theme.space[4],
              gap: theme.space[4],
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
              Compose from project
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: theme.space[2] }}>
                {MOCK_JOBS.map((j) => (
                  <FilterChip
                    key={j.id}
                    label={j.name}
                    active={projectId === j.id}
                    onPress={() => setProjectId(j.id)}
                  />
                ))}
              </View>
            </ScrollView>
            <Button
              label="Create proposal"
              onPress={() => {
                if (selectedProject) {
                  router.push(`/(tabs)/proposals/prop_001`);
                }
              }}
            />
          </View>

          {proposals.length === 0 ? (
            <EmptyState
              hand="Nothing out for signature"
              title="No proposals"
              body="Compose a proposal from an estimated job."
            />
          ) : (
            proposals.map((p) => (
              <ListRow
                key={p.id}
                title={p.title}
                status={p.status}
                statusTone={proposalStatusTone(p.status)}
                meta={`${p.number}  ·  ${p.sectionCount} categories  ·  ${p.customerName ?? "—"}`}
                price={`${formatCurrency(p.grandTotal)}  /  ${formatCurrency(p.depositAmount)}`}
                onPress={() => router.push(`/(tabs)/proposals/${p.id}`)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
