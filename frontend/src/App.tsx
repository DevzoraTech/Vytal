// @ts-nocheck
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, JSX } from "react";
import {
  LAB_TEST_CATALOG,
  PATIENT_DIRECTORY_TABS,
  PATIENT_SUB_PAGES,
  PATIENT_TABS,
  type Admission,
  type AppointmentEntry,
  type MedicalRecordEntry,
  type PaginatedResponse,
  type Patient,
  type PatientDirectoryTab,
  type TreatmentPlanEntry,
} from "./modules/patients/types"; //
import {
  categorizePatientStatus,
  getLatestAdmission,
  isLabNote,
  patientReadyForTreatment,
} from "./modules/patients/utils";
import ConsultationModule from "./modules/consultation/ConsultationModule";
import { MODULE_LABELS, type ModuleKey, type User } from "./types/auth";
import {
  createDefaultTriageForm,
  type TriageFormState,
  type TriagePatientEntry,
  type TriageTab,
} from "./modules/triage/types";
import TriageModule from "./modules/triage/TriageModule";
import LabModule from "./modules/lab/LabModule";
import {
  type LabQueueEntry,
  type LabRecordEntry,
  type LabOrder,
  type LabResultFormState,
  type LabTask,
  type LabTab,
  LAB_TESTS,
} from "./modules/lab/types";
import type { CarePlan, ConsultationEvent } from "./modules/consultation/types";
import { CARD_CLASS, CARD_SECTION_CLASS } from "./ui/styles";

const inferProdApiBase = () => {
  if (typeof window === "undefined") return null;
  const host = window.location.hostname;
  if (host.endsWith("devzoratech.com")) {
    return "https://vytal-zg8y.onrender.com/api";
  }
  return null;
};

const API_BASE_URL =
  import.meta.env.VITE_API_URL || inferProdApiBase() || "/api";
const TOKEN_STORAGE_KEY = "vytal-token";
const PATIENT_ID_PREFIX_KEY = "vytal-patient-id-prefix";
const PATIENT_ID_COUNTER_KEY = "vytal-patient-id-counter";

const sanitizePrefix = (value: string) =>
  value
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase()
    .slice(0, 8);
const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

type NavIcon = (props: { active: boolean }) => JSX.Element;

const strokeColor = (active: boolean) => (active ? "#008000" : "#9CA3AF");

const DashboardIcon: NavIcon = ({ active }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke={strokeColor(active)}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="7" height="9" rx="1" />
    <rect x="14" y="3" width="7" height="5" rx="1" />
    <rect x="14" y="12" width="7" height="9" rx="1" />
    <rect x="3" y="15" width="7" height="6" rx="1" />
  </svg>
);

const TriageIcon: NavIcon = ({ active }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke={strokeColor(active)}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <path d="M12 7v10" />
    <path d="M7 12h10" />
  </svg>
);

const PatientsIcon: NavIcon = ({ active }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke={strokeColor(active)}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="8" r="3.2" />
    <path d="M4 21v-1.8a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6V21" />
    <path d="M18.5 7.5a3 3 0 0 1 2.5 2.9V14" />
    <path d="M21 12h-3" />
  </svg>
);

const ConsultationIcon: NavIcon = ({ active }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke={strokeColor(active)}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 4h7a3 3 0 0 1 3 3v2a3 3 0 0 1-3 3H8l-3 3V7a3 3 0 0 1 3-3Z" />
    <path d="M15.5 14.5 18 17" />
    <path d="M14 20h5" />
    <path d="M16.5 17V7" />
  </svg>
);

const CalendarIcon: NavIcon = ({ active }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke={strokeColor(active)}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <circle cx="16" cy="15" r="1" />
  </svg>
);

const BillingIcon: NavIcon = ({ active }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke={strokeColor(active)}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="6" width="18" height="12" rx="2" />
    <line x1="3" y1="11" x2="21" y2="11" />
    <line x1="7" y1="15" x2="9" y2="15" />
    <line x1="11" y1="15" x2="13" y2="15" />
  </svg>
);

const PharmacyIcon: NavIcon = ({ active }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke={strokeColor(active)}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10 3h4" />
    <path d="M8 5h8l1 5H7l1-5Z" />
    <rect x="7" y="10" width="10" height="10" rx="2" />
    <path d="M12 14v4" />
    <path d="M10 16h4" />
  </svg>
);

const LabIcon: NavIcon = ({ active }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke={strokeColor(active)}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M7 3h10" />
    <path d="M9 3v7.5L4.5 20a1 1 0 0 0 .9 1.5h13.2a1 1 0 0 0 .9-1.5L15 10.5V3" />
    <path d="M6 17h12" />
  </svg>
);

const InventoryIcon: NavIcon = ({ active }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke={strokeColor(active)}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 9h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9Z" />
    <path d="M3 9l9-6 9 6" />
    <path d="M9 22V12h6v10" />
  </svg>
);

const ReportsIcon: NavIcon = ({ active }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke={strokeColor(active)}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 21V10" />
    <path d="M10 21V3" />
    <path d="M16 21v-8" />
    <path d="M22 21V6" />
  </svg>
);

const SupportIcon: NavIcon = ({ active }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke={strokeColor(active)}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="4" />
    <path d="M4.93 4.93l3.18 3.18" />
    <path d="M19.07 4.93l-3.18 3.18" />
    <path d="M4.93 19.07l3.18-3.18" />
    <path d="M19.07 19.07l-3.18-3.18" />
  </svg>
);

const NAV_SECTIONS: {
  title: string;
  items: { key: ModuleKey; label: string; icon: NavIcon }[];
}[] = [
    {
      title: "Workspace",
      items: [
        { key: "dashboard", label: "Dashboard", icon: DashboardIcon },
        { key: "triage", label: "Triage", icon: TriageIcon },
        { key: "patients", label: "Clinician", icon: PatientsIcon },
        { key: "consultation", label: "Consultation", icon: ConsultationIcon },
        { key: "appointments", label: "Appointments", icon: CalendarIcon },
        { key: "billing", label: "Finance", icon: BillingIcon },
        { key: "pharmacy", label: "Pharmacy", icon: PharmacyIcon },
        { key: "laboratory", label: "Laboratory", icon: LabIcon },
        { key: "inventory", label: "Inventory", icon: InventoryIcon },
        { key: "reports", label: "Reports", icon: ReportsIcon },
        { key: "support", label: "Support", icon: SupportIcon },
      ],
    },
  ];


interface ScheduleItem {
  day_number: number;
  date: string;
  time: string;
  duration: string;
  activity: string;
  status?: "pending" | "completed" | "missed";
}

