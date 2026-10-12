import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { CATALOG, type CatalogGroup, type CatalogProduct } from "@/data/catalog";
import { useAuth } from "@/hooks/useAuth";

export type CartItem = {
  productId: string;
  name: string;
  group: CatalogGroup;
  priceCents: number;
  quantity: number;
  /** Blood work is required before this can be prescribed. */
  requiresLabs: boolean;
  /** Schedule IV / hormone therapy — needs a government photo ID on file. */
  isControlled: boolean;
  /** A licensed provider must review before it ships. */
  requiresApproval: boolean;
  /** A telehealth visit with a licensed provider is required. */
  requiresTelehealth: boolean;
  /** For lab panels bought inside a treatment flow: the treatment they belong to. */
  forProductId?: string | null;
};

const STORAGE_PREFIX = "amino-flux-cart-v1";

/** Each signed-in patient gets their own cart; signed-out visitors have none. */
function storageKeyFor(userId: string | null): string | null {
  return userId ? `${STORAGE_PREFIX}:${userId}` : null;
}

export function priceToCents(price: string): number {
  const n = Number(String(price).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function isControlledProduct(p: Pick<CatalogProduct, "id" | "group">): boolean {
  return p.id.startsWith("ctrl-") || p.group === "hormones";
}

export function requiresApprovalProduct(p: Pick<CatalogProduct, "id" | "group" | "lab">): boolean {
  if (p.group === "labs" || p.group === "vitamins") return false;
  return true;
}

export function toCartItem(
  p: CatalogProduct,
  forProductId?: string | null,
): Omit<CartItem, "quantity"> {
  return {
    productId: p.id,
    forProductId: forProductId ?? null,
    name: p.name,
    group: p.group,
    priceCents: priceToCents(p.price),
    requiresLabs: p.lab,
    isControlled: isControlledProduct(p),
    requiresApproval: requiresApprovalProduct(p),
    requiresTelehealth: p.telehealth,
  };
}

export function cartItemForId(
  productId: string,
  forProductId?: string | null,
): Omit<CartItem, "quantity"> | null {
  const p = CATALOG.find((c) => c.id === productId);
  return p ? toCartItem(p, forProductId) : null;
}

export function cartItemForName(name: string): Omit<CartItem, "quantity"> | null {
  const p = CATALOG.find((c) => c.name === name);
  return p ? toCartItem(p) : null;
}

type CartState = {
  items: CartItem[];
  hydrated: boolean;
  add: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  remove: (productId: string) => void;
  setQuantity: (productId: string, qty: number) => void;
  clear: () => void;
  subtotalCents: number;
  count: number;
};

const CartContext = createContext<CartState | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Load the signed-in patient's own cart; signed-out means an empty cart.
  useEffect(() => {
    setHydrated(false);
    if (authLoading) return;
    const key = storageKeyFor(userId);
    if (!key) {
      setItems([]);
      setHydrated(true);
      return;
    }
    try {
      const raw = window.localStorage.getItem(key);
      const parsed: CartItem[] = raw ? JSON.parse(raw) : [];
      // Drop anything no longer in the catalog, and refresh names/prices.
      setItems(
        parsed
          .map((i) => {
            const fresh = cartItemForId(i.productId, i.forProductId ?? null);
            return fresh ? { ...fresh, quantity: Math.max(1, Number(i.quantity) || 1) } : null;
          })
          .filter((i): i is CartItem => i !== null),
      );
    } catch {
      setItems([]);
    }
    setHydrated(true);
  }, [userId, authLoading]);

  useEffect(() => {
    if (!hydrated) return;
    const key = storageKeyFor(userId);
    if (!key) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(items));
    } catch {
      /* storage unavailable */
    }
  }, [items, hydrated, userId]);

  const value = useMemo<CartState>(() => {
    const subtotalCents = items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0);
    return {
      items,
      hydrated,
      subtotalCents,
      count: items.reduce((sum, i) => sum + i.quantity, 0),
      add: (item, qty = 1) =>
        setItems((prev) => {
          const existing = prev.find((i) => i.productId === item.productId);
          if (existing) {
            return prev.map((i) =>
              i.productId === item.productId ? { ...i, quantity: i.quantity + qty } : i,
            );
          }
          return [...prev, { ...item, quantity: qty }];
        }),
      remove: (productId) => setItems((prev) => prev.filter((i) => i.productId !== productId)),
      setQuantity: (productId, qty) =>
        setItems((prev) =>
          qty <= 0
            ? prev.filter((i) => i.productId !== productId)
            : prev.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i)),
        ),
      clear: () => setItems([]),
    };
  }, [items, hydrated]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) {
    return {
      items: [],
      hydrated: false,
      add: () => {},
      remove: () => {},
      setQuantity: () => {},
      clear: () => {},
      subtotalCents: 0,
      count: 0,
    };
  }
  return ctx;
}
