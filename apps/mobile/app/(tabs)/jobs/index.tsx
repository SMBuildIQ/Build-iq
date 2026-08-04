import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import type { ProjectSummary } from "@buildiq/types";
import * as Haptics from "expo-haptics";
import {
  Button,
  EmptyState,
  HeroBand,
  ListRow,
  Screen,
  Sheet,
  SkeletonListRow,
  StatusBadge,
  useTheme,
} from "../../../src/ui";
import { useAuth } from "../../../src/context/AuthContext";
import { createProject, listProjects } from "../../../src/api/resources";
import {
  MOCK_JOBS,
  MOCK_TAKEOFF,
  formatCurrency,
  projectStatusTone,
} from "../../../src/data/mock";
import { calculateEstimate } from "@buildiq/pricing";

/** M2 — Jobs list (+ tablet master-detail ≥768) */
export default function JobsScreen() {
  const { theme, gutter, isTablet } = useTheme();
  const { width } = useWindowDimensions();
  const { session } = useAuth();
  const [jobs, setJobs] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetJob, setSheetJob] = useState<ProjectSummary | null>(null);

  const load = useCallback(async (soft = false) => {
    if (!soft) setLoading(true);
    const fromApi = await listProjects();
    if (fromApi && fromApi.length > 0) {
      setJobs(fromApi);
      setSelectedId((prev) => prev ?? fromApi[0]?.id ?? null);
    } else {
      await new Promise((r) => setTimeout(r, soft ? 200 : 400));
      setJobs([...MOCK_JOBS]);
      setSelectedId((prev) => prev ?? MOCK_JOBS[0]?.id ?? null);
    }
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

  const createJob = useCallback(async () => {
    const optimistic: ProjectSummary = {
      id: `job_new_${Date.now()}`,
      name: "New Job",
      address: "Address pending",
      city: "Austin",
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
    setSelectedId(optimistic.id);

    const created = await createProject({
      name: optimistic.name,
      address: optimistic.address ?? undefined,
      city: optimistic.city ?? undefined,
      state: optimistic.state ?? undefined,
      stories: optimistic.stories,
    });
    if (created) {
      setJobs((prev) =>
        prev.map((j) => (j.id === optimistic.id ? { ...optimistic, ...created } : j))
      );
      setSelectedId(created.id);
    }
  }, []);

  const selected = useMemo(
    () => jobs.find((j) => j.id === selectedId) ?? jobs[0] ?? null,
    [jobs, selectedId]
  );

  const openJob = useCallback(
    (job: ProjectSummary) => {
      if (isTablet) {
        setSelectedId(job.id);
      } else {
        router.push(`/(tabs)/jobs/${job.id}`);
      }
    },
    [isTablet]
  );

  const onLongPress = useCallback(async (job: ProjectSummary) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // haptics optional
    }
    setSheetJob(job);
  }, []);

  const listPane = (
    <View style={{ flex: isTablet ? 0.4 : 1, minWidth: isTablet ? width * 0.36 : undefined }}>
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
          action={<Button label="New job" onPress={() => void createJob()} />}
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
            onPress={() => openJob(job)}
            onLongPress={() => void onLongPress(job)}
            style={
              isTablet && selected?.id === job.id
                ? { backgroundColor: theme.colors.surfaceMuted }
                : undefined
            }
          />
        ))
      )}
    </View>
  );

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
        contentContainerStyle={{ paddingBottom: theme.space[8], flexGrow: 1 }}
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
              onPress={() => void createJob()}
              style={{ alignSelf: "flex-start" }}
            />
          }
        />

        <View
          style={{
            paddingHorizontal: gutter,
            flexDirection: isTablet ? "row" : "column",
            gap: isTablet ? theme.space[6] : 0,
            alignItems: "flex-start",
          }}
        >
          {listPane}
          {isTablet && selected ? (
            <View
              style={{
                flex: 0.6,
                borderLeftWidth: theme.stroke.hairline,
                borderLeftColor: theme.colors.border,
                paddingLeft: theme.space[6],
                paddingTop: theme.space[2],
                minWidth: width * 0.5,
              }}
            >
              <JobSummaryPanel job={selected} />
            </View>
          ) : null}
        </View>
      </ScrollView>

      <Sheet
        visible={sheetJob != null}
        onClose={() => setSheetJob(null)}
        title={sheetJob?.name ?? "Quick actions"}
        accessibilityViewIsModal
      >
        <View style={{ gap: theme.space[3], paddingBottom: theme.space[4] }}>
          <Button
            label="Create proposal"
            accessibilityLabel="Create proposal"
            onPress={() => {
              setSheetJob(null);
              router.push("/(tabs)/proposals");
            }}
          />
          <Button
            label="Shop packages"
            variant="secondary"
            accessibilityLabel="Shop packages"
            onPress={() => {
              setSheetJob(null);
              router.push("/(tabs)/shop");
            }}
          />
          <Button
            label="View job"
            variant="ghost"
            accessibilityLabel="View job"
            onPress={() => {
              const id = sheetJob?.id;
              setSheetJob(null);
              if (id) {
                if (isTablet) setSelectedId(id);
                else router.push(`/(tabs)/jobs/${id}`);
              }
            }}
          />
        </View>
      </Sheet>
    </Screen>
  );
}

