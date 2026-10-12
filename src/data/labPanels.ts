export type PanelAudience = "men" | "women" | "both";

export type LabPanel = {
  id: string;
  name: string;
  price: string;
  audience: PanelAudience;
  summary: string;
  usedFor: string;
  /** Biomarkers grouped so the list stays readable. */
  markers: { group: string; items: string[] }[];
};

const CBC = {
  group: "Complete Blood Count (CBC)",
  items: [
    "White blood cell count (WBC)",
    "Red blood cell count (RBC)",
    "Hemoglobin & hematocrit",
    "MCV, MCH, MCHC, RDW",
    "Platelet count",
    "Differential (neutrophils, lymphocytes, monocytes, eosinophils, basophils)",
  ],
};

const CMP = {
  group: "Comprehensive Metabolic Panel (CMP)",
  items: [
    "Glucose",
    "BUN & creatinine",
    "eGFR",
    "Sodium, potassium, chloride, CO2",
    "Calcium",
    "Total protein & albumin",
    "Bilirubin (total)",
    "ALT, AST, alkaline phosphatase",
  ],
};

const LIPIDS = {
  group: "Lipid panel",
  items: [
    "Total cholesterol",
    "LDL cholesterol",
    "HDL cholesterol",
    "Triglycerides",
    "Cholesterol/HDL ratio",
  ],
};

const THYROID = {
  group: "Thyroid panel",
  items: ["TSH", "T3 Uptake", "T4 (Thyroxine) Total", "Free T4 Index (T7)"],
};

const NUTRIENTS = {
  group: "Nutrients",
  items: ["Vitamin D, 25-hydroxy", "Vitamin B12", "Folate"],
};

const GLUCOSE = {
  group: "Glucose & metabolic",
  items: ["Fasting glucose", "Hemoglobin A1c"],
};

const IRON = {
  group: "Iron studies",
  items: ["Ferritin", "Iron", "TIBC", "Iron saturation"],
};

