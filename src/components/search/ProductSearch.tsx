import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import { catalogFor, GROUP_LABEL } from "@/data/catalog";
import { useGender } from "@/components/gender/GenderContext";
import { getRequirement } from "@/components/product/RequirementBadge";

/**
 * Lightweight product finder opened from the header search icon.
 * Searches name, description and category label across the existing catalog.
 */
export function ProductSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { theme } = useGender();
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const accent = theme === "women" ? "#5C9330" : "#2173D1";

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const items = useMemo(() => catalogFor(theme), [theme]);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (term.length < 2) return [];
    return items
      .filter((p) => {
        const hay =
          `${p.name} ${p.description} ${GROUP_LABEL[p.group].label} ${p.group}`.toLowerCase();
        return term.split(/\s+/).every((w) => hay.includes(w));
      })
      .slice(0, 24);
  }, [items, q]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex justify-center overflow-y-auto bg-black/60 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-sm sm:p-4 sm:pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Search treatments and lab panels"
    >
      <button
        type="button"
        aria-label="Close search"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div className="relative max-h-[calc(100svh-1.5rem)] w-full max-w-2xl self-start overflow-hidden rounded-xl bg-white text-[#0F1E33] shadow-2xl sm:max-h-[76vh] sm:rounded-2xl">
        <div className="flex items-center gap-2 border-b border-black/10 px-3 sm:gap-3 sm:px-4">
          <Search className="h-5 w-5 shrink-0 text-[#0F1E33]/50" aria-hidden="true" />
          <label htmlFor="product-search-input" className="sr-only">
            Search treatments, lab panels and supplements
          </label>
          <input
            id="product-search-input"
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search treatments or labs"
            className="h-14 w-full bg-transparent text-[16px] outline-none placeholder:text-[#0F1E33]/45"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#0F1E33]/60 transition hover:bg-black/5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[calc(100svh-5.5rem)] overflow-y-auto overscroll-contain p-2 sm:max-h-[55vh]">
          {q.trim().length < 2 ? (
            <p className="px-4 py-6 text-[14px] text-[#0F1E33]/60">
              Type at least two letters — for example “testosterone”, “thyroid panel” or “B12”.
            </p>
          ) : results.length === 0 ? (
            <p className="px-4 py-6 text-[14px] text-[#0F1E33]/70">
              No matches found. Try a treatment, lab, or ingredient name.
            </p>
          ) : (
            <ul className="space-y-1">
              {results.map((p) => {
                const req = getRequirement(p.lab, p.telehealth);
                return (
                  <li key={p.id}>
                    <Link
                      to="/product/$productId"
                      params={{ productId: p.id }}
                      search={{ from: p.group }}
                      onClick={onClose}
                      className="flex items-start gap-3 rounded-xl px-4 py-3 transition hover:bg-black/[0.04] focus:bg-black/[0.06] focus:outline-none"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-semibold">{p.name}</p>
                        <p className="mt-0.5 text-[13px] text-[#0F1E33]/60">
                          {GROUP_LABEL[p.group].label} · {req.label}
                        </p>
                      </div>
                      <span className="shrink-0 text-[15px] font-bold" style={{ color: accent }}>
                        {p.price}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductSearch;
