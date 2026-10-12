import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/home/SiteHeader";
import { SiteFooter } from "@/components/home/SiteFooter";
import { PRODUCTS, ProductTitle, type Product } from "@/components/home/Sections";
import { getRequirement } from "@/components/product/RequirementBadge";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { GROUP_LABEL, type CatalogGroup } from "@/data/catalog";
import { useGender } from "@/components/gender/GenderContext";
import { HEX_BL, HEX_TR } from "@/lib/hexTexture";
import imgLab from "@/assets/c-lab.jpg";
import imgWeight from "@/assets/c-weight.jpg";
import imgHormones from "@/assets/c-hormones.jpg";
import imgPeptides from "@/assets/p-peptides.jpg";
import imgIntimacy from "@/assets/c-intimacy.jpg";
import imgEd from "@/assets/c-ed.jpg";
import imgSkin from "@/assets/p-trt-skincare.jpg";
import imgVitamins from "@/assets/c-vitamins.jpg";
import imgBundles from "@/assets/c-bundles.jpg";

const GROUP_IMAGE: Record<CatalogGroup, string> = {
  labs: imgLab,
  weight: imgWeight,
  hormones: imgHormones,
  peptides: imgPeptides,
  intimacy: imgIntimacy,
  ed: imgEd,
  skin: imgSkin,
  vitamins: imgVitamins,
  bundles: imgBundles,
};

const GENDER_CATEGORIES = {
  men: {
    label: "Men's health",
    title: "Men's care catalog",
    blurb:
      "Provider-guided treatments and lab panels built for men. Testosterone support, metabolic health, performance, hair, and skin.",
    accent: "#2173D1",
    accentHover: "#1A5BB5",
  },
  women: {
    label: "Women's health",
    title: "Women's care catalog",
    blurb:
      "Provider-guided treatments and lab panels built for women. Hormone balance, metabolic health, skin, and energy.",
    accent: "#5C9330",
    accentHover: "#5F9A2E",
  },
} as const;

type GenderKey = keyof typeof GENDER_CATEGORIES;

const GROUP_KEYS = Object.keys(GROUP_LABEL) as CatalogGroup[];

function isGroup(key: string): key is CatalogGroup {
  return key in GROUP_LABEL;
}

const CAPSULES_META = {
  title: "Capsules",
  blurb:
    "Oral capsule treatments for your care path — prescription therapies and clinical-grade supplements in simple daily capsules.",
} as const;

export const Route = createFileRoute("/category/$category")({
  loader: ({ params }) => {
    const key = params.category;
    if (key === "capsules") return { kind: "capsules" as const, key };
    if (key in GENDER_CATEGORIES) return { kind: "gender" as const, key: key as GenderKey };
    if (isGroup(key)) return { kind: "group" as const, key };
    throw notFound();
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Category unavailable | Amino Flux Rx" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const title =
      loaderData.kind === "gender"
        ? GENDER_CATEGORIES[loaderData.key].title
        : loaderData.kind === "capsules"
          ? CAPSULES_META.title
          : GROUP_LABEL[loaderData.key].label;
    const blurb =
      loaderData.kind === "gender"
        ? GENDER_CATEGORIES[loaderData.key].blurb
        : loaderData.kind === "capsules"
          ? CAPSULES_META.blurb
          : GROUP_LABEL[loaderData.key].blurb;
    return {
      meta: [
        { title: `${title} | Amino Flux Rx` },
        { name: "description", content: blurb },
        { property: "og:title", content: `${title} | Amino Flux Rx` },
        { property: "og:description", content: blurb },
        { property: "og:type", content: "website" },
        { property: "og:url", content: `https://afrx.anuzaicer.work/category/${loaderData.key}` },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: `https://afrx.anuzaicer.work/category/${loaderData.key}` }],
    };
  },
  notFoundComponent: CategoryNotFound,
  component: CategoryPage,
});

