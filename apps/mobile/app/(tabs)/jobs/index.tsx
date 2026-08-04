import React, { useCallback, useEffect, useState } from "react";
import { Alert, RefreshControl, ScrollView, View } from "react-native";
import { router } from "expo-router";
import type { ProjectSummary } from "@buildiq/types";
import {
  Button,
  EmptyState,
  HeroBand,
  ListRow,
  Screen,
  SkeletonListRow,
  useTheme,
} from "../../../src/ui";
import { useAuth } from "../../../src/context/AuthContext";
import {
  MOCK_JOBS,
  formatCurrency,
  projectStatusTone,
} from "../../../src/data/mock";

/** M2 — Jobs list */
export default function JobsScreen() {
  const { theme, gutter } = useTheme();
  const { session } = useAuth();
  const [jobs, setJobs] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (soft = false) => {
    if (!soft) setLoading(true);
    await new Promise((r) => setTimeout(r, soft ? 400 : 700));
    setJobs([...MOCK_JOBS]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  }, [load]);

  const createJob = useCallback(() => {
    const optimistic: ProjectSummary = {
      id: `job_new_${Date.now()}`,
      name: "New Job",
      address: "Address pending",
      city: session?.companyName ? undefined : "Austin",
      state: "TX",
      zip: null,
      squareFeet: null,
      stories: 1,
      status: "DRAFT",
      estimateGrandTotal: null,
      blueprintCount: 0,
      materialCount: 0,
      bidCount: 0,
      updatedAt: new Date().toISOString(),
    };
    setJobs((prev) => [optimistic, ...prev]);
  }, [session?.companyName]);

  return (
    <Screen edges={["top", "left", "right"]}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.accent}
            colors={[theme.colors.accent]}
          />
        }
        contentContainerStyle={{ paddingBottom: theme.space[8] }}
        showsVerticalScrollIndicator={false}
      >
        <HeroBand
          eyebrow={session?.companyName ?? "Supply Monkey"}
          title="Jobs"
          supporting="Estimates, takeoffs, and bids for every active project."
          action={
            <Button
              label="New job"
              variant="inverse"
              compact
              onPress={createJob}
              style={{ alignSelf: "flex-start" }}
            />
          }
        />

        <View style={{ paddingHorizontal: gutter }}>
          {loading ? (
            <View>
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonListRow key={i} />
              ))}
            </View>
          ) : jobs.length === 0 ? (
            <EmptyState
              hand="Ready when you are"
              title="No jobs yet"
              body="Create a job to upload blueprints and run AI takeoff."
              action={<Button label="New job" onPress={createJob} />}
            />
          ) : (
            jobs.map((job) => (
              <ListRow
                key={job.id}
                title={job.name}
                status={job.status.replace(/_/g, " ")}
                statusTone={projectStatusTone(job.status)}
                meta={[
                  [job.address, job.city, job.state].filter(Boolean).join(", "),
                  job.squareFeet ? `${job.squareFeet.toLocaleString()} sf` : null,
                  `${job.blueprintCount} plans · ${job.materialCount} materials · ${job.bidCount} bids`,
                ]
                  .filter(Boolean)
                  .join("  ·  ")}
                price={formatCurrency(job.estimateGrandTotal)}
                onPress={() => router.push(`/(tabs)/jobs/${job.id}`)}
                onLongPress={() =>
                  Alert.alert(job.name, "Quick actions", [
                    {
                      text: "Create proposal",
                      onPress: () => router.push("/(tabs)/proposals"),
                    },
                    {
                      text: "Shop packages",
                      onPress: () => router.push("/(tabs)/shop"),
                    },
                    { text: "Cancel", style: "cancel" },
                  ])
                }
              />
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
