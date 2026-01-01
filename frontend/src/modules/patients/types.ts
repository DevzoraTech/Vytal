export const PATIENT_TABS = ["Summary", "Records"] as const;
export const PATIENT_DIRECTORY_TABS = [
  "Queue",
  "In Treatment",
  "Discharged",
] as const;
export const PATIENT_SUB_PAGES = [
  "Patient Directory",
  "Patient Details",
] as const;
export const LAB_TEST_CATALOG = [
  "Complete Blood Count (CBC)",
  "Liver Function Test (LFT)",
  "Renal Function Test (RFT)",
  "HbA1c",
  "Fasting Blood Sugar",
  "Malaria Parasite Test",
  "HIV Screen",
  "Urinalysis",
  "Electrolytes",
  "Pregnancy Test",
] as const;

export interface PaginatedResponse<T> {
  results: T[];
}

export interface ClinicalNote {
  id: number;
  admission: number;
  documented_at: string;
  treatment_details: string;
  treatment_route: string;
  complaints: string;
  remarks: string;
  recorded_by_name: string;
  recorded_by_role: string;
}

export interface Admission {
  id: number;
  patient: number;
  patient_name: string;
  admission_date: string;
  discharge_date: string | null;
  provisional_diagnosis: string;
  final_diagnosis: string;
  treatment_duration: string;
  treatment_frequency: string;
  lab_tests_done: string;
  next_of_kin_name: string;
  next_of_kin_contact: string;
  allergies: string;
  contraindications: string;
  review_date: string | null;
  status: "active" | "discharged" | "closed";
  clinical_notes: ClinicalNote[];
}

export interface AppointmentEntry {
  id: string;
  admissionId: number;
  scheduled_at: string;
  provider_name: string;
  provider_role: string;
  visit_type: string;
  status: string;
  outcome: string;
  notes: string;
}

export interface TreatmentPlanEntry {
  id: string;
  admissionId: number;
  title: string;
  scheduled_for: string;
  duration: string;
  frequency: string;
  assigned_to: string;
  status: "Draft" | "Scheduled" | "Due" | "Completed";
  notes: string;
  route: string;
}

export interface MedicalRecordEntry {
  id: string;
  admissionId: number;
  type: "lab" | "treatment";
  recorded_at: string;
  recorded_by: string;
  recorded_by_role: string;
  summary: string;
  extra?: string;
}

export interface LabResultEntry {
  id: number;
  admission: number;
  patient: number;
  patient_identifier?: string;
  patient_name?: string;
  test_type: string;
  summary: string;
  recorded_at: string;
  recorded_by_name: string;
  recorded_by_role: string;
  status: string;
}

export interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  patient_identifier: string;
  age: number;
  gender: string;
  weight_kg: number | null;
  phone_number: string;
  email: string;
  address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  notes: string;
  total_admissions: number;
  latest_admission_status: string | null;
  allergy_summary: string;
  admissions: Admission[];
  next_treatment?: {
    care_plan_id: number;
    date: string;
    time: string;
    activity: string;
    status: string;
  } | null;
}

export type PatientDirectoryTab =
  (typeof PATIENT_DIRECTORY_TABS)[number];

export type PatientTab = (typeof PATIENT_TABS)[number];

export interface TreatmentFormState {
  admissionId: string;
  scheduledDate: string;
  planDetails: string;
  frequency: string;
}

export interface TreatmentNoteFormState {
  admissionId: string;
  recordedAt: string;
  nextTreatmentDate: string;
  nextTreatmentTime: string;
  systolic: string;
  diastolic: string;
  pulse: string;
  respirationRate: string;
  temperature: string;
  oxygen: string;
  complaints: string;
  summary: string;
  route: string;
  remarks: string;
}

export interface PatientFormState {
  first_name: string;
  last_name: string;
  patient_identifier: string;
  age: string;
  gender: string;
  weight_kg: string;
  phone_number: string;
  email: string;
  address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
}

export interface InitialAdmissionFormState {
  admission_date: string;
  discharge_date: string;
  review_date: string;
  provisional_diagnosis: string;
  final_diagnosis: string;
  treatment_frequency: string;
  treatment_duration: string;
  lab_tests_done: string;
  lab_tests_list: string[];
  next_of_kin_name: string;
  next_of_kin_contact: string;
  allergies: string;
  contraindications: string;
}

export type PatientFormStep = "identity" | "admission";