function CategoryNotFound() {
  return (
    <div className="min-h-screen text-white">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-6 py-32 text-center">
        <h1 className="font-display text-3xl font-semibold">Category not found</h1>
        <Link
          to="/category/$category"
          params={{ category: "men" }}
          className="mt-6 inline-block rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-[#2173D1]"
        >
          Browse men's care
        </Link>
      </div>
      <SiteFooter />
    </div>
  );
}

const FILTERS = ["All", "Lab testing", "No lab needed"] as const;

/* ── Hero (Editorial Glass Tech) ───────────────────────── */

type Crumb = { label: string; to?: string; params?: Record<string, string> };

function HeroBand({ accent, crumbs, title, blurb }: {
  accent: string;
  crumbs: Crumb[];
  title: string;
  blurb: string;
}) {
  // Split the title into a bold first line and a lighter italic serif second line.
  const words = title.split(" ");
  const mid = words.length > 1 ? Math.ceil(words.length / 2) : 1;
  const head = words.slice(0, mid).join(" ");
  const tail = words.slice(mid).join(" ");
  return (
    <section className="relative overflow-hidden text-white" style={{ backgroundColor: accent }}>
      {/* Soft radial light accent */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 40% 40%, rgba(255,255,255,0.10) 0%, transparent 60%)",
        }}
      />

      {/* Honeycomb texture bleeding off the top-right and bottom-left corners */}
      <svg
        className="pointer-events-none absolute -right-20 -top-24 h-[900px] w-[1900px] select-none text-white"
        viewBox="0 0 1900 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {HEX_TR.map((cell, index) => (
          <polygon
            key={index}
            points={cell.points}
            stroke="currentColor"
            strokeOpacity={cell.opacity}
            strokeWidth="1"
          />
        ))}
      </svg>
      <svg
        className="pointer-events-none absolute -left-20 -bottom-24 h-[900px] w-[1900px] select-none text-white"
        viewBox="0 0 1900 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {HEX_BL.map((cell, index) => (
          <polygon
            key={index}
            points={cell.points}
            stroke="currentColor"
            strokeOpacity={cell.opacity}
            strokeWidth="1"
          />
        ))}
      </svg>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-10 lg:py-24">
        <div className="max-w-4xl">
          {/* Brand mark + breadcrumb */}
          <div className="mb-8 flex flex-col gap-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/50">
              Amino Flux Rx &bull; Biotech Series
            </span>
            <nav
              aria-label="Breadcrumb"
              className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold uppercase tracking-wider text-white/70"
            >
              <Link to="/" className="transition-colors hover:text-white">
                Home
              </Link>
              {crumbs.slice(1).map((c, i) => {
                const isLast = i === crumbs.length - 2;
                return (
                  <span key={c.label} className="flex items-center gap-2">
                    <span aria-hidden className="opacity-40">/</span>
                    {c.to && !isLast ? (
                      <Link to={c.to} params={c.params} className="transition-colors hover:text-white">
                        {c.label}
                      </Link>
                    ) : (
                      <span className="text-white">{c.label}</span>
                    )}
                  </span>
                );
              })}
            </nav>
          </div>

          {/* Title */}
          <h1 className="mb-8 font-display text-5xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-6xl lg:text-7xl">
            {head}{" "}
            {tail && (
              <span className="font-editorial font-medium italic opacity-90">{tail}</span>
            )}
          </h1>

          {/* Description */}
          <p className="max-w-xl text-base font-medium leading-relaxed text-white/90 sm:text-lg">
            {blurb}
          </p>
        </div>
      </div>
    </section>
  );
}

