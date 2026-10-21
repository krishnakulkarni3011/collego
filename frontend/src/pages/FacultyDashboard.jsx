import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, BookOpen, ClipboardCheck, ClipboardList, FileText,
  Megaphone, ChevronRight, GraduationCap, Users, BookMarked,
  BarChart3, FolderOpen, Plus, CheckCircle2, X, Send,
  ArrowLeft, Clock, Upload, Download, RefreshCw, Zap, Layers, Award,
  BookUser, Target, Settings, HelpCircle, CalendarDays
} from 'lucide-react'
import {
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { authService } from '../services/authService'
import api from '../services/api'
import { downloadFile } from '../lib/download'
import { SettingsTab } from '../components/dashboard/SettingsTab'
import { HelpTab } from '../components/dashboard/HelpTab'
import { InvigilationsTab } from '../components/dashboard/InvigilationsTab'
import { FacultyDirectoryTab } from '../components/dashboard/FacultyDirectoryTab'
import { cn } from '../lib/utils'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import {
  PortalSidebar, PortalTopbar, Toast, StatCard, Panel, PageTitle,
  WelcomeBanner, ChartTooltip, EmptyState, Spinner, ACCENTS, FadedImage, ImageStrip,
} from '../components/dashboard/PortalUI'
import { uiImages } from '../assets/uiImages'
import welcomeFaculty from '../assets/ui/welcome-faculty.webp'

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const fmtNum = (n, dp = 2) => (n == null ? '—' : Number(n).toFixed(dp))
const PIE_COLORS = ['#4f46e5', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']
const TARGET_YEAR_OPTIONS = [
  { value: '1', label: 'I Year' },
  { value: '2', label: 'II Year' },
  { value: '3', label: 'III Year' },
  { value: '4', label: 'Final Year' },
]
const targetYearLabel = (value) => TARGET_YEAR_OPTIONS.find(y => y.value === String(value))?.label || 'All Years'
const semesterYear = (semesterNumber) => {
  const number = Number(semesterNumber)
  return number >= 1 && number <= 8 ? Math.ceil(number / 2) : null
}
const SEMESTER_YEAR_MAP = [
  { semesters: 'Sem 1 & 2', year: 1 },
  { semesters: 'Sem 3 & 4', year: 2 },
  { semesters: 'Sem 5 & 6', year: 3 },
  { semesters: 'Sem 7 & 8', year: 4 },
]

function TargetYearField({ value, onChange }) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Target Year</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="collego-input">
        <option value="">Select year</option>
        {TARGET_YEAR_OPTIONS.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
      </select>
      <p className="text-[10px] text-slate-400 mt-1">Only students in this year will see it.</p>
    </div>
  )
}

function AttBadge({ pct }) {
  if (pct >= 75) return <Badge variant="success">{pct}%</Badge>
  if (pct >= 50) return <Badge variant="warning">{pct}%</Badge>
  return <Badge variant="destructive">{pct}%</Badge>
}

// ─── Nav config ──────────────────────────────────────────────────────────────
const GLOBAL_NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'subjectAssignments', label: 'My Subject Assignments', icon: BookUser },
  { id: 'questionPapers', label: 'Question Papers', icon: FileText },
  { id: 'facultyDirectory', label: 'Faculty Directory', icon: Users },
  { id: 'invigilations', label: 'Invigilation Duties', icon: CalendarDays },
  { id: 'notices', label: 'Notices', icon: Megaphone },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'help', label: 'Help & Support', icon: HelpCircle },
]

