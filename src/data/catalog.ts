/**
 * Full Amino Flux Rx product catalog, imported from the clinic menu.
 * `audience` drives which care path (men / women) a product appears in.
 */
export type Audience = "men" | "women" | "both";

export type CatalogGroup =
  | "labs"
  | "weight"
  | "hormones"
  | "peptides"
  | "intimacy"
  | "ed"
  | "skin"
  | "vitamins"
  | "bundles";

export type CatalogProduct = {
  id: string;
  name: string;
  description: string;
  price: string;
  group: CatalogGroup;
  audience: Audience;
  /** Lab work is required before this can be prescribed. */
  lab: boolean;
  /** A licensed provider must see the patient by telehealth before it can be prescribed. */
  telehealth: boolean;
};

type CatalogSeed = Omit<CatalogProduct, "telehealth">;

const CATALOG_SEED: CatalogSeed[] = [
  {
    id: "lab-female-hrt-baseline",
    name: "Comprehensive HRT Panel (Baseline, Women)",
    description:
      "Baseline HRT panel for women still cycling. Includes DHEA-S, Progesterone, FSH/LH, HCG (urine), Total/Free…",
    price: "$190",
    group: "labs",
    audience: "women",
    lab: false,
  },
  {
    id: "lab-female-comprehensive",
    name: "Female Comprehensive Panel",
    description:
      "CBC, CMP, Fasting Glucose, A1c, Thyroid Panel, Vitamin D, B12, Folate, Lipid Panel. Hormones not included.",
    price: "$170",
    group: "labs",
    audience: "women",
    lab: false,
  },
  {
    id: "lab-female-comprehensive-plus-hormones",
    name: "Female Comprehensive Panel + Hormones",
    description:
      "CBC, CMP, Fasting Glucose, A1c, Thyroid Panel, Vitamin D, B12, Folate, Lipid Panel, Total/Free Testosterone, SHBG,…",
    price: "$275",
    group: "labs",
    audience: "women",
    lab: false,
  },
  {
    id: "lab-male-comprehensive",
    name: "Male Comprehensive Panel",
    description:
      "CBC, CMP, Fasting Glucose, A1c, Thyroid Panel, Vitamin D, B12, Folate, PSA, Lipid Panel. Hormones not included.",
    price: "$185",
    group: "labs",
    audience: "men",
    lab: false,
  },
  {
    id: "lab-male-comprehensive-plus-hormones",
    name: "Male Comprehensive Panel + Hormones",
    description:
      "CBC, CMP, Fasting Glucose, A1c, Thyroid Panel, Vitamin D, B12, Folate, PSA, Lipid Panel, Total/Free Testosterone,…",
    price: "$275",
    group: "labs",
    audience: "men",
    lab: false,
  },
  {
    id: "lab-urinalysis-reflex",
    name: "Urinalysis with Reflex Culture (+ Antibiotics if Warranted)",
    description:
      "Urinalysis with reflex to culture. If a urinary tract infection is identified, antibiotics may be sent to your…",
    price: "$90",
    group: "labs",
    audience: "both",
    lab: false,
  },
  {
    id: "lab-thyroid-comprehensive",
    name: "Thyroid Panel",
    description: "TSH, T3 Uptake, T4 (Thyroxine) Total, Free T4 Index (T7).",
    price: "$120",
    group: "labs",
    audience: "both",
    lab: false,
  },
  {
    id: "lab-male-trt-monitoring",
    name: "TRT Monitoring Panel",
    description:
      "Total & Free Testosterone, Estradiol, PSA, CBC. For patients already on testosterone therapy — every 3 months for injections.",
    price: "$150",
    group: "labs",
    audience: "men",
    lab: false,
  },
  {
    id: "lab-womens-hrt-monitoring",
    name: "HRT Monitoring Panel (Women)",
    description:
      "Total & Free Testosterone, Estradiol, SHBG, CBC. For women already on HRT with a baseline panel completed.",
    price: "$150",
    group: "labs",
    audience: "women",
    lab: false,
  },
  {
    id: "lab-female-fertility",
    name: "Female Fertility Panel",
    description:
      "FSH, LH, Estradiol, Progesterone, Prolactin, AMH, Thyroid Panel, DHEA-S, Total Testosterone, SHBG.",
    price: "$210",
    group: "labs",
    audience: "women",
    lab: false,
  },

  {
    id: "ctrl-lipo-burn-3-30",
    name: "Lipo Burn 3 (Caffeine / Phentermine 20 mg / Naltrexone / Methylcobalamin) — 30-day supply",
    description: "100 / 20 / 8 / 1 mg.",
    price: "$153",
    group: "weight",
    audience: "both",
    lab: true,
  },
  {
    id: "ctrl-lipo-burn-3-60",
    name: "Lipo Burn 3 (Caffeine / Phentermine 20 mg / Naltrexone / Methylcobalamin) — 60-day supply",
    description: "100 / 20 / 8 / 1 mg.",
    price: "$210",
    group: "weight",
    audience: "both",
    lab: true,
  },
  {
    id: "ctrl-lipo-burn-4-30",
    name: "Lipo Burn 4 (Caffeine / Phentermine 37.5 mg / Naltrexone / Methylcobalamin) — 30-day supply",
    description: "100 / 37.5 / 8 / 1 mg.",
    price: "$153",
    group: "weight",
    audience: "both",
    lab: true,
  },
  {
    id: "ctrl-lipo-burn-4-60",
    name: "Lipo Burn 4 (Caffeine / Phentermine 37.5 mg / Naltrexone / Methylcobalamin) — 60-day supply",
    description: "100 / 37.5 / 8 / 1 mg.",
    price: "$210",
    group: "weight",
    audience: "both",
    lab: true,
  },
  {
    id: "ctrl-phentermine",
    name: "Phentermine (Medical Weight Loss)",
    description:
      "Short-term appetite suppressant for medically supervised weight loss. Requires a pre-purchase provider appointment.",
    price: "$125",
    group: "weight",
    audience: "both",
    lab: true,
  },
  {
    id: "ctrl-phentermine-375-30",
    name: "Phentermine 37.5 mg — 30 Capsules",
    description:
      "Includes initial 15-minute telehealth consultation. Schedule IV controlled substance.",
    price: "$160",
    group: "weight",
    audience: "both",
    lab: true,
  },
  {
    id: "ctrl-phentermine-375-60",
    name: "Phentermine 37.5 mg — 60 Capsules",
    description:
      "Includes initial 15-minute telehealth consultation. Schedule IV controlled substance.",
    price: "$210",
    group: "weight",
    audience: "both",
    lab: true,
  },
  {
    id: "ctrl-phen-topiramate-30",
    name: "Phentermine HCl 15 mg / Topiramate 20 mg — 30 Tablets",
    description:
      "Includes initial 15-minute telehealth consultation. Schedule IV controlled substance.",
    price: "$190",
    group: "weight",
    audience: "both",
    lab: true,
  },
  {
    id: "ctrl-phen-topiramate-60",
    name: "Phentermine HCl 15 mg / Topiramate 20 mg — 60 Tablets",
    description:
      "Includes initial 15-minute telehealth consultation. Schedule IV controlled substance.",
    price: "$240",
    group: "weight",
    audience: "both",
    lab: true,
  },
  {
    id: "glp-sema-125-1ml",
    name: "Semaglutide + Pyridoxine 1.25 mg / 10 mg/mL — 1 mL",
    description: "Weekly subcutaneous GLP-1 therapy. Weekly dose ~25 units. (Rush)",
    price: "$175",
    group: "weight",
    audience: "both",
    lab: true,
  },
  {
    id: "glp-sema-25-1ml",
    name: "Semaglutide + Pyridoxine 2.5 mg / 10 mg/mL — 1 mL",
    description: "Weekly subcutaneous GLP-1 therapy. Weekly dose ~25 units. (Rush)",
    price: "$220",
    group: "weight",
    audience: "both",
    lab: true,
  },
  {
    id: "glp-sema-25-2ml",
    name: "Semaglutide + Pyridoxine 2.5 mg / 10 mg/mL — 2 mL",
    description: "Weekly subcutaneous GLP-1 therapy. Weekly dose ~50 units. (Rush)",
    price: "$240",
    group: "weight",
    audience: "both",
    lab: true,
  },
  {
    id: "glp-sema-25-3ml",
    name: "Semaglutide + Pyridoxine 2.5 mg / 10 mg/mL — 3 mL",
    description: "Weekly subcutaneous GLP-1 therapy. Weekly dose ~75 units. (Rush)",
    price: "$260",
    group: "weight",
    audience: "both",
    lab: true,
  },
  {
    id: "glp-sema-25-4ml",
    name: "Semaglutide + Pyridoxine 2.5 mg / 10 mg/mL — 4 mL",
    description: "Weekly subcutaneous GLP-1 therapy. Weekly dose ~100 units. (Rush)",
    price: "$280",
    group: "weight",
    audience: "both",
    lab: true,
  },
  {
    id: "glp-sema-75-4ml",
    name: "Semaglutide + Pyridoxine 7.5 mg / 10 mg/mL — 4 mL",
    description: "Weekly subcutaneous GLP-1 therapy. Weekly dose ~100 units. (Rush)",
    price: "$350",
    group: "weight",
    audience: "both",
    lab: true,
  },
  {
    id: "glp-tirz-125-1ml",
    name: "Tirzepatide + Pyridoxine 12.5 mg/mL — 1 mL",
    description: "Weekly subcutaneous GLP-1/GIP therapy. Weekly dose ~25 units.",
    price: "$250",
    group: "weight",
    audience: "both",
    lab: true,
  },
  {
    id: "glp-tirz-125-2ml",
    name: "Tirzepatide + Pyridoxine 12.5 mg/mL — 2 mL",
    description: "Weekly subcutaneous GLP-1/GIP therapy. Weekly dose ~50 units.",
    price: "$300",
    group: "weight",
    audience: "both",
    lab: true,
  },
  {
    id: "glp-tirz-125-3ml",
    name: "Tirzepatide + Pyridoxine 12.5 mg/mL — 3 mL",
    description: "Weekly subcutaneous GLP-1/GIP therapy. Weekly dose ~75 units.",
    price: "$350",
    group: "weight",
    audience: "both",
    lab: true,
  },
  {
    id: "glp-tirz-125-4ml",
    name: "Tirzepatide + Pyridoxine 12.5 mg/mL — 4 mL",
    description: "Weekly subcutaneous GLP-1/GIP therapy. Weekly dose ~100 units.",
    price: "$400",
    group: "weight",
    audience: "both",
    lab: true,
  },
  {
    id: "glp-tirz-20-3ml",
    name: "Tirzepatide + Pyridoxine 20 mg/mL — 3 mL",
    description: "Weekly subcutaneous GLP-1/GIP therapy. Weekly dose ~75 units.",
    price: "$525",
    group: "weight",
    audience: "both",
    lab: true,
  },
  {
    id: "glp-tirz-8-1ml",
    name: "Tirzepatide + Pyridoxine 8 mg/mL — 1 mL",
    description:
      "Weekly subcutaneous GLP-1/GIP therapy. Supplies and cold shipping included. Weekly dose ~25 units.",
    price: "$190",
    group: "weight",
    audience: "both",
    lab: true,
  },
  {
    id: "hrm-anastrozole-025-16",
    name: "Anastrozole 0.25 mg — 16 Capsules",
    description: "Approximately a 2-month course for patients on testosterone therapy.",
    price: "$110",
    group: "hormones",
    audience: "men",
    lab: true,
  },
  {
    id: "hrm-anastrozole-05-16",
    name: "Anastrozole 0.5 mg — 16 Capsules",
    description: "Approximately a 2-month course for patients on testosterone therapy.",
    price: "$110",
    group: "hormones",
    audience: "men",
    lab: true,
  },
  {
    id: "hrm-clomid-25-30",
    name: "Clomiphene (Clomid) 25 mg — 30 Capsules",
    description: "Supports natural testosterone production and fertility. (Olympia)",
    price: "$165",
    group: "hormones",
    audience: "men",
    lab: true,
  },
  {
    id: "hrm-clomid-25-60",
    name: "Clomiphene (Clomid) 25 mg — 60 Capsules",
    description: "Supports natural testosterone production and fertility. (Olympia)",
    price: "$205",
    group: "hormones",
    audience: "men",
    lab: true,
  },
  {
    id: "hrm-clomid-50-30",
    name: "Clomiphene (Clomid) 50 mg — 30 Capsules",
    description: "Supports natural testosterone production and fertility. (Olympia)",
    price: "$180",
    group: "hormones",
    audience: "men",
    lab: true,
  },
  {
    id: "hrm-clomid-50-60",
    name: "Clomiphene (Clomid) 50 mg — 60 Capsules",
    description: "Supports natural testosterone production and fertility. (Olympia)",
    price: "$220",
    group: "hormones",
    audience: "men",
    lab: true,
  },
  {
    id: "hrm-dhea-25",
    name: "DHEA 25 mg — 60 Capsules",
    description: "Oral DHEA supplementation. (Olympia)",
    price: "$110",
    group: "hormones",
    audience: "both",
    lab: true,
  },
  {
    id: "hrm-dhea-ir-10-60",
    name: "DHEA Immediate Release 10 mg — 60 Capsules",
    description: "Immediate-release DHEA.",
    price: "$110",
    group: "hormones",
    audience: "both",
    lab: true,
  },
  {
    id: "hrm-dhea-ir-75-60",
    name: "DHEA Immediate Release 75 mg — 60 Capsules",
    description: "Immediate-release DHEA.",
    price: "$175",
    group: "hormones",
    audience: "both",
    lab: true,
  },
  {
    id: "hrm-estradiol-oral-1-30",
    name: "Estradiol 1 mg Oral Tablets — 30-day supply",
    description: "Oral estradiol tablets.",
    price: "$117",
    group: "hormones",
    audience: "women",
    lab: true,
  },
  {
    id: "hrm-estradiol-oral-1-60",
    name: "Estradiol 1 mg Oral Tablets — 60-day supply",
    description: "Oral estradiol tablets.",
    price: "$163",
    group: "hormones",
    audience: "women",
    lab: true,
  },
  {
    id: "hrm-estradiol-oral-2-30",
    name: "Estradiol 2 mg Oral Tablets — 30-day supply",
    description: "Oral estradiol tablets.",
    price: "$117",
    group: "hormones",
    audience: "women",
    lab: true,
  },
  {
    id: "hrm-estradiol-oral-2-60",
    name: "Estradiol 2 mg Oral Tablets — 60-day supply",
    description: "Oral estradiol tablets.",
    price: "$163",
    group: "hormones",
    audience: "women",
    lab: true,
  },
  {
    id: "hrm-estrogen-patch-025",
    name: "Estrogen Transdermal Patch 0.025 mg/day — 4-Patch Pack",
    description: "Weekly / twice-weekly transdermal estrogen. (Rush)",
    price: "$160",
    group: "hormones",
    audience: "women",
    lab: true,
  },
  {
    id: "hrm-estrogen-patch-05",
    name: "Estrogen Transdermal Patch 0.05 mg/day — 4-Patch Pack",
    description: "Weekly / twice-weekly transdermal estrogen. (Rush)",
    price: "$160",
    group: "hormones",
    audience: "women",
    lab: true,
  },
  {
    id: "hrm-estrogen-patch-075",
    name: "Estrogen Transdermal Patch 0.075 mg/day — 4-Patch Pack",
    description: "Weekly / twice-weekly transdermal estrogen. (Rush)",
    price: "$160",
    group: "hormones",
    audience: "women",
    lab: true,
  },
  {
    id: "hrm-estrogen-patch-10",
    name: "Estrogen Transdermal Patch 0.10 mg/day — 4-Patch Pack",
    description: "Weekly / twice-weekly transdermal estrogen. (Rush)",
    price: "$160",
    group: "hormones",
    audience: "women",
    lab: true,
  },
  {
    id: "hrm-hcg-10000",
    name: "Human Chorionic Gonadotropin (hCG) 10,000 IU — Lyophilized Powder",
    description: "Often prescribed alongside testosterone therapy for fertility preservation.",
    price: "$335",
    group: "hormones",
    audience: "men",
    lab: true,
  },
  {
    id: "hrm-progesterone-100",
    name: "Progesterone 100 mg — 30 Capsules",
    description: "Oral micronized progesterone. (Rush)",
    price: "$125",
    group: "hormones",
    audience: "women",
    lab: true,
  },
  {
    id: "hrm-progesterone-200",
    name: "Progesterone 200 mg — 30 Capsules",
    description: "Oral micronized progesterone. (Rush)",
    price: "$135",
    group: "hormones",
    audience: "women",
    lab: true,
  },
  {
    id: "hrm-progesterone-300",
    name: "Progesterone 300 mg — 30 Capsules",
    description: "Oral micronized progesterone. (Olympia)",
    price: "$145",
    group: "hormones",
    audience: "women",
    lab: true,
  },
  {
    id: "hrm-progesterone-400",
    name: "Progesterone 400 mg — 30 Capsules",
    description: "Oral micronized progesterone. (Olympia)",
    price: "$155",
    group: "hormones",
    audience: "women",
    lab: true,
  },
  {
    id: "hrm-testosterone-cyp-200-10ml",
    name: "Testosterone Cypionate 200 mg/mL — 10 mL Multi-Dose Vial (Men)",
    description:
      "Weekly IM testosterone therapy. Initial telehealth consult and supplies included. (Rush). Schedule III controlled…",
    price: "$220",
    group: "hormones",
    audience: "men",
    lab: true,
  },
  {
    id: "hrm-testosterone-cyp-200-5ml",
    name: "Testosterone Cypionate 200 mg/mL — 5 mL Multi-Dose Vial (Men)",
    description:
      "Weekly IM testosterone therapy. Initial telehealth consult included; supplies separate. (Olympia). Schedule III…",
    price: "$170",
    group: "hormones",
    audience: "men",
    lab: true,
  },
  {
    id: "hrm-testosterone-vaginal-cream",
    name: "Testosterone Vaginal Cream (Women)",
    description:
      "Twice-weekly application. Initial telehealth consult included; supplies separate. Schedule III controlled substance.",
    price: "$195",
    group: "hormones",
    audience: "women",
    lab: true,
  },
  {
    id: "inj-glutathione-200-30ml",
    name: "Glutathione 200 mg/mL — 30 mL",
    description:
      "Glutathione multi-dose vial. Cold shipping included; supplies sold separately. (Rush)",
    price: "$265",
    group: "peptides",
    audience: "both",
    lab: false,
  },
  {
    id: "inj-glutathione-200-4ml",
    name: "Glutathione 200 mg/mL — 4 mL",
    description: "Glutathione injection. Injection supplies and cold shipping included. (Olympia)",
    price: "$165",
    group: "peptides",
    audience: "both",
    lab: false,
  },
  {
    id: "inj-nad-100-10ml",
    name: "NAD+ 100 mg/mL — 10 mL Multi-Dose Vial",
    description:
      "Injectable NAD+ therapy. Cold shipping included; injection supplies sold separately. (Rush)",
    price: "$205",
    group: "peptides",
    audience: "both",
    lab: false,
  },
  {
    id: "inj-nad-200-10ml",
    name: "NAD+ 200 mg/mL — 10 mL Vial (Ready to Use)",
    description: "Ready-to-use NAD+ multi-dose vial.",
    price: "$240",
    group: "peptides",
    audience: "both",
    lab: false,
  },
  {
    id: "inj-nad-200-5ml",
    name: "NAD+ 200 mg/mL — 5 mL Multi-Dose Vial",
    description:
      "Injectable NAD+ therapy. Includes injection supplies and cold shipping. (Olympia)",
    price: "$165",
    group: "peptides",
    audience: "both",
    lab: false,
  },
  {
    id: "inj-nad-lyo-500",
    name: "NAD+ 500 mg Lyophilized Powder (Not Reconstituted)",
    description: "Lyophilized NAD+ requiring reconstitution with bacteriostatic water.",
    price: "$175",
    group: "peptides",
    audience: "both",
    lab: false,
  },
  {
    id: "inj-nad-nasal-100-5ml",
    name: "NAD+ Nasal Spray 100 mg/mL — 5 mL",
    description: "Intranasal NAD+ for rapid absorption. Bottle and shipping included. (Rush)",
    price: "$165",
    group: "peptides",
    audience: "both",
    lab: false,
  },
  {
    id: "inj-nad-nasal-300-15ml",
    name: "NAD+ Nasal Spray 300 mg/mL — 15 mL",
    description: "Intranasal NAD+ for rapid absorption. Bottle and shipping included. (Rush)",
    price: "$225",
    group: "peptides",
    audience: "both",
    lab: false,
  },
  {
    id: "pep-sermorelin-09-10ml",
    name: "Sermorelin 0.9 mg/mL — 10 mL",
    description:
      "Sermorelin multi-dose vial. Cold shipping included; supplies sold separately. (Olympia)",
    price: "$220",
    group: "peptides",
    audience: "both",
    lab: false,
  },
  {
    id: "pep-sermorelin-lyo-15mg",
    name: "Sermorelin 15 mg Lyophilized Powder (Not Reconstituted)",
    description: "Lyophilized sermorelin requiring reconstitution with bacteriostatic water.",
    price: "$248",
    group: "peptides",
    audience: "both",
    lab: false,
  },
  {
    id: "pep-sermorelin-lyo-6mg",
    name: "Sermorelin 6 mg Lyophilized Powder (Not Reconstituted)",
    description: "Lyophilized sermorelin requiring reconstitution with bacteriostatic water.",
    price: "$190",
    group: "peptides",
    audience: "both",
    lab: false,
  },
  {
    id: "pep-sermorelin-lyo-9mg",
    name: "Sermorelin 9 mg Lyophilized Powder (Not Reconstituted)",
    description: "Lyophilized sermorelin requiring reconstitution with bacteriostatic water.",
    price: "$210",
    group: "peptides",
    audience: "both",
    lab: false,
  },
  {
    id: "inj-tri-immune-30ml",
    name: "Tri-Immune (Vitamin C + Zinc + Glutathione) — 30 mL",
    description:
      "Multi-dose immune support injection. Cold shipping included; supplies sold separately. (Rush)",
    price: "$230",
    group: "peptides",
    audience: "both",
    lab: false,
  },
  {
    id: "intim-climax-cream",
    name: "Climax Cream",
    description:
      "Compounded topical (Theophylline 3% / Arginine 3% / Ergoloid Mesylate 0.05% / Pentoxifylline 5%). (Olympia)",
    price: "$190",
    group: "intimacy",
    audience: "women",
    lab: false,
  },
  {
    id: "intim-euphoria-cream",
    name: "Euphoria Cream",
    description: "Compounded topical for female intimate wellness. (Olympia)",
    price: "$200",
    group: "intimacy",
    audience: "women",
    lab: false,
  },
  {
    id: "intim-scream-cream",
    name: "Scream Cream",
    description: "Compounded topical (Theophylline 3% / Arginine 6% / Sildenafil 2%). (Olympia)",
    price: "$190",
    group: "intimacy",
    audience: "women",
    lab: false,
  },
  {
    id: "ed-sil-tad-rdt-10",
    name: "Sildenafil 100 mg / Tadalafil 40 mg Rapid Dissolve Tablets — 10 Tablets",
    description:
      "Combines two proven PDE-5 inhibitors in one rapid dissolve tablet for both shorter-acting and longer-acting erectile…",
    price: "$145",
    group: "ed",
    audience: "men",
    lab: false,
  },
  {
    id: "ed-sil-tad-rdt-20",
    name: "Sildenafil 100 mg / Tadalafil 40 mg Rapid Dissolve Tablets — 20 Tablets",
    description:
      "Combines two proven PDE-5 inhibitors in one rapid dissolve tablet for both shorter-acting and longer-acting erectile…",
    price: "$220",
    group: "ed",
    audience: "men",
    lab: false,
  },
  {
    id: "ed-sildenafil-25-30",
    name: "Sildenafil 25 mg Tablets — 30 Tablets",
    description:
      "Lower-dose sildenafil option for patients who may be more sensitive to medication or require individualized dosing.",
    price: "$145",
    group: "ed",
    audience: "men",
    lab: false,
  },
  {
    id: "ed-tadalafil-75-rdt-10",
    name: "Tadalafil 75 mg Rapid Dissolve Tablets — 10 Tablets",
    description:
      "Long-lasting erectile support (up to approximately 36 hours in many patients) in a rapid dissolve tablet — no water…",
    price: "$145",
    group: "ed",
    audience: "men",
    lab: false,
  },
  {
    id: "ed-tadalafil-75-rdt-20",
    name: "Tadalafil 75 mg Rapid Dissolve Tablets — 20 Tablets",
    description:
      "Long-lasting erectile support (up to approximately 36 hours in many patients) in a rapid dissolve tablet — no water…",
    price: "$220",
    group: "ed",
    audience: "men",
    lab: false,
  },
  {
    id: "intim-testosterone-ellage-100",
    name: "Testosterone Cream 100 mg/mL (Ellage Base) — 30 g TopiClick®",
    description:
      "Formulated for vaginal and vulvar application. Helps improve vaginal dryness and discomfort, supports healthy tissue…",
    price: "$168",
    group: "intimacy",
    audience: "women",
    lab: false,
  },
  {
    id: "intim-testosterone-versa-100",
    name: "Testosterone Cream 100 mg/mL (Versa Base) — 30 g TopiClick®",
    description:
      "External transdermal application to inner thighs, upper arms, or shoulders. Supports energy, libido, lean muscle…",
    price: "$168",
    group: "intimacy",
    audience: "women",
    lab: false,
  },
  {
    id: "intim-testosterone-ellage-200",
    name: "Testosterone Cream 200 mg/mL (Ellage Base) — 30 g TopiClick®",
    description:
      "Formulated for vaginal and vulvar application. Helps improve vaginal dryness and discomfort, supports healthy tissue…",
    price: "$175",
    group: "intimacy",
    audience: "women",
    lab: false,
  },
  {
    id: "intim-testosterone-versa-200",
    name: "Testosterone Cream 200 mg/mL (Versa Base) — 30 g TopiClick®",
    description:
      "External transdermal application to inner thighs, upper arms, or shoulders. Supports energy, libido, lean muscle…",
    price: "$175",
    group: "intimacy",
    audience: "women",
    lab: false,
  },
  {
    id: "intim-testosterone-ellage-50",
    name: "Testosterone Cream 50 mg/mL (Ellage Base) — 30 g TopiClick®",
    description:
      "Formulated for vaginal and vulvar application. Helps improve vaginal dryness and discomfort, supports healthy tissue…",
    price: "$161",
    group: "intimacy",
    audience: "women",
    lab: false,
  },
  {
    id: "intim-testosterone-versa-50",
    name: "Testosterone Cream 50 mg/mL (Versa Base) — 30 g TopiClick®",
    description:
      "External transdermal application to inner thighs, upper arms, or shoulders. Supports energy, libido, lean muscle…",
    price: "$161",
    group: "intimacy",
    audience: "women",
    lab: false,
  },
  {
    id: "skin-copper-05",
    name: "Copper Peptide Cream 0.5% — 30 g Tube",
    description: "Topical copper peptide cream for daily skin care. (Olympia)",
    price: "$150",
    group: "skin",
    audience: "both",
    lab: false,
  },
  {
    id: "skin-copper-2",
    name: "Copper Peptide Cream 2% — 30 g Tube",
    description: "Topical copper peptide cream for daily skin care. (Olympia)",
    price: "$200",
    group: "skin",
    audience: "both",
    lab: false,
  },
  {
    id: "skin-copper-4",
    name: "Copper Peptide Cream 4% — 30 g Tube",
    description: "Topical copper peptide cream for daily skin care. (Olympia)",
    price: "$230",
    group: "skin",
    audience: "both",
    lab: false,
  },
  {
    id: "derm-dermiracle-max-30g",
    name: "Dermiracle Max Extreme Repair Cream — 30 g Tube",
    description:
      "Hydroquinone 8%, Retinoic Acid 0.1%, Azelaic Acid 15%, Kojic Acid 4%, Hydrocortisone 1%. Targets severe…",
    price: "$200",
    group: "skin",
    audience: "both",
    lab: false,
  },
  {
    id: "derm-glow-cream-30g",
    name: "Glow Even Skin Tone Cream — 30 g Tube",
    description:
      "Kojic Acid 5%, Ascorbic Acid (Vitamin C) 2%, Hyaluronic Acid 0.5%. Brightens dull skin, reduces hyperpigmentation,…",
    price: "$160",
    group: "skin",
    audience: "both",
    lab: false,
  },
  {
    id: "derm-mane10-spray-100ml",
    name: "Mane 10 Leave-In Hair Spray — 100 mL Bottle",
    description:
      "Minoxidil 5%, Fluocinolone 0.01%, Hyaluronic Acid 0.01%, Vitamin E 0.5%. Helps stimulate hair growth, reduce…",
    price: "$190",
    group: "skin",
    audience: "both",
    lab: false,
  },
  {
    id: "rx-minoxidil-25-30",
    name: "Minoxidil 2.5 mg — 30 Tablets",
    description: "Oral low-dose minoxidil for hair growth. (Rush)",
    price: "$85",
    group: "skin",
    audience: "both",
    lab: false,
  },
  {
    id: "rx-minoxidil-25-60",
    name: "Minoxidil 2.5 mg — 60 Tablets",
    description: "Oral low-dose minoxidil for hair growth. (Rush)",
    price: "$110",
    group: "skin",
    audience: "both",
    lab: false,
  },
  {
    id: "derm-nad-rejuvenation-cream-30g",
    name: "NAD+ Rejuvenation Cream — 30 g Tube",
    description:
      "Supports healthy cellular energy production, improves the appearance of fine lines and wrinkles, and promotes…",
    price: "$185",
    group: "skin",
    audience: "both",
    lab: false,
  },
  {
    id: "derm-plump-cream-30g",
    name: "Plump Anti-Aging Cream — 30 g Tube",
    description:
      "Retinoic Acid 0.05% with Hyaluronic Acid 0.2%. Stimulates collagen production, encourages healthy cell turnover, and…",
    price: "$150",
    group: "skin",
    audience: "both",
    lab: false,
  },
  {
    id: "derm-tretinoin-005-20g",
    name: "Tretinoin Cream 0.05% — 20 g Tube",
    description:
      "Increases skin cell turnover, reduces fine lines and wrinkles, improves texture and tone, and helps treat acne and…",
    price: "$120",
    group: "skin",
    audience: "both",
    lab: false,
  },
  {
    id: "vit-b12-cyano-10ml",
    name: "Cyanocobalamin (Vitamin B12) — 10 mL Multi-Dose Vial",
    description:
      "Injectable B12 (cyanocobalamin). Injection supplies and cold shipping included. (Rush)",
    price: "$120",
    group: "vitamins",
    audience: "both",
    lab: false,
  },
  {
    id: "vit-b12-cyano-30ml",
    name: "Cyanocobalamin (Vitamin B12) — 30 mL Multi-Dose Vial",
    description: "Cyanocobalamin multi-dose vial.",
    price: "$160",
    group: "vitamins",
    audience: "both",
    lab: false,
  },
  {
    id: "vit-lipolean-mic-b12",
    name: "Lipolean (MIC-B12) — Methionine / Inositol / Choline Chloride / Cyanocobalamin",
    description: "Lipotropic injection. Supplies included.",
    price: "$150",
    group: "vitamins",
    audience: "both",
    lab: false,
  },
  {
    id: "vit-b12-methyl-10ml",
    name: "Methylcobalamin (Vitamin B12) — 10 mL Multi-Dose Vial",
    description: "Injectable methylated B12. Cold shipping included; supplies separate. (Olympia)",
    price: "$145",
    group: "vitamins",
    audience: "both",
    lab: false,
  },
  {
    id: "vit-omega3-rx-1000-60",
    name: "Omega-3 Acid Ethyl Esters (Prescription) 1,000 mg — 60 Capsules",
    description: "Recommended for patients with elevated triglycerides.",
    price: "$110",
    group: "vitamins",
    audience: "both",
    lab: false,
  },
  {
    id: "vit-omega3-fish-1000-60",
    name: "Omega-3 Fish Oil 1,000 mg — 60 Capsules",
    description: "Daily omega-3 support.",
    price: "$124",
    group: "vitamins",
    audience: "both",
    lab: false,
  },
  {
    id: "vit-b-complex-inj-30ml",
    name: "Vitamin B-Complex Injection — 30 mL Multi-Dose Vial",
    description: "B1/B2/B3/B5/B6 blend injection. Cold shipping included; supplies separate.",
    price: "$195",
    group: "vitamins",
    audience: "both",
    lab: false,
  },
  {
    id: "vit-d3-50k-caps",
    name: "Vitamin D3 50,000 IU — 12 Capsules",
    description: "Weekly oral vitamin D3 for up to 12 weeks. (Rush)",
    price: "$100",
    group: "vitamins",
    audience: "both",
    lab: false,
  },
  {
    id: "vit-d3-50k-inj",
    name: "Vitamin D3 Injectable 50,000 IU/mL",
    description:
      "Weekly IM vitamin D3 injection for 12 weeks. Cold shipping included; supplies separate. (Rush)",
    price: "$210",
    group: "vitamins",
    audience: "both",
    lab: false,
  },
  {
    id: "bundle-nad500-sermorelin9",
    name: "Bundle #1 — NAD+ 500 mg Lyophilized + Sermorelin 9 mg Lyophilized",
    description:
      "NAD+ 500 mg lyophilized vial and Sermorelin 9 mg lyophilized vial. Supplies not included.",
    price: "$300",
    group: "bundles",
    audience: "both",
    lab: false,
  },
  {
    id: "bundle-nad100-sermorelin09",
    name: "Bundle #2 — NAD+ 100 mg/mL 10 mL + Sermorelin 0.9 mg/mL 10 mL",
    description:
      "NAD+ 100 mg/mL 10 mL vial and pre-mixed Sermorelin 0.9 mg/mL 10 mL vial. Supplies not included.",
    price: "$325",
    group: "bundles",
    audience: "both",
    lab: false,
  },
  {
    id: "bundle-menopause-starter",
    name: "Bundle #3 — Menopause Starter Bundle",
    description:
      "Estradiol Patch 0.0375 mg/day (8 patches) and Progesterone 100 mg capsules (30-day supply).",
    price: "$260",
    group: "bundles",
    audience: "women",
    lab: false,
  },
  {
    id: "bundle-estradiol-progesterone",
    name: "Bundle #4 — Estradiol 2 mg + Progesterone 100 mg",
    description: "Estradiol 2 mg oral tablets and Progesterone 100 mg capsules, 30-day supply.",
    price: "$200",
    group: "bundles",
    audience: "women",
    lab: false,
  },
  {
    id: "bundle-mens-trt-starter",
    name: "Bundle #5 — Men's TRT Starter Bundle",
    description:
      "Testosterone Cypionate 200 mg/mL 10 mL vial and Anastrozole 0.25 mg (16 capsules, ~2-month treatment). Supplies not…",
    price: "$215",
    group: "bundles",
    audience: "men",
    lab: false,
  },
  {
    id: "bundle-testosterone-fertility",
    name: "Bundle #6 — Testosterone + Fertility Preservation Bundle",
    description:
      "Testosterone Cypionate 200 mg/mL 5 mL vial and hCG 10,000 IU lyophilized. 5–6 week treatment. Supplies not included.",
    price: "$375",
    group: "bundles",
    audience: "men",
    lab: false,
  },
  {
    id: "bundle-immune-support",
    name: "Bundle #7 — Immune Support Bundle",
    description:
      "Tri-Immune 30 mL vial and Methylcobalamin (B12) 10 mL vial. Supplies not included.",
    price: "$310",
    group: "bundles",
    audience: "both",
    lab: false,
  },
  {
    id: "bundle-womens-hrt",
    name: "Bundle #8 — Women's HRT Bundle",
    description:
      "Testosterone Troches 5 mg, Estradiol 2 mg oral tablets, and Progesterone 100 mg daily. 30-day supply.",
    price: "$207",
    group: "bundles",
    audience: "women",
    lab: false,
  },
  {
    id: "bundle-heart-health",
    name: "Bundle #9 — Heart Health Bundle",
    description: "CoQ10 200 mg and Omega-3 Fish Oil 1,000 mg. 60-day supply.",
    price: "$155",
    group: "bundles",
    audience: "both",
    lab: false,
  },
];