function ProductsBar({
  accent,
  value,
  onChange,
  count,
}: {
  accent: string;
  value: (typeof FILTERS)[number];
  onChange: (f: (typeof FILTERS)[number]) => void;
  count: number;
}) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-slate-200">
      <div className="-mb-px flex min-w-0 gap-1 overflow-x-auto sm:gap-6">
        {FILTERS.map((f) => {
          const active = value === f;
          return (
            <button
              key={f}
              type="button"
              onClick={() => onChange(f)}
              aria-current={active ? "true" : undefined}
              className={`whitespace-nowrap border-b-2 px-1 pb-3 pt-1 text-[13px] font-semibold transition sm:text-sm ${
                active
                  ? "border-current text-clinical-ink"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
              style={active ? { color: accent } : undefined}
            >
              {f}
            </button>
          );
        })}
      </div>
      <p className="hidden shrink-0 pb-2.5 text-[13px] font-medium text-slate-500 sm:block">
        {count} {count === 1 ? "product" : "products"}
      </p>
    </div>
  );
}

function CategoryPage() {
  const data = Route.useLoaderData();
  if (data.kind === "gender") return <GenderCatalog catKey={data.key} />;
  if (data.kind === "capsules") return <CapsulesCatalog />;
  return <GroupCatalog groupKey={data.key} />;
}

/* ── Capsules — oral capsule treatments for the active care path ── */
function CapsulesCatalog() {
  const { theme } = useGender();
  const accent = theme === "men" ? "#2173D1" : "#5C9330";
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");

  const items = useMemo(() => {
    const base = PRODUCTS.filter((p) => p.cat === theme && /capsule/i.test(p.n));
    if (filter === "Lab testing") return base.filter((p) => p.lab);
    if (filter === "No lab needed") return base.filter((p) => !p.lab);
    return base;
  }, [theme, filter]);

  return (
    <div className="relative min-h-screen bg-clinical-canvas text-clinical-ink">
      <SiteHeader />
      <main>
        <HeroBand
          accent={accent}
          crumbs={[
            { label: "Home", to: "/" },
            {
              label: theme === "men" ? "Men's care" : "Women's care",
              to: "/category/$category",
              params: { category: theme === "men" ? "men" : "women" },
            },
            { label: "Capsules" },
          ]}
          title={CAPSULES_META.title}
          blurb={CAPSULES_META.blurb}
        />

        <section className="mx-auto max-w-7xl px-4 pb-14 pt-10 sm:px-6 sm:pb-20 sm:pt-12 lg:px-10">
          <ProductsBar
            accent={accent}
            value={filter}
            onChange={setFilter}
            count={items.length}
          />
          {items.length === 0 ? (
            <p className="rounded-2xl border border-clinical-border bg-white p-10 text-center text-clinical-copy shadow-sm">
              No capsule products for the current filter.
            </p>
          ) : (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((p) => (
                <GlassProductCard key={`${p.cat}-${p.id}`} p={p} accent={accent} from={theme} />
              ))}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

/* ── Full men/women catalog (existing behavior) ────────── */
function GenderCatalog({ catKey }: { catKey: GenderKey }) {
  const c = GENDER_CATEGORIES[catKey];
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");

  const items = useMemo(() => {
    const base = PRODUCTS.filter((p) => p.cat === catKey);
    if (filter === "Lab testing") return base.filter((p) => p.lab);
    if (filter === "No lab needed") return base.filter((p) => !p.lab);
    return base;
  }, [catKey, filter]);

  const other: GenderKey = catKey === "men" ? "women" : "men";

  return (
    <div className="relative min-h-screen bg-clinical-canvas text-clinical-ink">
      <SiteHeader />
      <main>
        <HeroBand
          accent={c.accent}
          crumbs={[{ label: "Home", to: "/" }, { label: c.label }]}
          title={c.title}
          blurb={c.blurb}
        />

        <section className="mx-auto max-w-7xl px-4 pb-14 pt-10 sm:px-6 sm:pb-20 sm:pt-12 lg:px-10">
          <ProductsBar
            accent={c.accent}
            value={filter}
            onChange={setFilter}
            count={items.length}
          />
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => (
              <GlassProductCard key={`${p.cat}-${p.id}`} p={p} accent={c.accent} from={catKey} />
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

/* ── Single category page for one storefront group ─────── */
function GroupCatalog({ groupKey }: { groupKey: CatalogGroup }) {
  const { theme } = useGender();
  const accent = theme === "men" ? "#2173D1" : "#5C9330";
  const meta = GROUP_LABEL[groupKey];
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");

  // Explore-more-categories slider state.
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);


  const slideCategory = useCallback((dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-slide-card]");
    const step = card ? card.offsetWidth + 16 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  }, []);

  // Products in this group visible to the active care path.
  const items = useMemo(() => {
    const base = PRODUCTS.filter((p) => p.group === groupKey && p.cat === theme);
    if (filter === "Lab testing") return base.filter((p) => p.lab);
    if (filter === "No lab needed") return base.filter((p) => !p.lab);
    return base;
  }, [groupKey, theme, filter]);

  // Sibling categories that also have products for this care path.
  const siblings = useMemo(
    () =>
      GROUP_KEYS.filter(
        (g) => g !== groupKey && PRODUCTS.some((p) => p.group === g && p.cat === theme),
      ),
    [groupKey, theme],
  );

  useEffect(() => {
    updateArrows();
    window.addEventListener("resize", updateArrows);
    return () => window.removeEventListener("resize", updateArrows);
  }, [siblings, updateArrows]);

  return (
    <div className="relative min-h-screen bg-clinical-canvas text-clinical-ink">
      <SiteHeader />
      <main>
        <HeroBand
          accent={accent}
          crumbs={[
            { label: "Home", to: "/" },
            {
              label: theme === "men" ? "Men's care" : "Women's care",
              to: "/category/$category",
              params: { category: theme === "men" ? "men" : "women" },
            },
            { label: meta.label },
          ]}
          title={meta.label}
          blurb={meta.blurb}
        />

        <section className="mx-auto max-w-7xl px-4 pb-14 pt-10 sm:px-6 sm:pb-20 sm:pt-12 lg:px-10">
          <ProductsBar
            accent={accent}
            value={filter}
            onChange={setFilter}
            count={items.length}
          />
          {items.length === 0 ? (
            <p className="rounded-2xl border border-clinical-border bg-white p-10 text-center text-clinical-copy shadow-sm">
              No products in this category for the current filter.
            </p>
          ) : (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((p) => (
                <GlassProductCard key={`${p.cat}-${p.id}`} p={p} accent={accent} from={groupKey} />
              ))}
            </div>
          )}
        </section>

        <section className="bg-clinical-tint">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-10">
            <div className="flex items-end justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-2xl font-semibold tracking-tight text-clinical-ink sm:text-3xl">
                  Explore more categories
                </h2>
                <p className="mt-2 text-sm text-clinical-copy sm:text-base">
                  Continue building your care plan across our other programs.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <SliderArrow
                  dir="prev"
                  accent={accent}
                  enabled={canPrev}
                  onClick={() => slideCategory(-1)}
                />
                <SliderArrow
                  dir="next"
                  accent={accent}
                  enabled={canNext}
                  onClick={() => slideCategory(1)}
                />
              </div>
            </div>
            <div
              ref={trackRef}
              onScroll={updateArrows}
              className="amino-scroll-hide -mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
            >
              {siblings.map((g) => (
                <CategorySlideCard key={g} g={g} accent={accent} />
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

/* ── Explore-more-categories slider pieces ─────────────── */
function SliderArrow({
  dir,
  accent,
  enabled,
  onClick,
}: {
  dir: "prev" | "next";
  accent: string;
  enabled: boolean;
  onClick: () => void;
}) {
  const Icon = dir === "prev" ? ArrowLeft : ArrowRight;
  return (
    <button
      type="button"
      aria-label={dir === "prev" ? "Previous categories" : "Next categories"}
      onClick={onClick}
      disabled={!enabled}
      className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-300 sm:h-11 sm:w-11 ${
        enabled
          ? "cursor-pointer border-clinical-border bg-white text-clinical-ink shadow-sm hover:border-transparent hover:text-white"
          : "cursor-not-allowed border-clinical-border/60 bg-white/60 text-slate-400"
      }`}
      onMouseEnter={(e) => {
        if (enabled) e.currentTarget.style.backgroundColor = accent;
      }}
      onMouseLeave={(e) => {
        if (enabled) e.currentTarget.style.backgroundColor = "";
      }}
    >
      <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
    </button>
  );
}

function CategorySlideCard({ g, accent }: { g: CatalogGroup; accent: string }) {
  return (
    <Link
      to="/category/$category"
      params={{ category: g }}
      data-slide-card
      className="group relative h-60 w-[260px] shrink-0 snap-start overflow-hidden rounded-xl border border-clinical-border bg-white shadow-sm transition-all duration-500 hover:shadow-xl sm:h-64 sm:w-[320px]"
    >
      <img
        src={GROUP_IMAGE[g]}
        alt={GROUP_LABEL[g].label}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0F1E33]/90 via-[#0F1E33]/20 to-transparent" />
      <div
        className="absolute inset-x-0 top-0 h-1 opacity-0 transition-opacity group-hover:opacity-100"
        style={{ backgroundColor: accent }}
      />
      <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-3 p-5 sm:p-6">
        <div className="min-w-0">
          <p className="text-lg font-semibold leading-tight text-white">
            {GROUP_LABEL[g].label}
          </p>
          <p className="mt-1 line-clamp-2 text-sm text-white/75">{GROUP_LABEL[g].blurb}</p>
          <div
            className="mt-2 h-0.5 w-0 transition-all duration-300 group-hover:w-8"
            style={{ backgroundColor: accent }}
          />
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/30 text-white transition-all duration-300 group-hover:border-transparent group-hover:bg-white/15">
          <ArrowRight className="h-5 w-5" />
        </span>
      </div>
    </Link>
  );
}

function GlassProductCard({ p, accent, from }: { p: Product; accent: string; from: string }) {
  const req = getRequirement(p.lab, p.telehealth);
  const deep = accent === "#5C9330" ? "#0F2A14" : "#0F1E33";
  return (
    <div
      className="group relative flex min-w-0 flex-col overflow-hidden rounded-xl bg-[#EEF1F6] text-slate-900 shadow-sm ring-1 ring-transparent transition-all duration-500 ease-out hover:-translate-y-2 hover:shadow-2xl sm:rounded-2xl"
      style={{ "--ca": accent, "--ca-deep": deep } as React.CSSProperties}
    >
      <Link
        to="/product/$productId"
        params={{ productId: p.id }}
        search={{ from }}
        className="relative block aspect-[4/5] w-full overflow-hidden bg-[#EEF1F6]"
      >
        <img
          src={p.img}
          alt={p.n}
          loading="lazy"
          width={512}
          height={512}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <span className="absolute left-4 top-4 z-10 rounded-sm bg-slate-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white shadow-sm">
          {p.tag}
        </span>
        <span
          title={req.why}
          className="absolute bottom-4 left-4 z-10 inline-flex max-w-[85%] items-center gap-1.5 rounded-full border border-slate-200 bg-white/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-tight text-slate-600 shadow-sm backdrop-blur-sm"
        >
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: accent }}
          />
          <span className="truncate">{req.label}</span>
        </span>
      </Link>
      <div className="card-grad relative flex min-w-0 flex-1 flex-col p-5 sm:p-6">
        <ProductTitle
          p={p}
          className="transition-colors duration-500 group-hover:text-white"
        />
        <p className="mt-2 line-clamp-2 text-[15px] leading-relaxed text-slate-500 transition-colors duration-500 group-hover:text-white/75">
          {p.d}
        </p>
        <div className="mt-auto flex flex-col gap-3 pt-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 transition-colors duration-500 group-hover:text-white/60">
              Price
            </span>
            <p className="text-2xl font-bold tracking-tight text-slate-900 transition-colors duration-500 group-hover:text-white">
              {p.p}
            </p>
          </div>
          {p.lab || p.telehealth ? (
            <Link
              to="/product/$productId"
              params={{ productId: p.id }}
              search={{ from }}
              className="card-cta inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg px-5 py-3 text-[11px] font-bold uppercase tracking-[0.14em] active:scale-95"
            >
              View product
            </Link>
          ) : (
            <AddToCartButton productId={p.id} accent={accent} />
          )}
        </div>
      </div>
    </div>
  );
}
