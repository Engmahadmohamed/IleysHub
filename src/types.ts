export type UserRole = 'superadmin' | 'schooladmin' | 'quranadmin' | 'teacher';

export interface Organization {
  id: string;
  name: string;
  ownerName: string;
  email: string;
  location: string;
  monthlySubscription: number;
  logoUrl?: string;
  type: 'school' | 'quran' | 'both';
  status: 'active' | 'suspended' | 'expired';
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  role: UserRole;
  organizationId: string;
  active: boolean;
  password?: string;
  createdAt: string;
}

export interface Student {
  id: string;
  studentId: string; // Auto-generated ID (e.g. STU-1001)
  fullName: string;
  studentPhone: string;
  parentPhone: string;
  address: string;
  gender: 'male' | 'female';
  dob: string;
  subjects: string[]; // List of subject IDs
  fee: number;
  profilePhoto?: string;
  organizationId: string;
  createdAt: string;
}

export interface Teacher {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  salary: number;
  subjects: string[]; // List of subject IDs
  rooms: string[]; // List of room numbers
  timeSchedule: {
    day: string; // e.g. "Monday"
    startTime: string; // "08:00"
    endTime: string; // "10:00"
  }[];
  profilePhoto?: string;
  organizationId: string;
  createdAt: string;
  password?: string;
}

export interface Subject {
  id: string;
  name: string;
  teacherId: string;
  roomId: string;
  startTime: string; // "08:00"
  endTime: string; // "09:30"
  capacity: number;
  organizationId: string;
}

export interface Room {
  id: string;
  roomNumber: string;
  capacity: number;
  building: string;
  status: 'available' | 'occupied' | 'maintenance';
  organizationId: string;
}

export interface AttendanceItem {
  studentId: string;
  fullName: string;
  status: 'present' | 'absent' | 'late';
}

export interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  roomId: string;
  subjectId: string;
  teacherId: string;
  organizationId: string;
  records: AttendanceItem[];
  createdAt: string;
}

export interface FeeRecord {
  id: string;
  studentId: string;
  studentName: string;
  amount: number;
  status: 'paid' | 'unpaid';
  paidAt?: string;
  invoiceNumber: string;
  month: string; // e.g. "June 2026"
  organizationId: string;
}

export interface SalaryRecord {
  id: string;
  teacherId: string;
  teacherName: string;
  amount: number;
  status: 'pending' | 'paid';
  paidAt?: string;
  month: string; // e.g. "June 2026"
  organizationId: string;
}

export interface Exam {
  id: string;
  title: string;
  type: 'school' | 'class';
  subjectId?: string; // If specific class
  targetClass?: string; // e.g. "Grade 10" or "All"
  createdAt: string;
  published: boolean;
  organizationId: string;
}

export interface StudentExamResult {
  studentId: string;
  studentName: string;
  marks: number;
  grade: string;
}

export interface ExamResultRecord {
  id: string;
  examId: string;
  examTitle: string;
  subjectId?: string;
  organizationId: string;
  results: StudentExamResult[];
  average: number;
  published: boolean;
  createdAt: string;
}
