export type LabTab = "queue" | "records" | "orders";

export interface LabQueueEntry {
  id: number;
  name: string;
  age: string;
  sex: string;
  arrival: string;
  date: string;
  symptoms: string;
  status: string;
  patient_identifier?: string | null;
}

export interface LabRecordEntry {
  id: number;
  patient_identifier?: string | null;
  patient_name: string;
  patient_age?: number | null;
  patient_gender?: string | null;
  test_type: string;
  summary: string;
  recorded_at: string;
  recorded_by_name: string;
}

export interface LabResultFormState {
  triageEntryId: number | null;
  testType: string;
  summary: string;
  results: string;
  recordedAt: string;
}

export interface LabOrder {
  id: number;
  admission: number;
  triage_entry: number | null;
  ordered_by: number | null;
  patient_id?: number | null;
  patient_name?: string | null;
  patient_identifier?: string | null;
  status: "draft" | "submitted" | "in_progress" | "completed" | "cancelled";
  priority: "routine" | "urgent";
  order_items: string[];
  clinical_question: string;
  notes_to_lab: string;
  policy_bypass: boolean;
  created_at: string;
}

export interface LabTask {
  id: number;
  admission: number;
  lab_order: number | null;
  task_type: string;
  target_role: string;
  status: string;
  message: string;
  created_at: string;
}

export const LAB_TEST_GROUPS = {
  Biochemistry: [
    "Urinalysis",
    "Liver Function",
    "Renal Function",
    "Lipid Profile",
    "Electrolytes",
    "RBS / FBS",
    "HbA1c",
    "CRP",
    "Thyroid",
    "D-dimers",
  ],
  Parasitology: [
    "Blood Slide",
    "Stool Analysis",
    "Blood Examination",
    "Thin Smear",
  ],
  Haematology: [
    "CBC",
    "ESR",
    "HCT",
    "Sickle Cells",
    "Blood Group",
  ],
  Immunology: [
    "Widal Typhoid IgG",
    "HCG Urine",
    "HCG Serum",
    "BAT",
    "H. pylori Ab",
    "H. pylori Ag",
    "PSA",
    "Fertility",
    "Candida marker",
    "RPR / VDRL",
    "Syphilis",
    "Rheumatoid Factor",
    "Hep B",
    "HBsAg",
    "HIV",
    "Herps",
    "Covid",
  ],
  Microbiology: ["Urine Culture", "Blood Culture"],
  Genetics: ["DNA Tests"],
  Respiratory: ["TB tests / Sputum"],
} as const;

export type LabTest = (typeof LAB_TEST_GROUPS)[keyof typeof LAB_TEST_GROUPS][number];

export const LAB_TESTS: LabTest[] = Object.values(LAB_TEST_GROUPS).flat();
