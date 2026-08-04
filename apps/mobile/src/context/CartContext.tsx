import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ShopPackage } from "@buildiq/types";
import * as Haptics from "expo-haptics";
import { addToCart as apiAddToCart } from "../api/resources";

export type CartLine = {
  packageId: string;
  name: string;
  category: string;
  unitPrice: number;
  quantity: number;
};

type CartContextValue = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  tax: number;
  total: number;
  addPackage: (pkg: ShopPackage, qty?: number) => void;
  setQuantity: (packageId: string, quantity: number) => void;
  remove: (packageId: string) => void;
  clear: () => void;
};

const TAX_RATE = 0.065;

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

  const addPackage = useCallback((pkg: ShopPackage, qty = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.packageId === pkg.id);
      if (existing) {
        return prev.map((l) =>
          l.packageId === pkg.id ? { ...l, quantity: l.quantity + qty } : l
        );
      }
      return [
        ...prev,
        {
          packageId: pkg.id,
          name: pkg.name,
          category: String(pkg.category),
          unitPrice: pkg.unitPrice,
          quantity: qty,
        },
      ];
    });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    // Best-effort sync; keep optimistic local cart either way
    void apiAddToCart({ packageId: pkg.id, quantity: qty });
  }, []);

  const setQuantity = useCallback((packageId: string, quantity: number) => {
    setLines((prev) =>
      quantity <= 0
        ? prev.filter((l) => l.packageId !== packageId)
        : prev.map((l) => (l.packageId === packageId ? { ...l, quantity } : l))
    );
  }, []);

  const remove = useCallback((packageId: string) => {
    setLines((prev) => prev.filter((l) => l.packageId !== packageId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0),
    [lines]
  );
  const tax = Math.round(subtotal * TAX_RATE);
  const total = subtotal + tax;
  const count = lines.reduce((sum, l) => sum + l.quantity, 0);

  const value = useMemo(
    () => ({
      lines,
      count,
      subtotal,
      tax,
      total,
      addPackage,
      setQuantity,
      remove,
      clear,
    }),
    [lines, count, subtotal, tax, total, addPackage, setQuantity, remove, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
