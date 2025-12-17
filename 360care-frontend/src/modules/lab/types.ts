export type LabTab = "queue" | "records";

export interface LabQueueEntry {
  id: number;
  name: string;
  age: string;
  sex: string;
  arrival: string;
  date: string;
  symptoms: string;
  status: string;
}

export interface LabRecordEntry {
  id: number;
  patient_name: string;
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

export const LAB_TESTS = [
  "Blood Slide",
  "MRST",
  "CBC (Complete Blood Count)",
  "Urinalysis",
  "H. Pylori Antibody",
  "Blood Grouping (ABO + Rh)",
  "Typhoid Test",
  "HCT (Hematocrit)",
  "VDRL / RPR",
  "HCG (Urine)",
  "RBS (Random Blood Sugar)",
  "HCG (Serum)",
] as const;
