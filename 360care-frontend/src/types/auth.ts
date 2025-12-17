export type ModuleKey =
  | "dashboard"
  | "triage"
  | "patients"
  | "appointments"
  | "billing"
  | "pharmacy"
  | "laboratory"
  | "inventory"
  | "reports"
  | "support"
  | "care-bridge";

export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  modules: ModuleKey[];
}

export const MODULE_LABELS: Record<ModuleKey, string> = {
  dashboard: "Dashboard",
  triage: "Triage",
  patients: "Patient Management",
  appointments: "Appointments",
  billing: "Finance",
  pharmacy: "Pharmacy",
  laboratory: "Laboratory",
  inventory: "Inventory",
  reports: "Reports",
  support: "Support",
  "care-bridge": "Care Bridge",
};
