import {
  Assignment,
  Course,
  DashboardData,
  Exam,
  Note,
  StudySession,
  Tenant,
  UserProfile,
} from '../types';

const API_BASE = '/api';

class ApiClient {
  private token: string | null = null;
  private currentTenantId: string | null = null;

  constructor() {
    this.token = localStorage.getItem('studyflow_token');
    this.currentTenantId = localStorage.getItem('studyflow_tenant_id');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('studyflow_token', token);
    } else {
      localStorage.removeItem('studyflow_token');
    }
  }

  setCurrentTenantId(tenantId: string | null) {
    this.currentTenantId = tenantId;
    if (tenantId) {
      localStorage.setItem('studyflow_tenant_id', tenantId);
    } else {
      localStorage.removeItem('studyflow_tenant_id');
    }
  }

  getCurrentTenantId(): string | null {
    return this.currentTenantId;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (this.currentTenantId) {
      headers['X-Tenant-Id'] = this.currentTenantId;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}: Failed request`);
    }

    return data as T;
  }

  // --- Auth & Profile ---
  async signup(payload: any) {
    return this.request<{
      message: string;
      token: string;
      user: UserProfile;
      activeTenant: Tenant;
      tenants: Tenant[];
    }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async login(payload: { email: string; password?: string }) {
    return this.request<{
      message: string;
      token: string;
      user: UserProfile;
      activeTenant: Tenant;
      tenants: Tenant[];
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async forgotPassword(email: string) {
    return this.request<{ message: string; codeSent: boolean }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async getProfile() {
    return this.request<{ user: UserProfile; tenants: Tenant[] }>('/auth/profile');
  }

  async updateProfile(payload: Partial<UserProfile>) {
    return this.request<{ message: string; user: UserProfile }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  // --- Tenants ---
  async listUserTenants() {
    return this.request<{ tenants: Tenant[] }>('/tenants');
  }

  async getCurrentTenant() {
    return this.request<{ tenant: Tenant; role: string }>('/tenants/current');
  }

  async updateCurrentTenant(payload: { tenantName: string }) {
    return this.request<{ message: string; tenant: Tenant }>('/tenants/current', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async inviteMember(payload: { email: string; name?: string; role?: string }) {
    return this.request<{ message: string; member: any; tenant: Tenant }>('/tenants/members', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async createTenant(payload: { tenantName: string; tenantType?: string }) {
    return this.request<{ message: string; tenant: Tenant }>('/tenants', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // --- Dashboard / Analytics ---
  async getDashboard(): Promise<DashboardData> {
    return this.request<DashboardData>('/analytics');
  }

  // --- Courses ---
  async listCourses() {
    return this.request<{ courses: Course[] }>('/courses');
  }

  async getCourseDetails(id: string) {
    return this.request<{
      course: Course;
      assignments: Assignment[];
      exams: Exam[];
      notes: Note[];
      sessions: StudySession[];
      totalStudyHours: number;
    }>(`/courses/${id}`);
  }

  async createCourse(payload: Partial<Course>) {
    return this.request<{ message: string; course: Course }>('/courses', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateCourse(id: string, payload: Partial<Course>) {
    return this.request<{ message: string; course: Course }>(`/courses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteCourse(id: string) {
    return this.request<{ message: string }>(`/courses/${id}`, {
      method: 'DELETE',
    });
  }

  // --- Assignments ---
  async listAssignments(params?: { status?: string; courseId?: string }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<{ assignments: Assignment[] }>(`/assignments${query ? `?${query}` : ''}`);
  }

  async createAssignment(payload: Partial<Assignment>) {
    return this.request<{ message: string; assignment: Assignment }>('/assignments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateAssignment(id: string, payload: Partial<Assignment>) {
    return this.request<{ message: string; assignment: Assignment }>(`/assignments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async patchAssignmentStatus(id: string, status: string) {
    return this.request<{ message: string; assignment: Assignment }>(`/assignments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async deleteAssignment(id: string) {
    return this.request<{ message: string }>(`/assignments/${id}`, {
      method: 'DELETE',
    });
  }

  // --- Exams ---
  async listExams() {
    return this.request<{ exams: Exam[] }>('/exams');
  }

  async createExam(payload: Partial<Exam>) {
    return this.request<{ message: string; exam: Exam }>('/exams', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateExam(id: string, payload: Partial<Exam>) {
    return this.request<{ message: string; exam: Exam }>(`/exams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteExam(id: string) {
    return this.request<{ message: string }>(`/exams/${id}`, {
      method: 'DELETE',
    });
  }

  // --- Sessions ---
  async listSessions() {
    return this.request<{ sessions: StudySession[] }>('/sessions');
  }

  async logSession(payload: { courseId: string; durationMinutes: number; date?: string; notes?: string }) {
    return this.request<{ message: string; session: StudySession }>('/sessions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getWeeklyStats() {
    return this.request<{ weeklyData: any[]; totalWeekHours: number }>('/sessions/weekly-stats');
  }

  // --- Notes ---
  async listNotes(params?: { courseId?: string; tag?: string }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<{ notes: Note[] }>(`/notes${query ? `?${query}` : ''}`);
  }

  async getNote(id: string) {
    return this.request<{ note: Note }>(`/notes/${id}`);
  }

  async createNote(payload: Partial<Note>) {
    return this.request<{ message: string; note: Note }>('/notes', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateNote(id: string, payload: Partial<Note>) {
    return this.request<{ message: string; note: Note }>(`/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteNote(id: string) {
    return this.request<{ message: string }>(`/notes/${id}`, {
      method: 'DELETE',
    });
  }

  async getPresignedUploadUrl(fileName: string, contentType: string) {
    return this.request<{ uploadUrl: string; fileUrl: string; key: string }>('/notes/presigned-upload', {
      method: 'POST',
      body: JSON.stringify({ fileName, contentType }),
    });
  }
}

export const api = new ApiClient();
