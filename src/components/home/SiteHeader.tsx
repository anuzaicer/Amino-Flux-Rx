import logoAsset from "@/assets/amino-flux-logo-transparent.png";
import { useState } from "react";
import { ProductSearch } from "@/components/search/ProductSearch";
import { Search, User, ShoppingCart, Menu, X, ChevronDown } from "lucide-react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart-context";
import { Mars, Venus } from "lucide-react";
import { useGender, type Gender } from "@/components/gender/GenderContext";

type CategoryLink = { label: (theme: Gender) => string; group: string; only?: Gender };

/** Storefront categories — each links to its dedicated category page, gender-aware. */
const CATEGORIES: CategoryLink[] = [
  { label: () => "Vitamins & Supplements", group: "vitamins" },
  { label: () => "Peptides & Injectables", group: "peptides" },
  {
    label: (t) => (t === "women" ? "Hormone Therapies (Women)" : "Hormone Therapies (Men)"),
    group: "hormones",
  },
  { label: () => "Medical Weight Loss", group: "weight" },
  { label: () => "Dermatology", group: "skin" },
  { label: () => "Intimacy", group: "intimacy" },
  { label: () => "Erectile Dysfunction", group: "ed", only: "men" },
  { label: () => "Bundles", group: "bundles" },
];

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function AccountMenu({ theme }: { theme: Gender }) {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  if (loading) {
    return <span className="h-10 w-10" aria-hidden />;
  }

  if (!user) {
    return (
      <Link
        to="/auth"
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:brightness-110 sm:px-4"
        style={{ backgroundColor: theme === "women" ? "#5C9330" : "#2173D1" }}
      >
        <User className="h-3.5 w-3.5" /> Sign in
      </Link>
    );
  }

  const metadata = (user.user_metadata ?? {}) as { full_name?: string; name?: string };
  const displayName =
    metadata.full_name || metadata.name || (user.email ? user.email.split("@")[0]! : "My account");
  const accentText = theme === "women" ? "text-[#5C9330]" : "text-[#2173D1]";

  const signOut = async () => {
    setOpen(false);
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Your account menu"
        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white py-1 pl-1 pr-3 text-[#0F1E33] shadow-[3px_3px_6px_rgba(0,0,0,0.1),-3px_-3px_6px_rgba(255,255,255,0.9)] transition hover:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.1),inset_-2px_-2px_5px_rgba(255,255,255,0.9)]"
      >
        <span
          className={`grid h-8 w-8 place-items-center rounded-full text-[13px] font-bold text-white`}
          style={{ backgroundColor: theme === "women" ? "#5C9330" : "#2173D1" }}
        >
          {initialsFor(displayName)}
        </span>
        <span className="hidden max-w-[9rem] truncate text-[13px] font-semibold sm:block">
          {displayName}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Close account menu"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-2xl bg-white p-2 text-[#0F1E33] shadow-[6px_6px_16px_rgba(0,0,0,0.15),-6px_-6px_16px_rgba(255,255,255,0.9)]">
            <p className="truncate px-3 pb-2 pt-1 text-[13px] text-[#0F1E33]/60">{user.email}</p>
            <Link
              to="/account"
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2 text-[15px] font-semibold transition hover:bg-[#2173D1]/10"
            >
              My dashboard
            </Link>
            <Link
              to="/account"
              hash="orders"
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2 text-[15px] font-medium transition hover:bg-[#2173D1]/10"
            >
              My orders
            </Link>
            <button
              type="button"
              onClick={signOut}
              className="block w-full rounded-xl px-3 py-2 text-left text-[15px] font-medium text-[#0F1E33]/80 transition hover:bg-black/5"
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function SiteHeader() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [mobileTreatmentsOpen, setMobileTreatmentsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { theme, openGate, locked } = useGender();
  const { count: cartCount } = useCart();
  const cats = CATEGORIES.filter((c) => !c.only || c.only === theme);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const accent = theme === "women" ? "#5C9330" : "#2173D1";
  const treatmentsActive = pathname.startsWith("/category/") || pathname.startsWith("/product/");
  const desktopNavClass =
    "relative inline-flex min-h-11 items-center whitespace-nowrap px-1 text-[13px] font-semibold text-[#0F1E33]/70 transition-colors hover:text-[#0F1E33] 2xl:text-[14px]";
  const mobileLinkClass =
    "flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-semibold text-[#0F1E33]/80 transition hover:bg-black/5 hover:text-[#0F1E33]";

  const closeMobile = () => {
    setOpen(false);
    setMobileTreatmentsOpen(false);
  };

  const activeIndicator = (active: boolean) =>
    active ? (
      <span
        aria-hidden="true"
        className="absolute inset-x-1 bottom-0 h-0.5 rounded-full"
        style={{ backgroundColor: accent }}
      />
    ) : null;

  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-white shadow-[0_10px_32px_-18px_rgba(15,30,51,0.35)]">
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4 sm:gap-5 sm:px-6 lg:px-10 xl:flex xl:gap-7">
        <Link to="/" className="flex shrink-0 items-center gap-3">
          <img
            src={logoAsset}
            alt="Amino Flux Rx logo"
            width={96}
            height={96}
            className="h-16 w-16 object-contain sm:h-22 sm:w-22 xl:h-24 xl:w-24"
          />
        </Link>

        <nav
          aria-label="Primary navigation"
          className="hidden min-w-0 flex-1 items-center justify-center gap-3 xl:flex 2xl:gap-5"
        >
          <Link to="/" activeOptions={{ exact: true }} className={desktopNavClass}>
            Home
            {activeIndicator(pathname === "/")}
          </Link>
          <Link to="/about" className={desktopNavClass}>
            About
            {activeIndicator(pathname === "/about")}
          </Link>
          <div className="relative">
            <button
              type="button"
              onClick={() => setCatOpen((v) => !v)}
              aria-expanded={catOpen}
              className={`${desktopNavClass} gap-1 ${treatmentsActive ? "text-[#0F1E33]" : ""}`}
            >
              Treatments
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${catOpen ? "rotate-180" : ""}`}
              />
              {activeIndicator(treatmentsActive)}
            </button>
            {catOpen && (
              <>
                <button
                  type="button"
                  aria-label="Close categories"
                  className="fixed inset-0 z-10 cursor-default"
                  onClick={() => setCatOpen(false)}
                />
                <ul className="absolute left-1/2 top-full z-20 mt-3 w-72 -translate-x-1/2 rounded-xl border border-black/10 bg-white p-2 text-[#0F1E33] shadow-[0_18px_45px_-20px_rgba(15,30,51,0.45)]">
                  {cats.map((c) => (
                    <li key={c.group}>
                      <Link
                        to="/category/$category"
                        params={{ category: c.group }}
                        onClick={() => setCatOpen(false)}
                        className="block rounded-lg px-4 py-2.5 text-[14px] font-medium transition hover:bg-black/5"
                        activeProps={{ style: { color: accent, backgroundColor: `${accent}12` } }}
                      >
                        {c.label(theme)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <Link to="/lab-testing" className={desktopNavClass}>
            Lab Testing
            {activeIndicator(pathname === "/lab-testing")}
          </Link>
          <Link to="/how-it-works" className={desktopNavClass}>
            How It Works
            {activeIndicator(pathname === "/how-it-works")}
          </Link>
          <a
            href="/#consultation"
            className="inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:brightness-110 2xl:px-5 2xl:text-[14px]"
            style={{ backgroundColor: accent }}
          >
            Consultations
          </a>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2 xl:ml-0">
          {!locked && (
            <div className="mr-1 hidden items-center rounded-full bg-white p-1 shadow-[inset_3px_3px_6px_rgba(0,0,0,0.12),inset_-3px_-3px_6px_rgba(255,255,255,0.9)] sm:flex">
              {[
                { id: "men" as const, label: "Men", Icon: Mars },
                { id: "women" as const, label: "Women", Icon: Venus },
              ].map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={openGate}
                  aria-pressed={theme === id}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold transition ${
                    theme === id
                      ? `text-white shadow-sm ${id === "women" ? "bg-[#5C9330]" : "bg-[#2173D1]"}`
                      : "text-[#0F1E33]/70 hover:text-[#0F1E33]"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            aria-label="Search treatments and lab panels"
            onClick={() => setSearchOpen(true)}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#eef1f6] text-[#0F1E33] transition shadow-[3px_3px_6px_rgba(0,0,0,0.12),-3px_-3px_6px_rgba(255,255,255,0.9)] hover:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.12),inset_-2px_-2px_5px_rgba(255,255,255,0.9)]"
          >
            <Search className="h-4 w-4" />
          </button>

          <AccountMenu theme={theme} />
          {user && (
            <Link
              to="/cart"
              aria-label="Cart"
              className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#eef1f6] text-[#0F1E33] transition shadow-[3px_3px_6px_rgba(0,0,0,0.12),-3px_-3px_6px_rgba(255,255,255,0.9)] hover:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.12),inset_-2px_-2px_5px_rgba(255,255,255,0.9)]"
            >
              <ShoppingCart className="h-4 w-4" />
              {cartCount > 0 && (
                <span
                  className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: theme === "women" ? "#5C9330" : "#2173D1" }}
                >
                  {cartCount}
                </span>
              )}
            </Link>
          )}
          <button
            aria-label="Menu"
            onClick={() => setOpen((v) => !v)}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#eef1f6] text-[#0F1E33] transition shadow-[3px_3px_6px_rgba(0,0,0,0.12),-3px_-3px_6px_rgba(255,255,255,0.9)] hover:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.12),inset_-2px_-2px_5px_rgba(255,255,255,0.9)] xl:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <nav
          aria-label="Mobile navigation"
          className="max-h-[calc(100svh-5.25rem)] overflow-y-auto overscroll-contain border-t border-black/10 px-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 sm:max-h-[calc(100svh-7.5rem)] sm:px-6 xl:hidden"
        >
          {!locked && (
            <div className="mb-3 flex items-center rounded-full bg-black/5 p-1 ring-1 ring-black/10 sm:hidden">
              {[
                { id: "men" as const, label: "Men", Icon: Mars },
                { id: "women" as const, label: "Women", Icon: Venus },
              ].map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={openGate}
                  aria-pressed={theme === id}
                  className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition ${
                    theme === id
                      ? `text-white ${id === "women" ? "bg-[#5C9330]" : "bg-[#2173D1]"}`
                      : "text-[#0F1E33]/70"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ))}
            </div>
          )}
          <ul className="grid gap-1">
            <li>
              <Link to="/" onClick={closeMobile} className={mobileLinkClass}>
                Home
              </Link>
            </li>
            <li>
              <Link to="/about" onClick={closeMobile} className={mobileLinkClass}>
                About
              </Link>
            </li>
            <li>
              <button
                type="button"
                onClick={() => setMobileTreatmentsOpen((value) => !value)}
                aria-expanded={mobileTreatmentsOpen}
                className={`${mobileLinkClass} w-full justify-between text-left`}
              >
                Treatments
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${mobileTreatmentsOpen ? "rotate-180" : ""}`}
                />
              </button>
              {mobileTreatmentsOpen && (
                <ul
                  className="mb-2 ml-3 grid gap-1 border-l-2 pl-3 sm:grid-cols-2"
                  style={{ borderColor: accent }}
                >
                  {cats.map((c) => (
                    <li key={c.group}>
                      <Link
                        to="/category/$category"
                        params={{ category: c.group }}
                        onClick={closeMobile}
                        className="flex min-h-11 items-center rounded-lg px-3 py-2 text-[13px] font-medium text-[#0F1E33]/70 transition hover:bg-black/5 hover:text-[#0F1E33]"
                        activeProps={{ style: { color: accent, backgroundColor: `${accent}12` } }}
                      >
                        {c.label(theme)}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
            <li>
              <Link to="/lab-testing" onClick={closeMobile} className={mobileLinkClass}>
                Lab Testing
              </Link>
            </li>
            <li>
              <Link to="/how-it-works" onClick={closeMobile} className={mobileLinkClass}>
                How It Works
              </Link>
            </li>
            <li className="pt-2">
              <a
                href="/#consultation"
                onClick={closeMobile}
                className="flex min-h-11 w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
                style={{ backgroundColor: accent }}
              >
                Consultations
              </a>
            </li>
          </ul>
        </nav>
      )}
      <ProductSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
