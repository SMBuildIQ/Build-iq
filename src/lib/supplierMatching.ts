// Supplier.categories is captured on creation (src/app/api/v1/suppliers/route.ts)
// but was never read back anywhere — brief §9's sourcing step should prioritize
// suppliers whose categories match the purchase request's line items, not just
// list every active supplier alphabetically. Pure functions so the ranking is
// unit-testable without a database.

export function parseCategories(categoriesJson: string | null): string[] {
  if (!categoriesJson) return [];
  try {
    const parsed = JSON.parse(categoriesJson);
    return Array.isArray(parsed) ? parsed.filter((c): c is string => typeof c === "string") : [];
  } catch {
    return [];
  }
}

export function matchingCategories(supplierCategories: string[], targetCategories: string[]): string[] {
  const targetSet = new Set(targetCategories.map((c) => c.toLowerCase()));
  return supplierCategories.filter((c) => targetSet.has(c.toLowerCase()));
}

export interface RankedSupplier<T extends { categories: string[] }> {
  supplier: T;
  matchedCategories: string[];
}

// Suppliers with at least one matching category sort first (most matches
// first among those), ties and non-matches keep their incoming order —
// callers pass suppliers pre-sorted by name, so this is a stable re-rank.
export function rankSuppliersByCategoryMatch<T extends { categories: string[] }>(
  suppliers: T[],
  targetCategories: string[]
): RankedSupplier<T>[] {
  return suppliers
    .map((supplier) => ({ supplier, matchedCategories: matchingCategories(supplier.categories, targetCategories) }))
    .sort((a, b) => b.matchedCategories.length - a.matchedCategories.length);
}
