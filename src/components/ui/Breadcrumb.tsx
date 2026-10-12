import { Link } from "@tanstack/react-router";
import { ChevronRight, Home } from "lucide-react";

export type Crumb = {
  label: string;
  /** TanStack route path, or undefined for the current (non-linked) page. */
  to?: string;
  params?: Record<string, string>;
};

/**
 * Accessible breadcrumb trail. The last crumb is the current page (no link).
 * Use on dark surfaces — text is white/80 with white current item.
 */
export function Breadcrumb({ items, tone = "dark" }: { items: Crumb[]; tone?: "dark" | "light" }) {
  const light = tone === "light";
  return (
    <nav aria-label="Breadcrumb" className={light ? "text-clinical-copy" : "text-white/80"}>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-medium">
        {items.map((c, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={i} className="flex items-center gap-1.5">
              {c.to && !isLast ? (
                <Link
                  to={c.to}
                  params={c.params}
                  className={`inline-flex items-center gap-1 transition ${light ? "hover:text-clinical-ink" : "hover:text-white"}`}
                >
                  {i === 0 && <Home className="h-3.5 w-3.5" />}
                  {c.label}
                </Link>
              ) : (
                <span
                  className={
                    isLast
                      ? light
                        ? "text-clinical-ink"
                        : "text-white"
                      : "inline-flex items-center gap-1"
                  }
                  aria-current={isLast ? "page" : undefined}
                >
                  {i === 0 && <Home className="h-3.5 w-3.5" />}
                  {c.label}
                </span>
              )}
              {!isLast && (
                <ChevronRight
                  className={`h-3.5 w-3.5 ${light ? "text-clinical-copy/45" : "text-white/40"}`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
