import type { Dispatch, FormEvent, SetStateAction } from "react";
import { CARD_CLASS, CARD_SECTION_CLASS } from "../../ui/styles";
import {
  PATIENT_TABS,
  type AppointmentEntry,
  type MedicalRecordEntry,
  type Patient,
  type PatientDirectoryTab,
  type PatientTab,
  type LabResultEntry,
  type TreatmentFormState,
  type TreatmentPlanEntry,
} from "./types";
import { categorizePatientStatus, getLatestAdmission } from "./utils";
import type { CarePlan } from "../consultation/types";

interface PatientDetailsProps {
  selectedPatient: Patient | null;
  loading: boolean;
  patientTab: PatientTab;
  setPatientTab: (tab: PatientTab) => void;
  setShowClinicalForm: (value: boolean) => void;
  formatDateOnly: (value: string) => string;
  formatDateTime: (value: string) => string;
  nextTreatmentPlans: TreatmentPlanEntry[];
  treatmentForm: TreatmentFormState;
  setTreatmentForm: Dispatch<SetStateAction<TreatmentFormState>>;
  treatmentMessage: string | null;
  treatmentSubmitting: boolean;
  handleNextTreatmentSubmit: (event: FormEvent<HTMLFormElement>) => void;
  appointmentStatusFilter: string;
  setAppointmentStatusFilter: (value: string) => void;
  appointmentProviderFilter: string;
  setAppointmentProviderFilter: (value: string) => void;
  appointmentOutcomeFilter: string;
  setAppointmentOutcomeFilter: (value: string) => void;
  appointmentStatusOptions: string[];
  appointmentProviderOptions: string[];
  appointmentOutcomeOptions: string[];
  filteredAppointments: AppointmentEntry[];
  medicalRecordEntries: MedicalRecordEntry[];
  labResults: LabResultEntry[];
  carePlans: CarePlan[];
}

