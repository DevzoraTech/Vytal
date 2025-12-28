import type { Admission, ClinicalNote, Patient } from "./types";

export const isLabNote = (note: ClinicalNote) =>
  note.recorded_by_role?.toLowerCase().includes("lab") ||
  note.recorded_by_role?.toLowerCase().includes("laboratory");

const hasLabClearance = (admission: Admission | null) => {
  if (!admission) {
    return false;
  }
  return Boolean(
    (admission.lab_tests_done ?? "").trim().length > 0 ||
      admission.clinical_notes.some(isLabNote)
  );
};

const hasTreatmentNote = (admission: Admission | null) => {
  if (!admission) {
    return false;
  }
  return admission.clinical_notes.some((note) => !isLabNote(note));
};

export const patientReadyForTreatment = (patient: Patient) =>
  patient.admissions.some(
    (admission) => (admission.lab_tests_done ?? "").trim().length > 0
  );

export const getLatestAdmission = (patient: Patient) => {
  if (patient.admissions.length === 0) {
    return null;
  }
  return patient.admissions.reduce((latest, admission) => {
    const latestTime = Date.parse(latest.admission_date);
    const currentTime = Date.parse(admission.admission_date);
    return currentTime > latestTime ? admission : latest;
  }, patient.admissions[0]);
};

export const categorizePatientStatus = (
  patient: Patient
): "Queue" | "In Treatment" | "Discharged" => {
  const admission = getLatestAdmission(patient);
  if (!admission) {
    return "Queue";
  }
  if (admission.status !== "active") {
    return "Discharged";
  }
  if (hasTreatmentNote(admission)) {
    return "In Treatment";
  }
  if (hasLabClearance(admission)) {
    return "Queue";
  }
  return "Queue";
};
