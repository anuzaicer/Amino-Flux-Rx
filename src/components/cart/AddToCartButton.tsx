import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, ShieldCheck, ShoppingCart } from "lucide-react";
import { cartItemForId, useCart } from "@/lib/cart-context";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function AddToCartButton({
  productId,
  accent,
  className = "",
  forProductId,
}: {
  productId: string;
  accent: string;
  className?: string;
  /** When this item is bought as part of another treatment's path. */
  forProductId?: string;
}) {
  const { add } = useCart();
  const { user, loading } = useAuth();
  const [added, setAdded] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const onAdd = () => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    const item = cartItemForId(productId, forProductId ?? null);
    if (!item) return;
    add(item);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  };

  // rgba of the accent for the drop-shadow glow
  const hex = accent.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const shadow = `${r}, ${g}, ${b}`;

  return (
    <>
      <button
        type="button"
        onClick={onAdd}
        className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold text-white transition ${className}`}
        style={{
          backgroundColor: accent,
          ["--btn-shadow" as string]: shadow,
          boxShadow: `0 8px 20px -8px rgba(${shadow}, 0.55)`,
        }}
      >
        {added ? (
          <>
            <Check className="h-3.5 w-3.5" /> Added to cart
          </>
        ) : (
          <>
            <ShoppingCart className="h-3.5 w-3.5" /> Add to cart
          </>
        )}
      </button>

      <Dialog open={authOpen} onOpenChange={setAuthOpen}>
        <DialogContent className="max-w-md rounded-3xl border-[#2173D1]/20 bg-white p-8">
          <DialogHeader className="space-y-3 text-center">
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-white"
              style={{ backgroundColor: accent }}
            >
              <ShieldCheck className="h-7 w-7" />
            </div>
            <DialogTitle className="text-2xl font-bold tracking-tight text-slate-900">
              Create your free account
            </DialogTitle>
            <DialogDescription className="text-base leading-relaxed text-slate-600">
              To add treatments to your cart, please register or sign in. Your account keeps your
              orders, lab results, and provider care secure and private.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 flex flex-col gap-3">
            <Link
              to="/auth"
              search={{
                redirect:
                  typeof window !== "undefined"
                    ? window.location.pathname + window.location.search
                    : "/",
              }}
              className="inline-flex items-center justify-center rounded-full px-6 py-3.5 text-base font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: accent }}
            >
              Register / Sign in
            </Link>
            <button
              type="button"
              onClick={() => setAuthOpen(false)}
              className="text-sm font-medium text-slate-500 transition hover:text-slate-700"
            >
              Continue browsing
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
