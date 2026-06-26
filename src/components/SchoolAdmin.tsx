import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Student, Teacher, Subject, Room, AttendanceRecord, FeeRecord, SalaryRecord, Exam 
} from '../types';
import { 
  Users, BookOpen, GraduationCap, School, Calendar, DollarSign, Award, CheckCircle2, 
  Plus, Edit2, Trash2, Send, Download, Upload, Eye, Check, AlertCircle, RefreshCw, 
  MapPin, Clock, Search, Printer, MoreHorizontal, LayoutDashboard, ChevronRight, X, KeyRound 
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';

export default function SchoolAdmin() {
  const { 
    currentUser, currentOrg, students, teachers, subjects, rooms, 
    attendanceRecords, feeRecords, salaryRecords, exams, examResults,
    addStudent, updateStudent, deleteStudent, bulkImportStudents,
    addTeacher, updateTeacher, deleteTeacher,
    addSubject, updateSubject, deleteSubject,
    addRoom, updateRoom, deleteRoom,
    saveAttendance, approveFeePayment, approveSalaryPayment,
    createExam, submitMarks, approveExamResults, logout, changePassword, sendPasswordReset
  } = useApp();

  const isQuranSchool = currentOrg?.type === 'quran' || currentUser?.role === 'quranadmin';
  const [quranModeWithoutTeachers, setQuranModeWithoutTeachers] = useState<boolean>(false);

  // Bottom Nav & Main Tabs: 'dashboard' | 'students' | 'teachers' | 'more'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'students' | 'teachers' | 'subjects' | 'rooms' | 'attendance' | 'fees' | 'salaries' | 'exams' | 'reports'>('dashboard');
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [activeModal, setActiveModal] = useState<'addStudent' | 'addTeacher' | 'addSubject' | 'addRoom' | 'addExam' | 'takeAttendance' | 'enterMarks' | 'invoice' | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [selectedFee, setSelectedFee] = useState<FeeRecord | null>(null);

  // Password change state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Forms Fields State
  const [studentForm, setStudentForm] = useState({
    fullName: '', studentPhone: '', parentPhone: '', address: '', gender: 'male' as 'male' | 'female', dob: '', fee: 50, subjects: [] as string[]
  });
  const [teacherForm, setTeacherForm] = useState({
    fullName: '', email: '', phone: '', salary: 400, subjects: [] as string[], rooms: [] as string[], password: ''
  });
  const [subjectForm, setSubjectForm] = useState({
    name: '', teacherId: '', roomId: '', startTime: '08:00', endTime: '09:30', capacity: 30
  });
  const [roomForm, setRoomForm] = useState({
    roomNumber: '', capacity: 25, building: 'Main Hall', status: 'available' as 'available' | 'occupied' | 'maintenance'
  });
  const [examForm, setExamForm] = useState({
    title: '', type: 'class' as 'school' | 'class', subjectId: '', targetClass: ''
  });

  // Bulk Import state
  const [bulkInput, setBulkInput] = useState('');
  const [bulkResult, setBulkResult] = useState<{ successCount: number; errors: string[] } | null>(null);
  const [bulkSubjectId, setBulkSubjectId] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  // Student Filters State
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentFilterRoomId, setStudentFilterRoomId] = useState('');
  const [studentFilterSubjectId, setStudentFilterSubjectId] = useState('');

  // Attendance states
  const [attRoomId, setAttRoomId] = useState('');
  const [attSubjectId, setAttSubjectId] = useState('');
  const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0]);
  const [attRecords, setAttRecords] = useState<{ [studentId: string]: 'present' | 'absent' | 'late' }>({});
  const [attendanceSubTab, setAttendanceSubTab] = useState<'take' | 'absentee' | 'records'>('take');
  const [streakFilter, setStreakFilter] = useState<'all' | 'weekly' | 'monthly'>('all');

  // Marks Entry states
  const [marksData, setMarksData] = useState<{ [studentId: string]: number }>({});

  // Error Messages
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const orgId = currentOrg?.id || 'org-101';

  // Filter lists by tenant OrganizationId
  const allOrgStudents = students.filter(s => s.organizationId === orgId);
  const allOrgTeachers = teachers.filter(t => t.organizationId === orgId);
  const allOrgSubjects = subjects.filter(sub => sub.organizationId === orgId);
  const allOrgRooms = rooms.filter(rm => rm.organizationId === orgId);
  const allOrgExams = exams.filter(ex => ex.organizationId === orgId);
  const allOrgFees = feeRecords.filter(f => f.organizationId === orgId);
  const allOrgSalaries = salaryRecords.filter(s => s.organizationId === orgId);
  const allOrgAttendance = attendanceRecords.filter(a => a.organizationId === orgId);

  // Teacher specific security boundaries
  const isTeacher = currentUser?.role === 'teacher';
  const matchingTeacher = allOrgTeachers.find(t => t.id === currentUser?.uid || t.email === currentUser?.email);
  const teacherSubjects = allOrgSubjects.filter(sub => sub.teacherId === matchingTeacher?.id);
  const teacherSubjectIds = teacherSubjects.map(s => s.id);
  
  // Boundary scoped lists
  const orgStudents = isTeacher 
    ? allOrgStudents.filter(std => std.subjects.some(subId => teacherSubjectIds.includes(subId)))
    : allOrgStudents;
  const orgTeachers = allOrgTeachers; // Teachers list still accessible for lookups
  const orgSubjects = isTeacher ? teacherSubjects : allOrgSubjects;
  const orgRooms = allOrgRooms; // Rooms still visible for reference/schedules

  // Filter students based on state filters
  const filteredStudents = orgStudents.filter(student => {
    // 1. Search Query
    if (studentSearchQuery.trim()) {
      const q = studentSearchQuery.toLowerCase();
      const matchName = student.fullName.toLowerCase().includes(q);
      const matchId = student.studentId.toLowerCase().includes(q);
      const matchPhone = student.studentPhone?.toLowerCase().includes(q);
      const matchParent = student.parentPhone?.toLowerCase().includes(q);
      if (!matchName && !matchId && !matchPhone && !matchParent) {
        return false;
      }
    }

    // 2. Subject Filter (which also represents subject/time slot)
    if (studentFilterSubjectId) {
      if (!student.subjects.includes(studentFilterSubjectId)) {
        return false;
      }
    }

    // 3. Room Filter
    if (studentFilterRoomId) {
      // Find if student has any subject that is assigned to this roomId
      const hasSubjectInRoom = student.subjects.some(subId => {
        const sub = orgSubjects.find(s => s.id === subId);
        return sub && sub.roomId === studentFilterRoomId;
      });
      if (!hasSubjectInRoom) {
        return false;
      }
    }

    return true;
  });
  const orgExams = isTeacher 
    ? allOrgExams.filter(ex => ex.subjectId && teacherSubjectIds.includes(ex.subjectId))
    : allOrgExams;
  const orgFees = isTeacher ? [] : allOrgFees; // Hide financial data from teachers
  const orgSalaries = isTeacher ? allOrgSalaries.filter(sal => sal.teacherId === matchingTeacher?.id) : allOrgSalaries; // Teachers only see their own salary status
  const orgAttendance = isTeacher
    ? allOrgAttendance.filter(a => teacherSubjectIds.includes(a.subjectId))
    : allOrgAttendance;

  // Metrics
  const totalStudents = orgStudents.length;
  const totalTeachers = orgTeachers.length;
  const totalSubjects = orgSubjects.length;
  const collectedFees = orgFees.filter(f => f.status === 'paid').reduce((sum, f) => sum + f.amount, 0);
  const pendingFees = orgFees.filter(f => f.status === 'unpaid').reduce((sum, f) => sum + f.amount, 0);
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayAttendance = orgAttendance.filter(a => a.date === todayDateStr);
  const presentCount = todayAttendance.reduce((acc, curr) => 
    acc + curr.records.filter(r => r.status === 'present' || r.status === 'late').length, 0
  );
  const totalMarked = todayAttendance.reduce((acc, curr) => acc + curr.records.length, 0);
  const attendancePercentage = totalMarked > 0 ? Math.round((presentCount / totalMarked) * 100) : 0;

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.email) {
      setPasswordError('Lama heli karo email-ka isticmaalaha.');
      return;
    }
    setPasswordLoading(true);
    setPasswordError(null);
    try {
      await sendPasswordReset(currentUser.email);
      setIsPasswordModalOpen(false);
      setSuccessMessage(`Email-ka bedelaada ereyga sirta ah si guul leh ayaa loogu diray: ${currentUser.email}! Fadlan eeg sanduuqaaga fariimaha (Inbox).`);
    } catch (err: any) {
      setPasswordError(err.message || 'Ku guuldareystay dirista email-ka.');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Actions
  const handleAddStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!studentForm.subjects || studentForm.subjects.length === 0) {
      setFormError('Fadlan dooro ugu yaraan hal maaddo (Please select at least one subject).');
      return;
    }

    // Validate overlapping schedule for the selected subjects of this student
    const selectedSubjectsList = orgSubjects.filter(s => studentForm.subjects.includes(s.id));
    for (let i = 0; i < selectedSubjectsList.length; i++) {
      for (let j = i + 1; j < selectedSubjectsList.length; j++) {
        const sub1 = selectedSubjectsList[i];
        const sub2 = selectedSubjectsList[j];
        
        // Overlap condition: start1 < end2 && start2 < end1
        if (sub1.startTime < sub2.endTime && sub2.startTime < sub1.endTime) {
          setFormError(`Isku-dhac: Ma dooran kartid labo maaddo oo isku wakhti ah. "${sub1.name}" (${sub1.startTime} - ${sub1.endTime}) iyo "${sub2.name}" (${sub2.startTime} - ${sub2.endTime}) way isku dhacayaan.`);
          return;
        }
      }
    }

    if (selectedStudent) {
      updateStudent(selectedStudent.id, studentForm);
      setSuccessMessage('Macluumaadka ardayga waa la bedelay si guul leh.');
      setSelectedStudent(null);
    } else {
      addStudent({
        ...studentForm,
        organizationId: orgId
      });
      setSuccessMessage('Student registered successfully.');
    }
    setActiveModal(null);
  };

  const handleAddTeacherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // 1. Check if at least one subject is selected
    if (!teacherForm.subjects || teacherForm.subjects.length === 0) {
      setFormError("Fadlan dooro ugu yaraan hal maaddo oo uu macallinku dhigayo (Selecting at least one subject is required).");
      return;
    }

    // 2. Check for overlapping time schedules among the selected subjects
    const selectedSubjectsList = orgSubjects.filter(s => teacherForm.subjects.includes(s.id));
    for (let i = 0; i < selectedSubjectsList.length; i++) {
      for (let j = i + 1; j < selectedSubjectsList.length; j++) {
        const s1 = selectedSubjectsList[i];
        const s2 = selectedSubjectsList[j];
        // Check time overlap: (start1 < end2) && (start2 < end1)
        if (s1.startTime < s2.endTime && s2.startTime < s1.endTime) {
          setFormError(`Maaddooyinka "${s1.name}" (${s1.startTime} - ${s1.endTime}) iyo "${s2.name}" (${s2.startTime} - ${s2.endTime}) waxay leeyihiin isku saacad/wakhti. Macallinku ma dhigi karo labo maaddo oo isku saacad ah.`);
          return;
        }
      }
    }

    if (selectedTeacher) {
      updateTeacher(selectedTeacher.id, teacherForm);
      setSuccessMessage('Macluumaadka macallinka waa la bedelay si guul leh.');
      setSelectedTeacher(null);
    } else {
      addTeacher({
        ...teacherForm,
        timeSchedule: [{ day: 'Monday', startTime: '08:00', endTime: '12:00' }],
        organizationId: orgId
      });
      setSuccessMessage('Teacher profile created and credentials registered.');
    }
    setActiveModal(null);
  };

  const handleAddSubjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSubject) {
      const errorMsg = updateSubject(selectedSubject.id, {
        ...subjectForm,
        organizationId: orgId
      });
      if (errorMsg) {
        setFormError(errorMsg);
      } else {
        setSuccessMessage('Maaddada waa la bedelay si guul leh.');
        setSelectedSubject(null);
        setActiveModal(null);
      }
    } else {
      const errorMsg = addSubject({
        ...subjectForm,
        organizationId: orgId
      });
      if (errorMsg) {
        setFormError(errorMsg);
      } else {
        setSuccessMessage('Subject created successfully without schedule conflicts.');
        setActiveModal(null);
      }
    }
  };

  const handleAddRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRoom) {
      updateRoom(selectedRoom.id, roomForm);
      setSuccessMessage('Qolka waa la bedelay (Room updated successfully).');
      setSelectedRoom(null);
    } else {
      addRoom({
        ...roomForm,
        organizationId: orgId
      });
      setSuccessMessage('Qolka waa la diiwaan-geliyey (Room registered successfully).');
    }
    setActiveModal(null);
  };

  const handleAddExamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createExam({
      ...examForm,
      organizationId: orgId,
      published: false
    });
    setSuccessMessage('Exam created successfully.');
    setActiveModal(null);
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'csv') {
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        setBulkInput(text);
        setSuccessMessage('Liiska ardayda (CSV) waa la soo akhriyay!');
      };
      reader.readAsText(file);
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      reader.onload = (evt) => {
        try {
          const data = evt.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          const csv = XLSX.utils.sheet_to_csv(worksheet);
          setBulkInput(csv);
          setSuccessMessage('Faylka Excel-ka ee ardayda waa la akhriyay si guul leh!');
        } catch (err) {
          console.error(err);
          alert('Khalad ayaa dhacay xilligii la akhrinayay faylka Excel. Fadlan isticmaal template-ka saxda ah.');
        }
      };
      reader.readAsBinaryString(file);
    } else {
      alert('Fadlan soo geli feyl ah .csv ama .xlsx (Excel)');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const downloadExcelTemplate = () => {
    const headers = [['Full Name', 'Student Phone', 'Parent Phone', 'Address', 'Gender', 'Date of Birth (YYYY-MM-DD)', 'Monthly Fee']];
    const exampleRow = [
      ['Zakaria Farah', '+252615111111', '+252615999991', 'Wadajir', 'male', '2012-05-15', '50'],
      ['Amina Mohamed', '+252615222222', '+252615999992', 'Hodan', 'female', '2013-08-20', '45']
    ];
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...exampleRow]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students Template');
    XLSX.writeFile(wb, 'student_import_template.xlsx');
  };

  const handleBulkImport = () => {
    setBulkResult(null);
    if (!bulkInput.trim()) return;

    // Convert CSV lines, skipping header if present
    const lines = bulkInput.split('\n');
    const importData: any[] = [];
    
    lines.forEach((line, index) => {
      // Skip CSV/Excel headers if detected
      if (index === 0 && (line.toLowerCase().includes('name') || line.toLowerCase().includes('phone') || line.toLowerCase().includes('gender'))) {
        return;
      }
      
      const parts = line.split(',');
      if (parts.length >= 1 && parts[0].trim()) {
        importData.push({
          fullName: parts[0].trim(),
          studentPhone: parts[1]?.trim() || '',
          parentPhone: parts[2]?.trim() || '',
          address: parts[3]?.trim() || '',
          gender: parts[4]?.trim() || 'male',
          dob: parts[5]?.trim() || '2015-01-01',
          fee: Number(parts[6]?.trim()) || 45,
          subjects: bulkSubjectId ? [bulkSubjectId] : []
        });
      }
    });

    const result = bulkImportStudents(importData);
    setBulkResult(result);
    setBulkInput('');
    if (result.successCount > 0) {
      setSuccessMessage(`Si guul leh ayaa loo galiyay ${result.successCount} arday.`);
    }
  };

  // Helper: Open WhatsApp Link
  const sendWhatsAppReceipt = (fee: FeeRecord) => {
    const student = orgStudents.find(s => s.id === fee.studentId);
    const text = encodeURIComponent(
      `Salaam, this is an official fee receipt from ${currentOrg?.name || 'School'}.\n\n` +
      `Student: ${fee.studentName}\n` +
      `Invoice: ${fee.invoiceNumber}\n` +
      `Month: ${fee.month}\n` +
      `Amount Paid: $${fee.amount}\n` +
      `Status: PAID & VERIFIED\n\n` +
      `Thank you for your timely payment!`
    );
    const phone = student?.parentPhone || '+252615000000';
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  const sendAttendanceAlert = (student: Student) => {
    const text = encodeURIComponent(
      `Dear Parent, we noticed that your student ${student.fullName} was marked ABSENT today. Please contact us for details.`
    );
    window.open(`https://wa.me/${student.parentPhone}?text=${text}`, '_blank');
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#fcfcfd] pb-20 md:pb-8">
      {/* Upper Navigation Header */}
      <header className="bg-white border-b border-gray-100 p-4 sticky top-0 z-30 card-shadow text-slate-900">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {currentOrg?.logoUrl ? (
              <img 
                src={currentOrg.logoUrl} 
                alt={currentOrg.name} 
                referrerPolicy="no-referrer"
                className="w-9 h-9 object-cover rounded-xl border border-slate-100 shadow-xs shrink-0"
              />
            ) : (
              <div className="w-9 h-9 bg-black text-white rounded-xl flex items-center justify-center shrink-0">
                <School size={18} />
              </div>
            )}
            <div>
              <h1 className="text-sm md:text-base font-sans font-bold tracking-tight text-slate-900">{currentOrg?.name || 'Smart Management System'}</h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                {isQuranSchool ? `Quran Center Console ${quranModeWithoutTeachers ? '(No Teachers Mode)' : '(Standard Mode)'}` : 'School Admin Console'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isQuranSchool && (
              <button 
                onClick={() => setQuranModeWithoutTeachers(!quranModeWithoutTeachers)}
                className="hidden md:block bg-slate-50 hover:bg-slate-100 text-[10px] uppercase font-bold text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer transition-colors"
              >
                Toggle Teachers Mode
              </button>
            )}
            <button 
              onClick={() => setIsPasswordModalOpen(true)}
              className="flex items-center gap-1.5 text-xs text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <KeyRound size={14} /> Bedel Password
            </button>
            <button 
              onClick={logout}
              className="bg-black hover:bg-slate-800 text-xs text-white font-semibold px-3 py-1.5 rounded-lg border border-transparent cursor-pointer transition-colors shadow-sm"
            >
              Log Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto w-full px-4 mt-6 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar (Desktop Only) */}
        <aside className="hidden lg:block lg:col-span-3 bg-white p-4 rounded-2xl border border-gray-100 card-shadow h-fit space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">Management Modules</p>
          <button 
            onClick={() => { setActiveTab('dashboard'); setIsMoreMenuOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${activeTab === 'dashboard' ? 'active-nav' : 'text-slate-600 hover:bg-slate-50 sidebar-item'}`}
          >
            <LayoutDashboard size={18} /> Dashboard
          </button>
          <button 
            onClick={() => { setActiveTab('students'); setIsMoreMenuOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${activeTab === 'students' ? 'active-nav' : 'text-slate-600 hover:bg-slate-50 sidebar-item'}`}
          >
            <GraduationCap size={18} /> Students ({totalStudents})
          </button>
          {!isTeacher && !quranModeWithoutTeachers && (
            <button 
              onClick={() => { setActiveTab('teachers'); setIsMoreMenuOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${activeTab === 'teachers' ? 'active-nav' : 'text-slate-600 hover:bg-slate-50 sidebar-item'}`}
            >
              <Users size={18} /> Teachers ({totalTeachers})
            </button>
          )}
          {!isTeacher && (
            <button 
              onClick={() => { setActiveTab('subjects'); setIsMoreMenuOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${activeTab === 'subjects' ? 'active-nav' : 'text-slate-600 hover:bg-slate-50 sidebar-item'}`}
            >
              <BookOpen size={18} /> Subjects ({totalSubjects})
            </button>
          )}
          {!isTeacher && (
            <button 
              onClick={() => { setActiveTab('rooms'); setIsMoreMenuOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${activeTab === 'rooms' ? 'active-nav' : 'text-slate-600 hover:bg-slate-50 sidebar-item'}`}
            >
              <School size={18} /> Class Rooms
            </button>
          )}
          <button 
            onClick={() => { setActiveTab('attendance'); setAttendanceSubTab('take'); setIsMoreMenuOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${activeTab === 'attendance' ? 'active-nav' : 'text-slate-600 hover:bg-slate-50 sidebar-item'}`}
          >
            <Calendar size={18} /> Attendance (Xaadirinta)
          </button>
          {!isTeacher && (
            <button 
              onClick={() => { setActiveTab('fees'); setIsMoreMenuOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${activeTab === 'fees' ? 'active-nav' : 'text-slate-600 hover:bg-slate-50 sidebar-item'}`}
            >
              <DollarSign size={18} /> Student Fees
            </button>
          )}
          {!isTeacher && !quranModeWithoutTeachers && (
            <button 
              onClick={() => { setActiveTab('salaries'); setIsMoreMenuOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${activeTab === 'salaries' ? 'active-nav' : 'text-slate-600 hover:bg-slate-50 sidebar-item'}`}
            >
              <DollarSign size={18} /> Teacher Salary
            </button>
          )}
          <button 
            onClick={() => { setActiveTab('exams'); setIsMoreMenuOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${activeTab === 'exams' ? 'active-nav' : 'text-slate-600 hover:bg-slate-50 sidebar-item'}`}
          >
            <Award size={18} /> Examinations
          </button>
          {!isTeacher && (
            <button 
              onClick={() => { setActiveTab('reports'); setIsMoreMenuOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${activeTab === 'reports' ? 'active-nav' : 'text-slate-600 hover:bg-slate-50 sidebar-item'}`}
            >
              <CheckCircle2 size={18} /> Reports / PDF Exports
            </button>
          )}
        </aside>

        {/* Center Panel Content */}
        <main className="col-span-1 lg:col-span-9 space-y-6">

          {/* Tab 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Dashboard metrics */}
              {isTeacher ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-gray-100 card-shadow">
                    <span className="text-slate-900"><Users size={20} /></span>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2">My Students</p>
                    <p className="text-3xl font-bold mt-1 text-slate-900">{totalStudents}</p>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-gray-100 card-shadow">
                    <span className="text-slate-900"><BookOpen size={20} /></span>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2">Assigned Subjects</p>
                    <p className="text-3xl font-bold mt-1 text-slate-900">{totalSubjects}</p>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-gray-100 card-shadow">
                    <span className="text-slate-900"><DollarSign size={20} /></span>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2">My Base Salary</p>
                    <p className="text-3xl font-bold mt-1 text-slate-900">${matchingTeacher?.salary || 0}</p>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-gray-100 card-shadow">
                    <span className="text-slate-900"><CheckCircle2 size={20} /></span>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2">Salary Status</p>
                    <p className="text-3xl font-bold mt-1 text-slate-900 capitalize">
                      {orgSalaries[0]?.status || 'unpaid'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-gray-100 card-shadow">
                    <span className="text-slate-900"><Users size={20} /></span>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2">Students</p>
                    <p className="text-3xl font-bold mt-1 text-slate-900">{totalStudents}</p>
                  </div>

                  {!quranModeWithoutTeachers && (
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 card-shadow">
                      <span className="text-slate-900"><GraduationCap size={20} /></span>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2">Teachers</p>
                      <p className="text-3xl font-bold mt-1 text-slate-900">{totalTeachers}</p>
                    </div>
                  )}

                  <div className="bg-white p-5 rounded-2xl border border-gray-100 card-shadow">
                    <span className="text-slate-900"><DollarSign size={20} /></span>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2">Paid Fees</p>
                    <p className="text-3xl font-bold mt-1 text-slate-900">${collectedFees}</p>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-gray-100 card-shadow">
                    <span className="text-slate-900"><DollarSign size={20} /></span>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2">Pending Fees</p>
                    <p className="text-3xl font-bold mt-1 text-slate-900">${pendingFees}</p>
                  </div>
                </div>
              )}

              {/* Quick Action Drawer Grid */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 card-shadow space-y-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Quick Actions</h3>
                {isTeacher ? (
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setActiveTab('attendance')}
                      className="p-3.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-left border border-slate-200/60 transition-all flex flex-col items-start gap-1 cursor-pointer"
                    >
                      <CheckCircle2 size={18} className="text-emerald-600" />
                      <span className="text-xs font-bold text-slate-800">Daily Attendance</span>
                      <span className="text-[10px] text-slate-400">Record today's class attendance</span>
                    </button>
                    <button 
                      onClick={() => setActiveTab('exams')}
                      className="p-3.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-left border border-slate-200/60 transition-all flex flex-col items-start gap-1 cursor-pointer"
                    >
                      <Award size={18} className="text-indigo-600" />
                      <span className="text-xs font-bold text-slate-800">Enter Exam Marks</span>
                      <span className="text-[10px] text-slate-400">Input student scores for approval</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <button 
                      onClick={() => {
                        setSelectedStudent(null);
                        setStudentForm({ fullName: '', studentPhone: '', parentPhone: '', address: '', gender: 'male', dob: '', fee: 50, subjects: [] });
                        setFormError(null);
                        setActiveModal('addStudent');
                      }}
                      className="p-3.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-left border border-slate-200/60 transition-all flex flex-col items-start gap-1 cursor-pointer"
                    >
                      <Plus size={18} className="text-slate-900" />
                      <span className="text-xs font-bold text-slate-800">Add Student</span>
                    </button>
                    {!quranModeWithoutTeachers && (
                      <button 
                        onClick={() => {
                          setTeacherForm({ fullName: '', email: '', phone: '', salary: 400, subjects: [], rooms: [], password: '' });
                          setActiveModal('addTeacher');
                        }}
                        className="p-3.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-left border border-slate-200/60 transition-all flex flex-col items-start gap-1 cursor-pointer"
                      >
                        <Plus size={18} className="text-slate-900" />
                        <span className="text-xs font-bold text-slate-800">Add Teacher</span>
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        setSubjectForm({ name: '', teacherId: '', roomId: '', startTime: '08:00', endTime: '09:30', capacity: 30 });
                        setActiveModal('addSubject');
                      }}
                      className="p-3.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-left border border-slate-200/60 transition-all flex flex-col items-start gap-1 cursor-pointer"
                    >
                      <Plus size={18} className="text-slate-900" />
                      <span className="text-xs font-bold text-slate-800">New Subject</span>
                    </button>
                    <button 
                      onClick={() => setActiveTab('attendance')}
                      className="p-3.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-left border border-slate-200/60 transition-all flex flex-col items-start gap-1 cursor-pointer"
                    >
                      <CheckCircle2 size={18} className="text-slate-900" />
                      <span className="text-xs font-bold text-slate-800">Take Attendance</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Attendance & Exams Summary list */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Recent Attendance */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 card-shadow space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Attendance Activity</h3>
                    <span className="text-xs font-bold text-slate-900">{attendancePercentage}% Present Today</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {orgAttendance.length === 0 ? (
                      <p className="text-xs text-slate-400 py-4">No attendance marked today.</p>
                    ) : (
                      orgAttendance.slice(0, 3).map(att => {
                        const sub = orgSubjects.find(s => s.id === att.subjectId);
                        const present = att.records.filter(r => r.status === 'present').length;
                        return (
                          <div key={att.id} className="py-2.5 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-slate-800">{sub?.name || 'Quran Memorization'}</p>
                              <p className="text-[10px] text-slate-400">{att.date}</p>
                            </div>
                            <span className="text-xs font-semibold text-slate-600">
                              {present} / {att.records.length} Present
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Upcoming Exams list */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 card-shadow space-y-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Upcoming Exams</h3>
                  <div className="divide-y divide-slate-100">
                    {orgExams.length === 0 ? (
                      <p className="text-xs text-slate-400 py-4">No exams scheduled.</p>
                    ) : (
                      orgExams.map(ex => (
                        <div key={ex.id} className="py-2.5 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-slate-800">{ex.title}</p>
                            <p className="text-[10px] text-slate-400">{ex.type === 'school' ? 'Whole School' : `Subject specific`}</p>
                          </div>
                          <span className={`status-badge ${
                            ex.published ? 'bg-success' : 'bg-warning'
                          }`}>
                            {ex.published ? 'Published' : 'Pending'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: STUDENTS */}
          {activeTab === 'students' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <h2 className="text-xl font-bold tracking-tight text-slate-900">Registered Students</h2>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setSelectedStudent(null);
                      setStudentForm({ fullName: '', studentPhone: '', parentPhone: '', address: '', gender: 'male', dob: '', fee: 50, subjects: [] });
                      setFormError(null);
                      setActiveModal('addStudent');
                    }}
                    className="flex items-center gap-1.5 bg-black hover:bg-slate-800 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-colors shadow-sm cursor-pointer"
                  >
                    <Plus size={16} /> Register Student
                  </button>
                  <button 
                    onClick={() => setActiveModal('invoice')} // Show Bulk Import trigger
                    className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer"
                  >
                    <Upload size={16} /> Soo Geli Excel / CSV
                  </button>
                </div>
              </div>

              {/* Student Filtering Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white p-4 rounded-2xl border border-slate-100 card-shadow">
                {/* Search query input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    placeholder="Ku raadi Magaca ama ID..."
                    className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-black font-medium transition-colors"
                  />
                  {studentSearchQuery && (
                    <button
                      onClick={() => setStudentSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Filter by Room dropdown */}
                <div>
                  <select
                    value={studentFilterRoomId}
                    onChange={(e) => setStudentFilterRoomId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-black font-medium text-slate-700 transition-colors"
                  >
                    <option value="">Dhamaan Qolalka (All Rooms)</option>
                    {orgRooms.map(room => (
                      <option key={room.id} value={room.id}>
                        Qolka: {room.roomNumber} ({room.building})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filter by Subject / Time Slot dropdown */}
                <div>
                  <select
                    value={studentFilterSubjectId}
                    onChange={(e) => setStudentFilterSubjectId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-black font-medium text-slate-700 transition-colors"
                  >
                    <option value="">Dhamaan Maaddooyinka & Saacadaha</option>
                    {orgSubjects.map(sub => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name} ({sub.startTime} - {sub.endTime})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Table / Responsive Card View */}
              <div className="bg-white rounded-2xl border border-gray-100 card-shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-[#fcfcfd] border-b border-gray-100 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                        <th className="p-4">Student Name & ID</th>
                        <th className="p-4">Contact Info</th>
                        <th className="p-4">Assigned Schedule & Room</th>
                        <th className="p-4">Monthly Fee</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {orgStudents.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-12 text-slate-400">
                            No students registered.
                          </td>
                        </tr>
                      ) : filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-12 text-slate-400">
                            Ma jiraan arday buuxisay shuruudaha raadinta aad dooratay.
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.map(student => (
                          <tr key={student.id} className="hover:bg-slate-50/50">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center font-bold text-xs shrink-0 uppercase">
                                  {student.fullName.substring(0, 2)}
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-900">{student.fullName}</p>
                                  <p className="text-[10px] font-bold text-slate-500">{student.studentId}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-xs text-slate-500">
                              <p>Student: {student.studentPhone || 'N/A'}</p>
                              <p>Parent: {student.parentPhone || 'N/A'}</p>
                            </td>
                            <td className="p-4">
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {student.subjects.length === 0 ? (
                                  <span className="text-slate-400 text-xs">No subjects assigned</span>
                                ) : (
                                  student.subjects.map(subId => {
                                    const sub = orgSubjects.find(s => s.id === subId);
                                    const rm = sub ? orgRooms.find(r => r.id === sub.roomId) : null;
                                    if (!sub) return null;
                                    return (
                                      <span key={subId} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded-lg font-medium">
                                        {sub.name} ({rm ? rm.roomNumber : 'No Room'} @ {sub.startTime}-{sub.endTime})
                                      </span>
                                    );
                                  })
                                )}
                              </div>
                            </td>
                            <td className="p-4 font-bold text-slate-800">
                              ${student.fee}/mo
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                               <button 
                                 onClick={() => {
                                   setSelectedStudent(student);
                                   setStudentForm({
                                     fullName: student.fullName,
                                     studentPhone: student.studentPhone || '',
                                     parentPhone: student.parentPhone || '',
                                     address: student.address || '',
                                     gender: student.gender,
                                     dob: student.dob || '',
                                     fee: student.fee,
                                     subjects: student.subjects
                                   });
                                   setActiveModal('addStudent');
                                 }}
                                 className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-black rounded-lg cursor-pointer transition-colors"
                                 title="Bedel ardayga"
                               >
                                 <Edit2 size={15} />
                               </button>
                               <button 
                                 onClick={() => deleteStudent(student.id)}
                                 className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg cursor-pointer transition-colors"
                                 title="Tirtir ardayga"
                               >
                                 <Trash2 size={15} />
                               </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: TEACHERS */}
          {activeTab === 'teachers' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold tracking-tight text-slate-900">Instructors / Teachers</h2>
                <button 
                  onClick={() => {
                    setSelectedTeacher(null);
                    setFormError(null);
                    setTeacherForm({ fullName: '', email: '', phone: '', salary: 400, subjects: [], rooms: [], password: '' });
                    setActiveModal('addTeacher');
                  }}
                  className="flex items-center gap-1.5 bg-black hover:bg-slate-800 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-colors shadow-sm cursor-pointer"
                >
                  <Plus size={16} /> New Teacher
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 card-shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-[#fcfcfd] border-b border-gray-100 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                        <th className="p-4">Teacher Name</th>
                        <th className="p-4">Email / Phone</th>
                        <th className="p-4">Password</th>
                        <th className="p-4">Monthly Salary</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {orgTeachers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-12 text-slate-400">
                            No teachers registered.
                          </td>
                        </tr>
                      ) : (
                        orgTeachers.map(teacher => (
                          <tr key={teacher.id} className="hover:bg-slate-50/50">
                            <td className="p-4 font-semibold text-slate-900">{teacher.fullName}</td>
                            <td className="p-4 text-xs text-slate-500">
                              <p>{teacher.email}</p>
                              <p>{teacher.phone}</p>
                            </td>
                            <td className="p-4 text-xs font-mono font-semibold text-slate-700 bg-slate-50/50 rounded-lg px-2 py-1">
                              {teacher.password || '123456'}
                            </td>
                            <td className="p-4 font-bold text-slate-900">${teacher.salary}</td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button 
                                  onClick={() => {
                                    setSelectedTeacher(teacher);
                                    setFormError(null);
                                    setTeacherForm({
                                      fullName: teacher.fullName,
                                      email: teacher.email,
                                      phone: teacher.phone,
                                      salary: teacher.salary,
                                      subjects: teacher.subjects || [],
                                      rooms: teacher.rooms || [],
                                      password: teacher.password || ''
                                    });
                                    setActiveModal('addTeacher');
                                  }}
                                  className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-black rounded-lg cursor-pointer transition-colors"
                                  title="Bedel macallinka"
                                >
                                  <Edit2 size={15} />
                                </button>
                                <button 
                                  onClick={() => deleteTeacher(teacher.id)}
                                  className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg cursor-pointer transition-colors"
                                  title="Tirtir macallinka"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: SUBJECTS */}
          {activeTab === 'subjects' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold tracking-tight text-slate-900">Academic Subjects</h2>
                <button 
                  onClick={() => {
                    setSelectedSubject(null);
                    setFormError(null);
                    setSubjectForm({ name: '', teacherId: '', roomId: '', startTime: '08:00', endTime: '09:30', capacity: 30 });
                    setActiveModal('addSubject');
                  }}
                  className="flex items-center gap-1.5 bg-black hover:bg-slate-800 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-colors shadow-sm cursor-pointer"
                >
                  <Plus size={16} /> Create Subject
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 card-shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-[#fcfcfd] border-b border-gray-100 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                        <th className="p-4">Subject Title</th>
                        <th className="p-4">Instructor</th>
                        <th className="p-4">Room Location</th>
                        <th className="p-4">Class Time</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {orgSubjects.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-12 text-slate-400">
                            No subjects created yet.
                          </td>
                        </tr>
                      ) : (
                        orgSubjects.map(sub => {
                          const teacher = orgTeachers.find(t => t.id === sub.teacherId || (t.subjects && t.subjects.includes(sub.id)));
                          const rm = orgRooms.find(r => r.id === sub.roomId);
                          return (
                            <tr key={sub.id} className="hover:bg-slate-50/50">
                              <td className="p-4 font-semibold text-slate-900">{sub.name}</td>
                              <td className="p-4 text-slate-600">{teacher?.fullName || 'Unassigned'}</td>
                              <td className="p-4 text-slate-600">{rm?.roomNumber || 'Virtual'}</td>
                              <td className="p-4 text-xs font-mono text-slate-500">
                                {sub.startTime} - {sub.endTime}
                              </td>
                              <td className="p-4 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button 
                                    onClick={() => {
                                      setSelectedSubject(sub);
                                      setFormError(null);
                                      setSubjectForm({
                                        name: sub.name,
                                        teacherId: sub.teacherId || '',
                                        roomId: sub.roomId || '',
                                        startTime: sub.startTime,
                                        endTime: sub.endTime,
                                        capacity: sub.capacity
                                      });
                                      setActiveModal('addSubject');
                                    }}
                                    className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-black rounded-lg cursor-pointer transition-colors"
                                    title="Bedel maaddada"
                                  >
                                    <Edit2 size={15} />
                                  </button>
                                  <button 
                                    onClick={() => deleteSubject(sub.id)}
                                    className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg cursor-pointer transition-colors"
                                    title="Tirtir maaddada"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: CLASS ROOMS */}
          {activeTab === 'rooms' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold tracking-tight text-slate-900">Physical Rooms</h2>
                <button 
                  onClick={() => {
                    setSelectedRoom(null);
                    setRoomForm({ roomNumber: '', capacity: 25, building: 'Main Hall', status: 'available' });
                    setActiveModal('addRoom');
                  }}
                  className="flex items-center gap-1.5 bg-black hover:bg-slate-800 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-colors shadow-sm cursor-pointer"
                >
                  <Plus size={16} /> New Room
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {orgRooms.map(rm => (
                  <div key={rm.id} className="bg-white p-5 rounded-2xl border border-gray-100 card-shadow relative group">
                    <h3 className="text-lg font-bold text-slate-950 pr-16">{rm.roomNumber}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{rm.building}</p>
                    
                    <div className="absolute top-4 right-4 flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setSelectedRoom(rm);
                          setRoomForm({
                            roomNumber: rm.roomNumber,
                            capacity: rm.capacity,
                            building: rm.building,
                            status: rm.status
                          });
                          setActiveModal('addRoom');
                        }}
                        className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-black rounded-lg cursor-pointer transition-colors"
                        title="Wax ka bedel Qolka (Edit Room)"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm('Ma hubaal inaad rabto inaad tirtirto qolkan? (Are you sure you want to delete this room?)')) {
                            deleteRoom(rm.id);
                            setSuccessMessage('Qolka waa la tirtiray (Room deleted successfully).');
                          }
                        }}
                        className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg cursor-pointer transition-colors"
                        title="Tirtir Qolka (Delete Room)"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="flex justify-between items-center mt-4">
                      <span className="text-xs font-semibold text-slate-500">Max Cap: {rm.capacity} students</span>
                      <span className={`status-badge ${
                        rm.status === 'available' ? 'bg-success' :
                        rm.status === 'occupied' ? 'bg-warning' : 'bg-danger'
                      }`}>
                        {rm.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Tab 6: ATTENDANCE */}
          {activeTab === 'attendance' && (
            <div className="space-y-6">
              {/* Header with pill-shaped sub-nav tab switcher */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                    <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-xl"><Calendar size={20} /></span>
                    Maareynta Maqnaanshaha (Attendance & Absentee)
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">Diiwaangeli xaadirinta maalin laha ah, eeg ardayda maqan ama xiriirka u maqan.</p>
                </div>

                {/* Sub-tabs: TAKE | ABSENTEE | RECORDS */}
                {!isTeacher && (
                  <div className="flex items-center bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/50 self-start sm:self-auto shadow-inner">
                    <button
                      onClick={() => setAttendanceSubTab('take')}
                      className={`px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        attendanceSubTab === 'take' 
                          ? 'bg-white text-indigo-950 shadow-sm' 
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      TAKE
                    </button>
                    <button
                      onClick={() => setAttendanceSubTab('absentee')}
                      className={`px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        attendanceSubTab === 'absentee' 
                          ? 'bg-white text-indigo-950 shadow-sm' 
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      ABSENTEE
                    </button>
                    <button
                      onClick={() => setAttendanceSubTab('records')}
                      className={`px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        attendanceSubTab === 'records' 
                          ? 'bg-white text-indigo-950 shadow-sm' 
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      RECORDS
                    </button>
                  </div>
                )}
              </div>

              {/* Render SUB-TAB: TAKE ATTENDANCE */}
              {(attendanceSubTab === 'take' || isTeacher) && (
                <div className="bg-white p-6 rounded-2xl border border-gray-100 card-shadow space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Select Room</label>
                      <select 
                        value={attRoomId} 
                        onChange={(e) => setAttRoomId(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                      >
                        <option value="">-- Choose Room --</option>
                        {orgRooms.map(rm => <option key={rm.id} value={rm.id}>{rm.roomNumber}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Select Subject</label>
                      <select 
                        value={attSubjectId} 
                        onChange={(e) => setAttSubjectId(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                      >
                        <option value="">-- Choose Subject --</option>
                        {orgSubjects.filter(s => !attRoomId || s.roomId === attRoomId).map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Instructor</label>
                      <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-semibold">
                        {attSubjectId ? (orgTeachers.find(t => t.id === orgSubjects.find(s => s.id === attSubjectId)?.teacherId)?.fullName || 'Assigned Instructor') : 'Select Subject first'}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Date</label>
                      <input 
                        type="date" 
                        value={attDate} 
                        onChange={(e) => setAttDate(e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" 
                      />
                    </div>
                  </div>

                  {/* Students Attendance Status List */}
                  {attSubjectId && (
                    <div className="border border-gray-100 rounded-xl overflow-hidden mt-6">
                      <div className="bg-[#fcfcfd] p-3 font-semibold text-xs uppercase text-slate-500 grid grid-cols-12">
                        <div className="col-span-6">Student Name</div>
                        <div className="col-span-6 text-right">Attendance Status</div>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {orgStudents.map(student => (
                          <div key={student.id} className="p-3.5 grid grid-cols-12 items-center hover:bg-slate-50/40">
                            <div className="col-span-6 font-medium text-slate-800">{student.fullName}</div>
                            <div className="col-span-6 flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setAttRecords({ ...attRecords, [student.id]: 'present' })}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                  attRecords[student.id] === 'present' ? 'bg-black text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                }`}
                              >
                                Present
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setAttRecords({ ...attRecords, [student.id]: 'absent' });
                                }}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                  attRecords[student.id] === 'absent' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                }`}
                              >
                                Absent
                              </button>
                              <button
                                type="button"
                                onClick={() => setAttRecords({ ...attRecords, [student.id]: 'late' })}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                  attRecords[student.id] === 'late' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                }`}
                              >
                                Late
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="p-4 bg-[#fcfcfd] text-right">
                        <button
                          onClick={() => {
                            const recordsArray = orgStudents.map(s => ({
                              studentId: s.id,
                              fullName: s.fullName,
                              status: attRecords[s.id] || 'present'
                            }));
                            saveAttendance({
                              date: attDate,
                              roomId: attRoomId || 'rm-1',
                              subjectId: attSubjectId,
                              teacherId: orgSubjects.find(s => s.id === attSubjectId)?.teacherId || 't-101',
                              records: recordsArray,
                              organizationId: orgId
                            });
                            setSuccessMessage('Attendance taken and parents notified on WhatsApp.');
                          }}
                          className="bg-black hover:bg-slate-800 text-white font-bold text-xs px-5 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
                        >
                          Save & Dispatch Notifications
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Render SUB-TAB: ABSENTEE (DAILY ABSENT REPORT) */}
              {attendanceSubTab === 'absentee' && !isTeacher && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Ardayda Maqan Maalintaas (Daily Absentee List)</h3>
                      <p className="text-xs text-slate-400">Warbixinta ardayda maqnayd taariikhda la doortay oo faahfaahsan.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200">
                        <span className="text-xs font-bold text-slate-500">Taariikhda:</span>
                        <input 
                          type="date"
                          value={attDate}
                          onChange={(e) => setAttDate(e.target.value)}
                          className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
                        />
                      </div>
                      <button 
                        onClick={() => window.print()}
                        className="flex items-center gap-1.5 bg-black hover:bg-slate-800 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
                      >
                        <Printer size={15} /> Print Report
                      </button>
                    </div>
                  </div>

                  {(() => {
                    const selectedDateAttendance = orgAttendance.filter(a => a.date === attDate);
                    const absentList = selectedDateAttendance.flatMap(record => {
                      const sub = orgSubjects.find(s => s.id === record.subjectId);
                      const rm = orgRooms.find(r => r.id === record.roomId);
                      const teacher = orgTeachers.find(t => t.id === record.teacherId);
                      
                      return record.records
                        .filter(item => item.status === 'absent')
                        .map(item => ({
                          id: `${record.id}-${item.studentId}`,
                          studentId: item.studentId,
                          studentName: item.fullName,
                          subjectId: record.subjectId,
                          subjectName: sub ? sub.name : 'Unknown Subject',
                          startTime: sub ? sub.startTime : 'N/A',
                          endTime: sub ? sub.endTime : 'N/A',
                          roomNumber: rm ? rm.roomNumber : 'N/A',
                          building: rm ? rm.building : 'N/A',
                          teacherName: teacher ? teacher.fullName : 'N/A',
                          parentPhone: orgStudents.find(s => s.id === item.studentId)?.parentPhone || 'N/A'
                        }));
                    });

                    // Unique absent students count
                    const uniqueAbsentStudents = Array.from(new Set(absentList.map(a => a.studentId))).length;
                    
                    // Class with most absentees
                    const classCountMap: { [key: string]: number } = {};
                    absentList.forEach(a => {
                      classCountMap[a.subjectName] = (classCountMap[a.subjectName] || 0) + 1;
                    });
                    let mostMissedClass = 'N/A';
                    let maxMissedCount = 0;
                    Object.entries(classCountMap).forEach(([className, count]) => {
                      if (count > maxMissedCount) {
                        maxMissedCount = count;
                        mostMissedClass = className;
                      }
                    });

                    return (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-white p-5 rounded-2xl border border-slate-100 card-shadow flex items-center gap-4">
                            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl flex-shrink-0">
                              <Users size={24} />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Maqnaanshaha Guud (Total Absentees)</p>
                              <h4 className="text-2xl font-black text-slate-900 mt-0.5">{absentList.length} <span className="text-xs text-slate-400 font-bold">diiwaan</span></h4>
                            </div>
                          </div>

                          <div className="bg-white p-5 rounded-2xl border border-slate-100 card-shadow flex items-center gap-4">
                            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl flex-shrink-0">
                              <GraduationCap size={24} />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ardayda Maqan ee Unique ah</p>
                              <h4 className="text-2xl font-black text-slate-900 mt-0.5">{uniqueAbsentStudents} <span className="text-xs text-slate-400 font-bold">ardey</span></h4>
                            </div>
                          </div>

                          <div className="bg-white p-5 rounded-2xl border border-slate-100 card-shadow flex items-center gap-4">
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl flex-shrink-0">
                              <School size={24} />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fasalka Maqnaanshaha ugu badan</p>
                              <h4 className="text-sm font-bold text-slate-900 mt-1 truncate max-w-[200px]" title={mostMissedClass}>
                                {mostMissedClass !== 'N/A' ? `${mostMissedClass} (${maxMissedCount} maqan)` : 'N/A'}
                              </h4>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-gray-100 card-shadow space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-2">
                            <div>
                              <h3 className="text-base font-bold text-slate-950 font-sans tracking-tight">Diiwaanka Ardayda Maqan (Detail List)</h3>
                              <p className="text-xs text-slate-400">Ardayda ka maqan xiisadaha kala duwan iyo qolalka ay ka maqnaayeen.</p>
                            </div>
                            <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-100/50 text-rose-700 px-3 py-1.5 rounded-xl font-bold text-xs self-start sm:self-auto">
                              <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
                              Maalinta: {attDate}
                            </div>
                          </div>

                          {absentList.length === 0 ? (
                            <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                              <AlertCircle className="mx-auto text-slate-300 mb-2" size={32} />
                              <p className="text-sm font-bold text-slate-600">Ma jiraan arday maqan maalintan.</p>
                              <p className="text-xs text-slate-400 mt-1">Dhamaan ardayda qaybaha kala duwan ee fasalada waa la calaamadeeyay inay joogaan ama lama diiwaangelin wali.</p>
                            </div>
                          ) : (
                            <div className="overflow-hidden border border-slate-100 rounded-xl">
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                  <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                                      <th className="p-3.5">Magaca Ardayga (Student Name)</th>
                                      <th className="p-3.5">Maaddada / Time Slot</th>
                                      <th className="p-3.5">Class Room / Building</th>
                                      <th className="p-3.5">Macallinka (Teacher)</th>
                                      <th className="p-3.5">Mobile-ka Waalidka</th>
                                      <th className="p-3.5 text-right">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 text-slate-700">
                                    {absentList.map(item => (
                                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-3.5 font-bold text-slate-900">{item.studentName}</td>
                                        <td className="p-3.5">
                                          <div className="font-semibold text-indigo-900">{item.subjectName}</div>
                                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                                            <Clock size={11} /> {item.startTime} - {item.endTime}
                                          </div>
                                        </td>
                                        <td className="p-3.5">
                                          <div className="font-medium text-slate-700 flex items-center gap-1">
                                            <School size={12} className="text-slate-400" /> Room: {item.roomNumber}
                                          </div>
                                          <div className="text-[10px] text-slate-400 mt-0.5">{item.building}</div>
                                        </td>
                                        <td className="p-3.5 font-medium text-slate-600">{item.teacherName}</td>
                                        <td className="p-3.5 font-semibold text-slate-800">{item.parentPhone}</td>
                                        <td className="p-3.5 text-right">
                                          <a
                                            href={`https://wa.me/${item.parentPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Ku: Waalidka Ardayga ${item.studentName},\nWaxaan halkaan kugula socodsiineynaa in ilmahaagu uu ka maqnaa maadada ${item.subjectName} ee saacadu tahay ${item.startTime} - ${item.endTime} qolka ${item.roomNumber} maanta oo ah ${attDate}.`)}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 py-1.5 rounded-lg font-bold text-[10px] transition-colors"
                                          >
                                            <Send size={11} /> WhatsApp Waalidka
                                          </a>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Render SUB-TAB: RECORDS (CONSECUTIVE ABSENCES) */}
              {attendanceSubTab === 'records' && !isTeacher && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Maqnaanshaha Xiriirka ah (Consecutive Absences)</h3>
                      <p className="text-xs text-slate-400">La soco ardayda joogtada u maqan toddobaadkii ama bishii oo dhan.</p>
                    </div>

                    {/* Streak Filters */}
                    <div className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
                      <button
                        onClick={() => setStreakFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          streakFilter === 'all' ? 'bg-black text-white' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Dhamaan (All)
                      </button>
                      <button
                        onClick={() => setStreakFilter('weekly')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          streakFilter === 'weekly' ? 'bg-rose-600 text-white animate-pulse' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Toddobaad (Weekly 5+)
                      </button>
                      <button
                        onClick={() => setStreakFilter('monthly')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          streakFilter === 'monthly' ? 'bg-red-700 text-white animate-pulse' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Bil (Monthly 20+)
                      </button>
                    </div>
                  </div>

                  {(() => {
                    const streakList = orgStudents.map(student => {
                      const studentChecks = orgAttendance
                        .map(record => {
                          const checkItem = record.records.find(r => r.studentId === student.id);
                          if (!checkItem) return null;
                          return {
                            date: record.date,
                            subjectId: record.subjectId,
                            status: checkItem.status,
                            createdAt: record.createdAt || '',
                          };
                        })
                        .filter((item): item is NonNullable<typeof item> => item !== null)
                        .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));

                      // Calculate active streak (consecutive absences backwards from latest check)
                      let activeStreak = 0;
                      for (let i = studentChecks.length - 1; i >= 0; i--) {
                        if (studentChecks[i].status === 'absent') {
                          activeStreak++;
                        } else {
                          break;
                        }
                      }

                      // Calculate historical max streak
                      let maxStreak = 0;
                      let tempStreak = 0;
                      for (let i = 0; i < studentChecks.length; i++) {
                        if (studentChecks[i].status === 'absent') {
                          tempStreak++;
                          if (tempStreak > maxStreak) {
                            maxStreak = tempStreak;
                          }
                        } else {
                          tempStreak = 0;
                        }
                      }

                      // Missed details for this student
                      const recentMissed = studentChecks
                        .filter(c => c.status === 'absent')
                        .slice(-10)
                        .map(c => {
                          const sub = orgSubjects.find(s => s.id === c.subjectId);
                          return {
                            date: c.date,
                            subjectName: sub ? sub.name : 'Unknown Subject',
                            time: sub ? `${sub.startTime} - ${sub.endTime}` : 'N/A'
                          };
                        });

                      return {
                        student,
                        activeStreak,
                        maxStreak,
                        totalAbsentCount: studentChecks.filter(c => c.status === 'absent').length,
                        totalChecks: studentChecks.length,
                        recentMissed,
                        lastAbsentDate: studentChecks.filter(c => c.status === 'absent').pop()?.date || 'N/A'
                      };
                    })
                    .filter(item => item.maxStreak > 0)
                    .filter(item => {
                      if (streakFilter === 'weekly') return item.maxStreak >= 5;
                      if (streakFilter === 'monthly') return item.maxStreak >= 20;
                      return true;
                    })
                    .sort((a, b) => b.activeStreak - a.activeStreak || b.maxStreak - a.maxStreak);

                    const countWeekly = streakList.filter(item => item.maxStreak >= 5 && item.maxStreak < 20).length;
                    const countMonthly = streakList.filter(item => item.maxStreak >= 20).length;

                    return (
                      <>
                        {/* Quick Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-white p-5 rounded-2xl border border-slate-100 card-shadow flex items-center gap-4">
                            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl flex-shrink-0 animate-pulse">
                              <AlertCircle size={24} />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Xiriirka Toddobaadka (Weekly Streaks)</p>
                              <h4 className="text-xl font-black text-slate-900 mt-0.5">{countWeekly} <span className="text-xs text-slate-400 font-bold">ardey</span></h4>
                              <p className="text-[10px] text-slate-400 mt-0.5">Ardayda maqan 5+ jeer oo xiriir ah.</p>
                            </div>
                          </div>

                          <div className="bg-white p-5 rounded-2xl border border-slate-100 card-shadow flex items-center gap-4">
                            <div className="p-3 bg-red-50 text-red-700 rounded-xl flex-shrink-0 animate-pulse">
                              <AlertCircle size={24} />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Xiriirka Bisha (Monthly Streaks)</p>
                              <h4 className="text-xl font-black text-slate-900 mt-0.5">{countMonthly} <span className="text-xs text-slate-400 font-bold">ardey</span></h4>
                              <p className="text-[10px] text-slate-400 mt-0.5">Ardayda maqan 20+ jeer oo xiriir ah.</p>
                            </div>
                          </div>
                        </div>

                        {/* List of consecutive absentees */}
                        <div className="bg-white rounded-2xl border border-slate-100 card-shadow overflow-hidden">
                          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                            <h4 className="text-sm font-bold text-slate-900">Ardayda ka Maqan Dugsiga (Streak Records)</h4>
                            <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{streakList.length} Arday</span>
                          </div>

                          {streakList.length === 0 ? (
                            <div className="text-center py-16 px-4">
                              <AlertCircle className="mx-auto text-slate-300 mb-3" size={40} />
                              <p className="text-sm font-bold text-slate-600">Ma jiraan arday buuxisay shuruudan.</p>
                              <p className="text-xs text-slate-400 mt-1">Dhamaan ardayda dugsigu waxay leeyihiin xaadiris caadi ah oo aan maqnaansho xiriir ah lahayn.</p>
                            </div>
                          ) : (
                            <div className="divide-y divide-slate-100">
                              {streakList.map(item => {
                                // Decide status badge
                                let badgeColor = 'bg-amber-50 text-amber-700 border-amber-100';
                                let streakText = `Maqnaansho Xiriir: ${item.maxStreak} jeer`;
                                
                                if (item.maxStreak >= 20) {
                                  badgeColor = 'bg-red-50 text-red-700 border-red-200 animate-pulse';
                                  streakText = `Maqan Bil Xiriir ah (20+ Days)`;
                                } else if (item.maxStreak >= 5) {
                                  badgeColor = 'bg-rose-50 text-rose-700 border-rose-100';
                                  streakText = `Maqan Toddobaad Xiriir ah (5+ Days)`;
                                }

                                // WhatsApp message template in Somali
                                let messageText = `Ku: Waalidka Ardayga ${item.student.fullName},\n\nWaxaan halkaan kugula socodsiineynaa in ilmahaagu uu si xiriir ah (joogto ah) uga maqnaa fasallada muddo ${item.activeStreak} jeer oo xiriir ah dugsiga. Maqnaanshahan joogtada ah wuxuu saameyn weyn ku yeelanayaa waxbarashadiisa.\n\nFadlan si degdeg ah ula soo xiriir xafiiska maamulka dugsiga si aan arrintan ugala hadalno. Mahadsanid.`;
                                if (item.maxStreak >= 20) {
                                  messageText = `Ku: Waalidka Ardayga ${item.student.fullName},\n\nOgeysiis Muhiim ah: Waxaan halkaan kugula socodsiineynaa in ilmahaagu uu si xiriir ah (joogto ah) uga maqnaa fasallada muddo kabadan HAL BIL (${item.activeStreak} jeer oo xiriir ah). Tani waxay khatar gelineysaa sii joogistiisa dugsiga.\n\nFadlan maalin kasta oo ku xigta si degdeg ah ula soo xiriir xafiiska dugsiga.`;
                                }

                                return (
                                  <div key={item.student.id} className="p-5 hover:bg-slate-50/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="space-y-2 max-w-xl">
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold border border-slate-200">
                                          {item.student.fullName.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                          <h5 className="text-sm font-bold text-slate-900">{item.student.fullName}</h5>
                                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                                            <span>ID: {item.student.studentId}</span>
                                            <span>•</span>
                                            <span>Qolka: {item.student.roomId ? orgRooms.find(r => r.id === item.student.roomId)?.roomNumber : 'N/A'}</span>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex flex-wrap gap-2 pt-1">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${badgeColor}`}>
                                          <AlertCircle size={12} />
                                          {streakText}
                                        </span>
                                        <span className="bg-slate-50 text-slate-600 border border-slate-200/60 px-2.5 py-1 rounded-lg text-[10px] font-bold">
                                          Wadarta Maqnaanshaha: {item.totalAbsentCount} ka mid ah {item.totalChecks}
                                        </span>
                                        <span className="bg-slate-50 text-slate-600 border border-slate-200/60 px-2.5 py-1 rounded-lg text-[10px] font-bold">
                                          Ugu dambeysay: {item.lastAbsentDate}
                                        </span>
                                      </div>

                                      {/* Expanded list of missed items */}
                                      {item.recentMissed.length > 0 && (
                                        <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 text-[10px] text-slate-500 space-y-1">
                                          <div className="font-bold text-slate-600">Xiisadaha ugu dambeeyay ee laga maqnaaday:</div>
                                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 max-h-20 overflow-y-auto pr-1">
                                            {item.recentMissed.map((m, idx) => (
                                              <div key={idx} className="flex justify-between border-b border-slate-100/50 pb-0.5">
                                                <span className="font-semibold text-slate-700">{m.subjectName}</span>
                                                <span className="font-mono text-[9px]">{m.date} ({m.time})</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex flex-row md:flex-col items-end gap-2 justify-between md:justify-center border-t md:border-t-0 border-slate-100 pt-3 md:pt-0">
                                      <div className="text-left md:text-right">
                                        <div className="text-[10px] text-slate-400 font-semibold">Mobile-ka Waalidka</div>
                                        <div className="text-xs font-bold text-slate-700">{item.student.parentPhone || 'N/A'}</div>
                                      </div>
                                      <a
                                        href={`https://wa.me/${(item.student.parentPhone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(messageText)}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-2 rounded-xl font-bold text-xs transition-all shadow-sm cursor-pointer"
                                      >
                                        <Send size={12} /> WhatsApp Waalidka
                                      </a>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Tab 7: FEES */}
          {activeTab === 'fees' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold tracking-tight text-slate-900">Student Tuition Fees</h2>
                <div className="text-sm text-slate-400 font-medium">Month: <strong>June 2026</strong></div>
              </div>

              {/* Fee collection view */}
              <div className="bg-white rounded-2xl border border-gray-100 card-shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-[#fcfcfd] border-b border-gray-100 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                        <th className="p-4">Student Name</th>
                        <th className="p-4">Invoice Number</th>
                        <th className="p-4">Billing Amount</th>
                        <th className="p-4">Payment Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {orgFees.map(fee => (
                        <tr key={fee.id} className="hover:bg-slate-50/50">
                          <td className="p-4 font-semibold text-slate-900">{fee.studentName}</td>
                          <td className="p-4 font-mono text-slate-500 text-xs">{fee.invoiceNumber}</td>
                          <td className="p-4 font-bold text-slate-800">${fee.amount}</td>
                          <td className="p-4">
                            <span className={`status-badge ${
                              fee.status === 'paid' ? 'bg-success' : 'bg-danger'
                            }`}>
                              {fee.status}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="inline-flex gap-2">
                              {fee.status === 'unpaid' && (
                                <button
                                  onClick={() => approveFeePayment(fee.id)}
                                  className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200 font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                                >
                                  Mark Paid
                                </button>
                              )}
                              <button
                                onClick={() => sendWhatsAppReceipt(fee)}
                                className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-600 transition-colors"
                                title="Send WhatsApp Receipt"
                              >
                                <Send size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tab 8: SALARIES */}
          {activeTab === 'salaries' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold tracking-tight text-slate-900">Teacher Payroll / Salary</h2>
              <div className="bg-white rounded-2xl border border-gray-100 card-shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-[#fcfcfd] border-b border-gray-100 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                        <th className="p-4">Teacher Name</th>
                        <th className="p-4">Month</th>
                        <th className="p-4">Salary Amount</th>
                        <th className="p-4">Payout Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {orgSalaries.map(sal => (
                        <tr key={sal.id} className="hover:bg-slate-50/50">
                          <td className="p-4 font-semibold text-slate-900">{sal.teacherName}</td>
                          <td className="p-4 text-slate-500 text-xs">{sal.month}</td>
                          <td className="p-4 font-bold text-slate-800">${sal.amount}</td>
                          <td className="p-4">
                            <span className={`status-badge ${
                              sal.status === 'paid' ? 'bg-success' : 'bg-warning'
                            }`}>
                              {sal.status}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            {sal.status === 'pending' && (
                              <button
                                onClick={() => {
                                  approveSalaryPayment(sal.id);
                                  setSuccessMessage('Salary payout approved successfully.');
                                }}
                                className="bg-black hover:bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer transition-all shadow-sm"
                              >
                                Approve Payout
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tab 9: EXAMS */}
          {activeTab === 'exams' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold tracking-tight text-slate-900">School & Subject Examinations</h2>
                <button 
                  onClick={() => {
                    setExamForm({ title: '', type: 'class', subjectId: '', targetClass: '' });
                    setActiveModal('addExam');
                  }}
                  className="flex items-center gap-1.5 bg-black hover:bg-slate-800 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-colors shadow-sm cursor-pointer"
                >
                  <Plus size={16} /> Create Exam
                </button>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 card-shadow space-y-6">
                <div className="divide-y divide-slate-100">
                  {orgExams.map(ex => (
                    <div key={ex.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h4 className="text-base font-bold text-slate-900">{ex.title}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">Type: {ex.type === 'school' ? 'Whole School' : 'Subject Exam'}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            setSelectedExam(ex);
                            const defaults: any = {};
                            orgStudents.forEach(s => {
                              defaults[s.id] = 85; // Seeding default mark
                            });
                            setMarksData(defaults);
                            setActiveModal('enterMarks');
                          }}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-xl cursor-pointer transition-colors"
                        >
                          Manual Marks Entry
                        </button>

                        {!ex.published && (
                          <button
                            onClick={() => {
                              approveExamResults(ex.id);
                              setSuccessMessage('Exam results approved and published to the student portal!');
                            }}
                            className="bg-black hover:bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer transition-colors shadow-sm"
                          >
                            Approve & Publish Results
                          </button>
                        )}

                        {ex.published && (
                          <span className="status-badge bg-success font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1">
                            <Check size={14} /> Published Live
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 10: REPORTS */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold tracking-tight text-slate-900">System Reports</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 card-shadow space-y-2 text-center">
                  <div className="mx-auto w-10 h-10 bg-slate-100 text-slate-900 rounded-xl flex items-center justify-center">
                    <GraduationCap size={20} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Student Enrollment PDF</h4>
                  <p className="text-xs text-slate-400">Export student list with photo references and ID records.</p>
                  <button 
                    onClick={() => {
                      window.print();
                    }}
                    className="w-full text-xs font-semibold bg-black hover:bg-slate-800 text-white py-2 rounded-lg transition-colors cursor-pointer"
                  >
                    Export Statement
                  </button>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 card-shadow space-y-2 text-center">
                  <div className="mx-auto w-10 h-10 bg-slate-100 text-slate-900 rounded-xl flex items-center justify-center">
                    <DollarSign size={20} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Fee Billings Statement</h4>
                  <p className="text-xs text-slate-400">Summarized collection report including paid/unpaid totals.</p>
                  <button 
                    onClick={() => {
                      window.print();
                    }}
                    className="w-full text-xs font-semibold bg-black hover:bg-slate-800 text-white py-2 rounded-lg transition-colors cursor-pointer"
                  >
                    Generate Report
                  </button>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 card-shadow space-y-2 text-center">
                  <div className="mx-auto w-10 h-10 bg-slate-100 text-slate-900 rounded-xl flex items-center justify-center">
                    <Award size={20} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Academic Grades Summary</h4>
                  <p className="text-xs text-slate-400">Exams scores, averages, and student performance lists.</p>
                  <button 
                    onClick={() => {
                      window.print();
                    }}
                    className="w-full text-xs font-semibold bg-black hover:bg-slate-800 text-white py-2 rounded-lg transition-colors cursor-pointer"
                  >
                    View Grades PDF
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Drawer Bottom Navigation (Mobile UX / Highly Responsive) */}
      <nav className="fixed bottom-0 left-0 right-0 lg:hidden bg-white border-t border-slate-200 p-2.5 flex items-center justify-around z-40 shadow-xl text-slate-900">
        <button 
          onClick={() => { setActiveTab('dashboard'); setIsMoreMenuOpen(false); }}
          className={`flex flex-col items-center gap-1 text-[11px] font-semibold transition-colors cursor-pointer ${activeTab === 'dashboard' && !isMoreMenuOpen ? 'text-black font-bold' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </button>
        <button 
          onClick={() => { setActiveTab('students'); setIsMoreMenuOpen(false); }}
          className={`flex flex-col items-center gap-1 text-[11px] font-semibold transition-colors cursor-pointer ${activeTab === 'students' && !isMoreMenuOpen ? 'text-black font-bold' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <GraduationCap size={20} />
          <span>Students</span>
        </button>
        {!isTeacher && !quranModeWithoutTeachers && (
          <button 
            onClick={() => { setActiveTab('teachers'); setIsMoreMenuOpen(false); }}
            className={`flex flex-col items-center gap-1 text-[11px] font-semibold transition-colors cursor-pointer ${activeTab === 'teachers' && !isMoreMenuOpen ? 'text-black font-bold' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Users size={20} />
            <span>Teachers</span>
          </button>
        )}
        <button 
          onClick={() => setIsMoreMenuOpen(true)}
          className={`flex flex-col items-center gap-1 text-[11px] font-semibold transition-colors cursor-pointer ${isMoreMenuOpen ? 'text-black font-bold' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <MoreHorizontal size={20} />
          <span>More Menu</span>
        </button>
      </nav>

      {/* Mobile Drawer "More" Bottom Sheet */}
      {isMoreMenuOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-end justify-center transition-opacity lg:hidden">
          <div className="bg-white rounded-t-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="font-bold text-slate-800">Operational Menu</span>
              <button onClick={() => setIsMoreMenuOpen(false)} className="p-1 hover:bg-slate-100 rounded-full">
                <X size={18} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {!isTeacher && (
                <button 
                  onClick={() => { setActiveTab('subjects'); setIsMoreMenuOpen(false); }}
                  className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-left border border-slate-200/60 transition-all text-xs font-semibold flex items-center gap-2 cursor-pointer"
                >
                  <BookOpen size={16} className="text-sky-600" /> Subjects
                </button>
              )}
              {!isTeacher && (
                <button 
                  onClick={() => { setActiveTab('rooms'); setIsMoreMenuOpen(false); }}
                  className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-left border border-slate-200/60 transition-all text-xs font-semibold flex items-center gap-2 cursor-pointer"
                >
                  <School size={16} className="text-indigo-600" /> Class Rooms
                </button>
              )}
              <button 
                onClick={() => { setActiveTab('attendance'); setAttendanceSubTab('take'); setIsMoreMenuOpen(false); }}
                className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-left border border-slate-200/60 transition-all text-xs font-semibold flex items-center gap-2 cursor-pointer"
              >
                <Calendar size={16} className="text-emerald-600" /> Attendance
              </button>
              {!isTeacher && (
                <button 
                  onClick={() => { setActiveTab('fees'); setIsMoreMenuOpen(false); }}
                  className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-left border border-slate-200/60 transition-all text-xs font-semibold flex items-center gap-2 cursor-pointer"
                >
                  <DollarSign size={16} className="text-emerald-600" /> Tuition Fees
                </button>
              )}
              {!isTeacher && !quranModeWithoutTeachers && (
                <button 
                  onClick={() => { setActiveTab('salaries'); setIsMoreMenuOpen(false); }}
                  className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-left border border-slate-200/60 transition-all text-xs font-semibold flex items-center gap-2 cursor-pointer"
                >
                  <DollarSign size={16} className="text-amber-600" /> Payout Salary
                </button>
              )}
              <button 
                onClick={() => { setActiveTab('exams'); setIsMoreMenuOpen(false); }}
                className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-left border border-slate-200/60 transition-all text-xs font-semibold flex items-center gap-2 cursor-pointer"
              >
                <Award size={16} className="text-indigo-600" /> Exams
              </button>
              {!isTeacher && (
                <button 
                  onClick={() => { setActiveTab('reports'); setIsMoreMenuOpen(false); }}
                  className="col-span-2 p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-left border border-slate-200/60 transition-all text-xs font-semibold flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 size={16} className="text-teal-600" /> Reports & PDF Exports
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bedel Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs transition-opacity animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 flex flex-col space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <KeyRound size={20} className="text-slate-900" />
              <h3 className="text-sm font-sans font-bold text-slate-900">Bedel Ereyga Sirta ah (Change Password)</h3>
            </div>

            {passwordError && (
              <div className="p-3 bg-red-50 text-red-700 rounded-xl border border-red-100 text-[11px] font-semibold">
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 text-[11px] font-semibold">
                {passwordSuccess}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-[11px] text-slate-600 space-y-2 leading-relaxed">
                <p>
                  Si aad u bedesho ereygaaga sirta ah si ammaan ah, guji badanka hoose si lagugu soo diro fariin email ah oo ka kooban link-ga bedelaada (Password Reset Link).
                </p>
                <div className="pt-2 border-t border-slate-200">
                  <span className="font-semibold text-slate-700 block">Email-kaaga:</span>
                  <span className="font-mono text-slate-900 break-all">{currentUser?.email}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  disabled={passwordLoading}
                  onClick={() => {
                    setIsPasswordModalOpen(false);
                    setPasswordError(null);
                    setPasswordSuccess(null);
                  }}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer disabled:opacity-50 font-semibold"
                >
                  Iska daa (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="bg-black hover:bg-slate-800 text-white font-semibold px-4 py-2 rounded-xl cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {passwordLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Diraya Email...
                    </>
                  ) : (
                    'Soo Dir Email-ka Bedelaada'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Add Student */}
      {activeModal === 'addStudent' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100/80 flex flex-col space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              {selectedStudent ? 'Wax ka bedel Profile-ka Ardayga (Edit Student)' : 'Register Student Profile'}
            </h3>
            <form onSubmit={handleAddStudentSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Full Name</label>
                  <input
                    type="text" required
                    value={studentForm.fullName}
                    onChange={(e) => setStudentForm({ ...studentForm, fullName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-black focus:outline-none text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Gender</label>
                  <select
                    value={studentForm.gender}
                    onChange={(e) => setStudentForm({ ...studentForm, gender: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-black focus:outline-none text-xs font-semibold"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Student Mobile Phone</label>
                  <input
                    type="text" placeholder="e.g. +252615xxxxxx"
                    value={studentForm.studentPhone}
                    onChange={(e) => setStudentForm({ ...studentForm, studentPhone: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-black focus:outline-none text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Parent Mobile (WhatsApp)</label>
                  <input
                    type="text" required placeholder="e.g. +252615000000"
                    value={studentForm.parentPhone}
                    onChange={(e) => setStudentForm({ ...studentForm, parentPhone: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-black focus:outline-none text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Address Location</label>
                <input
                  type="text" required
                  value={studentForm.address}
                  onChange={(e) => setStudentForm({ ...studentForm, address: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-black focus:outline-none text-xs font-semibold"
                />
              </div>

              {formError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-2xl">
                  <p className="text-[11px] font-bold text-red-700 leading-relaxed">{formError}</p>
                </div>
              )}

              <div className="border-t border-b border-slate-100 py-3 my-2 space-y-3">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Dooro Maaddooyinka (Select Subjects) *</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/60 max-h-48 overflow-y-auto">
                    {orgSubjects.length === 0 ? (
                      <p className="text-slate-400 text-[11px] col-span-2">Fadlan marka hore sameey maddooyin (No subjects created yet).</p>
                    ) : (
                      orgSubjects.map(sub => {
                        const isChecked = studentForm.subjects.includes(sub.id);
                        const rm = orgRooms.find(r => r.id === sub.roomId);
                        const teacher = orgTeachers.find(t => t.id === sub.teacherId);
                        return (
                          <label key={sub.id} className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                            isChecked ? 'border-black bg-black/5 shadow-xs animate-none' : 'border-slate-100 hover:border-slate-300 bg-white'
                          }`}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                let updated = [...studentForm.subjects];
                                if (e.target.checked) {
                                  updated.push(sub.id);
                                } else {
                                  updated = updated.filter(id => id !== sub.id);
                                }
                                setStudentForm({ ...studentForm, subjects: updated });
                                setFormError(null);
                              }}
                              className="mt-0.5 rounded border-slate-300 text-black focus:ring-black cursor-pointer"
                            />
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-800 block leading-tight text-xs">{sub.name}</span>
                              <span className="text-[10px] text-slate-500 font-medium block">
                                Macallin: {teacher ? teacher.fullName : 'No Teacher'}
                              </span>
                              <span className="text-[10px] text-indigo-600 font-mono font-semibold block">
                                {rm ? `Qolka: ${rm.roomNumber}` : 'Qolka: No Room'} | {sub.startTime} - {sub.endTime}
                              </span>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Real-time Validation Overlap Warning */}
                {(() => {
                  const selectedSubs = orgSubjects.filter(s => studentForm.subjects.includes(s.id));
                  let overlapText: string | null = null;
                  for (let i = 0; i < selectedSubs.length; i++) {
                    for (let j = i + 1; j < selectedSubs.length; j++) {
                      const s1 = selectedSubs[i];
                      const s2 = selectedSubs[j];
                      if (s1.startTime < s2.endTime && s2.startTime < s1.endTime) {
                        overlapText = `Digtooni Isku-dhac (Overlap): "${s1.name}" (${s1.startTime} - ${s1.endTime}) iyo "${s2.name}" (${s2.startTime} - ${s2.endTime}) waxay leeyihiin waqti isku mid ah / isku dhacaya.`;
                        break;
                      }
                    }
                  }
                  if (overlapText) {
                    return (
                      <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-xl">
                        <p className="text-[10px] font-bold text-amber-800 leading-normal">{overlapText}</p>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Monthly Tuition Fee ($)</label>
                  <input
                    type="number" required
                    value={studentForm.fee}
                    onChange={(e) => setStudentForm({ ...studentForm, fee: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-black focus:outline-none text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => { setActiveModal(null); setSelectedStudent(null); }} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-all font-semibold cursor-pointer">Cancel</button>
                <button type="submit" className="bg-black hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl transition-all shadow-sm cursor-pointer">
                  {selectedStudent ? 'Xaqiiji Bedelaada (Save Changes)' : 'Register Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Bulk Import Student */}
      {activeModal === 'invoice' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100/80 flex flex-col space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <Upload className="text-slate-700" size={18} />
              Geli Liiska Ardayda Badan (Excel / CSV)
            </h3>
            
            <div className="space-y-4 text-xs">
              {/* Step 1: Select Subject, Room, Time */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/60 space-y-2.5">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tallaabada 1aad: Dooro Maaddada (Subject)</span>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Dooro Maaddada loo diiwaangelinayo</label>
                  <select
                    value={bulkSubjectId}
                    onChange={(e) => setBulkSubjectId(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-black focus:outline-none text-xs font-semibold"
                  >
                    <option value="">-- Dooro Maaddada --</option>
                    {orgSubjects.map(sub => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                  </select>
                </div>

                {bulkSubjectId && (
                  <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-slate-100">
                    <div>
                      <span className="block text-[9px] font-bold text-slate-400 uppercase">Qolka (Room)</span>
                      <span className="text-[11px] font-semibold text-slate-800">
                        {(() => {
                          const sub = orgSubjects.find(s => s.id === bulkSubjectId);
                          return orgRooms.find(r => r.id === sub?.roomId)?.roomNumber || 'N/A';
                        })()}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold text-slate-400 uppercase">Wakhtiga (Schedule)</span>
                      <span className="text-[11px] font-semibold text-slate-800">
                        {(() => {
                          const sub = orgSubjects.find(s => s.id === bulkSubjectId);
                          return sub ? `${sub.startTime} - ${sub.endTime}` : 'N/A';
                        })()}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2: Download Excel/CSV Template */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/60 flex items-center justify-between">
                <div className="max-w-[70%]">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tallaabada 2aad: Soo degso Template-ka Excel</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">La soo deg faylka tusaalaha ah si aad u buuxiso xogta ardayda.</p>
                </div>
                <button
                  type="button"
                  onClick={downloadExcelTemplate}
                  className="bg-black hover:bg-slate-800 text-white text-xs px-3.5 py-2 rounded-xl font-semibold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Download size={14} /> Download Excel
                </button>
              </div>

              {/* Step 3: Drag & Drop File Upload */}
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed p-6 rounded-2xl text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-2 ${
                  isDragOver ? 'border-black bg-slate-50' : 'border-slate-200 hover:border-slate-400 bg-white'
                }`}
                onClick={() => document.getElementById('excel-file-input')?.click()}
              >
                <Upload className="text-slate-400" size={32} />
                <div>
                  <p className="font-semibold text-slate-700">Halkan ku soo tuur faylka Excel (.xlsx) ama CSV</p>
                  <p className="text-slate-400 text-[11px] mt-0.5">Ama guji si aad computer-kaaga uga soo doorato</p>
                </div>
                <input 
                  type="file" 
                  id="excel-file-input" 
                  accept=".xlsx, .xls, .csv" 
                  className="hidden" 
                  onChange={handleFileChange} 
                />
              </div>

              {/* Step 4: Preview and Paste */}
              <div className="space-y-1.5">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tallaabada 4aad: Fiiri Xogta la soo akhriyey (ama ku dheji CSV)</span>
                <p className="text-[10px] text-slate-400">Qaabka: <code>FullName, StudentPhone, ParentPhone, Address, Gender, DOB, MonthlyFee</code></p>
                <textarea
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  placeholder="Example:&#10;Zakaria Farah, +252615111111, +252615999991, Wadajir, male, 2012-05-15, 50"
                  className="w-full h-20 p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] focus:outline-none focus:border-black"
                />
              </div>

              {bulkResult && (
                <div className="p-3 bg-emerald-50 rounded-xl space-y-1 border border-emerald-100">
                  <p className="font-bold text-emerald-800">Guul: Waxaa la soo geliyay {bulkResult.successCount} arday.</p>
                  {bulkResult.errors.map((err, idx) => (
                    <p key={idx} className="text-red-700 font-medium text-[10px]">- {err}</p>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button type="button" onClick={() => { setActiveModal(null); setBulkResult(null); }} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-all font-semibold cursor-pointer">Xir (Close)</button>
                <button type="button" onClick={handleBulkImport} className="bg-black hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl transition-all shadow-sm cursor-pointer">Xaqiiji & Keydi (Save)</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Add Teacher */}
      {activeModal === 'addTeacher' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100/80 flex flex-col space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              {selectedTeacher ? 'Wax ka bedel Profile-ka Macallinka (Edit Teacher)' : 'Create Teacher Profile'}
            </h3>
            {formError && (
              <p className="text-xs text-red-700 bg-red-50 p-2.5 rounded-xl border border-red-100 font-medium">{formError}</p>
            )}
            <form onSubmit={handleAddTeacherSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Full Name</label>
                  <input
                    type="text" required
                    value={teacherForm.fullName}
                    onChange={(e) => setTeacherForm({ ...teacherForm, fullName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Email (Login ID)</label>
                  <input
                    type="email" required
                    value={teacherForm.email}
                    onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Contact Phone</label>
                  <input
                    type="text" required
                    value={teacherForm.phone}
                    onChange={(e) => setTeacherForm({ ...teacherForm, phone: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Monthly Salary ($)</label>
                  <input
                    type="number" required
                    value={teacherForm.salary}
                    onChange={(e) => setTeacherForm({ ...teacherForm, salary: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Password (Ereyga Sirta ah ee Dashboard-ka)</label>
                <input
                  type="text" required
                  placeholder="Tusaale: 123456"
                  value={teacherForm.password}
                  onChange={(e) => setTeacherForm({ ...teacherForm, password: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-black focus:outline-none font-mono"
                />
              </div>

              {/* Multi-select Subjects Checkboxes */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Maddooyinka uu dhigo (Subjects) *Waajib ah</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/60 max-h-40 overflow-y-auto">
                  {orgSubjects.length === 0 ? (
                    <p className="text-slate-400 text-xs col-span-2">Fadlan marka hore sameey maddooyin (No subjects created yet).</p>
                  ) : (
                    (() => {
                      const availableSubjects = orgSubjects.filter(sub => {
                        const isChecked = teacherForm.subjects.includes(sub.id);
                        if (isChecked) return true;

                        // Check if claimed by another teacher's subjects array
                        const isClaimedByAnotherTeacher = orgTeachers.some(t => 
                          (!selectedTeacher || t.id !== selectedTeacher.id) && 
                          t.subjects && 
                          t.subjects.includes(sub.id)
                        );

                        // Check if subject's teacherId is set to another teacher
                        const isTeacherIdSetToAnother = sub.teacherId && 
                          (!selectedTeacher || sub.teacherId !== selectedTeacher.id);

                        return !isClaimedByAnotherTeacher && !isTeacherIdSetToAnother;
                      });

                      if (availableSubjects.length === 0) {
                        return <p className="text-slate-400 text-xs col-span-2">Maaddo banaan oo la dooran karo ma jirto (No available subjects found or all are assigned to other teachers).</p>;
                      }

                      return availableSubjects.map(sub => {
                        const isChecked = teacherForm.subjects.includes(sub.id);
                        const rm = orgRooms.find(r => r.id === sub.roomId);
                        return (
                          <label key={sub.id} className={`flex items-start gap-2 p-2 rounded-xl border transition-all cursor-pointer ${
                            isChecked ? 'border-black bg-black/5' : 'border-slate-100 hover:border-slate-300 bg-white'
                          }`}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                let updated = [...teacherForm.subjects];
                                if (e.target.checked) {
                                  updated.push(sub.id);
                                } else {
                                  updated = updated.filter(id => id !== sub.id);
                                }
                                setTeacherForm({ ...teacherForm, subjects: updated });
                              }}
                              className="mt-0.5 rounded border-slate-300 text-black focus:ring-black"
                            />
                            <div>
                              <span className="font-semibold text-slate-800 block leading-tight">{sub.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {rm ? `Qolka: ${rm.roomNumber}` : 'Qolka: No Room'} | {sub.startTime} - {sub.endTime}
                              </span>
                            </div>
                          </label>
                        );
                      });
                    })()
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => { setActiveModal(null); setSelectedTeacher(null); setFormError(null); }} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-all font-semibold cursor-pointer">Cancel</button>
                <button type="submit" className="bg-black hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl transition-all shadow-sm cursor-pointer">
                  {selectedTeacher ? 'Xaqiiji Bedelaada (Save Changes)' : 'Save Teacher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Add Subject */}
      {activeModal === 'addSubject' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100/80 flex flex-col space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              {selectedSubject ? 'Wax ka bedel Maaddada (Edit Subject)' : 'Create Academic Subject'}
            </h3>
            {formError && (
              <p className="text-xs text-red-700 bg-red-50 p-2.5 rounded-xl border border-red-100">{formError}</p>
            )}
            <form onSubmit={handleAddSubjectSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Subject Name</label>
                  <input
                    type="text" required
                    value={subjectForm.name}
                    onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Capacity</label>
                  <input
                    type="number" required
                    value={subjectForm.capacity}
                    onChange={(e) => setSubjectForm({ ...subjectForm, capacity: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Assign Room</label>
                <select
                  value={subjectForm.roomId}
                  onChange={(e) => setSubjectForm({ ...subjectForm, roomId: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-black focus:outline-none"
                >
                  <option value="">-- Choose --</option>
                  {orgRooms.map(r => <option key={r.id} value={r.id}>{r.roomNumber}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Start Time</label>
                  <input
                    type="time" required
                    value={subjectForm.startTime}
                    onChange={(e) => setSubjectForm({ ...subjectForm, startTime: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">End Time</label>
                  <input
                    type="time" required
                    value={subjectForm.endTime}
                    onChange={(e) => setSubjectForm({ ...subjectForm, endTime: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => { setActiveModal(null); setSelectedSubject(null); setFormError(null); }} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-all font-semibold cursor-pointer">Cancel</button>
                <button type="submit" className="bg-black hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl transition-all shadow-sm cursor-pointer">
                  {selectedSubject ? 'Xaqiiji Bedelaada (Save Changes)' : 'Save Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Add/Edit Room */}
      {activeModal === 'addRoom' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100/80 flex flex-col space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              {selectedRoom ? 'Wax ka bedel Qolka Class-ka (Edit Class Room)' : 'Register Class Room'}
            </h3>
            <form onSubmit={handleAddRoomSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Room Name/Number</label>
                  <input
                    type="text" required placeholder="e.g. Room 102"
                    value={roomForm.roomNumber}
                    onChange={(e) => setRoomForm({ ...roomForm, roomNumber: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Building Area</label>
                  <input
                    type="text" required placeholder="e.g. Science Block"
                    value={roomForm.building}
                    onChange={(e) => setRoomForm({ ...roomForm, building: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Seating Capacity</label>
                  <input
                    type="number" required
                    value={roomForm.capacity}
                    onChange={(e) => setRoomForm({ ...roomForm, capacity: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Status</label>
                  <select
                    value={roomForm.status}
                    onChange={(e: any) => setRoomForm({ ...roomForm, status: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-black focus:outline-none"
                  >
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => { setActiveModal(null); setSelectedRoom(null); }} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-all font-semibold cursor-pointer">Cancel</button>
                <button type="submit" className="bg-black hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl transition-all shadow-sm cursor-pointer">
                  {selectedRoom ? 'Xaqiiji Bedelaada (Save Changes)' : 'Register Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Create Exam */}
      {activeModal === 'addExam' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100/80 flex flex-col space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Plan New Exam</h3>
            <form onSubmit={handleAddExamSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Exam Title</label>
                <input
                  type="text" required placeholder="e.g. Mid-Term Biology Exam"
                  value={examForm.title}
                  onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-black focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Exam Scope Type</label>
                  <select
                    value={examForm.type}
                    onChange={(e: any) => setExamForm({ ...examForm, type: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-black focus:outline-none"
                  >
                    <option value="school">Whole School</option>
                    <option value="class">Class Room Specific</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Associated Subject</label>
                  <select
                    value={examForm.subjectId}
                    onChange={(e) => setExamForm({ ...examForm, subjectId: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-black focus:outline-none"
                  >
                    <option value="">-- Choose (Optional) --</option>
                    {orgSubjects.map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Target Student Grade / Class</label>
                <input
                  type="text" required placeholder="e.g. Grade 10"
                  value={examForm.targetClass}
                  onChange={(e) => setExamForm({ ...examForm, targetClass: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-black focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setActiveModal(null)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-all font-semibold cursor-pointer">Cancel</button>
                <button type="submit" className="bg-black hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl transition-all shadow-sm cursor-pointer">Create Exam</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Enter Marks */}
      {activeModal === 'enterMarks' && selectedExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100/80 flex flex-col space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Enter Student Marks: {selectedExam.title}</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {orgStudents.map(student => (
                <div key={student.id} className="flex items-center justify-between gap-4 py-1">
                  <span className="text-xs font-semibold text-slate-800">{student.fullName}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min="0" max="100"
                      value={marksData[student.id] || 0}
                      onChange={(e) => setMarksData({ ...marksData, [student.id]: Number(e.target.value) })}
                      className="w-20 p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-xs focus:border-black focus:outline-none"
                    />
                    <span className="text-xs text-slate-400">%</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => setActiveModal(null)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-all font-semibold cursor-pointer">Cancel</button>
              <button
                onClick={() => {
                  const resultsArray = orgStudents.map(s => {
                    const marks = marksData[s.id] || 0;
                    let grade = 'F';
                    if (marks >= 90) grade = 'A+';
                    else if (marks >= 80) grade = 'A';
                    else if (marks >= 70) grade = 'B';
                    else if (marks >= 60) grade = 'C';
                    else if (marks >= 50) grade = 'D';

                    return {
                      studentId: s.id,
                      studentName: s.fullName,
                      marks,
                      grade
                    };
                  });
                  const total = resultsArray.reduce((sum, r) => sum + r.marks, 0);
                  const avg = resultsArray.length > 0 ? total / resultsArray.length : 0;
                  submitMarks(selectedExam.id, resultsArray, Math.round(avg * 10) / 10);
                  setSuccessMessage('Exam results saved and awaiting admin approval.');
                  setActiveModal(null);
                }}
                className="bg-black hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
              >
                Submit Scores
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Center-Aligned Animated Success Popup Card */}
      <AnimatePresence>
        {successMessage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ type: "spring", duration: 0.45, bounce: 0.25 }}
              className="bg-white rounded-[2rem] max-w-sm w-full p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] border border-slate-100 flex flex-col items-center text-center space-y-5 relative overflow-hidden"
            >
              {/* Top Accent Strip */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 to-teal-500" />
              
              {/* Close Button */}
              <button
                onClick={() => setSuccessMessage(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-2 rounded-full transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>

              {/* Icon Container with Pulsing & Spring */}
              <motion.div
                initial={{ scale: 0.5, rotate: -15 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", delay: 0.05, stiffness: 220, damping: 14 }}
                className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 border-4 border-emerald-100/60 shadow-sm"
              >
                <CheckCircle2 size={36} className="stroke-[2.5]" />
              </motion.div>

              {/* Title & Description */}
              <div className="space-y-2">
                <h4 className="text-xl font-bold text-slate-900 tracking-tight">done</h4>
                <p className="text-xs font-semibold text-slate-500 leading-relaxed px-1">
                  {successMessage}
                </p>
              </div>

              {/* Confirm Action Button */}
              <button
                onClick={() => setSuccessMessage(null)}
                className="w-full py-3 bg-slate-900 hover:bg-black text-white font-bold text-xs tracking-wider uppercase rounded-xl transition-all shadow-md hover:shadow-lg active:translate-y-0 cursor-pointer"
              >
                okey
              </button>

              {/* Progress Indicator for Auto-Dismiss */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100/80 overflow-hidden">
                <motion.div
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 4, ease: "linear" }}
                  className="h-full bg-gradient-to-r from-emerald-400 to-teal-500"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
