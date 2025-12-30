import type { Admission, ClinicalNote, Patient } from "./types";

export const isLabNote = (note: ClinicalNote) =>
  note.recorded_by_role?.toLowerCase().includes("lab") ||
  note.recorded_by_role?.toLowerCase().includes("laboratory");

const hasLabClearance = (admission: Admission | null) => {
  if (!admission) {
    return false;
  }
  const notes = Array.isArray(admission.clinical_notes)
    ? admission.clinical_notes
    : [];
  return Boolean(
    (admission.lab_tests_done ?? "").trim().length > 0 ||
      notes.some(isLabNote)
  );
};

const hasTreatmentNote = (admission: Admission | null) => {
  if (!admission) {
    return false;
  }
  const notes = Array.isArray(admission.clinical_notes)
    ? admission.clinical_notes
    : [];
  return notes.some((note) => {
    const role = (note.recorded_by_role || "").toLowerCase();
    const isTriaged = role.includes("triage");
    return !isLabNote(note) && !isTriaged;
  });
};

export const patientReadyForTreatment = (patient: Patient) =>
  (Array.isArray(patient.admissions) ? patient.admissions : []).some(
    (admission) => {
      const hasLabString = (admission.lab_tests_done ?? "").trim().length > 0;
      const notes = Array.isArray(admission.clinical_notes)
        ? admission.clinical_notes
        : [];
      const hasLabNote = notes.some(isLabNote);
      return hasLabString || hasLabNote;
    }
  );

export const getLatestAdmission = (patient: Patient) => {
  const admissions = Array.isArray(patient.admissions)
    ? patient.admissions
    : [];
  if (admissions.length === 0) {
    return null;
  }
  return admissions.reduce((latest, admission) => {
    const latestTime = Date.parse(latest.admission_date);
    const currentTime = Date.parse(admission.admission_date);
    return currentTime > latestTime ? admission : latest;
  }, admissions[0]);
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
