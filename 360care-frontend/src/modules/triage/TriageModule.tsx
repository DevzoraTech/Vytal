import { useEffect, useMemo, useState } from "react";
import type {
  TriageFormState,
  TriagePatientEntry,
  TriageTab,
} from "./types";

interface TriageModuleProps {
  activeTab: TriageTab;
  onTabChange: (tab: TriageTab) => void;
  form: TriageFormState;
  patients: TriagePatientEntry[];
  onFieldChange: (field: keyof TriageFormState, value: string) => void;
  onSave: () => void;
  onEscalate: () => void;
  onEdit: (patient: TriagePatientEntry) => void;
  errorMessage?: string | null;
  fetchError?: string | null;
}

const TriageModule = ({
  activeTab: _activeTab,
  onTabChange: _onTabChange,
  form,
  patients,
  onFieldChange,
  onSave,
  onEscalate,
  onEdit,
  errorMessage,
  fetchError,
}: TriageModuleProps) => {
  const [assessmentOpen, setAssessmentOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);

  const filteredPatients = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return patients;
    }
    return patients.filter((patient) => {
      const haystack = [
        patient.name,
        patient.symptoms,
        patient.arrival,
        patient.status,
        patient.temperature,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [patients, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / PAGE_SIZE));
  const currentPatients = filteredPatients.slice(
    (page - 1) * PAGE_SIZE,
    (page - 1) * PAGE_SIZE + PAGE_SIZE
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);
  void _onTabChange;

  return (
    <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6">
        <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 text-white shadow-lg">
          <div className="flex flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100/80">
                Triage workspace
              </p>
              <h1 className="mt-2 text-2xl font-semibold">Patient intake & assessment</h1>
              <p className="mt-2 max-w-2xl text-sm text-blue-100">
                Capture incoming patient information, stabilise, and forward to clinicians or lab without losing context.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-xl bg-white/10 px-4 py-3 text-left">
                <p className="text-xs uppercase tracking-wide text-blue-100/70">In triage</p>
                <p className="text-2xl font-semibold leading-tight">{patients.length}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="hidden" />
        <>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setAssessmentOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              <span className="text-base leading-none">+</span>
              New assessment
            </button>
            <button
              type="button"
              onClick={() => setAssessmentOpen(true)}
              className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Continue draft
            </button>
          </div>

          <div className="relative">
            <div
              className={`fixed inset-0 z-40 bg-slate-900/40 transition-opacity duration-300 ${
                assessmentOpen ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
              onClick={() => setAssessmentOpen(false)}
            />

            <section
              className={`fixed right-0 top-0 z-50 h-full w-full max-w-full overflow-hidden border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 sm:w-[520px] ${
                assessmentOpen ? "translate-x-0" : "translate-x-full"
              }`}
            >
              <div className="flex h-full flex-col">
                <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Assessment form
                    </p>
                    <h3 className="text-lg font-semibold text-slate-900">
                      Administrative, demographic, and clinical intake
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAssessmentOpen(false)}
                    className="rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Close
                  </button>
                </header>

                <div className="flex-1 overflow-y-auto px-6 py-4">
                  <div className="space-y-6">
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="mb-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Administrative &amp; Demographics
                        </p>
                        <div className="mt-1 flex items-center justify-between">
                          <div className="text-lg font-semibold text-slate-900">
                            Intake details
                          </div>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                            Required to proceed
                          </span>
                        </div>
                      </div>
                      {errorMessage && (
                        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                          {errorMessage}
                        </div>
                      )}
                      {fetchError && (
                        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 shadow-inner">
                          {fetchError}
                        </div>
                      )}
                      <div className="grid grid-cols-1 gap-4 text-sm">
                        <div className="flex flex-col">
                          <label className="mb-1 text-gray-600">Full Name</label>
                          <input
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
                            value={form.fullName}
                            onChange={(event) =>
                              onFieldChange("fullName", event.target.value)
                            }
                            placeholder="Enter patient's full name"
                          />
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                          <div className="flex flex-col">
                            <label className="mb-1 text-gray-600">Age</label>
                            <input
                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 md:w-24"
                              value={form.age}
                              onChange={(event) =>
                                onFieldChange("age", event.target.value)
                              }
                              placeholder="e.g. 36"
                            />
                          </div>
                          <div className="flex flex-col">
                            <label className="mb-1 text-gray-600">Sex</label>
                            <select
                              className="rounded-lg border border-gray-300 bg-white px-3 py-2"
                              value={form.sex}
                              onChange={(event) =>
                                onFieldChange("sex", event.target.value)
                              }
                            >
                              <option>Female</option>
                              <option>Male</option>
                              <option>Other</option>
                            </select>
                          </div>
                          <div className="flex flex-col">
                            <label className="mb-1 text-gray-600">
                              Method of Arrival
                            </label>
                            <select
                              className="rounded-lg border border-gray-300 bg-white px-3 py-2"
                              value={form.arrival}
                              onChange={(event) =>
                                onFieldChange("arrival", event.target.value)
                              }
                            >
                              <option>Walk-in</option>
                              <option>Ambulance</option>
                              <option>Police</option>
                              <option>Referred</option>
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="flex flex-col">
                            <label className="mb-1 text-gray-600">Phone Number</label>
                            <input
                              className="rounded-lg border border-gray-300 bg-white px-3 py-2"
                              type="tel"
                              placeholder="0752123123"
                              value={form.phone}
                              onChange={(event) =>
                                onFieldChange("phone", event.target.value)
                              }
                            />
                          </div>
                          <div className="flex flex-col">
                            <label className="mb-1 text-gray-600">Email</label>
                            <input
                              className="rounded-lg border border-gray-300 bg-white px-3 py-2"
                              value={form.email}
                              onChange={(event) =>
                                onFieldChange("email", event.target.value)
                              }
                              placeholder="name@example.com"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="flex flex-col">
                            <label className="mb-1 text-gray-600">Address</label>
                            <textarea
                              className="rounded-lg border border-gray-300 bg-white px-3 py-2"
                              rows={2}
                              value={form.address}
                              onChange={(event) =>
                                onFieldChange("address", event.target.value)
                              }
                              placeholder="Street, city, district"
                            />
                          </div>
                          <div className="flex flex-col">
                            <label className="mb-1 text-gray-600">
                              Admission Date
                            </label>
                            <input
                              type="date"
                              className="rounded-lg border border-gray-300 bg-white px-3 py-2"
                              value={form.admissionDate}
                              onChange={(event) =>
                                onFieldChange("admissionDate", event.target.value)
                              }
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="flex flex-col">
                            <label className="mb-1 text-gray-600">
                              Emergency Contact Name
                            </label>
                            <input
                              className="rounded-lg border border-gray-300 bg-white px-3 py-2"
                              value={form.contactName}
                              onChange={(event) =>
                                onFieldChange("contactName", event.target.value)
                              }
                              placeholder="Person to reach out to"
                            />
                          </div>
                          <div className="flex flex-col">
                            <label className="mb-1 text-gray-600">
                              Emergency Contact Phone
                            </label>
                            <input
                              className="rounded-lg border border-gray-300 bg-white px-3 py-2"
                              type="tel"
                              placeholder="0752123123"
                              value={form.contactPhone}
                              onChange={(event) =>
                                onFieldChange("contactPhone", event.target.value)
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="mb-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Clinical presentation
                        </p>
                        <div className="mt-1 text-lg font-semibold text-slate-900">
                          Symptoms & vitals
                        </div>
                        <p className="text-sm text-slate-500">
                          Capture primary complaints and initial measurements before escalation.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 gap-4 text-sm">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col">
                            <label className="mb-1 text-gray-600">
                              Temperature
                            </label>
                            <input
                              className="rounded-lg border border-gray-300 bg-white px-3 py-2"
                              value={form.temperature}
                              onChange={(event) =>
                                onFieldChange("temperature", event.target.value)
                              }
                              placeholder="e.g. 38.5"
                            />
                          </div>
                          <div className="flex flex-col">
                            <label className="mb-1 text-gray-600">Weight</label>
                            <input
                              className="rounded-lg border border-gray-300 bg-white px-3 py-2"
                              value={form.weight}
                              onChange={(event) =>
                                onFieldChange("weight", event.target.value)
                              }
                              placeholder="e.g. 74 kg"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col">
                            <label className="mb-1 text-gray-600">Symptoms</label>
                            <textarea
                              className="rounded-lg border border-gray-300 bg-white px-3 py-2"
                              rows={3}
                              value={form.symptoms}
                              onChange={(event) =>
                                onFieldChange("symptoms", event.target.value)
                              }
                              placeholder="Presenting complaints, duration, severity"
                            />
                          </div>
                          <div className="flex flex-col">
                            <label className="mb-1 text-gray-600">Allergies</label>
                            <textarea
                              className="rounded-lg border border-gray-300 bg-white px-3 py-2"
                              rows={3}
                              value={form.allergies}
                              onChange={(event) =>
                                onFieldChange("allergies", event.target.value)
                              }
                              placeholder="Known allergies or contraindications"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <footer className="border-t border-slate-100 px-6 py-4">
                  <div className="flex flex-wrap items-center justify-end gap-3">
                    <button
                      onClick={onSave}
                      className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                    >
                      Save Assessment
                    </button>
                    <button
                      onClick={onEscalate}
                      className="rounded-full border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Escalate to Clinician
                    </button>
                  </div>
                </footer>
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-gray-200 bg-white/90 p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Triage queue
                </p>
                <h2 className="text-lg font-semibold text-gray-900">
                  Patients in Triage
                </h2>
                <p className="text-sm text-gray-500">
                  Quickly scan intake status, vitals, and arrival notes.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <input
                    value={searchTerm}
                    onChange={(event) => {
                      setPage(1);
                      setSearchTerm(event.target.value);
                    }}
                    placeholder="Search triage records..."
                    className="w-64 rounded-full border border-slate-200 bg-white px-3 py-2 pl-9 text-sm shadow-inner focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <circle cx="9" cy="9" r="5" />
                      <path d="M13.5 13.5 17 17" />
                    </svg>
                  </span>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {filteredPatients.length}{" "}
                  {filteredPatients.length === 1 ? "entry" : "entries"}
                  {filteredPatients.length !== patients.length
                    ? ` of ${patients.length}`
                    : ""}
                </span>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="min-w-full text-sm text-gray-700">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Patient</th>
                    <th className="px-4 py-3 font-semibold">Demographics</th>
                    <th className="px-4 py-3 font-semibold">Arrival</th>
                    <th className="px-4 py-3 font-semibold">Temperature</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPatients.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                        {patients.length === 0
                          ? "No patients recorded yet."
                          : "No patients match your search."}
                      </td>
                    </tr>
                  ) : (
                    currentPatients.map((patient, index) => {
                      const isEven = index % 2 === 0;
                      const statusColor =
                        patient.status === "lab_done"
                          ? "bg-indigo-50 text-indigo-700"
                          : patient.status === "treatment"
                          ? "bg-emerald-50 text-emerald-700"
                          : patient.status === "discharged"
                          ? "bg-gray-100 text-gray-700"
                          : "bg-blue-50 text-blue-700";
                      return (
                        <tr
                          key={patient.id}
                          className={`transition ${isEven ? "bg-white" : "bg-slate-50/50"} hover:bg-blue-50/60`}
                        >
                          <td className="px-4 py-3">
                            <div className="font-semibold text-gray-900">
                              {patient.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {patient.symptoms || "No symptoms provided"}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {patient.age} yrs / {patient.sex || "N/A"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-800">{patient.arrival}</div>
                            <div className="text-xs text-gray-500">{patient.date}</div>
                          </td>
                          <td className="px-4 py-3">{patient.temperature || "N/A"}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusColor}`}>
                              {patient.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => {
                                onEdit(patient);
                                setAssessmentOpen(true);
                              }}
                              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {filteredPatients.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
                <div>
                  Showing{" "}
                  <span className="font-semibold">
                    {(page - 1) * PAGE_SIZE + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-semibold">
                    {Math.min(page * PAGE_SIZE, filteredPatients.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold">{filteredPatients.length}</span> entries
                  {filteredPatients.length !== patients.length
                    ? ` (filtered from ${patients.length})`
                    : ""}
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    className="rounded-full px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={page === 1}
                  >
                    Previous
                  </button>
                  <span className="text-xs font-semibold text-slate-700">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    className="rounded-full px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={page === totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </section>
        </>
      </div>
    </main>
  );
};

export default TriageModule;
