import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import type { ProjectSummary, ProposalSummary } from "@buildiq/types";
import {
  Button,
  EmptyState,
  FilterChip,
  HeroBand,
  ListRow,
  Screen,
  SkeletonListRow,
  useTheme,
} from "../../../src/ui";
import { listProjects, listProposals } from "../../../src/api/resources";
import {
  MOCK_JOBS,
  MOCK_PROPOSALS,
  formatCurrency,
  proposalStatusTone,
} from "../../../src/data/mock";

/** M4 — Proposals list */
export default function ProposalsScreen() {
  const { theme, gutter } = useTheme();
  const [jobs, setJobs] = useState<ProjectSummary[]>(MOCK_JOBS);
  const [proposals, setProposals] = useState<ProposalSummary[]>(MOCK_PROPOSALS);
  const [loading, setLoading] = useState(true);
  const [projectId, setProjectId] = useState(MOCK_JOBS[0]?.id ?? "");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [apiJobs, apiProposals] = await Promise.all([listProjects(), listProposals()]);
      if (cancelled) return;
      if (apiJobs && apiJobs.length > 0) {
        setJobs(apiJobs);
        setProjectId((prev) => prev || apiJobs[0]?.id || "");
      } else {
        setJobs(MOCK_JOBS);
      }
      if (apiProposals && apiProposals.length > 0) {
        setProposals(apiProposals);
      } else {
        setProposals(MOCK_PROPOSALS);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedProject = useMemo(
    () => jobs.find((j) => j.id === projectId),
    [jobs, projectId]
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
                {jobs.map((j) => (
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
              accessibilityLabel="Create proposal"
              onPress={() => {
                if (selectedProject) {
                  router.push(`/(tabs)/proposals/prop_001`);
                }
              }}
            />
          </View>

          {loading ? (
            <View>
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonListRow key={i} />
              ))}
            </View>
          ) : proposals.length === 0 ? (
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