function App() {
  const [token, setToken] = useState<string | null>(() =>
    typeof window !== "undefined"
      ? localStorage.getItem(TOKEN_STORAGE_KEY)
      : null
  );
  const [user, setUser] = useState<User | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [patientIdPrefix] = useState(() => {
    if (typeof window === "undefined") {
      return "PAT";
    }
    const stored = localStorage.getItem(PATIENT_ID_PREFIX_KEY) ?? "PAT";
    const normalized = sanitizePrefix(stored);
    return normalized || "PAT";
  });
  const [patientSubPage, setPatientSubPage] =
    useState<(typeof PATIENT_SUB_PAGES)[number]>("Patient Directory");
  const [patientDirectoryTab, setPatientDirectoryTab] =
    useState<PatientDirectoryTab>("Queue");
  const [patientDirectoryPage, setPatientDirectoryPage] = useState(1);
  const getLocalISODate = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().split("T")[0];
  };
  const [activeModule, setActiveModule] = useState<ModuleKey>("dashboard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [savingPatient, setSavingPatient] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [patientTab, setPatientTab] =
    useState<(typeof PATIENT_TABS)[number]>("Summary");
  const [appointmentStatusFilter] = useState("all");
  const [appointmentProviderFilter] = useState("all");
  const [appointmentOutcomeFilter] = useState("all");
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [appointmentForm, setAppointmentForm] = useState({
    admissionId: "",
    visitType: "",
    scheduledDate: "",
    scheduledTime: "",
    providerName: "",
    providerRole: "",
    summary: "",
    complaints: "",
    followUp: "",
  });
  const [appointmentSubmitting, setAppointmentSubmitting] = useState(false);
  const [triageActiveTab, setTriageActiveTab] =
    useState<TriageTab>("assessment");
  const [triageForm, setTriageForm] = useState<TriageFormState>(() =>
    createDefaultTriageForm()
  );
  const [carePlans, setCarePlans] = useState<CarePlan[]>([]);
  const [patientEvents, setPatientEvents] = useState<ConsultationEvent[]>([]);
  const [patientLabResults, setPatientLabResults] = useState<LabResultEntry[]>([]);
  const [triagePatients, setTriagePatients] = useState<TriagePatientEntry[]>(
    []
  );
  const [triageEditingId, setTriageEditingId] = useState<number | null>(null);
  const [triageFetchError, setTriageFetchError] = useState<string | null>(null);
  const [labActiveTab, setLabActiveTab] = useState<LabTab>("queue");
  const [labQueue, setLabQueue] = useState<LabQueueEntry[]>([]);
  const [labRecords, setLabRecords] = useState<LabRecordEntry[]>([]);
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
  const [labTasks, setLabTasks] = useState<LabTask[]>([]);
  const [labModalOpen, setLabModalOpen] = useState(false);
  const [labCompletedTests, setLabCompletedTests] = useState<
    Record<number, Set<string>>
  >({});
  const [labResultForm, setLabResultForm] = useState<LabResultFormState>({
    triageEntryId: null,
    testType: "",
    summary: "",
    results: "",
    recordedAt: "",
  });
  const [labError, setLabError] = useState<string | null>(null);
  const [labFetchError, setLabFetchError] = useState<string | null>(null);
  const [labCategory, setLabCategory] = useState("");
  const [labNumeric, setLabNumeric] = useState("");
  const defaultUrinalysis = {
    leukocytes: "",
    nitrite: "",
    urobilinogen: "",
    protein: "",
    ph: "",
    specific_gravity: "",
    blood: "",
    ketone: "",
    bilirubin: "",
    glucose: "",
    appearance: "",
    colour: "",
    consistency: "",
    mucus: "",
    amorphous: "",
    epithelial_cells: "",
    pus_cells: "",
    yeast_cells: "",
    casts: "",
  };
  const defaultStool = {
    appearance: "",
    colour: "",
    consistency: "",
    blood: "",
    mucus: "",
  };
  const defaultElectrolytes = {
    na: "",
    k: "",
    cl: "",
  };
  const [labCategoricalOptions] = useState<Record<string, string[]>>({
    "Blood Slide": ["No mps seen", "mps seen"],
    "Widal Typhoid IgG": ["Negative", "IgG / IgM positive", "IgM positive"],
    "H. pylori Ab": ["Negative", "Positive"],
    HCT: ["Negative", "Positive"],
    "RPR / VDRL": ["Negative", "Positive"],
    HBsAg: ["Negative", "Positive"],
    BAT: ["Non-reactive", "Reactive"],
    "H. pylori Ag": ["Negative", "Positive"],
    "HCG Urine": ["Negative", "Positive"],
    "HCG Serum": ["Negative", "Positive"],
    MRDT: ["Negative", "Positive"],
    "Blood Group": [
      "A Rh+",
      "A Rh-",
      "B Rh+",
      "B Rh-",
      "AB Rh+",
      "AB Rh-",
      "O Rh+",
      "O Rh-",
    ],
    "Rheumatoid Factor": ["Reactive", "Non-reactive"],
  });
  const [urinalysisForm, setUrinalysisForm] = useState(defaultUrinalysis);
  const [stoolForm, setStoolForm] = useState(defaultStool);
  const [electrolytesForm, setElectrolytesForm] =
    useState(defaultElectrolytes);
  const [labTestDrafts, setLabTestDrafts] = useState<
    Record<
      string,
      {
        category?: string;
        numeric?: string;
        results?: string;
        urinalysis?: typeof defaultUrinalysis;
        stool?: typeof defaultStool;
        electrolytes?: typeof defaultElectrolytes;
      }
    >
  >({});
  const [triageSaveError, setTriageSaveError] = useState<string | null>(null);
  const [carePlanNumDays, setCarePlanNumDays] = useState<number>(0);
  const [carePlanSchedule, setCarePlanSchedule] = useState<ScheduleItem[]>([]);
  const [scheduleManagerOpen, setScheduleManagerOpen] = useState(false);
  const [scheduleManagerPlanId, setScheduleManagerPlanId] = useState<number | null>(null);
  const [scheduleManagerItems, setScheduleManagerItems] = useState<(ScheduleItem & { locked?: boolean })[]>([]);
  const [scheduleManagerLoading, setScheduleManagerLoading] = useState(false);
  type TriageApiEntry = {
    id: number;
    full_name: string;
    age: number;
    sex: string;
    arrival_method: string;
    admission_date: string;
    temperature_c: string | number | null;
    weight_kg: string | number | null;
    symptoms: string;
    status: string;
    phone_number?: string;
    email?: string;
    address?: string;
    contact_name?: string;
    contact_phone?: string;
    allergies?: string;
  };
  const mapTriageEntry = useCallback(
    (entry: TriageApiEntry): TriagePatientEntry => ({
      id: entry.id,
      status: entry.status || "triage",
      name: entry.full_name,
      age: entry.age?.toString?.() || "",
      sex: entry.sex || "",
      arrival: entry.arrival_method || "Walk-in",
      date: entry.admission_date,
      temperature:
        entry.temperature_c === null || entry.temperature_c === undefined
          ? ""
          : entry.temperature_c.toString(),
      weight:
        entry.weight_kg === null || entry.weight_kg === undefined
          ? ""
          : entry.weight_kg.toString(),
      symptoms: entry.symptoms || "",
      phone: entry.phone_number || "",
      email: entry.email || "",
      address: entry.address || "",
      contactName: entry.contact_name || "",
      contactPhone: entry.contact_phone || "",
      allergies: entry.allergies || "",
    }),
    []
  );
  const loadTriagePatients = useCallback(async () => {
    if (!token) {
      setTriagePatients([]);
      setTriageFetchError(null);
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/triage/`, {
        headers: { Authorization: `Token ${token}` },
      });
      if (!response.ok) {
        throw new Error("Unable to load triage patients");
      }
      const raw = (await response.json()) as unknown;
      const entries = Array.isArray(raw)
        ? raw
        : Array.isArray((raw as any).results)
          ? (raw as any).results
          : [];
      setTriagePatients(entries.map(mapTriageEntry));
      setTriageFetchError(null);
    } catch (err) {
      console.error(err);
      setTriagePatients([]);
      setTriageFetchError(
        err instanceof Error ? err.message : "Unable to load triage patients"
      );
    }
  }, [token, mapTriageEntry]);
  const [appointmentFormError, setAppointmentFormError] = useState<
    string | null
  >(null);
  const [treatmentForm, setTreatmentForm] = useState({
    admissionId: "",
    scheduledDate: "",
    planDetails: "",
    frequency: "",
  });
  const [treatmentSubmitting, setTreatmentSubmitting] = useState(false);
  const [treatmentMessage, setTreatmentMessage] = useState<string | null>(null);
  const [nextReviewPreview, setNextReviewPreview] = useState<{
    admissionId: number | null;
    scheduled_for: string;
  } | null>(null);
  const [treatmentNoteForm, setTreatmentNoteForm] = useState({
    admissionId: "",
    recordedAt: "",
    nextTreatmentDate: "",
    nextTreatmentTime: "",
    systolic: "",
    diastolic: "",
    pulse: "",
    respirationRate: "",
    temperature: "",
    oxygen: "",
    complaints: "",
    summary: "",
    route: "",
    remarks: "",
  });
  const [treatmentNoteSubmitting, setTreatmentNoteSubmitting] = useState(false);
  const [treatmentNoteMessage, setTreatmentNoteMessage] = useState<
    string | null
  >(null);
  const [treatmentNoteError, setTreatmentNoteError] = useState<string | null>(
    null
  );
  const [showTreatmentHistory, setShowTreatmentHistory] = useState(false);
  const [patientForm, setPatientForm] = useState({
    first_name: "",
    last_name: "",
    patient_identifier: "",
    age: "",
    gender: "",
    weight_kg: "",
    phone_number: "",
    email: "",
    address: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
  });
  const [initialAdmissionForm, setInitialAdmissionForm] = useState({
    admission_date: "",
    discharge_date: "",
    review_date: "",
    provisional_diagnosis: "",
    final_diagnosis: "",
    treatment_frequency: "",
    treatment_duration: "",
    lab_tests_done: "",
    lab_tests_list: [] as string[],
    next_of_kin_name: "",
    next_of_kin_contact: "",
    allergies: "",
    contraindications: "",
  });
  const [patientFormStep, setPatientFormStep] = useState<
    "identity" | "admission"
  >("identity");
  const [showClinicalForm, setShowClinicalForm] = useState(false);
  const searchInitializedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }, [token]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (patientIdPrefix) {
      localStorage.setItem(PATIENT_ID_PREFIX_KEY, patientIdPrefix);
    } else {
      localStorage.removeItem(PATIENT_ID_PREFIX_KEY);
    }
  }, [patientIdPrefix]);

  const treatmentReadyPatients = useMemo(
    () => patients.filter(patientReadyForTreatment),
    [patients]
  );
  useEffect(() => {
    const count = treatmentReadyPatients.filter(
      (patient) => categorizePatientStatus(patient) === patientDirectoryTab
    ).length;
    const totalPages = Math.max(1, Math.ceil(count / 10));
    setPatientDirectoryPage((prev) => Math.min(prev, totalPages));
  }, [treatmentReadyPatients, patientDirectoryTab]);
  // Placeholder until treatment plans are sourced; prevents runtime errors when previewing schedules
  const nextTreatmentPlans: TreatmentPlanEntry[] = [];
  const selectedPatient = useMemo(() => {
    if (!selectedPatientId) return null;
    return patients.find((patient) => patient.id === selectedPatientId) ?? null;
  }, [patients, selectedPatientId]);
  useEffect(() => {
    if (
      selectedPatientId &&
      treatmentReadyPatients.some((patient) => patient.id === selectedPatientId)
    ) {
      return;
    }
    const nextId = treatmentReadyPatients[0]?.id ?? null;
    if (nextId !== selectedPatientId) {
      setSelectedPatientId(nextId);
    }
  }, [selectedPatientId, treatmentReadyPatients]);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setBootstrapping(false);
      return;
    }
    const controller = new AbortController();
    const fetchMe = async () => {
      setBootstrapping(true);
      try {
        const response = await fetch(`${API_BASE_URL}/auth/me/`, {
          headers: { Authorization: `Token ${token}` },
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("Unauthorized");
        }
        const payload = (await response.json()) as User;
        setUser(payload);
      } catch {
        if (!controller.signal.aborted) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setBootstrapping(false);
        }
      }
    };
    fetchMe();
    return () => controller.abort();
  }, [token]);

  const formatDateTime = useCallback((value: string) => {
    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp)) {
      return value || "Not recorded";
    }
    const date = new Date(timestamp);
    return `${date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })} · ${date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }, []);
  const formatDateOnly = useCallback((value: string) => {
    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp)) {
      return value || "Not recorded";
    }
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, []);
  const appointmentEntries = useMemo<AppointmentEntry[]>(() => {
    if (!selectedPatient) {
      return [];
    }
    const entries: AppointmentEntry[] = [];
    const now = Date.now();
    selectedPatient.admissions.forEach((admission) => {
      const baseVisitType =
        admission.provisional_diagnosis || "General Consultation";
      if (admission.clinical_notes.length === 0) {
        entries.push({
          id: `admission-${admission.id}`,
          admissionId: admission.id,
          scheduled_at: `${admission.admission_date}T09:00:00Z`,
          provider_name: admission.patient_name || "Attending team",
          provider_role: "Care Team",
          visit_type: baseVisitType,
          status: admission.status === "active" ? "Pending" : "Completed",
          outcome: admission.final_diagnosis || "Evaluation pending",
          notes: admission.treatment_duration || "",
        });
        return;
      }
      admission.clinical_notes.forEach((note) => {
        const noteTimestamp = Date.parse(note.documented_at);
        const status =
          Number.isNaN(noteTimestamp) || noteTimestamp <= now
            ? admission.status === "active"
              ? "Completed"
              : "Filed"
            : "Scheduled";
        entries.push({
          id: `note-${note.id}`,
          admissionId: admission.id,
          scheduled_at: note.documented_at,
          provider_name: note.recorded_by_name,
          provider_role: note.recorded_by_role,
          visit_type: note.treatment_route || baseVisitType,
          status,
          outcome:
            note.remarks || note.treatment_details || "Pending documentation",
          notes: note.complaints || admission.final_diagnosis || "",
        });
      });
    });
    return entries.sort(
      (a, b) => Date.parse(b.scheduled_at) - Date.parse(a.scheduled_at)
    );
  }, [selectedPatient]);
  const hasPatientAccess = useMemo(
    () => user?.modules?.includes("patients") ?? false,
    [user]
  );

  const loadPatients = useCallback(
    async (term = "") => {
      if (!token || !hasPatientAccess) {
        setPatients([]);
        setSelectedPatientId(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `${API_BASE_URL}/patients/${term ? `?q=${encodeURIComponent(term)}` : ""
          }`,
          {
            headers: { Authorization: `Token ${token}` },
          }
        );
        if (response.status === 401) {
          throw new Error("Unauthorized");
        }
        if (!response.ok) {
          throw new Error("Unable to load patients");
        }
        const payload = (await response.json()) as
          | PaginatedResponse<Patient>
          | Patient[];
        const entries = Array.isArray(payload)
          ? payload
          : payload.results ?? [];
        setPatients(entries);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unexpected error occurred";
        setError(message);
        if (message === "Unauthorized") {
          setToken(null);
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    },
    [token, hasPatientAccess]
  );

  const loadLabQueue = useCallback(async () => {
    if (!token) {
      setLabQueue([]);
      setLabFetchError(null);
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/lab/queue/`, {
        headers: { Authorization: `Token ${token}` },
      });
      if (!response.ok) {
        throw new Error("Unable to load lab queue");
      }
      const raw = (await response.json()) as unknown;
      const payload = Array.isArray(raw)
        ? raw
        : Array.isArray((raw as any).results)
          ? (raw as any).results
          : [];
      const entries: LabQueueEntry[] = payload.map((entry: any) => {
        const rawIdentifier =
          entry.patient_identifier ||
          entry.patient_id ||
          entry.patient ||
          entry.patientID;
        const derivedIdentifier =
          typeof rawIdentifier === "number"
            ? `PMA${String(rawIdentifier).padStart(4, "0")}`
            : rawIdentifier || null;
        return {
          id: entry.id,
          name: entry.full_name || entry.name || "Patient",
          age: entry.age?.toString?.() || "",
          sex: entry.sex || "",
          arrival: entry.arrival_method || "Walk-in",
          date: entry.admission_date || entry.date || "",
          symptoms: entry.symptoms || "",
          status: entry.status || "triage",
          patient_identifier: derivedIdentifier,
        };
      });
      setLabQueue(entries);
      setLabFetchError(null);
    } catch (err) {
      console.error(err);
      setLabQueue([]);
      setLabFetchError(
        err instanceof Error ? err.message : "Unable to load lab queue"
      );
    }
  }, [token]);

  const loadLabRecords = useCallback(async () => {
    if (!token) {
      setLabRecords([]);
      setLabFetchError(null);
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/lab-results/`, {
        headers: { Authorization: `Token ${token}` },
      });
      if (!response.ok) {
        throw new Error("Unable to load lab records");
      }
      const raw = (await response.json()) as unknown;
      const payload = Array.isArray(raw)
        ? raw
        : Array.isArray((raw as any).results)
          ? (raw as any).results
          : [];
      setLabRecords(
        payload.map((entry: any) => ({
          id: entry.id,
          patient_name: entry.patient_name || entry.patient || "Patient",
          test_type: entry.test_type,
          summary: entry.summary,
          recorded_at: entry.recorded_at,
          recorded_by_name: entry.recorded_by_name,
        }))
      );
      setLabFetchError(null);
    } catch (err) {
      console.error(err);
      setLabRecords([]);
      setLabFetchError(
        err instanceof Error ? err.message : "Unable to load lab records"
      );
    }
  }, [token]);

  const loadLabOrders = useCallback(async () => {
    if (!token) {
      setLabOrders([]);
      setLabFetchError(null);
      return;
    }
    try {
      const response = await fetch(
        `${API_BASE_URL}/consultation/lab-orders/?status=submitted`,
        {
          headers: { Authorization: `Token ${token}` },
        }
      );
      if (!response.ok) {
        throw new Error("Unable to load lab orders");
      }
      const raw = (await response.json()) as unknown;
      const payload = Array.isArray(raw)
        ? raw
        : Array.isArray((raw as any).results)
          ? (raw as any).results
          : [];
      setLabOrders(
        payload.map((order: any) => ({
          id: order.id,
          admission: order.admission,
          triage_entry: order.triage_entry ?? null,
          ordered_by: order.ordered_by ?? null,
          patient_id: order.patient_id ?? null,
          patient_name: order.patient_name ?? "Patient",
          patient_identifier: order.patient_identifier ?? null,
          status: order.status,
          priority: order.priority,
          order_items: order.order_items || [],
          clinical_question: order.clinical_question || "",
          notes_to_lab: order.notes_to_lab || "",
          policy_bypass: Boolean(order.policy_bypass),
          created_at: order.created_at,
        }))
      );
      setLabFetchError(null);
    } catch (err) {
      console.error(err);
      setLabOrders([]);
      setLabFetchError(
        err instanceof Error ? err.message : "Unable to load lab orders"
      );
    }
  }, [token]);

  const loadLabTasks = useCallback(async () => {
    if (!token) {
      setLabTasks([]);
      return;
    }
    try {
      const response = await fetch(
        `${API_BASE_URL}/consultation/tasks/?status=open&target_role=lab`,
        {
          headers: { Authorization: `Token ${token}` },
        }
      );
      if (!response.ok) {
        throw new Error("Unable to load lab tasks");
      }
      const raw = (await response.json()) as unknown;
      const payload = Array.isArray(raw)
        ? raw
        : Array.isArray((raw as any).results)
          ? (raw as any).results
          : [];
      setLabTasks(
        payload.map((task: any) => ({
          id: task.id,
          admission: task.admission,
          lab_order: task.lab_order ?? null,
          task_type: task.task_type,
          target_role: task.target_role || "",
          status: task.status,
          message: task.message || "",
          created_at: task.created_at,
        }))
      );
    } catch (err) {
      console.error(err);
      setLabTasks([]);
    }
  }, [token]);

  useEffect(() => {
    if (token && hasPatientAccess) {
      loadPatients();
    }
  }, [token, hasPatientAccess, loadPatients]);

  useEffect(() => {
    searchInitializedRef.current = false;
  }, [token, hasPatientAccess]);

  useEffect(() => {
    if (!token || !hasPatientAccess) {
      return;
    }
    if (!searchInitializedRef.current) {
      searchInitializedRef.current = true;
      return;
    }
    const handler = setTimeout(() => {
      loadPatients(searchTerm);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm, token, hasPatientAccess, loadPatients]);

  useEffect(() => {
    setPatientTab("Summary");
    setShowTreatmentHistory(false);
  }, [selectedPatientId]);

  useEffect(() => {
    setNextReviewPreview(null);
  }, [selectedPatientId]);

  useEffect(() => {
    if (!token) {
      setTriagePatients([]);
      return;
    }
    loadTriagePatients();
  }, [token, loadTriagePatients]);

  useEffect(() => {
    if (triageActiveTab === "patients" && token) {
      loadTriagePatients();
    }
  }, [triageActiveTab, token, loadTriagePatients]);

  useEffect(() => {
    if (!token) {
      setLabQueue([]);
      setLabRecords([]);
      setLabTasks([]);
      return;
    }
    loadLabQueue();
    loadLabRecords();
    loadLabTasks();
  }, [token, loadLabQueue, loadLabRecords, loadLabTasks]);

  useEffect(() => {
    if (!token) {
      return;
    }
    if (labActiveTab === "queue") {
      loadLabQueue();
    } else if (labActiveTab === "records") {
      loadLabRecords();
    } else {
      loadLabOrders();
    }
    loadLabTasks();
  }, [labActiveTab, token, loadLabQueue, loadLabRecords, loadLabOrders, loadLabTasks]);

  useEffect(() => {
    if (!token) {
      return;
    }
    if (activeModule === "triage") {
      loadTriagePatients();
    }
    if (activeModule === "laboratory") {
      loadLabQueue();
      loadLabRecords();
      loadLabOrders();
      loadLabTasks();
    }
  }, [activeModule, token, loadTriagePatients, loadLabQueue, loadLabRecords, loadLabOrders, loadLabTasks]);

  useEffect(() => {
    if (!token || !selectedPatient) {
      setCarePlans([]);
      setPatientEvents([]);
      setPatientLabResults([]);
      return;
    }
    const latest = getLatestAdmission(selectedPatient);
    if (!latest) {
      setCarePlans([]);
      setPatientEvents([]);
      setPatientLabResults([]);
      return;
    }
    const loadPlans = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/consultation/care-plans/?admission=${latest.id}`,
          { headers: { Authorization: `Token ${token}` } }
        );
        if (!response.ok) {
          throw new Error("Unable to load care plans");
        }
        const raw = (await response.json()) as any;
        const payload = Array.isArray(raw)
          ? raw
          : Array.isArray(raw.results)
            ? raw.results
            : [];
        setCarePlans(payload);
      } catch (error) {
        console.error(error);
        setCarePlans([]);
      }
    };
    const loadEvents = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/consultation/events/?admission=${latest.id}`,
          { headers: { Authorization: `Token ${token}` } }
        );
        if (!response.ok) {
          throw new Error("Unable to load consultation events");
        }
        const raw = (await response.json()) as any;
        const payload = Array.isArray(raw)
          ? raw
          : Array.isArray(raw.results)
            ? raw.results
            : [];
        setPatientEvents(payload);
      } catch (error) {
        console.error(error);
        setPatientEvents([]);
      }
    };
    const loadLabResults = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/lab-results/?admission=${latest.id}`,
          { headers: { Authorization: `Token ${token}` } }
        );
        if (!response.ok) {
          throw new Error("Unable to load lab results");
        }
        const raw = (await response.json()) as any;
        const payload = Array.isArray(raw)
          ? raw
          : Array.isArray(raw.results)
            ? raw.results
            : [];
        setPatientLabResults(
          payload.map((result: any) => ({
            id: result.id,
            admission: result.admission,
            patient: result.patient,
            patient_identifier: result.patient_identifier ?? null,
            patient_name: result.patient_name ?? null,
            test_type: result.test_type,
            summary: result.summary,
            recorded_at: result.recorded_at,
            recorded_by_name: result.recorded_by_name,
            recorded_by_role: result.recorded_by_role,
            status: result.status,
          }))
        );
      } catch (error) {
        console.error(error);
        setPatientLabResults([]);
      }
    };
    void loadPlans();
    void loadEvents();
    void loadLabResults();
  }, [selectedPatient, token]);

  useEffect(() => {
    if (!nextReviewPreview) {
      return;
    }
    const nextPlan = nextTreatmentPlans[0];
    if (
      nextPlan &&
      nextPlan.scheduled_for === nextReviewPreview.scheduled_for
    ) {
      setNextReviewPreview(null);
    }
  }, [nextTreatmentPlans, nextReviewPreview]);

  useEffect(() => {
    if (!showClinicalForm) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowClinicalForm(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showClinicalForm]);

  useEffect(() => {
    if (!selectedPatient) {
      setAppointmentForm((prev) => ({
        ...prev,
        admissionId: "",
        scheduledDate: "",
        scheduledTime: "",
      }));
      setTreatmentForm({
        admissionId: "",
        scheduledDate: "",
        planDetails: "",
        frequency: "",
      });
      setTreatmentNoteForm((prev) => ({
        ...prev,
        admissionId: "",
        recordedAt: "",
        nextTreatmentDate: "",
        nextTreatmentTime: "",
      }));
      return;
    }
    const latestAdmission = getLatestAdmission(selectedPatient);
    if (!latestAdmission) {
      return;
    }
    const today = new Date().toISOString().split("T")[0];
    setAppointmentForm((prev) => ({
      ...prev,
      admissionId: prev.admissionId || String(latestAdmission.id),
      scheduledDate: prev.scheduledDate || today,
      scheduledTime: prev.scheduledTime || "",
      providerName:
        prev.providerName ||
        [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
        user?.username ||
        "",
      providerRole:
        prev.providerRole ||
        (user?.modules?.includes("appointments")
          ? "Scheduling"
          : user?.modules?.[0] || ""),
    }));
    setTreatmentForm((prev) => ({
      ...prev,
      admissionId: prev.admissionId || String(latestAdmission.id),
      scheduledDate: prev.scheduledDate || latestAdmission.review_date || today,
    }));
    setTreatmentNoteForm((prev) => ({
      ...prev,
      admissionId: prev.admissionId || String(latestAdmission.id),
      recordedAt: prev.recordedAt || today,
      nextTreatmentDate: prev.nextTreatmentDate || "",
      nextTreatmentTime: prev.nextTreatmentTime || "",
    }));
  }, [selectedPatient, user]);

  const handleLogout = useCallback(async () => {
    if (token) {
      try {
        await fetch(`${API_BASE_URL}/auth/logout/`, {
          method: "POST",
          headers: { Authorization: `Token ${token}` },
        });
      } catch {
        // ignore logout network errors
      }
    }
    setToken(null);
    setUser(null);
    setPatients([]);
    setSelectedPatientId(null);
  }, [token]);

  const moduleAccessSet = useMemo(() => {
    const set = new Set<ModuleKey>(user?.modules ?? []);
    if (set.has("patients") || set.has("laboratory")) {
    }
    return set;
  }, [user]);
  const visibleModuleOrder = useMemo(
    () =>
      NAV_SECTIONS.flatMap((section) =>
        section.items
          .map((item) => item.key)
          .filter((key) => moduleAccessSet.has(key))
      ),
    [moduleAccessSet]
  );
  const filteredNavSections = useMemo(
    () =>
      NAV_SECTIONS.map((section) => ({
        title: section.title,
        items: section.items.filter((item) => moduleAccessSet.has(item.key)),
      })).filter((section) => section.items.length > 0),
    [moduleAccessSet]
  );

  useEffect(() => {
    if (visibleModuleOrder.length === 0) {
      setActiveModule("patients");
      return;
    }
    if (!visibleModuleOrder.includes(activeModule)) {
      setActiveModule(visibleModuleOrder[0]);
    }
  }, [visibleModuleOrder, activeModule]);

  const deriveNextPatientIdentifier = useCallback(() => {
    const normalizedPrefix = sanitizePrefix(patientIdPrefix || "PAT") || "PAT";
    const regex = new RegExp(
      `^${escapeRegExp(normalizedPrefix)}-?(\\d+)$`,
      "i"
    );
    const highestFromPatients = patients.reduce((highest, patient) => {
      const identifier = patient.patient_identifier ?? "";
      const match = identifier.match(regex);
      if (!match) {
        return highest;
      }
      const value = Number(match[1]);
      return Number.isNaN(value) ? highest : Math.max(highest, value);
    }, 0);
    let storedCounter = 0;
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(PATIENT_ID_COUNTER_KEY);
        if (raw) {
          const counters = JSON.parse(raw) as Record<string, number>;
          storedCounter = counters[normalizedPrefix] ?? 0;
        }
      } catch {
        storedCounter = 0;
      }
    }
    const nextNumber = Math.max(highestFromPatients, storedCounter) + 1;
    return `${normalizedPrefix}-${String(nextNumber).padStart(4, "0")}`;
  }, [patientIdPrefix, patients]);

  const rememberPatientIdentifierSequence = useCallback(
    (identifier: string) => {
      if (typeof window === "undefined") {
        return;
      }
      const match = identifier.match(/^([A-Z0-9]+)-?(\d+)$/i);
      if (!match) {
        return;
      }
      const [, prefixRaw, numberRaw] = match;
      const prefix = sanitizePrefix(prefixRaw) || "PAT";
      const value = Number(numberRaw);
      if (Number.isNaN(value)) {
        return;
      }
      try {
        const raw = localStorage.getItem(PATIENT_ID_COUNTER_KEY);
        const counters = raw ? (JSON.parse(raw) as Record<string, number>) : {};
        if (!counters[prefix] || value > counters[prefix]) {
          counters[prefix] = value;
          localStorage.setItem(
            PATIENT_ID_COUNTER_KEY,
            JSON.stringify(counters)
          );
        }
      } catch {
        // ignore storage issues
      }
    },
    []
  );

  const handleTriageFieldChange = useCallback(
    (field: keyof TriageFormState, value: string) => {
      setTriageForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const resetTriageForm = useCallback(() => {
    setTriageForm(createDefaultTriageForm());
    setTriageEditingId(null);
    setTriageSaveError(null);
  }, []);

  const validateTriageForm = useCallback((form: TriageFormState) => {
    const fullName = form.fullName.trim();
    if (!fullName) {
      return "Full name is required.";
    }
    if (fullName.length > 100) {
      return "Full name should be 100 characters or fewer.";
    }

    const ageValue = form.age.trim();
    const ageNumber = Number(ageValue);
    if (!ageValue) {
      return "Age is required.";
    }
    if (!Number.isInteger(ageNumber) || ageNumber < 0 || ageNumber > 120) {
      return "Age must be a whole number between 0 and 120.";
    }

    const allowedSex = ["Female", "Male", "Other"];
    if (!allowedSex.includes(form.sex)) {
      return "Please select a valid sex.";
    }

    const address = form.address.trim();
    if (!address) {
      return "Address is required.";
    }
    if (address.length > 250) {
      return "Address should be 250 characters or fewer.";
    }

    const weightValue = form.weight.trim();
    if (weightValue) {
      const weightNumber = Number(weightValue);
      if (Number.isNaN(weightNumber) || weightNumber <= 0 || weightNumber > 300) {
        return "Weight must be a number between 0.1 and 300 kg.";
      }
    }

    const phone = form.phone.trim();
    const phonePattern = /^[0-9]{10}$/;
    if (!phone) {
      return "Phone number is required.";
    }
    if (!phonePattern.test(phone)) {
      return "Phone number must be exactly 10 digits (e.g., 0752123123).";
    }

    const contactPhone = form.contactPhone.trim();
    if (contactPhone && !phonePattern.test(contactPhone)) {
      return "Emergency contact phone must be exactly 10 digits.";
    }

    const email = form.email.trim();
    if (email) {
      const emailPattern = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
      if (!emailPattern.test(email)) {
        return "Enter a valid email address.";
      }
    }

    const temperature = form.temperature.trim();
    if (temperature) {
      const tempNumber = Number(temperature);
      if (Number.isNaN(tempNumber) || tempNumber < 30 || tempNumber > 45) {
        return "Temperature should be between 30°C and 45°C.";
      }
    }

    const admissionDate = form.admissionDate.trim();
    if (admissionDate) {
      const date = new Date(`${admissionDate}T00:00:00`);
      const today = new Date(`${getLocalISODate()}T00:00:00`);
      if (Number.isNaN(date.getTime())) {
        return "Admission date is invalid.";
      }
      if (date > today) {
        return "Admission date cannot be in the future.";
      }
    }

    return null;
  }, []);

  const handleTriageSave = useCallback(async () => {
    const validationError = validateTriageForm(triageForm);
    if (validationError) {
      setTriageSaveError(validationError);
      return;
    }
    if (!token) {
      setTriageSaveError("You must be logged in to save triage entries.");
      return;
    }
    const toNumber = (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) {
        return null;
      }
      const parsed = Number(trimmed);
      return Number.isNaN(parsed) ? null : parsed;
    };
    const admissionDate = triageForm.admissionDate || getLocalISODate();
    const basePatient = {
      full_name: triageForm.fullName.trim(),
      age: toNumber(triageForm.age) ?? 0,
      sex: triageForm.sex,
      arrival_method: triageForm.arrival,
      phone_number: triageForm.phone.trim(),
      email: triageForm.email.trim(),
      address: triageForm.address.trim(),
      admission_date: admissionDate,
      contact_name: triageForm.contactName.trim(),
      contact_phone: triageForm.contactPhone.trim(),
      symptoms: triageForm.symptoms.trim(),
      allergies: triageForm.allergies.trim(),
      temperature_c: toNumber(triageForm.temperature),
      weight_kg: toNumber(triageForm.weight),
      status: triageEditingId ? undefined : "triage",
    };
    const getErrorMessage = async (response: Response, fallback: string) => {
      try {
        const detail = (await response.json()) as Record<string, unknown>;
        if (typeof detail.detail === "string") {
          return detail.detail;
        }
        const firstField = Object.keys(detail)[0];
        const firstMessage = firstField
          ? Array.isArray(detail[firstField])
            ? detail[firstField]?.[0]
            : detail[firstField]
          : null;
        if (typeof firstMessage === "string") {
          return `${firstField ?? "Error"}: ${firstMessage}`;
        }
      } catch {
        // ignore parsing errors
      }
      return fallback;
    };
    let triageEntryId: number | null = triageEditingId;
    if (triageEditingId !== null) {
      try {
        const response = await fetch(
          `${API_BASE_URL}/triage/${triageEditingId}/`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Token ${token}`,
            },
            body: JSON.stringify(basePatient),
          }
        );
        if (!response.ok) {
          throw new Error(
            await getErrorMessage(response, "Unable to update triage entry")
          );
        }
        const updated = (await response.json()) as TriageApiEntry;
        setTriagePatients((prev) =>
          prev.map((entry) =>
            entry.id === triageEditingId ? mapTriageEntry(updated) : entry
          )
        );
        triageEntryId = updated.id;
      } catch (err) {
        window.alert(
          err instanceof Error ? err.message : "Unable to update triage entry"
        );
        setTriageSaveError(
          err instanceof Error ? err.message : "Unable to update triage entry"
        );
        return;
      }
    } else {
      try {
        const response = await fetch(`${API_BASE_URL}/triage/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${token}`,
          },
          body: JSON.stringify(basePatient),
        });
        if (!response.ok) {
          throw new Error(
            await getErrorMessage(response, "Unable to create triage entry")
          );
        }
        const created = (await response.json()) as TriageApiEntry;
        setTriagePatients((prev) => [...prev, mapTriageEntry(created)]);
        triageEntryId = created.id;
      } catch (err) {
        window.alert(
          err instanceof Error ? err.message : "Unable to save triage entry"
        );
        setTriageSaveError(
          err instanceof Error ? err.message : "Unable to save triage entry"
        );
        return;
      }
    }
    // Escalate to clinician so the admission is created and appears in Consultation.
    if (triageEntryId) {
      try {
        const escalateResponse = await fetch(
          `${API_BASE_URL}/triage/${triageEntryId}/escalate/`,
          {
            method: "POST",
            headers: { Authorization: `Token ${token}` },
          }
        );
        if (!escalateResponse.ok) {
          throw new Error(
            await getErrorMessage(
              escalateResponse,
              "Unable to escalate triage entry"
            )
          );
        }
      } catch (err) {
        window.alert(
          err instanceof Error
            ? err.message
            : "Unable to escalate triage entry to clinician"
        );
        setTriageSaveError(
          err instanceof Error
            ? err.message
            : "Unable to escalate triage entry to clinician"
        );
        return;
      }
    }
    setTriageSaveError(null);
    setTriageActiveTab("patients");
    resetTriageForm();
    await Promise.all([loadTriagePatients(), loadPatients(searchTerm)]);
  }, [
    triageForm,
    triageEditingId,
    token,
    mapTriageEntry,
    resetTriageForm,
    validateTriageForm,
    loadTriagePatients,
    loadPatients,
    searchTerm,
  ]);

  const handleTriageEscalation = useCallback(() => {
    const validationError = validateTriageForm(triageForm);
    if (validationError) {
      setTriageSaveError(validationError);
      return;
    }
    const basePatient = {
      full_name: triageForm.fullName.trim(),
      age: Number(triageForm.age) || 0,
      sex: triageForm.sex,
      phone_number: triageForm.phone,
      arrival_method: triageForm.arrival,
      email: triageForm.email,
      address: triageForm.address,
      admission_date: triageForm.admissionDate,
      contact_name: triageForm.contactName,
      contact_phone: triageForm.contactPhone,
      symptoms: triageForm.symptoms,
      allergies: triageForm.allergies,
      temperature_c: triageForm.temperature ? Number(triageForm.temperature) : null,
      weight_kg: triageForm.weight ? Number(triageForm.weight) : null,
      status: "treatment",
    };
    const escalate = async () => {
      try {
        let entryId = triageEditingId;
        if (entryId) {
          const response = await fetch(`${API_BASE_URL}/triage/${entryId}/`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Token ${token}`,
            },
            body: JSON.stringify(basePatient),
          });
          if (!response.ok) {
            throw new Error(
              await getErrorMessage(response, "Unable to update triage entry")
            );
          }
        } else {
          const response = await fetch(`${API_BASE_URL}/triage/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Token ${token}`,
            },
            body: JSON.stringify(basePatient),
          });
          if (!response.ok) {
            throw new Error(
              await getErrorMessage(response, "Unable to create triage entry")
            );
          }
          const created = (await response.json()) as TriageApiEntry;
          entryId = created.id;
          setTriagePatients((prev) => [...prev, mapTriageEntry(created)]);
        }
        if (!entryId) {
          throw new Error("Unable to determine triage entry for escalation");
        }
        const escalateResponse = await fetch(
          `${API_BASE_URL}/triage/${entryId}/escalate/`,
          {
            method: "POST",
            headers: { Authorization: `Token ${token}` },
          }
        );
        if (!escalateResponse.ok) {
          throw new Error(
            await getErrorMessage(
              escalateResponse,
              "Unable to escalate to clinician"
            )
          );
        }
        setTriageActiveTab("patients");
        resetTriageForm();
        await Promise.all([loadTriagePatients(), loadPatients(searchTerm)]);
      } catch (err) {
        window.alert(
          err instanceof Error ? err.message : "Unable to escalate triage entry"
        );
        setTriageSaveError(
          err instanceof Error ? err.message : "Unable to escalate triage entry"
        );
      }
    };
    void escalate();
  }, [
    triageForm,
    triageEditingId,
    token,
    validateTriageForm,
    resetTriageForm,
    loadTriagePatients,
    loadPatients,
    searchTerm,
    mapTriageEntry,
  ]);

  const handleTriageEdit = useCallback((patient: TriagePatientEntry) => {
    setTriageForm({
      fullName: patient.name,
      age: patient.age,
      sex: patient.sex,
      phone: patient.phone || "",
      arrival: patient.arrival,
      email: patient.email || "",
      address: patient.address || "",
      admissionDate: patient.date,
      contactName: patient.contactName || "",
      contactPhone: patient.contactPhone || "",
      symptoms: patient.symptoms,
      allergies: patient.allergies || "",
      temperature: patient.temperature,
      weight: patient.weight,
    });
    setTriageEditingId(patient.id);
    setTriageActiveTab("assessment");
  }, []);

  const handleOpenLabModal = useCallback(
    (entry: LabQueueEntry) => {
      setLabModalOpen(true);
      setLabError(null);
      const nowLocal = new Date();
      const nowLocalIso = new Date(
        nowLocal.getTime() - nowLocal.getTimezoneOffset() * 60000
      )
        .toISOString()
        .slice(0, 16);
      setLabResultForm((prev) => ({
        triageEntryId: entry.id,
        testType: "",
        summary: entry.symptoms || "",
        results: "",
        recordedAt: nowLocalIso,
      }));
      setLabTestDrafts({});
      setLabCategory("");
      setLabNumeric("");
      setUrinalysisForm(defaultUrinalysis);
      setStoolForm(defaultStool);
      setElectrolytesForm(defaultElectrolytes);
    },
    [defaultElectrolytes, defaultStool, defaultUrinalysis]
  );

  const loadDraftForTest = useCallback(
    (test: string) => {
      const draft = labTestDrafts[test] || {};
      setLabCategory(draft.category ?? "");
      setLabNumeric(draft.numeric ?? "");
      setLabResultForm((prev) => ({
        ...prev,
        testType: test,
        results: draft.results ?? "",
      }));
      setUrinalysisForm(draft.urinalysis ?? defaultUrinalysis);
      setStoolForm(draft.stool ?? defaultStool);
      setElectrolytesForm(draft.electrolytes ?? defaultElectrolytes);
      setLabError(null);
    },
    [labTestDrafts, defaultElectrolytes, defaultStool, defaultUrinalysis]
  );

  const persistDraftForCurrentTest = useCallback(
    (
      updates: Partial<{
        category: string;
        numeric: string;
        results: string;
        urinalysis: typeof defaultUrinalysis;
        stool: typeof defaultStool;
        electrolytes: typeof defaultElectrolytes;
      }>
    ) => {
      const test = labResultForm.testType;
      if (!test) {
        return;
      }
      setLabTestDrafts((prev) => ({
        ...prev,
        [test]: {
          ...prev[test],
          ...updates,
        },
      }));
    },
    [labResultForm.testType]
  );

  const validateLabForm = useCallback(() => {
    if (!labResultForm.testType.trim()) {
      return {
        message: "Test type is required.",
        fieldErrors: {} as Record<string, string>,
      };
    }
    return { message: null, fieldErrors: {} as Record<string, string> };
  }, [
    labResultForm.testType,
  ]);

  const handleLabResultSubmit = useCallback(async () => {
    if (!token) {
      setLabError("You must be logged in to record lab results.");
      return;
    }
    if (!labResultForm.triageEntryId) {
      setLabError("Select a patient from the queue.");
      return;
    }
    const { message: validationMessage } = validateLabForm();
    if (validationMessage) {
      setLabError(validationMessage);
      return;
    }
    const testType = labResultForm.testType;
    let derivedSummary = labResultForm.summary;
    let derivedPayload: Record<string, unknown> = {};
    const categoricalTests = new Set(Object.keys(labCategoricalOptions));
    if (categoricalTests.has(testType) && labCategory) {
      derivedSummary = labCategory;
      derivedPayload = { category: labCategory };
    } else if (testType === "RBS / FBS" && labNumeric) {
      const value = Number(labNumeric);
      let band = "Normal";
      if (value < 3.5) {
        band = "Low";
      } else if (value > 7.5) {
        band = "High";
      }
      derivedSummary = `RBS/FBS ${value} mmol/L · ${band}`;
      derivedPayload = { value, band };
    } else if (testType === "Electrolytes") {
      const filled = Object.entries(electrolytesForm).filter(
        ([, v]) => String(v ?? "").trim() !== ""
      );
      if (filled.length) {
        derivedSummary = filled
          .map(([k, v]) => `${k.toUpperCase()} ${v}`)
          .join(" | ");
        derivedPayload = filled.reduce(
          (acc, [k, v]) => ({ ...acc, [k]: v }),
          {}
        );
      }
    } else if (testType === "Urinalysis") {
      const filled = Object.entries(urinalysisForm).filter(
        ([, v]) => String(v ?? "").trim() !== ""
      );
      if (filled.length) {
        derivedSummary = "Urinalysis recorded";
        derivedPayload = filled.reduce(
          (acc, [k, v]) => ({ ...acc, [k]: v }),
          {}
        );
      }
    } else if (testType === "Stool Analysis") {
      const filled = Object.entries(stoolForm).filter(
        ([, v]) => String(v ?? "").trim() !== ""
      );
      if (filled.length) {
        derivedSummary = "Stool analysis recorded";
        derivedPayload = filled.reduce(
          (acc, [k, v]) => ({ ...acc, [k]: v }),
          {}
        );
      }
    } else {
      derivedSummary =
        labCategory ||
        labResultForm.summary ||
        labResultForm.results ||
        testType;
    }
    const recordedAtIso = new Date().toISOString();
    const payload = {
      triage_entry: labResultForm.triageEntryId,
      test_type: testType,
      summary: derivedSummary || labResultForm.summary || labResultForm.results,
      payload: {
        ...(derivedPayload || {}),
        results: labResultForm.results || undefined,
      },
      recorded_at: recordedAtIso,
    };
    try {
      const response = await fetch(`${API_BASE_URL}/lab-results/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        const message =
          typeof detail.detail === "string"
            ? detail.detail
            : "Unable to save lab result";
        throw new Error(message);
      }
      const created = (await response.json()) as LabRecordEntry;
      setLabRecords((prev) => [created, ...prev]);
      // Keep the patient in queue to allow recording multiple test results
      setLabQueue((prev) => prev);
      setLabCompletedTests((prev) => {
        const next = { ...prev };
        const id = labResultForm.triageEntryId ?? -1;
        const set = new Set(next[id] ?? []);
        set.add(labResultForm.testType);
        next[id] = set;
        return next;
      });
      // Refresh persisted lists so triage and lab history stay in sync
      loadLabRecords();
      loadTriagePatients();
      setLabTestDrafts((prev) => {
        const next = { ...prev };
        delete next[testType];
        return next;
      });
      setLabResultForm((prev) => ({
        ...prev,
        testType: "",
        results: "",
        recordedAt: new Date().toISOString(),
      }));
      setLabCategory("");
      setLabNumeric("");
      setUrinalysisForm(defaultUrinalysis);
      setStoolForm(defaultStool);
      setElectrolytesForm(defaultElectrolytes);
      setLabError(null);
      setLabActiveTab("records");
      // Refresh patients to reflect lab completion in the patient queue
      loadPatients(searchTerm);
    } catch (err) {
      setLabError(
        err instanceof Error ? err.message : "Unable to save lab result"
      );
    }
  }, [
    API_BASE_URL,
    labResultForm,
    labCategory,
    labNumeric,
    token,
    loadLabRecords,
    loadTriagePatients,
    validateLabForm,
    urinalysisForm,
    stoolForm,
    electrolytesForm,
    labCategoricalOptions,
    loadPatients,
    searchTerm,
  ]);

  useEffect(() => {
    if (!token) {
      setTriagePatients([]);
      return;
    }
    loadTriagePatients();
  }, [token, loadTriagePatients]);

  useEffect(() => {
    if (!showPatientForm) {
      return;
    }
    const nextIdentifier = deriveNextPatientIdentifier();
    setPatientForm((prev) =>
      prev.patient_identifier === nextIdentifier
        ? prev
        : { ...prev, patient_identifier: nextIdentifier }
    );
  }, [showPatientForm, deriveNextPatientIdentifier]);

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError(null);
    setLoginSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });
      const payload = (await response.json()) as {
        token?: string;
        user?: User;
        detail?: string;
      };
      if (!response.ok || !payload.token || !payload.user) {
        throw new Error(payload.detail ?? "Unable to log in");
      }
      setToken(payload.token);
      setUser(payload.user);
      setPatientSubPage("Patient Directory");
      setLoginForm({ username: "", password: "" });
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Unable to log in");
    } finally {
      setLoginSubmitting(false);
    }
  };

  const renderLogin = () => (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white/95 p-10 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/paleologo.png"
              alt="Paleo"
              className="h-12 w-12 rounded-2xl bg-white/70 p-1 object-contain shadow-sm"
            />
            <div>
              <p className="calibri font-semibold uppercase tracking-[0.2em] text-[#008000]">
                Paleo Medicals
              </p>
              <p className="text-xs text-slate-500 text-[#5c0099]">Doctor to Community</p>
            </div>
          </div>
          <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 shadow-inner">
            Secure Access
          </div>
        </div>

        <div className="mb-5 flex items-center justify-between rounded-full bg-slate-100 p-1 text-sm font-semibold text-slate-500">
          <div className="flex flex-1 items-center justify-center rounded-full bg-white px-4 py-2 text-slate-900 shadow-sm">
            Sign in
          </div>
          <div className="flex flex-1 items-center justify-center px-4 py-2">
            Register
          </div>
        </div>

        <div className="mb-6 space-y-1">
          <h3 className="text-2xl font-semibold text-slate-900 text-[#330066]">Welcome back</h3>
          <p className="text-sm text-slate-500">
            Please enter your credentials to access the workspace.
          </p>
        </div>

        {loginError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loginError}
          </div>
        )}

        <form className="space-y-5" onSubmit={handleLoginSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Username</label>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
              <input
                className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                value={loginForm.username}
                onChange={(event) =>
                  setLoginForm((prev) => ({
                    ...prev,
                    username: event.target.value,
                  }))
                }
                placeholder="Enter you username"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Password</label>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
              <input
                type="password"
                className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                value={loginForm.password}
                onChange={(event) =>
                  setLoginForm((prev) => ({
                    ...prev,
                    password: event.target.value,
                  }))
                }
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                className="text-xs font-semibold text-slate-500 hover:text-slate-700"
              >
                Forgot?
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500">
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-blue-600" />
              Remember me
            </label>
          </div>

          <button
            type="submit"
            className="w-full rounded-2xl bg-[#008000] px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#006600] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loginSubmitting}
          >
            {loginSubmitting ? "Signing in..." : "Enter workspace"}
          </button>
          <p className="text-center text-xs text-slate-500">
            By signing in, you agree to the Terms of Service and Data Processing Agreement.  Contact System Administrator for Support.
          </p>
        </form>
      </div>
    </div>
  );

  const renderSidebar = () => (
    <aside
      className={`hidden shrink-0 bg-[#111827] px-3 py-6 text-neutral-200 transition-all duration-200 ${sidebarCollapsed ? "w-20" : "w-72"
        } xl:block`}
      onMouseEnter={() => setSidebarCollapsed(false)}
      onMouseLeave={() => setSidebarCollapsed(true)}
    >
      <div
        className={`flex items-center rounded-lg bg-[#1F2937] px-3 py-4 ${sidebarCollapsed ? "justify-center" : "gap-3"
          }`}
      >
        <img
          src="/vytallogo.png"
          alt="Vytal"
          className="h-10 w-10 rounded-md object-contain"
        />
        {!sidebarCollapsed && (
          <div>
            <p className="text-sm font-semibold text-white">Vytal</p>
            <p className="text-xs text-neutral-400">Paleo Medicals</p>
          </div>
        )}
      </div>
      <div className="mt-8 space-y-6 text-sm">
        {filteredNavSections.length === 0 ? (
          <p className="px-3 text-xs text-neutral-500">No modules assigned.</p>
        ) : (
          filteredNavSections.map((section) => (
            <div key={section.title}>
              {!sidebarCollapsed && (
                <p className="px-3 text-[11px] uppercase tracking-wide text-neutral-500">
                  {section.title}
                </p>
              )}
              <div className="mt-3 space-y-1">
                {section.items.map((item) => {
                  const isActive = item.key === activeModule;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.key}
                      className={`relative flex w-full items-center gap-3 rounded-lg px-5 py-2 text-left font-medium transition ${isActive
                        ? "bg-[rgba(37,99,235,0.15)] text-white"
                        : "text-neutral-400 hover:bg-[#1F2937] hover:text-white"
                        }`}
                      title={item.label}
                      onClick={() => setActiveModule(item.key)}
                    >
                      {isActive && (
                        <span className="absolute left-2 top-2 bottom-2 w-1 rounded-full bg-[#008000]" />
                      )}
                      <Icon active={isActive} />
                      {!sidebarCollapsed && (
                        <span className="text-sm">{item.label}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );

  const userInitials = `${(user?.first_name?.[0] ?? "").toUpperCase()}${(
    user?.last_name?.[0] ?? ""
  ).toUpperCase()}`;
  const clinicianDisplayName = (
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
    user?.username ||
    "Clinician"
  ).trim();

  const renderGenericHeader = () => (
    <header className="border-b border-[#E5E7EB] bg-white">
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-2">
          <img
            src="/paleologo.png"
            alt="Paleo Medicals"
            className="h-8 w-8 rounded-md object-contain"
          />
          <p className="calibri font-semibold uppercase tracking-[0.2em] text-[#008000]">
            Paleo Medicals
          </p>
        </div>
        <div className="flex flex-1 flex-wrap items-center justify-end gap-3 text-sm">
          <button
            onClick={handleLogout}
            className="rounded-full border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#111827] hover:bg-[#F3F4F6]"
          >
            Logout
          </button>
          <div className="flex items-center gap-2 rounded-full border border-[#E5E7EB] px-3 py-2">
            <img
              src="/profileicon.png"
              alt="User profile"
              className="h-9 w-9 rounded-full border border-[#E5E7EB] object-cover"
            />
            <div>
              <p className="text-sm font-semibold text-[#111827]">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-[#4B5563]">{user?.username}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );

  const renderHeader = () => renderGenericHeader();

  const handleOpenScheduleManager = async (patient: Patient, treatmentInfo: NonNullable<Patient['next_treatment']>) => {
    setSelectedPatientId(patient.id);
    setScheduleManagerPlanId(treatmentInfo.care_plan_id);
    setScheduleManagerOpen(true);
    setScheduleManagerLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/consultation/care-plans/${treatmentInfo.care_plan_id}/`, {
        headers: { Authorization: `Token ${token}` }
      });
      if (res.ok) {
        const plan = await res.json();
        const items = (plan.plan_items?.treatment_schedule || []) as ScheduleItem[];
        // correct: map items and set locked if status is completed
        const itemsWithLock = items.map(i => ({
          ...i,
          locked: i.status === 'completed'
        }));
        setScheduleManagerItems(itemsWithLock);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setScheduleManagerLoading(false);
    }
  };

  const handleSaveScheduleManager = async () => {
    if (!scheduleManagerPlanId) return;
    setScheduleManagerLoading(true);
    try {
      // preserve other plan items? Ideally we patch only plan_items. But serializer validates structure.
      // We fetching existing plan items? Ideally yes. But here we just update schedule.
      // BE validation allows updating just plan_items.
      // However, if plan_items has other keys, we might overwrite them if we just send treatment_schedule?
      // Actually JSONField patch usually replaces the whole field unless we do specific DB ops.
      // Let's assume for now we just send treatment_schedule in plan_items.
      // RISK: Overwriting other plan items.
      // Let's fetch the plan again or reuse the one we fetched?
      // We didn't store the full plan items in state.
      // Better: Fetch fresh before saving? Or store full plan items.
      // Simplification: Assume only treatment_schedule matters for now or just merge.
      // Let's fetch first to be safe.
      const header = { Authorization: `Token ${token}`, "Content-Type": "application/json" };
      const freshRes = await fetch(`${API_BASE_URL}/consultation/care-plans/${scheduleManagerPlanId}/`, { headers: header });
      const freshPlan = await freshRes.json();
      const payload = {
        plan_items: {
          ...freshPlan.plan_items,
          treatment_schedule: scheduleManagerItems,
        }
      };

      await fetch(`${API_BASE_URL}/consultation/care-plans/${scheduleManagerPlanId}/`, {
        method: "PATCH",
        headers: header,
        body: JSON.stringify(payload),
      });
      setScheduleManagerOpen(false);
      loadPatients(searchTerm);
    } catch (e) {
      console.error(e);
    } finally {
      setScheduleManagerLoading(false);
    }
  };

  const renderScheduleManager = () => {
    if (!scheduleManagerOpen) return null;
    return (
      <>
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          onClick={() => setScheduleManagerOpen(false)}
        />
        <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-slate-200 bg-white shadow-2xl p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Manage Schedule</h3>
              <p className="text-sm text-slate-500">Update treatment status</p>
            </div>
            <button
              onClick={() => setScheduleManagerOpen(false)}
              className="rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
            >
              ✕
            </button>
          </div>

          {scheduleManagerLoading ? (
            <div className="text-center py-8 text-slate-500">Loading schedule...</div>
          ) : (
            <div className="space-y-4">
              {scheduleManagerItems.map((item, index) => {
                const isDone = item.status === "completed";
                return (
                  <div
                    key={index}
                    className={`flex items-start gap-3 rounded-xl border p-3 transition ${isDone ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-200 shadow-sm'}`}
                  >
                    <div className="mt-1">
                      <input
                        type="checkbox"
                        checked={isDone}
                        disabled={item.locked}
                        onChange={() => {
                          if (item.locked) return;
                          const newItems = [...scheduleManagerItems];
                          newItems[index] = { ...item, status: isDone ? "pending" : "completed" };
                          setScheduleManagerItems(newItems);
                        }}
                        className={`h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 ${item.locked ? 'cursor-not-allowed opacity-50' : ''}`}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-semibold ${isDone ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                          Day {item.day_number}
                        </span>
                        <span className="text-xs text-slate-500">{item.date}</span>
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        {item.activity}
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                        <span>{item.time}</span>
                        <span>•</span>
                        <span>{item.duration}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-8">
            <button
              onClick={handleSaveScheduleManager}
              disabled={scheduleManagerLoading}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md hover:bg-blue-700 disabled:opacity-50"
            >
              {scheduleManagerLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </aside>
      </>
    );
  };

  const renderPatientDirectory = () => {
    const PAGE_SIZE = 10;
    const filteredPatients = treatmentReadyPatients.filter(
      (patient) => categorizePatientStatus(patient) === patientDirectoryTab
    );
    const totalPages = Math.max(1, Math.ceil(filteredPatients.length / PAGE_SIZE));
    const currentPage = Math.min(patientDirectoryPage, totalPages);
    const paginatedPatients = filteredPatients.slice(
      (currentPage - 1) * PAGE_SIZE,
      (currentPage - 1) * PAGE_SIZE + PAGE_SIZE
    );
    const tabCounts: Record<PatientDirectoryTab, number> = {
      Queue: 0,
      "In Treatment": 0,
      Discharged: 0,
    };
    treatmentReadyPatients.forEach((patient) => {
      const status = categorizePatientStatus(patient);
      tabCounts[status] = (tabCounts[status] ?? 0) + 1;
    });
    const showTriageHoldMessage =
      treatmentReadyPatients.length === 0 && patients.length > 0;
    const emptyCopy: Record<PatientDirectoryTab, string> = {
      Queue: "No patients are waiting for treatment right now.",
      "In Treatment": "You have not started managing any patients yet.",
      Discharged: "No patients have been discharged under your care yet.",
    };
    return (
      <section className={`${CARD_SECTION_CLASS} space-y-6`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex-1 min-w-[300px]">
            <h2 className="text-2xl font-semibold text-[#111827]">
              Clinicians Worklist
            </h2>
            <p className="text-sm text-[#4B5563]">
              Review lab results, record treaments and set Patients review schedules.
            </p>
          </div>

          <div className="flex-1 flex items-center justify-center max-w-md">
            <div className="relative w-full">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search patients by name or phone..."
                className="w-full rounded-full border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleOpenClinicalForm}
              disabled={!selectedPatient}
              className="rounded-full bg-[#008000] px-4 py-2 text-sm font-semibold text-white shadow-subtle transition hover:bg-[#007000] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
            >
              Document Care Plan
            </button>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {filteredPatients.length}{" "}
              {filteredPatients.length === 1 ? "patient" : "patients"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-sm font-semibold text-gray-500">
          {PATIENT_DIRECTORY_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setPatientDirectoryTab(tab)}
              className={`rounded-full px-4 py-2 transition ${patientDirectoryTab === tab
                ? "bg-[#008000] text-white shadow-subtle"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
            >
              {tab}
              <span className="ml-2 rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                {tabCounts[tab]}
              </span>
            </button>
          ))}
        </div>
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <table className="min-w-full text-left text-sm text-[#4B5563]">
            <thead className="bg-[#F9FAFB] text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
              <tr>
                <th className="px-4 py-3 text-[#2e004d]">Patient ID</th>
                <th className="px-4 py-3 text-[#2e004d]">Patient</th>
                <th className="px-4 py-3 text-[#2e004d]">Age</th>
                <th className="px-4 py-3 text-[#2e004d]">Weigh</th>
                <th className="px-4 py-3 text-[#2e004d]">Sex</th>
                <th className="px-4 py-3 text-[#2e004d]">Phone</th>
                <th className="px-4 py-3 text-[#2e004d]">Admission</th>
                <th className="px-4 py-3 text-[#2e004d]">Next treatment</th>
                <th className="px-4 py-3 text-[#2e004d]">Stage</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-[#9CA3AF]">
                    Loading patients?
                  </td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-[#9CA3AF]">
                    {emptyCopy[patientDirectoryTab]}
                  </td>
                </tr>
              ) : (
                paginatedPatients.map((patient, index) => {
                  const active = patient.id === selectedPatientId;
                  const latestAdmission = getLatestAdmission(patient);
                  const stage = categorizePatientStatus(patient);
                  return (
                    <tr
                      key={patient.id}
                      onClick={() => {
                        setSelectedPatientId(patient.id);
                        setPatientSubPage("Patient Details");
                      }}
                      className={`cursor-pointer border-t border-[#E5E7EB] text-sm transition ${active ? "bg-[#F8FAFF] shadow-inner" : index % 2 === 0 ? "bg-white" : "bg-[#F9FAFB]"
                        } hover:bg-[#EAF2FF]`}
                    >
                      <td className="px-4 py-3 font-medium text-[#111827]">
                        {patient.patient_identifier || "?"}
                      </td>
                      <td className="px-4 py-3 font-medium text-[#111827]">
                        <div className="text-xs font-medium text-[#000033]">
                          {patient.first_name} {patient.last_name}
                        </div>
                      </td>
                      <td className="px-4 py-3">{patient.age}</td>
                      <td className="px-4 py-3">{patient.weight_kg}</td>
                      <td className="px-4 py-3">{patient.gender || "?"}</td>
                      <td className="px-4 py-3">{patient.phone_number || "?"}</td>
                      <td className="px-4 py-3">
                        {latestAdmission?.admission_date
                          ? formatDateOnly(latestAdmission.admission_date)
                          : "Not admitted"}
                      </td>
                      <td className="px-4 py-3">
                        {patient.next_treatment ? (
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col">
                              <span className="font-bold text-[#000033]">{formatDateOnly(patient.next_treatment.date)}</span>
                              <span className="text-xs text-gray-500">{patient.next_treatment.time}</span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenScheduleManager(patient, patient.next_treatment!);
                              }}
                              className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white hover:bg-slate-800"
                            >
                              Record
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPatientId(patient.id);
                                handleOpenClinicalForm(patient);
                              }}
                              className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white hover:bg-slate-800"
                            >
                              Adjust Plan
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${stage === "Lab_done"
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
        {filteredPatients.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[#4B5563]">
            <div>
              Showing{" "}
              <span className="font-semibold">
                {(currentPage - 1) * PAGE_SIZE + 1}
              </span>{" "}
              to{" "}
              <span className="font-semibold">
                {Math.min(currentPage * PAGE_SIZE, filteredPatients.length)}
              </span>{" "}
              of{" "}
              <span className="font-semibold">{filteredPatients.length}</span> patients
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 shadow-sm">
              <button
                type="button"
                onClick={() =>
                  setPatientDirectoryPage((prev) => Math.max(1, prev - 1))
                }
                className="rounded-full px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <span className="text-xs font-semibold text-slate-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setPatientDirectoryPage((prev) => Math.min(totalPages, prev + 1))
                }
                className="rounded-full px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        )}
        {showTriageHoldMessage && (
          <div className="rounded-2xl border border-[#E5E7EB] bg-white/80 px-4 py-3 text-sm text-[#4B5563]">
            Patients that have completed Lab tests appear here.
          </div>
        )}
      </section>
    );
  };
  const renderPatientDetails = () => {
    if (!selectedPatient) {
      return (
        <section className="rounded-3xl border border-dashed border-slate-200 bg-white/60 p-10 text-center text-sm text-slate-500 shadow-sm">
          {loading
            ? "Loading patients…"
            : "Select a patient from the directory to view details."}
        </section>
      );
    }
    const initials = `${selectedPatient.first_name[0] ?? ""}${selectedPatient.last_name[0] ?? ""
      }`;
    const patientStage = categorizePatientStatus(selectedPatient);
    const latestAdmission = getLatestAdmission(selectedPatient);
    const isDischarged = patientStage === "Discharged";
    const stageCalloutCopy: Partial<Record<PatientDirectoryTab, string>> = {
      Queue:
        "Lab has cleared this patient and they are waiting for clinical assessment.",
      "In Treatment": "This patient is currently under your team's care.",
      Discharged: "Patient discharged - records are read-only for reference.",
    };
    const stageCalloutStyles: Record<PatientDirectoryTab, string> = {
      Queue: "border-blue-100 bg-blue-50 text-blue-800",
      "In Treatment": "border-emerald-100 bg-emerald-50 text-emerald-800",
      Discharged: "border-gray-200 bg-gray-50 text-gray-700",
    };
    const stageCalloutMessage = stageCalloutCopy[patientStage];
    const previewPlan =
      nextReviewPreview && nextReviewPreview.scheduled_for
        ? {
          id: "preview",
          admissionId:
            nextReviewPreview.admissionId ??
            selectedPatient.admissions[0]?.id ??
            0,
          title: "Scheduled review",
          scheduled_for: nextReviewPreview.scheduled_for,
          duration: "",
          frequency: "",
          assigned_to: clinicianDisplayName,
          status: "Scheduled" as const,
          notes: "",
          route: "",
        }
        : null;
    const nextReviewPlan = previewPlan ?? nextTreatmentPlans[0] ?? null;

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
      const primarySymptoms =
        latestAdmission?.clinical_notes.find((note) => note.complaints?.trim())
          ?.complaints ||
        latestAdmission?.provisional_diagnosis ||
        "Not recorded";
      const allergySummary = formatValue(
        latestAdmission?.allergies ?? selectedPatient.allergy_summary,
        "",
        "No allergies captured"
      );
      const latestNote =
        latestAdmission?.clinical_notes &&
          latestAdmission.clinical_notes.length > 0
          ? latestAdmission.clinical_notes[0]
          : null;
      const labEntries =
        patientLabResults.length > 0
          ? patientLabResults.map((result) => ({
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
      const upcomingPlan = nextReviewPlan;
      return (
        <section className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Clinical snapshot
                  </p>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {primarySymptoms}
                  </h3>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-800">
                  {patientStage || "In review"}
                </span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-100 bg-white px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">
                    Weight
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    {formatValue(selectedPatient.weight_kg, " kg")}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-white px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">
                    Age
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    {formatValue(selectedPatient.age, " yrs", "Not recorded")}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-white px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">
                    Allergies
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    {allergySummary}
                  </p>
                </div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">
                    Symptoms
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    {primarySymptoms}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">
                    Contact
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    {formatValue(
                      selectedPatient.phone_number,
                      "",
                      "No phone on file"
                    )}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatValue(selectedPatient.address, "", "No address")}
                  </p>
                </div>
              </div>
              <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-white px-3 py-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                  Latest clinical note
                </p>
                <p className="mt-1 text-sm text-slate-800">
                  {latestNote?.remarks ||
                    latestNote?.treatment_details ||
                    latestAdmission?.lab_tests_done ||
                    "No care notes recorded."}
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Emergency contact
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {formatValue(
                    selectedPatient.emergency_contact_name,
                    "",
                    "Not provided"
                  )}
                </p>
                <p className="text-xs text-slate-500">
                  {formatValue(
                    selectedPatient.emergency_contact_phone,
                    "",
                    "No phone on file"
                  )}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Next of kin
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {formatValue(
                    latestAdmission?.next_of_kin_name,
                    "",
                    "Not captured"
                  )}
                </p>
                <p className="text-xs text-slate-500">
                  {formatValue(
                    latestAdmission?.next_of_kin_contact,
                    "",
                    "No contact"
                  )}
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Current admission
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
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold ${latestAdmission.status === "active"
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
                  <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">
                        Admission date
                      </p>
                      <p className="text-sm font-semibold text-slate-900">
                        {formatValue(latestAdmission.admission_date)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">
                        Discharge date
                      </p>
                      <p className="text-sm font-semibold text-slate-900">
                        {formatValue(
                          latestAdmission.discharge_date,
                          "",
                          "Not discharged yet"
                        )}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">
                        Final diagnosis
                      </p>
                      <p className="text-sm font-semibold text-slate-900">
                        {formatValue(latestAdmission.final_diagnosis)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">
                        Treatment frequency
                      </p>
                      <p className="text-sm font-semibold text-slate-900">
                        {formatValue(latestAdmission.treatment_frequency)}
                      </p>
                    </div>
                  </div>
                  {upcomingPlan && (
                    <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-3 text-sm">
                      <p className="text-[11px] uppercase tracking-wide text-amber-600">
                        Next review
                      </p>
                      <p className="mt-1 font-semibold text-amber-900">
                        {upcomingPlan.scheduled_for
                          ? formatDateTime(upcomingPlan.scheduled_for)
                          : "Not scheduled"}
                      </p>
                      <p className="text-xs text-amber-700">
                        Assigned to {upcomingPlan.assigned_to || "clinical team"}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p className="mt-4 text-sm text-slate-500">
                  This patient does not have any admissions yet.
                </p>
              )}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Laboratory
                </p>
                <span className="text-[11px] font-semibold text-slate-500">
                  {labEntries.length} {labEntries.length === 1 ? "entry" : "entries"}
                </span>
              </div>
              <div className="mt-3 grid gap-3">
                {labEntries.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
                    No laboratory data has been recorded for the latest admission.
                  </p>
                ) : (
                  labEntries.map((entry) => (
                    <div
                      key={entry.label + entry.value}
                      className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3"
                    >
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">
                        {entry.label}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {entry.value}
                      </p>
                      {entry.meta && (
                        <p className="text-[11px] text-slate-500">{entry.meta}</p>
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

    const renderCarePlansCard = () => (
      <div className={`${CARD_CLASS} bg-white/90`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Care plans
            </p>
            <h3 className="text-lg font-semibold text-slate-900">
              Latest clinician plans
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            {carePlans.length} version{carePlans.length === 1 ? "" : "s"}
          </span>
        </div>
        {carePlans.length > 0 && (
          <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-3">
            <p className="text-[11px] uppercase tracking-wide text-emerald-700">
              Current treatment order
            </p>
            <p className="mt-1 text-sm font-semibold text-emerald-900">
              v{carePlans[0].version} · {carePlans[0].status}
            </p>
            <p className="text-sm text-emerald-800">
              {carePlans[0].assessment || "Assessment not provided"}
            </p>
            {carePlans[0].note && (
              <p className="text-xs text-emerald-700">Note: {carePlans[0].note}</p>
            )}
          </div>
        )}
        <div className="mt-4 space-y-3">
          {carePlans.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
              No care plans recorded for this admission.
            </p>
          ) : (
            carePlans.map((plan) => (
              <div
                key={plan.id}
                className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      v{plan.version} · {plan.status}
                    </p>
                    <p className="text-sm font-semibold text-slate-900">
                      {plan.assessment || "Assessment not provided"}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500">
                    {plan.created_at
                      ? formatDateTime(plan.created_at)
                      : "—"}
                  </span>
                </div>
                {plan.note ? (
                  <p className="mt-2 text-sm text-slate-700">{plan.note}</p>
                ) : (
                  <p className="mt-2 text-xs text-slate-500">
                    No additional notes.
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );

    const renderActivityCard = () => {
      const events = patientEvents || [];
      return (
        <div className={`${CARD_CLASS} bg-white/90`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Activity
              </p>
              <h3 className="text-lg font-semibold text-slate-900">
                Audit trail
              </h3>
            </div>
            <span className="text-xs text-slate-500">
              {events.length} event{events.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {events.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
                No consultation activity recorded yet.
              </p>
            ) : (
              events.slice(0, 8).map((event) => (
                <div
                  key={event.id}
                  className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">
                      {event.event_type.replace("_", " ")}
                    </p>
                    <span className="text-[11px] text-slate-500">
                      {formatDateTime(event.occurred_at)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {event.actor_name || "System"} · {event.actor_role || "—"}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      );
    };

    const renderPatientTabContent = () => {
      switch (patientTab) {
        case "Summary":
          return (
            <div className="space-y-6">
              {renderPatientInformation()}
              {renderCarePlansCard()}
              {renderActivityCard()}
            </div>
          );
        case "Records":
          return (
            <div className="space-y-6">
              {renderCarePlansCard()}
              {renderMedicalRecordsTab()}
            </div>
          );
        default:
          return null;
      }
    };
  };

  const handleGenerateSchedule = useCallback(() => {
    if (!carePlanNumDays || carePlanNumDays < 1) return;
    const startDateStr = treatmentNoteForm.recordedAt || getLocalISODate();
    const startDate = new Date(startDateStr);
    const newItems: ScheduleItem[] = [];

    for (let i = 0; i < carePlanNumDays; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      newItems.push({
        day_number: i + 1,
        date: d.toISOString().split("T")[0],
        time: "09:00",
        duration: "30 mins",
        activity: "",
      });
    }
    setCarePlanSchedule(newItems);
  }, [carePlanNumDays, treatmentNoteForm.recordedAt]);

  const updateScheduleItem = useCallback(
    (index: number, field: keyof ScheduleItem, value: any) => {
      setCarePlanSchedule((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], [field]: value };
        return next;
      });
    },
    []
  );

  const renderClinicalFormDrawer = () => {
    if (!showClinicalForm) {
      return null;
    }
    const activePatient =
      selectedPatientId && !selectedPatient
        ? treatmentReadyPatients.find((p) => p.id === selectedPatientId) ??
        selectedPatient
        : selectedPatient;
    const patientStage = activePatient
      ? categorizePatientStatus(activePatient)
      : null;
    const isDischarged = patientStage === "Discharged";
    return (
      <>
        <div
          className="fixed inset-0 z-40 bg-black/30"
          role="presentation"
          onClick={() => setShowClinicalForm(false)}
        />
        <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md transform bg-white shadow-2xl transition duration-300 ease-out">
          <form
            onSubmit={handleTreatmentNoteSubmit}
            className="flex h-full flex-col space-y-4 overflow-y-auto border-l border-gray-100 bg-white px-6 py-6"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Record clinical info
                </p>
                <p className="text-xs text-gray-500">
                  Capture vitals, treatment decisions, and bedside observations
                  for this admission.
                </p>
              </div>
              <button
                type="button"
                className="text-sm font-semibold text-gray-500 hover:text-gray-900"
                onClick={() => setShowClinicalForm(false)}
              >
                ✕
              </button>
            </div>
            {treatmentNoteMessage && (
              <div className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                {treatmentNoteMessage}
              </div>
            )}
            {treatmentNoteError && (
              <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
                {treatmentNoteError}
              </div>
            )}
            {isDischarged && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                This patient has been discharged. Clinical notes are read-only.
              </div>
            )}
            <fieldset
              disabled={isDischarged}
              className={`space-y-3 ${isDischarged ? "opacity-60" : ""}`}
            >
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500">
                    Patient
                  </label>
                  <select
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                    value={selectedPatient?.id ?? selectedPatientId ?? ""}
                    onChange={(event) => {
                      const patientId = Number(event.target.value);
                      const patient = treatmentReadyPatients.find(
                        (p) => p.id === patientId
                      );
                      if (patient) {
                        setSelectedPatientId(patient.id);
                        const latestAdmission = getLatestAdmission(patient);
                        setTreatmentNoteForm((prev) => ({
                          ...prev,
                          admissionId: latestAdmission
                            ? String(latestAdmission.id)
                            : "",
                        }));
                      }
                    }}
                    required
                  >
                    <option value="">Select patient</option>
                    {treatmentReadyPatients.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.first_name} {patient.last_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500">
                    Recorded on
                  </label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                    value={treatmentNoteForm.recordedAt}
                    onChange={(event) =>
                      setTreatmentNoteForm((prev) => ({
                        ...prev,
                        recordedAt: event.target.value,
                      }))
                    }
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500">
                  Person responsible
                </label>
                <div className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {clinicianDisplayName}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500">
                  Treatment route
                </label>
                <input
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                  value={treatmentNoteForm.route}
                  onChange={(event) =>
                    setTreatmentNoteForm((prev) => ({
                      ...prev,
                      route: event.target.value,
                    }))
                  }
                  placeholder="e.g. IV, Oral, Physiotherapy"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500">
                  Vitals
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Systolic BP (mmHg)"
                    value={treatmentNoteForm.systolic}
                    onChange={(event) =>
                      setTreatmentNoteForm((prev) => ({
                        ...prev,
                        systolic: event.target.value,
                      }))
                    }
                  />
                  <input
                    className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Diastolic BP (mmHg)"
                    value={treatmentNoteForm.diastolic}
                    onChange={(event) =>
                      setTreatmentNoteForm((prev) => ({
                        ...prev,
                        diastolic: event.target.value,
                      }))
                    }
                  />
                  <input
                    className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Pulse (bpm)"
                    value={treatmentNoteForm.pulse}
                    onChange={(event) =>
                      setTreatmentNoteForm((prev) => ({
                        ...prev,
                        pulse: event.target.value,
                      }))
                    }
                  />
                  <input
                    className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Resp. rate (cpm)"
                    value={treatmentNoteForm.respirationRate}
                    onChange={(event) =>
                      setTreatmentNoteForm((prev) => ({
                        ...prev,
                        respirationRate: event.target.value,
                      }))
                    }
                  />
                  <input
                    className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Temperature (°C)"
                    value={treatmentNoteForm.temperature}
                    onChange={(event) =>
                      setTreatmentNoteForm((prev) => ({
                        ...prev,
                        temperature: event.target.value,
                      }))
                    }
                  />
                  <input
                    className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="SpO₂ (%)"
                    value={treatmentNoteForm.oxygen}
                    onChange={(event) =>
                      setTreatmentNoteForm((prev) => ({
                        ...prev,
                        oxygen: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500">
                  Complaints
                </label>
                <textarea
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                  rows={2}
                  value={treatmentNoteForm.complaints}
                  onChange={(event) =>
                    setTreatmentNoteForm((prev) => ({
                      ...prev,
                      complaints: event.target.value,
                    }))
                  }
                  placeholder="Primary issues reported by the patient."
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500">
                  Treatment & observations
                </label>
                <textarea
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                  rows={3}
                  value={treatmentNoteForm.summary}
                  onChange={(event) =>
                    setTreatmentNoteForm((prev) => ({
                      ...prev,
                      summary: event.target.value,
                    }))
                  }
                  placeholder="Summarize the care provided during this visit."
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500">
                  Remarks
                </label>
                <textarea
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                  rows={3}
                  value={treatmentNoteForm.remarks}
                  onChange={(event) =>
                    setTreatmentNoteForm((prev) => ({
                      ...prev,
                      remarks: event.target.value,
                    }))
                  }
                  placeholder="Patient response, counselling, or follow-up steps."
                />
              </div>
              <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-semibold text-slate-700">Treatment Schedule</label>
                    <p className="text-xs text-slate-500">Define daily care plan for this admission</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      className="w-16 rounded-xl border border-slate-200 px-3 py-1 text-center text-sm"
                      placeholder="Days"
                      value={carePlanNumDays || ""}
                      onChange={(e) => setCarePlanNumDays(parseInt(e.target.value) || 0)}
                    />
                    <button
                      type="button"
                      onClick={handleGenerateSchedule}
                      className="rounded-xl bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800"
                    >
                      Update
                    </button>
                  </div>
                </div>

                {carePlanSchedule.length > 0 && (
                  <div className="space-y-3">
                    {carePlanSchedule.map((item, index) => (
                      <div key={index} className="grid grid-cols-[80px_1fr] gap-3 rounded-lg border border-slate-200 bg-white p-3">
                        <div className="flex flex-col gap-2">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Day {item.day_number}</span>
                          <input
                            type="date"
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs w-full"
                            value={item.date}
                            onChange={(e) => updateScheduleItem(index, "date", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="time"
                              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs"
                              value={item.time}
                              onChange={(e) => updateScheduleItem(index, "time", e.target.value)}
                            />
                            <input
                              placeholder="Duration"
                              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs"
                              value={item.duration}
                              onChange={(e) => updateScheduleItem(index, "duration", e.target.value)}
                            />
                          </div>
                          <input
                            placeholder="Activity (e.g. Physiotherapy)"
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs"
                            value={item.activity}
                            onChange={(e) => updateScheduleItem(index, "activity", e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-600">
                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
                  <span>Schedule next review (optional)</span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500">
                      Review date
                    </label>
                    <input
                      type="date"
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                      value={treatmentNoteForm.nextTreatmentDate}
                      onChange={(event) =>
                        setTreatmentNoteForm((prev) => ({
                          ...prev,
                          nextTreatmentDate: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500">
                      Review time
                    </label>
                    <input
                      type="time"
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                      value={treatmentNoteForm.nextTreatmentTime}
                      onChange={(event) =>
                        setTreatmentNoteForm((prev) => ({
                          ...prev,
                          nextTreatmentTime: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  Leave blank if this visit does not schedule a new review.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="submit"
                  className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-subtle disabled:opacity-60 hover:bg-slate-800"
                  disabled={treatmentNoteSubmitting}
                >
                  {treatmentNoteSubmitting
                    ? "Saving…"
                    : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowClinicalForm(false)}
                  className="rounded-full border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </fieldset>
          </form>
        </aside>
      </>
    );
  };

  const renderPatientInfoDrawer = () => {
    if (patientSubPage !== "Patient Details" || !selectedPatient) {
      return null;
    }
    const latestAdmission = getLatestAdmission(selectedPatient);
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
    const triageSymptoms =
      latestAdmission?.provisional_diagnosis ||
      latestAdmission?.clinical_notes.find((note) => note.complaints?.trim())
        ?.complaints ||
      selectedPatient.notes ||
      "Not recorded";
    const triageAllergies =
      latestAdmission?.allergies ||
      selectedPatient.allergy_summary ||
      "Not recorded";
    const clinicalNotes = Array.isArray(latestAdmission?.clinical_notes)
      ? latestAdmission?.clinical_notes
      : [];
    const triageNote =
      clinicalNotes.find((note) =>
        `${note.recorded_by_role || ""}`.toLowerCase().includes("triage")
      ) ||
      clinicalNotes.find(
        (note) =>
          !`${note.recorded_by_role || ""}`.toLowerCase().includes("lab")
      ) ||
      null;
    const triageRecordedBy = triageNote
      ? `${triageNote.recorded_by_name || "Unknown"} (${triageNote.recorded_by_role || "Triage"})`
      : "Not recorded";
    const triageRecordedAt = triageNote?.documented_at
      ? formatDateTime(triageNote.documented_at)
      : latestAdmission?.admission_date
        ? formatDateTime(latestAdmission.admission_date)
        : "Not recorded";
    const labEntries =
      patientLabResults && patientLabResults.length > 0
        ? patientLabResults.map((result) => ({
          id: result.id,
          label: result.test_type,
          summary: result.summary || "Result recorded",
          meta: `${result.recorded_by_name || "Lab"} (${result.recorded_by_role || "Laboratory"}) · ${formatDateTime(result.recorded_at)}`,
        }))
        : [];
    const treatmentNotes = (selectedPatient.admissions ?? [])
      .flatMap((admission) =>
        (admission.clinical_notes ?? []).map((note) => ({
          ...note,
          admission_id: admission.id,
        }))
      )
      .filter((note) => {
        const role = (note.recorded_by_role || "").toLowerCase();
        const isLab = role.includes("lab");
        const isTriage = role.includes("triage");
        return (
          !isLab &&
          !isTriage &&
          (note.treatment_details ||
            note.remarks ||
            note.complaints ||
            note.assessment ||
            note.note)
        );
      })
      .sort(
        (a, b) =>
          Date.parse(b.documented_at ?? b.created_at ?? "") -
          Date.parse(a.documented_at ?? a.created_at ?? "")
      );
    const mostRecentTreatmentNotes = treatmentNotes.slice(0, 1);

    return (
      <aside className="fixed inset-y-0 right-0 z-40 w-full max-w-md overflow-y-auto border-l border-slate-200 bg-white shadow-2xl">
        <div className="space-y-4 p-5">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Patient
              </p>
              <h2 className="text-lg font-semibold text-slate-900">
                {selectedPatient.first_name} {selectedPatient.last_name}
              </h2>
              <p className="text-xs text-slate-500">
                ID: {selectedPatient.patient_identifier || "—"}
              </p>
            </div>
            <button
              type="button"
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              onClick={() => {
                setPatientSubPage("Patient Directory");
              }}
            >
              Close
            </button>
          </header>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Triage snapshot
              </p>
            </div>
            <dl className="space-y-2 text-sm text-slate-800">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">
                    Age
                  </p>
                  <p className="font-semibold">
                    {formatValue(selectedPatient.age, " yrs")}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">
                    Weight
                  </p>
                  <p className="font-semibold">
                    {formatValue(selectedPatient.weight_kg, " kg")}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">
                    Temperature
                  </p>
                  <p className="font-semibold">
                    {formatValue(latestAdmission?.clinical_notes?.[0]?.temperature_c, " °C")}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                  Symptoms
                </p>
                <p className="font-semibold">{triageSymptoms}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                  Allergies
                </p>
                <p className="font-semibold">{triageAllergies}</p>
              </div>
              <div className="text-[11px] text-slate-500">
                Recorded by: {triageRecordedBy} · {triageRecordedAt}
              </div>
            </dl>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Laboratory results
              </p>
              <span className="text-[11px] text-slate-500">
                {labEntries.length} {labEntries.length === 1 ? "entry" : "entries"}
              </span>
            </div>
            {labEntries.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
                No lab results recorded yet.
              </p>
            ) : (
              <ul className="space-y-2 text-sm text-slate-800">
                {labEntries.map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{entry.label}</span>
                    </div>
                    <p className="text-slate-700">{entry.summary}</p>
                    <p className="text-[11px] text-slate-500">{entry.meta}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Treatment records
              </p>
              <span className="text-[11px] text-slate-500">
                {treatmentNotes.length}{" "}
                {treatmentNotes.length === 1 ? "entry" : "entries"}
              </span>
            </div>
            {treatmentNotes.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
                No documented care plans or treatment notes yet.
              </p>
            ) : (
              <ul className="space-y-2 text-sm text-slate-800">
                {mostRecentTreatmentNotes.map((note, idx) => (
                  <li
                    key={note.id ?? idx}
                    className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                  >
                    <div className="grid grid-cols-3 gap-3 text-[12px] text-slate-700">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">
                          Route
                        </p>
                        <p>{note.treatment_route || "None"}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">
                          Complaints
                        </p>
                        <p>{note.complaints || "None"}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">
                          Next review
                        </p>
                        <p>
                          {(note.next_review_date ||
                            note.next_treatment_date ||
                            "None") +
                            (note.next_treatment_time
                              ? ` ${note.next_treatment_time}`
                              : "")}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">
                          BP (mmHg)
                        </p>
                        <p>
                          {note.systolic_bp || note.diastolic_bp
                            ? `${note.systolic_bp ?? "None"}/${note.diastolic_bp ?? "None"
                            }`
                            : "None"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">
                          Pulse (bpm)
                        </p>
                        <p>{note.pulse || "None"}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">
                          Resp. (cpm)
                        </p>
                        <p>{note.respiration_rate || "None"}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">
                          Temp (°C)
                        </p>
                        <p>{note.temperature_c || "None"}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">
                          SpO₂ (%)
                        </p>
                        <p>{note.oxygen_saturation || "None"}</p>
                      </div>
                      <div className="col-span-3">
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">
                          Remarks
                        </p>
                        <p>{note.remarks || "None"}</p>
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
                  </li>
                ))}
              </ul>
            )}
            {treatmentNotes.length > 1 && (
              <button
                type="button"
                onClick={() => setShowTreatmentHistory(true)}
                className="mt-2 w-full rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 bg-[#80ff80] hover:bg-slate-50"
              >
                View all treatment records
              </button>
            )}
          </div>
        </div>
      </aside>
    );
  };

  const savePatient = async () => {
    setFormError(null);
    setSavingPatient(true);
    try {
      if (!token) {
        throw new Error("You must be logged in.");
      }
      const payload = {
        ...patientForm,
        age: Number(patientForm.age),
        weight_kg: patientForm.weight_kg ? Number(patientForm.weight_kg) : null,
        initial_admission: {
          ...initialAdmissionForm,
          admission_date: initialAdmissionForm.admission_date,
          discharge_date: initialAdmissionForm.discharge_date || null,
          review_date: initialAdmissionForm.review_date || null,
          lab_tests_done:
            initialAdmissionForm.lab_tests_list.length > 0
              ? initialAdmissionForm.lab_tests_list.join(", ")
              : initialAdmissionForm.lab_tests_done,
        },
      };
      const response = await fetch(`${API_BASE_URL}/patients/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        throw new Error(detail?.detail ?? "Unable to create patient");
      }
      const created = (await response.json()) as Patient;
      rememberPatientIdentifierSequence(created.patient_identifier);
      resetPatientForm();
      setShowPatientForm(false);
      setPatientSubPage("Patient Details");
      setSelectedPatientId(created.id);
      await loadPatients(searchTerm);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Unexpected error occurred"
      );
    } finally {
      setSavingPatient(false);
    }
  };

  const resetPatientForm = useCallback(() => {
    setPatientForm({
      first_name: "",
      last_name: "",
      patient_identifier: deriveNextPatientIdentifier(),
      age: "",
      gender: "",
      weight_kg: "",
      phone_number: "",
      email: "",
      address: "",
      emergency_contact_name: "",
      emergency_contact_phone: "",
    });
    setInitialAdmissionForm({
      admission_date: "",
      discharge_date: "",
      review_date: "",
      provisional_diagnosis: "",
      final_diagnosis: "",
      treatment_frequency: "",
      treatment_duration: "",
      lab_tests_done: "",
      lab_tests_list: [],
      next_of_kin_name: "",
      next_of_kin_contact: "",
      allergies: "",
      contraindications: "",
    });
    setFormError(null);
    setPatientFormStep("identity");
  }, [deriveNextPatientIdentifier]);

  const handlePatientFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (patientFormStep === "identity") {
      setPatientFormStep("admission");
      return;
    }
    await savePatient();
  };

  const handleAppointmentFormSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    if (!selectedPatient) {
      setAppointmentFormError(
        "Select a patient before scheduling an appointment."
      );
      return;
    }
    const admissionId = Number(
      appointmentForm.admissionId || selectedPatient.admissions[0]?.id
    );
    if (!admissionId) {
      setAppointmentFormError(
        "This patient does not have an admission to attach the appointment to."
      );
      return;
    }
    if (!token) {
      setAppointmentFormError(
        "You must be logged in to create an appointment."
      );
      return;
    }
    const datePart =
      appointmentForm.scheduledDate || new Date().toISOString().split("T")[0];
    const timePart = appointmentForm.scheduledTime || "09:00";
    const documented_at = new Date(`${datePart}T${timePart}`).toISOString();
    const providerName =
      appointmentForm.providerName ||
      [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
      user?.username ||
      "Provider";
    const providerRole = appointmentForm.providerRole || "Care Team";
    const payload = {
      admission: admissionId,
      documented_at,
      treatment_details:
        appointmentForm.summary ||
        appointmentForm.visitType ||
        "Consultation scheduled",
      treatment_route: appointmentForm.visitType || "Consultation",
      complaints: appointmentForm.complaints,
      remarks: appointmentForm.followUp,
      recorded_by_name: providerName,
      recorded_by_role: providerRole,
    };
    setAppointmentSubmitting(true);
    setAppointmentFormError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/clinical-notes/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        throw new Error(detail?.detail ?? "Unable to create appointment");
      }
      setShowAppointmentModal(false);
      setAppointmentForm((prev) => ({
        ...prev,
        summary: "",
        complaints: "",
        followUp: "",
      }));
      await loadPatients(searchTerm);
    } catch (err) {
      setAppointmentFormError(
        err instanceof Error ? err.message : "Unable to create appointment"
      );
    } finally {
      setAppointmentSubmitting(false);
    }
  };

  const handleCompleteNextReview = async (admissionId: number) => {
    if (!token) {
      setTreatmentMessage("You must be logged in to update treatment plans.");
      return;
    }
    setTreatmentSubmitting(true);
    setTreatmentMessage(null);
    try {
      const payload: Partial<Admission> = {
        review_date: null,
      };
      const response = await fetch(
        `${API_BASE_URL}/admissions/${admissionId}/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        throw new Error(detail?.detail ?? "Unable to update treatment plan");
      }
      setTreatmentMessage("Next review marked as completed.");
      setNextReviewPreview(null);
      await loadPatients(searchTerm);
    } catch (err) {
      setTreatmentMessage(
        err instanceof Error ? err.message : "Unable to update treatment plan"
      );
    } finally {
      setTreatmentSubmitting(false);
    }
  };

  const handleTreatmentNoteSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    if (!selectedPatient) {
      setTreatmentNoteError("Select a patient to record a treatment note.");
      return;
    }
    const patientStatus = categorizePatientStatus(selectedPatient);
    if (patientStatus === "Discharged") {
      setTreatmentNoteError(
        "This patient has been discharged; notes are read-only."
      );
      return;
    }
    const admissionId = Number(
      treatmentNoteForm.admissionId || selectedPatient.admissions[0]?.id
    );
    if (!admissionId) {
      setTreatmentNoteError("No admission available for this patient.");
      return;
    }
    if (!token) {
      setTreatmentNoteError(
        "You must be logged in to record a treatment note."
      );
      return;
    }
    const recordedAt =
      treatmentNoteForm.recordedAt || new Date().toISOString().split("T")[0];
    const nextReviewDate = treatmentNoteForm.nextTreatmentDate.trim()
      ? treatmentNoteForm.nextTreatmentDate
      : null;
    const nextReviewDateTime =
      nextReviewDate && treatmentNoteForm.nextTreatmentTime !== undefined
        ? new Date(
          `${nextReviewDate}T${treatmentNoteForm.nextTreatmentTime || "09:00"
          }`
        )
        : null;
    const nextReviewPreviewValue =
      nextReviewDateTime && !Number.isNaN(nextReviewDateTime.valueOf())
        ? nextReviewDateTime.toISOString()
        : nextReviewDate;
    const remarksLines = [treatmentNoteForm.remarks.trim()].filter(Boolean);
    const toNumber = (value: string) => {
      if (!value.trim()) {
        return null;
      }
      const parsed = Number(value);
      return Number.isNaN(parsed) ? null : parsed;
    };
    const payload = {
      admission: admissionId,
      documented_at: new Date(`${recordedAt}T10:00`).toISOString(),
      systolic_bp: toNumber(treatmentNoteForm.systolic),
      diastolic_bp: toNumber(treatmentNoteForm.diastolic),
      pulse: toNumber(treatmentNoteForm.pulse),
      respiration_rate: toNumber(treatmentNoteForm.respirationRate),
      temperature_c: toNumber(treatmentNoteForm.temperature),
      oxygen_saturation: toNumber(treatmentNoteForm.oxygen),
      complaints: treatmentNoteForm.complaints,
      treatment_details: treatmentNoteForm.summary || "Treatment note",
      treatment_route: treatmentNoteForm.route || "General care",
      remarks: remarksLines.join("\n"),
      recorded_by_name:
        [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
        user?.username ||
        "Clinician",
      recorded_by_role: user?.modules?.includes("patients")
        ? "Clinician"
        : "Staff",
    };
    setTreatmentNoteSubmitting(true);
    setTreatmentNoteError(null);
    setTreatmentNoteMessage(null);
    try {
      const response = await fetch(`${API_BASE_URL}/clinical-notes/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        throw new Error(detail?.detail ?? "Unable to record treatment note");
      }
      if (carePlanSchedule && carePlanSchedule.length > 0) {
        try {
          const carePlanPayload = {
            admission: admissionId,
            status: "finalized",
            assessment: treatmentNoteForm.summary || treatmentNoteForm.complaints || "Care plan updated",
            plan_items: {
              treatment_schedule: carePlanSchedule,
            },
            next_review_at: nextReviewDateTime
              ? nextReviewDateTime.toISOString()
              : null,
          };
          await fetch(`${API_BASE_URL}/consultation/care-plans/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Token ${token}`,
            },
            body: JSON.stringify(carePlanPayload),
          });
        } catch (e) {
          console.error("Failed to save care plan", e);
        }
      }
      if (nextReviewDate) {
        try {
          const reviewResponse = await fetch(
            `${API_BASE_URL}/admissions/${admissionId}/`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Token ${token}`,
              },
              body: JSON.stringify({ review_date: nextReviewDate }),
            }
          );
          if (!reviewResponse.ok) {
            const detail = await reviewResponse.json().catch(() => ({}));
            throw new Error(detail?.detail ?? "Unable to schedule next review");
          }
          setNextReviewPreview({
            admissionId,
            scheduled_for: nextReviewPreviewValue ?? nextReviewDate,
          });
        } catch (err) {
          setTreatmentMessage(
            err instanceof Error
              ? err.message
              : "Unable to schedule next review"
          );
        }
      }
      setTreatmentNoteMessage("Treatment note recorded.");
      setCarePlanSchedule([]);
      setCarePlanNumDays(0);
      setTreatmentNoteForm((prev) => ({
        ...prev,
        summary: "",
        route: "",
        remarks: "",
        systolic: "",
        diastolic: "",
        pulse: "",
        respirationRate: "",
        temperature: "",
        oxygen: "",
        complaints: "",
        nextTreatmentDate: "",
        nextTreatmentTime: "",
      }));
      setShowClinicalForm(false);
      await loadPatients(searchTerm);
    } catch (err) {
      setTreatmentNoteError(
        err instanceof Error ? err.message : "Unable to record treatment note"
      );
    } finally {
      setTreatmentNoteSubmitting(false);
    }
  };

  const handleOpenClinicalForm = async (p?: Patient) => {
    if (p) {
      setSelectedPatientId(p.id);

      // Pre-fill care plan data if it exists
      if (p.next_treatment?.care_plan_id) {
        try {
          const res = await fetch(`${API_BASE_URL}/consultation/care-plans/${p.next_treatment.care_plan_id}/`, {
            headers: { Authorization: `Token ${token}` }
          });
          if (res.ok) {
            const plan = await res.json();
            const schedule = (plan.plan_items?.treatment_schedule || []) as ScheduleItem[];
            setCarePlanSchedule(schedule);
            setCarePlanNumDays(schedule.length);
          }
        } catch (e) {
          console.error("Error pre-filling care plan:", e);
        }
      } else {
        // Reset for new plan
        setCarePlanSchedule([]);
        setCarePlanNumDays(0);
      }
    } else {
      setCarePlanSchedule([]);
      setCarePlanNumDays(0);
    }

    const currentPatient = p || selectedPatient;
    if (!currentPatient) {
      setTreatmentNoteError("Select a patient to document a care plan.");
      return;
    }
    setTreatmentNoteError(null);
    setShowClinicalForm(true);
  };

  const renderPatientModule = () => {
    if (!hasPatientAccess) {
      return (
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <div
            className={`${CARD_CLASS} mx-auto max-w-4xl p-8 text-center text-[#4B5563]`}
          >
            Your account does not have access to Patient Management. Please
            contact an administrator.
          </div>
        </main>
      );
    }
    return (
      <>
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-screen-2xl space-y-6">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            {renderPatientDirectory()}
          </div>
        </main>
        {renderClinicalFormDrawer()}
        {showTreatmentHistory && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/30"
              onClick={() => setShowTreatmentHistory(false)}
              role="presentation"
            />
            <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl overflow-y-auto border-l border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <div>
                  <h3 className="text-lg font-medium text-slate-900">
                    Full history
                  </h3>
                </div>
                <button
                  type="button"
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  onClick={() => setShowTreatmentHistory(false)}
                >
                  Close
                </button>
              </div>
              <div className="space-y-3 p-6">
                {(() => {
                  const patient = patients.find((p) => p.id === selectedPatientId);
                  const historyNotes =
                    patient?.admissions?.flatMap((admission) =>
                      (admission.clinical_notes ?? [])
                        .filter((note) => {
                          const role = (note.recorded_by_role || "").toLowerCase();
                          const isLab = role.includes("lab");
                          const isTriage = role.includes("triage");
                          return (
                            !isLab &&
                            !isTriage &&
                            (note.treatment_details ||
                              note.remarks ||
                              note.complaints ||
                              note.assessment ||
                              note.note)
                          );
                        })
                        .map((note) => ({ ...note, admissionId: admission.id }))
                    ) ?? [];
                  const sortedNotes = historyNotes.sort(
                    (a, b) =>
                      Date.parse(b.documented_at ?? b.created_at ?? "") -
                      Date.parse(a.documented_at ?? a.created_at ?? "")
                  );
                  if (sortedNotes.length === 0) {
                    return (
                      <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-4 text-sm text-slate-500">
                        No documented treatment records yet.
                      </p>
                    );
                  }
                  return sortedNotes.map((note, idx) => (
                    <div
                      key={note.id ?? `${note.admissionId}-${idx}`}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="grid grid-cols-3 gap-3 text-[12px] text-slate-700">
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-slate-400">
                            Route
                          </p>
                          <p>{note.treatment_route || "None"}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-slate-400">
                            Complaints
                          </p>
                          <p>{note.complaints || "None"}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-slate-400">
                            Next review
                          </p>
                          <p>
                            {(note.next_review_date ||
                              note.next_treatment_date ||
                              "None") +
                              (note.next_treatment_time
                                ? ` ${note.next_treatment_time}`
                                : "")}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-slate-400">
                            BP (mmHg)
                          </p>
                          <p>
                            {note.systolic_bp || note.diastolic_bp
                              ? `${note.systolic_bp ?? "None"}/${note.diastolic_bp ?? "None"
                              }`
                              : "None"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-slate-400">
                            Pulse (bpm)
                          </p>
                          <p>{note.pulse || "None"}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-slate-400">
                            Resp. (cpm)
                          </p>
                          <p>{note.respiration_rate || "None"}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-slate-400">
                            Temp (°C)
                          </p>
                          <p>{note.temperature_c || "None"}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-slate-400">
                            SpO₂ (%)
                          </p>
                          <p>{note.oxygen_saturation || "None"}</p>
                        </div>
                        <div className="col-span-3">
                          <p className="text-[11px] uppercase tracking-wide text-slate-400">
                            Remarks
                          </p>
                          <p>{note.remarks || "None"}</p>
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
                  ));
                })()}
              </div>
            </div>
          </>
        )}
        {patientSubPage === "Patient Details" && selectedPatient && (
          <div
            className="fixed inset-0 z-30 bg-black/10"
            onClick={() => setPatientSubPage("Patient Directory")}
            role="presentation"
          />
        )}
        {renderPatientInfoDrawer()}
      </>
    );
  };

  const renderPlaceholderModule = () => (
    <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className={`${CARD_CLASS} p-8 text-center text-[#4B5563]`}>
          The {MODULE_LABELS[activeModule] ?? "selected"} module is not
          available yet.
        </div>
      </div>
    </main>
  );

  const renderMainContent = () => {
    if (activeModule === "triage") {
      return (
        <TriageModule
          activeTab={triageActiveTab}
          onTabChange={setTriageActiveTab}
          form={triageForm}
          patients={triagePatients}
          onFieldChange={handleTriageFieldChange}
          onSave={handleTriageSave}
          onEscalate={handleTriageEscalation}
          onEdit={handleTriageEdit}
          errorMessage={triageSaveError}
          fetchError={triageFetchError}
        />
      );
    }
    if (activeModule === "laboratory") {
      return (
        <LabModule
          activeTab={labActiveTab}
          onTabChange={setLabActiveTab}
          queue={labQueue}
          records={labRecords}
          orders={labOrders}
          tasks={labTasks}
          onRecord={handleOpenLabModal}
          onRefreshQueue={loadLabQueue}
          onRefreshRecords={loadLabRecords}
          onRefreshOrders={loadLabOrders}
          onRefreshTasks={loadLabTasks}
          fetchError={labFetchError}
        />
      );
    }
    if (activeModule === "consultation") {
      return (
        <ConsultationModule
          apiBaseUrl={API_BASE_URL}
          token={token}
          user={user}
        />
      );
    }
    if (activeModule === "patients") {
      return renderPatientModule();
    }
    return renderPlaceholderModule();
  };

  const renderLabModal = () => {
    if (!labModalOpen) {
      return null;
    }

    const labValidation = validateLabForm();
    const labFieldErrors: Record<string, string> = {};
    const labSaveDisabled = !labResultForm.triageEntryId || !!labValidation.message;
    const selectedOrder = labOrders.find(
      (order) => order.triage_entry === labResultForm.triageEntryId
    );
    const selectedQueueEntry =
      labQueue.find((entry) => entry.id === labResultForm.triageEntryId) || null;
    const labPatientName =
      selectedOrder?.patient_name || selectedQueueEntry?.name || "Patient";
    const labPatientId =
      selectedOrder?.patient_identifier ||
      selectedQueueEntry?.patient_identifier ||
      "PMA0000";
    const urinalysisFields = [
      { key: "leukocytes", label: "Leukocytes" },
      { key: "nitrite", label: "Nitrite" },
      { key: "urobilinogen", label: "Urobilinogen" },
      { key: "protein", label: "Protein" },
      { key: "ph", label: "pH" },
      { key: "specific_gravity", label: "Specific gravity" },
      { key: "blood", label: "Blood" },
      { key: "ketone", label: "Ketone" },
      { key: "bilirubin", label: "Bilirubin" },
      { key: "glucose", label: "Glucose" },
      { key: "appearance", label: "Appearance" },
      { key: "colour", label: "Colour" },
      { key: "consistency", label: "Consistency" },
      { key: "mucus", label: "Mucus" },
      { key: "amorphous", label: "Amorphous" },
      { key: "epithelial_cells", label: "Epithelial cells" },
      { key: "pus_cells", label: "Pus cells" },
      { key: "yeast_cells", label: "Yeast cells" },
      { key: "casts", label: "Casts" },
    ] as const;
    const stoolFields = [
      { key: "appearance", label: "Appearance" },
      { key: "colour", label: "Colour" },
      { key: "consistency", label: "Consistency" },
      { key: "blood", label: "Blood" },
      { key: "mucus", label: "Mucus" },
    ] as const;
    const electrolyteFields = [
      { key: "na", label: "Na (mmol/L)" },
      { key: "k", label: "K (mmol/L)" },
      { key: "cl", label: "Cl (mmol/L)" },
    ] as const;

    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 px-4 py-6">
        <div className="h-full w-full max-w-6xl overflow-y-auto rounded-[32px] bg-white p-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-medium text-slate-900">
                Record lab results
              </h3>
            </div>
            <button
              className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-500"
              type="button"
              onClick={() => {
                setLabModalOpen(false);
                setLabError(null);
              }}
            >
              Close
            </button>
          </div>

          {labError && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {labError}
            </div>
          )}

          <div className="mt-6 grid gap-6 lg:grid-cols-[320px,1fr]">
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 max-h-[72vh] overflow-y-auto">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Test list
              </p>
              <div className="space-y-2">
                {LAB_TESTS.map((test) => {
                  const selected = labResultForm.testType === test;
                  const hasCompleted =
                    labResultForm.triageEntryId &&
                    labCompletedTests[labResultForm.triageEntryId]?.has(test);
                  return (
                    <button
                      key={test}
                      type="button"
                      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm font-semibold ${selected
                        ? "border-blue-300 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
                        }`}
                      onClick={() => loadDraftForTest(test)}
                    >
                      <span className="flex items-center gap-2">
                        {test}
                        {hasCompleted && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                            ✓ Recorded
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex max-h-[78vh] flex-col gap-4 overflow-y-auto pr-1">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Order details
                    </p>
                    <h4 className="text-base font-semibold text-slate-900">
                      {labPatientName}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Patient ID: {labPatientId}
                    </p>
                    <p className="text-xs text-slate-500">
                      Test: {labResultForm.testType || "Select a test"}
                    </p>
                  </div>
                  <div className="text-xs text-slate-500">
                    <p>
                      Ordered on:{" "}
                      {selectedOrder?.created_at
                        ? formatDateTime(selectedOrder.created_at)
                        : "—"}
                    </p>
                    <p>
                      Priority:{" "}
                      {selectedOrder?.priority || "—"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 max-h-[65vh] overflow-y-auto">
                <div className="mb-3">
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Result entry
                  </p>
                  <p className="text-sm text-slate-600">
                    {labResultForm.testType
                      ? "Select outcome and enter required parameters."
                      : "Choose a test from the list to record results."}
                  </p>
                </div>

                <div className="space-y-4">
                  {!labResultForm.testType && (
                    <p className="text-sm text-slate-500">
                      Select a test from the list to capture results.
                    </p>
                  )}
                  {labResultForm.testType &&
                    labCategoricalOptions[labResultForm.testType] && (
                      <div className="space-y-2 md:max-w-xs">
                        <label className="text-xs font-semibold text-slate-500">
                          Outcome
                        </label>
                        <select
                          className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                          value={labCategory}
                          onChange={(event) => {
                            const value = event.target.value;
                            setLabCategory(value);
                            persistDraftForCurrentTest({ category: value });
                            setLabError(null);
                          }}
                        >
                          <option value="">Select…</option>
                          {labCategoricalOptions[labResultForm.testType].map(
                            (option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            )
                          )}
                        </select>
                        {labFieldErrors.category && (
                          <p className="text-xs text-red-600">
                            {labFieldErrors.category}
                          </p>
                        )}
                      </div>
                    )}

                  {labResultForm.testType === "RBS / FBS" && (
                    <div className="space-y-2 md:max-w-xs">
                      <label className="text-xs font-semibold text-slate-500">
                        Value (mmol/L)
                      </label>
                      <input
                        className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                        value={labNumeric}
                        onChange={(event) => {
                          const value = event.target.value;
                          setLabNumeric(value);
                          persistDraftForCurrentTest({ numeric: value });
                          setLabError(null);
                        }}
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="e.g. 5.6"
                      />
                      {labFieldErrors.numeric && (
                        <p className="text-xs text-red-600">
                          {labFieldErrors.numeric}
                        </p>
                      )}
                      <p className="text-xs text-slate-500">
                        3.5 – 7.5 mmol/L is considered normal.
                      </p>
                    </div>
                  )}

                  {labResultForm.testType === "Electrolytes" && (
                    <div className="space-y-3">
                      <label className="text-xs font-semibold text-slate-500">
                        Electrolytes
                      </label>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {electrolyteFields.map(({ key, label }) => (
                          <div key={key} className="space-y-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              {label}
                            </span>
                            <input
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                              value={electrolytesForm[key]}
                              onChange={(event) => {
                                const value = event.target.value;
                                setElectrolytesForm((prev) => {
                                  const next = {
                                    ...prev,
                                    [key]: value,
                                  } as typeof defaultElectrolytes;
                                  persistDraftForCurrentTest({
                                    electrolytes: next,
                                  });
                                  return next;
                                });
                                setLabError(null);
                              }}
                              placeholder="e.g. 135"
                            />
                          </div>
                        ))}
                      </div>
                      {labFieldErrors.electrolytes && (
                        <p className="text-xs text-red-600">
                          {labFieldErrors.electrolytes}
                        </p>
                      )}
                    </div>
                  )}

                  {labResultForm.testType === "Urinalysis" && (
                    <div className="space-y-3">
                      <label className="text-xs font-semibold text-slate-500">
                        Parameters
                      </label>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {urinalysisFields.map(({ key, label }) => (
                          <div key={key} className="space-y-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              {label}
                            </span>
                            <input
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                              value={urinalysisForm[key]}
                              onChange={(event) => {
                                const value = event.target.value;
                                setUrinalysisForm((prev) => {
                                  const next = {
                                    ...prev,
                                    [key]: value,
                                  } as typeof defaultUrinalysis;
                                  persistDraftForCurrentTest({
                                    urinalysis: next,
                                  });
                                  return next;
                                });
                                setLabError(null);
                              }}
                              placeholder="Enter value"
                            />
                          </div>
                        ))}
                      </div>
                      {labFieldErrors.urinalysis && (
                        <p className="text-xs text-red-600">
                          {labFieldErrors.urinalysis}
                        </p>
                      )}
                    </div>
                  )}

                  {labResultForm.testType === "Stool Analysis" && (
                    <div className="space-y-3">
                      <label className="text-xs font-semibold text-slate-500">
                        Parameters
                      </label>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {stoolFields.map(({ key, label }) => (
                          <div key={key} className="space-y-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              {label}
                            </span>
                            <input
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                              value={stoolForm[key]}
                              onChange={(event) => {
                                const value = event.target.value;
                                setStoolForm((prev) => {
                                  const next = {
                                    ...prev,
                                    [key]: value,
                                  } as typeof defaultStool;
                                  persistDraftForCurrentTest({ stool: next });
                                  return next;
                                });
                                setLabError(null);
                              }}
                              placeholder="Enter value"
                            />
                          </div>
                        ))}
                      </div>
                      {labFieldErrors.stool && (
                        <p className="text-xs text-red-600">
                          {labFieldErrors.stool}
                        </p>
                      )}
                    </div>
                  )}

                  {labResultForm.testType &&
                    !labCategoricalOptions[labResultForm.testType] &&
                    ![
                      "RBS / FBS",
                      "Electrolytes",
                      "Urinalysis",
                      "Stool Analysis",
                    ].includes(labResultForm.testType) && (
                      <p className="text-sm text-slate-500">
                        Add any clinical notes or supporting details below.
                      </p>
                    )}
                </div>
              </div>

              {labResultForm.testType && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500">
                      Additional notes
                    </label>
                    <textarea
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                      rows={4}
                      value={labResultForm.results}
                      onChange={(event) =>
                        setLabResultForm((prev) => {
                          const next = {
                            ...prev,
                            results: event.target.value,
                          };
                          persistDraftForCurrentTest({
                            results: next.results,
                          });
                          setLabError(null);
                          return next;
                        })
                      }
                      placeholder="Capture supporting notes or clinician comments."
                    />
                    <p className="text-xs text-slate-500">
                      Timestamp is captured automatically on save.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="sticky bottom-0 mt-4 flex justify-end rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
            <button
              type="button"
              onClick={handleLabResultSubmit}
              disabled={labSaveDisabled}
              className="rounded-full bg-[#008000] px-5 py-2 text-sm font-semibold text-white shadow-subtle hover:bg-[#008000] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (bootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F3F4F6] text-[#4B5563]">
        Preparing your workspace…
      </div>
    );
  }

  if (!token || !user) {
    return renderLogin();
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-[#111827]">
      <div className="flex min-h-screen">
        {renderSidebar()}
        <div className="flex flex-1 flex-col">
          {renderHeader()}
          {renderMainContent()}
        </div>
      </div>
      {showPatientForm && hasPatientAccess && renderPatientFormModal()}
      {showAppointmentModal && renderAppointmentModal()}
      {renderClinicalFormDrawer()}
      {renderScheduleManager()}
      {renderLabModal()}
    </div>
  );
}

export default App;
