import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  UserProfile, Organization, Student, Teacher, Subject, Room, 
  AttendanceRecord, FeeRecord, SalaryRecord, Exam, ExamResultRecord 
} from '../types';
import { db, auth, createSecondaryAuthUser } from '../firebase';
import { doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, updatePassword, sendPasswordResetEmail } from 'firebase/auth';

interface AppContextType {
  // Mode Selection
  isFirebaseMode: boolean;
  setFirebaseMode: (val: boolean) => void;

  // Active User / Tenant
  currentUser: UserProfile | null;
  currentOrg: Organization | null;
  loading: boolean;
  error: string | null;

  // Global Lists
  organizations: Organization[];
  users: UserProfile[];
  students: Student[];
  teachers: Teacher[];
  subjects: Subject[];
  rooms: Room[];
  attendanceRecords: AttendanceRecord[];
  feeRecords: FeeRecord[];
  salaryRecords: SalaryRecord[];
  exams: Exam[];
  examResults: ExamResultRecord[];

  // Auth Operations
  login: (email: string, pass: string) => Promise<UserProfile>;
  logout: () => void;
  registerUser: (user: Partial<UserProfile>) => void;
  changePassword: (newPassword: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;

  // Core Operations
  addOrganization: (org: Omit<Organization, 'id' | 'createdAt'>, adminPassword?: string) => Promise<void>;
  updateOrganization: (id: string, updates: Partial<Organization>) => void;
  deleteOrganization: (id: string) => void;

  addStudent: (student: Omit<Student, 'id' | 'studentId' | 'createdAt'>) => void;
  updateStudent: (id: string, updates: Partial<Student>) => void;
  deleteStudent: (id: string) => void;
  bulkImportStudents: (studentsData: any[]) => { successCount: number; errors: string[] };

  addTeacher: (teacher: Omit<Teacher, 'id' | 'createdAt'>) => void;
  updateTeacher: (id: string, updates: Partial<Teacher>) => void;
  deleteTeacher: (id: string) => void;

  addSubject: (subject: Omit<Subject, 'id'>) => string | null;
  updateSubject: (id: string, updates: Partial<Subject>) => string | null;
  deleteSubject: (id: string) => void;

  addRoom: (room: Omit<Room, 'id'>) => void;
  updateRoom: (id: string, updates: Partial<Room>) => void;
  deleteRoom: (id: string) => void;

  saveAttendance: (record: Omit<AttendanceRecord, 'id' | 'createdAt'>) => void;
  approveFeePayment: (id: string) => void;
  approveSalaryPayment: (id: string) => void;

  createExam: (exam: Omit<Exam, 'id' | 'createdAt'>) => void;
  submitMarks: (examId: string, results: any[], average: number) => void;
  approveExamResults: (examId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Helper for generating custom human-friendly IDs
const generateId = (prefix: string, index: number) => {
  return `${prefix}-${1000 + index}`;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isFirebaseMode, setFirebaseMode] = useState<boolean>(false); // Starts as Sandbox mode for instant preview availability
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // States for Database Collections
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [examResults, setExamResults] = useState<ExamResultRecord[]>([]);

  // Local Storage Sync & Initial Seeding
  useEffect(() => {
    // Check if we have pre-populated state, if not, create rich mock data for beautiful UX
    const storedOrgs = localStorage.getItem('sms_orgs');
    const storedUsers = localStorage.getItem('sms_users');
    const storedStudents = localStorage.getItem('sms_students');
    const storedTeachers = localStorage.getItem('sms_teachers');
    const storedSubjects = localStorage.getItem('sms_subjects');
    const storedRooms = localStorage.getItem('sms_rooms');
    const storedAttendance = localStorage.getItem('sms_attendance');
    const storedFees = localStorage.getItem('sms_fees');
    const storedSalaries = localStorage.getItem('sms_salaries');
    const storedExams = localStorage.getItem('sms_exams');
    const storedResults = localStorage.getItem('sms_results');

    if (storedOrgs) {
      const parsedOrgs = JSON.parse(storedOrgs) as Organization[];
      const migratedOrgs = parsedOrgs.map(o => {
        if (!o.logoUrl) {
          if (o.id === 'org-101' || o.name.toLowerCase().includes('ileys')) {
            return { ...o, logoUrl: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=150&auto=format&fit=crop&q=80' };
          } else if (o.id === 'org-102' || o.name.toLowerCase().includes('al-noor') || o.name.toLowerCase().includes('quran')) {
            return { ...o, logoUrl: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=150&auto=format&fit=crop&q=80' };
          } else if (o.id === 'org-103' || o.name.toLowerCase().includes('greenfield') || o.name.toLowerCase().includes('primary')) {
            return { ...o, logoUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=150&auto=format&fit=crop&q=80' };
          }
        }
        return o;
      });
      setOrganizations(migratedOrgs);
      localStorage.setItem('sms_orgs', JSON.stringify(migratedOrgs));
      setUsers(JSON.parse(storedUsers || '[]'));
      setStudents(JSON.parse(storedStudents || '[]'));
      setTeachers(JSON.parse(storedTeachers || '[]'));
      setSubjects(JSON.parse(storedSubjects || '[]'));
      setRooms(JSON.parse(storedRooms || '[]'));
      setAttendanceRecords(JSON.parse(storedAttendance || '[]'));
      setFeeRecords(JSON.parse(storedFees || '[]'));
      setSalaryRecords(JSON.parse(storedSalaries || '[]'));
      setExams(JSON.parse(storedExams || '[]'));
      setExamResults(JSON.parse(storedResults || '[]'));
    } else {
      // Seed premium data
      const seedOrgs: Organization[] = [
        {
          id: 'org-101',
          name: 'Ileys Academy Secondary',
          ownerName: 'Mahad Mohamed',
          email: 'mahad@ileysacademy.com',
          location: 'Mogadishu, Somalia',
          monthlySubscription: 150,
          logoUrl: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=150&auto=format&fit=crop&q=80',
          type: 'both',
          status: 'active',
          createdAt: '2026-01-10T10:00:00Z'
        },
        {
          id: 'org-102',
          name: 'Al-Noor Quranic Center',
          ownerName: 'Sheikh Hassan',
          email: 'hassan@alnoorquran.com',
          location: 'Hargeisa, Somaliland',
          monthlySubscription: 75,
          logoUrl: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=150&auto=format&fit=crop&q=80',
          type: 'quran',
          status: 'active',
          createdAt: '2026-02-15T11:00:00Z'
        },
        {
          id: 'org-103',
          name: 'Greenfield Primary School',
          ownerName: 'Halima Ali',
          email: 'halima@greenfield.com',
          location: 'Garowe, Somalia',
          monthlySubscription: 120,
          logoUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=150&auto=format&fit=crop&q=80',
          type: 'school',
          status: 'active',
          createdAt: '2026-03-01T09:00:00Z'
        }
      ];

      const seedUsers: UserProfile[] = [
        // Super Admin
        {
          uid: 'sa-1',
          email: 'mahadmohamedone@gmail.com',
          fullName: 'Mahad Mohamed (Super Admin)',
          role: 'superadmin',
          organizationId: 'all',
          active: true,
          createdAt: '2026-01-01T00:00:00Z'
        },
        // School Admin (Ileys Academy)
        {
          uid: 'sa-101',
          email: 'admin@ileys.com',
          fullName: 'Ahmed Abdi',
          role: 'schooladmin',
          organizationId: 'org-101',
          active: true,
          createdAt: '2026-01-11T00:00:00Z'
        },
        // Quran Admin (Al-Noor)
        {
          uid: 'qa-102',
          email: 'quran@alnoor.com',
          fullName: 'Ustadh Omar',
          role: 'quranadmin',
          organizationId: 'org-102',
          active: true,
          createdAt: '2026-02-16T00:00:00Z'
        },
        // Teacher (Ileys Academy)
        {
          uid: 't-101',
          email: 'teacher@ileys.com',
          fullName: 'Marian Farah',
          role: 'teacher',
          organizationId: 'org-101',
          active: true,
          createdAt: '2026-01-12T00:00:00Z'
        }
      ];

      const seedRooms: Room[] = [
        { id: 'rm-1', roomNumber: 'Room 101', capacity: 30, building: 'Main Block', status: 'available', organizationId: 'org-101' },
        { id: 'rm-2', roomNumber: 'Room 102', capacity: 25, building: 'Main Block', status: 'occupied', organizationId: 'org-101' },
        { id: 'rm-3', roomNumber: 'Science Lab', capacity: 20, building: 'Annex B', status: 'available', organizationId: 'org-101' },
        { id: 'rm-4', roomNumber: 'Halaqah 1', capacity: 15, building: 'East Mosque', status: 'available', organizationId: 'org-102' }
      ];

      const seedSubjects: Subject[] = [
        { id: 'sub-1', name: 'Mathematics', teacherId: 't-101', roomId: 'rm-1', startTime: '08:00', endTime: '09:30', capacity: 30, organizationId: 'org-101' },
        { id: 'sub-2', name: 'English Literature', teacherId: 't-101', roomId: 'rm-2', startTime: '10:00', endTime: '11:30', capacity: 25, organizationId: 'org-101' },
        { id: 'sub-3', name: 'Science', teacherId: 't-101', roomId: 'rm-3', startTime: '12:00', endTime: '13:30', capacity: 20, organizationId: 'org-101' },
        { id: 'sub-q1', name: 'Tajweed Rules', teacherId: 'qa-102', roomId: 'rm-4', startTime: '14:00', endTime: '16:00', capacity: 15, organizationId: 'org-102' }
      ];

      const seedStudents: Student[] = [
        {
          id: 'std-1',
          studentId: 'STU-1001',
          fullName: 'Zakaria Farah',
          studentPhone: '+252615111111',
          parentPhone: '+252615999991',
          address: 'Wadajir, Mogadishu',
          gender: 'male',
          dob: '2012-05-15',
          subjects: ['sub-1', 'sub-3'],
          fee: 50,
          organizationId: 'org-101',
          createdAt: '2026-01-15T00:00:00Z'
        },
        {
          id: 'std-2',
          studentId: 'STU-1002',
          fullName: 'Aisha Jama',
          studentPhone: '+252615222222',
          parentPhone: '+252615999992',
          address: 'Hodans, Mogadishu',
          gender: 'female',
          dob: '2013-08-22',
          subjects: ['sub-1', 'sub-2'],
          fee: 55,
          organizationId: 'org-101',
          createdAt: '2026-01-16T00:00:00Z'
        },
        {
          id: 'std-3',
          studentId: 'STU-1003',
          fullName: 'Abdirahman Ali',
          studentPhone: '+252615333333',
          parentPhone: '+252615999993',
          address: 'Karan, Mogadishu',
          gender: 'male',
          dob: '2011-11-05',
          subjects: ['sub-2', 'sub-3'],
          fee: 50,
          organizationId: 'org-101',
          createdAt: '2026-01-17T00:00:00Z'
        },
        {
          id: 'std-4',
          studentId: 'STU-2001',
          fullName: 'Mustafa Hassan',
          studentPhone: '+252634444444',
          parentPhone: '+252634999994',
          address: 'New Hargeisa',
          gender: 'male',
          dob: '2014-02-12',
          subjects: ['sub-q1'],
          fee: 25,
          organizationId: 'org-102',
          createdAt: '2026-02-20T00:00:00Z'
        }
      ];

      const seedTeachers: Teacher[] = [
        {
          id: 't-101',
          fullName: 'Marian Farah',
          email: 'teacher@ileys.com',
          phone: '+252615555555',
          salary: 450,
          subjects: ['sub-1', 'sub-2', 'sub-3'],
          rooms: ['rm-1', 'rm-2', 'rm-3'],
          timeSchedule: [
            { day: 'Monday', startTime: '08:00', endTime: '13:30' },
            { day: 'Wednesday', startTime: '08:00', endTime: '13:30' }
          ],
          organizationId: 'org-101',
          createdAt: '2026-01-12T00:00:00Z'
        },
        {
          id: 'qa-102',
          fullName: 'Ustadh Omar',
          email: 'quran@alnoor.com',
          phone: '+252634123456',
          salary: 300,
          subjects: ['sub-q1'],
          rooms: ['rm-4'],
          timeSchedule: [
            { day: 'Saturday', startTime: '14:00', endTime: '16:00' },
            { day: 'Sunday', startTime: '14:00', endTime: '16:00' }
          ],
          organizationId: 'org-102',
          createdAt: '2026-02-16T00:00:00Z'
        }
      ];

      const seedFees: FeeRecord[] = [
        { id: 'f-1', studentId: 'std-1', studentName: 'Zakaria Farah', amount: 50, status: 'paid', paidAt: '2026-06-05', invoiceNumber: 'INV-2026-001', month: 'June 2026', organizationId: 'org-101' },
        { id: 'f-2', studentId: 'std-2', studentName: 'Aisha Jama', amount: 55, status: 'unpaid', invoiceNumber: 'INV-2026-002', month: 'June 2026', organizationId: 'org-101' },
        { id: 'f-3', studentId: 'std-3', studentName: 'Abdirahman Ali', amount: 50, status: 'unpaid', invoiceNumber: 'INV-2026-003', month: 'June 2026', organizationId: 'org-101' },
        { id: 'f-4', studentId: 'std-4', studentName: 'Mustafa Hassan', amount: 25, status: 'paid', paidAt: '2026-06-10', invoiceNumber: 'INV-2026-004', month: 'June 2026', organizationId: 'org-102' }
      ];

      const seedSalaries: SalaryRecord[] = [
        { id: 'sal-1', teacherId: 't-101', teacherName: 'Marian Farah', amount: 450, status: 'pending', month: 'June 2026', organizationId: 'org-101' },
        { id: 'sal-2', teacherId: 'qa-102', teacherName: 'Ustadh Omar', amount: 300, status: 'paid', paidAt: '2026-06-20', month: 'June 2026', organizationId: 'org-102' }
      ];

      const seedExams: Exam[] = [
        { id: 'ex-1', title: 'Mid-Term Mathematics Exam', type: 'class', subjectId: 'sub-1', targetClass: 'Grade 10', createdAt: '2026-05-10T10:00:00Z', published: true, organizationId: 'org-101' },
        { id: 'ex-2', title: 'Final Literature Exam', type: 'school', targetClass: 'All Secondary', createdAt: '2026-06-01T09:00:00Z', published: false, organizationId: 'org-101' }
      ];

      const seedResults: ExamResultRecord[] = [
        {
          id: 'res-1',
          examId: 'ex-1',
          examTitle: 'Mid-Term Mathematics Exam',
          subjectId: 'sub-1',
          organizationId: 'org-101',
          results: [
            { studentId: 'std-1', studentName: 'Zakaria Farah', marks: 88, grade: 'A' },
            { studentId: 'std-2', studentName: 'Aisha Jama', marks: 95, grade: 'A+' }
          ],
          average: 91.5,
          published: true,
          createdAt: '2026-05-15T15:00:00Z'
        }
      ];

      const seedAttendance: AttendanceRecord[] = [
        {
          id: 'att-1',
          date: '2026-06-25',
          roomId: 'rm-1',
          subjectId: 'sub-1',
          teacherId: 't-101',
          organizationId: 'org-101',
          records: [
            { studentId: 'std-1', fullName: 'Zakaria Farah', status: 'present' },
            { studentId: 'std-2', fullName: 'Aisha Jama', status: 'late' },
            { studentId: 'std-3', fullName: 'Abdirahman Ali', status: 'absent' }
          ],
          createdAt: '2026-06-25T08:30:00Z'
        }
      ];

      setOrganizations(seedOrgs);
      setUsers(seedUsers);
      setRooms(seedRooms);
      setSubjects(seedSubjects);
      setStudents(seedStudents);
      setTeachers(seedTeachers);
      setFeeRecords(seedFees);
      setSalaryRecords(seedSalaries);
      setExams(seedExams);
      setExamResults(seedResults);
      setAttendanceRecords(seedAttendance);

      // Save to localStorage
      localStorage.setItem('sms_orgs', JSON.stringify(seedOrgs));
      localStorage.setItem('sms_users', JSON.stringify(seedUsers));
      localStorage.setItem('sms_students', JSON.stringify(seedStudents));
      localStorage.setItem('sms_teachers', JSON.stringify(seedTeachers));
      localStorage.setItem('sms_subjects', JSON.stringify(seedSubjects));
      localStorage.setItem('sms_rooms', JSON.stringify(seedRooms));
      localStorage.setItem('sms_attendance', JSON.stringify(seedAttendance));
      localStorage.setItem('sms_fees', JSON.stringify(seedFees));
      localStorage.setItem('sms_salaries', JSON.stringify(seedSalaries));
      localStorage.setItem('sms_exams', JSON.stringify(seedExams));
      localStorage.setItem('sms_results', JSON.stringify(seedResults));
    }
  }, []);

  // Helper function to persist changes locally
  const saveStateToLocalStorage = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  // Auth Operations
  const login = async (email: string, pass: string): Promise<UserProfile> => {
    setLoading(true);
    setError(null);
    try {
      // 1. Try signing into Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), pass);
      const firebaseUser = userCredential.user;

      // 2. Map authenticated user to the corresponding user roles
      const trimmedEmail = email.trim().toLowerCase();
      
      // Check if it's the requested Super Admin
      if (trimmedEmail === 'mahadmohamed@gmail.com' || trimmedEmail === 'mahadmohamedone@gmail.com') {
        const superUser: UserProfile = {
          uid: firebaseUser.uid, // Use the authentic Firebase UID!
          email: trimmedEmail,
          fullName: 'Mahad Mohamed (Super Admin)',
          role: 'superadmin',
          organizationId: 'all',
          active: true,
          createdAt: new Date().toISOString()
        };

        // Sync Super Admin profile to Firestore users collection so that rules recognize them
        try {
          await setDoc(doc(db, 'users', firebaseUser.uid), superUser);
          console.log('Successfully synced Super Admin profile to Firestore:', firebaseUser.uid);
        } catch (fErr) {
          console.warn('Failed to sync Super Admin profile to Firestore users collection:', fErr);
        }

        setCurrentUser(superUser);
        setCurrentOrg(null);
        setLoading(false);
        return superUser;
      }

      // Check among registered/seeded users
      const foundUser = users.find(u => u.email.trim().toLowerCase() === trimmedEmail);
      if (foundUser) {
        if (!foundUser.active) {
          await signOut(auth);
          throw new Error('This account is suspended. Inactive users cannot login.');
        }
        
        const org = organizations.find(o => o.id === foundUser.organizationId) || null;
        if (org && org.status !== 'active') {
          await signOut(auth);
          throw new Error(`Login blocked: Organization ${org.name} is ${org.status}.`);
        }

        // Align UID with Firebase Auth UID
        const updatedUser = { ...foundUser, uid: firebaseUser.uid };

        // Sync school/quran admin/teacher profile to Firestore users collection so rules recognize their role/orgId!
        try {
          await setDoc(doc(db, 'users', firebaseUser.uid), {
            uid: firebaseUser.uid,
            email: updatedUser.email,
            fullName: updatedUser.fullName,
            role: updatedUser.role,
            organizationId: updatedUser.organizationId,
            active: updatedUser.active,
            password: updatedUser.password || '123456',
            createdAt: updatedUser.createdAt || new Date().toISOString()
          });
          console.log('Successfully synced user profile to Firestore:', firebaseUser.uid);
        } catch (fErr) {
          console.warn('Failed to sync user profile to Firestore users collection:', fErr);
        }

        setCurrentUser(updatedUser);
        setCurrentOrg(org);
        setLoading(false);
        return updatedUser;
      } else {
        // Fallback profile if user is authenticated in Firebase but not in the mock DB
        const fallbackUser: UserProfile = {
          uid: firebaseUser.uid,
          email: trimmedEmail,
          fullName: firebaseUser.displayName || 'Staff Member',
          role: 'teacher',
          organizationId: 'org-101',
          active: true,
          createdAt: new Date().toISOString()
        };

        try {
          await setDoc(doc(db, 'users', firebaseUser.uid), fallbackUser);
        } catch (fErr) {
          console.warn('Failed to sync fallback user profile to Firestore users collection:', fErr);
        }

        setCurrentUser(fallbackUser);
        setCurrentOrg(organizations.find(o => o.id === 'org-101') || null);
        setLoading(false);
        return fallbackUser;
      }
    } catch (firebaseErr: any) {
      console.warn('Firebase Auth failed, using local/sandbox fallback:', firebaseErr);
      
      // Sandbox fallback logic for smooth offline/instant preview experience
      const trimmedEmail = email.trim().toLowerCase();
      
      if (trimmedEmail === 'mahadmohamedone@gmail.com' || trimmedEmail === 'mahadmohamed@gmail.com') {
        if (pass === '123456') {
          const superUser: UserProfile = {
            uid: 'oCETlElgWMNrn8ZsSELl1Vsdr0B2', // Hardcoded requested Super Admin UID
            email: trimmedEmail,
            fullName: 'Mahad Mohamed (Super Admin)',
            role: 'superadmin',
            organizationId: 'all',
            active: true,
            createdAt: '2026-01-01T00:00:00Z'
          };
          setCurrentUser(superUser);
          setCurrentOrg(null);
          setLoading(false);
          return superUser;
        } else {
          setLoading(false);
          const err = 'Incorrect password for Super Admin.';
          setError(err);
          throw new Error(err);
        }
      }

      const foundUser = users.find(u => u.email.trim().toLowerCase() === trimmedEmail);
      if (foundUser) {
        if (!foundUser.active) {
          setLoading(false);
          const err = 'This account is suspended. Inactive users cannot login.';
          setError(err);
          throw new Error(err);
        }
        
        // Match custom registered passwords or fall back to standard 123456
        const expectedPassword = foundUser.password || '123456';
        if (pass === expectedPassword) {
          const org = organizations.find(o => o.id === foundUser.organizationId) || null;
          if (org && org.status !== 'active') {
            setLoading(false);
            const err = `Login blocked: Organization ${org.name} is ${org.status}.`;
            setError(err);
            throw new Error(err);
          }
          setCurrentUser(foundUser);
          setCurrentOrg(org);
          setLoading(false);
          return foundUser;
        } else {
          setLoading(false);
          const err = 'Invalid password.';
          setError(err);
          throw new Error(err);
        }
      } else {
        setLoading(false);
        const err = 'fadlan wll marka hore is diiwaan gali oo la xariir +2526167363730';
        setError(err);
        throw new Error(err);
      }
    }
  };

  const logout = async () => {
    setCurrentUser(null);
    setCurrentOrg(null);
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Firebase Auth sign out error:', err);
    }
  };

  const registerUser = (profile: Partial<UserProfile>) => {
    const newUser: UserProfile = {
      uid: `u-${Date.now()}`,
      email: profile.email || '',
      fullName: profile.fullName || '',
      role: profile.role || 'teacher',
      organizationId: profile.organizationId || '',
      password: profile.password || '123456',
      active: true,
      createdAt: new Date().toISOString()
    };
    const updated = [...users, newUser];
    setUsers(updated);
    saveStateToLocalStorage('sms_users', updated);
  };

  const changePassword = async (newPassword: string): Promise<void> => {
    if (!currentUser) {
      throw new Error('No user is currently logged in.');
    }

    setLoading(true);
    try {
      // 1. If we have a Firebase Auth session, update the password in Firebase Authentication
      if (auth.currentUser) {
        console.log('Updating password in Firebase Authentication...');
        await updatePassword(auth.currentUser, newPassword);
      }

      // 2. Update the user in the local memory state and local storage
      const updatedUsers = users.map(u => {
        if (u.uid === currentUser.uid) {
          return { ...u, password: newPassword };
        }
        return u;
      });
      setUsers(updatedUsers);
      saveStateToLocalStorage('sms_users', updatedUsers);

      // Update current user state as well
      const updatedProfile = { ...currentUser, password: newPassword };
      setCurrentUser(updatedProfile);

      // 3. Update the Firestore user profile
      try {
        await setDoc(doc(db, 'users', currentUser.uid), {
          ...updatedProfile,
          password: newPassword
        }, { merge: true });
        console.log('Successfully synced new password to Firestore for user:', currentUser.uid);
      } catch (fErr) {
        console.warn('Firestore password sync warning:', fErr);
      }

    } catch (err: any) {
      console.error('Password change failed:', err);
      throw new Error(err.message || 'Ku guuldareystay bedelaada ereyga sirta ah.');
    } finally {
      setLoading(false);
    }
  };

  const sendPasswordReset = async (email: string): Promise<void> => {
    setLoading(true);
    try {
      console.log('Sending password reset email to:', email);
      await sendPasswordResetEmail(auth, email);
      console.log('Password reset email sent successfully!');
    } catch (err: any) {
      console.error('Password reset email failure:', err);
      throw new Error(err.message || 'Ku guuldareystay diritaanka email-ka bedelaada ereyga sirta ah.');
    } finally {
      setLoading(false);
    }
  };

  // Organization Operations
  const addOrganization = async (orgData: Omit<Organization, 'id' | 'createdAt'>, adminPassword?: string) => {
    const adminEmail = orgData.email.trim().toLowerCase();
    const adminName = orgData.ownerName;
    const adminRole = orgData.type === 'quran' ? 'quranadmin' : 'schooladmin';
    const pwd = adminPassword || '123456';

    // 1. Create real Firebase Authentication User first to get their real UID
    let authUid = `u-${Date.now()}`;
    try {
      console.log('Registering tenant admin in Firebase Authentication:', adminEmail);
      const registeredUid = await createSecondaryAuthUser(adminEmail, pwd);
      authUid = registeredUid;
      console.log('Successfully created Firebase Auth user. UID:', authUid);
    } catch (authErr: any) {
      console.error('Firebase Auth creation failed:', authErr);
      throw new Error(`Authentication registration failed: ${authErr.message || authErr}`);
    }

    // 2. Proceed with Firestore & Local State
    const orgId = `org-${Date.now()}`;
    const newOrg: Organization = {
      ...orgData,
      id: orgId,
      createdAt: new Date().toISOString()
    };

    const adminUser: UserProfile = {
      uid: authUid, // Real Firebase UID!
      email: adminEmail,
      fullName: adminName,
      role: adminRole,
      organizationId: orgId,
      active: true,
      password: pwd,
      createdAt: new Date().toISOString()
    };

    const updated = [...organizations, newOrg];
    setOrganizations(updated);
    saveStateToLocalStorage('sms_orgs', updated);

    const updatedUsers = [...users, adminUser];
    setUsers(updatedUsers);
    saveStateToLocalStorage('sms_users', updatedUsers);

    // Sync to Cloud Firestore (default)
    try {
      await setDoc(doc(db, 'organizations', orgId), newOrg);
      console.log('Successfully synced new organization to Firestore:', orgId);

      // Also sync user profile to Firestore users collection
      await setDoc(doc(db, 'users', adminUser.uid), adminUser);
      console.log('Successfully synced admin user profile to Firestore users collection:', adminUser.uid);
    } catch (err) {
      console.error('Failed to sync organization or admin user to Firestore:', err);
    }
  };

  const updateOrganization = async (id: string, updates: Partial<Organization>) => {
    const updated = organizations.map(o => o.id === id ? { ...o, ...updates } : o);
    setOrganizations(updated);
    saveStateToLocalStorage('sms_orgs', updated);

    // Sync to Cloud Firestore (default)
    try {
      await setDoc(doc(db, 'organizations', id), {
        ...organizations.find(o => o.id === id),
        ...updates
      } as any);
      console.log('Successfully synced organization updates to Firestore:', id);
    } catch (err) {
      console.error('Failed to sync organization update to Firestore:', err);
    }
  };

  const deleteOrganization = async (id: string) => {
    const updated = organizations.filter(o => o.id !== id);
    setOrganizations(updated);
    saveStateToLocalStorage('sms_orgs', updated);

    // Sync to Cloud Firestore (default)
    try {
      await deleteDoc(doc(db, 'organizations', id));
      console.log('Successfully deleted organization from Firestore:', id);
    } catch (err) {
      console.error('Failed to delete organization from Firestore:', err);
    }
  };

  // Student Operations
  const addStudent = (studentData: Omit<Student, 'id' | 'studentId' | 'createdAt'>) => {
    const stuCount = students.filter(s => s.organizationId === studentData.organizationId).length;
    const newStudent: Student = {
      ...studentData,
      id: `std-${Date.now()}`,
      studentId: generateId('STU', stuCount + 1),
      createdAt: new Date().toISOString()
    };
    const updated = [...students, newStudent];
    setStudents(updated);
    saveStateToLocalStorage('sms_students', updated);

    // Auto-create pending fee record for this student for the current month
    const newFee: FeeRecord = {
      id: `fee-${Date.now()}`,
      studentId: newStudent.id,
      studentName: newStudent.fullName,
      amount: newStudent.fee,
      status: 'unpaid',
      invoiceNumber: `INV-2026-${Math.floor(Math.random() * 9000 + 1000)}`,
      month: 'June 2026',
      organizationId: newStudent.organizationId
    };
    const updatedFees = [...feeRecords, newFee];
    setFeeRecords(updatedFees);
    saveStateToLocalStorage('sms_fees', updatedFees);
  };

  const updateStudent = (id: string, updates: Partial<Student>) => {
    const updated = students.map(s => s.id === id ? { ...s, ...updates } : s);
    setStudents(updated);
    saveStateToLocalStorage('sms_students', updated);
  };

  const deleteStudent = (id: string) => {
    const updated = students.filter(s => s.id !== id);
    setStudents(updated);
    saveStateToLocalStorage('sms_students', updated);
  };

  const bulkImportStudents = (studentsData: any[]) => {
    const orgId = currentUser?.organizationId || '';
    if (!orgId) return { successCount: 0, errors: ['No active organization context found.'] };

    let successCount = 0;
    const errors: string[] = [];
    const newStudentsList: Student[] = [...students];
    const newFeesList: FeeRecord[] = [...feeRecords];

    studentsData.forEach((row, i) => {
      if (!row.fullName) {
        errors.push(`Row ${i + 1}: Name is required`);
        return;
      }
      const stuCount = newStudentsList.filter(s => s.organizationId === orgId).length;
      const newStu: Student = {
        id: `std-${Date.now()}-${i}`,
        studentId: generateId('STU', stuCount + 1),
        fullName: row.fullName,
        studentPhone: row.studentPhone || '',
        parentPhone: row.parentPhone || '',
        address: row.address || '',
        gender: (row.gender?.toLowerCase() === 'female') ? 'female' : 'male',
        dob: row.dob || '2015-01-01',
        subjects: row.subjects || [],
        fee: Number(row.fee) || 40,
        organizationId: orgId,
        createdAt: new Date().toISOString()
      };
      newStudentsList.push(newStu);

      // Add fee record
      newFeesList.push({
        id: `fee-${Date.now()}-${i}`,
        studentId: newStu.id,
        studentName: newStu.fullName,
        amount: newStu.fee,
        status: 'unpaid',
        invoiceNumber: `INV-2026-${Math.floor(Math.random() * 9000 + 1000)}`,
        month: 'June 2026',
        organizationId: orgId
      });

      successCount++;
    });

    if (successCount > 0) {
      setStudents(newStudentsList);
      saveStateToLocalStorage('sms_students', newStudentsList);
      setFeeRecords(newFeesList);
      saveStateToLocalStorage('sms_fees', newFeesList);
    }

    return { successCount, errors };
  };

  // Teacher Operations
  const addTeacher = (teacherData: Omit<Teacher, 'id' | 'createdAt'>) => {
    const newId = `t-${Date.now()}`;
    const newTeacher: Teacher = {
      ...teacherData,
      id: newId,
      createdAt: new Date().toISOString()
    };
    const updated = [...teachers, newTeacher];
    setTeachers(updated);
    saveStateToLocalStorage('sms_teachers', updated);

    // Sync subjects: assign this new teacher to their selected subjects
    if (teacherData.subjects && teacherData.subjects.length > 0) {
      const updatedSubjects = subjects.map(s => {
        if (teacherData.subjects.includes(s.id)) {
          return { ...s, teacherId: newId };
        }
        return s;
      });
      setSubjects(updatedSubjects);
      saveStateToLocalStorage('sms_subjects', updatedSubjects);
    }

    // Auto register as a login user
    registerUser({
      email: teacherData.email,
      fullName: teacherData.fullName,
      role: 'teacher',
      organizationId: teacherData.organizationId,
      password: teacherData.password
    });

    // Create pending salary record
    const newSalary: SalaryRecord = {
      id: `sal-${Date.now()}`,
      teacherId: newTeacher.id,
      teacherName: newTeacher.fullName,
      amount: newTeacher.salary,
      status: 'pending',
      month: 'June 2026',
      organizationId: newTeacher.organizationId
    };
    const updatedSalaries = [...salaryRecords, newSalary];
    setSalaryRecords(updatedSalaries);
    saveStateToLocalStorage('sms_salaries', updatedSalaries);
  };

  const updateTeacher = (id: string, updates: Partial<Teacher>) => {
    const updated = teachers.map(t => t.id === id ? { ...t, ...updates } : t);
    setTeachers(updated);
    saveStateToLocalStorage('sms_teachers', updated);

    // Sync subjects: assign or unassign based on updates.subjects
    if (updates.subjects) {
      const updatedSubjects = subjects.map(s => {
        if (updates.subjects!.includes(s.id)) {
          return { ...s, teacherId: id };
        } else if (s.teacherId === id) {
          return { ...s, teacherId: '' };
        }
        return s;
      });
      setSubjects(updatedSubjects);
      saveStateToLocalStorage('sms_subjects', updatedSubjects);
    }
  };

  const deleteTeacher = (id: string) => {
    const updated = teachers.filter(t => t.id !== id);
    setTeachers(updated);
    saveStateToLocalStorage('sms_teachers', updated);

    // Sync subjects: clear teacherId
    const updatedSubjects = subjects.map(s => s.teacherId === id ? { ...s, teacherId: '' } : s);
    setSubjects(updatedSubjects);
    saveStateToLocalStorage('sms_subjects', updatedSubjects);
  };

  // Subject Operations (Validation: One Room, One Time, One Subject Only / No schedule overlaps)
  const addSubject = (subjectData: Omit<Subject, 'id'>): string | null => {
    // Check overlapping schedule in the same physical room
    if (subjectData.roomId) {
      const overlap = subjects.find(s => 
        s.organizationId === subjectData.organizationId &&
        s.roomId === subjectData.roomId &&
        subjectData.startTime < s.endTime && s.startTime < subjectData.endTime
      );
      if (overlap) {
        return `Fariin Isku-dhac: Qolkan waxaa horey u deganaa maaddada "${overlap.name}" inta u dhaxeysa ${overlap.startTime} - ${overlap.endTime}. Labo maaddo isku qol iyo isku saacad/wakhti ma noqon karaan (Room is already occupied by "${overlap.name}" from ${overlap.startTime} to ${overlap.endTime}).`;
      }
    }

    // Check overlapping schedule for the same teacher
    if (subjectData.teacherId) {
      const teacherOverlap = subjects.find(s => 
        s.organizationId === subjectData.organizationId &&
        s.teacherId === subjectData.teacherId &&
        subjectData.startTime < s.endTime && s.startTime < subjectData.endTime
      );
      if (teacherOverlap) {
        return `Fariin Isku-dhac: Macallinkan waxaa horey loogu qoray maaddada "${teacherOverlap.name}" inta u dhaxeysa ${teacherOverlap.startTime} - ${teacherOverlap.endTime}. Macallinku ma dhigi karo labo maaddo oo isku saacad/wakhti ah (Teacher is already scheduled for "${teacherOverlap.name}" from ${teacherOverlap.startTime} to ${teacherOverlap.endTime}).`;
      }
    }

    const newSub: Subject = {
      ...subjectData,
      id: `sub-${Date.now()}`
    };
    const updated = [...subjects, newSub];
    setSubjects(updated);
    saveStateToLocalStorage('sms_subjects', updated);
    return null;
  };

  const updateSubject = (id: string, updates: Partial<Subject>): string | null => {
    const current = subjects.find(s => s.id === id);
    if (!current) return 'Subject not found';

    const merged = { ...current, ...updates };

    // Check overlapping schedule in the same physical room
    if (merged.roomId) {
      const overlap = subjects.find(s => 
        s.id !== id &&
        s.organizationId === merged.organizationId &&
        s.roomId === merged.roomId &&
        merged.startTime < s.endTime && s.startTime < merged.endTime
      );
      if (overlap) {
        return `Fariin Isku-dhac: Qolkan waxaa horey u deganaa maaddada "${overlap.name}" inta u dhaxeysa ${overlap.startTime} - ${overlap.endTime}. Labo maaddo isku qol iyo isku saacad/wakhti ma noqon karaan (Room is already occupied by "${overlap.name}" from ${overlap.startTime} to ${overlap.endTime}).`;
      }
    }

    // Check overlapping schedule for the same teacher
    if (merged.teacherId) {
      const teacherOverlap = subjects.find(s => 
        s.id !== id &&
        s.organizationId === merged.organizationId &&
        s.teacherId === merged.teacherId &&
        merged.startTime < s.endTime && s.startTime < merged.endTime
      );
      if (teacherOverlap) {
        return `Fariin Isku-dhac: Macallinkan waxaa horey loogu qoray maaddada "${teacherOverlap.name}" inta u dhaxeysa ${teacherOverlap.startTime} - ${teacherOverlap.endTime}. Macallinku ma dhigi karo labo maaddo oo isku saacad/wakhti ah (Teacher is already scheduled for "${teacherOverlap.name}" from ${teacherOverlap.startTime} to ${teacherOverlap.endTime}).`;
      }
    }

    const updated = subjects.map(s => s.id === id ? merged : s);
    setSubjects(updated);
    saveStateToLocalStorage('sms_subjects', updated);
    return null;
  };

  const deleteSubject = (id: string) => {
    const updated = subjects.filter(s => s.id !== id);
    setSubjects(updated);
    saveStateToLocalStorage('sms_subjects', updated);
  };

  // Room Operations
  const addRoom = (roomData: Omit<Room, 'id'>) => {
    const newRoom: Room = {
      ...roomData,
      id: `rm-${Date.now()}`
    };
    const updated = [...rooms, newRoom];
    setRooms(updated);
    saveStateToLocalStorage('sms_rooms', updated);
  };

  const updateRoom = (id: string, updates: Partial<Room>) => {
    const updated = rooms.map(r => r.id === id ? { ...r, ...updates } : r);
    setRooms(updated);
    saveStateToLocalStorage('sms_rooms', updated);
  };

  const deleteRoom = (id: string) => {
    const updated = rooms.filter(r => r.id !== id);
    setRooms(updated);
    saveStateToLocalStorage('sms_rooms', updated);
  };

  // Attendance Record Operations
  const saveAttendance = (record: Omit<AttendanceRecord, 'id' | 'createdAt'>) => {
    const newRecord: AttendanceRecord = {
      ...record,
      id: `att-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    const updated = [...attendanceRecords, newRecord];
    setAttendanceRecords(updated);
    saveStateToLocalStorage('sms_attendance', updated);
  };

  // Fee Operations
  const approveFeePayment = (id: string) => {
    const updated = feeRecords.map(f => f.id === id ? { 
      ...f, 
      status: 'paid' as const, 
      paidAt: new Date().toISOString().split('T')[0] 
    } : f);
    setFeeRecords(updated);
    saveStateToLocalStorage('sms_fees', updated);
  };

  // Salary Operations
  const approveSalaryPayment = (id: string) => {
    const updated = salaryRecords.map(s => s.id === id ? { 
      ...s, 
      status: 'paid' as const, 
      paidAt: new Date().toISOString().split('T')[0] 
    } : s);
    setSalaryRecords(updated);
    saveStateToLocalStorage('sms_salaries', updated);
  };

  // Exams & Marks Entry
  const createExam = (examData: Omit<Exam, 'id' | 'createdAt'>) => {
    const newExam: Exam = {
      ...examData,
      id: `ex-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    const updated = [...exams, newExam];
    setExams(updated);
    saveStateToLocalStorage('sms_exams', updated);
  };

  const submitMarks = (examId: string, results: any[], average: number) => {
    const exam = exams.find(e => e.id === examId);
    if (!exam) return;

    // Check if result already exists for this exam
    const existingIndex = examResults.findIndex(r => r.examId === examId);
    const newRecord: ExamResultRecord = {
      id: existingIndex >= 0 ? examResults[existingIndex].id : `res-${Date.now()}`,
      examId,
      examTitle: exam.title,
      subjectId: exam.subjectId,
      organizationId: exam.organizationId,
      results,
      average,
      published: false, // Wait for admin approval to publish
      createdAt: new Date().toISOString()
    };

    let updatedResults = [...examResults];
    if (existingIndex >= 0) {
      updatedResults[existingIndex] = newRecord;
    } else {
      updatedResults.push(newRecord);
    }
    setExamResults(updatedResults);
    saveStateToLocalStorage('sms_results', updatedResults);
  };

  const approveExamResults = (examId: string) => {
    const updatedExams = exams.map(e => e.id === examId ? { ...e, published: true } : e);
    setExams(updatedExams);
    saveStateToLocalStorage('sms_exams', updatedExams);

    const updatedResults = examResults.map(r => r.examId === examId ? { ...r, published: true } : r);
    setExamResults(updatedResults);
    saveStateToLocalStorage('sms_results', updatedResults);
  };

  return (
    <AppContext.Provider value={{
      isFirebaseMode,
      setFirebaseMode,
      currentUser,
      currentOrg,
      loading,
      error,
      organizations,
      users,
      students,
      teachers,
      subjects,
      rooms,
      attendanceRecords,
      feeRecords,
      salaryRecords,
      exams,
      examResults,
      login,
      logout,
      registerUser,
      changePassword,
      sendPasswordReset,
      addOrganization,
      updateOrganization,
      deleteOrganization,
      addStudent,
      updateStudent,
      deleteStudent,
      bulkImportStudents,
      addTeacher,
      updateTeacher,
      deleteTeacher,
      addSubject,
      updateSubject,
      deleteSubject,
      addRoom,
      updateRoom,
      deleteRoom,
      saveAttendance,
      approveFeePayment,
      approveSalaryPayment,
      createExam,
      submitMarks,
      approveExamResults
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
