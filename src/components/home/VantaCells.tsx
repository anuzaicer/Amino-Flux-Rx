import { useEffect, useRef, useState } from "react";

type VantaCellsProps = {
  color1?: number;
  color2?: number;
  scale?: number;
  scaleMobile?: number;
  minHeight?: number;
  minWidth?: number;
  className?: string;
};

const THREE_SRC = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js";
const VANTA_SRC = "https://cdn.jsdelivr.net/npm/vanta@0.5.24/dist/vanta.cells.min.js";

const scriptPromises = new Map<string, Promise<void>>();

function loadScript(src: string): Promise<void> {
  const cached = scriptPromises.get(src);
  if (cached) return cached;
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
  const promise =
    existing && existing.dataset.loaded === "true"
      ? Promise.resolve()
      : new Promise<void>((resolve, reject) => {
          let s = existing;
          if (!s) {
            s = document.createElement("script");
            s.src = src;
            s.async = true;
            document.head.appendChild(s);
          }
          s.addEventListener("load", () => {
            s!.dataset.loaded = "true";
            resolve();
          });
          s.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)));
        });
  scriptPromises.set(src, promise);
  return promise;
}

/**
 * Vanta CELLS animated WebGL background (Three.js via CDN).
 * Loaded in the browser only — SSR-safe.
 */
export function VantaCells({
  color1 = 0x2173d1,
  color2 = 0x2173d1,
  scale = 1.0,
  scaleMobile = 1.0,
  minHeight = 200,
  minWidth = 200,
  className = "",
}: VantaCellsProps) {
  const ref = useRef<HTMLDivElement>(null);
  const effectRef = useRef<null | { destroy: () => void }>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadScript(THREE_SRC)
      .then(() => loadScript(VANTA_SRC))
      .then(() => {
        if (cancelled) return;
        const VANTA = (window as any).VANTA;
        if (!VANTA || !ref.current) return;
        effectRef.current = VANTA.CELLS({
          el: ref.current,
          THREE: (window as any).THREE,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight,
          minWidth,
          scale,
          scaleMobile,
          color1,
          color2,
        });
        setReady(true);
      })
      .catch((e) => console.error("Vanta load error:", e));

    return () => {
      cancelled = true;
      if (effectRef.current) {
        try {
          effectRef.current.destroy();
        } catch {
          /* noop */
        }
        effectRef.current = null;
      }
    };
  }, [color1, color2, scale, scaleMobile, minHeight, minWidth]);

  return (
    <div
      ref={ref}
      className={`absolute inset-0 ${className} ${ready ? "" : "opacity-0"}`}
      aria-hidden="true"
    />
  );
}

export default VantaCells;
