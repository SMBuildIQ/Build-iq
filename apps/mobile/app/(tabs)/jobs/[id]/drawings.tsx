import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { router, useLocalSearchParams } from "expo-router";
import {
  Button,
  EmptyState,
  HeroBand,
  ListRow,
  Screen,
  useTheme,
} from "../../../../src/ui";
import {
  listBlueprints,
  uploadBlueprint,
  type BlueprintSummary,
} from "../../../../src/api/resources";
import { MOCK_BLUEPRINTS, MOCK_JOBS } from "../../../../src/data/mock";

function formatBytes(n?: number) {
  if (n == null || n <= 0) return "";
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** Upload drawings / plan sets for a job. */
export default function DrawingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme, gutter } = useTheme();
  const job = MOCK_JOBS.find((j) => j.id === id) ?? MOCK_JOBS[0];
  const [drawings, setDrawings] = useState<BlueprintSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const fromApi = await listBlueprints(id);
    setDrawings(fromApi === null ? MOCK_BLUEPRINTS[id] ?? [] : fromApi);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const onUpload = useCallback(async () => {
    if (!id) return;
    setNote(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*", "application/zip"],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;

      setUploading(true);
      const added: BlueprintSummary[] = [];

      for (const asset of result.assets) {
        const filename = asset.name || "drawing.pdf";
        const contentType = asset.mimeType || "application/pdf";
        const size = asset.size ?? 0;

        const apiRes = await uploadBlueprint(id, { filename, contentType, size });
        const entry: BlueprintSummary = {
          id: apiRes?.id ?? `local_${Date.now()}_${filename}`,
          name: apiRes?.name ?? filename,
          sheets: 1,
          uploadedAt: new Date().toISOString().slice(0, 10),
          mimeType: contentType,
          sizeBytes: size,
        };
        added.push(entry);
      }

      setDrawings((prev) => [...added, ...prev]);
      const first = added[0];
      setNote(
        added.length === 1 && first
          ? `${first.name} queued for takeoff.`
          : `${added.length} drawings uploaded.`
      );
    } catch (e) {
      Alert.alert(
        "Upload failed",
        e instanceof Error ? e.message : "Could not pick or upload drawings."
      );
    } finally {
      setUploading(false);
    }
  }, [id]);

  return (
    <Screen edges={["top", "left", "right"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: theme.space[10], flexGrow: 1 }}
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
          tone="jobDetail"
          eyebrow={job?.name ?? "Job"}
          title="Drawings"
          supporting="Upload PDF plan sets, elevations, and details for AI takeoff."
        />

        <View
          style={{
            paddingHorizontal: gutter,
            paddingTop: theme.space[5],
            gap: theme.space[5],
            flex: 1,
          }}
        >
          <Button
            label={uploading ? "Uploading…" : "Upload drawings"}
            onPress={() => void onUpload()}
            disabled={uploading}
            accessibilityLabel="Upload drawings"
          />
          <Text
            style={{
              fontFamily: "Questrial",
              fontSize: 13,
              color: theme.colors.textMuted,
              marginTop: -theme.space[2],
            }}
          >
            PDF, PNG, JPG, or ZIP · multi-select supported
          </Text>

          {note ? (
            <Text
              style={{ fontFamily: "Questrial", fontSize: 14, color: theme.colors.accent }}
              accessibilityLiveRegion="polite"
            >
              {note}
            </Text>
          ) : null}

          {loading ? (
            <View style={{ paddingVertical: theme.space[10], alignItems: "center" }}>
              <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Loading drawings" />
            </View>
          ) : drawings.length === 0 ? (
            <EmptyState
              hand="Plans await"
              title="No drawings yet"
              body="Upload a plan set to unlock AI takeoff and estimates."
              action={
                <Button
                  label="Upload drawings"
                  variant="secondary"
                  onPress={() => void onUpload()}
                  disabled={uploading}
                />
              }
            />
          ) : (
            <View style={{ gap: theme.space[1] }}>
              <Text
                style={{
                  fontFamily: "Staatliches",
                  fontSize: 22,
                  letterSpacing: 0.88,
                  textTransform: "uppercase",
                  color: theme.colors.text,
                  marginBottom: theme.space[2],
                }}
              >
                Uploaded sets
              </Text>
              {drawings.map((bp) => (
                <ListRow
                  key={bp.id}
                  title={bp.name}
                  meta={[
                    `${bp.sheets} sheet${bp.sheets === 1 ? "" : "s"}`,
                    bp.uploadedAt,
                    formatBytes(bp.sizeBytes),
                  ]
                    .filter(Boolean)
                    .join("  ·  ")}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
