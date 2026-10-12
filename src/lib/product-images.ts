import type { CatalogGroup } from "@/data/catalog";
import pGlp1 from "@/assets/p-glp1.jpg";
import pLabpanel from "@/assets/p-labpanel.jpg";
import pMaleComprehensive from "@/assets/p-male-comprehensive.png";
import pTrtSkincare from "@/assets/p-trt-skincare.jpg";
import cLab from "@/assets/c-lab.jpg";
import cVitamins from "@/assets/c-vitamins.jpg";
import cInjectables from "@/assets/c-injectables.jpg";
import cWeight from "@/assets/c-weight.jpg";

/** Shared group → image mapping (mirrors the storefront cards). */
export const GROUP_IMAGE: Record<CatalogGroup, string> = {
  labs: pLabpanel,
  weight: cWeight,
  hormones: pTrtSkincare,
  peptides: cInjectables,
  intimacy: pGlp1,
  ed: pGlp1,
  skin: pTrtSkincare,
  vitamins: cVitamins,
  bundles: cInjectables,
};

/** Per-product image overrides (fall back to the group image when absent). */
const PRODUCT_IMAGE: Record<string, string> = {
  "lab-male-comprehensive": pMaleComprehensive,
};

export function productImageFor(group: string | null | undefined, productId?: string): string {
  if (productId && PRODUCT_IMAGE[productId]) return PRODUCT_IMAGE[productId]!;
  return GROUP_IMAGE[(group as CatalogGroup) ?? "labs"] ?? cLab;
}
