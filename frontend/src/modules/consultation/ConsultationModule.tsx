import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type CarePlan,
  type ConsultationEvent,
  type ConsultationFilter,
  type ConsultationTask,
  type LabResult,
  type WorklistEntry,
} from "./types";

interface ConsultationModuleProps {
  apiBaseUrl: string;
  token: string | null;
}

interface LabOrderFormState {
  priority: "routine" | "urgent";
  orderItemsText: string;
  clinicalQuestion: string;
  notesToLab: string;
  policyBypass: boolean;
}

interface ClinicalNote {
  id: number;
  documented_at: string | null;
  created_at?: string | null;
  treatment_details?: string | null;
  assessment?: string | null;
  note?: string | null;
  treatment_route?: string | null;
  complaints?: string | null;
  next_review_date?: string | null;
  next_treatment_date?: string | null;
  next_treatment_time?: string | null;
  systolic_bp?: number | null;
  diastolic_bp?: number | null;
  pulse?: number | null;
  respiration_rate?: number | null;
  temperature_c?: number | null;
  oxygen_saturation?: number | null;
  remarks?: string | null;
  recorded_by_name?: string | null;
  recorded_by_role?: string | null;
}

const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString() : "—";

const formatPatientIdentifier = (patientId?: number | null) => {
  if (!patientId || Number.isNaN(patientId)) return "PMA0000";
  return `PMA${String(patientId).padStart(4, "0")}`;
};

const formatOrNone = (value?: string | number | null) => {
  if (value === null || value === undefined) return "None";
  if (typeof value === "string" && value.trim() === "") return "None";
  return value as string | number;
};

