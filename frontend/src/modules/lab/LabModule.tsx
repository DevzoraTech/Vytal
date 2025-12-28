import type { LabOrder, LabQueueEntry, LabRecordEntry, LabTab } from "./types";

interface LabModuleProps {
  activeTab: LabTab;
  onTabChange: (tab: LabTab) => void;
  queue: LabQueueEntry[];
  records: LabRecordEntry[];
  orders: LabOrder[];
  onRecord: (entry: LabQueueEntry) => void;
  onRefreshQueue: () => void;
  onRefreshRecords: () => void;
  onRefreshOrders: () => void;
  fetchError?: string | null;
}

const LabModule = ({
  activeTab,
  onTabChange,
  queue,
  records,
  orders,
  onRecord,
  onRefreshQueue,
  onRefreshRecords,
  onRefreshOrders,
  fetchError,
}: LabModuleProps) => {
  const renderQueue = () => (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Queue</h2>
          <p className="text-sm text-gray-500">
            Patients awaiting lab results entry.
          </p>
        </div>
        <button
          type="button"
          className="text-sm font-semibold text-blue-600 hover:text-blue-700"
          onClick={onRefreshQueue}
        >
          Refresh
        </button>
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

  const renderRecords = () => (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Records</h2>
          <p className="text-sm text-gray-500">
            Completed lab entries forwarded to patient records.
          </p>
        </div>
        <button
          type="button"
          className="text-sm font-semibold text-blue-600 hover:text-blue-700"
          onClick={onRefreshRecords}
        >
          Refresh
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="pb-3 pr-3 font-semibold">Patient</th>
              <th className="pb-3 pr-3 font-semibold">Test</th>
              <th className="pb-3 pr-3 font-semibold">Summary</th>
              <th className="pb-3 pr-3 font-semibold">Recorded by</th>
              <th className="pb-3 pr-3 font-semibold">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {records.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-sm">
                  No lab records yet.
                </td>
              </tr>
            ) : (
              records.map((entry) => (
                <tr key={entry.id}>
                  <td className="py-3 pr-3">
                    <div className="font-semibold">{entry.patient_name}</div>
                  </td>
                  <td className="py-3 pr-3">{entry.test_type}</td>
                  <td className="py-3 pr-3 text-sm text-gray-600">
                    {entry.summary}
                  </td>
                  <td className="py-3 pr-3 text-sm text-gray-600">
                    {entry.recorded_by_name}
                  </td>
                  <td className="py-3 pr-3 text-sm text-gray-500">
                    {entry.recorded_at
                      ? new Date(entry.recorded_at).toLocaleString()
                      : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderOrders = () => (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Orders from clinicians</h2>
          <p className="text-sm text-gray-500">Submitted lab orders requiring attention.</p>
        </div>
        <button
          type="button"
          className="text-sm font-semibold text-blue-600 hover:text-blue-700"
          onClick={onRefreshOrders}
        >
          Refresh
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="pb-3 pr-3 font-semibold">Patient</th>
              <th className="pb-3 pr-3 font-semibold">Admission</th>
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
                      ID: {order.patient_id ?? "—"}
                    </div>
                  </td>
                  <td className="py-3 pr-3">#{order.admission}</td>
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
    </main>
  );
};

export default LabModule;