const PatientDetails = ({
  selectedPatient,
  loading,
  patientTab,
  setPatientTab,
  setShowClinicalForm,
  formatDateOnly,
  formatDateTime,
  nextTreatmentPlans,
  treatmentForm,
  setTreatmentForm,
  treatmentMessage,
  treatmentSubmitting,
  handleNextTreatmentSubmit,
  appointmentStatusFilter,
  setAppointmentStatusFilter,
  appointmentProviderFilter,
  setAppointmentProviderFilter,
  appointmentOutcomeFilter,
  setAppointmentOutcomeFilter,
  appointmentStatusOptions,
  appointmentProviderOptions,
  appointmentOutcomeOptions,
  filteredAppointments,
  medicalRecordEntries,
  labResults,
  carePlans,
}: PatientDetailsProps) => {
  if (!selectedPatient) {
    return (
      <section className="rounded-3xl border border-dashed border-slate-200 bg-white/60 p-10 text-center text-sm text-slate-500 shadow-sm">
        {loading
          ? "Loading patients…"
          : "Select a patient from the directory to view details."}
      </section>
    );
  }
    const initials = `${selectedPatient.first_name[0] ?? ""}${
      selectedPatient.last_name[0] ?? ""
    }`;
    const patientStage = categorizePatientStatus(selectedPatient);
    const latestAdmission = getLatestAdmission(selectedPatient);
    const isDischarged = patientStage === "Discharged";
    const stageBadgeClass =
      patientStage === "Queue"
        ? "bg-yellow-50 text-yellow-700"
        : patientStage === "In Treatment"
        ? "bg-blue-50 text-blue-700"
        : "bg-gray-100 text-gray-700";
    const stageCalloutCopy: Partial<Record<PatientDirectoryTab, string>> = {
      Queue: "Lab has cleared this patient and they are waiting for clinical assessment.",
      "In Treatment": "This patient is currently under your team’s care.",
      Discharged: "Patient discharged—records are read-only for reference.",
    };
    const stageCalloutStyles: Record<PatientDirectoryTab, string> = {
      Queue: "border-blue-100 bg-blue-50 text-blue-800",
      "In Treatment": "border-emerald-100 bg-emerald-50 text-emerald-800",
      Discharged: "border-gray-200 bg-gray-50 text-gray-700",
    };
    const stageCalloutMessage = stageCalloutCopy[patientStage];

    const renderPatientInformation = () => {
      const formatValue = (
        value?: string | number | null,
        suffix = "",
        fallback = "Not recorded"
      ) => {
        if (value === null || value === undefined || value === "") {
          return fallback;
        }
        const parsed = typeof value === "number" ? value.toString() : value;
        return suffix ? `${parsed}${suffix}` : parsed;
      };
      const generalDetails = [
        {
          label: "Patient ID",
          value: formatValue(
            selectedPatient.patient_identifier,
            "",
            "Not assigned"
          ),
        },
        { label: "Age", value: formatValue(selectedPatient.age, " yrs") },
        { label: "Sex", value: formatValue(selectedPatient.gender) },
        {
          label: "Weight",
          value: formatValue(selectedPatient.weight_kg, " kg"),
        },
        {
          label: "Admissions",
          value: formatValue(selectedPatient.total_admissions, "", "0"),
        },
        {
          label: "Status",
          value: formatValue(
            selectedPatient.latest_admission_status || "Pending"
          ),
        },
      ];
      const contactDetails = [
        {
          label: "Primary Phone",
          value: formatValue(
            selectedPatient.phone_number,
            "",
            "No phone added"
          ),
        },
        {
          label: "Email",
          value: formatValue(selectedPatient.email, "", "No email added"),
        },
        {
          label: "Residential Address",
          value: formatValue(
            selectedPatient.address,
            "",
            "No address recorded"
          ),
        },
      ];
      const medicalProfile = [
        {
          label: "Allergy Summary",
          value: formatValue(
            selectedPatient.allergy_summary,
            "",
            "No allergies recorded"
          ),
        },
        {
          label: "Contraindications",
          value: formatValue(latestAdmission?.contraindications),
        },
        {
          label: "Lab Tests Completed",
          value: formatValue(
            latestAdmission?.lab_tests_done,
            "",
            "No lab tests recorded"
          ),
        },
      ];
      const latestNote =
        latestAdmission?.clinical_notes &&
        latestAdmission.clinical_notes.length > 0
          ? latestAdmission.clinical_notes[0]
          : null;
      const emergencyContact = {
        name: formatValue(
          selectedPatient.emergency_contact_name,
          "",
          "Not recorded"
        ),
        phone: formatValue(
          selectedPatient.emergency_contact_phone,
          "",
          "No phone provided"
        ),
      };
      const nextOfKin = {
        name: formatValue(
          latestAdmission?.next_of_kin_name,
          "",
          "Not recorded"
        ),
        phone: formatValue(
          latestAdmission?.next_of_kin_contact,
          "",
          "No phone provided"
        ),
      };
      const triageDetails = [
        {
          label: "Admission Date",
          value: latestAdmission?.admission_date
            ? formatDateOnly(latestAdmission.admission_date)
            : "Not recorded",
        },
        {
          label: "Allergies",
          value: formatValue(latestAdmission?.allergies, "", "None"),
        },
        {
          label: "Emergency Contact",
          value: `${formatValue(
            selectedPatient.emergency_contact_name,
            "",
            "Not recorded"
          )} · ${formatValue(
            selectedPatient.emergency_contact_phone,
            "",
            "No phone provided"
          )}`,
        },
        {
          label: "Contraindications",
          value: formatValue(latestAdmission?.contraindications),
        },
      ];
      const labEntries =
        labResults.length > 0
          ? labResults.map((result) => ({
              label: `${result.test_type} · ${formatDateTime(result.recorded_at)}`,
              value: result.summary || "Result recorded",
              meta: `${result.recorded_by_name || "Lab"} (${result.recorded_by_role || "Laboratory"})`,
            }))
          : (latestAdmission?.lab_tests_done || "")
              .split(/\n+/)
              .map((value) => value.trim())
              .filter(Boolean)
              .map((value, index) => ({
                label: `Lab ${index + 1}`,
                value,
                meta: "",
              }));
      const treatmentPlanSummary = `${formatValue(
        latestAdmission?.treatment_duration,
        "",
        "Duration not set"
      )} · ${formatValue(
        latestAdmission?.treatment_frequency,
        "",
        "Frequency not set"
      )}`;
      return (
        <section className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr),minmax(0,0.9fr)]">
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      Patient Profile
                    </p>
                    <h3 className="text-lg font-semibold text-slate-900">
                      Demographic overview
                    </h3>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                    Verified
                  </span>
                </div>
                <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {generalDetails.map((detail) => (
                    <div key={detail.label}>
                      <dt className="text-xs uppercase tracking-wide text-slate-400">
                        {detail.label}
                      </dt>
                      <dd className="mt-1 text-sm font-semibold text-slate-900">
                        {detail.value}
                      </dd>
                    </div>
                  ))}
                </dl>
                {selectedPatient.notes && (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Provider Notes
                    </p>
                    <p className="mt-1">{selectedPatient.notes}</p>
                  </div>
                )}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      Latest Admission
                    </p>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {latestAdmission
                        ? latestAdmission.provisional_diagnosis ||
                          "Diagnosis pending"
                        : "No admissions yet"}
                    </h3>
                  </div>
                  {latestAdmission && (
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        latestAdmission.status === "active"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {latestAdmission.status === "active"
                        ? "Active"
                        : latestAdmission.status.charAt(0).toUpperCase() +
                          latestAdmission.status.slice(1)}
                    </span>
                  )}
                </div>
                {latestAdmission ? (
                  <>
                    <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-slate-400">
                          Admission Date
                        </dt>
                        <dd className="mt-1 text-sm font-semibold text-slate-900">
                          {formatValue(latestAdmission.admission_date)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-slate-400">
                          Discharge Date
                        </dt>
                        <dd className="mt-1 text-sm font-semibold text-slate-900">
                          {formatValue(
                            latestAdmission.discharge_date,
                            "",
                            "Not discharged yet"
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-slate-400">
                          Final Diagnosis
                        </dt>
                        <dd className="mt-1 text-sm font-semibold text-slate-900">
                          {formatValue(latestAdmission.final_diagnosis)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-slate-400">
                          Treatment Plan
                        </dt>
                        <dd className="mt-1 text-sm font-semibold text-slate-900">
                          {treatmentPlanSummary}
                        </dd>
                      </div>
                    </dl>
                    <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-sm text-slate-600">
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Care Notes
                      </p>
                      <p className="mt-1">
                        {latestNote?.remarks ||
                          latestNote?.treatment_details ||
                          latestAdmission.lab_tests_done ||
                          "No care notes recorded."}
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="mt-4 text-sm text-slate-500">
                    This patient does not have any admissions yet. Create an
                    admission to start documenting care plans.
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Contact & Address
                </p>
                <dl className="mt-4 space-y-4 text-sm">
                  {contactDetails.map((detail) => (
                    <div key={detail.label}>
                      <dt className="text-xs uppercase tracking-wide text-slate-400">
                        {detail.label}
                      </dt>
                      <dd className="mt-1 text-base font-semibold text-slate-900">
                        {detail.value}
                      </dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      Emergency Contact
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {emergencyContact.name}
                    </p>
                    <p className="text-sm text-slate-500">
                      {emergencyContact.phone}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      Next of Kin
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {nextOfKin.name}
                    </p>
                    <p className="text-sm text-slate-500">{nextOfKin.phone}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">
                    Medical Profile
                  </p>
                  <span className="text-xs uppercase tracking-wide text-slate-400">
                    Clinical overview
                  </span>
                </div>
                <div className="mt-4 space-y-4 text-sm text-slate-600">
                  {medicalProfile.map((item) => (
                    <div key={item.label}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {item.label}
                      </p>
                      <p className="mt-1 text-sm text-slate-700">
                        {item.value}
                      </p>
                    </div>
                  ))}
                  {(latestAdmission?.treatment_duration ||
                    latestAdmission?.treatment_frequency) && (
                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Treatment Schedule
                      </p>
                      <p className="mt-1 text-sm text-slate-700">
                        {treatmentPlanSummary}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white/90 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Triage Intake · Read only
              </p>
              <dl className="mt-3 space-y-3 text-sm text-gray-700">
                {triageDetails.map((entry) => (
                  <div key={entry.label}>
                    <dt className="text-xs uppercase tracking-wide text-gray-400">
                      {entry.label}
                    </dt>
                    <dd className="mt-1 font-semibold text-gray-900">
                      {entry.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white/90 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Laboratory Summary · Read only
                </p>
                <span className="text-xs text-gray-400">
                  {labEntries.length} entries
                </span>
              </div>
              <div className="mt-3 space-y-3 text-sm text-gray-700">
                {labEntries.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No laboratory information has been recorded yet.
                  </p>
                ) : (
                  labEntries.map((entry) => (
                    <div
                      key={`${entry.label}-${entry.value}`}
                      className="rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2"
                    >
                      <p className="text-xs uppercase tracking-wide text-gray-400">
                        {entry.label}
                      </p>
                      <p className="mt-1 font-semibold text-gray-900">
                        {entry.value}
                      </p>
                      {entry.meta && (
                        <p className="text-[11px] text-gray-500">{entry.meta}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      );
    };

    const renderAppointmentHistoryTab = () => (
      <section className="space-y-6">
        <div className={`${CARD_CLASS} p-4`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">
              <span>Status</span>
              <div className="flex flex-wrap gap-2">
                {["all", ...appointmentStatusOptions].map((status) => (
                  <button
                    key={status || "empty"}
                    className={`rounded-full px-3 py-1 text-xs ${
                      appointmentStatusFilter === status
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                    onClick={() => setAppointmentStatusFilter(status)}
                    type="button"
                  >
                    {status === "all" ? "All" : status || "Unlabelled"}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3 text-sm text-[#4B5563] md:flex-row">
              <label className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-[#9CA3AF]">
                  Provider
                </span>
                <select
                  className="rounded-full border border-[#E5E7EB] px-3 py-1 text-sm"
                  value={appointmentProviderFilter}
                  onChange={(event) =>
                    setAppointmentProviderFilter(event.target.value)
                  }
                >
                  <option value="all">All</option>
                  {appointmentProviderOptions.map((provider) => (
                    <option key={provider} value={provider}>
                      {provider}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-[#9CA3AF]">
                  Outcome
                </span>
                <select
                  className="rounded-full border border-[#E5E7EB] px-3 py-1 text-sm"
                  value={appointmentOutcomeFilter}
                  onChange={(event) =>
                    setAppointmentOutcomeFilter(event.target.value)
                  }
                >
                  <option value="all">All</option>
                  {appointmentOutcomeOptions.map((outcome) => (
                    <option key={outcome} value={outcome}>
                      {outcome}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          {filteredAppointments.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#E5E7EB] bg-white p-10 text-center text-sm text-[#4B5563]">
              No appointments found for this filter set.
            </div>
          ) : (
            filteredAppointments.map((entry) => (
              <div
                key={entry.id}
                className={`${CARD_CLASS} p-4 sm:flex sm:items-center sm:justify-between`}
              >
                <div>
                  <p className="text-xs uppercase tracking-wide text-[#9CA3AF]">
                    {formatDateTime(entry.scheduled_at)}
                  </p>
                  <p className="mt-1 text-base font-semibold text-[#111827]">
                    {entry.visit_type}
                  </p>
                  <p className="text-sm text-[#4B5563]">
                    {entry.notes || "No additional notes provided."}
                  </p>
                </div>
                <div className="mt-4 flex flex-col gap-2 text-sm text-[#4B5563] sm:mt-0 sm:text-right">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold sm:justify-end">
                    <span className="rounded-full border border-[#E5E7EB] px-3 py-1 text-[#4B5563]">
                      {entry.provider_name}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 ${
                        entry.status === "Scheduled"
                          ? "bg-[#FEF3C7] text-[#B45309]"
                          : "bg-[#DCFCE7] text-[#15803D]"
                      }`}
                    >
                      {entry.status}
                    </span>
                    <span className="rounded-full bg-[#E5F5E5] px-3 py-1 text-[#008000]">
                      {entry.outcome}
                    </span>
                  </div>
                  <button className="text-xs font-semibold text-[#008000] hover:text-[#008000] hover:underline">
                    Open clinical note
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    );

    const renderNextTreatmentTab = () => (
      <section className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr),minmax(0,0.95fr)]">
          <div className="space-y-4">
            {nextTreatmentPlans.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 p-10 text-center text-sm text-slate-500">
                No upcoming treatment plans. Set a schedule using the form on
                the right.
              </div>
            ) : (
              nextTreatmentPlans.map((plan) => (
                <div
                  key={plan.id}
                  className={`${CARD_CLASS} p-5`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-[#9CA3AF]">
                        Plan
                      </p>
                      <p className="text-lg font-semibold text-[#111827]">
                        {plan.title}
                      </p>
                      <p className="text-sm text-[#4B5563]">{plan.route}</p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        plan.status === "Due"
                          ? "bg-[#FEF3C7] text-[#B45309]"
                          : plan.status === "Scheduled"
                          ? "bg-[#E5F5E5] text-[#008000]"
                          : "bg-[#E5E7EB] text-[#4B5563]"
                      }`}
                    >
                      {plan.status}
                    </span>
                  </div>
                  <dl className="mt-4 grid gap-4 text-sm text-[#4B5563] sm:grid-cols-3">
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-[#9CA3AF]">
                        Scheduled
                      </dt>
                      <dd className="font-semibold text-[#111827]">
                        {plan.scheduled_for
                          ? formatDateOnly(plan.scheduled_for)
                          : "Not scheduled"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-[#9CA3AF]">
                        Frequency
                      </dt>
                      <dd className="font-semibold text-[#111827]">
                        {plan.frequency}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-[#9CA3AF]">
                        Duration
                      </dt>
                      <dd className="font-semibold text-[#111827]">
                        {plan.duration}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-4 rounded-lg bg-[#F3F4F6] px-4 py-3 text-sm text-[#4B5563]">
                    <p className="text-xs uppercase tracking-wide text-[#9CA3AF]">
                      Notes
                    </p>
                    <p>{plan.notes}</p>
                  </div>
                  <div className="mt-3 text-xs uppercase tracking-wide text-[#9CA3AF]">
                    Assigned to{" "}
                    <span className="font-semibold text-[#4B5563]">
                      {plan.assigned_to}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
          <form
            onSubmit={handleNextTreatmentSubmit}
            className={`${CARD_CLASS} space-y-4`}
          >
            <div>
              <p className="text-sm font-semibold text-[#111827]">
                Schedule next treatment
              </p>
              <p className="text-xs text-[#4B5563]">
                Update the review date and regimen for the active admission.
              </p>
            </div>
            {treatmentMessage && (
              <div
                className={`rounded-xl px-3 py-2 text-xs ${
                  treatmentMessage.includes("Unable")
                    ? "bg-[#FEE2E2] text-[#B91C1C]"
                    : "bg-[#DCFCE7] text-[#15803D]"
                }`}
              >
                {treatmentMessage}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#4B5563]">
                Admission
              </label>
              <select
                className="w-full rounded-2xl border border-[#E5E7EB] px-3 py-2 text-sm text-[#111827]"
                value={treatmentForm.admissionId}
                onChange={(event) =>
                  setTreatmentForm((prev) => ({
                    ...prev,
                    admissionId: event.target.value,
                  }))
                }
              >
                <option value="">Select admission</option>
                {selectedPatient.admissions.map((admission) => (
                  <option key={admission.id} value={admission.id}>
                    {admission.provisional_diagnosis || "Admission"} ·{" "}
                    {formatDateOnly(admission.admission_date)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#4B5563]">
                Next review date
              </label>
              <input
                type="date"
                className="w-full rounded-2xl border border-[#E5E7EB] px-3 py-2 text-sm text-[#111827]"
                value={treatmentForm.scheduledDate}
                onChange={(event) =>
                  setTreatmentForm((prev) => ({
                    ...prev,
                    scheduledDate: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#4B5563]">
                Treatment plan
              </label>
              <textarea
                className="w-full rounded-2xl border border-[#E5E7EB] px-3 py-2 text-sm text-[#111827]"
                rows={3}
                value={treatmentForm.planDetails}
                onChange={(event) =>
                  setTreatmentForm((prev) => ({
                    ...prev,
                    planDetails: event.target.value,
                  }))
                }
                placeholder="e.g. Maintenance therapy, monitor vitals weekly"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#4B5563]">
                Frequency
              </label>
              <input
                className="w-full rounded-2xl border border-[#E5E7EB] px-3 py-2 text-sm text-[#111827]"
                value={treatmentForm.frequency}
                onChange={(event) =>
                  setTreatmentForm((prev) => ({
                    ...prev,
                    frequency: event.target.value,
                  }))
                }
                placeholder="Weekly, Twice a day…"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-full bg-[#008000] px-4 py-2 text-sm font-semibold text-white shadow-subtle disabled:opacity-60 hover:bg-[#008000]"
              disabled={treatmentSubmitting}
            >
              {treatmentSubmitting ? "Saving…" : "Update plan"}
            </button>
          </form>
        </div>
      </section>
    );

    const renderMedicalRecordsTab = () => {
      return (
        <section className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">
                Care plans
              </p>
              <span className="text-xs uppercase tracking-wide text-slate-400">
                {carePlans.length} versions
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {carePlans.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center text-sm text-slate-500">
                  No care plans have been recorded yet.
                </p>
              ) : (
                carePlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400">
                          Created {formatDateTime(plan.created_at)}
                        </p>
                        <p className="text-sm font-semibold text-slate-900">
                          Plan v{plan.version} · {plan.status}
                        </p>
                      </div>
                      <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                        {plan.assessment || "Assessment not provided"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-700">
                      {plan.note || "No additional notes."}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">
                Records timeline
              </p>
              <span className="text-xs uppercase tracking-wide text-slate-400">
                {medicalRecordEntries.length} entries
              </span>
            </div>
            <div className="mt-4 space-y-4">
              {medicalRecordEntries.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center text-sm text-slate-500">
                  No medical records have been logged for this patient yet.
                </p>
              ) : (
                medicalRecordEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400">
                          {formatDateTime(entry.recorded_at)}
                        </p>
                        <p className="text-sm font-semibold text-slate-900">
                          {entry.type === "lab" ? "Lab Result" : "Narrative Note"}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          entry.type === "lab"
                            ? "bg-sky-100 text-sky-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {entry.type === "lab" ? "Lab" : "Narrative"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-700">
                      {entry.summary || "No summary provided."}
                    </p>
                    {entry.extra && (
                      <p className="mt-1 text-xs text-slate-500">
                        {entry.extra}
                      </p>
                    )}
                    <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">
                      {entry.recorded_by} · {entry.recorded_by_role}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      );
    };

    const renderPatientTabContent = () => {
      switch (patientTab) {
        case "Summary":
          return (
            <div className="space-y-6">
              {renderPatientInformation()}
              {renderNextTreatmentTab()}
              {renderAppointmentHistoryTab()}
            </div>
          );
        case "Records":
          return renderMedicalRecordsTab();
        default:
          return null;
      }
    };



    return (
      <section className={`${CARD_SECTION_CLASS} space-y-6`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E5F5E5] text-xl font-semibold text-[#008000]">
              {initials || "PT"}
            </div>
            <div>
              <p className="text-sm text-[#4B5563]">Patient detail</p>
              <h2 className="text-2xl font-semibold text-[#111827]">
                {selectedPatient.first_name} {selectedPatient.last_name}
              </h2>
              <p className="text-sm text-[#4B5563]">
                Age {selectedPatient.age} · {selectedPatient.gender || "N/A"} ·{" "}
                {selectedPatient.phone_number || "No phone"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span
              className={`rounded-full px-4 py-2 text-xs font-semibold ${stageBadgeClass}`}
            >
              {patientStage}
            </span>
            <button className="rounded-full border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#4B5563]">
              {selectedPatient.allergy_summary || "No allergies"}
            </button>
            <button className="rounded-full border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#4B5563]">
              Admissions · {selectedPatient.total_admissions}
            </button>
            <button
              type="button"
              onClick={() => {
                setPatientTab("Records");
                setShowClinicalForm(true);
              }}
              className="rounded-full bg-[#008000] px-5 py-2 text-sm font-semibold text-white shadow-subtle hover:bg-[#008000]"
              disabled={isDischarged}
            >
              {isDischarged ? "Discharged" : "Record Treatment"}
            </button>
          </div>
        </div>
        {stageCalloutMessage && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${stageCalloutStyles[patientStage]}`}
          >
            {stageCalloutMessage}
          </div>
        )}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E7EB] pb-3 text-sm font-semibold text-[#4B5563]">
          <div className="flex flex-wrap gap-3">
            {PATIENT_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setPatientTab(tab)}
                className={`rounded-full px-4 py-1 transition-colors ${
                  patientTab === tab
                    ? "bg-[#008000] text-white shadow-subtle"
                    : "bg-[#E5E7EB] text-[#4B5563] hover:bg-[#e0e2e7]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="text-xs uppercase tracking-wide text-[#9CA3AF]">
            Latest admission · <span className="text-[#4B5563]">
              {selectedPatient.latest_admission_status ?? "Pending"}
            </span>
          </div>
        </div>
        {renderPatientTabContent()}
      </section>
    );
};

export default PatientDetails;
