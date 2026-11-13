import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  Filter,
  Calendar,
  Users,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  BookOpen,
  Building2,
  ShieldAlert,
  GraduationCap,
  Sparkles,
  Layers,
  Clock,
  Printer,
  Eye,
  Palette,
  Check,
  X,
  FileText,
  Award,
  Stamp,
} from 'lucide-react';
import axiosClient from '../api/axiosClient';
import SnitLogo from '../components/SnitLogo';

// Theme Configurations for Downloaded and Printable Reports
const REPORT_THEMES = {
  navy: {
    id: 'navy',
    name: 'Royal Navy',
    subtitle: 'Classic Institutional',
    primaryColor: '#1e3a8a',
    accentColor: '#3b82f6',
    headerBg: 'bg-slate-900',
    bannerGradient: 'from-blue-900 via-slate-900 to-indigo-950',
    badge: 'bg-blue-100 text-blue-900 border-blue-200',
    accentText: 'text-blue-600',
    cardBorder: 'border-blue-200',
    cardBg: 'bg-blue-50/40',
    btnGradient: 'from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800',
    highlightBorder: 'border-blue-500',
    swatch: 'bg-blue-800',
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Campus',
    subtitle: 'Modern Collegiate',
    primaryColor: '#065f46',
    accentColor: '#10b981',
    headerBg: 'bg-emerald-950',
    bannerGradient: 'from-emerald-950 via-teal-950 to-slate-950',
    badge: 'bg-emerald-100 text-emerald-900 border-emerald-200',
    accentText: 'text-emerald-600',
    cardBorder: 'border-emerald-200',
    cardBg: 'bg-emerald-50/40',
    btnGradient: 'from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800',
    highlightBorder: 'border-emerald-500',
    swatch: 'bg-emerald-700',
  },
  crimson: {
    id: 'crimson',
    name: 'Crimson Crest',
    subtitle: 'Prestigious Academic',
    primaryColor: '#881337',
    accentColor: '#e11d48',
    headerBg: 'bg-rose-950',
    bannerGradient: 'from-rose-950 via-stone-900 to-slate-950',
    badge: 'bg-rose-100 text-rose-900 border-rose-200',
    accentText: 'text-rose-600',
    cardBorder: 'border-rose-200',
    cardBg: 'bg-rose-50/40',
    btnGradient: 'from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800',
    highlightBorder: 'border-rose-500',
    swatch: 'bg-rose-800',
  },
  obsidian: {
    id: 'obsidian',
    name: 'Midnight Obsidian',
    subtitle: 'Executive Contrast',
    primaryColor: '#0f172a',
    accentColor: '#6366f1',
    headerBg: 'bg-slate-950',
    bannerGradient: 'from-slate-950 via-slate-900 to-slate-950',
    badge: 'bg-indigo-100 text-indigo-950 border-indigo-200',
    accentText: 'text-indigo-600',
    cardBorder: 'border-slate-300',
    cardBg: 'bg-slate-100/60',
    btnGradient: 'from-indigo-600 to-violet-700 hover:from-indigo-700 hover:to-violet-800',
    highlightBorder: 'border-indigo-500',
    swatch: 'bg-slate-900',
  },
};