export const LAB_PANELS: LabPanel[] = [
  /* ── For everyone ── */
  {
    id: "thyroid-panel",
    name: "Thyroid Panel",
    price: "$120",
    audience: "both",
    summary: "A focused look at thyroid function.",
    usedFor:
      "Fatigue, weight changes, hair thinning, temperature intolerance, or monitoring thyroid therapy.",
    markers: [THYROID],
  },
  {
    id: "urinalysis-reflex",
    name: "Urinalysis with Reflex Culture",
    price: "$90",
    audience: "both",
    summary:
      "Urinalysis with reflex to culture. If a urinary tract infection is identified, antibiotics may be sent to your preferred pharmacy (antibiotic cost is paid at the pharmacy).",
    usedFor: "Screening and diagnosis of a suspected urinary tract infection.",
    markers: [
      {
        group: "Urinalysis",
        items: [
          "Color & appearance",
          "Specific gravity & pH",
          "Protein, glucose, ketones",
          "Blood, bilirubin, urobilinogen",
          "Leukocyte esterase & nitrite",
          "Microscopic sediment",
        ],
      },
      {
        group: "Reflex testing",
        items: [
          "Urine culture if indicated",
          "Organism identification",
          "Antibiotic sensitivities",
        ],
      },
    ],
  },

  /* ── Men ── */
  {
    id: "male-comprehensive",
    name: "Male Comprehensive Panel",
    price: "$185",
    audience: "men",
    summary: "Full baseline health picture for men. Hormones are not included.",
    usedFor:
      "Your best starting panel if you want a complete health check without hormone testing.",
    markers: [
      CBC,
      CMP,
      GLUCOSE,
      THYROID,
      NUTRIENTS,
      LIPIDS,
      { group: "Prostate", items: ["PSA (prostate specific antigen)"] },
    ],
  },
  {
    id: "male-comprehensive-hormones",
    name: "Male Comprehensive Panel + Hormones",
    price: "$275",
    audience: "men",
    summary: "Everything in the male comprehensive panel plus a full hormone and iron workup.",
    usedFor:
      "Starting testosterone therapy, or investigating low energy, low libido, and body composition changes.",
    markers: [
      CBC,
      CMP,
      GLUCOSE,
      THYROID,
      NUTRIENTS,
      LIPIDS,
      { group: "Prostate", items: ["PSA (prostate specific antigen)"] },
      {
        group: "Hormones",
        items: ["Total testosterone", "Free testosterone", "Estradiol", "DHEA-S", "SHBG"],
      },
      IRON,
    ],
  },
  {
    id: "male-trt-monitoring",
    name: "TRT Monitoring Panel",
    price: "$150",
    audience: "men",
    summary: "For patients already on TRT. Recommended every 3 months for injections.",
    usedFor: "Ongoing safety and dose monitoring while on testosterone replacement therapy.",
    markers: [
      { group: "Hormones", items: ["Total testosterone", "Free testosterone", "Estradiol"] },
      { group: "Prostate", items: ["PSA (prostate specific antigen)"] },
      CBC,
    ],
  },

  /* ── Women ── */
  {
    id: "female-comprehensive",
    name: "Female Comprehensive Panel",
    price: "$190",
    audience: "women",
    summary: "Full baseline health picture for women. Hormones are not included.",
    usedFor:
      "Your best starting panel if you want a complete health check without hormone testing.",
    markers: [CBC, CMP, GLUCOSE, THYROID, NUTRIENTS, LIPIDS],
  },
  {
    id: "female-comprehensive-hormones",
    name: "Female Comprehensive Panel + Hormones",
    price: "$300",
    audience: "women",
    summary: "Everything in the female comprehensive panel plus a full hormone and iron workup.",
    usedFor: "Hormone symptoms, perimenopause, or before starting hormone therapy.",
    markers: [
      CBC,
      CMP,
      GLUCOSE,
      THYROID,
      NUTRIENTS,
      LIPIDS,
      {
        group: "Hormones",
        items: [
          "Total testosterone",
          "Free testosterone",
          "SHBG",
          "Estradiol",
          "FSH & LH",
          "DHEA-S",
        ],
      },
      IRON,
    ],
  },
  {
    id: "female-hrt-baseline",
    name: "Comprehensive HRT Panel (Baseline, Women)",
    price: "$190",
    audience: "women",
    summary: "Baseline HRT panel for women who are still cycling.",
    usedFor: "The first panel to run before starting hormone replacement therapy.",
    markers: [
      {
        group: "Hormones",
        items: [
          "DHEA-S",
          "Progesterone",
          "FSH & LH",
          "Total testosterone",
          "Free testosterone",
          "SHBG",
        ],
      },
      { group: "Pregnancy screen", items: ["HCG (urine)"] },
      CBC,
      CMP,
    ],
  },
  {
    id: "womens-hrt-monitoring",
    name: "HRT Monitoring Panel (Women)",
    price: "$150",
    audience: "women",
    summary:
      "For women already on HRT with a baseline panel completed. Every 3 months for injections, every 6 months for troches or creams.",
    usedFor: "Ongoing safety and dose monitoring while on hormone replacement therapy.",
    markers: [
      {
        group: "Hormones",
        items: ["Total testosterone", "Free testosterone", "Estradiol", "SHBG"],
      },
      CBC,
    ],
  },
  {
    id: "female-fertility",
    name: "Female Fertility Panel",
    price: "$210",
    audience: "women",
    summary: "Hormone markers used when evaluating cycle regularity and fertility.",
    usedFor: "Irregular cycles, difficulty conceiving, or planning ahead for pregnancy.",
    markers: [
      {
        group: "Reproductive hormones",
        items: [
          "FSH",
          "LH",
          "Estradiol",
          "Progesterone",
          "Prolactin",
          "AMH (anti-Müllerian hormone)",
        ],
      },
      THYROID,
      { group: "Additional", items: ["DHEA-S", "Total testosterone", "SHBG"] },
    ],
  },
];

export const AUDIENCE_LABEL: Record<PanelAudience, string> = {
  men: "Men's panels",
  women: "Women's panels",
  both: "Men & women",
};
