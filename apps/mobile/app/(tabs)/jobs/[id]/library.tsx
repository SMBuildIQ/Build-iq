import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import type { MaterialCatalogItem, MaterialLibraryCategory, ProjectLibraryItem } from "@buildiq/types";
import { MATERIAL_LIBRARY_CATEGORIES } from "@buildiq/types";
import {
  Button,
  EmptyState,
  FilterChip,
  HeroBand,
  ListRow,
  Screen,
  useTheme,
} from "../../../../src/ui";
import {
  addProjectMaterial,
  listMaterialCatalog,
  listProjectMaterials,
} from "../../../../src/api/resources";
import { MOCK_JOBS, formatCurrency } from "../../../../src/data/mock";
import {
  MATERIAL_CATALOG,
  MOCK_PROJECT_LIBRARIES,
} from "../../../../src/data/materialLibrary";

type Filter = "All" | MaterialLibraryCategory;

/** Per-project materials library — saved orders & specialty materials by category. */
export default function ProjectLibraryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme, gutter } = useTheme();
  const job = MOCK_JOBS.find((j) => j.id === id) ?? MOCK_JOBS[0];
  const [filter, setFilter] = useState<Filter>("All");
  const [items, setItems] = useState<ProjectLibraryItem[]>([]);
  const [catalog, setCatalog] = useState<MaterialCatalogItem[]>(MATERIAL_CATALOG);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [mode, setMode] = useState<"library" | "add">("library");
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [lib, cat] = await Promise.all([listProjectMaterials(id), listMaterialCatalog()]);
    if (lib?.materials?.length) setItems(lib.materials);
    else setItems(MOCK_PROJECT_LIBRARIES[id] ?? []);
    if (cat?.items?.length) setCatalog(cat.items);
    else setCatalog(MATERIAL_CATALOG);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredLibrary = useMemo(
    () => (filter === "All" ? items : items.filter((i) => i.category === filter)),
    [filter, items]
  );

  const filteredCatalog = useMemo(() => {
    const savedNames = new Set(items.map((i) => `${i.category}::${i.name}`));
    const pool = filter === "All" ? catalog : catalog.filter((c) => c.category === filter);
    return pool.filter((c) => !savedNames.has(`${c.category}::${c.name}`));
  }, [catalog, filter, items]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      map.set(item.category, (map.get(item.category) ?? 0) + 1);
    }
    return map;
  }, [items]);

  const onAdd = useCallback(
    async (item: MaterialCatalogItem) => {
      if (!id) return;
      setAddingId(item.id);
      setNote(null);
      const apiItem = await addProjectMaterial(id, {
        catalogId: item.id,
        category: item.category,
        name: item.name,
        description: item.description,
        quantity: 1,
        unit: item.unit,
        unitCost: item.unitCost,
        spruceSku: item.spruceSku,
        source: "catalog",
      });
      const next: ProjectLibraryItem =
        apiItem ??
        ({
          id: `local_${Date.now()}_${item.id}`,
          projectId: id,
          category: item.category,
          name: item.name,
          description: item.description,
          quantity: 1,
          unit: item.unit,
          unitCost: item.unitCost,
          spruceSku: item.spruceSku,
          source: "catalog",
          updatedAt: new Date().toISOString(),
        } satisfies ProjectLibraryItem);
      setItems((prev) => [...prev, next]);
      setNote(`${item.name} saved to this project library.`);
      setAddingId(null);
      setMode("library");
      setFilter(item.category);
    },
    [id]
  );

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
          tone="shop"
          eyebrow={job?.name ?? "Project"}
          title="Materials library"
          supporting="Saved orders & specialty materials for this job — lumber through stone."
        />

        <View style={{ paddingHorizontal: gutter, paddingTop: theme.space[4], gap: theme.space[3] }}>
          <View style={{ flexDirection: "row", gap: theme.space[2] }}>
            <Button
              label="Library"
              compact
              variant={mode === "library" ? "primary" : "secondary"}
              onPress={() => setMode("library")}
              style={{ flex: 1 }}
            />
            <Button
              label="Add from yard"
              compact
              variant={mode === "add" ? "primary" : "secondary"}
              onPress={() => setMode("add")}
              style={{ flex: 1 }}
            />
          </View>

          {note ? (
            <Text style={{ fontFamily: "Questrial", fontSize: 14, color: theme.colors.accent }}>
              {note}
            </Text>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: gutter,
            paddingVertical: theme.space[4],
            gap: theme.space[2],
          }}
        >
          <FilterChip label="All" active={filter === "All"} onPress={() => setFilter("All")} />
          {MATERIAL_LIBRARY_CATEGORIES.map((c) => (
            <FilterChip
              key={c}
              label={counts.get(c) ? `${c} (${counts.get(c)})` : c}
              active={filter === c}
              onPress={() => setFilter(c)}
            />
          ))}
        </ScrollView>

        <View style={{ paddingHorizontal: gutter, gap: theme.space[3], flex: 1 }}>
          {loading ? (
            <View style={{ paddingVertical: theme.space[10], alignItems: "center" }}>
              <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Loading library" />
            </View>
          ) : mode === "library" ? (
            filteredLibrary.length === 0 ? (
              <EmptyState
                hand="Empty bay"
                title="No materials saved"
                body="Add lumber, trusses, I-joists, openings, cabinetry, hardware, and stone to this project library."
                action={
                  <Button label="Add from yard" variant="secondary" onPress={() => setMode("add")} />
                }
              />
            ) : (
              filteredLibrary.map((item) => (
                <ListRow
                  key={item.id}
                  title={item.name}
                  status={String(item.category)}
                  statusTone="progress"
                  meta={`${item.quantity} ${item.unit}  ·  ${item.source}  ·  ${formatCurrency(item.unitCost)}/${item.unit}`}
                  price={formatCurrency(item.quantity * item.unitCost)}
                />
              ))
            )
          ) : filteredCatalog.length === 0 ? (
            <EmptyState
              hand="All set"
              title="Nothing left to add"
              body="Every catalog item in this category is already in the project library."
            />
          ) : (
            filteredCatalog.map((item) => (
              <View
                key={item.id}
                style={{
                  backgroundColor: theme.colors.surface,
                  borderWidth: theme.stroke.hairline,
                  borderColor: theme.colors.border,
                  padding: theme.space[4],
                  gap: theme.space[3],
                }}
              >
                <Text
                  style={{
                    fontFamily: "Questrial",
                    fontSize: 11,
                    fontWeight: "700",
                    letterSpacing: 1.6,
                    textTransform: "uppercase",
                    color: theme.colors.accent,
                  }}
                >
                  {item.category}
                </Text>
                <Text
                  style={{
                    fontFamily: "Staatliches",
                    fontSize: 22,
                    letterSpacing: 0.8,
                    textTransform: "uppercase",
                    color: theme.colors.text,
                  }}
                >
                  {item.name}
                </Text>
                {item.description ? (
                  <Text style={{ fontFamily: "Questrial", fontSize: 14, color: theme.colors.textSecondary }}>
                    {item.description}
                  </Text>
                ) : null}
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontFamily: "Staatliches", fontSize: 24, color: theme.colors.accent }}>
                    {formatCurrency(item.unitCost)}
                    <Text style={{ fontFamily: "Questrial", fontSize: 13, color: theme.colors.textMuted }}>
                      {" "}
                      / {item.unit}
                    </Text>
                  </Text>
                  <Button
                    label={addingId === item.id ? "Saving…" : "Save to project"}
                    compact
                    disabled={addingId === item.id}
                    onPress={() => void onAdd(item)}
                    accessibilityLabel={`Save ${item.name} to project`}
                  />
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
