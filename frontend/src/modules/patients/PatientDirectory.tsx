import {
  PATIENT_DIRECTORY_TABS,
  type Patient,
  type PatientDirectoryTab,
} from "./types";
import { categorizePatientStatus, getLatestAdmission } from "./utils";

interface PatientDirectoryProps {
  loading: boolean;
  treatmentReadyPatients: Patient[];
  selectedPatientId: number | null;
  patientDirectoryTab: PatientDirectoryTab;
  onTabChange: (tab: PatientDirectoryTab) => void;
  onSelectPatient: (patientId: number) => void;
  formatDateOnly: (value: string) => string;
  showTriageHoldMessage: boolean;
}

const emptyCopy: Record<PatientDirectoryTab, string> = {
  Queue: "No patients are waiting for treatment right now.",
  "In Treatment": "You have not started managing any patients yet.",
  Discharged: "No patients have been discharged under your care yet.",
};

const PatientDirectory = ({
  loading,
  treatmentReadyPatients,
  selectedPatientId,
  patientDirectoryTab,
  onTabChange,
  onSelectPatient,
  formatDateOnly,
  showTriageHoldMessage,
}: PatientDirectoryProps) => {
  const filteredPatients = treatmentReadyPatients.filter(
    (patient) => categorizePatientStatus(patient) === patientDirectoryTab
  );

  return (
    <section className="space-y-6 rounded-2xl border border-[#E5E7EB] bg-white/90 p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-[#111827]">Queue & treatment overview</h2>
          <p className="text-sm text-[#4B5563]">
            Review triage-cleared patients, active treatments, and discharged cases.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {filteredPatients.length} {filteredPatients.length === 1 ? "patient" : "patients"}
        </span>
      </div>

      <div className="flex flex-wrap gap-3 text-sm font-semibold text-gray-500">
        {PATIENT_DIRECTORY_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onTabChange(tab)}
            className={`rounded-full px-4 py-2 transition ${
              patientDirectoryTab === tab
                ? "bg-[#2563EB] text-white shadow-subtle"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <table className="min-w-full text-left text-sm text-[#4B5563]">
          <thead className="bg-[#F9FAFB] text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
            <tr>
              <th className="px-4 py-3">Patient ID</th>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Age</th>
              <th className="px-4 py-3">Sex</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Admission</th>
              <th className="px-4 py-3">Stage</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-[#9CA3AF]">
                  Loading patients…
                </td>
              </tr>
            ) : filteredPatients.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-[#9CA3AF]">
                  {emptyCopy[patientDirectoryTab]}
                </td>
              </tr>
            ) : (
              filteredPatients.map((patient, index) => {
                const active = patient.id === selectedPatientId;
                const latestAdmission = getLatestAdmission(patient);
                const stage = categorizePatientStatus(patient);
                return (
                  <tr
                    key={patient.id}
                    className={`border-t border-[#E5E7EB] text-sm transition ${
                      active ? "bg-[#F8FAFF] shadow-inner" : index % 2 === 0 ? "bg-white" : "bg-[#F9FAFB]"
                    } hover:bg-[#EAF2FF]`}
                  >
                    <td className="px-4 py-3 font-semibold text-[#111827]">
                      {patient.patient_identifier || "—"}
                    </td>
                    <td
                      className="cursor-pointer px-4 py-3 font-medium text-[#111827]"
                      onClick={() => onSelectPatient(patient.id)}
                    >
                      {patient.first_name} {patient.last_name}
                      <div className="text-xs text-[#6B7280]">
                        {patient.emergency_contact_name || "No emergency contact"}
                      </div>
                    </td>
                    <td className="px-4 py-3">{patient.age}</td>
                    <td className="px-4 py-3">{patient.gender || "—"}</td>
                    <td className="px-4 py-3">{patient.phone_number || "—"}</td>
                    <td className="px-4 py-3">
                      {latestAdmission?.admission_date
                        ? formatDateOnly(latestAdmission.admission_date)
                        : "Not admitted"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                          stage === "Queue"
                            ? "bg-yellow-50 text-yellow-700"
                            : stage === "In Treatment"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {stage}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showTriageHoldMessage && (
        <div className="rounded-2xl border border-[#E5E7EB] bg-white/80 px-4 py-3 text-sm text-[#4B5563]">
          All registered patients are still completing triage or lab steps. Treatment teams will see them here once both stages are done.
        </div>
      )}
    </section>
  );
};

export default PatientDirectory;