export const ReportsView = ({ showToast }) => {
  // Theme state
  const [selectedTheme, setSelectedTheme] = useState('navy');

  // Filter states
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedSemester, setSelectedSemester] = useState('All');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [reportType, setReportType] = useState('all'); // 'all' | 'defaulters' | 'eligible'
  const [minAttendance, setMinAttendance] = useState(75);

  // Dynamic filter options from DB
  const [filterOptions, setFilterOptions] = useState({
    years: ['2026', '2025', '2024', '2023', '2022'],
    departments: ['Computer Science & Engineering', 'Information Technology'],
    semesters: [
      'Semester 1',
      'Semester 2',
      'Semester 3',
      'Semester 4',
      'Semester 5',
      'Semester 6',
      'Semester 7',
      'Semester 8',
    ],
    subjects: [],
  });

  // Preview data states
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    matchedStudents: 0,
    totalSessions: 0,
    overallAvg: 0,
    defaultersCount: 0,
    eligibleCount: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Report Preview Modal state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const currentTheme = REPORT_THEMES[selectedTheme] || REPORT_THEMES.navy;

  const fetchFilterOptions = useCallback(async () => {
    try {
      const res = await axiosClient.get('/reports/filters');
      if (res.data?.success && res.data?.data) {
        setFilterOptions(res.data.data);
        if (res.data.data.years && res.data.data.years.length > 0) {
          const currentYearStr = String(new Date().getFullYear());
          if (res.data.data.years.includes(currentYearStr)) {
            setSelectedYear(currentYearStr);
          } else {
            setSelectedYear(res.data.data.years[0]);
          }
        }
      }
    } catch (err) {
      console.warn('Could not load dynamic report filters, fallback to defaults:', err);
    }
  }, []);

  const fetchReportPreview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/reports/preview', {
        params: {
          year: selectedYear,
          semester: selectedSemester,
          department: selectedDepartment,
          subject: selectedSubject,
          reportType: reportType,
          minAttendance: minAttendance,
        },
      });

      if (res.data?.success) {
        setStudents(res.data.students || []);
        setStats(
          res.data.stats || {
            totalStudents: 0,
            matchedStudents: 0,
            totalSessions: 0,
            overallAvg: 0,
            defaultersCount: 0,
            eligibleCount: 0,
          }
        );
      }
    } catch (err) {
      console.error('Failed to load report preview:', err);
      if (showToast) {
        showToast({
          message: 'Failed to load attendance preview from database.',
          type: 'error',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedSemester, selectedDepartment, selectedSubject, reportType, minAttendance, showToast]);

  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  useEffect(() => {
    fetchReportPreview();
  }, [fetchReportPreview]);

  // 1-Click Excel Download with newly styled layout & auto-filters
  const handleDownloadExcel = async () => {
    setDownloading(true);
    try {
      const response = await axiosClient.get('/reports/export-excel', {
        params: {
          year: selectedYear,
          semester: selectedSemester,
          department: selectedDepartment,
          subject: selectedSubject,
          reportType: reportType,
          minAttendance: minAttendance,
        },
        responseType: 'blob',
      });

      if (response.data && response.data.type === 'application/json') {
        const text = await response.data.text();
        const json = JSON.parse(text);
        throw new Error(json.message || 'Excel export failed on server');
      }

      let filename = `Attendance_Report_${selectedYear}_${selectedSemester}.xlsx`;
      const disposition = response.headers['content-disposition'];
      if (disposition && disposition.indexOf('filename=') !== -1) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      if (showToast) {
        showToast({
          message: `📊 Excel report "${filename}" downloaded successfully with executive formatting & auto-filters!`,
          type: 'success',
        });
      }
    } catch (err) {
      console.error('Excel export failed:', err);
      let errorMsg = err.message || 'Error downloading Excel report. Please try again.';
      if (err.response?.data instanceof Blob && err.response.data.type?.includes('json')) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          if (parsed.message) errorMsg = parsed.message;
        } catch {
          // ignore parsing error
        }
      }
      if (showToast) {
        showToast({
          message: errorMsg,
          type: 'error',
        });
      }
    } finally {
      setDownloading(false);
    }
  };

  // Filter students by local search query
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const q = searchTerm.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.rollNumber.toLowerCase().includes(q) ||
        (s.registrationId && s.registrationId.toLowerCase().includes(q))
      );
    });
  }, [students, searchTerm]);

  // Stable audit code & generation date for preview rendering
  const auditReportCode = useMemo(() => {
    const seed = stats.matchedStudents + stats.totalSessions + (selectedYear !== 'All' ? parseInt(selectedYear) || 2026 : 2026);
    return `SNITN/ATT/${selectedYear}/AUDIT-${1000 + (seed % 9000)}`;
  }, [selectedYear, stats.matchedStudents, stats.totalSessions]);

  const [auditGeneratedDate] = useState(() => new Date().toLocaleDateString('en-IN'));

  // Generates standalone, themed HTML document string
  const generateThemedHtmlContent = useCallback(
    (themeKey = selectedTheme) => {
      const theme = REPORT_THEMES[themeKey] || REPORT_THEMES.navy;
      const genTimestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      const reportId = `SNITN/ATT/${selectedYear || 'AUDIT'}/${Math.floor(1000 + Math.random() * 9000)}`;

      // Palette CSS mapping
      const themeStyles = {
        navy: {
          primary: '#1e3a8a',
          primaryDark: '#0f172a',
          accent: '#3b82f6',
          bgHeader: '#0f172a',
          bgLight: '#f8fafc',
          border: '#cbd5e1',
          pillEligible: '#dcfce7; color: #15803d; border-color: #86efac;',
          pillWarning: '#fef3c7; color: #b45309; border-color: #fde68a;',
          pillDefaulter: '#fee2e2; color: #b91c1c; border-color: #fca5a5;',
        },
        emerald: {
          primary: '#065f46',
          primaryDark: '#022c22',
          accent: '#10b981',
          bgHeader: '#064e3b',
          bgLight: '#f0fdf4',
          border: '#a7f3d0',
          pillEligible: '#dcfce7; color: #047857; border-color: #6ee7b7;',
          pillWarning: '#fef3c7; color: #b45309; border-color: #fde68a;',
          pillDefaulter: '#fee2e2; color: #b91c1c; border-color: #fca5a5;',
        },
        crimson: {
          primary: '#881337',
          primaryDark: '#4c0519',
          accent: '#e11d48',
          bgHeader: '#4c0519',
          bgLight: '#fff1f2',
          border: '#fecdd3',
          pillEligible: '#dcfce7; color: #15803d; border-color: #86efac;',
          pillWarning: '#fef3c7; color: #b45309; border-color: #fde68a;',
          pillDefaulter: '#ffe4e6; color: #9f1239; border-color: #fda4af;',
        },
        obsidian: {
          primary: '#0f172a',
          primaryDark: '#020617',
          accent: '#6366f1',
          bgHeader: '#090d16',
          bgLight: '#f8fafc',
          border: '#cbd5e1',
          pillEligible: '#dcfce7; color: #166534; border-color: #86efac;',
          pillWarning: '#fef3c7; color: #92400e; border-color: #fde68a;',
          pillDefaulter: '#fee2e2; color: #991b1b; border-color: #fca5a5;',
        },
      }[themeKey] || {
        primary: '#1e3a8a',
        primaryDark: '#0f172a',
        accent: '#3b82f6',
        bgHeader: '#0f172a',
        bgLight: '#f8fafc',
        border: '#cbd5e1',
        pillEligible: '#dcfce7; color: #15803d; border-color: #86efac;',
        pillWarning: '#fef3c7; color: #b45309; border-color: #fde68a;',
        pillDefaulter: '#fee2e2; color: #b91c1c; border-color: #fca5a5;',
      };

      const rowsHtml = filteredStudents
        .map((s, idx) => {
          const hasClasses = s.totalClasses > 0;
          const isEligible = hasClasses && s.percentage >= minAttendance;
          const isWarning = hasClasses && s.percentage >= 60 && s.percentage < minAttendance;

          let pillStyle = themeStyles.pillDefaulter;
          let statusText = 'Defaulter';

          if (!hasClasses) {
            pillStyle = 'background: #f1f5f9; color: #64748b; border-color: #cbd5e1;';
            statusText = 'No Classes';
          } else if (isEligible) {
            pillStyle = `background: ${themeStyles.pillEligible}`;
            statusText = 'Eligible';
          } else if (isWarning) {
            pillStyle = `background: ${themeStyles.pillWarning}`;
            statusText = 'Warning';
          } else {
            pillStyle = `background: ${themeStyles.pillDefaulter}`;
            statusText = 'Defaulter';
          }

          const progressColor = isEligible ? '#10b981' : isWarning ? '#f59e0b' : '#ef4444';

          return `
          <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
            <td style="padding: 8px 10px; color: #64748b; font-weight: 500;">${idx + 1}</td>
            <td style="padding: 8px 10px; font-family: monospace; font-weight: 700; color: #0f172a;">${s.rollNumber}</td>
            <td style="padding: 8px 10px; font-family: monospace; font-weight: 600; color: ${themeStyles.primary};">${s.registrationId}</td>
            <td style="padding: 8px 10px; font-weight: 700; color: #0f172a;">${s.name}</td>
            <td style="padding: 8px 10px; color: #475569;">${s.department}</td>
            <td style="padding: 8px 10px; color: #475569;">${s.semester}</td>
            <td style="padding: 8px 10px; text-align: center; font-weight: 600;">${s.totalClasses}</td>
            <td style="padding: 8px 10px; text-align: center; font-weight: 700; color: #047857;">${s.attendedClasses}</td>
            <td style="padding: 8px 10px; text-align: center; font-weight: 600; color: #b91c1c;">${s.absentClasses}</td>
            <td style="padding: 8px 10px; text-align: center;">
              <div style="font-weight: 800; font-size: 11px; margin-bottom: 3px;">${hasClasses ? `${s.percentage}%` : 'N/A'}</div>
              <div style="background: #e2e8f0; height: 4px; border-radius: 999px; overflow: hidden; width: 60px; margin: 0 auto;">
                <div style="background: ${progressColor}; height: 100%; width: ${Math.min(s.percentage, 100)}%;"></div>
              </div>
            </td>
            <td style="padding: 8px 10px; text-align: center;">
              <span style="display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; border: 1px solid; ${pillStyle}">
                ${statusText}
              </span>
            </td>
            <td style="padding: 8px 10px; font-size: 10px; color: ${s.classesNeededFor75 > 0 ? '#b91c1c' : '#047857'}; font-weight: 600;">
              ${!hasClasses ? 'No sessions' : s.classesNeededFor75 > 0 ? `Shortfall: ${s.classesNeededFor75} lectures` : 'Compliant'}
            </td>
          </tr>`;
        })
        .join('');

      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Shrinathji Institute of Technology & Engineering (SNITN) - Official Attendance Audit Report - ${selectedYear} - ${selectedSemester}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap');
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f1f5f9;
      color: #0f172a;
      padding: 24px 12px;
      line-height: 1.4;
      -webkit-font-smoothing: antialiased;
    }

    .report-sheet {
      max-width: 1050px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.08);
      border: 1px solid #e2e8f0;
      overflow: hidden;
      position: relative;
    }

    /* Print-Only Controls bar */
    .controls-bar {
      max-width: 1050px;
      margin: 0 auto 16px auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 18px;
      background: #0f172a;
      border-radius: 12px;
      color: white;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      transition: all 0.2s ease;
      text-decoration: none;
    }
    .btn-print { background: ${themeStyles.accent}; color: white; }
    .btn-print:hover { opacity: 0.9; transform: translateY(-1px); }

    /* College Official Header */
    .header-band {
      background: ${themeStyles.bgHeader};
      color: white;
      padding: 28px 32px;
      position: relative;
      border-bottom: 4px solid ${themeStyles.accent};
    }

    .header-grid {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
    }

    .college-brand {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .crest {
      width: 60px;
      height: 60px;
      border-radius: 14px;
      background: rgba(255,255,255,0.12);
      border: 1px solid rgba(255,255,255,0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: 900;
      color: #38bdf8;
      letter-spacing: 1px;
    }

    .college-title h1 {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.02em;
      text-transform: uppercase;
      line-height: 1.2;
    }

    .college-title p {
      font-size: 12px;
      color: #94a3b8;
      margin-top: 4px;
      font-weight: 500;
    }

    .report-badge {
      text-align: right;
    }

    .report-tag {
      display: inline-block;
      padding: 4px 12px;
      background: rgba(255,255,255,0.15);
      border: 1px solid rgba(255,255,255,0.25);
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: #38bdf8;
    }

    .report-id {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: #cbd5e1;
      margin-top: 6px;
    }

    /* Metadata strip */
    .metadata-strip {
      background: ${themeStyles.bgLight};
      border-bottom: 1px solid ${themeStyles.border};
      padding: 14px 32px;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 16px;
      font-size: 12px;
    }

    .meta-item strong {
      color: ${themeStyles.primary};
      font-weight: 700;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.05em;
      display: block;
      margin-bottom: 2px;
    }

    .meta-item span {
      font-weight: 700;
      color: #0f172a;
    }

    /* KPI Summary Cards */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      padding: 24px 32px 14px 32px;
    }

    .kpi-card {
      border: 1px solid #e2e8f0;
      background: #ffffff;
      border-radius: 12px;
      padding: 14px 16px;
      border-left: 4px solid ${themeStyles.primary};
    }

    .kpi-card.kpi-emerald { border-left-color: #10b981; }
    .kpi-card.kpi-rose { border-left-color: #ef4444; }
    .kpi-card.kpi-blue { border-left-color: ${themeStyles.accent}; }

    .kpi-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
    }

    .kpi-val {
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 4px;
    }

    /* Table styling */
    .table-container {
      padding: 14px 32px 24px 32px;
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    thead th {
      background: #f8fafc;
      color: #475569;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 10px 10px;
      border-bottom: 2px solid #cbd5e1;
    }

    tbody tr:nth-child(even) {
      background: #f8fafc;
    }

    /* Regulatory Notice Box */
    .regulation-box {
      margin: 10px 32px 24px 32px;
      padding: 14px 18px;
      border-radius: 10px;
      background: #fffbeb;
      border: 1px solid #fde68a;
      font-size: 11px;
      color: #92400e;
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .regulation-box strong {
      font-weight: 800;
      display: block;
      margin-bottom: 2px;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.05em;
    }

    /* Signatures Section */
    .signatures-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
      padding: 30px 32px 34px 32px;
      border-top: 1px solid #e2e8f0;
      margin-top: 12px;
    }

    .sig-col {
      text-align: center;
    }

    .sig-line {
      height: 48px;
      border-bottom: 1px dashed #94a3b8;
      margin-bottom: 8px;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding-bottom: 4px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      color: #94a3b8;
    }

    .sig-title {
      font-size: 11px;
      font-weight: 700;
      color: #0f172a;
    }

    .sig-dept {
      font-size: 10px;
      color: #64748b;
    }

    /* Seal stamp graphic */
    .seal-stamp {
      width: 78px;
      height: 78px;
      border: 2px dashed ${themeStyles.primary};
      border-radius: 50%;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-size: 8px;
      font-weight: 800;
      color: ${themeStyles.primary};
      text-transform: uppercase;
      transform: rotate(-10deg);
      opacity: 0.75;
    }

    /* Watermark */
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 84px;
      font-weight: 900;
      color: rgba(15, 23, 42, 0.03);
      pointer-events: none;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      white-space: nowrap;
      z-index: 0;
    }

    /* Print media query */
    @media print {
      body {
        background: white;
        padding: 0;
      }
      .controls-bar {
        display: none !important;
      }
      .report-sheet {
        box-shadow: none !important;
        border: none !important;
        border-radius: 0 !important;
        max-width: 100% !important;
      }
      @page {
        size: A4 portrait;
        margin: 10mm;
      }
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>

  <!-- Screen Top Control Bar (Hidden on print) -->
  <div class="controls-bar">
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 12px; font-weight: 700;">Theme: <strong>${theme.name}</strong></span>
      <span style="font-size: 11px; color: #94a3b8;">• Ready for Official Submission & A4 Print</span>
    </div>
    <button class="btn btn-print" onclick="window.print()">
      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
      Print / Save as PDF
    </button>
  </div>

  <div class="report-sheet">
    <div class="watermark">SNITN NATHDWARA</div>

    <!-- Official College Banner -->
    <div class="header-band">
      <div class="header-grid">
        <div class="college-brand">
          <div class="crest">SNITN</div>
          <div class="college-title">
            <h1>Shrinathji Institute of Technology & Engineering</h1>
            <p>Shrinathji Institute of Technology, Nathdwara (SNITN) • Approved by AICTE, New Delhi • Affiliated to RTU</p>
          </div>
        </div>
        <div class="report-badge">
          <span class="report-tag">Institutional Compliance</span>
          <div class="report-id">${reportId}</div>
        </div>
      </div>
    </div>

    <!-- Metadata Strip -->
    <div class="metadata-strip">
      <div class="meta-item">
        <strong>Academic Year</strong>
        <span>Year ${selectedYear}</span>
      </div>
      <div class="meta-item">
        <strong>Semester</strong>
        <span>${selectedSemester}</span>
      </div>
      <div class="meta-item">
        <strong>Department</strong>
        <span>${selectedDepartment}</span>
      </div>
      <div class="meta-item">
        <strong>Subject Focus</strong>
        <span>${selectedSubject}</span>
      </div>
      <div class="meta-item">
        <strong>Statutory Min.</strong>
        <span>${minAttendance}% Required</span>
      </div>
      <div class="meta-item">
        <strong>Audit Date</strong>
        <span>${genTimestamp}</span>
      </div>
    </div>

    <!-- KPI Summary Grid -->
    <div class="kpi-grid">
      <div class="kpi-card kpi-blue">
        <div class="kpi-label">Total Enrolled</div>
        <div class="kpi-val">${stats.matchedStudents}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Sessions Conducted</div>
        <div class="kpi-val">${stats.totalSessions}</div>
      </div>
      <div class="kpi-card kpi-emerald">
        <div class="kpi-label">Institutional Avg.</div>
        <div class="kpi-val">${stats.overallAvg}%</div>
      </div>
      <div class="kpi-card kpi-rose">
        <div class="kpi-label">Defaulters (&lt;${minAttendance}%)</div>
        <div class="kpi-val">${stats.defaultersCount}</div>
      </div>
    </div>

    <!-- Student Attendance Roster Table -->
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Roll No</th>
            <th>Reg ID</th>
            <th>Student Name</th>
            <th>Department</th>
            <th>Sem</th>
            <th style="text-align: center;">Held</th>
            <th style="text-align: center;">Attended</th>
            <th style="text-align: center;">Absent</th>
            <th style="text-align: center;">Attendance %</th>
            <th style="text-align: center;">Compliance</th>
            <th>Academic Note</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>

    <!-- Statutory Notice Box -->
    <div class="regulation-box">
      <div style="font-size: 16px;">⚠️</div>
      <div>
        <strong>Statutory Notice & Academic Debarment Regulation (Ord. 12.4)</strong>
        <span>Candidates failing to achieve minimum <strong>${minAttendance}%</strong> attendance in theory & practical classes are ineligible for end-semester examinations without prior formal condonation by the Academic Council.</span>
      </div>
    </div>

    <!-- Signatures & Official College Stamp -->
    <div class="signatures-grid">
      <div class="sig-col">
        <div class="sig-line">Prepared & Verified</div>
        <div class="sig-title">Faculty In-Charge</div>
        <div class="sig-dept">Department of ${selectedDepartment === 'All' ? 'Engineering' : selectedDepartment}</div>
      </div>
      <div class="sig-col">
        <div class="seal-stamp">
          <div>★ SNITN ★</div>
          <div>NATHDWARA</div>
          <div>OFFICIAL AUDIT</div>
        </div>
      </div>
      <div class="sig-col">
        <div class="sig-line">Approved & Authorized</div>
        <div class="sig-title">Dean / Principal</div>
        <div class="sig-dept">Shrinathji Institute of Technology & Engg., Nathdwara</div>
      </div>
    </div>
  </div>

</body>
</html>`;
    },
    [filteredStudents, minAttendance, selectedDepartment, selectedSemester, selectedYear, selectedSubject, stats, selectedTheme]
  );

  // Download Standalone Themed HTML Report
  const handleDownloadHtml = () => {
    try {
      const htmlContent = generateThemedHtmlContent(selectedTheme);
      const filename = `Attendance_Report_${selectedTheme.toUpperCase()}_${selectedYear}_${selectedSemester.replace(
        /\s+/g,
        '_'
      )}_${Date.now()}.html`;
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      if (showToast) {
        showToast({
          message: `🎨 Downloaded themed HTML report "${filename}"! Open in any browser or print directly.`,
          type: 'success',
        });
      }
    } catch (err) {
      console.error('Error downloading HTML report:', err);
      if (showToast) {
        showToast({
          message: 'Failed to generate HTML report file.',
          type: 'error',
        });
      }
    }
  };

  // Open Direct Print Window
  const handlePrintReport = () => {
    try {
      const htmlContent = generateThemedHtmlContent(selectedTheme);
      const printWindow = window.open('', '_blank', 'width=1100,height=850');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 500);
      } else {
        window.print();
      }
    } catch (err) {
      console.error('Error opening print window:', err);
      window.print();
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Top Banner / Hero with Theme Accent */}
      <div
        className={`relative overflow-hidden rounded-3xl bg-gradient-to-r ${currentTheme.bannerGradient} border border-slate-800 p-7 md:p-8 text-white shadow-xl`}
      >
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold text-white border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Institutional Audit & Export Hub</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[11px] font-semibold text-slate-300">Theme: {currentTheme.name}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Attendance Reports & Downloads
            </h1>
            <p className="text-sm md:text-base text-slate-300 leading-relaxed">
              Export past and current attendance records in modern visual themes. Download Excel spreadsheets with
              auto-filters and KPI dashboards, or generate official institutional PDF documents.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 text-xs sm:text-sm font-bold shadow-lg transition-all hover:scale-102 active:scale-98 cursor-pointer"
              title="Preview and print official themed report"
            >
              <Eye className="w-4 h-4 text-indigo-600" />
              <span>Preview & Print PDF</span>
            </button>

            <button
              onClick={handleDownloadExcel}
              disabled={downloading}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r ${currentTheme.btnGradient} text-white text-xs sm:text-sm font-bold shadow-lg shadow-black/30 border border-white/20 transition-all hover:scale-102 active:scale-98 disabled:opacity-50 cursor-pointer`}
              title="Download formatted Excel (.xlsx) file"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{downloading ? 'Exporting...' : 'Export Excel (.xlsx)'}</span>
              <Download className="w-3.5 h-3.5 text-white/80" />
            </button>

            <button
              onClick={fetchReportPreview}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs sm:text-sm font-bold backdrop-blur-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Refresh report analytics"
            >
              <RefreshCw className={`w-4 h-4 text-white/90 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Decorative background glows */}
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -top-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Theme Selector Strip */}
      <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-slate-100 text-slate-800 border border-slate-200">
            <Palette className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Report Theme & Presentation Style</h3>
            <p className="text-xs text-slate-500">
              Select a visual palette for your downloaded documents, printable audits, and tables.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {Object.values(REPORT_THEMES).map((th) => {
            const isSelected = selectedTheme === th.id;
            return (
              <button
                key={th.id}
                onClick={() => {
                  setSelectedTheme(th.id);
                  if (showToast) {
                    showToast({
                      message: `Applied "${th.name}" theme for reports!`,
                      type: 'info',
                    });
                  }
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  isSelected
                    ? `${th.badge} shadow-xs scale-102 ring-2 ring-indigo-500/30`
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200/80'
                }`}
              >
                <span className={`w-3.5 h-3.5 rounded-full ${th.swatch} flex items-center justify-center shrink-0`}>
                  {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                </span>
                <span>{th.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Selection Panel */}
      <div className="bg-white rounded-3xl p-6 md:p-7 border border-slate-200/90 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-100">
              <Filter className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Report Parameters & Filter Criteria</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose past academic years, semesters, or departments to customize your report
              </p>
            </div>
          </div>

          <span className="hidden sm:inline-flex text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200/60">
            Total Sessions in DB: {stats.totalSessions}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Year Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              Academic Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer"
            >
              <option value="All">All Years (Cumulative)</option>
              {filterOptions.years.map((yr) => (
                <option key={yr} value={yr}>
                  Year {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Semester Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
              Semester
            </label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer"
            >
              <option value="All">All Semesters</option>
              {filterOptions.semesters.map((sem) => (
                <option key={sem} value={sem}>
                  {sem}
                </option>
              ))}
            </select>
          </div>

          {/* Department Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              Department
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer"
            >
              <option value="All">All Departments</option>
              {filterOptions.departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              Subject
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer"
            >
              <option value="All">All Subjects (Combined)</option>
              {filterOptions.subjects.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Report Type & Threshold Selection Bar */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Roster Filter:</span>
            <button
              onClick={() => setReportType('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                reportType === 'all'
                  ? 'bg-slate-950 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Students ({stats.totalStudents})
            </button>
            <button
              onClick={() => setReportType('defaulters')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                reportType === 'defaulters'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/60'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Below 75% ({stats.defaultersCount})</span>
            </button>
            <button
              onClick={() => setReportType('eligible')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                reportType === 'eligible'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/60'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Above 75% ({stats.eligibleCount})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Threshold:</span>
            <select
              value={minAttendance}
              onChange={(e) => setMinAttendance(Number(e.target.value))}
              className="px-3 py-1.5 text-xs font-bold bg-slate-100 border border-slate-200 rounded-xl text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value={75}>Min 75% (Mandatory Standard)</option>
              <option value={60}>Min 60% (Condonation Limit)</option>
              <option value={80}>Min 80% (Distinction)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Live Statistics Bento Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Students */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Students</p>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5">{stats.matchedStudents}</h3>
          </div>
        </div>

        {/* Classes Held */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {selectedSemester === 'All' ? 'Total Sessions' : 'Semester Classes'}
            </p>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5">{stats.totalSessions}</h3>
          </div>
        </div>

        {/* Overall Average */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Average Attendance</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-0.5">{stats.overallAvg}%</h3>
          </div>
        </div>

        {/* Defaulters Count */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Students Below {minAttendance}%</p>
            <h3 className="text-2xl font-black text-rose-600 mt-0.5">{stats.defaultersCount}</h3>
          </div>
        </div>
      </div>

      {/* Preview Table Header & Download Center */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-5 md:p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">Attendance Records Preview</h3>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${currentTheme.badge}`}>
                {currentTheme.name}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing preview for Academic Year {selectedYear} ({selectedSemester}) • Click any export button to
              download in your chosen theme
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search input */}
            <div className="relative w-full sm:w-56">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search student or roll..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>

            {/* Document Preview & Print Button */}
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all shadow-2xs shrink-0 cursor-pointer active:scale-95"
              title="Preview formatted official report document"
            >
              <Eye className="w-3.5 h-3.5 text-indigo-600" />
              <span>Official Preview</span>
            </button>

            {/* Save HTML Report */}
            <button
              onClick={handleDownloadHtml}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all shadow-2xs shrink-0 cursor-pointer active:scale-95"
              title="Download standalone styled HTML document"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Save HTML</span>
            </button>

            {/* Excel Download Button */}
            <button
              onClick={handleDownloadExcel}
              disabled={downloading}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r ${currentTheme.btnGradient} text-white text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer active:scale-95 disabled:opacity-50`}
              title="Download Excel Spreadsheet with auto-filters & KPI dashboard"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{downloading ? 'Exporting...' : 'Export Excel (.xlsx)'}</span>
              <Download className="w-3.5 h-3.5 text-white/90" />
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-16 text-center text-slate-500 flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-sm font-semibold">Calculating attendance metrics...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-16 text-center text-slate-500 space-y-2">
              <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="text-base font-bold text-slate-700">No Student Records Found</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No students or attendance records match the selected filter parameters. Try choosing "All Years" or a
                different semester.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">#</th>
                  <th className="py-3.5 px-4">Roll No</th>
                  <th className="py-3.5 px-4">Registration ID</th>
                  <th className="py-3.5 px-4">Student Name</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Semester</th>
                  <th className="py-3.5 px-4 text-center">Classes</th>
                  <th className="py-3.5 px-4 text-center">Present</th>
                  <th className="py-3.5 px-4 text-center">Absent</th>
                  <th className="py-3.5 px-4 text-center">Attendance %</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Academic Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredStudents.map((s, index) => {
                  const hasHeldClasses = s.totalClasses > 0;
                  const isEligible = hasHeldClasses && s.percentage >= minAttendance;
                  const isWarning = hasHeldClasses && s.percentage >= 60 && s.percentage < minAttendance;

                  return (
                    <tr key={s.studentId || index} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 text-slate-400 font-medium">{index + 1}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{s.rollNumber}</td>
                      <td className="py-3.5 px-4 font-mono text-indigo-600 font-semibold">{s.registrationId}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{s.name}</td>
                      <td className="py-3.5 px-4 text-slate-600 truncate max-w-[160px]">{s.department}</td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md font-semibold text-[11px] bg-slate-100 text-slate-700 border border-slate-200">
                          {s.semester}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-semibold text-slate-700">{s.totalClasses}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-emerald-700">{s.attendedClasses}</td>
                      <td className="py-3.5 px-4 text-center font-semibold text-rose-600">{s.absentClasses}</td>
                      <td className="py-3.5 px-4 text-center">
                        {!hasHeldClasses ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-bold text-xs bg-slate-100 text-slate-500 border border-slate-200">
                            N/A
                          </span>
                        ) : (
                          <div className="flex flex-col items-center">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-bold text-xs ${
                                isEligible
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : isWarning
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {s.percentage}%
                            </span>
                            <div className="w-14 h-1.5 rounded-full bg-slate-100 overflow-hidden mt-1">
                              <div
                                className={`h-full rounded-full ${
                                  isEligible ? 'bg-emerald-500' : isWarning ? 'bg-amber-500' : 'bg-rose-500'
                                }`}
                                style={{ width: `${Math.min(s.percentage, 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {!hasHeldClasses ? (
                          <span className="inline-flex items-center gap-1.5 text-slate-500 font-semibold">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>No Classes</span>
                          </span>
                        ) : isEligible ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Eligible</span>
                          </span>
                        ) : isWarning ? (
                          <span className="inline-flex items-center gap-1.5 text-amber-700 font-bold">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Warning</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-rose-700 font-bold">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Defaulter</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-500">
                        {!hasHeldClasses ? (
                          <span className="text-slate-400 text-[11px] font-medium">No sessions</span>
                        ) : s.classesNeededFor75 > 0 ? (
                          <span className="text-rose-600 text-[11px] font-semibold">
                            Needs {s.classesNeededFor75} classes for {minAttendance}%
                          </span>
                        ) : (
                          <span className="text-emerald-600 text-[11px] font-semibold">Compliant</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer info bar */}
        <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500">
          <div>
            Showing <span className="font-bold text-slate-700">{filteredStudents.length}</span> students across{' '}
            <span className="font-bold text-slate-700">{stats.totalSessions}</span> sessions{' '}
            {selectedSemester === 'All' && (
              <span className="text-slate-400 font-normal">(classes calculated per student's semester)</span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-semibold text-emerald-700">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Eligible (≥{minAttendance}%)
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-amber-700">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              Warning (60-{minAttendance - 1}%)
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-rose-700">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              Defaulter (&lt;60%)
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Official Themed Report Preview Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-5xl bg-slate-100 rounded-3xl shadow-2xl border border-slate-700/60 flex flex-col max-h-[95vh] overflow-hidden my-auto">
            {/* Modal Top Control Bar */}
            <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 shrink-0 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                  <Award className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">Official Attendance Audit Report</h3>
                  <p className="text-xs text-slate-400">
                    Live document preview styled with the <strong>{currentTheme.name}</strong> theme
                  </p>
                </div>
              </div>

              {/* Theme Selector within Modal */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 hidden sm:inline">Theme:</span>
                <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
                  {Object.values(REPORT_THEMES).map((th) => (
                    <button
                      key={th.id}
                      onClick={() => setSelectedTheme(th.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        selectedTheme === th.id
                          ? 'bg-white text-slate-950 shadow-xs'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${th.swatch}`} />
                      <span>{th.name.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintReport}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Save PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadHtml}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Save HTML</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Body (Physical Paper Simulation) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200/80 flex justify-center">
              <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden text-slate-900 relative">
                {/* Official College Header */}
                <div className={`${currentTheme.headerBg} text-white p-6 sm:p-8 relative border-b-4 border-amber-400`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <SnitLogo size={56} className="w-14 h-14" />
                      <div>
                        <h2 className="text-xl sm:text-2xl font-black tracking-tight uppercase leading-snug">
                          Shrinathji Institute of Technology & Engineering
                        </h2>
                        <p className="text-xs text-slate-300 font-medium">
                          Shrinathji Institute of Technology, Nathdwara (SNITN) • Approved by AICTE • Affiliated to RTU
                        </p>
                      </div>
                    </div>

                    <div className="sm:text-right">
                      <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-amber-300 text-[11px] font-bold uppercase tracking-wider border border-white/20">
                        Official Academic Audit
                      </span>
                      <p className="text-[11px] font-mono text-slate-300 mt-1">
                        {auditReportCode}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Metadata Strip */}
                <div className={`p-4 sm:px-8 border-b ${currentTheme.cardBorder} ${currentTheme.cardBg} flex flex-wrap items-center justify-between gap-3 text-xs`}>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Academic Session</span>
                    <span className="font-bold text-slate-900">Year {selectedYear}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Semester</span>
                    <span className="font-bold text-slate-900">{selectedSemester}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Department</span>
                    <span className="font-bold text-slate-900">{selectedDepartment}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Subject</span>
                    <span className="font-bold text-slate-900">{selectedSubject}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Min. Required</span>
                    <span className="font-bold text-emerald-700">{minAttendance}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Report Generated</span>
                    <span className="font-mono text-slate-700">{auditGeneratedDate}</span>
                  </div>
                </div>

                {/* KPI Metrics Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-6 sm:px-8 bg-slate-50/50 border-b border-slate-100">
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Students</span>
                    <p className="text-xl font-black text-slate-900">{stats.matchedStudents}</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Total Lectures</span>
                    <p className="text-xl font-black text-slate-900">{stats.totalSessions}</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Institute Avg.</span>
                    <p className="text-xl font-black text-emerald-600">{stats.overallAvg}%</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Defaulters</span>
                    <p className="text-xl font-black text-rose-600">{stats.defaultersCount}</p>
                  </div>
                </div>

                {/* Students Table */}
                <div className="p-6 sm:px-8 overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b-2 border-slate-200 text-[11px] uppercase font-bold text-slate-600 bg-slate-50">
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Roll No</th>
                        <th className="py-2.5 px-3">Reg ID</th>
                        <th className="py-2.5 px-3">Student Name</th>
                        <th className="py-2.5 px-3">Sem</th>
                        <th className="py-2.5 px-3 text-center">Attended / Held</th>
                        <th className="py-2.5 px-3 text-center">Attendance %</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStudents.slice(0, 50).map((s, idx) => {
                        const hasHeldClasses = s.totalClasses > 0;
                        const isEligible = hasHeldClasses && s.percentage >= minAttendance;
                        const isWarning = hasHeldClasses && s.percentage >= 60 && s.percentage < minAttendance;

                        return (
                          <tr key={s.studentId || idx} className="hover:bg-slate-50">
                            <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                            <td className="py-2 px-3 font-mono font-bold text-slate-900">{s.rollNumber}</td>
                            <td className="py-2 px-3 font-mono text-indigo-600 font-semibold">{s.registrationId}</td>
                            <td className="py-2 px-3 font-bold text-slate-800">{s.name}</td>
                            <td className="py-2 px-3 text-slate-600">{s.semester}</td>
                            <td className="py-2 px-3 text-center font-semibold">
                              {s.attendedClasses} / {s.totalClasses}
                            </td>
                            <td className="py-2 px-3 text-center font-bold">
                              {hasHeldClasses ? `${s.percentage}%` : 'N/A'}
                            </td>
                            <td className="py-2 px-3">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  !hasHeldClasses
                                    ? 'bg-slate-100 text-slate-600'
                                    : isEligible
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : isWarning
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {!hasHeldClasses ? 'No Classes' : isEligible ? 'Eligible' : isWarning ? 'Warning' : 'Defaulter'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right text-[11px] font-semibold text-slate-500">
                              {s.classesNeededFor75 > 0 ? (
                                <span className="text-rose-600">Needs {s.classesNeededFor75} classes</span>
                              ) : (
                                <span className="text-emerald-700">Clear</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {filteredStudents.length > 50 && (
                    <div className="py-3 text-center text-xs text-slate-400 italic">
                      + {filteredStudents.length - 50} more student records included in the full printable PDF and Excel export.
                    </div>
                  )}
                </div>

                {/* Debarment Notice Box */}
                <div className="mx-6 sm:mx-8 mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold uppercase tracking-wider text-[11px] block">
                      Statutory Examination Notice (Ordinance 12.4)
                    </span>
                    <p className="mt-0.5">
                      All students must maintain at least <strong>{minAttendance}%</strong> cumulative attendance to be
                      eligible for semester examinations. Students classified under the "Defaulter" category will be
                      debarred from appearing unless a formal condonation request is sanctioned.
                    </p>
                  </div>
                </div>

                {/* Signatures & Seal Section */}
                <div className="border-t border-slate-200 px-6 sm:px-8 py-6 bg-slate-50/50 flex flex-wrap items-center justify-between gap-6">
                  <div className="text-center sm:text-left">
                    <div className="h-10 border-b border-dashed border-slate-400 w-44" />
                    <p className="text-xs font-bold text-slate-900 mt-2">Faculty In-Charge</p>
                    <p className="text-[11px] text-slate-500">Academic Session Coordinator</p>
                  </div>

                  <div className="flex flex-col items-center justify-center p-3 rounded-full border-2 border-dashed border-indigo-400 text-indigo-700 text-[10px] font-extrabold uppercase w-24 h-24 rotate-[-12deg] opacity-75">
                    <Stamp className="w-4 h-4 mb-1" />
                    <span>SNITN AUDIT</span>
                    <span>NATHDWARA</span>
                  </div>

                  <div className="text-center sm:text-right">
                    <div className="h-10 border-b border-dashed border-slate-400 w-44 ml-auto" />
                    <p className="text-xs font-bold text-slate-900 mt-2">Principal / Dean</p>
                    <p className="text-[11px] text-slate-500">Shrinathji Institute of Technology & Engg., Nathdwara</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsView;
