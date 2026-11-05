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
} from 'lucide-react';
import axiosClient from '../api/axiosClient';
import ConfirmModal from '../components/ConfirmModal';

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

export const StudentsView = ({ showToast }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('All');
  const [selectedDepartment, setSelectedDepartment] = useState('All');

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
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    name: '',
    dob: '', // YYYY-MM-DD
    rollNumber: '',
    department: 'Computer Science & Engineering',
    semester: 'Semester 4',
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

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      let query = `?semester=${selectedSemester}&department=${selectedDepartment}`;
      if (search.trim()) {
        query += `&search=${encodeURIComponent(search.trim())}`;
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
  }, [selectedSemester, selectedDepartment, search, showToast]);

  useEffect(() => {
    fetchStudents();
  }, [selectedSemester, selectedDepartment, fetchStudents]);

  // Debounced search as user types
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, fetchStudents]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchStudents();
  };

  const openAddModal = () => {
    setEditingStudent(null);
    setFormData({
      firstName: '',
      lastName: '',
      name: '',
      dob: '',
      rollNumber: '',
      department: 'Computer Science & Engineering',
      semester: selectedSemester !== 'All' ? selectedSemester : 'Semester 4',
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
    setIsModalOpen(true);
  };

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
      semester: student.semester || 'Semester 4',
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

    if (!formData.firstName.trim() || !formData.rollNumber.trim()) {
      setFormError('First Name and Roll Number are required fields.');
      return;
    }

    try {
      setSubmitting(true);
      const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim();
      const defaultPass = computeDefaultPassword(formData.firstName, formData.dob) || 'student123';
      const payload = {
        ...formData,
        name: fullName,
        password: formData.password.trim() || defaultPass,
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
                    <tr key={student._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-6">
                        <div className="font-mono font-bold text-xs text-indigo-700">
                          {student.rollNumber}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {student.registrationId || `STU-${student.rollNumber}`}
                        </div>
                      </td>
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-50 to-violet-100 border border-indigo-200/60 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                            {initial}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800">{student.name}</div>
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
                      <td className="py-3.5 px-6 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(student)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer"
                            title="Edit Student & Credentials"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(student)}
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

      {/* Add / Edit Student Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col max-h-[92vh] overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="px-6 sm:px-8 py-5 border-b border-slate-100 bg-white/95 backdrop-blur-md flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight leading-snug">
                    {editingStudent ? 'Edit Student & Credentials' : 'New Student Registration'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {editingStudent
                      ? 'Modify student profile details or update portal login credentials'
                      : 'Enroll a new student and provision instant academic portal credentials'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                aria-label="Close registration dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Form Body */}
            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-6">
              {formError && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Card 1: Academic & Institutional Placement */}
              <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700">
                  <GraduationCap className="w-4 h-4" />
                  <span>Academic Placement</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Roll Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. CS2026-042"
                      value={formData.rollNumber}
                      onChange={(e) => handleRollNumberChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Semester *
                    </label>
                    <select
                      value={formData.semester}
                      onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 cursor-pointer transition-all"
                    >
                      {SEMESTERS.map((sem) => (
                        <option key={sem} value={sem}>
                          {sem}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Department *
                    </label>
                    <select
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 cursor-pointer transition-all truncate"
                    >
                      {DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Card 2: Personal Profile */}
              <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800">
                  <User className="w-4 h-4 text-indigo-600" />
                  <span>Personal Information</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      First Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Aarav"
                      value={formData.firstName}
                      onChange={(e) => handleFirstNameChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Last Name / Surname
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Sharma"
                      value={formData.lastName}
                      onChange={(e) => handleLastNameChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
                      <span>Date of Birth *</span>
                      <span className="text-[10px] text-indigo-600 font-semibold normal-case">DD/MM/YYYY</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.dob}
                      onChange={(e) => handleDobChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                    />
                    {formData.dob && (
                      <span className="text-[11px] text-slate-500 mt-1 block">
                        Formatted: <strong>{formatDOB(formData.dob)}</strong>
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Gender
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 cursor-pointer transition-all"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Blood Group
                    </label>
                    <select
                      value={formData.bloodGroup}
                      onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 cursor-pointer transition-all"
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
                </div>
              </div>

              {/* Card 3: Contact & Guardian Information */}
              <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-4">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span className="flex items-center gap-2 uppercase tracking-wider">
                    <Phone className="w-4 h-4 text-indigo-600" />
                    <span>Contact & Guardian Details</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Optional</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Student Phone
                    </label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Guardian / Parent Name
                    </label>
                    <input
                      type="text"
                      placeholder="Father's or Guardian's Name"
                      value={formData.guardianName}
                      onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Guardian Phone
                    </label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={formData.guardianPhone}
                      onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Residential Address
                    </label>
                    <input
                      type="text"
                      placeholder="Residential address / city"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Card 4: Portal Login Credentials */}
              <div className="p-5 rounded-2xl bg-indigo-50/70 border border-indigo-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-950">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <span>Student Portal Login Access</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Auto-Provisioned
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Login Email *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="student@snitn.edu"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                    />
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Auto-generated domain: <strong>@snitn.edu</strong>
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      {editingStudent ? 'New Password (Leave blank to keep)' : 'Default Password'}
                    </label>
                    <input
                      type="text"
                      placeholder={editingStudent ? '••••••••' : (computeDefaultPassword(formData.firstName, formData.dob) || 'FirstnameYear')}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                    />
                    {!editingStudent && (
                      <span className="text-[11px] text-slate-600 mt-1 block">
                        Auto rule: <strong>First Name + Birth Year</strong> (e.g.{' '}
                        <strong className="text-indigo-600 font-mono font-bold">
                          {computeDefaultPassword(formData.firstName, formData.dob) || 'Aarav2004'}
                        </strong>).
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </form>

            {/* Modal Sticky Footer */}
            <div className="px-6 sm:px-8 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                * Mandatory fields for academic registration
              </span>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleFormSubmit}
                  disabled={submitting}
                  className="px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 hover:from-indigo-700 hover:to-violet-800 rounded-xl shadow-md shadow-indigo-500/25 transition-all cursor-pointer disabled:opacity-50 active:scale-98 flex items-center gap-2"
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
