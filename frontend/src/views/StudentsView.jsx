import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Trash2,
  Edit2,
  CheckCircle,
  X,
  AlertCircle,
  GraduationCap,
  Sparkles,
  BookOpen,
  Mail,
  Lock,
  Key,
  ShieldCheck,
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

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    rollNumber: '',
    department: 'Computer Science & Engineering',
    semester: 'Semester 4',
    email: '',
    password: 'student123',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Delete Modal State
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    fetchStudents();
  }, [selectedSemester, selectedDepartment]);

  // Debounced search as user types
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchStudents = async () => {
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
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchStudents();
  };

  const openAddModal = () => {
    setEditingStudent(null);
    setFormData({
      name: '',
      rollNumber: '',
      department: 'Computer Science & Engineering',
      semester: selectedSemester !== 'All' ? selectedSemester : 'Semester 4',
      email: '',
      password: 'student123',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name,
      rollNumber: student.rollNumber,
      department: student.department || 'Computer Science & Engineering',
      semester: student.semester || 'Semester 4',
      email: student.email || '',
      password: '', // Blank unless admin wants to reset it
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleRollNumberChange = (value) => {
    const uppercase = value.toUpperCase();
    const updated = { ...formData, rollNumber: uppercase };
    // Auto suggest email if not already manually filled
    if (!editingStudent && (!formData.email || formData.email.endsWith('@student.edu'))) {
      const clean = uppercase.toLowerCase().replace(/[^a-z0-9]/g, '');
      updated.email = clean ? `${clean}@student.edu` : '';
    }
    setFormData(updated);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim() || !formData.rollNumber.trim()) {
      setFormError('Name and Roll Number are required fields.');
      return;
    }

    try {
      setSubmitting(true);
      if (editingStudent) {
        // Update Student
        const res = await axiosClient.put(`/students/${editingStudent._id}`, formData);
        if (res.data.success) {
          showToast?.({ message: 'Student and login credentials updated', type: 'success' });
          setIsModalOpen(false);
          fetchStudents();
        }
      } else {
        // Create Student
        const res = await axiosClient.post('/students', formData);
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border border-slate-100 my-8">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3.5 mb-6">
              <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingStudent ? 'Edit Student & Credentials' : 'Register New Student'}
                </h3>
                <p className="text-xs text-slate-500">
                  {editingStudent
                    ? 'Update profile or reset student portal password'
                    : 'Enroll student and automatically provision login access'}
                </p>
              </div>
            </div>

            {formError && (
              <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-700 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aarav Sharma"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

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
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-semibold text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Semester
                  </label>
                  <select
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 cursor-pointer"
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
                    Department
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 cursor-pointer"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Login Credentials Section */}
              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100/90 space-y-3.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>Student Portal Login Credentials</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Student Login Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="student@student.edu"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    {editingStudent ? 'New Password (Leave blank to keep current)' : 'Initial Password *'}
                  </label>
                  <input
                    type="password"
                    placeholder={editingStudent ? '••••••••' : 'Default: student123'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  {!editingStudent && (
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Default password is <strong>student123</strong> (Student can change this after logging in).
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 rounded-xl shadow-md shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting
                    ? 'Saving...'
                    : editingStudent
                    ? 'Update Student'
                    : 'Register Student'}
                </button>
              </div>
            </form>
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