const SECTION_TABS = [
  { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
  { id: 'internalMarks', label: 'Internal Marks', icon: BookMarked },
  { id: 'semesterMarks', label: 'Semester Marks', icon: GraduationCap },
  { id: 'studentPerformance', label: 'Student Performance', icon: Users },
  { id: 'assignments', label: 'Assignments', icon: BookOpen },
  { id: 'assignmentMarks', label: 'Assignment Marks', icon: ClipboardList },
  { id: 'materials', label: 'Materials', icon: FolderOpen },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
]

// ─── Overview ────────────────────────────────────────────────────────────────
function OverviewTab({ sections, overviewData, onSectionSelect }) {
  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'

  return (
    <div className="space-y-8">
      <WelcomeBanner
        greeting={greeting}
        name="Professor"
        subtitle="Here's a summary of your teaching assignments and recent activity."
        quote="Teaching is the profession that creates all other professions"
        accent="violet"
        image={welcomeFaculty}
      />

      {overviewData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard index={0} label="Sections Assigned" value={overviewData.totalSections} icon={Layers} accent="violet" glow />
          <StatCard index={1} label="Total Students" value={overviewData.totalStudents} icon={Users} accent="blue" glow />
          <StatCard index={2} label="Unique Courses" value={overviewData.courses.length} icon={BookMarked} accent="emerald" glow />
          <StatCard index={3} label="Semesters" value={overviewData.semesters.length} icon={GraduationCap} accent="amber" glow />
        </div>
      )}

      <Panel title="My Teaching Sections" icon={BookOpen} accent="violet" bodyClassName="!flex-none" hover>
        {sections.length === 0 ? (
          <EmptyState icon={BookOpen} title="No sections assigned" accent="violet" description="Assign yourself a subject from My Subject Assignments to load your sections and students." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sections.map((sec, i) => (
              <motion.button
                key={sec.sectionId}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => onSectionSelect(sec)}
                className="text-left rounded-2xl p-5 border border-white/60 bg-white/70 backdrop-blur-sm hover:bg-white hover:border-indigo-300/70 hover:shadow-xl hover:shadow-indigo-500/10 transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-800 group-hover:text-violet-600 transition-colors leading-tight">{sec.courseName}</h4>
                    <p className="text-[10px] text-slate-400 font-mono mt-1">{sec.courseCode}</p>
                  </div>
                  <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-sm font-bold shadow-sm" style={{ background: `${PIE_COLORS[i % PIE_COLORS.length]}15`, color: PIE_COLORS[i % PIE_COLORS.length] }}>
                    {sec.sectionName}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                  <span className="flex items-center gap-1.5"><Users size={10} /> {sec.enrolledStudents} students</span>
                  <span>{sec.semesterName}</span>
                  <span>{sec.credits} credits</span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-white/60">
                  <div className="flex gap-1">
                    {SECTION_TABS.slice(0, 4).map(tab => {
                      const Icon = tab.icon
                      return <div key={tab.id} className="w-6 h-6 rounded-lg bg-white border border-white/60 flex items-center justify-center shadow-xs"><Icon size={10} className="text-slate-400" /></div>
                    })}
                  </div>
                  <span className="text-xs text-violet-600 group-hover:text-violet-700 transition-colors flex items-center gap-1 font-semibold">Manage <ChevronRight size={11} /></span>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Available Features" icon={Zap} accent="amber" hover>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { icon: ClipboardCheck, label: 'Mark Attendance', desc: 'Bulk per-session entry', accent: 'emerald' },
            { icon: BookMarked, label: 'Internal Marks', desc: 'IA-1, IA-2, IA-3 upload', accent: 'violet' },
            { icon: GraduationCap, label: 'Semester Marks', desc: 'Auto grade calculation', accent: 'blue' },
            { icon: Users, label: 'Student Performance', desc: 'Combined view per student', accent: 'emerald' },
            { icon: BookOpen, label: 'Assignments', desc: 'Create & track assignments', accent: 'amber' },
          ].map(f => {
            const Icon = f.icon
            const a = ACCENTS[f.accent]
            return (
              <div key={f.label} className="flex items-start gap-3 p-4 rounded-2xl border border-white/60 bg-white/70 backdrop-blur-sm hover:bg-white hover:border-indigo-300/70 transition-all group">
                <span className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', a.softBg, a.shadow)}>
                  <Icon size={16} className={a.text} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{f.label}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{f.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </Panel>

      <ImageStrip
        title="Teaching Moments"
        subtitle="Your classroom, your students, their progress."
        items={[
          { src: uiImages.classroom, label: 'In the classroom' },
          { src: uiImages.groupStudy, label: 'Collaborative learning' },
          { src: uiImages.graduation, label: 'The finish line' },
        ]}
      />
    </div>
  )
}

// ─── Section Header ──────────────────────────────────────────────────────────
function SectionHeader({ section, activeTab, onTabChange, onBack }) {
  const headerImage = {
    attendance: uiImages.classroom,
    internalMarks: uiImages.graduation,
    semesterMarks: uiImages.graduation,
    studentPerformance: uiImages.groupStudy,
    assignments: uiImages.groupStudy,
    materials: uiImages.library,
    analytics: uiImages.onlineLearning,
  }[activeTab]

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="p-2 rounded-xl text-slate-400 hover:text-violet-600 hover:bg-white/60 transition-all">
          <ArrowLeft size={15} />
        </button>
        <h2 className="text-lg font-bold text-slate-900">{section.courseName}</h2>
        <Badge variant="purple" className="text-[10px] px-2.5 py-0.5">{section.courseCode}</Badge>
        <p className="text-xs text-slate-400 ml-3 hidden sm:block">{section.sectionName} · {section.semesterName} · {section.enrolledStudents} students</p>
        {headerImage && (
          <div className="hidden md:block ml-auto h-12 w-44 shrink-0 opacity-75 pointer-events-none" aria-hidden="true">
            <FadedImage src={headerImage} alt="" className="h-full w-full" fade={24} />
          </div>
        )}
      </div>
      <div className="flex gap-1 bg-white border border-white/60 rounded-2xl p-1 backdrop-blur-sm overflow-x-auto scrollbar-hide">
        {SECTION_TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all',
                activeTab === tab.id ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/20' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              )}
            >
              <Icon size={12} /> {tab.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Attendance Tab ──────────────────────────────────────────────────────────
function AttendanceTab({ attendanceDate, setAttendanceDate, attendanceRecords, toggleAttendance, onSubmit, loading }) {
  const present = attendanceRecords.filter(r => r.status === 'PRESENT').length
  const absent = attendanceRecords.length - present
  const pct = attendanceRecords.length > 0 ? Math.round((present / attendanceRecords.length) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <input type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} className="collego-input !w-auto" />
        <Button variant="success" size="sm" onClick={() => attendanceRecords.forEach((_, i) => toggleAttendance(i, 'PRESENT'))} className="px-4">
          <CheckCircle2 size={13} /> All Present
        </Button>
        <Button variant="destructive" size="sm" onClick={() => attendanceRecords.forEach((_, i) => toggleAttendance(i, 'ABSENT'))} className="px-4">
          <X size={13} /> All Absent
        </Button>
        <div className="ml-auto flex items-center gap-3 text-xs">
          <span className="text-emerald-600 font-bold">{present} Present</span>
          <span className="text-red-500 font-bold">{absent} Absent</span>
          <span className="text-slate-400">/ {attendanceRecords.length} total</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { v: present, l: 'Present', c: 'text-emerald-600' },
          { v: absent, l: 'Absent', c: 'text-red-500' },
          { v: `${pct}%`, l: 'Attendance', c: pct >= 75 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500' },
        ].map(s => (
          <div key={s.l} className="glass-card p-4 text-center border border-white/60">
            <p className={cn('text-2xl font-bold', s.c)}>{s.v}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">{s.l}</p>
          </div>
        ))}
      </div>

      <div className="glass-card overflow-hidden border border-white/60">
        <div className="overflow-x-auto">
          <table className="collego-table">
            <thead><tr><th>#</th><th>Enrollment</th><th>Student Name</th><th style={{ textAlign: 'center' }}>Status</th></tr></thead>
            <tbody>
              {attendanceRecords.map((r, i) => (
                <tr key={r.studentId} className="hover:bg-white/30 transition-colors">
                  <td className="text-slate-400">{i + 1}</td>
                  <td><code className="text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded">{r.enrollmentNumber}</code></td>
                  <td className="text-slate-800 font-medium">{r.studentName}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => toggleAttendance(i)}
                      className={cn(
                        'px-4 py-1.5 rounded-xl text-xs font-bold transition-all border',
                        r.status === 'PRESENT'
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-red-50 text-red-500 border-red-200 hover:bg-red-100'
                      )}
                    >
                      {r.status === 'PRESENT' ? '✓ Present' : '✗ Absent'}
                    </button>
                  </td>
                </tr>
              ))}
              {attendanceRecords.length === 0 && <tr><td colSpan={4} className="text-center text-slate-400 py-14">No students enrolled in this section.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {attendanceRecords.length > 0 && (
        <Button variant="gradient" onClick={onSubmit} disabled={loading} className="px-6">
          {loading ? <><RefreshCw size={14} className="animate-spin" /> Saving...</> : <><CheckCircle2 size={14} /> Save Attendance</>}
        </Button>
      )}
    </div>
  )
}

// ─── Internal Marks Tab ──────────────────────────────────────────────────────
function InternalMarksTab({ examName, setExamName, maxMarks, setMaxMarks, marksEntries, setMarksEntries, onSubmit, sectionMarks, loading }) {
  return (
    <div className="space-y-6">
      <div className="glass-card p-6 border border-white/60">
        <h3 className="text-sm font-semibold text-slate-800 mb-5 flex items-center gap-2"><Plus size={14} className="text-violet-500" /> Enter Internal Marks</h3>
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Exam Name</label>
            <select value={examName} onChange={e => setExamName(e.target.value)} className="collego-input">
              {['IA-1', 'IA-2', 'IA-3', 'Mid-Sem', 'Quiz-1', 'Quiz-2'].map(n => <option key={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Max Marks</label>
            <input type="number" value={maxMarks} onChange={e => setMaxMarks(e.target.value)} className="collego-input" min="1" />
          </div>
        </div>
        <div className="rounded-xl overflow-hidden border border-white/60 mb-5">
          <div className="overflow-x-auto">
            <table className="collego-table">
              <thead><tr><th>Enrollment</th><th>Student</th><th style={{ textAlign: 'center' }}>Marks / {maxMarks}</th></tr></thead>
              <tbody>
                {marksEntries.map((entry, i) => (
                  <tr key={entry.studentId} className="hover:bg-white/30 transition-colors">
                    <td><code className="text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded">{entry.enrollmentNumber}</code></td>
                    <td className="text-slate-800">{entry.studentName}</td>
                    <td style={{ textAlign: 'center' }}>
                      <input type="number" value={entry.obtainedMarks} min="0" max={maxMarks}
                        onChange={e => setMarksEntries(prev => prev.map((m, j) => j === i ? { ...m, obtainedMarks: e.target.value } : m))}
                        className="w-20 text-center collego-input py-1 text-sm" placeholder="—" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <Button variant="gradient" onClick={onSubmit} disabled={loading} className="px-6">
          {loading ? <><RefreshCw size={14} className="animate-spin" /> Saving...</> : <><Upload size={14} /> Upload Marks</>}
        </Button>
      </div>

      {sectionMarks.length > 0 && (
        <div className="glass-card overflow-hidden border border-white/60">
          <div className="px-5 py-4 border-b border-white/50"><h3 className="text-sm font-semibold text-slate-800">Recorded Marks</h3></div>
          <div className="overflow-x-auto">
            <table className="collego-table">
              <thead><tr><th>Student</th><th>Exam</th><th style={{ textAlign: 'center' }}>Obtained</th><th style={{ textAlign: 'center' }}>Max</th></tr></thead>
              <tbody>
                {sectionMarks.map(m => (
                  <tr key={m.id} className="hover:bg-white/30 transition-colors">
                    <td><p className="text-slate-800">{m.studentName}</p><code className="text-[10px] text-slate-400">{m.enrollmentNumber}</code></td>
                    <td><Badge variant="secondary">{m.examName}</Badge></td>
                    <td style={{ textAlign: 'center', color: '#7c3aed', fontWeight: 600 }}>{m.obtainedMarks}</td>
                    <td style={{ textAlign: 'center', color: '#64748b' }}>{m.maxMarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Semester Marks Tab ──────────────────────────────────────────────────────
function SemesterMarksTab({ semMaxMarks, setSemMaxMarks, semMarksEntries, setSemMarksEntries, onSubmit, sectionMarks, loading }) {
  return (
    <div className="space-y-6">
      <div className="glass-card p-6 border border-white/60">
        <h3 className="text-sm font-semibold text-slate-800 mb-5 flex items-center gap-2"><GraduationCap size={14} className="text-blue-500" /> Upload Semester Marks</h3>
        <div className="mb-5">
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Max Marks</label>
          <input type="number" value={semMaxMarks} onChange={e => setSemMaxMarks(e.target.value)} className="collego-input !w-32" min="1" />
        </div>
        <div className="rounded-xl overflow-hidden border border-white/60 mb-5">
          <div className="overflow-x-auto">
            <table className="collego-table">
              <thead><tr><th>Enrollment</th><th>Student</th><th style={{ textAlign: 'center' }}>Marks / {semMaxMarks}</th></tr></thead>
              <tbody>
                {semMarksEntries.map((entry, i) => (
                  <tr key={entry.studentId} className="hover:bg-white/30 transition-colors">
                    <td><code className="text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded">{entry.enrollmentNumber}</code></td>
                    <td className="text-slate-800">{entry.studentName}</td>
                    <td style={{ textAlign: 'center' }}>
                      <input type="number" value={entry.obtainedMarks} min="0" max={semMaxMarks}
                        onChange={e => setSemMarksEntries(prev => prev.map((m, j) => j === i ? { ...m, obtainedMarks: e.target.value } : m))}
                        className="w-20 text-center collego-input py-1 text-sm" placeholder="—" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <Button variant="gradient" onClick={onSubmit} disabled={loading} className="px-6">
          {loading ? <><RefreshCw size={14} className="animate-spin" /> Saving...</> : <><Upload size={14} /> Upload Semester Marks</>}
        </Button>
      </div>

      {sectionMarks.length > 0 && (
        <div className="glass-card overflow-hidden border border-white/60">
          <div className="px-5 py-4 border-b border-white/50"><h3 className="text-sm font-semibold text-slate-800">Recorded Marks</h3></div>
          <div className="overflow-x-auto">
            <table className="collego-table">
              <thead><tr><th>Student</th><th style={{ textAlign: 'center' }}>Obtained</th><th style={{ textAlign: 'center' }}>Max</th><th style={{ textAlign: 'center' }}>Grade</th></tr></thead>
              <tbody>
                {sectionMarks.map(m => (
                  <tr key={m.id} className="hover:bg-white/30 transition-colors">
                    <td><p className="text-slate-800">{m.studentName}</p><code className="text-[10px] text-slate-400">{m.enrollmentNumber}</code></td>
                    <td style={{ textAlign: 'center', color: '#2563eb', fontWeight: 600 }}>{m.obtainedMarks}</td>
                    <td style={{ textAlign: 'center', color: '#64748b' }}>{m.maxMarks}</td>
                    <td style={{ textAlign: 'center' }}><Badge variant="secondary">{m.grade || '—'}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Assignment Marks Tab ────────────────────────────────────────────────────
function AssignmentMarksTab({
  assignments, selectedAssignmentId, setSelectedAssignmentId, entries, setEntries,
  onSubmit, sectionMarks, loading,
}) {
  const selectedAssignment = assignments.find(a => String(a.id) === String(selectedAssignmentId))

  return (
    <div className="space-y-6">
      <div className="glass-card p-6 border border-white/60">
        <h3 className="text-sm font-semibold text-slate-800 mb-5 flex items-center gap-2">
          <ClipboardList size={14} className="text-amber-500" /> Upload Assignment Marks
        </h3>

        {assignments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white/40 px-5 py-10 text-center">
            <p className="text-sm font-medium text-slate-700">No assignments yet</p>
            <p className="text-xs text-slate-400 mt-1">Create an assignment in the Assignments tab, then come back here to record marks.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Assignment</label>
                <select value={selectedAssignmentId} onChange={e => setSelectedAssignmentId(e.target.value)} className="collego-input">
                  <option value="">Select assignment</option>
                  {assignments.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                {selectedAssignment && (
                  <Badge variant="secondary">Max Marks: {selectedAssignment.maxMarks ?? 10}</Badge>
                )}
              </div>
            </div>

            {selectedAssignmentId && (
              <>
                <div className="rounded-xl overflow-hidden border border-white/60 mb-5">
                  <div className="overflow-x-auto">
                    <table className="collego-table">
                      <thead><tr><th>Enrollment</th><th>Student</th><th style={{ textAlign: 'center' }}>Marks / {selectedAssignment?.maxMarks ?? 10}</th></tr></thead>
                      <tbody>
                        {entries.map((entry, i) => (
                          <tr key={entry.studentId} className="hover:bg-white/30 transition-colors">
                            <td><code className="text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded">{entry.enrollmentNumber}</code></td>
                            <td className="text-slate-800">{entry.studentName}</td>
                            <td style={{ textAlign: 'center' }}>
                              <input type="number" value={entry.marks} min="0" max={selectedAssignment?.maxMarks ?? 10}
                                onChange={e => setEntries(prev => prev.map((m, j) => j === i ? { ...m, marks: e.target.value } : m))}
                                className="w-20 text-center collego-input py-1 text-sm" placeholder="—" />
                            </td>
                          </tr>
                        ))}
                        {entries.length === 0 && <tr><td colSpan={3} className="text-center text-slate-400 py-10">No students enrolled in this section.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
                {entries.length > 0 && (
                  <Button variant="gradient" onClick={onSubmit} disabled={loading} className="px-6">
                    {loading ? <><RefreshCw size={14} className="animate-spin" /> Saving...</> : <><Upload size={14} /> Save Assignment Marks</>}
                  </Button>
                )}
              </>
            )}
          </>
        )}
      </div>

      {sectionMarks.length > 0 && (
        <div className="glass-card overflow-hidden border border-white/60">
          <div className="px-5 py-4 border-b border-white/50"><h3 className="text-sm font-semibold text-slate-800">Recorded Marks</h3></div>
          <div className="overflow-x-auto">
            <table className="collego-table">
              <thead><tr><th>Student</th><th>Assignment</th><th style={{ textAlign: 'center' }}>Obtained</th><th style={{ textAlign: 'center' }}>Max</th></tr></thead>
              <tbody>
                {sectionMarks.map(m => (
                  <tr key={m.id} className="hover:bg-white/30 transition-colors">
                    <td><p className="text-slate-800">{m.studentName}</p><code className="text-[10px] text-slate-400">{m.enrollmentNumber}</code></td>
                    <td><Badge variant="secondary">{m.assignmentTitle}</Badge></td>
                    <td style={{ textAlign: 'center', color: '#d97706', fontWeight: 600 }}>{m.marks}</td>
                    <td style={{ textAlign: 'center', color: '#64748b' }}>{m.maxMarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Student Performance Tab ─────────────────────────────────────────────────
function StudentPerformanceTab({ data, loading }) {
  return (
    <div className="space-y-6">
      <PageTitle icon={Users} title="Student Performance" subtitle="Attendance and internal marks per student." accent="emerald" image={uiImages.groupStudy} imageAlt="Students collaborating" />
      {loading ? (
        <div className="flex justify-center py-16"><Spinner color="violet" /></div>
      ) : (
        <div className="glass-card overflow-hidden border border-white/60">
          <div className="overflow-x-auto">
            <table className="collego-table">
              <thead><tr><th>Student</th><th>Enrollment</th><th style={{ textAlign: 'center' }}>Attendance %</th><th style={{ textAlign: 'center' }}>IA-1</th><th style={{ textAlign: 'center' }}>IA-2</th></tr></thead>
              <tbody>
                {data.map(s => {
                  const attPct = s.attendance ? Math.round((s.attendance.presentClasses / (s.attendance.totalClasses || 1)) * 100) : null
                  return (
                    <tr key={s.studentId} className="hover:bg-white/30 transition-colors">
                      <td className="text-slate-800 font-medium">{s.studentName}</td>
                      <td><code className="text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded">{s.enrollmentNumber}</code></td>
                      <td style={{ textAlign: 'center' }}>{attPct != null ? <AttBadge pct={attPct} /> : <span className="text-slate-300">—</span>}</td>
                      <td style={{ textAlign: 'center', color: '#7c3aed' }}>{s.ia1ObtainedMarks ?? '—'}</td>
                      <td style={{ textAlign: 'center', color: '#7c3aed' }}>{s.ia2ObtainedMarks ?? '—'}</td>
                    </tr>
                  )
                })}
                {data.length === 0 && <tr><td colSpan={5} className="text-center text-slate-400 py-14">No performance data found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Assignments Tab ─────────────────────────────────────────────────────────
function AssignmentsTab({ title, setTitle, desc, setDesc, dueDate, setDueDate, maxMarks, setMaxMarks, targetYear, setTargetYear, onSubmit, assignments, loading, onDownload, showMsg }) {
  const fileRef = useRef(null)
  const [pendingFile, setPendingFile] = useState(null)

  const handleCreate = async () => {
    try {
      await onSubmit(pendingFile)
      setPendingFile(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch { /* toast already shown */ }
  }

  return (
    <div className="space-y-6">
      <div className="glass-card p-6 border border-white/60">
        <h3 className="text-sm font-semibold text-slate-800 mb-5 flex items-center gap-2"><Plus size={14} className="text-amber-500" /> Create Assignment</h3>
        <div className="space-y-3">
          <div><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Title</label><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Assignment title" className="collego-input" /></div>
          <div><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Description</label><textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} placeholder="Assignment description..." className="collego-input resize-none" /></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Due Date (optional)</label><input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="collego-input" /></div>
            <div><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Maximum Marks</label><input type="number" min="1" value={maxMarks} onChange={e => setMaxMarks(e.target.value)} className="collego-input" /></div>
            <TargetYearField value={targetYear} onChange={setTargetYear} />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Attachment (optional)</label>
            <input
              ref={fileRef}
              type="file"
              onChange={e => setPendingFile(e.target.files?.[0] || null)}
              className="collego-input file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-indigo-600"
            />
            {pendingFile && <p className="text-[10px] text-slate-400 mt-1">Selected: {pendingFile.name}</p>}
          </div>
        </div>
        <Button variant="gradient" size="sm" className="mt-5 px-5" onClick={handleCreate} disabled={loading || !title.trim() || !targetYear}>
          {loading ? (
            <span className="flex gap-1"><RefreshCw size={13} className="animate-spin" /> Creating...</span>
          ) : (
            <span className="flex gap-1"><Plus size={13} /> Create Assignment</span>
          )}
        </Button>
      </div>
      {assignments.length > 0 && (
        <div className="glass-card overflow-hidden border border-white/60">
          <div className="px-5 py-4 border-b border-white/50"><h3 className="text-sm font-semibold text-slate-800">Existing Assignments</h3></div>
          <div className="divide-y divide-white/30">
            {assignments.map(a => (
              <div key={a.id} className="px-5 py-4 hover:bg-white/30 transition-colors">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-800">{a.title}</p>
                      <Badge variant="secondary">{a.maxMarks ?? 10} marks</Badge>
                      <Badge variant="info">{targetYearLabel(a.targetYear)}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{a.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {a.dueDate && <span className="text-xs text-amber-600 shrink-0 flex items-center gap-1.5"><Clock size={11} /> {fmtDate(a.dueDate)}</span>}
                    {a.hasFile && (
                      <Button variant="outline" size="sm" onClick={() => onDownload(`/api/faculty/assignments/${a.id}/file`, a.fileName || `assignment-${a.id}`)}>
                        <span className="flex gap-1"><Download size={12} /> {a.fileName || 'Attachment'}</span>
                      </Button>
                    )}
                  </div>
                </div>
                <AssignmentSubmissions assignment={a} showMsg={showMsg} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Assignment Submissions ──────────────────────────────────────────────────
function AssignmentSubmissions({ assignment, showMsg }) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/api/faculty/assignments/${assignment.id}/submissions`)
      setRows(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to load submissions', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (open) load() }, [open])

  const download = async (row) => {
    try {
      await downloadFile(`/api/faculty/submissions/${row.id}/file`, row.fileName || 'submission')
    } catch (err) {
      showMsg(err.response?.data?.message || 'Download failed', 'error')
    }
  }

  const graded = rows.filter(r => r.status === 'GRADED').length

  return (
    <div className="mt-3">
      <button onClick={() => setOpen(o => !o)} className="text-xs font-medium text-indigo-600 hover:underline flex items-center gap-1">
        <Users size={12} /> Submissions ({assignment.submissionCount ?? 0}){graded > 0 ? ` · ${graded} graded` : ''}
      </button>
      {open && (
        <div className="mt-3 rounded-xl border border-white/60 bg-white/40 overflow-hidden">
          {loading ? (
            <div className="p-4"><Spinner color="violet" /></div>
          ) : rows.length === 0 ? (
            <p className="p-4 text-xs text-slate-400">No submissions yet.</p>
          ) : (
            <div className="divide-y divide-white/40">
              {rows.map(r => <SubmissionRow key={r.id} row={r} onGraded={load} onDownload={download} showMsg={showMsg} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SubmissionRow({ row, onGraded, onDownload, showMsg }) {
  const [marks, setMarks] = useState(row.marks ?? '')
  const [feedback, setFeedback] = useState(row.feedback ?? '')
  const [busy, setBusy] = useState(false)
  const isGraded = row.status === 'GRADED'

  const save = async () => {
    if (marks === '' || marks == null) {
      showMsg('Enter marks before saving', 'error')
      return
    }
    setBusy(true)
    try {
      await api.put(`/api/faculty/submissions/${row.id}/grade`, { marks: Number(marks), feedback })
      showMsg('Submission graded')
      await onGraded()
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to grade submission', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-slate-800">
            {row.studentName} <span className="text-xs text-slate-400">({row.enrollmentNumber})</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {row.hasFile
              ? (row.submittedAt ? `Submitted ${fmtDate(row.submittedAt)}` : 'Submitted')
              : (row.gradedAt ? `Marks recorded ${fmtDate(row.gradedAt)}` : 'No file submitted')}
            {row.late && <span className="ml-2 text-amber-600">Late</span>}
            {row.fileName && <span className="ml-2">· {row.fileName}</span>}
          </p>
          {row.note && <p className="text-xs text-slate-500 mt-1">“{row.note}”</p>}
        </div>
        <div className="flex items-center gap-2">
          {row.hasFile && (
            <Button variant="outline" size="sm" onClick={() => onDownload(row)}>
              <span className="flex gap-1"><Download size={12} /> File</span>
            </Button>
          )}
          <Badge variant={isGraded ? 'success' : 'info'}>
            {isGraded ? `${row.marks}/${row.maxMarks}` : 'Submitted'}
          </Badge>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-[110px_1fr_auto] gap-2 items-end">
        <div>
          <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Marks / {row.maxMarks}</label>
          <input type="number" min="0" max={row.maxMarks} value={marks} onChange={e => setMarks(e.target.value)} className="collego-input" />
        </div>
        <div>
          <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Feedback</label>
          <input value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="Optional feedback" className="collego-input" />
        </div>
        <Button variant="gradient" size="sm" onClick={save} disabled={busy}>
          {busy ? <RefreshCw size={13} className="animate-spin" /> : 'Save'}
        </Button>
      </div>
    </div>
  )
}

// ─── Materials Tab ───────────────────────────────────────────────────────────
function MaterialsTab({ title, setTitle, desc, setDesc, type, setType, targetYear, setTargetYear, onSubmit, materials, loading, onDownload }) {
  const MATERIAL_TYPES = ['NOTES', 'SLIDES', 'REFERENCE', 'VIDEO', 'ASSIGNMENT', 'OTHER']
  const fileRef = useRef(null)
  const [pendingFile, setPendingFile] = useState(null)

  const handleCreate = async () => {
    try {
      await onSubmit(pendingFile)
      setPendingFile(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch { /* toast already shown */ }
  }

  return (
    <div className="space-y-6">
      <div className="glass-card p-6 border border-white/60">
        <h3 className="text-sm font-semibold text-slate-800 mb-5 flex items-center gap-2"><Plus size={14} className="text-teal-500" /> Add Course Material</h3>
        <div className="space-y-3">
          <div><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Title</label><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Material title" className="collego-input" /></div>
          <div><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Description</label><textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} placeholder="Description..." className="collego-input resize-none" /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Type</label>
              <select value={type} onChange={e => setType(e.target.value)} className="collego-input">
                {MATERIAL_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <TargetYearField value={targetYear} onChange={setTargetYear} />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Attachment (optional)</label>
            <input
              ref={fileRef}
              type="file"
              onChange={e => setPendingFile(e.target.files?.[0] || null)}
              className="collego-input file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-indigo-600"
            />
            {pendingFile && <p className="text-[10px] text-slate-400 mt-1">Selected: {pendingFile.name}</p>}
          </div>
        </div>
        <Button variant="gradient" size="sm" className="mt-5 px-5" onClick={handleCreate} disabled={loading || !title.trim() || !targetYear}>
          {loading ? (
            <span className="flex gap-1"><RefreshCw size={13} className="animate-spin" /> Adding...</span>
          ) : (
            <span className="flex gap-1"><Plus size={13} /> Add Material</span>
          )}
        </Button>
      </div>
      {materials.length > 0 && (
        <div className="glass-card overflow-hidden border border-white/60">
          <div className="overflow-x-auto">
            <table className="collego-table">
              <thead><tr><th>Title</th><th>Type</th><th>Target Year</th><th>Description</th><th style={{ textAlign: 'center' }}>File</th></tr></thead>
              <tbody>
                {materials.map(m => (
                  <tr key={m.id} className="hover:bg-white/30 transition-colors">
                    <td className="text-slate-800 font-medium">{m.title}</td>
                    <td><Badge variant="info">{m.materialType}</Badge></td>
                    <td><Badge variant="secondary">{targetYearLabel(m.targetYear)}</Badge></td>
                    <td className="text-slate-500 text-xs max-w-xs truncate">{m.description || '—'}</td>
                    <td style={{ textAlign: 'center' }}>
                      {m.hasFile && (
                        <Button variant="outline" size="sm" onClick={() => onDownload(`/api/faculty/materials/${m.id}/file`, m.fileName || `material-${m.id}`)}>
                          <span className="flex gap-1"><Download size={12} /> {m.fileName || 'File'}</span>
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Analytics Tab ───────────────────────────────────────────────────────────
function AnalyticsTab({ analytics, loading }) {
  const attData = analytics ? [
    { name: '<50%', value: analytics.studentsBelow50 || 0 },
    { name: '50-75%', value: (analytics.studentsBelow75 || 0) - (analytics.studentsBelow50 || 0) },
    { name: '>75%', value: analytics.studentsAbove75 || 0 },
  ] : []

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="flex justify-center py-16"><Spinner color="violet" /></div>
      ) : !analytics ? (
        <div className="glass-card p-12 border border-white/60"><EmptyState icon={BarChart3} title="No analytics data" accent="violet" description="Analytics will appear once attendance and marks are recorded." /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Panel title="Attendance Distribution" icon={BarChart3} accent="violet">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={attData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={entry => `${entry.name}: ${entry.value}`} labelLine={false}>
                  {['#ef4444', '#f59e0b', '#10b981'].map((c, i) => <Cell key={i} fill={c} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </Panel>
          <Panel title="Section Summary" icon={Award} accent="emerald">
            <div className="space-y-3">
              {[
                { label: 'Average Attendance', value: `${fmtNum(analytics.averageAttendancePercentage, 1)}%`, color: 'text-emerald-600' },
                { label: 'Students > 75%', value: analytics.studentsAbove75 || 0, color: 'text-emerald-600' },
                { label: 'Students 50-75%', value: (analytics.studentsBelow75 || 0) - (analytics.studentsBelow50 || 0), color: 'text-amber-600' },
                { label: 'Students < 50%', value: analytics.studentsBelow50 || 0, color: 'text-red-500' },
                { label: 'Avg Internal Marks', value: fmtNum(analytics.averageInternalMarks), color: 'text-violet-600' },
                { label: 'Pass Rate', value: `${fmtNum(analytics.passPercentage, 1)}%`, color: 'text-blue-600' },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center py-2">
                  <span className="text-xs text-slate-500">{item.label}</span>
                  <span className={cn('text-sm font-bold', item.color)}>{item.value}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}
    </div>
  )
}

// ─── Question Papers Tab ─────────────────────────────────────────────────────
function QuestionPapersTab({ sections, examType, setExamType, year, setYear, targetYear, setTargetYear, fileName, setFileName, selectedSectionId, setSelectedSectionId, onSubmit, papers, loading, uploadFileLoading }) {
  const [pendingFile, setPendingFile] = useState(null)
  const fileRef = useRef(null)

  const handleSubmit = async () => {
    try {
      await onSubmit(pendingFile)
      setPendingFile(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch { /* toast already shown */ }
  }

  return (
    <div className="space-y-6">
      <PageTitle icon={FileText} title="Question Papers" subtitle="Upload question papers. They are published instantly to students in the selected year of your department." accent="violet" image={uiImages.classroom} imageAlt="Classroom lecture" />
      <div className="glass-card p-6 border border-white/60">
        <h3 className="text-sm font-semibold text-slate-800 mb-5 flex items-center gap-2"><Upload size={14} className="text-blue-500" /> Upload Question Paper</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Course / Section</label>
            <select value={selectedSectionId} onChange={e => setSelectedSectionId(e.target.value)} className="collego-input">
              <option value="">Select course</option>
              {sections.map(s => <option key={s.sectionId} value={s.sectionId}>{s.courseName} (Sec {s.sectionName})</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Exam Type</label>
            <select value={examType} onChange={e => setExamType(e.target.value)} className="collego-input">
              {['END_TERM', 'MID_TERM', 'INTERNAL', 'QUIZ'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <TargetYearField value={targetYear} onChange={setTargetYear} />
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Exam Year</label>
            <input type="number" value={year} onChange={e => setYear(e.target.value)} className="collego-input" min="2000" max="2100" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">File Name (optional)</label>
            <input value={fileName} onChange={e => setFileName(e.target.value)} placeholder="e.g., CS101_EndTerm_2026.pdf" className="collego-input" />
          </div>
        </div>
        <div className="mt-4">
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Question Paper File</label>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={e => setPendingFile(e.target.files?.[0] || null)}
            className="collego-input file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-indigo-600"
          />
          {pendingFile && <p className="text-[10px] text-slate-400 mt-1">Selected: {pendingFile.name}</p>}
        </div>
        <Button variant="gradient" size="sm" className="mt-5 px-5" onClick={handleSubmit} disabled={loading || uploadFileLoading || !selectedSectionId || !targetYear}>
          {loading || uploadFileLoading ? <><RefreshCw size={13} className="animate-spin" /> Uploading...</> : <><Upload size={13} /> Publish Question Paper</>}
        </Button>
      </div>
      {papers.length > 0 && (
        <div className="glass-card overflow-hidden border border-white/60">
          <div className="px-5 py-4 border-b border-white/50"><h3 className="text-sm font-semibold text-slate-800">My Uploaded Papers</h3></div>
          <div className="overflow-x-auto">
            <table className="collego-table">
              <thead><tr><th>Course</th><th>Exam Type</th><th>Exam Year</th><th>Target Year</th><th style={{ textAlign: 'center' }}>Status</th></tr></thead>
              <tbody>
                {papers.map(p => (
                  <tr key={p.id} className="hover:bg-white/30 transition-colors">
                    <td className="text-slate-800">{p.courseName}</td>
                    <td><Badge variant="info">{p.examType}</Badge></td>
                    <td className="text-slate-500">{p.year}</td>
                    <td><Badge variant="secondary">{targetYearLabel(p.targetYear)}</Badge></td>
                    <td style={{ textAlign: 'center' }}>
                      <Badge variant={p.status === 'APPROVED' ? 'success' : p.status === 'REJECTED' ? 'destructive' : 'warning'}>{p.status || 'PENDING'}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Notices Tab ─────────────────────────────────────────────────────────────
function NoticesTab({ title, setTitle, message, setMessage, type, setType, targetYear, setTargetYear, departmentName, onSubmit, sentNotices, loading }) {
  const TYPE_OPTIONS = ['GENERAL', 'ACADEMIC', 'PLACEMENT', 'EXAM']
  return (
    <div className="space-y-6">
      <PageTitle icon={Megaphone} title="Notices" subtitle="Send announcements to students in a selected year of your department." accent="amber" image={uiImages.placementTalk} imageAlt="Placement talk" />
      <div className="glass-card p-6 border border-white/60">
        <h3 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2"><Megaphone size={14} className="text-amber-500" /> Department Notice</h3>
        <p className="text-xs text-slate-500 mb-5">
          This notice will appear only in the portal of students in the selected year of <span className="font-semibold text-slate-700">{departmentName}</span>.
        </p>
        <div className="space-y-3">
          <div><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Title</label><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Notice title" className="collego-input" /></div>
          <div><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Message</label><textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} placeholder="Notice message..." className="collego-input resize-none" /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Type</label>
              <select value={type} onChange={e => setType(e.target.value)} className="collego-input">
                {TYPE_OPTIONS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <TargetYearField value={targetYear} onChange={setTargetYear} />
          </div>
        </div>
        <Button variant="gradient" size="sm" className="mt-5 px-5" onClick={onSubmit} disabled={loading || !title.trim() || !message.trim() || !targetYear}>
          {loading ? <><RefreshCw size={13} className="animate-spin" /> Sending...</> : <><Send size={13} /> Send Notice</>}
        </Button>
      </div>
      {sentNotices.length > 0 && (
        <div className="glass-card overflow-hidden border border-white/60">
          <div className="px-5 py-4 border-b border-white/50"><h3 className="text-sm font-semibold text-slate-800">Sent Notices</h3></div>
          <div className="divide-y divide-white/30">
            {sentNotices.map((n, i) => (
              <div key={i} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{n.title}</p>
                    <p className="text-xs text-slate-500 mt-1">{n.message}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant="info">{n.type}</Badge>
                    <div className="mt-1"><Badge variant="secondary">{targetYearLabel(n.targetYear)}</Badge></div>
                    <p className="text-[10px] text-slate-400 mt-1">{n.recipientCount} recipients</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Subject Assignments Tab ─────────────────────────────────────────────────────
function SubjectAssignmentsTab({ courses, semesters, myAssignments, loading, onAssign, onRemove, selectedSemesterId, setSelectedSemesterId, courseName, setCourseName }) {
  const selectedSemester = semesters.find(s => String(s.id) === String(selectedSemesterId))
  const selectedYear = semesterYear(selectedSemester?.number)

  return (
    <div className="space-y-6">
      <PageTitle icon={BookUser} title="My Subject Assignments" subtitle="Assign yourself to a subject and semester. Students from the matching academic year are loaded automatically into the sections you manage." accent="violet"
        image={uiImages.campus} imageAlt="College campus"
        actions={<Badge variant="purple">Full Independence</Badge>} />

      <div className="glass-card p-6 border border-white/60">
        <h3 className="text-sm font-semibold text-slate-800 mb-5 flex items-center gap-2"><Plus size={14} className="text-violet-500" /> Assign New Subject</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Course Name (type any course)</label>
            <input
              value={courseName}
              onChange={e => setCourseName(e.target.value)}
              placeholder="e.g., UI/UX Design, Prompt Engineering, Machine Learning, etc."
              className="collego-input"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Semester</label>
            <select value={selectedSemesterId} onChange={e => setSelectedSemesterId(e.target.value)} className="collego-input">
              <option value="">Select semester</option>
              {semesters.map(s => {
                const year = semesterYear(s.number)
                return <option key={s.id} value={s.id}>{s.name} · {targetYearLabel(year)} ({s.academicYear})</option>
              })}
            </select>
            {selectedSemester && (
              <div className="mt-2 flex items-start gap-2 rounded-xl border border-violet-100 bg-violet-50/70 px-3 py-2">
                <GraduationCap size={14} className="text-violet-500 mt-0.5 shrink-0" />
                <p className="text-[11px] text-violet-700 leading-relaxed">
                  <span className="font-semibold">{targetYearLabel(selectedYear)} students</span> from your department will be loaded into the sections for this subject, ready for attendance, marks and resources.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-white/60 bg-white/50 p-3">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Semester → Academic Year</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SEMESTER_YEAR_MAP.map(item => (
              <div key={item.year} className={cn(
                'rounded-lg border px-2.5 py-2 text-center transition-colors',
                selectedYear === item.year
                  ? 'border-violet-200 bg-violet-50'
                  : 'border-white/70 bg-white/60'
              )}>
                <p className="text-[10px] text-slate-400">{item.semesters}</p>
                <p className={cn('text-xs font-semibold mt-0.5', selectedYear === item.year ? 'text-violet-700' : 'text-slate-700')}>{targetYearLabel(item.year)}</p>
              </div>
            ))}
          </div>
        </div>

        <Button variant="gradient" size="sm" className="mt-5 px-5" onClick={onAssign} disabled={loading || !courseName.trim() || !selectedSemesterId}>
          {loading ? <><RefreshCw size={14} className="animate-spin" /> Assigning...</> : <><Plus size={13} /> Assign Subject &amp; Load Students</>}
        </Button>
      </div>

      {myAssignments.length > 0 && (
        <div className="glass-card overflow-hidden border border-white/60">
          <div className="px-5 py-4 border-b border-white/50"><h3 className="text-sm font-semibold text-slate-800">My Assigned Subjects</h3></div>
          <div className="divide-y divide-white/30">
            {myAssignments.map(a => (
              <div key={a.id} className="px-5 py-4 hover:bg-white/30 transition-colors flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{a.courseName}</p>
                  <p className="text-xs text-slate-400 mt-1">{a.courseCode}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant="secondary">{a.yearLabel || targetYearLabel(a.year || semesterYear(a.semesterNumber))}</Badge>
                  <Badge variant="info">{a.semesterName}</Badge>
                  <Button variant="destructive" size="sm" onClick={() => onRemove(a.id)} className="px-3 py-1.5">
                    <X size={12} /> Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {myAssignments.length === 0 && !loading && (
        <div className="glass-card p-12 border border-white/60 text-center">
          <BookUser size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-sm font-semibold text-slate-800 mb-1">No subject assignments yet</h3>
          <p className="text-xs text-slate-400">Assign yourself to courses using the form above</p>
        </div>
      )}
    </div>
  )
}

// ─── Main Faculty Dashboard ──────────────────────────────────────────────────
export default function FacultyDashboard() {
  const navigate = useNavigate()
  const email = authService.getEmail()

  const [collapsed, setCollapsed] = useState(false)
  const [sections, setSections] = useState([])
  const [selectedSection, setSelectedSection] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(false)
  const [tabLoading, setTabLoading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [overviewData, setOverviewData] = useState(null)

  // Attendance
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0])
  const [attendanceRecords, setAttendanceRecords] = useState([])

  // Marks
  const [examName, setExamName] = useState('IA-1')
  const [maxMarks, setMaxMarks] = useState(50)
  const [marksEntries, setMarksEntries] = useState([])
  const [sectionMarks, setSectionMarks] = useState([])
  const [semMaxMarks, setSemMaxMarks] = useState(100)
  const [semMarksEntries, setSemMarksEntries] = useState([])
  const [semesterMarks, setSemesterMarks] = useState([])
  const [studentPerformance, setStudentPerformance] = useState([])

  // Assignment Marks
  const [assignmentMarksAssignmentId, setAssignmentMarksAssignmentId] = useState('')
  const [assignmentMarksEntries, setAssignmentMarksEntries] = useState([])
  const [assignmentMarksRecorded, setAssignmentMarksRecorded] = useState([])

  // Assignments & Materials
  const [assignmentTitle, setAssignmentTitle] = useState('')
  const [assignmentDesc, setAssignmentDesc] = useState('')
  const [assignmentDueDate, setAssignmentDueDate] = useState('')
  const [assignmentMaxMarks, setAssignmentMaxMarks] = useState(10)
  const [assignmentTargetYear, setAssignmentTargetYear] = useState('')
  const [sectionAssignments, setSectionAssignments] = useState([])
  const [materialTitle, setMaterialTitle] = useState('')
  const [materialDesc, setMaterialDesc] = useState('')
  const [materialType, setMaterialType] = useState('NOTES')
  const [materialTargetYear, setMaterialTargetYear] = useState('')
  const [sectionMaterials, setSectionMaterials] = useState([])
  const [uploadFileLoading, setUploadFileLoading] = useState(false)
  const [uploadFileType, setUploadFileType] = useState(null) // 'assignment' | 'material' | 'qp'

  // Notices
  const [noticeTitle, setNoticeTitle] = useState('')
  const [noticeMessage, setNoticeMessage] = useState('')
  const [noticeType, setNoticeType] = useState('GENERAL')
  const [noticeTargetYear, setNoticeTargetYear] = useState('')
  const [sentNotices, setSentNotices] = useState([])

  // Question Papers
  const [qpExamType, setQpExamType] = useState('END_TERM')
  const [qpYear, setQpYear] = useState(new Date().getFullYear())
  const [qpTargetYear, setQpTargetYear] = useState('')
  const [qpFileName, setQpFileName] = useState('')
  const [qpSelectedSectionId, setQpSelectedSectionId] = useState('')
  const [myQuestionPapers, setMyQuestionPapers] = useState([])
  const [facultyDirectory, setFacultyDirectory] = useState([])

  // Analytics
  const [analytics, setAnalytics] = useState(null)

  // Subject Assignments
  const [mySubjectAssignments, setMySubjectAssignments] = useState([])
  const [availableCourses, setAvailableCourses] = useState([])
  const [availableSemesters, setAvailableSemesters] = useState([])
  const [selectedSemesterId, setSelectedSemesterId] = useState('')
  const [newCourseName, setNewCourseName] = useState('')
  const [subjectAssignmentsLoading, setSubjectAssignmentsLoading] = useState(false)

  const sidebarWidth = collapsed ? 76 : 248
  const facultyDepartmentName = sections.find(s => s.departmentName)?.departmentName || 'your department'
  const showMsg = useCallback((text, type = 'success') => setMessage({ text, type }), [])

  const fetchSections = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/faculty/sections')
      setSections(res.data)
    } catch { showMsg('Failed to load sections', 'error') }
    finally { setLoading(false) }
  }, [showMsg])

  useEffect(() => {
    fetchSections()
  }, [fetchSections])

  useEffect(() => {
    if (activeTab === 'overview' && sections.length > 0) {
      setOverviewData({
        totalSections: sections.length,
        totalStudents: sections.reduce((s, sec) => s + (sec.enrolledStudents || 0), 0),
        semesters: [...new Set(sections.map(s => s.semesterName))],
        courses: [...new Set(sections.map(s => s.courseName))],
      })
    }
  }, [activeTab, sections])

  useEffect(() => {
    if (selectedSection && activeTab === 'internalMarks') {
      loadSectionMarks()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examName, selectedSection, activeTab])

  const handleGlobalNav = (tabId) => {
    setSelectedSection(null)
    setActiveTab(tabId)
    if (tabId === 'questionPapers') loadMyQPs()
    if (tabId === 'facultyDirectory') loadFacultyDirectory()
  }

  const loadFacultyDirectory = async () => {
    try {
      const res = await api.get('/api/faculty-directory')
      setFacultyDirectory(Array.isArray(res.data) ? res.data : [])
    } catch { showMsg('Failed to load faculty directory', 'error') }
  }

  const handleSectionSelect = (section) => {
    setSelectedSection(section)
    setActiveTab('attendance')
    setAnalytics(null)
    setSectionMarks([])
    setSemesterMarks([])
    setAssignmentMarksAssignmentId('')
    setAssignmentMarksEntries([])
    setAssignmentMarksRecorded([])
    setSectionAssignments([])
    setSectionMaterials([])
    setStudentPerformance([])
    loadEnrolledStudents(section.sectionId)
  }

  const loadEnrolledStudents = async (sectionId) => {
    try {
      const res = await api.get(`/api/faculty/attendance/${sectionId}`)
      const students = res.data
      setAttendanceRecords(students.map(s => ({ studentId: s.studentId, studentName: s.studentName, enrollmentNumber: s.enrollmentNumber, status: 'PRESENT' })))
      setMarksEntries(students.map(s => ({ studentId: s.studentId, studentName: s.studentName, enrollmentNumber: s.enrollmentNumber, obtainedMarks: '' })))
      setSemMarksEntries(students.map(s => ({ studentId: s.studentId, studentName: s.studentName, enrollmentNumber: s.enrollmentNumber, obtainedMarks: '' })))
    } catch { showMsg('Failed to load student data', 'error') }
  }

  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    if (!selectedSection) return
    if (tabId === 'assignments') loadAssignments()
    if (tabId === 'materials') loadMaterials()
    if (tabId === 'analytics') loadAnalytics()
    if (tabId === 'semesterMarks') loadSemesterMarks()
    if (tabId === 'assignmentMarks') loadAssignmentMarks()
    if (tabId === 'studentPerformance') loadStudentPerformance()
  }

  const handleMarkAttendance = async () => {
    setLoading(true)
    try {
      const res = await api.post('/api/faculty/attendance', { sectionId: selectedSection.sectionId, date: attendanceDate, records: attendanceRecords.map(r => ({ studentId: r.studentId, status: r.status })) })
      showMsg(`Attendance saved: ${res.data.markedPresent} present, ${res.data.markedAbsent} absent`)
      loadEnrolledStudents(selectedSection.sectionId)
    } catch (err) { showMsg(err.response?.data?.message || 'Failed to mark attendance', 'error') }
    finally { setLoading(false) }
  }

  const toggleAttendance = (idx, forceStatus) => {
    setAttendanceRecords(prev => prev.map((r, i) => i === idx ? { ...r, status: forceStatus || (r.status === 'PRESENT' ? 'ABSENT' : 'PRESENT') } : r))
  }

  const handleUploadInternalMarks = async () => {
    const entries = marksEntries.filter(e => e.obtainedMarks !== '' && e.obtainedMarks !== null).map(e => ({ studentId: e.studentId, obtainedMarks: parseFloat(e.obtainedMarks) }))
    if (!entries.length) { showMsg('Enter marks for at least one student', 'error'); return }
    setLoading(true)
    try {
      const res = await api.post('/api/faculty/marks/internal', { sectionId: selectedSection.sectionId, examName, maxMarks: parseFloat(maxMarks), entries })
      showMsg(`Marks saved: ${res.data.created} created, ${res.data.updated} updated`)
      await loadSectionMarks()
    } catch (err) { showMsg(err.response?.data?.message || 'Failed to upload marks', 'error') }
    finally { setLoading(false) }
  }

  const loadSectionMarks = async () => {
    if (!selectedSection) return
    setTabLoading(true)
    try {
      const res = await api.get(`/api/faculty/marks/internal/${selectedSection.sectionId}`)
      const rows = Array.isArray(res.data) ? res.data : []
      setSectionMarks(rows)
      setMarksEntries(prev => prev.map(entry => {
        const existing = rows.find(m => m.studentId === entry.studentId && m.examName === examName)
        return { ...entry, obtainedMarks: existing ? existing.obtainedMarks : '' }
      }))
    } catch { /* ignore */ } finally { setTabLoading(false) }
  }

  const handleUploadSemesterMarks = async () => {
    const entries = semMarksEntries.filter(e => e.obtainedMarks !== '' && e.obtainedMarks !== null).map(e => ({ studentId: e.studentId, obtainedMarks: parseFloat(e.obtainedMarks) }))
    if (!entries.length) { showMsg('Enter marks for at least one student', 'error'); return }
    setLoading(true)
    try {
      const res = await api.post('/api/faculty/marks/semester', { sectionId: selectedSection.sectionId, maxMarks: parseFloat(semMaxMarks), entries })
      showMsg(`Semester marks saved: ${res.data.created} created, ${res.data.updated} updated`)
      await loadSemesterMarks()
    } catch (err) { showMsg(err.response?.data?.message || 'Failed to upload semester marks', 'error') }
    finally { setLoading(false) }
  }

  const loadSemesterMarks = async () => {
    if (!selectedSection) return
    setTabLoading(true)
    try {
      const res = await api.get(`/api/faculty/marks/semester/${selectedSection.sectionId}`)
      const rows = Array.isArray(res.data) ? res.data : []
      setSemesterMarks(rows)
      setSemMarksEntries(prev => prev.map(entry => {
        const existing = rows.find(m => m.studentId === entry.studentId)
        return existing ? { ...entry, obtainedMarks: existing.obtainedMarks } : entry
      }))
    } catch { /* ignore */ } finally { setTabLoading(false) }
  }

  const loadAssignmentMarks = async () => {
    if (!selectedSection) return
    setTabLoading(true)
    try {
      const [assignmentsRes, recordedRes] = await Promise.all([
        api.get(`/api/faculty/assignments/${selectedSection.sectionId}`),
        api.get(`/api/faculty/assignment-marks/${selectedSection.sectionId}`),
      ])
      const assignments = Array.isArray(assignmentsRes.data) ? assignmentsRes.data : []
      const recorded = Array.isArray(recordedRes.data) ? recordedRes.data : []
      setSectionAssignments(assignments)
      setAssignmentMarksRecorded(recorded)

      const currentExists = assignments.some(a => String(a.id) === String(assignmentMarksAssignmentId))
      const nextId = currentExists ? assignmentMarksAssignmentId : assignments[0]?.id || ''
      setAssignmentMarksAssignmentId(nextId ? String(nextId) : '')
      if (nextId) {
        await loadAssignmentMarksGrid(nextId)
      } else {
        setAssignmentMarksEntries([])
      }
    } catch { /* ignore */ } finally { setTabLoading(false) }
  }

  const loadAssignmentMarksGrid = async (assignmentId) => {
    if (!selectedSection || !assignmentId) { setAssignmentMarksEntries([]); return }
    try {
      const res = await api.get(`/api/faculty/assignments/${assignmentId}/marks`)
      const students = Array.isArray(res.data?.students) ? res.data.students : []
      setAssignmentMarksEntries(students.map(s => ({
        studentId: s.studentId,
        studentName: s.studentName,
        enrollmentNumber: s.enrollmentNumber,
        marks: s.marks ?? '',
      })))
    } catch (err) {
      setAssignmentMarksEntries([])
      showMsg(err.response?.data?.message || 'Failed to load assignment marks', 'error')
    }
  }

  const handleAssignmentMarksSelect = async (value) => {
    setAssignmentMarksAssignmentId(value)
    await loadAssignmentMarksGrid(value)
  }

  const handleUploadAssignmentMarks = async () => {
    const entries = assignmentMarksEntries
      .filter(e => e.marks !== '' && e.marks !== null)
      .map(e => ({ studentId: e.studentId, marks: Number(e.marks) }))
    if (!assignmentMarksAssignmentId) { showMsg('Select an assignment first', 'error'); return }
    if (!entries.length) { showMsg('Enter marks for at least one student', 'error'); return }
    setLoading(true)
    try {
      const res = await api.post(`/api/faculty/assignments/${assignmentMarksAssignmentId}/marks`, { entries })
      showMsg(`Assignment marks saved: ${res.data.created} created, ${res.data.updated} updated`)
      await Promise.all([
        loadAssignmentMarksGrid(assignmentMarksAssignmentId),
        api.get(`/api/faculty/assignment-marks/${selectedSection.sectionId}`).then(r => setAssignmentMarksRecorded(Array.isArray(r.data) ? r.data : [])),
      ])
    } catch (err) { showMsg(err.response?.data?.message || 'Failed to save assignment marks', 'error') }
    finally { setLoading(false) }
  }

  const loadStudentPerformance = useCallback(async () => {
    if (!selectedSection) return
    setTabLoading(true)
    try {
      const [attRes, marksRes] = await Promise.all([api.get(`/api/faculty/attendance/${selectedSection.sectionId}`), api.get(`/api/faculty/marks/internal/${selectedSection.sectionId}`)])
      const attMap = {}; attRes.data.forEach(s => { attMap[s.studentId] = s })
      const marksByStudent = {}
      marksRes.data.forEach(m => {
        if (!marksByStudent[m.studentId]) {
          marksByStudent[m.studentId] = {
            studentId: m.studentId,
            studentName: m.studentName,
            enrollmentNumber: m.enrollmentNumber,
          }
        }
        if (m.examName === 'IA-1') marksByStudent[m.studentId].ia1ObtainedMarks = m.obtainedMarks
        if (m.examName === 'IA-2') marksByStudent[m.studentId].ia2ObtainedMarks = m.obtainedMarks
      })
      const combined = attRes.data.map(s => ({
        ...s,
        ...(marksByStudent[s.studentId] || {}),
        attendance: attMap[s.studentId] || null,
      }))
      Object.values(marksByStudent).forEach(m => {
        if (!combined.find(c => c.studentId === m.studentId)) {
          combined.push({ ...m, attendance: attMap[m.studentId] || null })
        }
      })
      setStudentPerformance(combined)
    } catch { /* ignore */ } finally { setTabLoading(false) }
  }, [selectedSection])

  const handleCreateAssignment = async (file) => {
    setLoading(true)
    try {
      const res = await api.post('/api/faculty/assignments', {
        sectionId: selectedSection.sectionId,
        title: assignmentTitle,
        description: assignmentDesc,
        dueDate: assignmentDueDate || null,
        maxMarks: Number(assignmentMaxMarks) || 10,
        targetYear: Number(assignmentTargetYear),
        fileName: null,
      })
      if (file) {
        const fd = new FormData()
        fd.append('file', file)
        await api.post(`/api/faculty/assignments/${res.data.id}/file`, fd)
      }
      showMsg('Assignment created successfully')
      setAssignmentTitle(''); setAssignmentDesc(''); setAssignmentDueDate(''); setAssignmentMaxMarks(10)
      await loadAssignments()
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to create assignment', 'error')
      throw err
    } finally { setLoading(false) }
  }

  const loadAssignments = async () => {
    setTabLoading(true)
    try { const res = await api.get(`/api/faculty/assignments/${selectedSection.sectionId}`); setSectionAssignments(res.data) }
    catch { /* ignore */ } finally { setTabLoading(false) }
  }

  const handleCreateMaterial = async (file) => {
    setLoading(true)
    try {
      const res = await api.post('/api/faculty/materials', {
        sectionId: selectedSection.sectionId,
        title: materialTitle,
        description: materialDesc,
        materialType,
        targetYear: Number(materialTargetYear),
        fileName: null,
      })
      if (file) {
        const fd = new FormData()
        fd.append('file', file)
        await api.post(`/api/faculty/materials/${res.data.id}/file`, fd)
      }
      showMsg('Material added successfully')
      setMaterialTitle(''); setMaterialDesc('')
      await loadMaterials()
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to add material', 'error')
      throw err
    } finally { setLoading(false) }
  }

  const handleDownload = useCallback(async (url, name) => {
    try {
      await downloadFile(url, name)
    } catch (err) {
      showMsg(err.response?.data?.message || 'Download failed', 'error')
    }
  }, [showMsg])


  const loadMaterials = async () => {
    setTabLoading(true)
    try { const res = await api.get(`/api/faculty/materials/${selectedSection.sectionId}`); setSectionMaterials(res.data) }
    catch { /* ignore */ } finally { setTabLoading(false) }
  }

  const handleUploadQP = async (file) => {
    const sec = sections.find(s => s.sectionId === parseInt(qpSelectedSectionId))
    if (!sec) { showMsg('Please select a course/section', 'error'); throw new Error('No section') }
    if (!file) { showMsg('Please choose a question paper file', 'error'); throw new Error('No file') }
    setLoading(true)
    try {
      const params = {
        courseId: sec.courseId,
        departmentId: sec.departmentId,
        examType: qpExamType,
        year: parseInt(qpYear),
        semesterNumber: sec.semesterNumber,
        targetYear: Number(qpTargetYear),
        fileName: qpFileName || `${sec.courseCode}_${qpExamType}_${qpYear}.pdf`,
      }
      if (file) {
        const fd = new FormData()
        fd.append('file', file)
        await api.post('/api/faculty/question-papers/with-file', fd, { params })
      } else {
        await api.post('/api/faculty/question-papers', params)
      }
      showMsg('Question paper published to your department')
      setQpFileName(''); loadMyQPs()
    } catch (err) {
      const message = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to upload question paper'
      showMsg(message, 'error')
      throw err
    } finally { setLoading(false) }
  }

  const loadMyQPs = async () => {
    try { const res = await api.get('/api/faculty/question-papers'); setMyQuestionPapers(res.data) } catch { /* ignore */ }
  }

  const handleDraftNotice = async () => {
    setLoading(true)
    try {
      const res = await api.post('/api/faculty/notices', { title: noticeTitle, message: noticeMessage, type: noticeType, targetYear: Number(noticeTargetYear) })
      showMsg(`Notice sent to ${res.data.recipientCount} students in ${targetYearLabel(res.data.targetYear)}`)
      setSentNotices(prev => [{ title: noticeTitle, message: noticeMessage, type: noticeType, targetYear: res.data.targetYear, recipientCount: res.data.recipientCount, sentAt: new Date().toISOString() }, ...prev])
      setNoticeTitle(''); setNoticeMessage('')
    } catch (err) { showMsg(err.response?.data?.message || 'Failed to send notice', 'error') }
    finally { setLoading(false) }
  }

  const loadAnalytics = async () => {
    setTabLoading(true)
    try { const res = await api.get(`/api/faculty/analytics/${selectedSection.sectionId}`); setAnalytics(res.data) }
    catch { /* ignore */ } finally { setTabLoading(false) }
  }

  const loadAvailableCourses = async () => {
    try { const res = await api.get('/api/faculty/courses'); setAvailableCourses(res.data) } catch { /* ignore */ }
  }

  const loadAvailableSemesters = async () => {
    try { const res = await api.get('/api/faculty/semesters'); setAvailableSemesters(res.data) } catch { /* ignore */ }
  }

  const loadMySubjectAssignments = async () => {
    setSubjectAssignmentsLoading(true)
    try { const res = await api.get('/api/faculty/subject-assignments'); setMySubjectAssignments(res.data) }
    catch { /* ignore */ } finally { setSubjectAssignmentsLoading(false) }
  }

  const handleAssignSubject = async () => {
    if (!newCourseName.trim() || !selectedSemesterId) return
    setSubjectAssignmentsLoading(true)
    try {
      const res = await api.post('/api/faculty/subject-assignments', { courseName: newCourseName.trim(), semesterId: parseInt(selectedSemesterId) })
      const studentCount = res.data?.studentCount ?? 0
      const yearLabel = res.data?.yearLabel || targetYearLabel(res.data?.year)
      const sectionCount = res.data?.sectionCount ?? 0
      setNewCourseName('')
      setSelectedSemesterId('')
      await Promise.all([loadMySubjectAssignments(), fetchSections()])
      showMsg(studentCount > 0
        ? `Subject assigned — ${studentCount} ${yearLabel} students loaded into ${sectionCount} section${sectionCount === 1 ? '' : 's'}. Open the subject under My Sections to manage them.`
        : `Subject assigned, but no ${yearLabel} students were found in your department yet.`)
    } catch (err) { showMsg(err.response?.data?.message || 'Failed to assign subject', 'error') }
    finally { setSubjectAssignmentsLoading(false) }
  }

  const handleRemoveSubjectAssignment = async (assignmentId) => {
    setSubjectAssignmentsLoading(true)
    try {
      await api.delete(`/api/faculty/subject-assignments/${assignmentId}`)
      showMsg('Subject assignment removed')
      loadMySubjectAssignments()
      fetchSections()
    } catch (err) { showMsg(err.response?.data?.message || 'Failed to remove assignment', 'error') }
    finally { setSubjectAssignmentsLoading(false) }
  }

  useEffect(() => {
    if (activeTab === 'subjectAssignments') {
      loadAvailableCourses()
      loadAvailableSemesters()
      loadMySubjectAssignments()
    }
  }, [activeTab])

  const navSections = [
    { items: GLOBAL_NAV },
    {
      title: 'My Sections',
      items: sections.map(sec => ({ id: `section-${sec.sectionId}`, label: sec.courseName, icon: Layers, meta: `Sec ${sec.sectionName} · ${targetYearLabel(sec.year)}` })),
    },
  ]
  const sidebarActive = selectedSection ? `section-${selectedSection.sectionId}` : activeTab
  const handleSidebarNav = (id) => {
    if (id.startsWith('section-')) {
      const sec = sections.find(s => s.sectionId === Number(id.slice(8)))
      if (sec) handleSectionSelect(sec)
    } else {
      handleGlobalNav(id)
    }
  }
  const totalStudents = sections.reduce((a, s) => a + (s.enrolledStudents || 0), 0)

  const renderContent = () => {
    if (!selectedSection) {
      switch (activeTab) {
        case 'overview': return <OverviewTab sections={sections} overviewData={overviewData} onSectionSelect={handleSectionSelect} />
        case 'subjectAssignments': return <SubjectAssignmentsTab courses={availableCourses} semesters={availableSemesters} myAssignments={mySubjectAssignments} loading={subjectAssignmentsLoading} onAssign={handleAssignSubject} onRemove={handleRemoveSubjectAssignment} selectedSemesterId={selectedSemesterId} setSelectedSemesterId={setSelectedSemesterId} courseName={newCourseName} setCourseName={setNewCourseName} />
        case 'questionPapers': return <QuestionPapersTab sections={sections} examType={qpExamType} setExamType={setQpExamType} year={qpYear} setYear={setQpYear} targetYear={qpTargetYear} setTargetYear={setQpTargetYear} fileName={qpFileName} setFileName={setQpFileName} selectedSectionId={qpSelectedSectionId} setSelectedSectionId={setQpSelectedSectionId} onSubmit={handleUploadQP} papers={myQuestionPapers} loading={loading} uploadFileLoading={uploadFileLoading} />
        case 'facultyDirectory': return <FacultyDirectoryTab faculty={facultyDirectory} onDownload={handleDownload} accent="violet" />
        case 'notices': return <NoticesTab title={noticeTitle} setTitle={setNoticeTitle} message={noticeMessage} setMessage={setNoticeMessage} type={noticeType} setType={setNoticeType} targetYear={noticeTargetYear} setTargetYear={setNoticeTargetYear} departmentName={facultyDepartmentName} onSubmit={handleDraftNotice} sentNotices={sentNotices} loading={loading} />
        case 'settings': return <SettingsTab showMsg={showMsg} accent="violet" />
        case 'help': return <HelpTab accent="violet" />
        case 'invigilations': return <InvigilationsTab showMsg={showMsg} />
        default: return null
      }
    }

    switch (activeTab) {
      case 'attendance': return <AttendanceTab attendanceDate={attendanceDate} setAttendanceDate={setAttendanceDate} attendanceRecords={attendanceRecords} toggleAttendance={toggleAttendance} onSubmit={handleMarkAttendance} loading={loading} />
      case 'internalMarks': return <InternalMarksTab examName={examName} setExamName={setExamName} maxMarks={maxMarks} setMaxMarks={setMaxMarks} marksEntries={marksEntries} setMarksEntries={setMarksEntries} onSubmit={handleUploadInternalMarks} sectionMarks={sectionMarks} loading={loading} />
      case 'semesterMarks': return <SemesterMarksTab semMaxMarks={semMaxMarks} setSemMaxMarks={setSemMaxMarks} semMarksEntries={semMarksEntries} setSemMarksEntries={setSemMarksEntries} onSubmit={handleUploadSemesterMarks} sectionMarks={semesterMarks} loading={loading} />
      case 'studentPerformance': return <StudentPerformanceTab data={studentPerformance} loading={tabLoading} />
      case 'assignments': return <AssignmentsTab title={assignmentTitle} setTitle={setAssignmentTitle} desc={assignmentDesc} setDesc={setAssignmentDesc} dueDate={assignmentDueDate} setDueDate={setAssignmentDueDate} maxMarks={assignmentMaxMarks} setMaxMarks={setAssignmentMaxMarks} targetYear={assignmentTargetYear} setTargetYear={setAssignmentTargetYear} onSubmit={handleCreateAssignment} assignments={sectionAssignments} loading={loading} onDownload={handleDownload} showMsg={showMsg} />
      case 'assignmentMarks': return <AssignmentMarksTab assignments={sectionAssignments} selectedAssignmentId={assignmentMarksAssignmentId} setSelectedAssignmentId={handleAssignmentMarksSelect} entries={assignmentMarksEntries} setEntries={setAssignmentMarksEntries} onSubmit={handleUploadAssignmentMarks} sectionMarks={assignmentMarksRecorded} loading={loading} />
      case 'materials': return <MaterialsTab title={materialTitle} setTitle={setMaterialTitle} desc={materialDesc} setDesc={setMaterialDesc} type={materialType} setType={setMaterialType} targetYear={materialTargetYear} setTargetYear={setMaterialTargetYear} onSubmit={handleCreateMaterial} materials={sectionMaterials} loading={loading} onDownload={handleDownload} />
      case 'analytics': return <AnalyticsTab analytics={analytics} loading={tabLoading} />
      default: return null
    }
  }

  return (
    <div className="min-h-screen portal-bg">
      <Toast message={message} onClose={() => setMessage({ text: '', type: '' })} />
      <PortalSidebar
        collapsed={collapsed} onToggle={() => setCollapsed(c => !c)}
        navSections={navSections} activeTab={sidebarActive} onTabChange={handleSidebarNav}
        accent="violet" portalLabel="Faculty Portal"
        note={sections.length > 0 ? `${sections.length} sections · ${totalStudents} students assigned` : 'No sections assigned yet'}
      />
      <PortalTopbar
        sidebarWidth={sidebarWidth} accent="violet"
        user={{ name: 'Faculty User', role: 'Faculty', email }}
        placeholder="Search students, courses, papers..."
        onLogout={async () => { await authService.logout(); navigate('/login') }}
      />

      <main className="main-content" style={{ marginLeft: sidebarWidth }}>
        <div className="p-5 md:p-7 max-w-[1700px] mx-auto">
          {selectedSection && (
            <SectionHeader
              section={selectedSection}
              activeTab={activeTab}
              onTabChange={handleTabChange}
              onBack={() => { setSelectedSection(null); setActiveTab('overview') }}
            />
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeTab}-${selectedSection?.sectionId}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
