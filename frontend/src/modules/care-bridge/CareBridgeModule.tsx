import { useMemo, useState } from "react";

type CareRecord = {
  id: string;
  patient: string;
  source: "Lab" | "Nurse";
  title: string;
  detail: string;
  status: "Ready" | "In Progress" | "Pending" | "Flagged";
  time: string;
  staff: string;
  tags: string[];
};

type TreatmentPlan = {
  id: string;
  patient: string;
  nextStep: string;
  due: string;
  owner: string;
  status: "Scheduled" | "Due" | "Completed";
  route: string;
};

const incomingRecords: CareRecord[] = [
  {
    id: "LR-1023",
    patient: "Sarah Keita",
    source: "Lab",
    title: "CBC completed",
    detail: "Hemoglobin stable, WBC slightly elevated. Consider repeat in 48 hrs.",
    status: "Ready",
    time: "Today | 10:30 AM",
    staff: "Lab | Dr. Moyo",
    tags: ["CBC", "Hematology"],
  },
  {
    id: "NR-208",
    patient: "Jonas Muriuki",
    source: "Nurse",
    title: "Vitals check",
    detail: "BP 134/86, Temp 37.2 C, SpO2 98%. No distress.",
    status: "In Progress",
    time: "Today | 10:10 AM",
    staff: "Nurse | A. Kamara",
    tags: ["Vitals", "Monitoring"],
  },
  {
    id: "LR-1024",
    patient: "Cynthia Boateng",
    source: "Lab",
    title: "Malaria RDT",
    detail: "Negative. No parasites seen on smear.",
    status: "Ready",
    time: "Today | 09:40 AM",
    staff: "Lab | P. Adeyemi",
    tags: ["RDT", "Parasitology"],
  },
  {
    id: "NR-209",
    patient: "Michael Oduro",
    source: "Nurse",
    title: "Medication administered",
    detail: "Administered IV Ceftriaxone 1g. Tolerated well.",
    status: "Pending",
    time: "Today | 09:15 AM",
    staff: "Nurse | L. Banda",
    tags: ["Medication", "Antibiotic"],
  },
  {
    id: "LR-1025",
    patient: "Salma Bello",
    source: "Lab",
    title: "LFT panel",
    detail: "ALT mildly elevated. Recommend clinician review.",
    status: "Flagged",
    time: "Today | 08:55 AM",
    staff: "Lab | Dr. Kimani",
    tags: ["LFT", "Follow-up"],
  },
];

const treatmentPlans: TreatmentPlan[] = [
  {
    id: "TP-441",
    patient: "Sarah Keita",
    nextStep: "IV fluids and repeat CBC",
    due: "Today | 2:00 PM",
    owner: "Dr. A. Mensah",
    status: "Scheduled",
    route: "IV",
  },
  {
    id: "TP-442",
    patient: "Michael Oduro",
    nextStep: "Chest X-ray review, adjust antibiotics",
    due: "Today | 4:30 PM",
    owner: "Dr. S. Okoro",
    status: "Due",
    route: "Review",
  },
  {
    id: "TP-443",
    patient: "Cynthia Boateng",
    nextStep: "Discharge planning and counselling",
    due: "Tomorrow | 10:00 AM",
    owner: "Dr. J. Yeboah",
    status: "Scheduled",
    route: "Ward",
  },
];

const statusStyles: Record<CareRecord["status"], string> = {
  Ready: "bg-emerald-50 text-emerald-700 border-emerald-100",
  "In Progress": "bg-blue-50 text-blue-700 border-blue-100",
  Pending: "bg-amber-50 text-amber-700 border-amber-100",
  Flagged: "bg-red-50 text-red-700 border-red-100",
};

const treatmentStyles: Record<TreatmentPlan["status"], string> = {
  Scheduled: "bg-blue-50 text-blue-700 border-blue-100",
  Due: "bg-amber-50 text-amber-700 border-amber-100",
  Completed: "bg-emerald-50 text-emerald-700 border-emerald-100",
};

