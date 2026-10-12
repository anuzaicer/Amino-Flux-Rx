import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/home/SiteHeader";
import { HomeHero } from "@/components/home/HomeHero";
import { CareFlow } from "@/components/home/Sections";
import { HomeCatalogPreview } from "@/components/home/HomeCatalogPreview";
import { HomeInProgress } from "@/components/home/HomeInProgress";
import { SixStepSplit } from "@/components/home/SixStepSplit";

import { SiteFooter } from "@/components/home/SiteFooter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Amino Flux — Telehealth Labs, Hormones & Weight Loss" },
      {
        name: "description",
        content:
          "Licensed providers, lab panels, hormone therapy, and medical weight loss — prescribed online and shipped discreetly from US pharmacies.",
      },
      { property: "og:title", content: "Amino Flux — Telehealth Labs, Hormones & Weight Loss" },
      {
        property: "og:description",
        content:
          "Clinical-grade care delivered to your door. Provider-reviewed protocols in all 50 states.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="relative text-white">
      <SiteHeader />
      <div
        data-pager-section
        className="flex min-h-[calc(100svh-5.25rem)] flex-col md:h-[calc(100svh-7.5rem)] md:overflow-hidden"
      >
        <HomeHero />
      </div>
      <main>
        <HomeInProgress />
        <div
          data-pager-section
          className="flex min-h-0 flex-col justify-center bg-clinical-canvas py-14 md:min-h-[100svh] md:py-8"
        >
          <HomeCatalogPreview />
        </div>
        <div
          data-pager-section
          className="flex min-h-0 flex-col justify-center bg-clinical-canvas py-14 md:min-h-[100svh] md:py-8"
        >
          <SixStepSplit />
        </div>
        <div
          data-pager-section
          className="flex min-h-0 flex-col justify-center bg-clinical-canvas py-14 md:min-h-[100svh] md:py-8"
        >
          <CareFlow />
        </div>
      </main>
      <div data-pager-section>
        <SiteFooter />
      </div>
    </div>
  );
}
