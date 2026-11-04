import React, { useState, useEffect } from 'react';
import {
  CalendarClock,
  Plus,
  Clock,
  MapPin,
  Edit2,
  Trash2,
  Calendar,
  X,
  AlertCircle,
  ClipboardList,
  Sparkles,
} from 'lucide-react';
import axiosClient from '../api/axiosClient';
import ConfirmModal from '../components/ConfirmModal';

const getLocalDateString = (d = new Date()) => {
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseTimeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const clean = timeStr.trim();
  const match = clean.match(/^(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?$/);
  if (!match) return 0;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const modifier = match[3] ? match[3].toUpperCase() : null;

  if (modifier === 'PM' && hours < 12) {
    hours += 12;
  } else if (modifier === 'AM' && hours === 12) {
    hours = 0;
  }

  return hours * 60 + minutes;
};

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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

export const TimetableView = ({ showToast, setActiveView, setSelectedAttendanceSession }) => {
  // Current day helper
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const [selectedDay, setSelectedDay] = useState(
    DAYS_OF_WEEK.includes(todayName) ? todayName : 'Monday'
  );
  const [slots, setSlots] = useState([]);
  const [dbSubjects, setDbSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [formData, setFormData] = useState({
    dayOfWeek: 'Monday',
    startTime: '09:00 AM',
    endTime: '10:00 AM',
    subject: '',
    semester: 'Semester 4',
    roomNumber: 'Room 101',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Delete Target State
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    fetchTimetable();
    fetchSubjectsFromDB();
  }, []);

  const fetchSubjectsFromDB = async () => {
    try {
      const res = await axiosClient.get('/subjects');
      if (res.data.success && res.data.data) {
        setDbSubjects(res.data.data.map((s) => s.name));
      }
    } catch (err) {
      console.warn('Could not load subjects for timetable dropdown:', err);
    }
  };

  const fetchTimetable = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get('/timetable');
      if (res.data.success) {
        setSlots(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching timetable:', err);
      showToast?.({ message: 'Failed to load timetable', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = (day) => {
    setEditingSlot(null);
    setFormData({
      dayOfWeek: day || selectedDay,
      startTime: '09:00 AM',
      endTime: '10:00 AM',
      subject: '',
      semester: 'Semester 4',
      roomNumber: 'Room 101',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (slot) => {
    setEditingSlot(slot);
    setFormData({
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      subject: slot.subject,
      semester: slot.semester || 'Semester 4',
      roomNumber: slot.roomNumber || 'Room 101',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.subject.trim() || !formData.startTime.trim() || !formData.endTime.trim()) {
      setFormError('Subject, Start Time, and End Time are required.');
      return;
    }

    try {
      setSubmitting(true);
      if (editingSlot) {
        const res = await axiosClient.put(`/timetable/${editingSlot._id}`, formData);
        if (res.data.success) {
          showToast?.({ message: 'Timetable class slot updated', type: 'success' });
          setIsModalOpen(false);
          fetchTimetable();
        }
      } else {
        const res = await axiosClient.post('/timetable', formData);
        if (res.data.success) {
          showToast?.({ message: 'New class slot added to timetable', type: 'success' });
          setIsModalOpen(false);
          fetchTimetable();
        }
      }
    } catch (err) {
      console.error('Error saving timetable slot:', err);
      setFormError(err.response?.data?.message || 'Failed to save timetable slot.');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await axiosClient.delete(`/timetable/${deleteTarget._id}`);
      if (res.data.success) {
        showToast?.({ message: 'Timetable slot removed', type: 'info' });
        setDeleteTarget(null);
        fetchTimetable();
      }
    } catch (err) {
      console.error('Error deleting timetable slot:', err);
      showToast?.({ message: 'Failed to delete timetable slot', type: 'error' });
    }
  };

  const handleTakeAttendance = (slot) => {
    if (setSelectedAttendanceSession) {
      setSelectedAttendanceSession({
        subject: slot.subject,
        semester: slot.semester,
        date: getLocalDateString(),
      });
    }
    setActiveView('attendance');
  };

  // Group slots by day and sort chronologically
  const daySlots = [...slots.filter((s) => s.dayOfWeek === selectedDay)].sort(
    (a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime)
  );

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100/80 text-xs font-bold text-indigo-700 mb-2">
            <CalendarClock className="w-3.5 h-3.5" />
            <span>Academic Routine</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Timetable & Lecture Schedule
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure weekly periods, lecture timings, halls, and academic semesters
          </p>
        </div>

        <button
          onClick={() => openAddModal(selectedDay)}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 hover:from-indigo-700 hover:to-violet-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-500/20 transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>Add Class Slot</span>
        </button>
      </div>

      {/* Days of Week Tab Bar */}
      <div className="flex overflow-x-auto gap-2 p-1.5 bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-xs">
        {DAYS_OF_WEEK.map((day) => {
          const isSelected = selectedDay === day;
          const isToday = day === todayName;
          const count = slots.filter((s) => s.dayOfWeek === day).length;

          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`flex-1 min-w-[120px] py-3 px-3 rounded-xl font-bold text-xs transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                isSelected
                  ? 'bg-slate-950 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span>{day}</span>
                {isToday && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Today" />
                )}
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full ${
                  isSelected ? 'bg-white/20 text-white font-bold' : 'bg-slate-200/60 text-slate-500'
                }`}
              >
                {count} {count === 1 ? 'Class' : 'Classes'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Schedule for Selected Day */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>{selectedDay} Schedule</span>
              {selectedDay === todayName && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                  Today's Active Schedule
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {daySlots.length} lecture period{daySlots.length === 1 ? '' : 's'} scheduled for this day
            </p>
          </div>

          <button
            onClick={() => openAddModal(selectedDay)}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Slot for {selectedDay}</span>
          </button>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-500">Loading schedule...</p>
          </div>
        ) : daySlots.length === 0 ? (
          <div className="py-20 text-center rounded-3xl bg-slate-50/70 border border-dashed border-slate-200">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-800">No classes scheduled for {selectedDay}</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              There are no class periods recorded on {selectedDay}. Click below to schedule a lecture.
            </p>
            <button
              onClick={() => openAddModal(selectedDay)}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              Add Class Slot
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {daySlots.map((slot) => (
              <div
                key={slot._id}
                className="group p-5 rounded-3xl border border-slate-200/90 hover:border-indigo-200 bg-slate-50/40 hover:bg-white hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{slot.startTime} - {slot.endTime}</span>
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-slate-200/70 text-slate-700 text-[10px] font-bold">
                      {slot.semester}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug">
                    {slot.subject}
                  </h4>

                  <div className="flex items-center gap-1.5 mt-2.5 text-xs text-slate-500 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{slot.roomNumber || 'Room 101'}</span>
                  </div>
                </div>

                <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => handleTakeAttendance(slot)}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                  >
                    <ClipboardList className="w-3.5 h-3.5" />
                    <span>Take Attendance</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(slot)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Edit Slot"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(slot)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete Slot"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Timetable Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border border-slate-100">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3.5 mb-6">
              <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                <CalendarClock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingSlot ? 'Edit Class Slot' : 'Add Class Slot'}
                </h3>
                <p className="text-xs text-slate-500">
                  Define day, period timing, subject, and classroom
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
                  Day of the Week *
                </label>
                <select
                  value={formData.dayOfWeek}
                  onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 cursor-pointer"
                >
                  {DAYS_OF_WEEK.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Subject / Course Name *</span>
                  <span className="text-[10px] text-indigo-600 font-semibold">Active Database Courses</span>
                </label>
                <input
                  type="text"
                  required
                  list="db-subject-list"
                  placeholder="Select or enter subject (e.g. Operating Systems)"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
                <datalist id="db-subject-list">
                  {dbSubjects.map((s, i) => (
                    <option key={i} value={s} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Start Time *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 09:00 AM"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    End Time *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 10:00 AM"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
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
                    {SEMESTERS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Room / Lab
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Lab 301 / Hall 2"
                    value={formData.roomNumber}
                    onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
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
                  {submitting ? 'Saving...' : editingSlot ? 'Update Slot' : 'Add Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Timetable Slot"
        message={`Are you sure you want to remove the "${deleteTarget?.subject}" slot (${deleteTarget?.dayOfWeek}, ${deleteTarget?.startTime} - ${deleteTarget?.endTime})?`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmText="Confirm Delete"
      />
    </div>
  );
};

export default TimetableView;
