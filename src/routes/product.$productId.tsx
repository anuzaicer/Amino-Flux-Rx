import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ClipboardList,
  FileSignature,
  FlaskConical,
  IdCard,
  ShieldCheck,
  Truck,
  Video,
} from "lucide-react";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SiteHeader } from "@/components/home/SiteHeader";
import { SiteFooter } from "@/components/home/SiteFooter";
import { ProductCard, PRODUCTS } from "@/components/home/Sections";
import { AddToCartButton } from "@/components/cart/AddToCartButton";

import { PurchasePath } from "@/components/product/PurchasePath";
import { useGender } from "@/components/gender/GenderContext";
import { RequirementBadge } from "@/components/product/RequirementBadge";
import { CATALOG, GROUP_LABEL } from "@/data/catalog";
import { isControlledProduct, requiresApprovalProduct } from "@/lib/cart-context";

/** Source listing a product was opened from, so "Back" returns there. */
function isBackKey(v: string): boolean {
  return v === "men" || v === "women" || v in GROUP_LABEL;
}

export const Route = createFileRoute("/product/$productId")({
  validateSearch: (search: Record<string, unknown>) => {
    const from =
      typeof search.from === "string" && isBackKey(search.from) ? search.from : undefined;
    return from ? { from } : {};
  },
  loader: ({ params }) => {
    const product = PRODUCTS.find((p) => p.id === params.productId);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Product unavailable — Amino Flux Rx" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { product } = loaderData;
    return {
      meta: [
        { title: `${product.n} — Amino Flux Rx` },
        {
          name: "description",
          content: `${product.d.slice(0, 150)} Provider-guided care from Amino Flux Rx.`,
        },
        { property: "og:title", content: `${product.n} — Amino Flux Rx` },
        { property: "og:description", content: product.d.slice(0, 150) },
        { property: "og:type", content: "product" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  notFoundComponent: ProductNotFound,
  component: ProductPage,
});

function ProductNotFound() {
  return (
    <div className="min-h-screen text-white">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-6 py-32 text-center">
        <h1 className="font-display text-3xl font-semibold">Product not found</h1>
        <p className="mt-3 text-white/75">This treatment may have moved or is no longer offered.</p>
        <Link
          to="/"
          hash="products"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-base font-semibold text-[#0F1E33] transition hover:brightness-95"
        >
          <ArrowLeft className="h-4 w-4" /> Browse treatments
        </Link>
      </div>
      <SiteFooter />
    </div>
  );
}

const baseName = (n: string) => n.split(" — ")[0]!.trim();
const variantLabel = (n: string) => {
  const parts = n.split(" — ");
  return parts.length > 1 ? parts.slice(1).join(" — ") : n;
};

function ProductPage() {
  const { product: loaded } = Route.useLoaderData();
  const { from } = Route.useSearch();
  const { gender, theme } = useGender();
  const accent = theme === "women" ? "#5C9330" : "#2173D1";

  // Prefer the copy of this product that belongs to the active care path, so
  // every derived list (variations, related) stays inside one gender context.
  const product = PRODUCTS.find((p) => p.id === loaded.id && p.cat === theme) ?? loaded;

  // Where "Back" should return: the listing the patient came from, else this
  // care path's own catalog (deep links never dead-end on the generic page).
  const backKey = from ?? theme;
  const backLabel =
    backKey === "men"
      ? "men's care"
      : backKey === "women"
        ? "women's care"
        : (GROUP_LABEL[backKey as keyof typeof GROUP_LABEL]?.label.toLowerCase() ?? "treatments");

  const raw = CATALOG.find((c) => c.id === product.id);
  const requiresLabs = !!product.lab;
  const requiresTelehealth = !!product.telehealth;
  const isControlled = raw ? isControlledProduct(raw) : false;
  const requiresApproval = raw ? requiresApprovalProduct(raw) : true;
  const group = GROUP_LABEL[product.group];

  // Gender-aware badge: a shared product reads as Men's / Women's inside a
  // care path; with no context yet it falls back to its neutral category name.
  const contextTag =
    raw && raw.audience !== "both"
      ? raw.audience === "men"
        ? "Men's"
        : "Women's"
      : gender
        ? gender === "men"
          ? "Men's"
          : "Women's"
        : group.label;

  // Sibling SKUs of the same medication (different strength / supply).
  const variations = PRODUCTS.filter(
    (p) =>
      p.cat === product.cat && p.group === product.group && baseName(p.n) === baseName(product.n),
  ).filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i);

  const related = PRODUCTS.filter(
    (p) => p.id !== product.id && p.cat === product.cat && p.group === product.group,
  ).slice(0, 8);
  const fallbackRelated =
    related.length > 0
      ? related
      : PRODUCTS.filter((p) => p.id !== product.id && p.cat === product.cat).slice(0, 8);

  const steps = [
    {
      icon: ClipboardList,
      title: "Medical intake",
      text: "Complete a short health questionnaire at checkout.",
    },
    {
      icon: FileSignature,
      title: "Consents & agreements",
      text: "Review and sign the treatment-specific consents.",
    },
    ...(isControlled
      ? [
          {
            icon: IdCard,
            title: "Government photo ID",
            text: "Required for this medication — verified before it ships.",
          },
        ]
      : []),
    ...(requiresApproval
      ? [
          {
            icon: Video,
            title: "Provider review",
            text: "A licensed clinician reviews your intake before prescribing.",
          },
        ]
      : []),
    {
      icon: Truck,
      title: "Fast shipping",
      text: "Dispensed by a licensed pharmacy and shipped to your door.",
    },
  ];

  // For lab panels, the description is a comma-separated list of tests.
  const tests = useMemo(() => {
    if (product.group !== "labs") return [] as string[];
    const main = product.d.split(".")[0] ?? "";
    return main
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [product]);
  const testCount = tests.length;
  const [showTests, setShowTests] = useState(false);

  return (
    <div className="relative min-h-screen bg-clinical-canvas text-clinical-ink">
      <SiteHeader />
      <main>
        <section className="mx-auto max-w-6xl px-4 pb-8 pt-5 sm:px-6 sm:pt-6">
          <Breadcrumb
            tone="light"
            items={[
              { label: "Home", to: "/" },
              {
                label: theme === "women" ? "Women's care" : "Men's care",
                to: "/category/$category",
                params: { category: theme === "women" ? "women" : "men" },
              },
              {
                label: group.label,
                to: "/category/$category",
                params: { category: product.group },
              },
              { label: product.n },
            ]}
          />

          <div className="mt-3 grid items-start gap-4 lg:grid-cols-2">
            {/* Product visual */}
            <div className="min-w-0 rounded-xl bg-[#EEF1F6] p-3 shadow-lg sm:rounded-2xl sm:p-4">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-white p-3 sm:p-6">
                <img
                  src={product.img}
                  alt={product.n}
                  width={1024}
                  height={768}
                  className="h-full w-full rounded-xl object-contain drop-shadow-2xl"
                />
                <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-slate-900/80 px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-md">
                  {contextTag}
                </span>
              </div>
            </div>

            {/* Product summary card */}
            <div className="min-w-0 rounded-xl bg-[#EEF1F6] p-4 text-slate-900 shadow-lg sm:rounded-2xl sm:p-6">
              <span className="text-[12px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                {group.label}
              </span>
              <h1 className="mt-2 break-words font-display text-xl font-bold leading-tight tracking-tight text-slate-900 sm:text-2xl md:text-[1.7rem]">
                {product.n}
              </h1>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{product.d}</p>

              <p className="mt-3 text-sm text-slate-600">
                <span className="font-semibold text-slate-900">Best for: </span>
                {group.blurb}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="text-2xl font-bold tracking-tight text-slate-900">
                  {product.p}
                </span>
                {product.group === "labs" && testCount > 0 && (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold text-white"
                    style={{ backgroundColor: accent }}
                  >
                    <FlaskConical className="h-3.5 w-3.5" /> {testCount} tests included
                  </span>
                )}
                {product.group === "labs" && (
                  <span className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-[12px] font-medium text-slate-600">
                    Drawn at Quest Diagnostics
                  </span>
                )}
              </div>

              {product.group === "labs" && tests.length > 0 && (
                <div className="mt-3 rounded-xl border border-neutral-200 bg-white">
                  <button
                    type="button"
                    onClick={() => setShowTests((v) => !v)}
                    className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100/50"
                    aria-expanded={showTests}
                  >
                    See every test included
                    <ChevronDown
                      className={"h-4 w-4 transition-transform " + (showTests ? "rotate-180" : "")}
                    />
                  </button>
                  {showTests && (
                    <ul className="grid gap-2 px-4 pb-4 text-[13px] text-slate-600 min-[390px]:grid-cols-2 sm:grid-cols-3">
                      {tests.map((t) => (
                        <li key={t} className="flex items-center gap-1.5">
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: accent }}
                          />{" "}
                          {t}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="mt-3">
                <RequirementBadge
                  lab={requiresLabs}
                  telehealth={requiresTelehealth}
                  accent={accent}
                  tone="light"
                />
              </div>

              <div className="mt-5 flex flex-col gap-2">
                {!requiresLabs && !requiresTelehealth ? (
                  <AddToCartButton
                    productId={product.id}
                    accent={accent}
                    className="w-full px-5 py-3 text-sm font-bold transition hover:brightness-110 active:scale-95"
                  />
                ) : (
                  <PurchasePath
                    key={product.id}
                    productId={product.id}
                    accent={accent}
                    requiresLabs={requiresLabs}
                    requiresTelehealth={requiresTelehealth}
                    hasVariations={variations.length > 1}
                    variationChosen
                    variations={variations.map((v) => ({
                      id: v.id,
                      label: variantLabel(v.n),
                      price: v.p,
                    }))}
                  />
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {["Licensed providers", "Secure & private", "No insurance needed"].map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[12px] font-medium text-slate-600"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" style={{ color: accent }} /> {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* What to expect */}
          <div className="mt-8">
            <h2 className="font-display text-lg font-semibold tracking-tight md:text-xl">
              What to expect
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-clinical-copy">{group.blurb}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {steps.map((s, i) => (
                <div
                  key={s.title}
                  className="rounded-xl border border-clinical-border bg-white p-4 shadow-sm"
                >
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                    style={{ backgroundColor: accent }}
                  >
                    <s.icon className="h-3.5 w-3.5" />
                  </div>
                  <p
                    className="mt-2 text-[12px] font-semibold uppercase tracking-[0.16em]"
                    style={{ color: accent }}
                  >
                    Step {i + 1}
                  </p>
                  <h3 className="mt-1 text-sm font-semibold">{s.title}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-clinical-copy">{s.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Related products */}
          <div className="mt-8">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
              <h2 className="font-display text-lg font-semibold tracking-tight md:text-xl">
                You may also need
              </h2>
              <Link
                to="/"
                hash={`cat-${product.group}`}
                className="inline-flex shrink-0 items-center gap-1 text-right text-xs font-semibold transition hover:brightness-75 sm:gap-2 sm:text-sm"
                style={{ color: accent }}
              >
                View all {group.label.toLowerCase()} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {fallbackRelated.slice(0, 4).map((p) => (
                <ProductCard key={`${p.cat}-${p.id}`} p={p} accent={accent} />
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
