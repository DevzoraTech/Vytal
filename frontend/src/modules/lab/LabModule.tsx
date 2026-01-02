import { useState } from "react";
import type {
  LabOrder,
  LabQueueEntry,
  LabRecordEntry,
  LabTab,
  LabTask,
} from "./types";
import { LAB_TEST_GROUPS } from "./types";

interface LabModuleProps {
  activeTab: LabTab;
  onTabChange: (tab: LabTab) => void;
  queue: LabQueueEntry[];
  records: LabRecordEntry[];
  orders: LabOrder[];
  tasks: LabTask[];
  onRecord: (entry: LabQueueEntry) => void;
  onRefreshQueue: () => void;
  onRefreshRecords: () => void;
  onRefreshOrders: () => void;
  onRefreshTasks: () => void;
  fetchError?: string | null;
}

type RecordReportPayload = {
  patientName: string;
  patientIdentifier?: string | null;
  patientAge?: number | null;
  patientSex?: string | null;
  tests: string[];
  recordedBy?: string;
  recordedAt?: string;
  orderedAt?: string;
  collectedAt?: string;
  entries: LabRecordEntry[];
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

const testCategoryLookup: Record<string, string> = Object.entries(LAB_TEST_GROUPS).reduce<
  Record<string, string>
>((acc, [category, tests]) => {
  tests.forEach((test) => {
    acc[test] = category;
  });
  return acc;
}, {});

const getTestCategory = (testType: string) => testCategoryLookup[testType] ?? "Other";

const LabModule = ({
  activeTab,
  onTabChange,
  queue,
  records,
  orders,
  tasks,
  onRecord,
  onRefreshQueue,
  onRefreshRecords,
  onRefreshOrders,
  onRefreshTasks,
  fetchError,
}: LabModuleProps) => {
  const [queueExportOpen, setQueueExportOpen] = useState(false);
  const [recordsExportOpen, setRecordsExportOpen] = useState(false);
  const [ordersExportOpen, setOrdersExportOpen] = useState(false);
  const [recordActionOpenId, setRecordActionOpenId] = useState<string | number | null>(null);
  const [recordReportEntry, setRecordReportEntry] = useState<RecordReportPayload | null>(null);
  const [recordReportGeneratedAt, setRecordReportGeneratedAt] = useState<string | null>(null);
  const [recordReportComment, setRecordReportComment] = useState<string>("");
  const [recordReportFlags, setRecordReportFlags] = useState<Record<string, string>>({});
  const flagOptions = [
    { value: "N/A", label: "N/A", color: "text-slate-600"},
    { value: "normal", label: "Normal", color: "text-emerald-700"},
    { value: "low", label: "Low", color: "text-amber-700"},
    { value: "high", label: "High", color: "text-orange-700"},
  ];
  const getFlagClasses = (flag: string) => {
    const option = flagOptions.find((opt) => opt.value === flag);
    if (!option) return "bg-slate-100 text-slate-600";
    return `${option.color}`;
  };
  const handleExportQueue = () => {
    if (!queue.length) return;
    const rows = queue.map((entry) => ({
      id: entry.id,
      name: entry.name,
      age: entry.age,
      sex: entry.sex,
      arrival: entry.arrival,
      date: entry.date,
      symptoms: entry.symptoms,
      status: entry.status,
    }));
    exportToCsv("lab_queue.csv", rows);
    setQueueExportOpen(false);
  };

  const handleExportRecords = () => {
    if (!records.length) return;
    const rows = records.map((entry) => ({
      id: entry.id,
      patient_identifier: entry.patient_identifier || "",
      patient: entry.patient_name,
      test: entry.test_type,
      summary: entry.summary,
      recorded_by: entry.recorded_by_name,
      recorded_at: entry.recorded_at,
    }));
    exportToCsv("lab_records.csv", rows);
    setRecordsExportOpen(false);
  };

  const handleExportOrders = () => {
    if (!orders.length) return;
    const rows = orders.map((order) => ({
      id: order.id,
      patient: order.patient_identifier || order.patient_name || "Patient",
      internal_id: order.patient_id ?? "",
      priority: order.priority,
      items: order.order_items.join("; "),
      notes: order.clinical_question || order.notes_to_lab || "",
      status: order.status,
      created_at: order.created_at,
    }));
    exportToCsv("lab_orders.csv", rows);
    setOrdersExportOpen(false);
  };

  const renderQueue = () => (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Queue</h2>
          <p className="text-sm text-gray-500">
            Patients awaiting lab results entry.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              onClick={() => setQueueExportOpen((prev) => !prev)}
            >
              Export <span className="text-[10px]">▾</span>
            </button>
            {queueExportOpen && (
              <div className="absolute right-0 mt-2 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                <button
                  type="button"
                  onClick={handleExportQueue}
                  className="block w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Export to CSV
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
            onClick={onRefreshQueue}
          >
            Refresh
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        {fetchError && (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {fetchError}
          </div>
        )}
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="pb-3 pr-3 font-semibold">Patient</th>
              <th className="pb-3 pr-3 font-semibold">Demographics</th>
              <th className="pb-3 pr-3 font-semibold">Arrival</th>
              <th className="pb-3 pr-3 font-semibold">Reason</th>
              <th className="pb-3 pr-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {queue.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-sm">
                  No patients waiting for lab entry.
                </td>
              </tr>
            ) : (
              queue.map((entry) => (
                <tr key={entry.id}>
                  <td className="py-3 pr-3">
                    <div className="font-semibold">{entry.name}</div>
                    <div className="text-xs text-gray-500">{entry.status}</div>
                  </td>
                  <td className="py-3 pr-3 text-sm text-gray-500">
                    {entry.age} yrs · {entry.sex}
                  </td>
                  <td className="py-3 pr-3">
                    <div>{entry.arrival}</div>
                    <div className="text-xs text-gray-500">{entry.date}</div>
                  </td>
                  <td className="py-3 pr-3 text-sm text-gray-600">
                    {entry.symptoms || "No details"}
                  </td>
                  <td className="py-3 pr-3">
                    <button
                      type="button"
                      onClick={() => onRecord(entry)}
                      className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                    >
                      Record results
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderRecords = () => {
    const grouped = records.reduce<
      Record<
        string,
        {
          key: string;
          patientName: string;
          patientIdentifier?: string | null;
          patientAge?: number | null;
          patientSex?: string | null;
          tests: string[];
          recordedBy?: string;
          recordedAt?: string;
          orderedAt?: string;
          collectedAt?: string;
          entries: LabRecordEntry[];
        }
      >
    >((acc, entry) => {
      const key =
        entry.patient_identifier?.toString?.() ||
        entry.patient_name ||
        `record-${entry.id}`;
      if (!acc[key]) {
        acc[key] = {
          key,
          patientName: entry.patient_name,
          patientIdentifier: entry.patient_identifier ?? null,
          patientAge: entry.patient_age ?? null,
          patientSex: entry.patient_gender ?? null,
          tests: [],
          recordedBy: entry.recorded_by_name,
          recordedAt: entry.recorded_at,
          orderedAt: entry.recorded_at,
          collectedAt: entry.recorded_at,
          entries: [],
        };
      }
      acc[key].tests.push(entry.test_type);
      acc[key].entries.push(entry);
      // keep most recent recorded_at for display
      if (
        entry.recorded_at &&
        (!acc[key].recordedAt ||
          Date.parse(entry.recorded_at) > Date.parse(acc[key].recordedAt || ""))
      ) {
        acc[key].recordedAt = entry.recorded_at;
        acc[key].recordedBy = entry.recorded_by_name;
      }
      return acc;
    }, {});
    const groupedList = Object.values(grouped);

    return (
      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Records</h2>
            <p className="text-sm text-gray-500">
              Completed lab entries forwarded to patient records.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                onClick={() => setRecordsExportOpen((prev) => !prev)}
              >
                Export <span className="text-[10px]">▾</span>
              </button>
              {recordsExportOpen && (
                <div className="absolute right-0 mt-2 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                  <button
                    type="button"
                    onClick={handleExportRecords}
                    className="block w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Export to CSV
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              className="text-sm font-semibold text-blue-600 hover:text-blue-700"
              onClick={onRefreshRecords}
            >
              Refresh
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="pb-3 pr-3 font-semibold">Patient</th>
                <th className="pb-3 pr-3 font-semibold">Tests</th>
                <th className="pb-3 pr-3 font-semibold">Recorded by</th>
                <th className="pb-3 pr-3 font-semibold">Date</th>
                <th className="pb-3 pr-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {groupedList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-sm">
                    No lab records yet.
                  </td>
                </tr>
              ) : (
                groupedList.map((group) => {
                  const testsJoined = group.tests.join(", ");
                  const truncatedTests =
                    testsJoined.length > 60
                      ? `${testsJoined.slice(0, 57)}...`
                      : testsJoined;
                  return (
                    <tr key={group.key}>
                  <td className="py-3 pr-3">
                    <div className="font-semibold text-gray-900">
                      {group.patientName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {group.patientIdentifier || "—"}
                      {group.patientSex ? (
                        <>
                          <span className="mx-1">•</span>
                          {group.patientSex}
                        </>
                      ) : null}
                      {group.patientAge !== null && group.patientAge !== undefined ? (
                        <>
                          <span className="mx-1">•</span>
                          {group.patientAge}
                        </>
                      ) : null}
                    </div>
                  </td>
                      <td className="py-3 pr-3 text-sm text-gray-600">
                        {truncatedTests || "—"}
                      </td>
                      <td className="py-3 pr-3 text-sm text-gray-600">
                        {group.recordedBy || "—"}
                      </td>
                      <td className="py-3 pr-3 text-sm text-gray-500">
                        {group.recordedAt
                          ? new Date(group.recordedAt).toLocaleString()
                          : "—"}
                      </td>
                      <td className="py-3 pr-3 text-right">
                        <div className="relative inline-flex">
                          <button
                            type="button"
                            onClick={() =>
                              setRecordActionOpenId((prev) =>
                                prev === group.key ? null : group.key as any
                              )
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
                          >
                            <img
                              src="vertical_more.png"
                              alt="more"
                              width={16}
                              height={16}
                            />
                          </button>
                          {recordActionOpenId === group.key && (
                            <div className="absolute right-0 z-20 mt-2 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                              <button
                                type="button"
                                className="block w-full px-4 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                onClick={() => {
                                  setRecordActionOpenId(null);
                                  setRecordReportEntry({
                                    patientName: group.patientName,
                                    patientIdentifier: group.patientIdentifier,
                                    patientAge: group.patientAge,
                                    patientSex: group.patientSex,
                                    tests: group.tests,
                                    recordedBy: group.recordedBy,
                                    recordedAt: group.recordedAt,
                                    orderedAt: group.orderedAt,
                                    collectedAt: group.collectedAt,
                                    entries: group.entries,
                                  });
                                  const initialFlags: Record<string, string> = {};
                                  group.entries.forEach((entry, entryIdx) => {
                                    initialFlags[`${entry.id ?? "idx"}-${entryIdx}-${entry.test_type}`] = "none";
                                  });
                                  setRecordReportFlags(initialFlags);
                                  setRecordReportGeneratedAt(new Date().toISOString());
                                  setRecordReportComment("");
                                }}
                              >
                                View report
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    );
  };

  const renderOrders = () => (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Orders from clinicians</h2>
          <p className="text-sm text-gray-500">Submitted lab orders requiring attention.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              onClick={() => setOrdersExportOpen((prev) => !prev)}
            >
              Export <span className="text-[10px]">▾</span>
            </button>
            {ordersExportOpen && (
              <div className="absolute right-0 mt-2 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                <button
                  type="button"
                  onClick={handleExportOrders}
                  className="block w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Export to CSV
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
            onClick={onRefreshOrders}
          >
            Refresh
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="pb-3 pr-3 font-semibold">Patient</th>
              <th className="pb-3 pr-3 font-semibold">Priority</th>
              <th className="pb-3 pr-3 font-semibold">Items</th>
              <th className="pb-3 pr-3 font-semibold">Notes</th>
              <th className="pb-3 pr-3 font-semibold">Status</th>
              <th className="pb-3 pr-3 font-semibold">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-sm">
                  No lab orders yet.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id}>
                  <td className="py-3 pr-3">
                    <div className="font-semibold">
                      {order.patient_name || "Patient"}
                    </div>
                    <div className="text-xs text-gray-500">
                      PID: {order.patient_identifier ?? "—"}
                    </div>
                  </td>
                  <td className="py-3 pr-3 capitalize">{order.priority}</td>
                  <td className="py-3 pr-3 text-sm text-gray-600">
                    {order.order_items.join(", ") || "—"}
                  </td>
                  <td className="py-3 pr-3 text-sm text-gray-500">
                    {order.clinical_question || order.notes_to_lab || "—"}
                  </td>
                  <td className="py-3 pr-3 text-sm text-gray-600 capitalize">
                    {order.status}
                  </td>
                  <td className="py-3 pr-3 text-sm text-gray-500">
                    {order.created_at ? new Date(order.created_at).toLocaleString() : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-800">Consultation tasks for Lab</div>
          <button
            type="button"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            onClick={onRefreshTasks}
          >
            Refresh
          </button>
        </div>
        {tasks.length === 0 ? (
          <p className="text-xs text-gray-500">No open tasks assigned to Lab.</p>
        ) : (
          <ul className="space-y-2 text-sm text-gray-700">
            {tasks.map((task) => (
              <li
                key={task.id}
                className="rounded-md border border-gray-200 bg-white px-3 py-2"
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold capitalize">{task.task_type.replace("_", " ")}</div>
                  <span className="text-xs text-gray-500">
                    #{task.admission} · {new Date(task.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="text-xs text-gray-600">{task.message || "Task assigned to lab"}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );

  return (
    <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6">
        <div className="flex gap-4 border-b border-gray-300 pb-2 text-sm font-medium">
          <button
            className={`pb-1 ${
              activeTab === "queue"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600"
            }`}
            onClick={() => onTabChange("queue")}
          >
            Queue
          </button>
          <button
            className={`pb-1 ${
              activeTab === "records"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600"
            }`}
            onClick={() => onTabChange("records")}
          >
            Records
          </button>
          <button
            className={`pb-1 ${
              activeTab === "orders"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600"
            }`}
            onClick={() => onTabChange("orders")}
          >
            Orders
          </button>
        </div>
        {activeTab === "queue"
          ? renderQueue()
          : activeTab === "records"
          ? renderRecords()
          : renderOrders()}
      </div>
      {recordReportEntry && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => {
              setRecordReportEntry(null);
              setRecordReportFlags({});
            }}
            role="presentation"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div
              className="w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto"
              style={{ margin: "1cm 2.54cm 2.54cm 2.54cm" }}
            >
              <div className="mb-4 flex items-center justify-between">
                  <button
                    type="button"
                    className="rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                    onClick={() => {
                      setRecordReportEntry(null);
                      setRecordReportFlags({});
                    }}
                  >
                    Close
                  </button>
                </div>
              <div className="border-b border-slate-200 bg-white px-6 py-4">
                <div className="relative flex items-start justify-center gap-4">
                  <div className="flex items-center justify-center gap-3">
                    <img src="/paleologo.png" alt="Paleo Medicals" className="h-16 w-16 object-contain" />
                    <div className="flex flex-col items-start text-left">
                      <div className="calibri uppercase text-[20px] font-extrabold tracking-wide text-[#008000]">
                        PALEO MEDICALS
                      </div>
                      <div className="text-[13px] font-medium tracking-wide text-slate-500 italic">
                        Doctor to Community
                      </div>
                      <div className="text-[14px] font-medium text-slate-600">
                        Buziga, Lukuli Link
                      </div>
                    </div>
                  </div>
                  <div className="absolute right-0 top-0 text-right text-[11px] text-slate-600">
                    <div className="font-semibold text-slate-800">0705 011745 / 0786 053163</div>
                    <div>admin@paleomedicals.health</div>
                    <div>https://paleomedicals.health</div>
                  </div>
                </div>
                <div className="text-[15px] text-center font-semibold text-slate-600">
                  General Medicine, Pediatrics, Obstetrics, Gynecology, Lab and Ultra Sound scan
                </div>
              </div>

              <h3 className="text-base font-semibold text-center mt-2 uppercase text-slate-900">Laboratory Report</h3>

              <div className="grid grid-cols-[1.1fr_0.35fr_1.1fr] items-stretch gap-3 border-b border-slate-200 bg-white px-6 py-4">
                <div className="rounded-[2px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <div className="text-xs font-semibold text-slate-500">Name</div>
                  <div className="text-base font-semibold text-slate-900">
                    {recordReportEntry.patientName || "—"}
                  </div>
                  <div className="mt-1 grid grid-cols-2 gap-2 text-[13px] text-slate-600">
                    <span className="col-span-2">Age: {recordReportEntry.patientAge ?? "—"}</span>
                    <span className="col-span-2">Sex: {recordReportEntry.patientSex || "—"}</span>
                    <span className="col-span-2">
                      PID: {recordReportEntry.patientIdentifier || "—"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-center rounded-[2px] border border-slate-200 bg-slate-50 p-3 text-center text-[11px] font-semibold text-slate-500 shadow-sm">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
                      "https://paleomedical.health"
                    )}`}
                    alt="QR"
                    className="h-28 w-28 object-contain"
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement;
                      target.style.display = "none";
                    }}
                  />
                </div>
                <div className="rounded-[2px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <div className="text-xs font-semibold text-slate-500">Sample Collected At</div>
                  <div className="text-sm font-semibold text-slate-900">Paleo Medicals Hosp</div>
                  <div className="mt-2 text-xs font-semibold text-slate-500">Ref. By</div>
                  <div className="text-sm font-semibold text-slate-900">
                    {recordReportEntry.recordedBy || "—"}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 border-b border-slate-200 bg-white px-6 py-3 text-[11px] text-slate-600">
                <div>
                  <span className="font-semibold text-slate-700">Ordered on:</span>{" "}
                  {recordReportEntry.orderedAt
                    ? new Date(recordReportEntry.orderedAt).toLocaleString()
                    : "—"}
                </div>
                <div>
                  <span className="font-semibold text-slate-700">Collected on:</span>{" "}
                  {recordReportEntry.collectedAt
                    ? new Date(recordReportEntry.collectedAt).toLocaleString()
                    : "—"}
                </div>
                <div>
                  <span className="font-semibold text-slate-700">Reported on:</span>{" "}
                  {recordReportEntry.recordedAt
                    ? new Date(recordReportEntry.recordedAt).toLocaleString()
                    : "—"}
                </div>
              </div>

              <div className="px-6 py-4">
                <div className="rounded-xl border border-slate-200">
                  <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide bg-[#e6ffee] text-slate-600">
                    <span>Test</span>
                    <span>Result</span>
                    <span>Flag</span>
                    <span className="text-right">Biological Reference Range / Unit</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {(() => {
                      const entries = recordReportEntry.entries || [];
                      if (entries.length === 0) {
                        return <div className="px-4 py-4 text-sm text-slate-500">No tests listed.</div>;
                      }
                      const byCategory = entries.reduce<Record<string, LabRecordEntry[]>>((acc, entry) => {
                        const category = getTestCategory(entry.test_type);
                        acc[category] = acc[category] || [];
                        acc[category].push(entry);
                        return acc;
                      }, {});
                      const categoryOrder = Object.keys(LAB_TEST_GROUPS);
                      const orderedCategories = [
                        ...categoryOrder.filter((cat) => byCategory[cat]?.length),
                        ...Object.keys(byCategory).filter((cat) => !categoryOrder.includes(cat)),
                      ];
                      return orderedCategories.map((category) => (
                        <div key={category} className="py-1">
                          <div className="rounded bg-slate-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                            {category}
                          </div>
                          {byCategory[category].map((entry, idx) => {
                            const entryKey = `${entry.id ?? "idx"}-${idx}-${entry.test_type}`;
                            const selectedFlag = recordReportFlags[entryKey] ?? "none";
                            return (
                              <div
                                key={`${entry.test_type}-${entry.id}-${idx}`}
                                className="grid grid-cols-[2fr_1fr_1fr_1fr] items-center gap-2 px-4 py-3 text-sm text-slate-700"
                              >
                                <span className="font-semibold text-slate-900">{entry.test_type}</span>
                                <span className="text-slate-700">{entry.summary || "—"}</span>
                                <div className="flex items-center">
                                  <select
                                    value={selectedFlag}
                                    onChange={(e) =>
                                      setRecordReportFlags((prev) => ({
                                        ...prev,
                                        [entryKey]: e.target.value,
                                      }))
                                    }
                                    className={`w-full rounded-full px-3 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-200 ${getFlagClasses(
                                      selectedFlag
                                    )}`}
                                  >
                                    {flagOptions.map((opt) => (
                                      <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <span className="text-right text-xs text-slate-400">—</span>
                              </div>
                            );
                          })}
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Comment
                    </label>
                    <textarea
                      className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      rows={3}
                      value={recordReportComment}
                      onChange={(e) => setRecordReportComment(e.target.value)}
                      placeholder="Enter technician comment for this report"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 px-6 py-4">
                <div className="flex flex-wrap items-start justify-between gap-6">
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-slate-500">Signature</div>
                    <div className="mt-1 text-lg text-slate-400">.........................</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {recordReportEntry.recordedBy || "Laboratory Technician"}
                    </div>
                    <div className="text-xs text-slate-600">Laboratory Technician</div>
                  </div>
                  <div className="text-right text-[11px] text-slate-600">
                    <div>
                      Generated on:{" "}
                      {recordReportGeneratedAt
                        ? new Date(recordReportGeneratedAt).toLocaleString()
                        : "—"}
                    </div>
                    <div>Page 1 of 1</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
};

export default LabModule;
