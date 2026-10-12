import { Link } from "@tanstack/react-router";
import { ArrowRight, Clock } from "lucide-react";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import type { InProgressTreatment } from "@/lib/journey";
import { useCart } from "@/lib/cart-context";
import { productImageFor } from "@/lib/product-images";

function StatusPill({ item, accent }: { item: InProgressTreatment; accent: string }) {
  const label = item.needsAction ? "Action needed" : item.waiting ? "Waiting on us" : "In progress";
  const style = item.needsAction
    ? { backgroundColor: accent, color: "#fff" }
    : { backgroundColor: "#EEF2F7", color: "#44566C" };
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-bold uppercase tracking-[0.08em]"
      style={style}
    >
      {!item.needsAction && <Clock className="h-3 w-3" aria-hidden="true" />}
      {label}
    </span>
  );
}

/** Treatments the patient started but has not ordered yet, with their live step. */
export function InProgressTreatments({
  items,
  accent,
  title = "What you're working on",
  emptyHint,
  onViewAll,
}: {
  items: InProgressTreatment[];
  accent: string;
  title?: string;
  emptyHint?: string;
  onViewAll?: () => void;
}) {
  const { items: cartItems } = useCart();
  // Once a treatment is in the cart it is no longer "in progress" — it moves on
  // to checkout and then to My orders.
  const inCart = new Set(cartItems.map((i) => i.productId));
  items = items.filter((t) => !inCart.has(t.productId));

  if (!items.length) {
    return emptyHint ? (
      <p className="rounded-2xl bg-white p-5 text-[15px] text-[#0F1E33]/70 shadow-sm ring-1 ring-black/5">
        {emptyHint}
      </p>
    ) : null;
  }

  return (
    <section aria-label={title}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <h2 className="text-lg font-bold tracking-tight text-[#0F1E33]">{title}</h2>
        {onViewAll ? (
          <button
            type="button"
            onClick={onViewAll}
            className="inline-flex items-center gap-1 text-[15px] font-semibold hover:underline"
            style={{ color: accent }}
          >
            View all in progress
            <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const pct = Math.round((item.stepIndex / item.stepTotal) * 100);
          return (
            <li
              key={item.productId}
              className="flex flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
              style={item.needsAction ? { boxShadow: `inset 0 0 0 2px ${accent}` } : undefined}
            >
              <div className="flex items-start gap-3">
                <img
                  src={productImageFor(item.group, item.productId)}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-xl object-cover"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <StatusPill item={item} accent={accent} />
                   <p className="mt-2 line-clamp-2 text-[15px] font-bold leading-snug text-[#0F1E33]">
                    {item.productName}
                  </p>
                </div>
              </div>

              <p className="mt-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#0F1E33]/55">
                Step {item.stepIndex} of {item.stepTotal} · {item.stepLabel}
              </p>
              <div
                className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#E6EAF0]"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: accent }}
                />
              </div>
              <p className="mt-2 text-[15px] text-[#0F1E33]/75">{item.status}</p>

              {item.readyToOrder ? (
                <AddToCartButton
                  productId={item.productId}
                  accent={accent}
                  className="mt-3 w-full py-2.5 text-[15px]"
                />
              ) : (
                <Link
                  to="/product/$productId"
                  params={{ productId: item.productId }}
                  className="mt-3 inline-flex items-center gap-1.5 text-[15px] font-semibold"
                  style={{ color: accent }}
                >
                  {item.needsAction ? "Continue" : "View progress"}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