function JobSummaryPanel({ job }: { job: ProjectSummary }) {
  const { theme } = useTheme();
  const takeoffEstimate = useMemo(
    () =>
      calculateEstimate(
        MOCK_TAKEOFF.map((line) => ({
          quantity: line.qty,
          unitCost: line.unitCost,
          laborHours: line.qty * 0.15,
          laborRate: 65,
          wasteFactor: 0.1,
        }))
      ),
    []
  );

  return (
    <View style={{ gap: theme.space[5] }}>
      <View style={{ gap: theme.space[2] }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.space[2] }}>
          <StatusBadge
            label={job.status.replace(/_/g, " ")}
            tone={projectStatusTone(job.status)}
          />
          <Text style={{ fontFamily: "Questrial", fontSize: 14, color: theme.colors.textMuted }}>
            Updated {new Date(job.updatedAt).toLocaleDateString()}
          </Text>
        </View>
        <Text
          style={{
            fontFamily: "Staatliches",
            fontSize: 32,
            letterSpacing: 1.28,
            textTransform: "uppercase",
            color: theme.colors.text,
          }}
        >
          {job.name}
        </Text>
        <Text style={{ fontFamily: "Questrial", fontSize: 15, color: theme.colors.textSecondary }}>
          {[job.address, job.city, job.state, job.zip].filter(Boolean).join(", ")}
          {job.squareFeet ? `  ·  ${job.squareFeet.toLocaleString()} sf` : ""}
        </Text>
        <Text
          style={{
            fontFamily: "Staatliches",
            fontSize: 36,
            letterSpacing: 1.44,
            color: theme.colors.accent,
          }}
        >
          {formatCurrency(job.estimateGrandTotal ?? takeoffEstimate.grandTotal)}
        </Text>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.space[2] }}>
        <Button
          label="Open detail"
          compact
          onPress={() => router.push(`/(tabs)/jobs/${job.id}`)}
          accessibilityLabel="Open job detail"
        />
        <Button
          label="Create proposal"
          variant="secondary"
          compact
          onPress={() => router.push("/(tabs)/proposals")}
        />
        <Button
          label="Shop packages"
          variant="ghost"
          compact
          onPress={() => router.push("/(tabs)/shop")}
        />
      </View>

      <View
        style={{
          backgroundColor: theme.colors.surface,
          borderWidth: theme.stroke.hairline,
          borderColor: theme.colors.border,
          padding: theme.space[4],
          gap: theme.space[3],
        }}
      >
        <MetaRow label="Blueprints" value={String(job.blueprintCount)} />
        <MetaRow label="Materials" value={String(job.materialCount)} />
        <MetaRow label="Bids" value={String(job.bidCount)} />
        <MetaRow
          label="Estimate materials"
          value={formatCurrency(takeoffEstimate.materialCost)}
        />
      </View>
    </View>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: theme.space[3] }}>
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
      <Text style={{ fontFamily: "Questrial", fontSize: 15, color: theme.colors.text }}>
        {value}
      </Text>
    </View>
  );
}
