import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Clock3, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { useGender, GENDER_THEME } from "@/components/gender/GenderContext";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/lib/cart-context";
import { inProgressTreatments, type JourneyState } from "@/lib/journey";
import { myJourney } from "@/lib/journey.functions";

export function HomeInProgress() {
  const { user, loading: authLoading } = useAuth();
  const { theme } = useGender();
  const { items: cartItems } = useCart();
  const runJourney = useServerFn(myJourney);
  const [journey, setJourney] = useState<JourneyState | null>(null);
  const [loading, setLoading] = useState(false);

  const loadJourney = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const result = await runJourney();
      setJourney(result.state as JourneyState);
    } catch {
      setJourney(null);
    } finally {
      setLoading(false);
    }
  }, [runJourney, user]);

  useEffect(() => {
    if (!user) {
      setJourney(null);
      return;
    }
    void loadJourney();
  }, [loadJourney, user]);

  if (authLoading || !user) return null;

  const cartIds = new Set(cartItems.map((item) => item.productId));
  const items = journey
    ? inProgressTreatments(journey)
        .filter((item) => !cartIds.has(item.productId))
        .slice(0, 3)
    : [];

  const accent = theme === "men" ? GENDER_THEME.men.bg : GENDER_THEME.women.bg;
  const accentHover =
    theme === "men" ? GENDER_THEME.men.bgHover : GENDER_THEME.women.bgHover;

  return (
    <section aria-labelledby="home-progress-title" className="relative bg-home-care py-14 sm:py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10">
        {/* Header row */}
        <motion.header
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55 }}
          className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
        >
          <div>
            <h2
              id="home-progress-title"
              className="font-display text-2xl font-bold tracking-tight text-home-heading sm:text-3xl"
            >
              Your active care
            </h2>
            <p className="mt-1.5 text-[15px] leading-relaxed text-home-copy">
              Continue where you left off — your most recently updated treatments, with the same
              live step shown in your dashboard.
            </p>
          </div>
          <Link
            to="/account"
            hash="progress"
            className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold transition-colors hover:brightness-110"
            style={{ color: accent }}
          >
            View all in progress
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>
        </motion.header>

        {loading ? (
          <div className="flex min-h-56 items-center justify-center gap-3 text-home-copy">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: accent }} aria-hidden />
            Loading your treatment progress…
          </div>
        ) : items.length > 0 ? (
          <ul className="grid gap-6 md:grid-cols-3">
            {items.map((item, index) => {
              const percentage = Math.round((item.stepIndex / item.stepTotal) * 100);
              return (
                <motion.li
                  key={item.productId}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.45, delay: index * 0.08 }}
                  className="flex flex-col justify-between rounded-2xl border border-home-line/60 bg-home-panel p-6 shadow-[0_10px_30px_-18px_rgba(15,30,60,0.18)] transition-shadow duration-300 hover:shadow-[0_18px_40px_-18px_rgba(15,30,60,0.28)]"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="line-clamp-2 font-display text-lg font-bold leading-tight text-home-heading">
                        {item.productName}
                      </h3>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${
                          item.needsAction
                            ? "bg-amber-100 text-amber-700 ring-amber-200"
                            : item.waiting
                              ? "bg-slate-50 text-slate-500 ring-slate-200"
                              : "bg-sky-50 text-[#1A5BB5] ring-sky-200"
                        }`}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          {!item.needsAction && <Clock3 className="h-3 w-3" aria-hidden />}
                          {item.needsAction
                            ? "Action needed"
                            : item.waiting
                              ? "Waiting on us"
                              : "In progress"}
                        </span>
                      </span>
                    </div>

                    <div className="mt-6">
                      <div className="mb-2 flex items-center justify-between text-xs font-semibold text-home-copy">
                        <span>
                          {item.stepLabel} {item.stepIndex}/{item.stepTotal}
                        </span>
                        <span>{percentage}%</span>
                      </div>
                      <div
                        className="h-1.5 w-full overflow-hidden rounded-full bg-home-track"
                        role="progressbar"
                        aria-label={`${item.productName} progress`}
                        aria-valuenow={percentage}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <span
                          className="block h-full rounded-full transition-[width] duration-700"
                          style={{ width: `${percentage}%`, backgroundColor: accent }}
                        />
                      </div>
                    </div>

                    <p className="mt-5 line-clamp-2 text-sm leading-relaxed text-home-copy">
                      {item.status}
                    </p>
                  </div>

                  <div className="mt-8">
                    {item.readyToOrder ? (
                      <AddToCartButton
                        productId={item.productId}
                        accent={accent}
                        className="w-full"
                      />
                    ) : (
                      <Link
                        to="/product/$productId"
                        params={{ productId: item.productId }}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white transition-transform active:scale-[0.98]"
                        style={{
                          backgroundColor: accent,
                          boxShadow: `0 10px 24px -10px ${accent}55`,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = accentHover;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = accent;
                        }}
                      >
                        {item.needsAction ? "Continue treatment" : "View progress"}
                        <ArrowRight className="h-4 w-4" aria-hidden />
                      </Link>
                    )}
                  </div>
                </motion.li>
              );
            })}
          </ul>
        ) : (
          <div className="flex min-h-56 flex-col items-start justify-center rounded-2xl border border-home-line/60 bg-home-panel px-6 py-8 sm:px-8">
            <p className="font-display text-xl font-semibold text-home-heading">
              No treatments in progress
            </p>
            <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-home-copy">
              When you start a treatment, its current step and next action will appear here.
            </p>
            <Link
              to="/category/$category"
              params={{ category: theme }}
              className="mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-semibold text-white transition-transform active:scale-[0.98]"
              style={{ backgroundColor: accent }}
            >
              Browse treatments <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
