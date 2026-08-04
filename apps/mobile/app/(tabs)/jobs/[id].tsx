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
import { calculateEstimate } from "@buildiq/pricing";
import {
  MOCK_JOBS,
  MOCK_TAKEOFF,
  formatCurrency,
  projectStatusTone,
} from "../../../src/data/mock";

/** M3 — Job detail (tablet split ≥768) */
export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme, gutter, isTablet } = useTheme();

  const job = useMemo(
    () => MOCK_JOBS.find((j) => j.id === id) ?? MOCK_JOBS[0],
    [id]
  );

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

  if (!job) {
    return (
      <Screen gutter>
        <Text style={{ fontFamily: "Questrial", color: theme.colors.text }}>Job not found</Text>
      </Screen>
    );
  }

  const summary = (
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
          {formatCurrency(job.estimateGrandTotal)}
        </Text>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.space[2] }}>
        <Button label="Run AI" compact style={{ minWidth: 100 }} onPress={() => undefined} />
        <Button label="Export" variant="secondary" compact style={{ minWidth: 100 }} />
        <Button
          label="Create proposal"
          variant="secondary"
          compact
          onPress={() => router.push("/(tabs)/proposals")}
        />
        <Button label="Spruce" variant="ghost" compact />
      </View>

      <Section title="Blueprints">
        <MetaRow label="Sheets uploaded" value={String(job.blueprintCount)} />
        <MetaRow label="Stories" value={String(job.stories)} />
      </Section>

      <Section title="Cost estimate">
        <MetaRow label="Materials" value={formatCurrency(takeoffEstimate.materialCost)} />
        <MetaRow label="Labor" value={formatCurrency(takeoffEstimate.laborCost)} />
        <MetaRow label="Bids" value={String(job.bidCount)} />
        <MetaRow
          label="Grand total"
          value={formatCurrency(job.estimateGrandTotal ?? takeoffEstimate.grandTotal)}
          accent
        />
      </Section>
    </View>
  );

  const takeoff = (
    <View style={{ gap: theme.space[3] }}>
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
    </View>
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
        <HeroBand eyebrow="Job detail" title={job.name} />

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
