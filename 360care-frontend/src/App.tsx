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
import CareBridgeModule from "./modules/care-bridge/CareBridgeModule";
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
  type LabResultFormState,
  type LabTab,
  LAB_TESTS,
} from "./modules/lab/types";
import { CARD_CLASS, CARD_SECTION_CLASS } from "./ui/styles";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "/api";
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

const strokeColor = (active: boolean) => (active ? "#2563EB" : "#9CA3AF");

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

const BridgeIcon: NavIcon = ({ active }) => (
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
    <path d="M4 15c0-4 3.6-7 8-7s8 3 8 7" />
    <path d="M4 15v4" />
    <path d="M20 15v4" />
    <path d="M4 17h16" />
    <circle cx="9" cy="11.5" r="1" />
    <circle cx="15" cy="11.5" r="1" />
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
      { key: "patients", label: "Patients", icon: PatientsIcon },
      { key: "appointments", label: "Appointments", icon: CalendarIcon },
      { key: "billing", label: "Finance", icon: BillingIcon },
      { key: "pharmacy", label: "Pharmacy", icon: PharmacyIcon },
      { key: "laboratory", label: "Laboratory", icon: LabIcon },
      { key: "care-bridge", label: "Care Bridge", icon: BridgeIcon },
      { key: "inventory", label: "Inventory", icon: InventoryIcon },
      { key: "reports", label: "Reports", icon: ReportsIcon },
      { key: "support", label: "Support", icon: SupportIcon },
    ],
  },
];

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
  const [triagePatients, setTriagePatients] = useState<TriagePatientEntry[]>(
    []
  );
  const [triageEditingId, setTriageEditingId] = useState<number | null>(null);
  const [triageFetchError, setTriageFetchError] = useState<string | null>(null);
  const [labActiveTab, setLabActiveTab] = useState<LabTab>("queue");
  const [labQueue, setLabQueue] = useState<LabQueueEntry[]>([]);
  const [labRecords, setLabRecords] = useState<LabRecordEntry[]>([]);
  const [labModalOpen, setLabModalOpen] = useState(false);
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
  const defaultBloodSlide = {
    result: "",
    species: "",
    speciesMixed: {
      falciparum: false,
      vivax: false,
      malariae: false,
      ovale: false,
    },
    parasitemia: "",
  };
  const [bloodSlideForm, setBloodSlideForm] = useState({
    ...defaultBloodSlide,
  });
  const [labTestDrafts, setLabTestDrafts] = useState<
    Record<
      string,
      {
        category?: string;
        numeric?: string;
        results?: string;
        bloodSlide?: typeof defaultBloodSlide;
      }
    >
  >({});
  const [triageSaveError, setTriageSaveError] = useState<string | null>(null);
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
  const selectedPatient = useMemo(
    () =>
      treatmentReadyPatients.find(
        (patient) => patient.id === selectedPatientId
      ) ?? null,
    [treatmentReadyPatients, selectedPatientId]
  );
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
          `${API_BASE_URL}/patients/${
            term ? `?q=${encodeURIComponent(term)}` : ""
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
      const entries: LabQueueEntry[] = payload.map((entry: any) => ({
        id: entry.id,
        name: entry.full_name || entry.name || "Patient",
        age: entry.age?.toString?.() || "",
        sex: entry.sex || "",
        arrival: entry.arrival_method || "Walk-in",
        date: entry.admission_date || entry.date || "",
        symptoms: entry.symptoms || "",
        status: entry.status || "triage",
      }));
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
    setShowClinicalForm(false);
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
      return;
    }
    loadLabQueue();
    loadLabRecords();
  }, [token, loadLabQueue, loadLabRecords]);

  useEffect(() => {
    if (!token) {
      return;
    }
    if (labActiveTab === "queue") {
      loadLabQueue();
    } else {
      loadLabRecords();
    }
  }, [labActiveTab, token, loadLabQueue, loadLabRecords]);

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
    }
  }, [activeModule, token, loadTriagePatients, loadLabQueue, loadLabRecords]);

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
      set.add("care-bridge");
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
    const weightNumber = Number(weightValue);
    if (!weightValue) {
      return "Weight is required.";
    }
    if (Number.isNaN(weightNumber) || weightNumber <= 0 || weightNumber > 300) {
      return "Weight must be a number between 0.1 and 300 kg.";
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
      const date = new Date(admissionDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
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
    const admissionDate =
      triageForm.admissionDate || new Date().toISOString().split("T")[0];
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
    setTriageSaveError(null);
    setTriageActiveTab("patients");
    resetTriageForm();
  }, [
    triageForm,
    triageEditingId,
    token,
    mapTriageEntry,
    resetTriageForm,
    validateTriageForm,
  ]);

  const handleTriageEscalation = useCallback(() => {
    window.alert("Escalation flow not implemented yet.");
  }, []);

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
      setBloodSlideForm({ ...defaultBloodSlide });
    },
    [defaultBloodSlide]
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
      if (test === "Blood Slide") {
        setBloodSlideForm(draft.bloodSlide ?? { ...defaultBloodSlide });
      }
      setLabError(null);
    },
    [labTestDrafts, defaultBloodSlide]
  );

  const persistDraftForCurrentTest = useCallback(
    (
      updates: Partial<{
        category: string;
        numeric: string;
        results: string;
        bloodSlide: typeof defaultBloodSlide;
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
    const fieldErrors: Record<string, string> = {};
    if (labResultForm.testType === "Blood Slide") {
      if (!bloodSlideForm.result) {
        fieldErrors.outcome = "Outcome is required.";
      }
      if (
        bloodSlideForm.result &&
        bloodSlideForm.result !== "Negative" &&
        !bloodSlideForm.parasitemia
      ) {
        fieldErrors.parasitemia = "Parasitemia level is required.";
      }
      if (
        bloodSlideForm.result === "Positive (Species Identified)" &&
        !bloodSlideForm.species
      ) {
        fieldErrors.species = "Species is required.";
      }
      if (bloodSlideForm.result === "Positive – Mixed") {
        const selected = Object.values(bloodSlideForm.speciesMixed).filter(
          Boolean
        );
        if (selected.length === 0) {
          fieldErrors.speciesMixed = "Select at least one species.";
        }
      }
      const hasError = Object.keys(fieldErrors).length > 0;
      return {
        message: hasError ? "Complete all required blood slide fields." : null,
        fieldErrors,
      };
    }
    const categoricalTests = new Set([
      "MRST",
      "H. Pylori Antibody",
      "Blood Grouping (ABO + Rh)",
      "Typhoid Test",
      "HCT (Hematocrit)",
      "VDRL / RPR",
      "HCG (Urine)",
      "HCG (Serum)",
    ]);
    if (categoricalTests.has(labResultForm.testType) && !labCategory) {
      fieldErrors.category = "Result is required.";
    }
    if (labResultForm.testType === "RBS (Random Blood Sugar)" && !labNumeric) {
      fieldErrors.numeric = "Enter the glucose value.";
    }
    const hasError = Object.keys(fieldErrors).length > 0;
    return {
      message: hasError ? "Complete all required fields." : null,
      fieldErrors,
    };
  }, [labResultForm.testType, bloodSlideForm, labCategory, labNumeric]);

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
    // Blood Slide validation and derived summary
    let derivedSummary = labResultForm.summary;
    let derivedPayload: Record<string, unknown> = {};
    if (labResultForm.testType === "Blood Slide") {
      const result = bloodSlideForm.result;
      if (!result) {
        setLabError("Select a blood slide result.");
        return;
      }
      if (result !== "Negative" && !bloodSlideForm.parasitemia) {
        setLabError("Parasitemia level is required for positive results.");
        return;
      }
      if (
        result === "Positive (Species Identified)" &&
        !bloodSlideForm.species
      ) {
        setLabError("Select species for identified positives.");
        return;
      }
      if (result === "Positive – Mixed") {
        const selected = Object.entries(bloodSlideForm.speciesMixed)
          .filter(([, checked]) => checked)
          .map(([key]) => key);
        if (selected.length === 0) {
          setLabError("Select at least one species for mixed infections.");
          return;
        }
      }
      const mixedList = Object.entries(bloodSlideForm.speciesMixed)
        .filter(([, checked]) => checked)
        .map(([key]) =>
          key === "falciparum"
            ? "P. falciparum"
            : key === "vivax"
            ? "P. vivax"
            : key === "malariae"
            ? "P. malariae"
            : "P. ovale"
        );
      derivedPayload = {
        result_type: result,
        species: bloodSlideForm.species,
        species_mixed: mixedList,
        parasitemia: bloodSlideForm.parasitemia,
      };
      if (result === "Negative") {
        derivedSummary = "Negative for malaria parasites.";
      } else if (result === "Positive (Species Identified)") {
        derivedSummary = `${bloodSlideForm.species} positive · ${bloodSlideForm.parasitemia}`;
      } else if (result === "Positive (Species Not Identified)") {
        derivedSummary = `Positive (species not identified) · ${bloodSlideForm.parasitemia}`;
      } else {
        derivedSummary = `Mixed species (${mixedList.join(", ")}) · ${
          bloodSlideForm.parasitemia
        }`;
      }
    } else {
      // Other tests: enforce category/value when defined
      const categoricalTests = new Set([
        "MRST",
        "H. Pylori Antibody",
        "Blood Grouping (ABO + Rh)",
        "Typhoid Test",
        "HCT (Hematocrit)",
        "VDRL / RPR",
        "HCG (Urine)",
        "HCG (Serum)",
      ]);
      if (categoricalTests.has(labResultForm.testType) && !labCategory) {
        setLabError("Select a result category for this test.");
        return;
      }
      if (
        labResultForm.testType === "RBS (Random Blood Sugar)" &&
        !labNumeric
      ) {
        setLabError("Enter the glucose value for RBS.");
        return;
      }
      derivedPayload = {
        category: labCategory,
        numeric_value: labNumeric,
      };
      if (labResultForm.testType === "RBS (Random Blood Sugar)" && labNumeric) {
        const value = Number(labNumeric);
        if (!Number.isNaN(value)) {
          let band = "Normal";
          if (value < 3.5) {
            band = "Low";
          } else if (value > 7.5) {
            band = "High";
          }
          derivedSummary = `RBS ${value} mmol/L · ${band}`;
          derivedPayload = { ...derivedPayload, band };
        }
      } else {
        derivedSummary =
          labCategory ||
          labResultForm.summary ||
          labResultForm.results ||
          labResultForm.testType;
      }
    }
    const recordedAtIso = labResultForm.recordedAt
      ? new Date(labResultForm.recordedAt).toISOString()
      : new Date().toISOString();
    const payload = {
      triage_entry: labResultForm.triageEntryId,
      test_type: labResultForm.testType,
      summary: derivedSummary || labResultForm.summary || labResultForm.results,
      payload: {
        ...(derivedPayload || {}),
        results: labResultForm.results,
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
      setLabQueue((prev) =>
        prev.filter((entry) => entry.id !== labResultForm.triageEntryId)
      );
      // Refresh persisted lists so triage and lab history stay in sync
      loadLabRecords();
      loadTriagePatients();
      setLabModalOpen(false);
      setLabResultForm({
        triageEntryId: null,
        testType: "",
        summary: "",
        results: "",
        recordedAt: "",
      });
      setLabError(null);
      setLabActiveTab("records");
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
    bloodSlideForm,
    token,
    loadLabRecords,
    loadTriagePatients,
    validateLabForm,
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
    <div className="grid min-h-screen grid-cols-1 bg-[#0F172A] text-slate-50 lg:grid-cols-2">
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0B1936] via-[#0F2A4D] to-[#0B1936] px-8 py-10 lg:px-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.18),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(16,185,129,0.22),transparent_30%),radial-gradient(circle_at_50%_60%,rgba(14,165,233,0.16),transparent_35%)]" />
        <div className="relative flex h-full flex-col justify-between gap-10">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-xl font-semibold text-white">
              V
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-sky-200/80">Secure Hospital Access</p>
              <p className="text-xl font-semibold text-white">Vytal Command</p>
            </div>
          </div>
          <div className="space-y-5">
            <p className="text-xs uppercase tracking-[0.25em] text-sky-200/70">Enterprise clinical cloud</p>
            <h1 className="text-4xl font-semibold leading-tight text-white lg:text-5xl">
              Coordinate triage, lab, and treatment with confidence.
            </h1>
            <p className="max-w-xl text-base text-slate-200/90">
              Encrypted access for authorised clinicians, nurses, and laboratory leads. Audit-ready sign in with regional failover and 24/7 monitoring.
            </p>
            <div className="grid gap-3 text-sm text-slate-200">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-lg font-bold text-sky-200">01</span>
                <div>
                  <p className="font-semibold text-white">Zero-trust perimeter</p>
                  <p className="text-slate-200/80">MFA-ready, token-based sessions with continuous validation.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-lg font-bold text-emerald-200">02</span>
                <div>
                  <p className="font-semibold text-white">Clinical uptime</p>
                  <p className="text-slate-200/80">Redundant endpoints to keep triage, lab, and bedside workflows online.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-lg font-bold text-amber-200">03</span>
                <div>
                  <p className="font-semibold text-white">Data governance</p>
                  <p className="text-slate-200/80">Audited access, immutable clinical notes, and least-privilege roles.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm text-slate-200/80">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-300/80">Facilities online</p>
              <p className="mt-1 text-2xl font-semibold text-white">48</p>
              <p>Across acute, outpatient, and diagnostic centers.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-300/80">Protected sessions</p>
              <p className="mt-1 text-2xl font-semibold text-white">99.99%</p>
              <p>Uptime SLA with layered observability.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center bg-slate-50 px-4 py-10">
        <div className="w-full max-w-xl rounded-[28px] border border-slate-200 bg-white p-10 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Restricted area</p>
              <h2 className="text-2xl font-semibold text-slate-900">Staff sign in</h2>
              <p className="text-sm text-slate-500">Use your issued credentials. Contact ops for access.</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-lg font-semibold text-white">
              V
            </div>
          </div>

          {loginError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {loginError}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleLoginSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Username</label>
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-slate-400">
                <span className="text-slate-400">ID</span>
                <input
                  className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  value={loginForm.username}
                  onChange={(event) =>
                    setLoginForm((prev) => ({
                      ...prev,
                      username: event.target.value,
                    }))
                  }
                  placeholder="clinic.user or email"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Password</label>
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-slate-400">
                <span className="text-slate-400">PW</span>
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

            <button
              type="submit"
              className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loginSubmitting}
            >
              {loginSubmitting ? "Signing in..." : "Enter workspace"}
            </button>
            <p className="text-center text-xs text-slate-500">
              Helpdesk: ops@vytal.local | Always-on SOC monitoring
            </p>
          </form>
        </div>
      </div>
    </div>
  );

  const renderSidebar = () => (
    <aside
      className={`hidden shrink-0 bg-[#111827] px-3 py-6 text-neutral-200 transition-all duration-200 ${
        sidebarCollapsed ? "w-20" : "w-72"
      } xl:block`}
      onMouseEnter={() => setSidebarCollapsed(false)}
      onMouseLeave={() => setSidebarCollapsed(true)}
    >
      <div
        className={`flex items-center rounded-lg bg-[#1F2937] px-3 py-4 ${
          sidebarCollapsed ? "justify-center" : "gap-3"
        }`}
      >
        <div className="rounded-lg bg-[#1D4ED8]/30 px-4 py-2 text-lg font-semibold text-white">
          V
        </div>
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
                      className={`relative flex w-full items-center gap-3 rounded-lg px-5 py-2 text-left font-medium transition ${
                        isActive
                          ? "bg-[rgba(37,99,235,0.15)] text-white"
                          : "text-neutral-400 hover:bg-[#1F2937] hover:text-white"
                      }`}
                      title={item.label}
                      onClick={() => setActiveModule(item.key)}
                    >
                      {isActive && (
                        <span className="absolute left-2 top-2 bottom-2 w-1 rounded-full bg-[#2563EB]" />
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

  const renderPatientHeader = () => (
    <header className="border-b border-[#E5E7EB] bg-white">
      <div className="mx-auto flex max-w-screen-2xl flex-col gap-4 px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9CA3AF]">
              Patient Management
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-[#111827]">
              Clinical workspace
            </h1>
            <p className="text-sm text-[#6B7280]">
              Review the queue, patient details, and clinical history without losing context.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <button
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              className="hidden rounded-full border border-[#E5E7EB] p-2 text-[#4B5563] hover:text-[#111827] sm:inline-flex"
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              type="button"
            >
              {sidebarCollapsed ? "?" : "?"}
            </button>
            <button
              onClick={handleLogout}
              className="rounded-full border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#111827] hover:bg-[#F3F4F6]"
              type="button"
            >
              Logout
            </button>
            <div className="flex items-center gap-2 rounded-full border border-[#E5E7EB] px-3 py-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#111827] text-sm font-semibold text-white">
                {userInitials || "??"}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-[#111827]">
                  {user
                    ? `${user.first_name} ${user.last_name}`.trim()
                    : "Clinician"}
                </p>
                <p className="text-xs text-[#4B5563]">{user?.username}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-full border border-[#E5E7EB] bg-[#F9FAFB] p-1 text-xs font-semibold text-[#4B5563] shadow-sm">
            {PATIENT_SUB_PAGES.map((sub) => (
              <button
                key={sub}
                onClick={() => setPatientSubPage(sub)}
                className={`rounded-full px-4 py-1 transition ${
                  patientSubPage === sub ? "bg-white text-[#111827] shadow-subtle" : "hover:bg-white/60"
                }`}
                type="button"
              >
                {sub}
              </button>
            ))}
          </div>
          <div className="flex max-w-xl flex-1 items-center gap-3">
            <div className="relative w-full">
              <input
                className="w-full rounded-full border border-[#E5E7EB] bg-white px-3 py-2 pl-9 text-sm text-[#111827] shadow-inner placeholder-[#9CA3AF] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#DBEAFE]"
                placeholder="Search patients, admissions, or identifiers"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setPatientDirectoryPage(1);
                }}
              />
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
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
            <button
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              className="inline-flex items-center rounded-full border border-[#E5E7EB] px-3 py-2 text-xs font-semibold text-[#4B5563] hover:bg-[#F3F4F6] sm:hidden"
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              type="button"
            >
              {sidebarCollapsed ? "?" : "?"}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
  const renderGenericHeader = () => (
    <header className="border-b border-[#E5E7EB] bg-white">
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-4 px-6 py-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">
            Active Module
          </p>
          <h1 className="text-lg font-semibold text-[#111827]">
            {MODULE_LABELS[activeModule] ?? "Workspace"}
          </h1>
        </div>
        <div className="flex flex-1 flex-wrap items-center justify-end gap-3 text-sm">
          <button
            onClick={() => setSidebarCollapsed((prev) => !prev)}
            className="rounded-full border border-[#E5E7EB] p-2 text-[#4B5563] hover:text-[#111827]"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? "⤵" : "⤴"}
          </button>
          <div className="flex max-w-md flex-1 items-center gap-2 rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-2">
            <input
              className="flex-1 bg-transparent text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none"
              placeholder="Search the workspace…"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <span className="text-xs text-[#9CA3AF]">⌘K</span>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-full border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#111827] hover:bg-[#F3F4F6]"
          >
            Logout
          </button>
          <div className="flex items-center gap-2 rounded-full border border-[#E5E7EB] px-3 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#111827] text-sm font-semibold text-white">
              {userInitials}
            </div>
            {!sidebarCollapsed && (
              <div>
                <p className="text-sm font-semibold text-[#111827]">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-[#4B5563]">{user?.username}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );

  const renderHeader = () =>
    activeModule === "patients" ? renderPatientHeader() : renderGenericHeader();

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
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9CA3AF]">
              Patient Directory
            </p>
            <h2 className="text-2xl font-semibold text-[#111827]">
              Queue & treatment overview
            </h2>
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
              onClick={() => setPatientDirectoryTab(tab)}
              className={`rounded-full px-4 py-2 transition ${
                patientDirectoryTab === tab
                  ? "bg-[#2563EB] text-white shadow-subtle"
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
                    Loading patients?
                  </td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-[#9CA3AF]">
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
                      className={`border-t border-[#E5E7EB] text-sm transition ${
                        active ? "bg-[#F8FAFF] shadow-inner" : index % 2 === 0 ? "bg-white" : "bg-[#F9FAFB]"
                      } hover:bg-[#EAF2FF]`}
                    >
                      <td className="px-4 py-3 font-semibold text-[#111827]">
                        {patient.patient_identifier || "?"}
                      </td>
                      <td
                        className="cursor-pointer px-4 py-3 font-medium text-[#111827]"
                        onClick={() => {
                          setSelectedPatientId(patient.id);
                          setPatientSubPage("Patient Details");
                        }}
                      >
                        {patient.first_name} {patient.last_name}
                        <div className="text-xs text-[#6B7280]">
                          {patient.emergency_contact_name || "No emergency contact"}
                        </div>
                      </td>
                      <td className="px-4 py-3">{patient.age}</td>
                      <td className="px-4 py-3">{patient.gender || "?"}</td>
                      <td className="px-4 py-3">{patient.phone_number || "?"}</td>
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
            All registered patients are still completing triage or lab steps. Treatment teams will see them here once both stages are done.
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
    const initials = `${selectedPatient.first_name[0] ?? ""}${
      selectedPatient.last_name[0] ?? ""
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
      const labNotes = latestAdmission?.clinical_notes.filter(isLabNote) ?? [];
      const labEntries =
        labNotes.length > 0
          ? labNotes.map((note) => ({
              label: formatDateTime(note.documented_at),
              value: note.treatment_details || "Result recorded",
            }))
          : (latestAdmission?.lab_tests_done || "")
              .split(/\n+/)
              .map((value) => value.trim())
              .filter(Boolean)
              .map((value, index) => ({
                label: `Lab ${index + 1}`,
                value,
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
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
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
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      );
    };

    const renderPatientTabContent = () => {
      switch (patientTab) {
        case "Summary":
          return renderPatientInformation();
        case "Records":
          return renderPatientInformation();
        default:
          return null;
      }
    };

    return (
      <section className={`${CARD_SECTION_CLASS} space-y-6`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E5EDFF] text-xl font-semibold text-[#2563EB]">
              {initials || "PT"}
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-[#111827]">
                {selectedPatient.first_name} {selectedPatient.last_name}
              </h2>
              <p className="text-sm text-[#4B5563]">
                Age {selectedPatient.age} | {selectedPatient.gender || "N/A"} | {selectedPatient.phone_number || "No phone"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {nextReviewPlan ? (
              <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-amber-600">
                    Next review
                  </p>
                  <p className="text-sm font-semibold text-amber-900">
                    {nextReviewPlan.scheduled_for
                      ? formatDateTime(nextReviewPlan.scheduled_for)
                      : "No review"}
                  </p>
                </div>
                {nextReviewPlan.scheduled_for && (
                  <button
                    type="button"
                    disabled={treatmentSubmitting}
                    onClick={() =>
                      handleCompleteNextReview(nextReviewPlan.admissionId)
                    }
                    className="text-[11px] font-semibold text-amber-800 underline decoration-dashed disabled:opacity-40"
                  >
                    Mark complete
                  </button>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500">
                No next review scheduled
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setPatientTab("Records");
                setShowClinicalForm(true);
              }}
              className="rounded-full bg-[#2563EB] px-5 py-2 text-sm font-semibold text-white shadow-subtle hover:bg-[#1D4ED8]"
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
                    ? "bg-[#2563EB] text-white shadow-subtle"
                    : "bg-[#E5E7EB] text-[#4B5563] hover:bg-[#e0e2e7]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="text-xs uppercase tracking-wide text-[#9CA3AF]">
            Latest admission ·{" "}
            <span className="text-[#4B5563]">
              {selectedPatient.latest_admission_status ?? "Pending"}
            </span>
          </div>
        </div>
        {renderPatientTabContent()}
      </section>
    );
  };

  const renderClinicalFormDrawer = () => {
    if (!showClinicalForm || !selectedPatient) {
      return null;
    }
    const patientStage = categorizePatientStatus(selectedPatient);
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
                    Admission
                  </label>
                  <select
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                    value={treatmentNoteForm.admissionId}
                    onChange={(event) =>
                      setTreatmentNoteForm((prev) => ({
                        ...prev,
                        admissionId: event.target.value,
                      }))
                    }
                    required
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
                  className="rounded-full bg-[#2563EB] px-5 py-2 text-sm font-semibold text-white shadow-subtle disabled:opacity-60 hover:bg-[#1D4ED8]"
                  disabled={treatmentNoteSubmitting}
                >
                  {treatmentNoteSubmitting
                    ? "Saving…"
                    : "Record treatment note"}
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
            `${nextReviewDate}T${
              treatmentNoteForm.nextTreatmentTime || "09:00"
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
            {patientSubPage === "Patient Directory"
              ? renderPatientDirectory()
              : renderPatientDetails()}
          </div>
        </main>
        {renderClinicalFormDrawer()}
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
          onRecord={handleOpenLabModal}
          onRefreshQueue={loadLabQueue}
          onRefreshRecords={loadLabRecords}
          fetchError={labFetchError}
        />
      );
    }
    if (activeModule === "care-bridge") {
      return <CareBridgeModule />;
    }
    if (activeModule === "patients") {
      return renderPatientModule();
    }
    return renderPlaceholderModule();
  };

  const renderPatientFormModal = () => {
    const identityFields = (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-slate-500">
              First Name
            </label>
            <input
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
              value={patientForm.first_name}
              onChange={(event) =>
                setPatientForm((prev) => ({
                  ...prev,
                  first_name: event.target.value,
                }))
              }
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">
              Last Name
            </label>
            <input
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
              value={patientForm.last_name}
              onChange={(event) =>
                setPatientForm((prev) => ({
                  ...prev,
                  last_name: event.target.value,
                }))
              }
              required
            />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-xs font-semibold text-slate-500">
              Patient ID
            </label>
            <input
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700"
              value={patientForm.patient_identifier}
              readOnly
            />
            <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-400">
              Generated with prefix{" "}
              {(patientIdPrefix && patientIdPrefix.toUpperCase()) || "PAT"}
            </p>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Age</label>
            <input
              type="number"
              min="0"
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
              value={patientForm.age}
              onChange={(event) =>
                setPatientForm((prev) => ({ ...prev, age: event.target.value }))
              }
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Sex</label>
            <select
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
              value={patientForm.gender}
              onChange={(event) =>
                setPatientForm((prev) => ({
                  ...prev,
                  gender: event.target.value,
                }))
              }
            >
              <option value="">Select</option>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-xs font-semibold text-slate-500">
              Weight (kg)
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
              value={patientForm.weight_kg}
              onChange={(event) =>
                setPatientForm((prev) => ({
                  ...prev,
                  weight_kg: event.target.value,
                }))
              }
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">
              Patient Phone
            </label>
            <input
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
              value={patientForm.phone_number}
              onChange={(event) =>
                setPatientForm((prev) => ({
                  ...prev,
                  phone_number: event.target.value,
                }))
              }
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">
              Patient Email
            </label>
            <input
              type="email"
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
              value={patientForm.email}
              onChange={(event) =>
                setPatientForm((prev) => ({
                  ...prev,
                  email: event.target.value,
                }))
              }
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">
            Address
          </label>
          <input
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
            value={patientForm.address}
            onChange={(event) =>
              setPatientForm((prev) => ({
                ...prev,
                address: event.target.value,
              }))
            }
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-slate-500">
              Next of Kin (N.O.K)
            </label>
            <input
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
              value={patientForm.emergency_contact_name}
              onChange={(event) => {
                const value = event.target.value;
                setPatientForm((prev) => ({
                  ...prev,
                  emergency_contact_name: value,
                }));
                setInitialAdmissionForm((prev) => ({
                  ...prev,
                  next_of_kin_name: value,
                }));
              }}
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">
              N.O.K Contact
            </label>
            <input
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
              value={patientForm.emergency_contact_phone}
              onChange={(event) => {
                const value = event.target.value;
                setPatientForm((prev) => ({
                  ...prev,
                  emergency_contact_phone: value,
                }));
                setInitialAdmissionForm((prev) => ({
                  ...prev,
                  next_of_kin_contact: value,
                }));
              }}
              required
            />
          </div>
        </div>
      </div>
    );

    const admissionFields = (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-slate-500">
              Admission Date
            </label>
            <input
              type="date"
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
              value={initialAdmissionForm.admission_date}
              onChange={(event) =>
                setInitialAdmissionForm((prev) => ({
                  ...prev,
                  admission_date: event.target.value,
                }))
              }
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">
              Discharge Date
            </label>
            <input
              type="date"
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
              value={initialAdmissionForm.discharge_date}
              onChange={(event) =>
                setInitialAdmissionForm((prev) => ({
                  ...prev,
                  discharge_date: event.target.value,
                }))
              }
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">
              Review Date
            </label>
            <input
              type="date"
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
              value={initialAdmissionForm.review_date}
              onChange={(event) =>
                setInitialAdmissionForm((prev) => ({
                  ...prev,
                  review_date: event.target.value,
                }))
              }
            />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-slate-500">
              Diagnosis
            </label>
            <textarea
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
              rows={2}
              value={initialAdmissionForm.provisional_diagnosis}
              onChange={(event) =>
                setInitialAdmissionForm((prev) => ({
                  ...prev,
                  provisional_diagnosis: event.target.value,
                }))
              }
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">
              Final Diagnosis
            </label>
            <textarea
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
              rows={2}
              value={initialAdmissionForm.final_diagnosis}
              onChange={(event) =>
                setInitialAdmissionForm((prev) => ({
                  ...prev,
                  final_diagnosis: event.target.value,
                }))
              }
            />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-slate-500">
              Treatment Frequency
            </label>
            <input
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
              value={initialAdmissionForm.treatment_frequency}
              onChange={(event) =>
                setInitialAdmissionForm((prev) => ({
                  ...prev,
                  treatment_frequency: event.target.value,
                }))
              }
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">
              Treatment Duration
            </label>
            <input
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
              value={initialAdmissionForm.treatment_duration}
              onChange={(event) =>
                setInitialAdmissionForm((prev) => ({
                  ...prev,
                  treatment_duration: event.target.value,
                }))
              }
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-500">
            Lab Tests Done
          </label>
          <div className="rounded-2xl border border-slate-200 p-3">
            <div className="flex flex-wrap gap-2">
              {initialAdmissionForm.lab_tests_list.map((test) => (
                <span
                  key={test}
                  className="flex items-center gap-1 rounded-full bg-[#E5EDFF] px-3 py-1 text-xs font-semibold text-[#2563EB]"
                >
                  {test}
                  <button
                    type="button"
                    onClick={() =>
                      setInitialAdmissionForm((prev) => ({
                        ...prev,
                        lab_tests_list: prev.lab_tests_list.filter(
                          (entry) => entry !== test
                        ),
                      }))
                    }
                    className="text-slate-500 hover:text-slate-800"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {LAB_TEST_CATALOG.map((test) => {
                const selected =
                  initialAdmissionForm.lab_tests_list.includes(test);
                return (
                  <button
                    type="button"
                    key={test}
                    onClick={() =>
                      setInitialAdmissionForm((prev) => {
                        const exists = prev.lab_tests_list.includes(test);
                        return {
                          ...prev,
                          lab_tests_list: exists
                            ? prev.lab_tests_list.filter(
                                (entry) => entry !== test
                              )
                            : [...prev.lab_tests_list, test],
                        };
                      })
                    }
                    className={`rounded-2xl border px-3 py-2 text-left text-xs font-semibold ${
                      selected
                        ? "border-[#2563EB] bg-[#E5EDFF] text-[#2563EB]"
                        : "border-[#E5E7EB] text-[#4B5563] hover:border-[#2563EB]"
                    }`}
                  >
                    {test}
                  </button>
                );
              })}
            </div>
            <div className="mt-3">
              <label className="text-[11px] uppercase tracking-wide text-slate-400">
                Add custom test
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  className="flex-1 rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                  value={initialAdmissionForm.lab_tests_done}
                  onChange={(event) =>
                    setInitialAdmissionForm((prev) => ({
                      ...prev,
                      lab_tests_done: event.target.value,
                    }))
                  }
                  placeholder="Enter test name"
                />
                <button
                  type="button"
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
                  onClick={() => {
                    const value = initialAdmissionForm.lab_tests_done.trim();
                    if (!value) {
                      return;
                    }
                    setInitialAdmissionForm((prev) => ({
                      ...prev,
                      lab_tests_list: prev.lab_tests_list.includes(value)
                        ? prev.lab_tests_list
                        : [...prev.lab_tests_list, value],
                      lab_tests_done: "",
                    }));
                  }}
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-slate-500">
              Allergies
            </label>
            <textarea
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
              rows={2}
              value={initialAdmissionForm.allergies}
              onChange={(event) =>
                setInitialAdmissionForm((prev) => ({
                  ...prev,
                  allergies: event.target.value,
                }))
              }
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">
              Contraindications
            </label>
            <textarea
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
              rows={2}
              value={initialAdmissionForm.contraindications}
              onChange={(event) =>
                setInitialAdmissionForm((prev) => ({
                  ...prev,
                  contraindications: event.target.value,
                }))
              }
            />
          </div>
        </div>
      </div>
    );

    const stepIndex = patientFormStep === "identity" ? 1 : 2;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
        <div className="relative flex w-full max-w-3xl flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl max-h-[90vh] min-h-[60vh] overflow-hidden">
          <button
            onClick={() => {
              setShowPatientForm(false);
              setFormError(null);
            }}
            className="absolute right-6 top-6 rounded-full border border-slate-200 p-2 text-slate-500 hover:text-slate-900"
          >
            ✕
          </button>
          <div className="sticky top-0 bg-white pb-4 pt-2">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Patient Intake
            </p>
            <h2 className="text-2xl font-semibold text-slate-900">
              Register New Patient
            </h2>
            <div className="mt-4 flex items-center gap-3 text-xs font-semibold">
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    stepIndex >= 1
                      ? "bg-[#2563EB] text-white"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  1
                </span>
                <span
                  className={
                    stepIndex >= 1 ? "text-slate-900" : "text-slate-400"
                  }
                >
                  Patient Directory
                </span>
              </div>
              <div className="h-px flex-1 bg-slate-200" />
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    stepIndex === 2
                      ? "bg-[#2563EB] text-white"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  2
                </span>
                <span
                  className={
                    stepIndex === 2 ? "text-slate-900" : "text-slate-400"
                  }
                >
                  Initial Admission
                </span>
              </div>
            </div>
          </div>
          {formError && (
            <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}
          <form
            onSubmit={handlePatientFormSubmit}
            className="mt-4 flex flex-1 min-h-0 flex-col"
          >
            <div className="flex-1 min-h-0 overflow-y-auto pr-2">
              {patientFormStep === "identity"
                ? identityFields
                : admissionFields}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => {
                  if (patientFormStep === "admission") {
                    setPatientFormStep("identity");
                  } else {
                    setShowPatientForm(false);
                    setFormError(null);
                  }
                }}
                className="rounded-full border border-[#E5E7EB] px-6 py-2 text-sm font-semibold text-[#4B5563]"
              >
                {patientFormStep === "admission" ? "Back" : "Cancel"}
              </button>
              <button
                type="submit"
                className="rounded-full bg-[#2563EB] px-6 py-2 text-sm font-semibold text-white shadow-subtle disabled:opacity-60 hover:bg-[#1D4ED8]"
                disabled={
                  patientFormStep === "admission" ? savingPatient : false
                }
              >
                {patientFormStep === "admission"
                  ? savingPatient
                    ? "Saving…"
                    : "Save & Activate"
                  : "Continue"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderAppointmentModal = () => {
    if (!showAppointmentModal) {
      return null;
    }
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-6">
        <div className="w-full max-w-2xl rounded-[32px] bg-white p-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Appointments & Scheduling
              </p>
              <h3 className="text-2xl font-semibold text-slate-900">
                Create appointment
              </h3>
              <p className="text-sm text-slate-500">
                Appointments are logged as clinical notes under an admission for
                accurate traceability.
              </p>
            </div>
            <button
              className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-500"
              type="button"
              onClick={() => {
                setAppointmentFormError(null);
                setShowAppointmentModal(false);
              }}
            >
              Close
            </button>
          </div>
          {appointmentFormError && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {appointmentFormError}
            </div>
          )}
          <form
            onSubmit={handleAppointmentFormSubmit}
            className="mt-6 space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-slate-500">
                  Admission
                </label>
                <select
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                  value={appointmentForm.admissionId}
                  onChange={(event) =>
                    setAppointmentForm((prev) => ({
                      ...prev,
                      admissionId: event.target.value,
                    }))
                  }
                  required
                >
                  <option value="">Select admission</option>
                  {selectedPatient?.admissions.map((admission) => (
                    <option key={admission.id} value={admission.id}>
                      {admission.provisional_diagnosis || "Admission"} ·{" "}
                      {formatDateOnly(admission.admission_date)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">
                  Visit type
                </label>
                <input
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                  value={appointmentForm.visitType}
                  onChange={(event) =>
                    setAppointmentForm((prev) => ({
                      ...prev,
                      visitType: event.target.value,
                    }))
                  }
                  placeholder="Consultation, Follow-up, Review…"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-slate-500">
                  Date
                </label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                  value={appointmentForm.scheduledDate}
                  onChange={(event) =>
                    setAppointmentForm((prev) => ({
                      ...prev,
                      scheduledDate: event.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">
                  Time
                </label>
                <input
                  type="time"
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                  value={appointmentForm.scheduledTime}
                  onChange={(event) =>
                    setAppointmentForm((prev) => ({
                      ...prev,
                      scheduledTime: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-slate-500">
                  Provider name
                </label>
                <input
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                  value={appointmentForm.providerName}
                  onChange={(event) =>
                    setAppointmentForm((prev) => ({
                      ...prev,
                      providerName: event.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">
                  Provider role
                </label>
                <input
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                  value={appointmentForm.providerRole}
                  onChange={(event) =>
                    setAppointmentForm((prev) => ({
                      ...prev,
                      providerRole: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500">
                Summary
              </label>
              <textarea
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                rows={3}
                value={appointmentForm.summary}
                onChange={(event) =>
                  setAppointmentForm((prev) => ({
                    ...prev,
                    summary: event.target.value,
                  }))
                }
                placeholder="Purpose of visit, planned intervention, materials to prep…"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500">
                Complaints / key notes
              </label>
              <textarea
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                rows={2}
                value={appointmentForm.complaints}
                onChange={(event) =>
                  setAppointmentForm((prev) => ({
                    ...prev,
                    complaints: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#4B5563]">
                Follow-up instructions
              </label>
              <textarea
                className="w-full rounded-2xl border border-[#E5E7EB] px-3 py-2 text-sm text-[#111827]"
                rows={2}
                value={appointmentForm.followUp}
                onChange={(event) =>
                  setAppointmentForm((prev) => ({
                    ...prev,
                    followUp: event.target.value,
                  }))
                }
                placeholder="Add preparation instructions, tests to request, or expected outcomes."
              />
            </div>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="rounded-full border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#4B5563] hover:bg-[#F3F4F6]"
                onClick={() => setShowAppointmentModal(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-full bg-[#2563EB] px-5 py-2 text-sm font-semibold text-white shadow-subtle disabled:opacity-60 hover:bg-[#1D4ED8]"
                disabled={appointmentSubmitting}
              >
                {appointmentSubmitting ? "Saving…" : "Schedule appointment"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderLabModal = () => {
    if (!labModalOpen) {
      return null;
    }

    const labValidation = validateLabForm();
    const labFieldErrors =
      labResultForm.testType && labResultForm.triageEntryId
        ? labValidation.fieldErrors
        : {};
    const labSaveDisabled =
      !labResultForm.triageEntryId || !!labValidation.message;

    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 px-4 py-6">
        <div className="h-full w-full max-w-6xl overflow-y-auto rounded-[32px] bg-white p-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Laboratory
              </p>
              <h3 className="text-2xl font-semibold text-slate-900">
                Record lab results
              </h3>
              <p className="text-sm text-slate-500">
                Pick a test from the list, then capture details on the right.
              </p>
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
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Test list
              </p>
              <div className="space-y-2">
                {LAB_TESTS.map((test) => {
                  const selected = labResultForm.testType === test;
                  return (
                    <button
                      key={test}
                      type="button"
                      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm font-semibold ${
                        selected
                          ? "border-blue-300 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
                      }`}
                      onClick={() => loadDraftForTest(test)}
                    >
                      <span>{test}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="mb-3">
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    {labResultForm.testType || "Select a test"}
                  </p>
                  <p className="text-sm text-slate-600">
                    {labResultForm.testType
                      ? "Select outcome and enter required parameters."
                      : "Choose a test from the list to begin."}
                  </p>
                </div>

                <div className="space-y-4">
                  {labResultForm.testType === "Blood Slide" && (
                    <>
                      <div className="space-y-2 md:max-w-xs">
                        <label className="text-xs font-semibold text-slate-500">
                          Outcome
                        </label>
                        <select
                          className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                          value={bloodSlideForm.result}
                          onChange={(event) =>
                            setBloodSlideForm((prev) => {
                              const next = {
                                ...prev,
                                result: event.target.value,
                              };
                              persistDraftForCurrentTest({ bloodSlide: next });
                              setLabError(null);
                              return next;
                            })
                          }
                        >
                          <option value="">Select…</option>
                          <option value="Negative">Negative</option>
                          <option value="Positive (Species Identified)">
                            Positive (Species Identified)
                          </option>
                          <option value="Positive (Species Not Identified)">
                            Positive (Species Not Identified)
                          </option>
                          <option value="Positive – Mixed">
                            Positive – Mixed
                          </option>
                        </select>
                        {labFieldErrors.outcome && (
                          <p className="text-xs text-red-600">
                            {labFieldErrors.outcome}
                          </p>
                        )}
                      </div>

                      {bloodSlideForm.result &&
                        bloodSlideForm.result !== "Negative" && (
                          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                            <div className="mb-3">
                              <p className="text-xs uppercase tracking-wide text-slate-400">
                                Blood Slide details
                              </p>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                              {bloodSlideForm.result ===
                                "Positive (Species Identified)" && (
                                <>
                                  <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-500">
                                      Species
                                    </label>
                                    <select
                                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                                      value={bloodSlideForm.species}
                                      onChange={(event) =>
                                        setBloodSlideForm((prev) => {
                                          const next = {
                                            ...prev,
                                            species: event.target.value,
                                          };
                                          persistDraftForCurrentTest({
                                            bloodSlide: next,
                                          });
                                          setLabError(null);
                                          return next;
                                        })
                                      }
                                    >
                                      <option value="">Select species…</option>
                                      <option value="Plasmodium falciparum">
                                        Plasmodium falciparum
                                      </option>
                                      <option value="Plasmodium vivax">
                                        Plasmodium vivax
                                      </option>
                                      <option value="Plasmodium malariae">
                                        Plasmodium malariae
                                      </option>
                                      <option value="Plasmodium ovale">
                                        Plasmodium ovale
                                      </option>
                                    </select>
                                    {labFieldErrors.species && (
                                      <p className="text-xs text-red-600">
                                        {labFieldErrors.species}
                                      </p>
                                    )}
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-500">
                                      Parasitemia level
                                    </label>
                                    <select
                                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                                      value={bloodSlideForm.parasitemia}
                                      onChange={(event) =>
                                        setBloodSlideForm((prev) => {
                                          const next = {
                                            ...prev,
                                            parasitemia: event.target.value,
                                          };
                                          persistDraftForCurrentTest({
                                            bloodSlide: next,
                                          });
                                          setLabError(null);
                                          return next;
                                        })
                                      }
                                    >
                                      <option value="">Select level…</option>
                                      <option value="+ (Low)">+ (Low)</option>
                                      <option value="++ (Moderate)">
                                        ++ (Moderate)
                                      </option>
                                      <option value="+++ (High)">
                                        +++ (High)
                                      </option>
                                      <option value="++++ (Very High)">
                                        ++++ (Very High)
                                      </option>
                                    </select>
                                    {labFieldErrors.parasitemia && (
                                      <p className="text-xs text-red-600">
                                        {labFieldErrors.parasitemia}
                                      </p>
                                    )}
                                  </div>
                                </>
                              )}

                              {bloodSlideForm.result ===
                                "Positive (Species Not Identified)" && (
                                <div className="space-y-2 md:col-span-2 md:max-w-xs">
                                  <label className="text-xs font-semibold text-slate-500">
                                    Parasitemia level
                                  </label>
                                  <select
                                    className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                                    value={bloodSlideForm.parasitemia}
                                    onChange={(event) =>
                                      setBloodSlideForm((prev) => {
                                        const next = {
                                          ...prev,
                                          parasitemia: event.target.value,
                                        };
                                        persistDraftForCurrentTest({
                                          bloodSlide: next,
                                        });
                                        setLabError(null);
                                        return next;
                                      })
                                    }
                                  >
                                    <option value="">Select level…</option>
                                    <option value="++">++</option>
                                    <option value="+++">+++</option>
                                    <option value="++++">++++</option>
                                  </select>
                                  {labFieldErrors.parasitemia && (
                                    <p className="text-xs text-red-600">
                                      {labFieldErrors.parasitemia}
                                    </p>
                                  )}
                                </div>
                              )}

                              {bloodSlideForm.result === "Positive – Mixed" && (
                                <>
                                  <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-semibold text-slate-500">
                                      Species present
                                    </label>
                                    <div className="grid gap-2 md:grid-cols-2">
                                      {[
                                        ["falciparum", "P. falciparum"],
                                        ["vivax", "P. vivax"],
                                        ["malariae", "P. malariae"],
                                        ["ovale", "P. ovale"],
                                      ].map(([key, label]) => (
                                        <label
                                          key={key}
                                          className="flex items-center gap-2 text-sm text-slate-700"
                                        >
                                          <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-slate-300 text-blue-600"
                                            checked={
                                              bloodSlideForm.speciesMixed[
                                                key as keyof typeof bloodSlideForm.speciesMixed
                                              ]
                                            }
                                            onChange={(event) =>
                                              setBloodSlideForm((prev) => {
                                                const next = {
                                                  ...prev,
                                                  speciesMixed: {
                                                    ...prev.speciesMixed,
                                                    [key]: event.target.checked,
                                                  },
                                                };
                                                persistDraftForCurrentTest({
                                                  bloodSlide: next,
                                                });
                                                setLabError(null);
                                                return next;
                                              })
                                            }
                                          />
                                          {label}
                                        </label>
                                      ))}
                                    </div>
                                    {labFieldErrors.speciesMixed && (
                                      <p className="text-xs text-red-600">
                                        {labFieldErrors.speciesMixed}
                                      </p>
                                    )}
                                  </div>
                                  <div className="space-y-2 md:col-span-2 md:max-w-xs">
                                    <label className="text-xs font-semibold text-slate-500">
                                      Parasitemia level
                                    </label>
                                    <select
                                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                                      value={bloodSlideForm.parasitemia}
                                      onChange={(event) =>
                                        setBloodSlideForm((prev) => {
                                          const next = {
                                            ...prev,
                                            parasitemia: event.target.value,
                                          };
                                          persistDraftForCurrentTest({
                                            bloodSlide: next,
                                          });
                                          setLabError(null);
                                          return next;
                                        })
                                      }
                                    >
                                      <option value="">Select level…</option>
                                      <option value="++">++</option>
                                      <option value="+++">+++</option>
                                      <option value="++++">++++</option>
                                    </select>
                                    {labFieldErrors.parasitemia && (
                                      <p className="text-xs text-red-600">
                                        {labFieldErrors.parasitemia}
                                      </p>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                    </>
                  )}

                  {labResultForm.testType === "MRST" && (
                    <div className="space-y-2 md:max-w-xs">
                      <label className="text-xs font-semibold text-slate-500">
                        Result
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
                        <option value="Negative">Negative</option>
                        <option value="Positive">Positive</option>
                      </select>
                      {labFieldErrors.category && (
                        <p className="text-xs text-red-600">
                          {labFieldErrors.category}
                        </p>
                      )}
                    </div>
                  )}

                  {labResultForm.testType === "H. Pylori Antibody" && (
                    <div className="space-y-2 md:max-w-xs">
                      <label className="text-xs font-semibold text-slate-500">
                        Result
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
                        <option value="Negative">Negative</option>
                        <option value="IgM positive">IgM positive</option>
                        <option value="IgA positive">IgA positive</option>
                      </select>
                      {labFieldErrors.category && (
                        <p className="text-xs text-red-600">
                          {labFieldErrors.category}
                        </p>
                      )}
                    </div>
                  )}

                  {labResultForm.testType === "Blood Grouping (ABO + Rh)" && (
                    <div className="space-y-2 md:max-w-xs">
                      <label className="text-xs font-semibold text-slate-500">
                        Blood group
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
                        {["A+", "B+", "AB+", "O+", "A-", "B-", "AB-", "O-"].map(
                          (group) => (
                            <option key={group} value={group}>
                              {group}
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

                  {labResultForm.testType === "Typhoid Test" && (
                    <div className="space-y-2 md:max-w-xs">
                      <label className="text-xs font-semibold text-slate-500">
                        Result
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
                        <option value="Negative">Negative</option>
                        <option value="IgG positive">IgG positive</option>
                        <option value="IgA positive">IgA positive</option>
                        <option value="IgM positive">IgM positive</option>
                      </select>
                      {labFieldErrors.category && (
                        <p className="text-xs text-red-600">
                          {labFieldErrors.category}
                        </p>
                      )}
                    </div>
                  )}

                  {labResultForm.testType === "HCT (Hematocrit)" && (
                    <div className="space-y-2 md:max-w-xs">
                      <label className="text-xs font-semibold text-slate-500">
                        Result
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
                        <option value="Negative">Negative</option>
                        <option value="Positive">Positive</option>
                      </select>
                      {labFieldErrors.category && (
                        <p className="text-xs text-red-600">
                          {labFieldErrors.category}
                        </p>
                      )}
                    </div>
                  )}

                  {labResultForm.testType === "VDRL / RPR" && (
                    <div className="space-y-2 md:max-w-xs">
                      <label className="text-xs font-semibold text-slate-500">
                        Result
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
                        <option value="Negative">Negative</option>
                        <option value="Positive">Positive</option>
                      </select>
                      {labFieldErrors.category && (
                        <p className="text-xs text-red-600">
                          {labFieldErrors.category}
                        </p>
                      )}
                    </div>
                  )}

                  {labResultForm.testType === "HCG (Urine)" && (
                    <div className="space-y-2 md:max-w-xs">
                      <label className="text-xs font-semibold text-slate-500">
                        Result
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
                        <option value="Negative">Negative</option>
                        <option value="Positive">Positive</option>
                      </select>
                      {labFieldErrors.category && (
                        <p className="text-xs text-red-600">
                          {labFieldErrors.category}
                        </p>
                      )}
                    </div>
                  )}

                  {labResultForm.testType === "HCG (Serum)" && (
                    <div className="space-y-2 md:max-w-xs">
                      <label className="text-xs font-semibold text-slate-500">
                        Result
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
                        <option value="Negative">Negative</option>
                        <option value="Positive">Positive</option>
                      </select>
                      {labFieldErrors.category && (
                        <p className="text-xs text-red-600">
                          {labFieldErrors.category}
                        </p>
                      )}
                    </div>
                  )}

                  {labResultForm.testType === "RBS (Random Blood Sugar)" && (
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

                  {labResultForm.testType === "CBC (Complete Blood Count)" && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-500">
                        Key parameters
                      </label>
                      <textarea
                        className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                        rows={3}
                        placeholder="Hb, WBC + diff, Platelets, MCV, MCHC…"
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
                      />
                    </div>
                  )}

                  {labResultForm.testType === "Urinalysis" && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-500">
                        Findings
                      </label>
                      <textarea
                        className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                        rows={3}
                        placeholder="Leukocytes, Nitrite, pH, SG, Protein, Glucose, Ketones, Microscopy findings…"
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
                      />
                    </div>
                  )}

                  {!labResultForm.testType && (
                    <p className="text-sm text-slate-500">
                      Select a test from the left to begin entering results.
                    </p>
                  )}
                </div>
              </div>

              {labResultForm.testType && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-500">
                        Remarks
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
                        placeholder="Capture additional parameters, remarks, or supporting notes."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-500">
                        Recorded at
                      </label>
                      <input
                        type="datetime-local"
                        className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                        value={labResultForm.recordedAt}
                        readOnly
                      />
                    </div>
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
              className="rounded-full bg-[#2563EB] px-5 py-2 text-sm font-semibold text-white shadow-subtle hover:bg-[#1D4ED8] disabled:opacity-50 disabled:cursor-not-allowed"
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
      {renderLabModal()}
    </div>
  );
}

export default App;
