import { useEffect, useRef, useState } from "react";

type VantaFogProps = {
  highlightColor?: number;
  midtoneColor?: number;
  lowlightColor?: number;
  baseColor?: number;
  blurFactor?: number;
  speed?: number;
  zoom?: number;
  className?: string;
};

const THREE_SRC = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js";
const VANTA_SRC = "https://cdn.jsdelivr.net/npm/vanta@0.5.24/dist/vanta.fog.min.js";

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
 * Vanta FOG animated WebGL background (Three.js via CDN). Browser-only / SSR-safe.
 */
export function VantaFog({
  highlightColor = 0x74b439,
  midtoneColor = 0x2173d1,
  lowlightColor = 0x2173d1,
  baseColor = 0x74b439,
  blurFactor = 0.21,
  speed = 0.8,
  zoom = 0.8,

  className = "",
}: VantaFogProps) {
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
        if (!VANTA?.FOG || !ref.current) return;
        effectRef.current = VANTA.FOG({
          el: ref.current,
          THREE: (window as any).THREE,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200,
          minWidth: 200,
          highlightColor,
          midtoneColor,
          lowlightColor,
          baseColor,
          blurFactor,
          speed,
          zoom,
        });
        setReady(true);
      })
      .catch((e) => console.error("Vanta fog load error:", e));

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
  }, [highlightColor, midtoneColor, lowlightColor, baseColor, blurFactor, speed, zoom]);

  return (
    <div
      ref={ref}
      className={`absolute inset-0 ${className} ${ready ? "" : "opacity-0"}`}
      aria-hidden="true"
    />
  );
}

export default VantaFog;
