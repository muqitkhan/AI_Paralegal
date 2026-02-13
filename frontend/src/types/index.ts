// Types for the AI Paralegal application

export interface User {
  id: string;
  email: string;
  name: string;
  picture: string | null;
  provider: string;
  is_active: boolean;
  firm_name: string | null;
  bar_number: string | null;
  phone: string | null;
  created_at: string;
}

export interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  company: string | null;
  status: "active" | "inactive" | "prospective";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Case {
  id: string;
  client_id: string;
  title: string;
  case_number: string | null;
  case_type: string;
  status: "open" | "in_progress" | "pending" | "closed" | "archived";
  description: string | null;
  court: string | null;
  judge: string | null;
  opposing_counsel: string | null;
  filing_date: string | null;
  estimated_value: number | null;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  case_id: string | null;
  title: string;
  doc_type: string;
  content: string | null;
  file_path: string | null;
  ai_summary: string | null;
  ai_risk_flags: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  doc_type: string;
  content: string;
  variables: string | null;
  description: string | null;
  is_system: boolean;
  created_at: string;
}

export interface Invoice {
  id: string;
  client_id: string;
  invoice_number: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes: string | null;
  due_date: string | null;
  paid_at: string | null;
  items: InvoiceItem[];
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface TimeEntry {
  id: string;
  case_id: string | null;
  description: string;
  hours: number;
  rate: number;
  date: string;
  is_billable: boolean;
  is_billed: boolean;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  event_type: string;
  description: string | null;
  location: string | null;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  reminder_minutes: number | null;
  created_at: string;
}

export interface Deadline {
  id: string;
  case_id: string | null;
  title: string;
  description: string | null;
  due_date: string;
  priority: "low" | "medium" | "high" | "critical";
  is_completed: boolean;
  completed_at: string | null;
  reminder_days: number;
  created_at: string;
}

export interface ResearchResult {
  summary: string;
  key_points: string[];
  relevant_cases: Record<string, string>[];
  relevant_statutes: Record<string, string>[];
  recommendations: string[];
  disclaimer: string;
}

export interface DocumentAnalysis {
  summary: string;
  key_clauses: string[];
  risk_flags: { clause: string; risk_level: string; explanation: string }[];
  recommendations: string[];
}
