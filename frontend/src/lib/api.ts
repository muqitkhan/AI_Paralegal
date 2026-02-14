const API_BASE = "/api/backend";

class ApiClient {
  setToken(_token: string) {}

  getToken(): string | null {
    return null;
  }

  clearToken() {}

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    // Add a 30-second timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let response: Response;
    try {
      response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
        credentials: "include",
        signal: controller.signal,
      });
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        throw new Error("Request timed out. Is the backend server running?");
      }
      throw new Error("Cannot reach server. Make sure the backend is running on port 8000.");
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.status === 401) {
      window.location.href = "/";
      throw new Error("Unauthorized");
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || "Request failed");
    }

    if (response.status === 204) return undefined as T;
    return response.json();
  }

  // Auth
  async register(email: string, name: string, password: string) {
    return this.request<{ access_token: string; user: any }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, name, password }),
    });
  }

  async login(email: string, password: string) {
    return this.request<{ access_token: string; user: any }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async logout() {
    return this.request<{ ok: boolean }>("/auth/logout", { method: "POST" });
  }

  async getMe() {
    return this.request<any>("/auth/me");
  }

  async updateProfile(data: any) {
    return this.request<any>("/auth/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  // Clients
  async getClients(params?: { status?: string; search?: string; limit?: number; offset?: number }) {
    const query = new URLSearchParams(params as any).toString();
    const qs = query ? `?${query}` : "";
    return this.request<any[]>(`/clients${qs}`);
  }

  async createClient(data: any) {
    return this.request<any>("/clients", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getClient(id: string) {
    return this.request<any>(`/clients/${id}`);
  }

  async updateClient(id: string, data: any) {
    return this.request<any>(`/clients/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteClient(id: string) {
    return this.request<void>(`/clients/${id}`, { method: "DELETE" });
  }

  async getAddresses() {
    return this.request<string[]>("/clients/addresses");
  }

  // Cases
  async getCases(params?: { status?: string; client_id?: string; search?: string; limit?: number; offset?: number }) {
    const query = new URLSearchParams(params as any).toString();
    const qs = query ? `?${query}` : "";
    return this.request<any[]>(`/cases${qs}`);
  }

  async createCase(data: any) {
    return this.request<any>("/cases", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getCase(id: string) {
    return this.request<any>(`/cases/${id}`);
  }

  async updateCase(id: string, data: any) {
    return this.request<any>(`/cases/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteCase(id: string) {
    return this.request<void>(`/cases/${id}`, { method: "DELETE" });
  }

  async syncCaseStatuses() {
    return this.request<{ updated: number; scanned: number }>("/cases/automation/status-sync", {
      method: "POST",
    });
  }

  async generateCaseDeadlines() {
    return this.request<{ created: number; cases_processed: number; cases_skipped: number }>("/cases/automation/deadline-templates", {
      method: "POST",
    });
  }

  // Documents
  async getDocuments(params?: { case_id?: string; doc_type?: string; search?: string; limit?: number; offset?: number }) {
    const query = new URLSearchParams(params as any).toString();
    const qs = query ? `?${query}` : "";
    return this.request<any[]>(`/documents${qs}`);
  }

  async createDocument(data: any) {
    return this.request<any>("/documents", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getDocument(id: string) {
    return this.request<any>(`/documents/${id}`);
  }

  async updateDocument(id: string, data: any) {
    return this.request<any>(`/documents/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteDocument(id: string) {
    return this.request<void>(`/documents/${id}`, { method: "DELETE" });
  }

  async analyzeDocument(data: { document_id?: string; content?: string }) {
    return this.request<any>("/documents/analyze", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async draftDocument(data: {
    doc_type: string;
    context: string;
    template_id?: string;
    variables?: Record<string, string>;
  }) {
    return this.request<any>("/documents/draft", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async draftPreview(data: {
    doc_type: string;
    context?: string;
    template_id?: string;
    case_id?: string;
  }) {
    return this.request<{ title: string; content: string; doc_type: string }>("/documents/draft/preview", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getTemplates() {
    return this.request<any[]>("/documents/templates");
  }

  // Billing
  async getInvoices(params?: { client_id?: string; status?: string; limit?: number; offset?: number }) {
    const query = new URLSearchParams(params as any).toString();
    const qs = query ? `?${query}` : "";
    return this.request<any[]>(`/billing/invoices${qs}`);
  }

  async createInvoice(data: any) {
    return this.request<any>("/billing/invoices", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getInvoice(id: string) {
    return this.request<any>(`/billing/invoices/${id}`);
  }

  async updateInvoice(id: string, data: any) {
    return this.request<any>(`/billing/invoices/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async getTimeEntries(params?: { case_id?: string; is_billed?: string; limit?: number; offset?: number }) {
    const query = new URLSearchParams(params as any).toString();
    const qs = query ? `?${query}` : "";
    return this.request<any[]>(`/billing/time-entries${qs}`);
  }

  async autoGenerateInvoice(data: { client_id: string; tax_rate?: number }) {
    return this.request<any>("/billing/invoices/auto-generate", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async createTimeEntry(data: any) {
    return this.request<any>("/billing/time-entries", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async deleteTimeEntry(id: string) {
    return this.request<void>(`/billing/time-entries/${id}`, { method: "DELETE" });
  }

  // Calendar
  async getEvents(params?: { start_date?: string; end_date?: string; event_type?: string }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<any[]>(`/calendar/events?${query}`);
  }

  async createEvent(data: any) {
    return this.request<any>("/calendar/events", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateEvent(id: string, data: any) {
    return this.request<any>(`/calendar/events/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteEvent(id: string) {
    return this.request<void>(`/calendar/events/${id}`, { method: "DELETE" });
  }

  async getDeadlines(params?: { case_id?: string; is_completed?: string; priority?: string }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<any[]>(`/calendar/deadlines?${query}`);
  }

  async createDeadline(data: any) {
    return this.request<any>("/calendar/deadlines", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateDeadline(id: string, data: any) {
    return this.request<any>(`/calendar/deadlines/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteDeadline(id: string) {
    return this.request<void>(`/calendar/deadlines/${id}`, { method: "DELETE" });
  }

  // AI Research
  async doResearch(data: {
    query: string;
    jurisdiction?: string;
    area_of_law?: string;
    include_case_law?: boolean;
    include_statutes?: boolean;
  }) {
    return this.request<any>("/ai/research", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async summarizeText(text: string) {
    return this.request<{ summary: string }>("/ai/summarize", {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  }

  async aiSuggest(text: string, fieldType: string = "general", context: string = "") {
    return this.request<{ suggestions: string[] }>("/ai/suggest", {
      method: "POST",
      body: JSON.stringify({ text, field_type: fieldType, context }),
    });
  }

  async aiComplete(text: string, fieldType: string = "general", context: string = "") {
    return this.request<{ completion: string }>("/ai/complete", {
      method: "POST",
      body: JSON.stringify({ text, field_type: fieldType, context }),
    });
  }

  async aiAutoFill(formType: string, fields: string[], existing?: Record<string, any>, context?: string) {
    return this.request<Record<string, any>>("/ai/autofill", {
      method: "POST",
      body: JSON.stringify({ form_type: formType, fields, existing: existing || {}, context: context || "" }),
    });
  }

  // Bulk Import
  async importClients(data: any[]) {
    return this.request<{ created: number; updated: number; errors: string[] }>("/clients/import", {
      method: "POST",
      body: JSON.stringify({ data }),
    });
  }

  async importCases(data: any[]) {
    return this.request<{ created: number; updated: number; errors: string[] }>("/cases/import", {
      method: "POST",
      body: JSON.stringify({ data }),
    });
  }

  async importCalendar(data: any[], type: "deadlines" | "events" = "deadlines") {
    return this.request<{ created: number; updated: number; errors: string[] }>("/calendar/import", {
      method: "POST",
      body: JSON.stringify({ data, type }),
    });
  }

  async importBilling(data: any[]) {
    return this.request<{ created: number; updated: number; errors: string[] }>("/billing/import", {
      method: "POST",
      body: JSON.stringify({ data }),
    });
  }

  async importDocuments(data: any[]) {
    return this.request<{ created: number; updated: number; errors: string[] }>("/documents/import", {
      method: "POST",
      body: JSON.stringify({ data }),
    });
  }

  // Dashboard
  async getDashboardStats() {
    return this.request<{
      active_clients: number;
      open_cases: number;
      documents: number;
      pending_invoices: number;
      total_billed: number;
      total_collected: number;
      outstanding: number;
      billable_hours_month: number;
    }>("/dashboard/stats");
  }

  async getDashboardDeadlines() {
    return this.request<Array<{
      id: string;
      title: string;
      due_date: string;
      priority: string;
      case_id: string;
      case_title: string | null;
    }>>("/dashboard/deadlines");
  }

  async getDashboardActivity() {
    return this.request<Array<{
      type: string;
      title: string;
      timestamp: string;
      icon: string;
    }>>("/dashboard/activity");
  }
}

export const api = new ApiClient();
