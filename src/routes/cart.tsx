import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Minus,
  Plus,
  Trash2,
  FlaskConical,
  Stethoscope,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { SiteHeader } from "@/components/home/SiteHeader";
import { SiteFooter } from "@/components/home/SiteFooter";
import { useGender } from "@/components/gender/GenderContext";
import { useCart, formatPrice } from "@/lib/cart-context";
import { cartRequiresApproval, cartRequiresIntake, cartRequiresPhotoId } from "@/data/consents";
import { useAuth } from "@/hooks/useAuth";
import { myJourney } from "@/lib/journey.functions";
import { inProgressTreatments, type JourneyState, type InProgressTreatment } from "@/lib/journey";
import { InProgressTreatments } from "@/components/account/InProgressTreatments";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your cart | Amino Flux Rx" },
      {
        name: "description",
        content:
          "Review your Amino Flux Rx treatments and lab panels before completing your provider-reviewed order.",
      },
      { property: "og:title", content: "Your cart | Amino Flux Rx" },
      {
        property: "og:description",
        content: "Review your treatments and lab panels before checking out.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { theme } = useGender();
  const accent = theme === "men" ? "#2173D1" : "#5C9330";
  const { items, hydrated, setQuantity, remove, subtotalCents } = useCart();
  const { user, loading: authLoading } = useAuth();
  const runJourney = useServerFn(myJourney);
  const [inProgress, setInProgress] = useState<InProgressTreatment[]>([]);

  useEffect(() => {
    if (!user) {
      setInProgress([]);
      return;
    }
    let cancelled = false;
    void runJourney()
      .then((res) => {
        if (!cancelled) setInProgress(inProgressTreatments(res.state as JourneyState));
      })
      .catch(() => {
        if (!cancelled) setInProgress([]);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const showInProgress = !authLoading && user && inProgress.length > 0;

  return (
    <div className="relative min-h-screen text-white">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pb-24 sm:pt-16">
        <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
          Your cart
        </h1>
        <p className="mt-2 text-white/85">
          Prescription items are reviewed by a licensed provider before anything ships.
        </p>

        {!hydrated ? (
          <p className="mt-10 text-white/80">Loading your cart…</p>
        ) : items.length === 0 ? (
          <div className="mt-8 rounded-2xl bg-white p-6 text-center text-[#0F1E33] sm:mt-10 sm:rounded-3xl sm:p-10">
            <p className="text-lg font-semibold">Your cart is empty.</p>
            <p className="mt-2 text-sm text-[#0F1E33]/70">
              Browse the catalog to add treatments and lab panels.
            </p>
            <Link
              to="/category/$category"
              params={{ category: theme }}
              className="mt-6 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white"
              style={{ backgroundColor: accent }}
            >
              Browse care <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid min-w-0 gap-6 sm:mt-10 lg:grid-cols-[1.6fr_1fr] lg:gap-8">
            <ul className="space-y-4">
              {items.map((i) => (
                <li
                  key={i.productId}
                  className="min-w-0 rounded-2xl bg-white p-4 text-[#0F1E33] shadow-[0_20px_60px_-25px_rgba(0,0,0,0.35)] sm:rounded-3xl sm:p-5"
                >
                  <div className="grid min-w-0 gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                    <div className="min-w-0">
                      <h2 className="font-display text-lg font-bold">{i.name}</h2>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {i.requiresLabs && (
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[15px] font-semibold"
                            style={{ backgroundColor: `${accent}1A`, color: accent }}
                          >
                            <FlaskConical className="h-3 w-3" /> Lab work required
                          </span>
                        )}
                        {i.requiresTelehealth && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0F1E33]/8 px-2.5 py-1 text-[15px] font-semibold text-[#0F1E33]/75">
                            <Stethoscope className="h-3 w-3" /> Telehealth visit required
                          </span>
                        )}
                        {i.isControlled && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0F1E33]/8 px-2.5 py-1 text-[15px] font-semibold text-[#0F1E33]/75">
                            <ShieldCheck className="h-3 w-3" /> Photo ID required
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 sm:justify-end sm:gap-3">
                      <div className="flex items-center rounded-full border border-[#0F1E33]/15">
                        <button
                          type="button"
                          aria-label={`Decrease quantity of ${i.name}`}
                          onClick={() => setQuantity(i.productId, i.quantity - 1)}
                          className="grid h-9 w-9 place-items-center rounded-full hover:bg-[#0F1E33]/5"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-8 text-center text-[15px] font-semibold">
                          {i.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label={`Increase quantity of ${i.name}`}
                          onClick={() => setQuantity(i.productId, i.quantity + 1)}
                          className="grid h-9 w-9 place-items-center rounded-full hover:bg-[#0F1E33]/5"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="min-w-20 text-right font-display text-base font-bold sm:w-24 sm:text-lg">
                        {formatPrice(i.priceCents * i.quantity)}
                      </span>
                      <button
                        type="button"
                        aria-label={`Remove ${i.name}`}
                        onClick={() => remove(i.productId)}
                        className="grid h-9 w-9 place-items-center rounded-full text-[#0F1E33]/50 hover:bg-[#0F1E33]/5 hover:text-[#0F1E33]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <aside className="h-fit rounded-2xl bg-white p-5 text-[#0F1E33] shadow-[0_20px_60px_-25px_rgba(0,0,0,0.35)] sm:rounded-3xl sm:p-6">
              <h2 className="font-display text-xl font-bold">Order summary</h2>
              <dl className="mt-4 space-y-2 text-[15px]">
                <div className="flex justify-between">
                  <dt className="text-[#0F1E33]/70">Subtotal</dt>
                  <dd className="font-semibold">{formatPrice(subtotalCents)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#0F1E33]/70">Shipping</dt>
                  <dd className="font-semibold">Free</dd>
                </div>
                <div className="flex justify-between border-t border-[#0F1E33]/10 pt-3 text-lg">
                  <dt className="font-semibold">Total today</dt>
                  <dd className="font-bold">{formatPrice(subtotalCents)}</dd>
                </div>
              </dl>

              <ul className="mt-5 space-y-2 text-[15px] text-[#0F1E33]/75">
                {cartRequiresIntake(items) && <li>· Medical intake required</li>}
                {cartRequiresPhotoId(items) && <li>· Government photo ID required</li>}
                {cartRequiresApproval(items) && <li>· Provider review before fulfillment</li>}
              </ul>

              <Link
                to="/checkout"
                className="mt-6 flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white"
                style={{ backgroundColor: accent }}
              >
                Continue to checkout <ArrowRight className="h-4 w-4" />
              </Link>
            </aside>
          </div>
        )}

        {showInProgress && (
          <section aria-label="Treatments still in progress" className="mt-12">
            <div className="rounded-2xl bg-white/95 p-5 shadow-[0_20px_60px_-25px_rgba(0,0,0,0.35)] sm:rounded-3xl sm:p-6">
              <InProgressTreatments items={inProgress} accent={accent} title="Still in progress" />
              <p className="mt-3 text-[15px] text-[#0F1E33]/65">
                These treatments aren't in your cart yet — finish their remaining steps (or add them
                once approved) before they can be ordered.
              </p>
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