export const GROUP_LABEL: Record<CatalogGroup, { label: string; blurb: string }> = {
  labs: { label: "Lab panels", blurb: "Blood work that guides every protocol." },
  weight: {
    label: "Weight management",
    blurb: "GLP-1, dual-agonist and appetite support programs.",
  },
  hormones: { label: "Hormone therapy", blurb: "Clinician-managed hormone and fertility support." },
  peptides: {
    label: "Peptides & IV nutrients",
    blurb: "NAD+, sermorelin, glutathione and immune therapies.",
  },
  intimacy: {
    label: "Sexual health & intimacy",
    blurb: "Performance, libido and intimacy prescriptions.",
  },
  ed: {
    label: "Erectile dysfunction",
    blurb: "Proven PDE-5 therapies in tablets and rapid-dissolve forms.",
  },
  skin: { label: "Skin & hair", blurb: "Prescription dermatology, topicals and hair care." },
  vitamins: {
    label: "Vitamins & injectables",
    blurb: "B12, vitamin D, omega-3 and lipotropic support.",
  },
  bundles: { label: "Bundles", blurb: "Protocols packaged together at a better price." },
};

export function catalogFor(gender: "men" | "women"): CatalogProduct[] {
  return CATALOG.filter((p) => p.audience === gender || p.audience === "both");
}

