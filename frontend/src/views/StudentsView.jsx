import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Trash2,
  Edit2,
  X,
  AlertCircle,
  ShieldCheck,
  Calendar,
  GraduationCap,
  User,
  Phone,
  Eye,
  Download,
  Printer,
  Contact,
  BadgeCheck,
  QrCode,
  HeartPulse,
} from 'lucide-react';
import axiosClient from '../api/axiosClient';
import ConfirmModal from '../components/ConfirmModal';
import SnitLogo from '../components/SnitLogo';
import { printElementById } from '../utils/printUtils';
import { getLocalDateString } from '../utils/dateUtils';

const SEMESTERS = [
  'Semester 1',
  'Semester 2',
  'Semester 3',
  'Semester 4',
  'Semester 5',
  'Semester 6',
  'Semester 7',
  'Semester 8',
];

const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Information Technology',
  'Electronics & Communication',
  'Mechanical Engineering',
  'Electrical Engineering',
  'Civil Engineering',
];

export const StudentsView = ({ showToast, initialAction, onActionHandled }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('All');
  const [selectedDepartment, setSelectedDepartment] = useState('All');

  // Full Profile Modal State
  const [viewingStudent, setViewingStudent] = useState(null);
  const [idCardStudent, setIdCardStudent] = useState(null);

  const exportCSV = () => {
    if (students.length === 0) {
      showToast?.({ message: 'No students to export', type: 'error' });
      return;
    }
    const headers = [
      'Roll Number',
      'Registration ID',
      'Name',
      'Date of Birth',
      'Department',
      'Semester',
      'Email',
      'Phone',
      'Guardian Name',
      'Guardian Phone',
      'Blood Group',
    ];
    const rows = students.map((s) => [
      s.rollNumber,
      s.registrationId || `STU-${s.rollNumber}`,
      `"${(s.name || '').replace(/"/g, '""')}"`,
      s.dob || '',
      `"${(s.department || '').replace(/"/g, '""')}"`,
      s.semester || '',
      s.email || '',
      s.phone || '',
      `"${(s.guardianName || '').replace(/"/g, '""')}"`,
      s.guardianPhone || '',
      s.bloodGroup || '',
    ]);
    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute(
      'download',
      `student_roster_${selectedSemester.replace(/\s+/g, '_')}_${getLocalDateString()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
    showToast?.({ message: 'Student roster exported as CSV successfully!', type: 'success' });
  };

  // Helper to compute default password: First Name + Birth Year
  const computeDefaultPassword = (fName, dobVal) => {
    const cleanFirst = (fName || '').trim().replace(/\s+/g, '');
    let birthYear = '';
    if (dobVal) {
      const match = String(dobVal).match(/\b(19\d{2}|20\d{2})\b/);
      if (match) birthYear = match[1];
    }
    if (cleanFirst && birthYear) {
      return `${cleanFirst}${birthYear}`;
    }
    if (cleanFirst) {
      return `${cleanFirst}2026`;
    }
    return '';
  };

  // Helper to format DOB as Day / Month / Year (DD/MM/YYYY)
  const formatDOB = (dobStr) => {
    if (!dobStr) return null;
    const parts = String(dobStr).split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
    }
    return dobStr;
  };

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState('academic'); // 'academic' | 'personal' | 'contact' | 'credentials'
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    name: '',
    dob: '', // YYYY-MM-DD
    rollNumber: '',
    department: 'Computer Science & Engineering',
    semester: 'Semester 1',
    email: '',
    password: '',
    phone: '',
    guardianName: '',
    guardianPhone: '',
    gender: '',
    bloodGroup: '',
    address: '',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Delete Modal State
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Debounced search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      let query = `?semester=${selectedSemester}&department=${selectedDepartment}`;
      if (debouncedSearch) {
        query += `&search=${encodeURIComponent(debouncedSearch)}`;
      }
      const res = await axiosClient.get(`/students${query}`);
      if (res.data.success) {
        setStudents(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
      showToast?.({ message: 'Failed to load students', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [selectedSemester, selectedDepartment, debouncedSearch, showToast]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setDebouncedSearch(search.trim());
  };

  const openAddModal = useCallback(() => {
    setEditingStudent(null);
    setFormData({
      firstName: '',
      lastName: '',
      name: '',
      dob: '',
      rollNumber: '',
      department: 'Computer Science & Engineering',
      semester: selectedSemester !== 'All' ? selectedSemester : 'Semester 1',
      email: '',
      password: '',
      phone: '',
      guardianName: '',
      guardianPhone: '',
      gender: '',
      bloodGroup: '',
      address: '',
    });
    setFormError('');
    setModalStep('academic');
    setIsModalOpen(true);
  }, [selectedSemester]);

  useEffect(() => {
    if (initialAction === 'add') {
      openAddModal();
      onActionHandled?.();
    }
  }, [initialAction, openAddModal, onActionHandled]);

  const openEditModal = (student) => {
    setEditingStudent(student);
    const firstName = student.firstName || (student.name ? student.name.split(' ')[0] : '');
    const lastName = student.lastName || (student.name ? student.name.split(' ').slice(1).join(' ') : '');
    setFormData({
      firstName,
      lastName,
      name: student.name || `${firstName} ${lastName}`.trim(),
      dob: student.dob || '',
      rollNumber: student.rollNumber,
      department: student.department || 'Computer Science & Engineering',
      semester: student.semester || 'Semester 1',
      email: student.email || '',
      password: '', // Blank unless admin wants to reset it
      phone: student.phone || '',
      guardianName: student.guardianName || '',
      guardianPhone: student.guardianPhone || '',
      gender: student.gender || '',
      bloodGroup: student.bloodGroup || '',
      address: student.address || '',
    });
    setFormError('');
    setModalStep('academic');
    setIsModalOpen(true);
  };

  const handleFirstNameChange = (val) => {
    const updated = { ...formData, firstName: val };
    updated.name = `${val} ${formData.lastName}`.trim();
    if (!editingStudent) {
      updated.password = computeDefaultPassword(val, formData.dob);
    }
    setFormData(updated);
  };

  const handleLastNameChange = (val) => {
    const updated = { ...formData, lastName: val };
    updated.name = `${formData.firstName} ${val}`.trim();
    setFormData(updated);
  };

  const handleDobChange = (val) => {
    const updated = { ...formData, dob: val };
    if (!editingStudent) {
      updated.password = computeDefaultPassword(formData.firstName, val);
    }
    setFormData(updated);
  };

  const handleRollNumberChange = (value) => {
    const uppercase = value.toUpperCase();
    const updated = { ...formData, rollNumber: uppercase };
    // Auto suggest email with @snitn.edu domain
    if (!editingStudent && (!formData.email || formData.email.endsWith('@student.edu') || formData.email.endsWith('@snitn.edu'))) {
      const clean = uppercase.toLowerCase().replace(/[^a-z0-9]/g, '');
      updated.email = clean ? `${clean}@snitn.edu` : '';
    }
    setFormData(updated);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.rollNumber.trim()) {
      setModalStep('academic');
      setFormError('Roll Number is required in Academic Placement.');
      return;
    }

    if (!formData.firstName.trim()) {
      setModalStep('personal');
      setFormError('First Name is required in Personal Information.');
      return;
    }

    if (!formData.dob) {
      setModalStep('personal');
      setFormError('Date of Birth is required in Personal Information.');
      return;
    }

    if (!formData.email.trim()) {
      setModalStep('credentials');
      setFormError('Login Email is required in Portal Credentials.');
      return;
    }

    try {
      setSubmitting(true);
      const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim();
      const defaultPass = computeDefaultPassword(formData.firstName, formData.dob) || 'student123';
      const payload = {
        ...formData,
        name: fullName,
        password: editingStudent
          ? (formData.password.trim() || undefined)
          : (formData.password.trim() || defaultPass),
      };

      if (editingStudent) {
        // Update Student
        const res = await axiosClient.put(`/students/${editingStudent._id}`, payload);
        if (res.data.success) {
          showToast?.({ message: 'Student and login credentials updated', type: 'success' });
          setIsModalOpen(false);
          fetchStudents();
        }
      } else {
        // Create Student
        const res = await axiosClient.post('/students', payload);
        if (res.data.success) {
          showToast?.({
            message: `New student registered with portal email: ${res.data.data.email}`,
            type: 'success',
          });
          setIsModalOpen(false);
          fetchStudents();
        }
      }
    } catch (err) {
      console.error('Error saving student:', err);
      setFormError(err.response?.data?.message || 'Failed to save student.');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await axiosClient.delete(`/students/${deleteTarget._id}`);
      if (res.data.success) {
        showToast?.({
          message: `Student ${deleteTarget.name} and portal account deleted`,
          type: 'info',
        });
        setDeleteTarget(null);
        fetchStudents();
      }
    } catch (err) {
      console.error('Error deleting student:', err);
      showToast?.({ message: 'Failed to delete student', type: 'error' });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header Banner & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100/80 text-xs font-bold text-indigo-700 mb-2">
            <Users className="w-3.5 h-3.5" />
            <span>Academic Registry</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Student Register
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Register students, generate unique portal registration IDs, and manage student login accounts
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 hover:from-indigo-700 hover:to-violet-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-500/20 transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto active:scale-98"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register New Student</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Semester Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
            >
              <option value="All">All Semesters</option>
              {SEMESTERS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-2">
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
            >
              <option value="All">All Departments</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Export Roster CSV */}
          <button
            type="button"
            onClick={exportCSV}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
            title="Export filtered student roster as CSV spreadsheet"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search name, roll, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-14 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>
      </div>

      {/* Roster Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              Enrolled Student Records ({students.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified students and their registered credentials
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200/60">
            {selectedSemester} • {selectedDepartment}
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-500">Loading students...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="py-20 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-800">No students found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              There are no students matching your filter criteria. Click "Register New Student" to enroll one.
            </p>
            <button
              onClick={openAddModal}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              Add First Student
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <th className="py-3.5 px-6">Unique Reg ID / Roll #</th>
                  <th className="py-3.5 px-6">Student Name & Login Email</th>
                  <th className="py-3.5 px-6">Date of Birth</th>
                  <th className="py-3.5 px-6">Department</th>
                  <th className="py-3.5 px-6">Semester</th>
                  <th className="py-3.5 px-6 text-center">Portal Access</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {students.map((student) => {
                  const initial = student.name ? student.name.charAt(0).toUpperCase() : '?';

                  return (
                    <tr
                      key={student._id}
                      onClick={() => setViewingStudent(student)}
                      className="hover:bg-indigo-50/50 transition-colors cursor-pointer group"
                      title="Click row to view full student profile"
                    >
                      <td className="py-3.5 px-6">
                        <div className="font-mono font-bold text-xs text-indigo-700 group-hover:text-indigo-900 transition-colors">
                          {student.rollNumber}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {student.registrationId || `STU-${student.rollNumber}`}
                        </div>
                      </td>
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-50 to-violet-100 border border-indigo-200/60 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                            {initial}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                              {student.name}
                            </div>
                            <div className="text-xs text-slate-500 font-medium">
                              {student.email || 'No email assigned'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-6">
                        {student.dob ? (
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{formatDOB(student.dob)}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-xs text-slate-600 font-medium">
                        {student.department}
                      </td>
                      <td className="py-3.5 px-6">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200/50">
                          {student.semester}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Student Portal Active</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIdCardStudent(student);
                            }}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer"
                            title="Generate Student ID Card"
                          >
                            <Contact className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingStudent(student);
                            }}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer"
                            title="View Full Student Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(student);
                            }}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer"
                            title="Edit Student & Credentials"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(student);
                            }}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                            title="Delete Student"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Full Student Profile Details Modal */}
      {viewingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[92vh] my-auto">
            {/* Profile Header Banner */}
            <div className="relative bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 text-white p-6 sm:p-7 overflow-hidden shrink-0">
              <button
                onClick={() => setViewingStudent(null)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Close profile modal"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 relative z-10">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-violet-600 text-white font-extrabold text-2xl sm:text-3xl flex items-center justify-center shadow-xl shadow-indigo-950/50 border border-white/20 shrink-0">
                  {viewingStudent.name ? viewingStudent.name.charAt(0).toUpperCase() : '?'}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-indigo-300 bg-indigo-500/20 px-2.5 py-0.5 rounded-md border border-indigo-500/30">
                      {viewingStudent.rollNumber}
                    </span>
                    <span className="font-mono text-[11px] text-slate-300 bg-white/10 px-2 py-0.5 rounded-md">
                      {viewingStudent.registrationId || `STU-${viewingStudent.rollNumber}`}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Active Student</span>
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight truncate">
                    {viewingStudent.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 mt-0.5 truncate">
                    {viewingStudent.department} • <strong className="text-slate-200">{viewingStudent.semester}</strong>
                  </p>
                </div>
              </div>

              {/* Decorative glows */}
              <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute left-1/3 -top-8 w-48 h-48 bg-violet-500/15 rounded-full blur-2xl pointer-events-none" />
            </div>

            {/* Profile Scrollable Details Body */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-7 space-y-6">
              {/* Highlight Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Semester
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    {viewingStudent.semester}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Date of Birth
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    {viewingStudent.dob ? formatDOB(viewingStudent.dob) : '—'}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Gender
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    {viewingStudent.gender || 'Not specified'}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Blood Group
                  </span>
                  <span className="text-xs font-bold text-rose-600">
                    {viewingStudent.bloodGroup || '—'}
                  </span>
                </div>
              </div>

              {/* Academic Placement Details */}
              <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700">
                  <GraduationCap className="w-4 h-4" />
                  <span>Academic & Institutional Details</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 font-medium">Department / Discipline:</span>
                    <p className="font-bold text-slate-800 mt-0.5">{viewingStudent.department}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">University Roll Number:</span>
                    <p className="font-mono font-bold text-slate-800 mt-0.5">{viewingStudent.rollNumber}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Unique Registration ID:</span>
                    <p className="font-mono font-bold text-slate-800 mt-0.5">
                      {viewingStudent.registrationId || `STU-${viewingStudent.rollNumber}`}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Enrolled Academic Semester:</span>
                    <p className="font-bold text-slate-800 mt-0.5">{viewingStudent.semester}</p>
                  </div>
                </div>
              </div>

              {/* Personal & Contact Information */}
              <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800">
                  <Phone className="w-4 h-4 text-indigo-600" />
                  <span>Contact & Communication Info</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 font-medium">Student Mobile Number:</span>
                    <p className="font-bold text-slate-800 mt-0.5">
                      {viewingStudent.phone || <span className="text-slate-400 font-normal">Not provided</span>}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Official Portal Email:</span>
                    <p className="font-bold text-indigo-700 mt-0.5">
                      {viewingStudent.email || <span className="text-slate-400 font-normal">Not assigned</span>}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Guardian / Parent Name:</span>
                    <p className="font-bold text-slate-800 mt-0.5">
                      {viewingStudent.guardianName || <span className="text-slate-400 font-normal">Not provided</span>}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Guardian Emergency Phone:</span>
                    <p className="font-bold text-slate-800 mt-0.5">
                      {viewingStudent.guardianPhone || <span className="text-slate-400 font-normal">Not provided</span>}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-500 font-medium">Residential / Permanent Address:</span>
                    <p className="font-medium text-slate-800 mt-0.5">
                      {viewingStudent.address || <span className="text-slate-400 font-normal">Not specified</span>}
                    </p>
                  </div>
                </div>
              </div>

              {/* Student Portal Account Security */}
              <div className="p-5 rounded-2xl bg-indigo-50/70 border border-indigo-100/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-950 mb-1">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <span>Student Portal Account</span>
                  </div>
                  <p className="text-xs text-indigo-900/80">
                    Login Email: <strong className="font-mono text-indigo-950">{viewingStudent.email}</strong>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Default password pattern: First Name + Birth Year (e.g.{' '}
                    <strong>{computeDefaultPassword(viewingStudent.firstName || viewingStudent.name, viewingStudent.dob) || 'FirstnameYear'}</strong>)
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const st = viewingStudent;
                    setViewingStudent(null);
                    openEditModal(st);
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-all active:scale-95"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>
              </div>
            </div>

            {/* Profile Modal Footer */}
            <div className="px-6 sm:px-8 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => {
                  const st = viewingStudent;
                  setViewingStudent(null);
                  setIdCardStudent(st);
                }}
                className="px-4 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-xs"
              >
                <Contact className="w-3.5 h-3.5" />
                <span>Student ID Card</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingStudent(null)}
                className="px-5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Institutional Student ID Card Modal */}
      {idCardStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                Institutional Student ID Card
              </span>
              <button
                type="button"
                onClick={() => setIdCardStudent(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Printable ID Card Container */}
            <div className="p-6 bg-slate-900/60 flex justify-center">
              <div
                id="admin-student-id-card"
                className="w-full max-w-sm rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border border-white/10 text-white p-6 shadow-2xl relative overflow-hidden"
              >
                {/* Institutional Top Header */}
                <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/10 relative z-10">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md">
                      <SnitLogo size={30} className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-[11px] tracking-tight text-white leading-tight uppercase">
                        Shrinathji Institute of Technology
                      </h3>
                      <p className="text-[9px] text-slate-300 tracking-wider">
                        Nathdwara, Raj. • AICTE Approved & RTU Affiliated
                      </p>
                    </div>
                  </div>
                  {/* Holographic RFID Chip Graphic */}
                  <div className="shrink-0">
                    <div className="w-9 h-6 rounded-md bg-gradient-to-tr from-amber-400 via-yellow-200 to-amber-500 shadow-inner border border-amber-200/60 p-0.5 flex flex-col justify-between">
                      <div className="flex justify-between h-0.5 border-b border-amber-600/30" />
                      <div className="text-[6px] font-mono font-black text-amber-950 text-center tracking-widest">
                        RFID
                      </div>
                      <div className="flex justify-between h-0.5 border-t border-amber-600/30" />
                    </div>
                  </div>
                </div>

                {/* Student Portrait & Primary Info */}
                <div className="py-4 relative z-10 flex items-center gap-3.5">
                  <div className="relative shrink-0">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-black text-2xl flex items-center justify-center shadow-lg border-2 border-white/30">
                      {idCardStudent.name ? idCardStudent.name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-emerald-500 text-white shadow-md">
                      <BadgeCheck className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <div className="space-y-1 min-w-0">
                    <h3 className="text-base font-black text-white tracking-tight truncate">
                      {idCardStudent.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-300">
                        Roll: {idCardStudent.rollNumber}
                      </span>
                    </div>
                    <div>
                      <span className="px-2 py-0.5 rounded-md bg-white/10 text-indigo-200 font-mono text-[10px] font-semibold border border-white/10">
                        {idCardStudent.registrationId || `STU-${idCardStudent.rollNumber}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Academic Coordinates Matrix */}
                <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md relative z-10 text-[10px]">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
                      Department
                    </span>
                    <span className="font-semibold text-slate-200 line-clamp-1">
                      {idCardStudent.department}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
                      Semester
                    </span>
                    <span className="font-semibold text-slate-200">
                      {idCardStudent.semester}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
                      Blood Group
                    </span>
                    <span className="font-bold text-rose-300 inline-flex items-center gap-1">
                      <HeartPulse className="w-2.5 h-2.5 text-rose-400" />
                      <span>{idCardStudent.bloodGroup || 'O+'}</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
                      Date of Birth
                    </span>
                    <span className="font-semibold text-slate-200">
                      {idCardStudent.dob ? formatDOB(idCardStudent.dob) : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
                      Student Phone
                    </span>
                    <span className="font-semibold text-slate-200">
                      {idCardStudent.phone || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
                      Valid Till
                    </span>
                    <span className="font-bold text-emerald-400">June 2027</span>
                  </div>
                </div>

                {/* Barcode & Security strip */}
                <div className="mt-3 pt-2.5 border-t border-white/10 text-center relative z-10">
                  <div className="h-6 w-44 mx-auto flex items-stretch justify-center gap-0.5 opacity-90">
                    {[1, 2, 1, 3, 1, 2, 3, 1, 1, 2, 3, 2, 1, 2, 1, 3, 2, 1, 2, 3, 1, 2, 1, 1, 3, 2].map((w, idx) => (
                      <div key={idx} className="bg-white" style={{ width: `${w * 1.3}px` }} />
                    ))}
                  </div>
                  <span className="font-mono text-[8px] tracking-widest text-slate-300 block mt-1">
                    *{idCardStudent.registrationId || idCardStudent.rollNumber}*
                  </span>
                </div>

                {/* Card Footer: Verification Badge */}
                <div className="pt-2.5 mt-2.5 border-t border-white/10 flex items-center justify-between relative z-10 text-[9px]">
                  <div className="flex items-center gap-1.5">
                    <div className="p-0.5 rounded bg-white/10 border border-white/20">
                      <QrCode className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-slate-300 font-mono leading-tight text-[8px]">
                      <span className="font-bold text-white block">CAMPUS DIGITAL ID</span>
                      <span>SECURE-AUTH-2026</span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold">
                    <BadgeCheck className="w-2.5 h-2.5" />
                    <span>Official ID</span>
                  </span>
                </div>

                {/* Decorative ambient glow */}
                <div className="absolute -top-12 -right-12 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIdCardStudent(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => printElementById('admin-student-id-card', `${idCardStudent?.name || 'Student'}_ID_Card`)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print ID Card</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Student Modal — Split-Pane Stepper & Emerald-Slate Theme */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-md animate-fade-in overflow-y-auto"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200/90 grid grid-cols-1 md:grid-cols-[275px_1fr] max-h-[92vh] overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left Sidebar Rail: Theme Showcase, Live Student Card & 1-Click Section Tabs */}
            <div className="bg-gradient-to-b from-slate-950 via-slate-900 to-teal-950 text-white p-5 sm:p-6 flex flex-col justify-between gap-5 relative overflow-hidden">
              <div className="absolute -top-16 -left-16 w-48 h-48 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 space-y-5">
                {/* Brand / Modal Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-500 text-white flex items-center justify-center shadow-lg shadow-teal-950/60 border border-white/20 shrink-0">
                      <UserPlus className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-teal-300 block">
                        SNITN Registry
                      </span>
                      <h3 className="text-base font-extrabold tracking-tight leading-snug text-white">
                        {editingStudent ? 'Edit Student' : 'New Student Registration'}
                      </h3>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="md:hidden p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                    aria-label="Close registration dialog"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Live Student ID Preview Card */}
                <div className="p-3.5 rounded-2xl bg-white/8 border border-white/15 backdrop-blur-md space-y-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 text-slate-950 font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
                      {(formData.firstName || formData.name || 'S').trim().charAt(0).toUpperCase() || 'S'}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-white truncate">
                        {`${formData.firstName} ${formData.lastName}`.trim() || 'Student Name'}
                      </div>
                      <div className="text-[11px] text-slate-300 truncate">
                        {formData.semester}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/10">
                    <span className="px-2 py-0.5 rounded-md bg-white/10 font-mono text-[10px] font-bold text-teal-200">
                      {formData.rollNumber.trim() || 'ROLL-PENDING'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/30 font-mono text-[10px] font-bold text-emerald-200">
                      {formData.rollNumber.trim()
                        ? `STU-${formData.rollNumber.trim().replace(/[^A-Za-z0-9]/g, '')}`
                        : 'STU-AUTO'}
                    </span>
                  </div>
                </div>

                {/* 1-Click Section Navigation */}
                <nav className="grid grid-cols-2 md:grid-cols-1 gap-1.5" aria-label="Registration sections">
                  {[
                    {
                      id: 'academic',
                      step: '01',
                      label: 'Academic Placement',
                      desc: 'Roll #, dept & semester',
                      icon: GraduationCap,
                      complete: Boolean(formData.rollNumber.trim() && formData.department && formData.semester),
                    },
                    {
                      id: 'personal',
                      step: '02',
                      label: 'Personal Profile',
                      desc: 'Name, DOB & blood group',
                      icon: User,
                      complete: Boolean(formData.firstName.trim() && formData.dob),
                    },
                    {
                      id: 'contact',
                      step: '03',
                      label: 'Guardian & Address',
                      desc: 'Optional contact details',
                      icon: Phone,
                      complete: Boolean(formData.guardianName.trim() || formData.guardianPhone.trim() || formData.address.trim()),
                    },
                    {
                      id: 'credentials',
                      step: '04',
                      label: 'Portal Credentials',
                      desc: 'Login email & password',
                      icon: ShieldCheck,
                      complete: Boolean(formData.email.trim()),
                    },
                  ].map((item) => {
                    const StepIcon = item.icon;
                    const isActive = modalStep === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setModalStep(item.id)}
                        className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left transition-all cursor-pointer border ${
                          isActive
                            ? 'bg-teal-500/20 border-teal-400/50 text-white shadow-sm'
                            : 'bg-white/0 border-transparent text-slate-300 hover:bg-white/8 hover:text-white'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[11px] font-bold ${
                            isActive
                              ? 'bg-teal-400 text-slate-950'
                              : item.complete
                              ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/30'
                              : 'bg-white/10 text-slate-300'
                          }`}
                        >
                          <StepIcon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold truncate leading-tight">{item.label}</div>
                          <div className="text-[10px] text-slate-400 truncate hidden md:block">{item.desc}</div>
                        </div>
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            item.complete ? 'bg-emerald-400' : isActive ? 'bg-teal-300' : 'bg-slate-600'
                          }`}
                        />
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="relative z-10 hidden md:block pt-3 border-t border-white/10 text-[11px] text-slate-400 leading-relaxed">
                Enroll a new student and provision instant academic portal credentials.
              </div>
            </div>

            {/* Right Pane: Active Section Form & Sticky Footer */}
            <div className="flex flex-col min-h-0 bg-white">
              {/* Top Section Header */}
              <div className="px-6 sm:px-8 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-teal-600">
                    {modalStep === 'academic'
                      ? 'Step 1 of 4 • Academic Placement'
                      : modalStep === 'personal'
                      ? 'Step 2 of 4 • Personal Profile'
                      : modalStep === 'contact'
                      ? 'Step 3 of 4 • Guardian & Address'
                      : 'Step 4 of 4 • Portal Credentials'}
                  </span>
                  <h4 className="text-base sm:text-lg font-extrabold text-slate-900 mt-0.5">
                    {modalStep === 'academic'
                      ? 'Academic Placement & Roll Assignment'
                      : modalStep === 'personal'
                      ? 'Personal Identity & Demographics'
                      : modalStep === 'contact'
                      ? 'Guardian & Residential Details'
                      : 'Student Portal Login Access'}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="hidden md:flex p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                  aria-label="Close registration dialog"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Form Content */}
              <form
                id="student-registration-form"
                noValidate
                onSubmit={handleFormSubmit}
                className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-5"
              >
                {formError && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-700 text-xs font-semibold">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                {modalStep === 'academic' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                    <div>
                      <label className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 min-h-[18px]">
                        <span>Roll Number *</span>
                        <span className="text-[10px] font-semibold text-slate-400 normal-case">Unique ID</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. CS2026-042"
                        value={formData.rollNumber}
                        onChange={(e) => handleRollNumberChange(e.target.value)}
                        className="w-full h-11 px-3.5 bg-slate-50/80 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-800 uppercase focus:outline-none focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all"
                      />
                    </div>

                    <div>
                      <label className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 min-h-[18px]">
                        <span>Registration ID</span>
                        <span className="text-[10px] font-semibold text-emerald-600 normal-case">Auto-Generated</span>
                      </label>
                      <input
                        type="text"
                        readOnly
                        tabIndex={-1}
                        value={
                          formData.rollNumber.trim()
                            ? `STU-${formData.rollNumber.trim().replace(/[^A-Za-z0-9]/g, '')}`
                            : 'Generated from Roll Number'
                        }
                        className="w-full h-11 px-3.5 bg-slate-100/80 border border-slate-200 rounded-xl text-sm font-mono font-semibold text-slate-600 cursor-default focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 min-h-[18px]">
                        <span>Academic Department *</span>
                      </label>
                      <select
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        className="w-full h-11 px-3.5 bg-slate-50/80 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 cursor-pointer transition-all"
                      >
                        {DEPARTMENTS.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 min-h-[18px]">
                        <span>Target Semester *</span>
                      </label>
                      <select
                        value={formData.semester}
                        onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                        className="w-full h-11 px-3.5 bg-slate-50/80 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 cursor-pointer transition-all"
                      >
                        {SEMESTERS.map((sem) => (
                          <option key={sem} value={sem}>
                            {sem}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {modalStep === 'personal' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                    <div>
                      <label className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 min-h-[18px]">
                        <span>First Name *</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Aarav"
                        value={formData.firstName}
                        onChange={(e) => handleFirstNameChange(e.target.value)}
                        className="w-full h-11 px-3.5 bg-slate-50/80 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all"
                      />
                    </div>

                    <div>
                      <label className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 min-h-[18px]">
                        <span>Last Name / Surname</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Sharma"
                        value={formData.lastName}
                        onChange={(e) => handleLastNameChange(e.target.value)}
                        className="w-full h-11 px-3.5 bg-slate-50/80 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all"
                      />
                    </div>

                    <div>
                      <label className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 min-h-[18px]">
                        <span>Date of Birth *</span>
                        <span className="text-[10px] text-teal-600 font-semibold normal-case">
                          {formData.dob ? formatDOB(formData.dob) : 'DD/MM/YYYY'}
                        </span>
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.dob}
                        onChange={(e) => handleDobChange(e.target.value)}
                        className="w-full h-11 px-3.5 bg-slate-50/80 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all"
                      />
                    </div>

                    <div>
                      <label className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 min-h-[18px]">
                        <span>Gender</span>
                      </label>
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        className="w-full h-11 px-3.5 bg-slate-50/80 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 cursor-pointer transition-all"
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 min-h-[18px]">
                        <span>Blood Group</span>
                      </label>
                      <select
                        value={formData.bloodGroup}
                        onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                        className="w-full h-11 px-3.5 bg-slate-50/80 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 cursor-pointer transition-all"
                      >
                        <option value="">Select Blood Group</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                      </select>
                    </div>

                    <div>
                      <label className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 min-h-[18px]">
                        <span>Student Phone</span>
                      </label>
                      <input
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full h-11 px-3.5 bg-slate-50/80 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all"
                      />
                    </div>
                  </div>
                )}

                {modalStep === 'contact' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                    <div>
                      <label className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 min-h-[18px]">
                        <span>Guardian / Parent Name</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Father's or Guardian's Name"
                        value={formData.guardianName}
                        onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                        className="w-full h-11 px-3.5 bg-slate-50/80 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all"
                      />
                    </div>

                    <div>
                      <label className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 min-h-[18px]">
                        <span>Guardian Phone</span>
                      </label>
                      <input
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={formData.guardianPhone}
                        onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
                        className="w-full h-11 px-3.5 bg-slate-50/80 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 min-h-[18px]">
                        <span>Residential Address</span>
                      </label>
                      <input
                        type="text"
                        placeholder="House / Street, City, State"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full h-11 px-3.5 bg-slate-50/80 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all"
                      />
                    </div>
                  </div>
                )}

                {modalStep === 'credentials' && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200/80 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 text-xs font-bold text-teal-950">
                        <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
                        <span>Instant Student Portal Login Provisioning</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200 shrink-0">
                        Auto-Provisioned
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 min-h-[18px]">
                          <span>Login Email *</span>
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="student@snitn.edu"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full h-11 px-3.5 bg-slate-50/80 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all"
                        />
                        <span className="text-[11px] text-slate-500 mt-1.5 block">
                          Auto-generated domain: <strong>@snitn.edu</strong>
                        </span>
                      </div>

                      <div>
                        <label className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 min-h-[18px]">
                          <span>{editingStudent ? 'New Password (Optional)' : 'Default Password'}</span>
                        </label>
                        <input
                          type="text"
                          placeholder={editingStudent ? 'Leave blank to keep existing' : (computeDefaultPassword(formData.firstName, formData.dob) || 'FirstnameYear')}
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full h-11 px-3.5 bg-slate-50/80 border border-slate-200 rounded-xl text-sm font-mono font-semibold text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all"
                        />
                        <span className="text-[11px] text-slate-600 mt-1.5 block">
                          {editingStudent ? (
                            'Enter at least 6 characters only if resetting password.'
                          ) : (
                            <>
                              Auto rule: <strong>First Name + Birth Year</strong> (e.g.{' '}
                              <strong className="text-teal-700 font-mono font-bold">
                                {computeDefaultPassword(formData.firstName, formData.dob) || 'Aarav2004'}
                              </strong>
                              )
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </form>

              {/* Modal Sticky Footer */}
              <div className="px-6 sm:px-8 py-4 border-t border-slate-100 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  {modalStep !== 'academic' && (
                    <button
                      type="button"
                      onClick={() => {
                        const order = ['academic', 'personal', 'contact', 'credentials'];
                        const idx = order.indexOf(modalStep);
                        if (idx > 0) setModalStep(order[idx - 1]);
                      }}
                      className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer"
                    >
                      Previous
                    </button>
                  )}
                  {modalStep !== 'credentials' && (
                    <button
                      type="button"
                      onClick={() => {
                        const order = ['academic', 'personal', 'contact', 'credentials'];
                        const idx = order.indexOf(modalStep);
                        if (idx < order.length - 1) setModalStep(order[idx + 1]);
                      }}
                      className="px-3.5 py-2 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-all cursor-pointer"
                    >
                      Next Section
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2.5 ml-auto">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="student-registration-form"
                    disabled={submitting}
                    className="px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 hover:from-teal-700 hover:to-emerald-700 rounded-xl shadow-md shadow-teal-600/20 transition-all cursor-pointer disabled:opacity-50 active:scale-98 flex items-center gap-2"
                  >
                    {submitting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>{editingStudent ? 'Update Student Record' : 'Register Student'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Student & Login Account"
        message={`Are you sure you want to delete ${deleteTarget?.name} (${deleteTarget?.rollNumber})? This will permanently delete both their student profile, attendance logs, and their student portal login access.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmText="Confirm Delete"
      />
    </div>
  );
};

export default StudentsView;
