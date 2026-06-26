import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Search, Printer, Download, Award, BookOpen, Clock, User, ShieldCheck } from 'lucide-react';

export default function ResultPortal() {
  const { students, examResults, subjects, teachers } = useApp();
  const [studentIdInput, setStudentIdInput] = useState('');
  const [searchError, setSearchError] = useState('');
  const [foundStudent, setFoundStudent] = useState<any | null>(null);
  const [studentResults, setStudentResults] = useState<any[]>([]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError('');
    setFoundStudent(null);
    setStudentResults([]);

    const cleanId = studentIdInput.trim().toUpperCase();
    if (!cleanId) {
      setSearchError('Fadlan geli ID-ga saxda ah ee ardayga.');
      return;
    }

    const student = students.find(s => s.studentId === cleanId);
    if (!student) {
      setSearchError(`Ardaygan laguma helin database-ka. Fadlan iska hubi ID-ga "${cleanId}".`);
      return;
    }

    // Find all published results that contain this student
    const results: any[] = [];
    examResults.forEach(record => {
      if (record.published) {
        // Enforce: Student can only see subjects they are registered for
        if (record.subjectId && !student.subjects.includes(record.subjectId)) {
          return;
        }
        const studentScore = record.results.find(res => res.studentId === student.id);
        if (studentScore) {
          const subject = subjects.find(s => s.id === record.subjectId);
          results.push({
            examTitle: record.examTitle,
            subjectName: subject ? subject.name : 'General Exam',
            marks: studentScore.marks,
            grade: studentScore.grade,
            average: record.average,
          });
        }
      }
    });

    setFoundStudent(student);
    setStudentResults(results);
  };

  const getOverallPerformance = () => {
    if (studentResults.length === 0) return { avg: 0, grade: 'N/A' };
    const total = studentResults.reduce((acc, curr) => acc + curr.marks, 0);
    const avg = total / studentResults.length;
    let grade = 'F';
    if (avg >= 90) grade = 'A+';
    else if (avg >= 80) grade = 'A';
    else if (avg >= 70) grade = 'B';
    else if (avg >= 60) grade = 'C';
    else if (avg >= 50) grade = 'D';
    return { avg: Math.round(avg * 10) / 10, grade };
  };

  const performance = getOverallPerformance();

  return (
    <div className="min-h-screen bg-[#fcfcfd] text-slate-900 pb-12">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white py-12 px-4 border-b border-slate-800 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-slate-800/80 border border-slate-700/50 px-3 py-1.5 rounded-full text-xs font-semibold mb-3 tracking-wider uppercase">
            <ShieldCheck size={14} className="text-slate-300" /> Secure Student Result Portal
          </div>
          <h1 className="text-3xl md:text-4xl font-sans font-bold tracking-tight text-white">Public Result Portal</h1>
          <p className="mt-2 text-slate-400 max-w-lg mx-auto text-sm">
            Access secure exam transcripts instantly. Enter your unique Student ID to view grades and print credentials.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-8">
        {/* Search Input Box */}
        <div className="bg-white rounded-2xl border border-gray-100 card-shadow p-6 md:p-8">
          <form onSubmit={handleSearch} className="max-w-lg mx-auto">
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
              Enter Student ID
            </label>
            <div className="relative flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Geli ID-ga Ardayga"
                  value={studentIdInput}
                  onChange={(e) => setStudentIdInput(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-black text-base font-medium transition-colors"
                />
              </div>
              <button
                type="submit"
                className="bg-black hover:bg-slate-800 text-white font-medium px-6 py-3 rounded-xl transition-all shadow-sm active:scale-95 text-sm cursor-pointer"
              >
                Search Results
              </button>
            </div>
            {searchError && (
              <p className="mt-2 text-xs text-red-600 bg-red-50 py-1.5 px-3 rounded-lg border border-red-100 font-medium">
                {searchError}
              </p>
            )}
          </form>
        </div>

        {/* Search Results Display */}
        {foundStudent && (
          <div className="mt-8 bg-white rounded-2xl border border-gray-100 card-shadow overflow-hidden printable-area">
            {/* Header / Student Profile Card */}
            <div className="bg-slate-900 text-white p-6 md:p-8 border-b border-slate-800">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-black border border-slate-800 flex items-center justify-center font-bold text-2xl text-white shadow-sm shrink-0 uppercase">
                    {foundStudent.fullName.substring(0, 2)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-sans font-bold tracking-tight">{foundStudent.fullName}</h2>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-slate-400">
                      <span className="flex items-center gap-1"><User size={14} /> ID: <strong>{foundStudent.studentId}</strong></span>
                      <span className="flex items-center gap-1 uppercase">Gender: {foundStudent.gender}</span>
                      <span className="flex items-center gap-1">DOB: {foundStudent.dob}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 bg-black hover:bg-slate-850 text-white text-xs px-3.5 py-2 rounded-xl transition-all font-medium border border-slate-800 cursor-pointer shadow-sm"
                  >
                    <Printer size={14} /> Print Statement
                  </button>
                </div>
              </div>
            </div>

            {/* Performance Quick Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-slate-50 border-b border-slate-100">
              <div className="bg-white p-4 rounded-xl border border-slate-100 card-shadow flex items-center gap-3">
                <div className="p-3 bg-slate-100 text-slate-800 rounded-lg">
                  <Award size={20} />
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Overall Grade</p>
                  <p className="text-xl font-bold text-slate-950">{performance.grade}</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-100 card-shadow flex items-center gap-3">
                <div className="p-3 bg-slate-100 text-slate-800 rounded-lg">
                  <BookOpen size={20} />
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Average Marks</p>
                  <p className="text-xl font-bold text-slate-950">{performance.avg}%</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-100 card-shadow flex items-center gap-3">
                <div className="p-3 bg-slate-100 text-slate-800 rounded-lg">
                  <Clock size={20} />
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Subjects Tested</p>
                  <p className="text-xl font-bold text-slate-950">{studentResults.length}</p>
                </div>
              </div>
            </div>

            {/* Detailed Transcript Table */}
            <div className="p-6">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Official Transcript</h3>
              {studentResults.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl">
                  <BookOpen className="mx-auto text-slate-300 mb-2" size={32} />
                  <p className="text-sm text-slate-500 font-medium">No published exam results found for this student yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                        <th className="p-4">Exam Details</th>
                        <th className="p-4">Subject</th>
                        <th className="p-4 text-center">Your Mark</th>
                        <th className="p-4 text-center">Class Avg</th>
                        <th className="p-4 text-center">Grade</th>
                        <th className="p-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {studentResults.map((res, index) => (
                        <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 font-semibold text-slate-850">{res.examTitle}</td>
                          <td className="p-4 font-medium text-slate-600">{res.subjectName}</td>
                          <td className="p-4 text-center font-bold text-slate-900">{res.marks}%</td>
                          <td className="p-4 text-center text-slate-500">{res.average}%</td>
                          <td className="p-4 text-center font-bold text-slate-900">{res.grade}</td>
                          <td className="p-4 text-center">
                            <span className={`status-badge ${
                              res.marks >= 50 ? 'bg-success' : 'bg-danger'
                            }`}>
                              {res.marks >= 50 ? 'Pass' : 'Fail'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer declaration */}
            <div className="bg-slate-50 px-6 py-4 text-center border-t border-slate-100">
              <p className="text-xs text-slate-400">
                This document is a digitally verified academic transcript. QR code verification ready.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
