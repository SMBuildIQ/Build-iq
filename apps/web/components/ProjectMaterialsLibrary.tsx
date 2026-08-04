"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import type { MaterialCatalogItem, MaterialLibraryCategory, ProjectLibraryItem } from "@buildiq/types";
import { Button } from "@/components/Button";
import { FilterChip } from "@/components/FilterChip";
import { apiFetch, ApiError } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import {
  DEMO_PROJECT_LIBRARIES,
  MATERIAL_CATALOG,
  MATERIAL_LIBRARY_CATEGORIES,
} from "@/lib/material-library";

type Filter = "All" | MaterialLibraryCategory;
type Mode = "library" | "add";

type Props = {
  projectId: string;
};

export function ProjectMaterialsLibrary({ projectId }: Props) {
  const [filter, setFilter] = useState<Filter>("All");
  const [mode, setMode] = useState<Mode>("library");
  const [items, setItems] = useState<ProjectLibraryItem[]>(
    () => DEMO_PROJECT_LIBRARIES[projectId] ?? []
  );
  const [catalog, setCatalog] = useState<MaterialCatalogItem[]>(MATERIAL_CATALOG);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [lib, cat] = await Promise.all([
        apiFetch<{ materials: ProjectLibraryItem[] }>(`/projects/${projectId}/materials`),
        apiFetch<{ items: MaterialCatalogItem[] }>("/materials/catalog"),
      ]);
      if (lib.materials?.length) setItems(lib.materials);
      else setItems(DEMO_PROJECT_LIBRARIES[projectId] ?? []);
      if (cat.items?.length) setCatalog(cat.items);
    } catch {
      setItems(DEMO_PROJECT_LIBRARIES[projectId] ?? []);
      setCatalog(MATERIAL_CATALOG);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredLibrary = useMemo(
    () => (filter === "All" ? items : items.filter((i) => i.category === filter)),
    [filter, items]
  );

  const filteredCatalog = useMemo(() => {
    const saved = new Set(items.map((i) => `${i.category}::${i.name}`));
    const pool = filter === "All" ? catalog : catalog.filter((c) => c.category === filter);
    return pool.filter((c) => !saved.has(`${c.category}::${c.name}`));
  }, [catalog, filter, items]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      map.set(item.category, (map.get(item.category) ?? 0) + 1);
    }
    return map;
  }, [items]);

  async function onAdd(item: MaterialCatalogItem) {
    setAddingId(item.id);
    setNote(null);
    try {
      const res = await apiFetch<{ material: ProjectLibraryItem }>(
        `/projects/${projectId}/materials`,
        {
          method: "POST",
          body: {
            catalogId: item.id,
            category: item.category,
            name: item.name,
            description: item.description,
            quantity: 1,
            unit: item.unit,
            unitCost: item.unitCost,
            spruceSku: item.spruceSku,
            source: "catalog",
          },
        }
      );
      const next = res.material ?? {
        id: `local_${Date.now()}_${item.id}`,
        projectId,
        category: item.category,
        name: item.name,
        description: item.description,
        quantity: 1,
        unit: item.unit,
        unitCost: item.unitCost,
        spruceSku: item.spruceSku,
        source: "catalog" as const,
        updatedAt: new Date().toISOString(),
      };
      startTransition(() => {
        setItems((prev) => [...prev, next]);
        setNote(`${item.name} saved to this project library.`);
        setMode("library");
        setFilter(item.category);
      });
    } catch (err) {
      const isNetwork =
        err instanceof TypeError ||
        (err instanceof Error && /fetch|network|failed/i.test(err.message));
      if (isNetwork || (err instanceof ApiError && err.status >= 500)) {
        const next: ProjectLibraryItem = {
          id: `local_${Date.now()}_${item.id}`,
          projectId,
          category: item.category,
          name: item.name,
          description: item.description,
          quantity: 1,
          unit: item.unit,
          unitCost: item.unitCost,
          spruceSku: item.spruceSku,
          source: "catalog",
          updatedAt: new Date().toISOString(),
        };
        setItems((prev) => [...prev, next]);
        setNote(`Demo: ${item.name} saved locally. Connect the API to persist.`);
        setMode("library");
        setFilter(item.category);
      } else {
        setNote(err instanceof Error ? err.message : "Could not save material.");
      }
    } finally {
      setAddingId(null);
    }
  }

  return (
    <section className="bq-section">
      <div className="bq-section-head">
        <h2 className="bq-title">Materials library</h2>
        <span className="bq-label" style={{ color: "var(--bq-text-muted)" }}>
          {items.length} saved
        </span>
      </div>
      <p className="bq-body" style={{ color: "var(--bq-text-secondary)", margin: "0 0 16px" }}>
        Saved orders for this job — lumber, trusses, I-joists, windows, entry / interior / exterior
        doors, cabinetry, hardware, masonry stone, and millwork.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <Button
          compact
          variant={mode === "library" ? "primary" : "secondary"}
          onClick={() => setMode("library")}
        >
          Library
        </Button>
        <Button
          compact
          variant={mode === "add" ? "primary" : "secondary"}
          onClick={() => setMode("add")}
        >
          Add from yard
        </Button>
      </div>

      {note ? (
        <p className="bq-body" style={{ color: "var(--bq-accent-primary)", margin: "0 0 12px" }}>
          {note}
        </p>
      ) : null}

      <div className="bq-chips" role="group" aria-label="Material categories" style={{ marginBottom: 20 }}>
        <FilterChip label="All" active={filter === "All"} onClick={() => setFilter("All")} />
        {MATERIAL_LIBRARY_CATEGORIES.map((c) => (
          <FilterChip
            key={c}
            label={counts.get(c) ? `${c} (${counts.get(c)})` : c}
            active={filter === c}
            onClick={() => setFilter(c)}
          />
        ))}
      </div>

      <div className="bq-panel">
        {loading || pending ? (
          <p className="bq-body" style={{ color: "var(--bq-text-muted)", margin: 0 }}>
            Loading library…
          </p>
        ) : mode === "library" ? (
          filteredLibrary.length === 0 ? (
            <div className="bq-empty" style={{ padding: "32px 16px" }}>
              <p className="bq-hand" style={{ color: "var(--bq-accent-primary)", fontSize: 20 }}>
                Empty bay
              </p>
              <p className="bq-body" style={{ color: "var(--bq-text-secondary)", margin: "8px 0 16px" }}>
                Add lumber, trusses, I-joists, openings, cabinetry, hardware, and stone to this
                project library.
              </p>
              <Button variant="secondary" compact onClick={() => setMode("add")}>
                Add from yard
              </Button>
            </div>
          ) : (
            <table className="bq-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Source</th>
                  <th>Unit cost</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredLibrary.map((item) => (
                  <tr key={item.id}>
                    <td>{item.category}</td>
                    <td>{item.name}</td>
                    <td>{item.quantity}</td>
                    <td>{item.unit}</td>
                    <td>{item.source}</td>
                    <td>{formatCurrency(item.unitCost)}</td>
                    <td>{formatCurrency(item.quantity * item.unitCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : filteredCatalog.length === 0 ? (
          <div className="bq-empty" style={{ padding: "32px 16px" }}>
            <p className="bq-hand" style={{ color: "var(--bq-accent-primary)", fontSize: 20 }}>
              All set
            </p>
            <p className="bq-body" style={{ color: "var(--bq-text-secondary)", margin: "8px 0 0" }}>
              Every catalog item in this category is already in the project library.
            </p>
          </div>
        ) : (
          <div className="bq-list">
            {filteredCatalog.map((item) => (
              <div key={item.id} className="bq-list-row">
                <div className="bq-list-row-main">
                  <p className="bq-label" style={{ color: "var(--bq-accent-primary)", margin: 0 }}>
                    {item.category}
                  </p>
                  <div className="bq-list-row-title-row">
                    <span className="bq-list-row-title" style={{ fontSize: 20 }}>
                      {item.name}
                    </span>
                  </div>
                  {item.description ? (
                    <p className="bq-body" style={{ color: "var(--bq-text-secondary)", margin: "4px 0 0" }}>
                      {item.description}
                    </p>
                  ) : null}
                </div>
                <div className="bq-list-row-trail" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div className="bq-list-row-price">
                    {formatCurrency(item.unitCost)}
                    <span className="bq-label" style={{ color: "var(--bq-text-muted)", marginLeft: 4 }}>
                      / {item.unit}
                    </span>
                  </div>
                  <Button
                    compact
                    disabled={addingId === item.id}
                    onClick={() => void onAdd(item)}
                  >
                    {addingId === item.id ? "Saving…" : "Save to project"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
