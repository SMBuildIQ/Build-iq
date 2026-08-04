import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { router, useLocalSearchParams, type Href } from "expo-router";
import type { ProjectSummary } from "@buildiq/types";
import {
  Button,
  HeroBand,
  ListRow,
  Screen,
  StatusBadge,
  useTheme,
} from "../../../../src/ui";
import { calculateEstimate } from "@buildiq/pricing";
import {
  MOCK_JOBS,
  MOCK_TAKEOFF,
  formatCurrency,
  projectStatusTone,
} from "../../../../src/data/mock";
import { MOCK_PROJECT_LIBRARIES } from "../../../../src/data/materialLibrary";
import { getProject, getProjectEstimate, orchestrateProject } from "../../../../src/api/resources";

/** M3 — Job detail (tablet split ≥768) with API + mock fallback */
export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme, gutter, isTablet, reduceMotion } = useTheme();
  const [job, setJob] = useState<ProjectSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [estimateOverride, setEstimateOverride] = useState<{
    materialCost?: number;
    laborCost?: number;
    grandTotal?: number;
  } | null>(null);
  const [aiNote, setAiNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const fromApi = id ? await getProject(id) : null;
    setJob(fromApi ?? MOCK_JOBS.find((j) => j.id === id) ?? MOCK_JOBS[0] ?? null);
    if (id) {
      const est = await getProjectEstimate(id);
      if (est) setEstimateOverride(est);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

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

  const runAi = useCallback(async () => {
    if (!job) return;
    setRunning(true);
    setAiNote(null);
    // Optimistic status
    setJob((prev) => (prev ? { ...prev, status: "ANALYZING" } : prev));
    const res = await orchestrateProject(job.id);
    if (res) {
      setJob((prev) => (prev ? { ...prev, status: "ESTIMATED" } : prev));
      setAiNote(res.stub ? "AI pipeline queued (stub). Totals refresh when estimate is ready." : "Takeoff complete.");
      const est = await getProjectEstimate(job.id);
      if (est) {
        setEstimateOverride(est);
        setJob((prev) =>
          prev
            ? { ...prev, estimateGrandTotal: est.grandTotal ?? prev.estimateGrandTotal, status: "ESTIMATED" }
            : prev
        );
      }
    } else {
      // Offline demo path
      setJob((prev) =>
        prev
          ? {
              ...prev,
              status: "ESTIMATED",
              estimateGrandTotal: takeoffEstimate.grandTotal,
              materialCount: MOCK_TAKEOFF.length,
            }
          : prev
      );
      setEstimateOverride({
        materialCost: takeoffEstimate.materialCost,
        laborCost: takeoffEstimate.laborCost,
        grandTotal: takeoffEstimate.grandTotal,
      });
      setAiNote("Demo takeoff applied (API offline).");
    }
    setRunning(false);
  }, [job, takeoffEstimate]);

  if (loading) {
    return (
      <Screen edges={["top", "left", "right"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Loading job" />
        </View>
      </Screen>
    );
  }

  if (!job) {
    return (
      <Screen gutter>
        <Text style={{ fontFamily: "Questrial", color: theme.colors.text }}>Job not found</Text>
      </Screen>
    );
  }

  const materialCost = estimateOverride?.materialCost ?? takeoffEstimate.materialCost;
  const laborCost = estimateOverride?.laborCost ?? takeoffEstimate.laborCost;
  const grandTotal =
    estimateOverride?.grandTotal ?? job.estimateGrandTotal ?? takeoffEstimate.grandTotal;

  const enter = reduceMotion ? undefined : FadeInDown.duration(theme.motion.enter as number);

  const summary = (
    <Animated.View entering={enter} style={{ gap: theme.space[5] }}>
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
          accessibilityLabel={`Estimate ${formatCurrency(grandTotal)}`}
        >
          {formatCurrency(grandTotal)}
        </Text>
        {aiNote ? (
          <Text style={{ fontFamily: "Questrial", fontSize: 13, color: theme.colors.textMuted }}>
            {aiNote}
          </Text>
        ) : null}
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.space[2] }}>
        <Button
          label={running ? "Running…" : "Run AI"}
          compact
          style={{ minWidth: 100 }}
          disabled={running}
          onPress={() => void runAi()}
          accessibilityLabel="Run AI takeoff"
        />
        <Button
          label="Upload drawings"
          variant="secondary"
          compact
          style={{ minWidth: 140 }}
          accessibilityLabel="Upload drawings"
          onPress={() =>
            router.push(`/(tabs)/jobs/${job.id}/drawings` as Href)
          }
        />
        <Button
          label="Materials library"
          variant="secondary"
          compact
          style={{ minWidth: 150 }}
          accessibilityLabel="Open materials library"
          onPress={() =>
            router.push(`/(tabs)/jobs/${job.id}/library` as Href)
          }
        />
        <Button
          label="Export estimate"
          variant="secondary"
          compact
          style={{ minWidth: 130 }}
          accessibilityLabel="Export estimate"
          onPress={() =>
            Alert.alert(
              "Export",
              "PDF export is available from proposals after you create one for this job."
            )
          }
        />
        <Button
          label="Create proposal"
          variant="secondary"
          compact
          onPress={() => router.push("/(tabs)/proposals")}
        />
      </View>

      <Section title="Blueprints">
        <MetaRow label="Sheets uploaded" value={String(job.blueprintCount)} />
        <MetaRow label="Stories" value={String(job.stories)} />
        <Button
          label="Manage drawings"
          variant="ghost"
          compact
          onPress={() =>
            router.push(`/(tabs)/jobs/${job.id}/drawings` as Href)
          }
          accessibilityLabel="Manage drawings"
        />
      </Section>

      <Section title="Materials library">
        <MetaRow
          label="Saved lines"
          value={String(
            MOCK_PROJECT_LIBRARIES[job.id]?.length ?? job.materialCount ?? 0
          )}
        />
        <Text style={{ fontFamily: "Questrial", fontSize: 14, color: theme.colors.textMuted }}>
          Per-project orders — lumber, trusses, I-joists, windows, doors, cabinetry, hardware, stone.
        </Text>
        <Button
          label="Manage library"
          variant="ghost"
          compact
          onPress={() =>
            router.push(`/(tabs)/jobs/${job.id}/library` as Href)
          }
          accessibilityLabel="Manage materials library"
        />
      </Section>

      <Section title="Cost estimate">
        <MetaRow label="Materials" value={formatCurrency(materialCost)} />
        <MetaRow label="Labor" value={formatCurrency(laborCost)} />
        <MetaRow label="Bids" value={String(job.bidCount)} />
        <MetaRow label="Grand total" value={formatCurrency(grandTotal)} accent />
      </Section>
    </Animated.View>
  );

  const takeoff = (
    <Animated.View
      entering={reduceMotion ? undefined : FadeInDown.delay(80).duration(theme.motion.enter as number)}
      style={{ gap: theme.space[3] }}
    >
      <Text
        style={{
          fontFamily: "Staatliches",
          fontSize: 24,
          letterSpacing: 0.96,
          textTransform: "uppercase",
          color: theme.colors.text,
        }}
      >
        Takeoff
      </Text>
      {MOCK_TAKEOFF.map((line) => (
        <ListRow
          key={line.name}
          title={line.name}
          meta={`${line.trade}  ·  ${line.qty} ${line.unit}`}
          price={formatCurrency(line.qty * line.unitCost)}
        />
      ))}
      <Section title="Bids">
        <MetaRow label="Open bids" value={String(job.bidCount)} />
        <Text style={{ fontFamily: "Questrial", fontSize: 14, color: theme.colors.textMuted }}>
          Vendor bids appear here after invitation.
        </Text>
      </Section>
    </Animated.View>
  );

  return (
    <Screen edges={["top", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: theme.space[10] }}>
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
        <HeroBand tone="jobDetail" eyebrow="Job detail" title={job.name} />

        {isTablet ? (
          <View
            style={{
              flexDirection: "row",
              paddingHorizontal: gutter,
              paddingTop: theme.space[6],
              gap: theme.space[7],
            }}
          >
            <View style={{ flex: 1 }}>{summary}</View>
            <View
              style={{
                flex: 1.2,
                borderLeftWidth: theme.stroke.hairline,
                borderLeftColor: theme.colors.border,
                paddingLeft: theme.space[7],
              }}
            >
              {takeoff}
            </View>
          </View>
        ) : (
          <View style={{ paddingHorizontal: gutter, paddingTop: theme.space[6], gap: theme.space[7] }}>
            {summary}
            {takeoff}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
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
        {title}
      </Text>
      <View
        style={{
          backgroundColor: theme.colors.surface,
          borderWidth: theme.stroke.hairline,
          borderColor: theme.colors.border,
          padding: theme.space[4],
          gap: theme.space[3],
        }}
      >
        {children}
      </View>
    </View>
  );
}

function MetaRow({
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
      <Text
        style={{
          fontFamily: accent ? "Staatliches" : "Questrial",
          fontSize: accent ? 20 : 15,
          letterSpacing: accent ? 0.8 : 0.15,
          color: accent ? theme.colors.accent : theme.colors.text,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