const CareBridgeModule = () => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "Lab" | "Nurse">("all");
  const [formState, setFormState] = useState({
    patient: "",
    test: "",
    priority: "Routine",
    notes: "",
  });
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const filteredFeed = useMemo(() => {
    const q = search.trim().toLowerCase();
    return incomingRecords.filter((record) => {
      const matchesFilter = filter === "all" || record.source === filter;
      const haystack = `${record.patient} ${record.title} ${record.detail} ${record.tags.join(
        " "
      )}`.toLowerCase();
      const matchesSearch = !q || haystack.includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [search, filter]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setFormMessage(
      "Lab request drafted. This UI version does not send data yet."
    );
    setFormState((prev) => ({ ...prev, test: "", notes: "" }));
    setTimeout(() => setFormMessage(null), 4000);
  };

  return (
    <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-screen-2xl space-y-6">
        <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-blue-900 to-slate-800 text-white shadow-lg">
          <div className="flex flex-col gap-6 px-6 py-8 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100/80">
                Care Bridge
              </p>
              <h1 className="text-2xl font-semibold">Clinical inbox</h1>
              <p className="max-w-2xl text-sm text-blue-100/80">
                One workspace for doctors to review lab results, nursing updates, and plan next treatments without leaving the chart.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 rounded-2xl bg-white/10 p-4 text-sm">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-blue-100/70">
                  Ready results
                </p>
                <p className="text-2xl font-semibold leading-tight">
                  {
                    incomingRecords.filter((item) => item.status === "Ready")
                      .length
                  }
                </p>
                <p className="text-[11px] text-blue-100/70">New since morning</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-blue-100/70">
                  Treatments today
                </p>
                <p className="text-2xl font-semibold leading-tight">
                  {treatmentPlans.length}
                </p>
                <p className="text-[11px] text-blue-100/70">
                  Scheduled or due
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.4fr,0.8fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Incoming updates
                  </p>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Lab and nursing feed
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {(["all", "Lab", "Nurse"] as const).map((option) => (
                    <button
                      key={option}
                      onClick={() => setFilter(option)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        filter === option
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {option === "all" ? "All" : option}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className="relative w-full max-w-sm">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search patient, test, or note"
                    className="w-full rounded-full border border-slate-200 bg-white px-3 py-2 pl-9 text-sm shadow-inner placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
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
              </div>
              <div className="mt-4 space-y-3">
                {filteredFeed.map((record) => (
                  <div
                    key={record.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 shadow-inner"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                            {record.source}
                          </span>
                          <p className="text-xs text-slate-500">
                            {record.time}
                          </p>
                        </div>
                        <h3 className="mt-1 text-sm font-semibold text-slate-900">
                          {record.patient} - {record.title}
                        </h3>
                        <p className="text-sm text-slate-600">
                          {record.detail}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-600">
                            {record.staff}
                          </span>
                          {record.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-500"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <span
                        className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${statusStyles[record.status]}`}
                      >
                        {record.status}
                      </span>
                    </div>
                  </div>
                ))}
                {filteredFeed.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
                    No updates match your filters.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Treatment runway
                  </p>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Next clinical actions
                  </h2>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {treatmentPlans.length} plans
                </span>
              </div>
              <div className="mt-4 divide-y divide-slate-100">
                {treatmentPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {plan.patient} - {plan.nextStep}
                      </p>
                      <p className="text-xs text-slate-500">
                        Owner: {plan.owner} | Route: {plan.route}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-800">
                        {plan.due}
                      </p>
                      <span
                        className={`mt-1 inline-block rounded-full border px-3 py-1 text-[11px] font-semibold ${treatmentStyles[plan.status]}`}
                      >
                        {plan.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Quick overview
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">
                    Lab ready
                  </p>
                  <p className="text-xl font-semibold text-slate-900">
                    {
                      incomingRecords.filter(
                        (r) => r.source === "Lab" && r.status === "Ready"
                      ).length
                    }
                  </p>
                  <p className="text-xs text-slate-500">
                    Awaiting clinician review
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">
                    Nurse updates
                  </p>
                  <p className="text-xl font-semibold text-slate-900">
                    {incomingRecords.filter((r) => r.source === "Nurse").length}
                  </p>
                  <p className="text-xs text-slate-500">New at bedside</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Submit to lab
                  </p>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Request a test
                  </h3>
                  <p className="text-sm text-slate-500">
                    Draft a lab order without leaving this workspace.
                  </p>
                </div>
              </div>
              {formMessage && (
                <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  {formMessage}
                </div>
              )}
              <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">
                    Patient
                  </label>
                  <input
                    value={formState.patient}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        patient: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    placeholder="Patient name or ID"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">
                    Test / panel
                  </label>
                  <input
                    value={formState.test}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        test: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    placeholder="e.g. LFT, CBC, Malaria RDT"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">
                      Priority
                    </label>
                    <select
                      value={formState.priority}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          priority: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    >
                      <option>Routine</option>
                      <option>Urgent</option>
                      <option>Stat</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">
                      Owner
                    </label>
                    <input
                      value="You"
                      readOnly
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">
                    Notes to lab
                  </label>
                  <textarea
                    value={formState.notes}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        notes: event.target.value,
                      }))
                    }
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    placeholder="Clinical question, sample type, handling instructions"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setFormState({
                        patient: "",
                        test: "",
                        priority: "Routine",
                        notes: "",
                      })
                    }
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Clear
                  </button>
                  <button
                    type="submit"
                    className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                  >
                    Send to lab
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default CareBridgeModule;
