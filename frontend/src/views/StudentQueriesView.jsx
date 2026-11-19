import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Search,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Mail,
  Phone,
  MapPin,
  Calendar,
  HeartPulse,
  Users,
  Edit2,
  RefreshCw,
  Check,
  X,
  Send,
  Download,
  GraduationCap,
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

export const StudentQueriesView = ({ showToast, setActiveView }) => {
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All'); // 'All' | 'Pending' | 'Reviewed' | 'Resolved'
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedSemester, setSelectedSemester] = useState('All');
  const [stats, setStats] = useState({ total: 0, pending: 0, reviewed: 0, resolved: 0 });

  // Admin reply drafts state (queryId -> reply text)
  const [replyDrafts, setReplyDrafts] = useState({});
  const [savingReplyId, setSavingReplyId] = useState(null);

  // Delete modal state
  const [queryToDelete, setQueryToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Status updating state
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  // Quick Edit Student Profile modal state
  const [editModalStudent, setEditModalStudent] = useState(null);
  const [editModalQuery, setEditModalQuery] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    firstName: '',
    lastName: '',
    dob: '',
    rollNumber: '',
    department: 'Computer Science & Engineering',
    semester: 'Semester 1',
    email: '',
    phone: '',
    gender: '',
    bloodGroup: '',
    address: '',
    guardianName: '',
    guardianPhone: '',
    password: '',
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Fetch queries
  const fetchQueries = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedStatus !== 'All') {
        params.status = selectedStatus;
      }
      if (selectedDepartment !== 'All') {
        params.department = selectedDepartment;
      }
      if (selectedSemester !== 'All') {
        params.semester = selectedSemester;
      }
      if (search.trim()) {
        params.search = search.trim();
      }

      const res = await axiosClient.get('/student-queries', { params });
      if (res.data.success) {
        setQueries(res.data.data || []);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (err) {
      console.error('Error fetching student queries:', err);
      showToast?.({ message: 'Failed to load student queries', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [selectedStatus, selectedDepartment, selectedSemester, search, showToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchQueries();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchQueries]);

  // Update query status
  const handleStatusChange = async (queryId, newStatus) => {
    try {
      setStatusUpdatingId(queryId);
      const res = await axiosClient.patch(`/student-queries/${queryId}/status`, {
        status: newStatus,
      });

      if (res.data.success) {
        setQueries((prev) =>
          prev.map((q) => (q._id === queryId ? { ...q, status: newStatus } : q))
        );
        showToast?.({
          message: `Query marked as ${newStatus} successfully!`,
          type: 'success',
        });
        window.dispatchEvent(new Event('queries:updated'));
        // Refresh counts via lightweight stats endpoint
        const allRes = await axiosClient.get('/student-queries/stats');
        if (allRes.data.stats) {
          setStats(allRes.data.stats);
        }
      }
    } catch (err) {
      console.error('Error updating status:', err);
      showToast?.({
        message: err.response?.data?.message || 'Failed to update query status',
        type: 'error',
      });
    } finally {
      setStatusUpdatingId(null);
    }
  };

  // Save Admin Note / Reply to Student
  const handleSaveAdminReply = async (queryId) => {
    const draftText = replyDrafts[queryId];
    if (draftText === undefined) return;

    try {
      setSavingReplyId(queryId);
      const res = await axiosClient.patch(`/student-queries/${queryId}/status`, {
        adminResponse: draftText.trim(),
      });

      if (res.data.success) {
        setQueries((prev) =>
          prev.map((q) => (q._id === queryId ? { ...q, adminResponse: draftText.trim() } : q))
        );
        showToast?.({ message: 'Reply note sent to student successfully!', type: 'success' });
        window.dispatchEvent(new Event('queries:updated'));
      }
    } catch (err) {
      console.error('Error saving admin reply:', err);
      showToast?.({
        message: err.response?.data?.message || 'Failed to send reply note',
        type: 'error',
      });
    } finally {
      setSavingReplyId(null);
    }
  };

  // Delete query
  const handleDeleteQuery = async () => {
    if (!queryToDelete) return;
    try {
      setIsDeleting(true);
      const res = await axiosClient.delete(`/student-queries/${queryToDelete._id}`);
      if (res.data.success) {
        setQueries((prev) => prev.filter((q) => q._id !== queryToDelete._id));
        showToast?.({ message: 'Query message deleted from database!', type: 'success' });
        setQueryToDelete(null);
        window.dispatchEvent(new Event('queries:updated'));
        // Refresh stats
        const allRes = await axiosClient.get('/student-queries');
        if (allRes.data.stats) {
          setStats(allRes.data.stats);
        }
      }
    } catch (err) {
      console.error('Error deleting query:', err);
      showToast?.({
        message: err.response?.data?.message || 'Failed to delete query',
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Open Quick Edit Student Profile modal
  const handleOpenEditStudent = async (query) => {
    setEditError('');
    setEditModalQuery(query);

    let studentData = null;
    const studentId =
      query.studentId?._id ||
      (typeof query.studentId === 'string' ? query.studentId : null);

    // 1. Fetch fresh record by ID if available
    if (studentId) {
      try {
        const freshRes = await axiosClient.get(`/students/${studentId}`);
        if (freshRes.data.success && freshRes.data.data) {
          studentData = freshRes.data.data;
        }
      } catch (err) {
        console.warn('Could not fetch student by ID, trying fallback search:', err);
      }
    }

    // 2. Fallback to populated object
    if (!studentData && query.studentId && typeof query.studentId === 'object' && query.studentId._id) {
      studentData = query.studentId;
    }

    // 3. Fallback to search by rollNumber
    if (!studentData) {
      try {
        const res = await axiosClient.get(`/students?search=${encodeURIComponent(query.rollNumber)}`);
        if (res.data.success && res.data.data?.length > 0) {
          studentData =
            res.data.data.find(
              (s) => s.rollNumber?.toUpperCase() === query.rollNumber?.toUpperCase()
            ) || res.data.data[0];
        }
      } catch (err) {
        console.error('Error finding student for edit:', err);
      }
    }

    if (!studentData) {
      showToast?.({
        message: 'Student record could not be found for direct editing',
        type: 'error',
      });
      return;
    }

    const fName = studentData.firstName || (studentData.name ? studentData.name.split(' ')[0] : '');
    const lName =
      studentData.lastName ||
      (studentData.name ? studentData.name.split(' ').slice(1).join(' ') : '');

    setEditModalStudent(studentData);
    setEditFormData({
      name: studentData.name || `${fName} ${lName}`.trim(),
      firstName: fName,
      lastName: lName,
      dob: studentData.dob || '',
      rollNumber: studentData.rollNumber || query.rollNumber || '',
      department: studentData.department || query.department || 'Computer Science & Engineering',
      semester: studentData.semester || query.semester || 'Semester 1',
      email: studentData.email || query.email || '',
      phone: studentData.phone || query.phone || '',
      gender: studentData.gender || '',
      bloodGroup: studentData.bloodGroup || '',
      address: studentData.address || '',
      guardianName: studentData.guardianName || '',
      guardianPhone: studentData.guardianPhone || '',
      password: '',
    });
  };

  // Save updated student profile details
  const handleSaveStudentProfile = async (e) => {
    e.preventDefault();
    if (!editModalStudent?._id) return;

    setEditError('');
    try {
      setEditSaving(true);
      const res = await axiosClient.put(`/students/${editModalStudent._id}`, editFormData);

      if (res.data.success) {
        showToast?.({
          message: `Student profile updated successfully in database!`,
          type: 'success',
        });

        // Automatically mark the query as Resolved if desired
        if (editModalQuery?._id && editModalQuery.status !== 'Resolved') {
          await handleStatusChange(editModalQuery._id, 'Resolved');
        }

        setEditModalStudent(null);
        setEditModalQuery(null);
        window.dispatchEvent(new Event('queries:updated'));
        fetchQueries();
      }
    } catch (err) {
      console.error('Error updating student profile:', err);
      const msg = err.response?.data?.message || 'Failed to update student profile';
      setEditError(msg);
      showToast?.({ message: msg, type: 'error' });
    } finally {
      setEditSaving(false);
    }
  };

  // Export queries to CSV
  const exportQueriesCSV = () => {
    if (queries.length === 0) {
      showToast?.({ message: 'No queries to export', type: 'error' });
      return;
    }
    const headers = [
      'Student Name',
      'Roll Number',
      'Department',
      'Semester',
      'Email',
      'Phone',
      'Field to Change',
      'Requested Change',
      'Reason',
      'Additional Message',
      'Status',
      'Admin Response',
      'Date Submitted',
    ];
    const rows = queries.map((q) => [
      `"${(q.studentName || '').replace(/"/g, '""')}"`,
      q.rollNumber || '',
      `"${(q.department || '').replace(/"/g, '""')}"`,
      q.semester || '',
      q.email || '',
      q.phone || '',
      `"${(q.fieldToChange || '').replace(/"/g, '""')}"`,
      `"${(q.requestedChange || '').replace(/"/g, '""')}"`,
      `"${(q.reason || '').replace(/"/g, '""')}"`,
      `"${(q.message || '').replace(/"/g, '""')}"`,
      q.status || 'Pending',
      `"${(q.adminResponse || '').replace(/"/g, '""')}"`,
      new Date(q.createdAt).toISOString(),
    ]);
    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute(
      'download',
      `student_queries_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
    showToast?.({ message: 'Student queries exported to CSV successfully!', type: 'success' });
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Banner & KPI Summary Cards */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-950 border border-slate-800 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">Student Queries & Requests</h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Review profile change requests and queries submitted directly by students. You can review what they want changed, reasons provided, edit student records directly, send notes, and manage query statuses.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
            {setActiveView && (
              <button
                onClick={() => setActiveView('students')}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                title="Navigate to Student Register"
              >
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                <span>Student Register</span>
              </button>
            )}

            <button
              onClick={exportQueriesCSV}
              disabled={queries.length === 0}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              title="Export all queries as CSV file"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={fetchQueries}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Messages</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{stats.total || queries.length}</p>
          <span className="text-[10px] text-slate-400">All submitted queries</span>
        </div>

        <div className="bg-amber-50/70 rounded-2xl border border-amber-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Pending Action</p>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          </div>
          <p className="text-2xl font-extrabold text-amber-900 mt-1">{stats.pending}</p>
          <span className="text-[10px] text-amber-700/90 font-medium">Needs review & update</span>
        </div>

        <div className="bg-indigo-50/70 rounded-2xl border border-indigo-200/80 p-4 shadow-xs">
          <p className="text-xs font-semibold text-indigo-800 uppercase tracking-wider">Under Review</p>
          <p className="text-2xl font-extrabold text-indigo-900 mt-1">{stats.reviewed}</p>
          <span className="text-[10px] text-indigo-700/90 font-medium">Being processed</span>
        </div>

        <div className="bg-emerald-50/70 rounded-2xl border border-emerald-200/80 p-4 shadow-xs">
          <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Resolved</p>
          <p className="text-2xl font-extrabold text-emerald-900 mt-1">{stats.resolved}</p>
          <span className="text-[10px] text-emerald-700/90 font-medium">Profile updated</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Status filter tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl overflow-x-auto no-scrollbar">
            {['All', 'Pending', 'Reviewed', 'Resolved'].map((status) => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer active:scale-95 ${
                  selectedStatus === status
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {status}
                {status === 'Pending' && stats.pending > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px]">
                    {stats.pending}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Department & Semester Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer"
            >
              <option value="All">All Departments</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>

            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer"
            >
              <option value="All">All Semesters</option>
              {SEMESTERS.map((sem) => (
                <option key={sem} value={sem}>
                  {sem}
                </option>
              ))}
            </select>

            {/* Search input */}
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                placeholder="Search student, roll no, or query..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="p-1 text-slate-400 hover:text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Query List */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-600">Loading student queries & messages...</p>
        </div>
      ) : queries.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <MessageSquare className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Student Queries Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {search || selectedStatus !== 'All' || selectedDepartment !== 'All' || selectedSemester !== 'All'
              ? 'No queries match your active filters or search terms. Try clearing your search.'
              : 'Students have not submitted any profile change queries or messages yet. When a student submits a query, it will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {queries.map((query) => {
            const isPending = query.status === 'Pending';
            const isReviewed = query.status === 'Reviewed';
            const isResolved = query.status === 'Resolved';

            return (
              <div
                key={query._id}
                className={`bg-white rounded-3xl border transition-all shadow-xs overflow-hidden ${
                  isPending
                    ? 'border-amber-200 ring-1 ring-amber-100 hover:border-amber-300'
                    : isReviewed
                    ? 'border-indigo-200 ring-1 ring-indigo-50 hover:border-indigo-300'
                    : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div className="p-5 sm:p-6 space-y-4">
                  {/* Top Header: Student Info & Badges */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-extrabold text-base flex items-center justify-center shrink-0 shadow-md shadow-indigo-100">
                        {query.studentName?.charAt(0)?.toUpperCase() || 'S'}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900">{query.studentName}</h3>
                          <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold border border-slate-200">
                            {query.rollNumber}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {query.department} • <span className="font-semibold text-slate-600">{query.semester}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 self-start sm:self-auto">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDate(query.createdAt)}</span>
                      </span>

                      {/* Status Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${
                          isPending
                            ? 'bg-amber-50 text-amber-700 border-amber-300/80'
                            : isReviewed
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-300/80'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-300/80'
                        }`}
                      >
                        {isPending && <Clock className="w-3 h-3 text-amber-600" />}
                        {isReviewed && <Eye className="w-3 h-3 text-indigo-600" />}
                        {isResolved && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        <span>{query.status}</span>
                      </span>
                    </div>
                  </div>

                  {/* Student Contact Bar */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 bg-slate-50/80 px-3.5 py-2 rounded-xl border border-slate-100">
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-indigo-500" />
                      <a href={`mailto:${query.email}`} className="hover:underline font-medium text-slate-700">
                        {query.email || 'No email registered'}
                      </a>
                    </span>
                    {query.phone && (
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-500" />
                        <a href={`tel:${query.phone}`} className="hover:underline font-mono font-medium text-slate-700">
                          {query.phone}
                        </a>
                      </span>
                    )}
                  </div>

                  {/* Query Core Details: Field to change, Requested Change, Reason */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* What to change */}
                    <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/80 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Edit2 className="w-3 h-3 text-indigo-600" />
                          <span>Field: {query.fieldToChange}</span>
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800">
                          Requested Change
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-900 bg-white p-2.5 rounded-xl border border-indigo-100">
                        {query.requestedChange}
                      </p>
                    </div>

                    {/* Why to change (Reason) */}
                    <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100/80 space-y-1.5">
                      <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                        <AlertCircle className="w-3 h-3 text-amber-600" />
                        <span>Reason for Request</span>
                      </span>
                      <p className="text-sm font-medium text-slate-800 bg-white p-2.5 rounded-xl border border-amber-100 leading-relaxed">
                        {query.reason}
                      </p>
                    </div>
                  </div>

                  {/* Optional message if provided */}
                  {query.message && (
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600">
                      <span className="font-bold text-slate-700 mr-1.5">Additional Note from Student:</span>
                      <span>{query.message}</span>
                    </div>
                  )}

                  {/* Admin Reply / Status Note Box */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Admin Response Note (Visible to Student)</span>
                      </span>
                      {query.adminResponse && (
                        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          Note Saved
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Type a confirmation or response note for the student..."
                        value={
                          replyDrafts[query._id] !== undefined
                            ? replyDrafts[query._id]
                            : query.adminResponse || ''
                        }
                        onChange={(e) =>
                          setReplyDrafts({ ...replyDrafts, [query._id]: e.target.value })
                        }
                        className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                      />
                      <button
                        onClick={() => handleSaveAdminReply(query._id)}
                        disabled={savingReplyId === query._id}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95 shadow-xs"
                      >
                        <Send className="w-3 h-3" />
                        <span>{savingReplyId === query._id ? 'Saving...' : 'Send Note'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Admin Actions Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                    {/* Quick status updates */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider hidden sm:inline">
                        Update Status:
                      </span>

                      {query.status !== 'Reviewed' && (
                        <button
                          onClick={() => handleStatusChange(query._id, 'Reviewed')}
                          disabled={statusUpdatingId === query._id}
                          className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all border border-indigo-200/80 cursor-pointer active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Mark Reviewed</span>
                        </button>
                      )}

                      {query.status !== 'Resolved' && (
                        <button
                          onClick={() => handleStatusChange(query._id, 'Resolved')}
                          disabled={statusUpdatingId === query._id}
                          className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-all border border-emerald-200/80 cursor-pointer active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <Check className="w-3 h-3" />
                          <span>Mark Resolved</span>
                        </button>
                      )}

                      {query.status !== 'Pending' && (
                        <button
                          onClick={() => handleStatusChange(query._id, 'Pending')}
                          disabled={statusUpdatingId === query._id}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-200 cursor-pointer active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <Clock className="w-3 h-3" />
                          <span>Mark Pending</span>
                        </button>
                      )}
                    </div>

                    {/* Right action buttons: Edit Student Profile & Delete Message */}
                    <div className="flex items-center gap-2">
                      {/* Direct Edit Student Profile Button */}
                      <button
                        onClick={() => handleOpenEditStudent(query)}
                        className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer active:scale-95"
                        title="Directly edit and update this student's profile details"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Edit Student Profile</span>
                      </button>

                      {/* Delete Message Button */}
                      <button
                        onClick={() => setQueryToDelete(query)}
                        className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-200 transition-all cursor-pointer active:scale-95"
                        title="Delete query message"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!queryToDelete}
        title="Delete Student Query?"
        message={`Are you sure you want to permanently delete the profile query from ${queryToDelete?.studentName} (${queryToDelete?.rollNumber})? This message will be removed from database.`}
        confirmText={isDeleting ? 'Deleting...' : 'Delete Query'}
        onConfirm={handleDeleteQuery}
        onCancel={() => setQueryToDelete(null)}
        isDanger={true}
      />

      {/* Quick Edit Student Profile Modal */}
      {editModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-6 sm:p-7 border border-slate-100 my-8">
            <button
              onClick={() => {
                setEditModalStudent(null);
                setEditModalQuery(null);
              }}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3.5 mb-5 pb-4 border-b border-slate-100">
              <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                <Edit2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Update Student Profile</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Making requested profile changes for {editFormData.name} ({editFormData.rollNumber})
                </p>
              </div>
            </div>

            {/* Display reminder of what the student requested */}
            {editModalQuery && (
              <div className="mb-5 p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200/90 text-xs space-y-1.5">
                <div className="flex items-center justify-between font-bold text-indigo-900">
                  <span>Student's Requested Change ({editModalQuery.fieldToChange}):</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-200 text-indigo-800">
                    From Query
                  </span>
                </div>
                <p className="font-semibold text-slate-900 bg-white p-2 rounded-xl border border-indigo-100">
                  "{editModalQuery.requestedChange}"
                </p>
                <p className="text-slate-600">
                  <strong>Reason:</strong> {editModalQuery.reason}
                </p>
              </div>
            )}

            {editError && (
              <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-medium">{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveStudentProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* First Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.firstName}
                    onChange={(e) => {
                      const fVal = e.target.value;
                      setEditFormData({
                        ...editFormData,
                        firstName: fVal,
                        name: `${fVal} ${editFormData.lastName}`.trim(),
                      });
                    }}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                  />
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={editFormData.lastName}
                    onChange={(e) => {
                      const lVal = e.target.value;
                      setEditFormData({
                        ...editFormData,
                        lastName: lVal,
                        name: `${editFormData.firstName} ${lVal}`.trim(),
                      });
                    }}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                  />
                </div>

                {/* Roll Number (Locked / Permanent) */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Roll Number (Read-only)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={editFormData.rollNumber}
                    className="w-full px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-600 cursor-not-allowed"
                  />
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-indigo-600" />
                    <span>Date of Birth (YYYY-MM-DD)</span>
                  </label>
                  <input
                    type="date"
                    value={editFormData.dob}
                    onChange={(e) => setEditFormData({ ...editFormData, dob: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                  />
                </div>

                {/* Academic Department */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <GraduationCap className="w-3 h-3 text-indigo-600" />
                    <span>Department</span>
                  </label>
                  <select
                    value={editFormData.department}
                    onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Current Semester */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Semester
                  </label>
                  <select
                    value={editFormData.semester}
                    onChange={(e) => setEditFormData({ ...editFormData, semester: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer"
                  >
                    {SEMESTERS.map((sem) => (
                      <option key={sem} value={sem}>
                        {sem}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Contact Phone */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-indigo-600" />
                    <span>Contact Phone</span>
                  </label>
                  <input
                    type="tel"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    placeholder="+91 9876543210"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-indigo-600" />
                    <span>Email Address</span>
                  </label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Gender
                  </label>
                  <select
                    value={editFormData.gender}
                    onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Blood Group */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <HeartPulse className="w-3 h-3 text-rose-500" />
                    <span>Blood Group</span>
                  </label>
                  <select
                    value={editFormData.bloodGroup}
                    onChange={(e) => setEditFormData({ ...editFormData, bloodGroup: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer"
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

                {/* Guardian Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Users className="w-3 h-3 text-indigo-600" />
                    <span>Parent / Guardian Name</span>
                  </label>
                  <input
                    type="text"
                    value={editFormData.guardianName}
                    onChange={(e) => setEditFormData({ ...editFormData, guardianName: e.target.value })}
                    placeholder="Father/Mother/Guardian"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                  />
                </div>

                {/* Guardian Phone */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-indigo-600" />
                    <span>Guardian Phone</span>
                  </label>
                  <input
                    type="tel"
                    value={editFormData.guardianPhone}
                    onChange={(e) => setEditFormData({ ...editFormData, guardianPhone: e.target.value })}
                    placeholder="+91 9876543210"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                  />
                </div>

                {/* Address */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-indigo-600" />
                    <span>Residential Address</span>
                  </label>
                  <textarea
                    rows={2}
                    value={editFormData.address}
                    onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                    placeholder="Enter permanent or current residential address..."
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setEditModalStudent(null);
                    setEditModalQuery(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {editSaving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Save Profile & Resolve Query</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentQueriesView;