/* ── Clinical requirements ──────────────────────────────
 * Mirrors the Wellness Flow rule set: every item carries an explicit
 * "labs required" and "telehealth consult required" designation.
 */

/** Groups whose therapies always need a provider televisit before dispensing. */
const TELEHEALTH_GROUPS = new Set<CatalogGroup>([
  "weight",
  "hormones",
  "ed",
  "intimacy",
  "bundles",
]);
/** Groups whose therapies always need recent blood work on file. */
const LAB_GROUPS = new Set<CatalogGroup>(["weight", "hormones", "bundles"]);

/** Per-product exceptions, keyed by catalog id prefix. */
const LAB_ID_PREFIXES = ["vit-d3", "vit-b12", "intim-testosterone"];
const TELEHEALTH_ID_PREFIXES = ["pep-sermorelin"];

function startsWithAny(id: string, prefixes: string[]) {
  return prefixes.some((prefix) => id.startsWith(prefix));
}

export function productRequiresLabs(p: CatalogSeed): boolean {
  // Lab panels are bought outright — no bloodwork prerequisite.
  if (p.group === "labs") return false;
  return LAB_GROUPS.has(p.group) || startsWithAny(p.id, LAB_ID_PREFIXES) || p.lab;
}

export function productRequiresTelehealth(p: CatalogSeed): boolean {
  if (p.group === "labs") return false;
  return TELEHEALTH_GROUPS.has(p.group) || startsWithAny(p.id, TELEHEALTH_ID_PREFIXES);
}

