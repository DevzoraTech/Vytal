import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "../../types/auth";
import {
  type CarePlan,
  type ConsultationEvent,
  type ConsultationFilter,
  type ConsultationTask,
  type LabOrder,
  type LabResult,
  type WorklistEntry,
} from "./types";

interface ConsultationModuleProps {
  apiBaseUrl: string;
  token: string | null;
  user: User | null;
}

interface LabOrderFormState {
  priority: "routine" | "urgent";
  orderItemsText: string;
  clinicalQuestion: string;
  notesToLab: string;
  policyBypass: boolean;
}

interface CarePlanFormState {
  assessment: string;
  medications: string;
  procedures: string;
  monitoring: string;
  patientInstructions: string;
  escalation: string;
  nextReviewAt: string;
  note: string;
  finalize: boolean;
}

const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString() : "—";

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

const ConsultationModule = ({ apiBaseUrl, token, user }: ConsultationModuleProps) => {
  const [filter, setFilter] = useState<ConsultationFilter>("awaiting_consult");
  const [mineOnly, setMineOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [worklistError, setWorklistError] = useState<string | null>(null);
  const [worklist, setWorklist] = useState<WorklistEntry[]>([]);
  const [selected, setSelected] = useState<WorklistEntry | null>(null);

  const [detailLoading, setDetailLoading] = useState(false);
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [results, setResults] = useState<LabResult[]>([]);
  const [plans, setPlans] = useState<CarePlan[]>([]);
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

  const [carePlanForm, setCarePlanForm] = useState<CarePlanFormState>({
    assessment: "",
    medications: "",
    procedures: "",
    monitoring: "",
    patientInstructions: "",
    escalation: "",
    nextReviewAt: "",
    note: "",
    finalize: true,
  });
  const [savingPlan, setSavingPlan] = useState(false);

  const authHeaders = useMemo(
    () =>
      token
        ? {
            Authorization: `Token ${token}`,
            "Content-Type": "application/json",
          }
        : { "Content-Type": "application/json" },
    [token]
  );

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
      const mineParam = mineOnly ? "&mine=true" : "";
      const data: WorklistEntry[] = await fetchJson(
        `${apiBaseUrl}/consultation/worklist/?filter=${filter}${mineParam}`
      );
      setWorklist(data);
      if (data.length > 0) {
        setSelected((prev) => {
          if (prev && data.some((entry) => entry.admission_id === prev.admission_id)) {
            return prev;
          }
          return data[0];
        });
      } else {
        setSelected(null);
      }
    } catch (error) {
      setWorklistError(
        error instanceof Error ? error.message : "Failed to load worklist."
      );
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, fetchJson, filter, mineOnly, token]);

  const loadDetails = useCallback(
    async (entry: WorklistEntry) => {
      if (!token) {
        return;
      }
      setDetailLoading(true);
      setDetailError(null);
      try {
        const [ordersResp, plansResp, tasksResp, eventsResp, resultsResp] =
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
          ]);
        const normalize = (resp: unknown) =>
          Array.isArray(resp)
            ? resp
            : (resp as { results?: unknown[] })?.results || [];
        const ordersList = normalize(ordersResp) as LabOrder[];
        const plansList = normalize(plansResp) as CarePlan[];
        const tasksList = normalize(tasksResp) as ConsultationTask[];
        const eventsList = normalize(eventsResp) as ConsultationEvent[];
        const resultsList = normalize(resultsResp) as LabResult[];
        setOrders(ordersList);
        setPlans(plansList);
        setTasks(tasksList);
        setEvents(eventsList);
        setResults(resultsList);
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

  const handleSaveCarePlan = async () => {
    if (!selected) return;
    setSavingPlan(true);
    setDetailError(null);
    const planItems = {
      medications: carePlanForm.medications,
      procedures: carePlanForm.procedures,
      monitoring: carePlanForm.monitoring,
      patient_instructions: carePlanForm.patientInstructions,
      escalation: carePlanForm.escalation,
    };
    const payload = {
      admission: selected.admission_id,
      assessment: carePlanForm.assessment,
      plan_items: planItems,
      next_review_at: carePlanForm.nextReviewAt || null,
      escalation_criteria: carePlanForm.escalation,
      note: carePlanForm.note,
      status: carePlanForm.finalize ? "finalized" : "draft",
    };
    try {
      await fetchJson(`${apiBaseUrl}/consultation/care-plans/`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setCarePlanForm((prev) => ({
        ...prev,
        assessment: "",
        medications: "",
        procedures: "",
        monitoring: "",
        patientInstructions: "",
        escalation: "",
        note: "",
      }));
      await Promise.all([loadDetails(selected), loadWorklist()]);
    } catch (error) {
      setDetailError(
        error instanceof Error ? error.message : "Unable to save care plan."
      );
    } finally {
      setSavingPlan(false);
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
              <label className="flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={mineOnly}
                  onChange={(event) => setMineOnly(event.target.checked)}
                />
                Mine
              </label>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <button
                type="button"
                onClick={loadWorklist}
                className="rounded-full border border-slate-200 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                disabled={loading}
              >
                Refresh
              </button>
              {user && (
                <span className="text-xs text-slate-500">
                  Signed in as {user.first_name || user.username}
                </span>
              )}
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
                  <th className="pb-3 pr-3 font-semibold" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-sm">
                      Loading worklist…
                    </td>
                  </tr>
                ) : worklist.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-sm">
                      No encounters in this view.
                    </td>
                  </tr>
                ) : (
                  worklist.map((entry) => {
                    const isActive = selected?.admission_id === entry.admission_id;
                    return (
                      <tr
                        key={entry.admission_id}
                        className={isActive ? "bg-slate-50" : ""}
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
                        <td className="py-3 pr-3 text-right">
                          <button
                            type="button"
                            onClick={() => setSelected(entry)}
                            className={`rounded-full px-4 py-2 text-xs font-semibold ${
                              isActive
                                ? "bg-slate-200 text-slate-800"
                                : "bg-blue-600 text-white hover:bg-blue-700"
                            }`}
                          >
                            {isActive ? "Open" : "Open"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {selected && (
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Encounter
                    </p>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {selected.patient_name} · Admission #{selected.admission_id}
                    </h3>
                    <p className="text-sm text-slate-600">
                      Latest activity {formatDateTime(selected.last_activity_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass(
                        selected.status
                      )}`}
                    >
                      {selected.status.replace("_", " ")}
                    </span>
                    {latestPlan && (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        Plan v{latestPlan.version} ({latestPlan.status})
                      </span>
                    )}
                    {latestResult && (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        Result {formatDateTime(latestResult.recorded_at)}
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
                          <p className="text-sm text-slate-600">No open tasks.</p>
                        ) : (
                          <ul className="mt-2 space-y-2 text-sm">
                            {tasks.map((task) => (
                              <li
                                key={task.id}
                                className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-slate-700 shadow-sm"
                              >
                                <div>
                                  <div className="font-semibold">{task.task_type.replace("_", " ")}</div>
                                  <div className="text-xs text-slate-500">
                                    {task.message || "Action required"}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleAcknowledgeTask(task.id)}
                                  className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                                >
                                  Acknowledge
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500">
                              Lab orders
                            </p>
                            <p className="text-sm text-slate-600">
                              {orders.length} order{orders.length === 1 ? "" : "s"}
                            </p>
                          </div>
                        </div>
                        <ul className="mt-3 space-y-2 text-sm text-slate-700">
                          {orders.length === 0 ? (
                            <li className="text-slate-500">No lab orders yet.</li>
                          ) : (
                            orders.map((order) => (
                              <li
                                key={order.id}
                                className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="font-semibold">
                                    {order.order_items.join(", ") || "Order"}
                                  </div>
                                  <span className="text-xs text-slate-500">
                                    {order.priority} · {order.status}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-500">
                                  {order.clinical_question || order.notes_to_lab || "No notes"}
                                </div>
                              </li>
                            ))
                          )}
                        </ul>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          Recent lab results
                        </p>
                        <ul className="mt-3 space-y-2 text-sm text-slate-700">
                          {results.length === 0 ? (
                            <li className="text-slate-500">No lab results.</li>
                          ) : (
                            results.slice(0, 5).map((result) => (
                              <li
                                key={result.id}
                                className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="font-semibold">{result.test_type}</div>
                                  <span className="text-xs text-slate-500">
                                    {formatDateTime(result.recorded_at)}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-500">{result.summary}</div>
                              </li>
                            ))
                          )}
                        </ul>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          Care plans
                        </p>
                        <ul className="mt-3 space-y-2 text-sm text-slate-700">
                          {plans.length === 0 ? (
                            <li className="text-slate-500">No care plans yet.</li>
                          ) : (
                            plans.map((plan) => (
                              <li
                                key={plan.id}
                                className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="font-semibold">
                                    v{plan.version} · {plan.status}
                                  </div>
                                  <span className="text-xs text-slate-500">
                                    {formatDateTime(plan.created_at)}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-500">
                                  {plan.assessment || "No assessment"}
                                </div>
                              </li>
                            ))
                          )}
                        </ul>
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
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Lab order
                    </p>
                    <h3 className="text-lg font-semibold text-slate-900">
                      Add lab order
                    </h3>
                  </div>
                  <span className="text-xs text-slate-500">
                    {selected.patient_name}
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
                      placeholder="CBC, LFT, Malaria RDT"
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
                    <div className="flex items-end gap-2">
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <input
                          type="checkbox"
                          checked={labOrderForm.policyBypass}
                          onChange={(event) =>
                            setLabOrderForm((prev) => ({
                              ...prev,
                              policyBypass: event.target.checked,
                            }))
                          }
                        />
                        Policy bypass
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">
                      Clinical question / Notes
                    </label>
                    <textarea
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                      rows={2}
                      value={labOrderForm.clinicalQuestion}
                      onChange={(event) =>
                        setLabOrderForm((prev) => ({
                          ...prev,
                          clinicalQuestion: event.target.value,
                        }))
                      }
                      placeholder="Rule out sepsis, evaluate liver function"
                    />
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
                      placeholder="Sample already collected..."
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

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Care plan
                    </p>
                    <h3 className="text-lg font-semibold text-slate-900">
                      Create / update plan
                    </h3>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <input
                      type="checkbox"
                      checked={carePlanForm.finalize}
                      onChange={(event) =>
                        setCarePlanForm((prev) => ({
                          ...prev,
                          finalize: event.target.checked,
                        }))
                      }
                    />
                    Finalize & notify
                  </label>
                </div>
                <div className="space-y-3 text-sm">
                  <div>
                    <label className="text-xs font-semibold text-slate-600">
                      Assessment
                    </label>
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                      value={carePlanForm.assessment}
                      onChange={(event) =>
                        setCarePlanForm((prev) => ({
                          ...prev,
                          assessment: event.target.value,
                        }))
                      }
                      placeholder="Working diagnosis"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600">
                        Medications
                      </label>
                      <textarea
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                        rows={2}
                        value={carePlanForm.medications}
                        onChange={(event) =>
                          setCarePlanForm((prev) => ({
                            ...prev,
                            medications: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">
                        Procedures
                      </label>
                      <textarea
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                        rows={2}
                        value={carePlanForm.procedures}
                        onChange={(event) =>
                          setCarePlanForm((prev) => ({
                            ...prev,
                            procedures: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600">
                        Monitoring
                      </label>
                      <textarea
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                        rows={2}
                        value={carePlanForm.monitoring}
                        onChange={(event) =>
                          setCarePlanForm((prev) => ({
                            ...prev,
                            monitoring: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">
                        Patient instructions
                      </label>
                      <textarea
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                        rows={2}
                        value={carePlanForm.patientInstructions}
                        onChange={(event) =>
                          setCarePlanForm((prev) => ({
                            ...prev,
                            patientInstructions: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">
                      Escalation criteria
                    </label>
                    <textarea
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                      rows={2}
                      value={carePlanForm.escalation}
                      onChange={(event) =>
                        setCarePlanForm((prev) => ({
                          ...prev,
                          escalation: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600">
                        Next review at
                      </label>
                      <input
                        type="datetime-local"
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                        value={carePlanForm.nextReviewAt}
                        onChange={(event) =>
                          setCarePlanForm((prev) => ({
                            ...prev,
                            nextReviewAt: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">
                        Note (optional)
                      </label>
                      <textarea
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                        rows={2}
                        value={carePlanForm.note}
                        onChange={(event) =>
                          setCarePlanForm((prev) => ({
                            ...prev,
                            note: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveCarePlan}
                    disabled={savingPlan}
                    className="w-full rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {savingPlan ? "Saving..." : carePlanForm.finalize ? "Finalize plan" : "Save draft"}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
};

export default ConsultationModule;