const badgeClass = (status: string) => {
  switch (status) {
    case "awaiting_consult":
      return "bg-amber-100 text-amber-700";
    case "results_available":
      return "bg-indigo-100 text-indigo-700";
    case "plan_pending":
      return "bg-blue-100 text-blue-700";
    case "plan_finalized":
      return "bg-emerald-100 text-emerald-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
};

const exportToCsv = (filename: string, rows: Record<string, unknown>[]) => {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((key) => {
          const cell = row[key];
          const value =
            cell === null || cell === undefined ? "" : String(cell).replace(/"/g, '""');
          return `"${value}"`;
        })
        .join(",")
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const buildCarePlanRows = (plan: CarePlan): { label: string; value: string }[] => {
  const items = plan.plan_items || {};
  return Object.entries(items).map(([label, value]) => ({
    label,
    value:
      Array.isArray(value) ? value.join(", ") : value !== undefined ? String(value) : "None",
  }));
};

const ConsultationModule = ({ apiBaseUrl, token }: ConsultationModuleProps) => {
  const [filter, setFilter] = useState<ConsultationFilter>("awaiting_consult");
  const [loading, setLoading] = useState(false);
  const [worklistError, setWorklistError] = useState<string | null>(null);
  const [worklist, setWorklist] = useState<WorklistEntry[]>([]);
  const [selected, setSelected] = useState<WorklistEntry | null>(null);

  const [detailLoading, setDetailLoading] = useState(false);
  const [results, setResults] = useState<LabResult[]>([]);
  const [plans, setPlans] = useState<CarePlan[]>([]);
  const [clinicalNotes, setClinicalNotes] = useState<ClinicalNote[]>([]);
  const [tasks, setTasks] = useState<ConsultationTask[]>([]);
  const [events, setEvents] = useState<ConsultationEvent[]>([]);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [labOrderForm, setLabOrderForm] = useState<LabOrderFormState>({
    priority: "routine",
    orderItemsText: "",
    clinicalQuestion: "",
    notesToLab: "",
    policyBypass: false,
  });
  const [savingOrder, setSavingOrder] = useState(false);
  const [showPlanHistory, setShowPlanHistory] = useState(false);
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const [exportOpen, setExportOpen] = useState(false);
  const handleExportWorklist = () => {
    if (!worklist.length) return;
    const rows = worklist.map((entry) => ({
      admission_id: entry.admission_id,
      patient: entry.patient_name,
      patient_id: entry.patient_id,
      age: entry.age,
      gender: entry.gender,
      status: entry.status,
      latest_lab_result_at: entry.latest_lab_result_at || "",
      latest_care_plan_version: entry.latest_care_plan_version ?? "",
      latest_care_plan_status: entry.latest_care_plan_status ?? "",
      last_activity_at: entry.last_activity_at,
    }));
    exportToCsv("consultation_worklist.csv", rows);
    setExportOpen(false);
  };

  const authHeaders = useMemo<Record<string, string>>(() => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) {
      headers.Authorization = `Token ${token}`;
    }
    return headers;
  }, [token]);

  const fetchJson = useCallback(
    async (url: string, init?: RequestInit) => {
      const response = await fetch(url, {
        ...init,
        headers: { ...authHeaders, ...(init?.headers || {}) },
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || response.statusText);
      }
      return response.json();
    },
    [authHeaders]
  );

  const loadWorklist = useCallback(async () => {
    if (!token) {
      return;
    }
    setLoading(true);
    setWorklistError(null);
    try {
      const data: WorklistEntry[] = await fetchJson(
        `${apiBaseUrl}/consultation/worklist/?filter=${filter}`
      );
      setWorklist(data);
      setPage(1);
      setSelected((prev) =>
        prev && data.some((entry) => entry.admission_id === prev.admission_id)
          ? prev
          : null
      );
    } catch (error) {
      setWorklistError(
        error instanceof Error ? error.message : "Failed to load worklist."
      );
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, fetchJson, filter, token]);

  const loadDetails = useCallback(
    async (entry: WorklistEntry) => {
      if (!token) {
        return;
      }
      setDetailLoading(true);
      setDetailError(null);
      try {
        const [_ordersResp, plansResp, tasksResp, eventsResp, resultsResp, notesResp] =
          await Promise.all([
            fetchJson(
              `${apiBaseUrl}/consultation/lab-orders/?admission=${entry.admission_id}`
            ),
            fetchJson(
              `${apiBaseUrl}/consultation/care-plans/?admission=${entry.admission_id}`
            ),
            fetchJson(
              `${apiBaseUrl}/consultation/tasks/?admission=${entry.admission_id}&status=open`
            ),
            fetchJson(
              `${apiBaseUrl}/consultation/events/?admission=${entry.admission_id}`
            ),
            fetchJson(`${apiBaseUrl}/lab-results/?admission=${entry.admission_id}`),
            fetchJson(`${apiBaseUrl}/clinical-notes/?admission=${entry.admission_id}`),
          ]);
        const normalize = (resp: unknown) =>
          Array.isArray(resp)
            ? resp
            : (resp as { results?: unknown[] })?.results || [];
        const plansList = normalize(plansResp) as CarePlan[];
        const tasksList = normalize(tasksResp) as ConsultationTask[];
        const eventsList = normalize(eventsResp) as ConsultationEvent[];
        const resultsList = normalize(resultsResp) as LabResult[];
        const notesList = normalize(notesResp) as ClinicalNote[];
        const clinicianNotes = notesList.filter((note) => {
          const role = (note.recorded_by_role || "").toLowerCase();
          if (role.includes("lab")) return false;
          if (role.includes("triage")) return false;
          return true;
        });
        setPlans(plansList);
        setTasks(tasksList);
        setEvents(eventsList);
        setResults(resultsList);
        setClinicalNotes(
          clinicianNotes
            .map((note) => ({
              ...note,
              documented_at: note.documented_at || note.created_at || null,
            }))
            .sort(
              (a, b) =>
                Date.parse(b.documented_at ?? "") - Date.parse(a.documented_at ?? "")
            )
        );
      } catch (error) {
        setDetailError(
          error instanceof Error ? error.message : "Failed to load encounter."
        );
      } finally {
        setDetailLoading(false);
      }
    },
    [apiBaseUrl, fetchJson, token]
  );

  useEffect(() => {
    void loadWorklist();
  }, [loadWorklist]);

  useEffect(() => {
    // Clear selection when switching filters/tabs to avoid auto-opening drawer
    setSelected(null);
  }, [filter]);

  useEffect(() => {
    if (selected && !worklist.find((w) => w.admission_id === selected.admission_id)) {
      setSelected(null);
    }
  }, [worklist, selected]);

  useEffect(() => {
    if (selected) {
      void loadDetails(selected);
    }
  }, [loadDetails, selected]);

  const handleCreateLabOrder = async () => {
    if (!selected) return;
    setSavingOrder(true);
    setDetailError(null);
    const payload = {
      admission: selected.admission_id,
      priority: labOrderForm.priority,
      order_items: labOrderForm.orderItemsText
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      clinical_question: labOrderForm.clinicalQuestion,
      notes_to_lab: labOrderForm.notesToLab,
      policy_bypass: labOrderForm.policyBypass,
      status: "submitted",
    };
    try {
      await fetchJson(`${apiBaseUrl}/consultation/lab-orders/`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setLabOrderForm((prev) => ({ ...prev, orderItemsText: "", clinicalQuestion: "", notesToLab: "" }));
      await Promise.all([loadDetails(selected), loadWorklist()]);
    } catch (error) {
      setDetailError(
        error instanceof Error ? error.message : "Unable to create lab order."
      );
    } finally {
      setSavingOrder(false);
    }
  };

  const handleAcknowledgeTask = async (taskId: number) => {
    try {
      await fetchJson(`${apiBaseUrl}/consultation/tasks/${taskId}/acknowledge/`, {
        method: "POST",
      });
      if (selected) {
        await loadDetails(selected);
      }
    } catch (error) {
      setDetailError(
        error instanceof Error ? error.message : "Failed to acknowledge task."
      );
    }
  };

  const latestPlan = plans.length > 0 ? plans[0] : null;
  const latestResult = results.length > 0 ? results[0] : null;

  const renderDetailDrawer = () => {
    if (!selected) return null;
    const current = selected;
    const plan = latestPlan;
    const result = latestResult;
    return (
      <>
        <div
          className="fixed inset-0 z-30 bg-black/10"
          onClick={() => setSelected(null)}
          role="presentation"
        />
        <aside className="fixed inset-y-0 right-0 z-40 w-full max-w-5xl overflow-y-auto border-l border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Records</p>
              <h3 className="text-lg font-semibold text-slate-900">
                {current.patient_name} ({formatPatientIdentifier(current.patient_id)})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 p-6 lg:grid-cols-[2fr,1fr]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-slate-900">Encounter snapshot</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass(
                        current.status
                      )}`}
                    >
                      {current.status.replace("_", " ")}
                    </span>
                    {plan && (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        Plan v{plan.version} ({plan.status})
                      </span>
                    )}
                    {result && (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        Result {formatDateTime(result.recorded_at)}
                      </span>
                    )}
                  </div>
                </div>
                {detailError && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    {detailError}
                  </div>
                )}
                {detailLoading ? (
                  <div className="mt-4 text-sm text-slate-600">Loading encounter…</div>
                ) : (
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div className="space-y-3">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          Tasks
                        </p>
                        {tasks.length === 0 ? (
                          <p className="text-xs text-slate-500">No open tasks.</p>
                        ) : (
                          <ul className="mt-2 space-y-2 text-xs text-slate-700">
                            {tasks.map((task) => (
                              <li
                                key={task.id}
                                className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-3 py-2"
                              >
                                <div>
                                  <div className="font-semibold capitalize">
                                    {task.task_type.replace("_", " ")}
                                  </div>
                                  <div className="text-slate-500">
                                    {task.message || "No message"}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleAcknowledgeTask(task.id)}
                                  className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                  Acknowledge
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          Latest lab result
                        </p>
                        {latestResult ? (
                          <div className="mt-2 text-sm text-slate-700">
                            <div className="font-semibold">{latestResult.test_type}</div>
                            <div className="text-xs text-slate-500">
                              {formatDateTime(latestResult.recorded_at)}
                            </div>
                            <p className="mt-1 text-slate-600">{latestResult.summary}</p>
                          </div>
                        ) : (
                          <p className="mt-2 text-sm text-slate-500">No lab results yet.</p>
                        )}
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          Care plan
                        </p>
                        {latestPlan ? (
                          <div className="mt-2 space-y-1 text-sm text-slate-700">
                            <div className="font-semibold">v{latestPlan.version}</div>
                            <div className="text-xs text-slate-500">
                              {latestPlan.status} · {formatDateTime(latestPlan.created_at)}
                            </div>
                            <div className="text-slate-600">
                              {buildCarePlanRows(latestPlan).map((row) => (
                                <div key={row.label} className="text-xs">
                                  <span className="font-semibold">{row.label}: </span>
                                  <span>{row.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="mt-2 text-sm text-slate-500">
                            No care plan documented yet.
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          Treatment records
                        </p>
                        {clinicalNotes.length === 0 ? (
                          <p className="mt-3 text-sm text-slate-500">
                            No documented treatment records yet.
                          </p>
                        ) : (
                          <>
                            {(() => {
                              const latestNote = clinicalNotes[0];
                              return (
                                <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                                  <div className="grid grid-cols-3 gap-3 text-[12px] text-slate-700">
                                    <div>
                                      <p className="text-[11px] uppercase tracking-wide text-slate-400">
                                        Treatment
                                      </p>
                                      <p className="font-semibold text-slate-900">
                                        {formatOrNone(
                                          latestNote.treatment_details ||
                                            latestNote.assessment ||
                                            latestNote.note
                                        )}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-[11px] uppercase tracking-wide text-slate-400">
                                        Route
                                      </p>
                                      <p>{formatOrNone(latestNote.treatment_route)}</p>
                                    </div>
                                    <div>
                                      <p className="text-[11px] uppercase tracking-wide text-slate-400">
                                        Complaints
                                      </p>
                                      <p>{formatOrNone(latestNote.complaints)}</p>
                                    </div>
                                    <div>
                                      <p className="text-[11px] uppercase tracking-wide text-slate-400">
                                        Next review
                                      </p>
                                      <p>
                                        {formatOrNone(
                                          `${latestNote.next_review_date || latestNote.next_treatment_date || "None"}${
                                            latestNote.next_treatment_time
                                              ? ` ${latestNote.next_treatment_time}`
                                              : ""
                                          }`
                                        )}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-[11px] uppercase tracking-wide text-slate-400">
                                        BP (mmHg)
                                      </p>
                                      <p>
                                        {latestNote.systolic_bp || latestNote.diastolic_bp
                                          ? `${formatOrNone(latestNote.systolic_bp)}/${formatOrNone(
                                              latestNote.diastolic_bp
                                            )}`
                                          : "None"}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-[11px] uppercase tracking-wide text-slate-400">
                                        Pulse (bpm)
                                      </p>
                                      <p>{formatOrNone(latestNote.pulse)}</p>
                                    </div>
                                    <div>
                                      <p className="text-[11px] uppercase tracking-wide text-slate-400">
                                        Resp. (cpm)
                                      </p>
                                      <p>{formatOrNone(latestNote.respiration_rate)}</p>
                                    </div>
                                    <div>
                                      <p className="text-[11px] uppercase tracking-wide text-slate-400">
                                        Temp (°C)
                                      </p>
                                      <p>{formatOrNone(latestNote.temperature_c)}</p>
                                    </div>
                                    <div>
                                      <p className="text-[11px] uppercase tracking-wide text-slate-400">
                                        SpO₂ (%)
                                      </p>
                                      <p>{formatOrNone(latestNote.oxygen_saturation)}</p>
                                    </div>
                                    <div className="col-span-3">
                                      <p className="text-[11px] uppercase tracking-wide text-slate-400">
                                        Remarks
                                      </p>
                                      <p>{formatOrNone(latestNote.remarks)}</p>
                                    </div>
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    Recorded by: {latestNote.recorded_by_name || "None"}(
                                    {latestNote.recorded_by_role || "None"}) ·
                                    {latestNote.documented_at
                                      ? formatDateTime(latestNote.documented_at)
                                      : latestNote.created_at
                                      ? formatDateTime(latestNote.created_at)
                                      : "None"}
                                  </div>
                                </div>
                              );
                            })()}
                            {clinicalNotes.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setShowPlanHistory(true)}
                                className="mt-3 w-full rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                View all treatment records
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Timeline
                    </p>
                    <h3 className="text-lg font-semibold text-slate-900">Recent activity</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => selected && loadDetails(selected)}
                    className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Refresh
                  </button>
                </div>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {events.length === 0 ? (
                    <li className="text-slate-500">No events yet.</li>
                  ) : (
                    events.slice(0, 8).map((event) => (
                      <li
                        key={event.id}
                        className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-semibold">{event.event_type.replace("_", " ")}</div>
                          <span className="text-xs text-slate-500">
                            {formatDateTime(event.occurred_at)}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          {event.actor_name || "System"} · {event.actor_role || "—"}
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-slate-900">
                      Add lab order
                    </h3>
                  </div>
                  <span className="text-xs text-slate-500">
                    {current.patient_name}
                  </span>
                </div>
                <div className="space-y-3 text-sm">
                  <div>
                    <label className="text-xs font-semibold text-slate-600">
                      Order items (comma separated)
                    </label>
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                      value={labOrderForm.orderItemsText}
                      onChange={(event) =>
                        setLabOrderForm((prev) => ({
                          ...prev,
                          orderItemsText: event.target.value,
                        }))
                      }
                      placeholder="CBC, LFT, Malaria RDT ..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600">
                        Priority
                      </label>
                      <select
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                        value={labOrderForm.priority}
                        onChange={(event) =>
                          setLabOrderForm((prev) => ({
                            ...prev,
                            priority: event.target.value as LabOrderFormState["priority"],
                          }))
                        }
                      >
                        <option value="routine">Routine</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">
                      Notes to lab
                    </label>
                    <textarea
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                      rows={2}
                      value={labOrderForm.notesToLab}
                      onChange={(event) =>
                        setLabOrderForm((prev) => ({
                          ...prev,
                          notesToLab: event.target.value,
                        }))
                      }
                      placeholder="Add a note for the lab attendant..."
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateLabOrder}
                    disabled={savingOrder}
                    className="w-full rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {savingOrder ? "Saving..." : "Submit lab order"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </>
    );
  };
  if (!token) {
    return (
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600 shadow-sm">
          Please log in to access the Consultation workspace.
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6">
        <header className="flex flex-col gap-3 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 px-6 py-6 text-white shadow-lg sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="mt-1 text-2xl font-semibold">Consultation worklists</h1>
            <p className="mt-2 max-w-3xl text-sm text-blue-100/90">
              Triage-complete encounters, lab results, and care plans.
            </p>
          </div>
        </header>

        <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {(["awaiting_consult", "results_to_review", "active"] as ConsultationFilter[]).map(
                (item) => (
                  <button
                    key={item}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${
                      filter === item
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                    onClick={() => setFilter(item)}
                    disabled={loading}
                  >
                    {item === "awaiting_consult" && "Awaiting Consultation"}
                    {item === "results_to_review" && "Lab Results to Review"}
                    {item === "active" && "Active"}
                  </button>
                )
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setExportOpen((prev) => !prev)}
                  className="flex items-center gap-1 rounded-full border border-slate-200 px-3 py-2 font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                  disabled={loading}
                >
                  Export <span className="text-[10px]">▾</span>
                </button>
                {exportOpen && (
                  <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                    <button
                      type="button"
                      onClick={handleExportWorklist}
                      className="block w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      disabled={loading}
                    >
                      Export to CSV
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={loadWorklist}
                className="rounded-full border border-slate-200 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                disabled={loading}
              >
                Refresh
              </button>
            </div>
          </div>

          {worklistError && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {worklistError}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="pb-3 pr-3 font-semibold">Patient</th>
                  <th className="pb-3 pr-3 font-semibold">Status</th>
                  <th className="pb-3 pr-3 font-semibold">Latest Result</th>
                  <th className="pb-3 pr-3 font-semibold">Plan</th>
                  <th className="pb-3 pr-3 font-semibold">Last Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-sm">
                      Loading worklist…
                    </td>
                  </tr>
                ) : worklist.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-sm">
                      No encounters in this view.
                    </td>
                  </tr>
                ) : (
                  worklist
                    .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
                    .map((entry) => {
                      const isActive = selected?.admission_id === entry.admission_id;
                      return (
                        <tr
                          key={entry.admission_id}
                          className={`cursor-pointer transition ${
                            isActive ? "bg-slate-50" : "hover:bg-slate-50"
                          }`}
                          onClick={() => setSelected(entry)}
                        >
                          <td className="py-3 pr-3">
                            <div className="font-semibold">{entry.patient_name}</div>
                            <div className="text-xs text-slate-500">
                              {entry.age} yrs · {entry.gender || "—"}
                            </div>
                          </td>
                          <td className="py-3 pr-3">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass(
                                entry.status
                              )}`}
                            >
                              {entry.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="py-3 pr-3 text-sm text-slate-600">
                            {formatDateTime(entry.latest_lab_result_at)}
                          </td>
                          <td className="py-3 pr-3 text-sm text-slate-600">
                            {entry.latest_care_plan_version
                              ? `v${entry.latest_care_plan_version} · ${entry.latest_care_plan_status}`
                              : "—"}
                          </td>
                          <td className="py-3 pr-3 text-sm text-slate-600">
                            {formatDateTime(entry.last_activity_at)}
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
          {!loading && worklist.length > 0 && (
            <div className="flex items-center justify-between pt-3 text-sm text-slate-600">
              <div>
                Page {page} of {Math.max(1, Math.ceil(worklist.length / PAGE_SIZE))}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 disabled:opacity-50"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPage((prev) =>
                      prev < Math.ceil(worklist.length / PAGE_SIZE) ? prev + 1 : prev
                    )
                  }
                  disabled={page >= Math.ceil(worklist.length / PAGE_SIZE)}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>

        {showPlanHistory && (
          <div className="fixed inset-0 z-[120] flex items-start justify-end bg-black/40">
            <div className="h-full w-full max-w-2xl overflow-y-auto border-l border-slate-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)] z-[130]">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Treatment records
                  </p>
                  <h3 className="text-lg font-semibold text-slate-900">Full history</h3>
                </div>
                <button
                  type="button"
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  onClick={() => setShowPlanHistory(false)}
                >
                  Close
                </button>
              </div>
              <div className="space-y-3 p-6">
                {clinicalNotes.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-4 text-sm text-slate-500">
                    No documented treatment records yet.
                  </p>
                ) : (
                  clinicalNotes.map((note) => (
                    <div
                      key={note.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="grid grid-cols-3 gap-3 text-[12px] text-slate-700">
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-slate-400">
                            Treatment
                          </p>
                          <p className="font-semibold text-slate-900">
                            {formatOrNone(
                              note.treatment_details || note.assessment || note.note
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-slate-400">
                            Route
                          </p>
                          <p>{formatOrNone(note.treatment_route)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-slate-400">
                            Complaints
                          </p>
                          <p>{formatOrNone(note.complaints)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-slate-400">
                            Next review
                          </p>
                          <p>
                            {formatOrNone(
                              `${note.next_review_date || note.next_treatment_date || "None"}${
                                note.next_treatment_time
                                  ? ` ${note.next_treatment_time}`
                                  : ""
                              }`
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-slate-400">
                            BP (mmHg)
                          </p>
                          <p>
                            {note.systolic_bp || note.diastolic_bp
                              ? `${formatOrNone(note.systolic_bp)}/${formatOrNone(
                                  note.diastolic_bp
                                )}`
                              : "None"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-slate-400">
                            Pulse (bpm)
                          </p>
                          <p>{formatOrNone(note.pulse)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-slate-400">
                            Resp. (cpm)
                          </p>
                          <p>{formatOrNone(note.respiration_rate)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-slate-400">
                            Temp (°C)
                          </p>
                          <p>{formatOrNone(note.temperature_c)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-slate-400">
                            SpO₂ (%)
                          </p>
                          <p>{formatOrNone(note.oxygen_saturation)}</p>
                        </div>
                        <div className="col-span-3">
                          <p className="text-[11px] uppercase tracking-wide text-slate-400">
                            Remarks
                          </p>
                          <p>{formatOrNone(note.remarks)}</p>
                        </div>
                      </div>
                        <div className="text-[11px] text-slate-500">
                         Recorded by: {note.recorded_by_name || "None"}({note.recorded_by_role || "None"}) ·
                            {note.documented_at
                              ? formatDateTime(note.documented_at)
                              : note.created_at
                              ? formatDateTime(note.created_at)
                              : "None"}
                        
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {renderDetailDrawer()}
      </div>
    </main>
  );
};

export default ConsultationModule;
