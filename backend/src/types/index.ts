export type TenantType = 'individual' | 'study_group';
export type UserRole = 'owner' | 'member';
export type AssignmentPriority = 'low' | 'medium' | 'high';
export type AssignmentStatus = 'todo' | 'in_progress' | 'completed';
export type ExamStatus = 'upcoming' | 'completed';

export interface UserProfile {
  userId: string;
  email: string;
  name: string;
  academicLevel?: string;
  institution?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TenantMember {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  joinedAt: string;
}

export interface Tenant {
  tenantId: string;
  tenantName: string;
  tenantType: TenantType;
  ownerId: string;
  ownerEmail?: string;
  members: TenantMember[];
  createdAt: string;
  updatedAt: string;
}

export interface Course {
  courseId: string;
  tenantId: string;
  courseName: string;
  courseCode: string;
  instructor: string;
  description: string;
  color: string;
  targetGrade: string;
  progress: number; // 0 - 100
  createdAt: string;
  updatedAt: string;
}

export interface Assignment {
  assignmentId: string;
  tenantId: string;
  courseId: string;
  title: string;
  description?: string;
  dueDate: string; // ISO date string
  dueTime?: string;
  priority: AssignmentPriority;
  status: AssignmentStatus;
  weight?: number; // e.g. 15%
  grade?: number; // e.g. 92
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Exam {
  examId: string;
  tenantId: string;
  courseId: string;
  examName: string;
  examDate: string; // ISO date string
  examTime?: string;
  location?: string;
  weight?: number; // percentage
  targetGrade?: string;
  notes?: string;
  status: ExamStatus;
  createdAt: string;
  updatedAt: string;
}

export interface StudySession {
  sessionId: string;
  tenantId: string;
  userId: string;
  courseId: string;
  durationMinutes: number;
  date: string; // YYYY-MM-DD
  notes?: string;
  completedAt: string;
}

export interface Note {
  noteId: string;
  tenantId: string;
  courseId: string;
  title: string;
  content: string;
  tags: string[];
  attachmentUrl?: string;
  attachmentName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  name: string;
  tenantId: string;
  role: UserRole;
}

// DynamoDB Record format
export interface DynamoItem {
  PK: string; // e.g. TENANT#tenant_123
  SK: string; // e.g. COURSE#course_456, METADATA, ASSIGNMENT#789
  GSI1PK?: string; // e.g. USER#user_456
  GSI1SK?: string; // e.g. TENANT#tenant_123
  type: string;
  [key: string]: any;
}
