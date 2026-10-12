import { useGender } from "./GenderContext";
import { VantaCells } from "@/components/home/VantaCells";

/**
 * Site-wide animated background driven by the visitor's selected gender.
 * Same organic cellular motion for both, tinted per theme.
 * Men -> brand blue. Women -> softened botanical green.
 */
export function GenderBackground() {
  const { theme } = useGender();

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 -z-10 transition-colors duration-700 ${
        theme === "women" ? "bg-[#5C9330]" : "bg-[#2173D1]"
      }`}
    >
      {theme === "women" ? (
        <VantaCells color1={0x6ba336} color2={0x33611b} scale={1.0} scaleMobile={1.0} />
      ) : (
        <VantaCells color1={0x2173d1} color2={0x0b3d8c} scale={1.0} scaleMobile={1.0} />
      )}
    </div>
  );
}

export default GenderBackground;
