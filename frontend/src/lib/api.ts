const API_BASE = "/api/backend";

class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    if (typeof window !== "undefined") {
      localStorage.setItem("token", token);
    }
  }

  getToken(): string | null {
    if (!this.token && typeof window !== "undefined") {
      this.token = localStorage.getItem("token");
    }
    return this.token;
  }

  clearToken() {
    this.token = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.clearToken();
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
  async getClients(params?: { status?: string; search?: string }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<any[]>(`/clients/?${query}`);
  }

  async createClient(data: any) {
    return this.request<any>("/clients/", {
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

  // Cases
  async getCases(params?: { status?: string; client_id?: string; search?: string }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<any[]>(`/cases/?${query}`);
  }

  async createCase(data: any) {
    return this.request<any>("/cases/", {
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

  // Documents
  async getDocuments(params?: { case_id?: string; doc_type?: string; search?: string }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<any[]>(`/documents/?${query}`);
  }

  async createDocument(data: any) {
    return this.request<any>("/documents/", {
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

  async getTemplates() {
    return this.request<any[]>("/documents/templates/");
  }

  // Billing
  async getInvoices(params?: { client_id?: string; status?: string }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<any[]>(`/billing/invoices?${query}`);
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

  async getTimeEntries(params?: { case_id?: string; is_billed?: string }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<any[]>(`/billing/time-entries?${query}`);
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
}

export const api = new ApiClient();