export const CATALOG: CatalogProduct[] = CATALOG_SEED.map((p) => ({
  ...p,
  lab: productRequiresLabs(p),
  telehealth: productRequiresTelehealth(p),
}));

/* ── Lab panel routing ──────────────────────────────────
 * Mirrors the Wellness Flow `getLabRoute` rules: a medication routes to the
 * single correct panel for the patient, so we never show unrelated panels.
 */

export type LabRoute = {
  /** Human label for the lab requirement. */
  label: string;
  /** Panel id for male patients. */
  male: string;
  /** Panel id for female patients. */
  female: string;
  /** True when the patient's sex must be known to pick the right panel. */
  sexDependent: boolean;
};

const bothSexes = (id: string) => ({ male: id, female: id });

/** Routes a medication to the correct lab panel id(s), or null when none applies. */
export function getLabRoute(
  product: Pick<CatalogProduct, "id" | "name" | "group" | "audience">,
): LabRoute | null {
  const s = product.id.toLowerCase();
  const n = product.name.toLowerCase();

  if (product.group === "labs") return null;

  // Testosterone / TRT
  if (
    s.startsWith("hrm-testosterone") ||
    s.startsWith("intim-testosterone") ||
    n.includes("testosterone")
  ) {
    if (product.audience === "men")
      return {
        label: "testosterone / hormone monitoring",
        ...bothSexes("lab-male-trt-monitoring"),
        sexDependent: false,
      };
    if (product.audience === "women")
      return {
        label: "testosterone / hormone monitoring",
        ...bothSexes("lab-womens-hrt-monitoring"),
        sexDependent: false,
      };
    return {
      label: "testosterone / hormone monitoring",
      male: "lab-male-trt-monitoring",
      female: "lab-womens-hrt-monitoring",
      sexDependent: true,
    };
  }

  // Female HRT — estrogen / progesterone / combos
  if (
    s.startsWith("hrm-estrogen") ||
    s.startsWith("hrm-estradiol") ||
    s.startsWith("hrm-progesterone") ||
    n.includes("estrogen") ||
    n.includes("estradiol") ||
    n.includes("progesterone")
  ) {
    return {
      label: "female hormone (HRT)",
      ...bothSexes("lab-female-hrt-baseline"),
      sexDependent: false,
    };
  }

  // Thyroid therapies
  if (
    s.includes("thyroid") ||
    n.includes("thyroid") ||
    n.includes("levothyroxine") ||
    n.includes("liothyronine")
  ) {
    return { label: "thyroid", ...bothSexes("lab-thyroid-comprehensive"), sexDependent: false };
  }

  // Fertility support
  if (n.includes("fertility") || n.includes("clomiphene") || n.includes("clomid")) {
    if (product.audience === "men")
      return {
        label: "hormone monitoring",
        ...bothSexes("lab-male-trt-monitoring"),
        sexDependent: false,
      };
    return {
      label: "fertility hormones",
      ...bothSexes("lab-female-fertility"),
      sexDependent: false,
    };
  }

  // GLP-1, phentermine and other weight-management therapies, plus vitamins:
  // a full metabolic baseline is what the provider reviews.
  const baseline = {
    label:
      s.startsWith("glp-") || n.includes("semaglutide") || n.includes("tirzepatide")
        ? "GLP-1"
        : s.startsWith("ctrl-phen") || n.includes("phentermine")
          ? "phentermine"
          : "baseline blood work",
    male: "lab-male-comprehensive",
    female: "lab-female-comprehensive",
    sexDependent: true,
  };

  if (product.group === "hormones" || product.group === "ed" || product.group === "intimacy") {
    return {
      label: "hormone monitoring",
      male: "lab-male-comprehensive-plus-hormones",
      female: "lab-female-comprehensive-plus-hormones",
      sexDependent: true,
    };
  }

  return baseline;
}

/** The exact panel to auto-select for this product and patient sex. */
export function panelForProduct(
  product: Pick<CatalogProduct, "id" | "name" | "group" | "audience">,
  gender?: "men" | "women" | null,
): CatalogProduct | null {
  const route = getLabRoute(product);
  if (!route) return null;
  const sex = product.audience !== "both" ? product.audience : gender;
  if (route.sexDependent && !sex) return null;
  const id = sex === "women" ? route.female : route.male;
  return CATALOG.find((p) => p.id === id) ?? null;
}
