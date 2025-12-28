export type TriageTab = "assessment" | "patients";

export interface TriageFormState {
  fullName: string;
  age: string;
  sex: string;
  phone: string;
  arrival: string;
  email: string;
  address: string;
  admissionDate: string;
  contactName: string;
  contactPhone: string;
  symptoms: string;
  allergies: string;
  temperature: string;
  weight: string;
}

export interface TriagePatientEntry {
  id: number;
  status: string;
  name: string;
  age: string;
  sex: string;
  arrival: string;
  date: string;
  temperature: string;
  weight: string;
  symptoms: string;
  phone?: string;
  email?: string;
  address?: string;
  contactName?: string;
  contactPhone?: string;
  allergies?: string;
}

export const createDefaultTriageForm = (): TriageFormState => ({
  fullName: "",
  age: "",
  sex: "Female",
  phone: "",
  arrival: "Walk-in",
  email: "",
  address: "",
  admissionDate: new Date().toISOString().split("T")[0],
  contactName: "",
  contactPhone: "",
  symptoms: "",
  allergies: "",
  temperature: "",
  weight: "",
});
