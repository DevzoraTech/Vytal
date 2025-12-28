export type ConsultationFilter =
  | "awaiting_consult"
  | "results_to_review"
  | "active";

export interface WorklistEntry {
  admission_id: number;
  patient_id: number;
  patient_name: string;
  age: number;
  gender: string;
  status: string;
  latest_lab_result_at: string | null;
  latest_care_plan_version: number | null;
  latest_care_plan_status: string | null;
  last_activity_at: string;
}

export interface LabOrder {
  id: number;
  admission: number;
  triage_entry: number | null;
  ordered_by: number | null;
  status: "draft" | "submitted" | "in_progress" | "completed" | "cancelled";
  priority: "routine" | "urgent";
  order_items: string[];
  clinical_question: string;
  notes_to_lab: string;
  policy_bypass: boolean;
  created_at: string;
}

export interface LabResult {
  id: number;
  admission: number;
  patient: number;
  triage_entry: number | null;
  test_type: string;
  summary: string;
  payload: Record<string, unknown>;
  recorded_at: string;
  recorded_by_name: string;
  recorded_by_role: string;
  status: "pending" | "partial" | "complete" | "verified";
  lab_order: number | null;
}

export interface CarePlan {
  id: number;
  admission: number;
  authored_by: number | null;
  status: "draft" | "finalized";
  version: number;
  supersedes: number | null;
  assessment: string;
  plan_items: Record<string, unknown>;
  next_review_at: string | null;
  escalation_criteria: string;
  note: string;
  created_at: string;
}

export interface ConsultationTask {
  id: number;
  admission: number;
  care_plan: number | null;
  lab_order: number | null;
  task_type: "new_plan" | "results_ready" | "ack_required";
  target_role: string;
  status: "open" | "acknowledged" | "closed";
  message: string;
  acknowledged_at: string | null;
  acknowledged_by: number | null;
  created_at: string;
}

export interface ConsultationEvent {
  id: number;
  admission: number;
  event_type: string;
  payload: Record<string, unknown>;
  occurred_at: string;
  actor_name: string;
  actor_role: string;
}
