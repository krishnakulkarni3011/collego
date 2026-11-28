import { useState, useEffect, useCallback, useRef } from 'react'
import { confirmAction } from '../components/common/ConfirmDialog.jsx'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, BookOpen, ClipboardCheck, ClipboardList, FileText,
  Megaphone, ChevronRight, GraduationCap, Users, BookMarked,
  FolderOpen, Plus, CheckCircle2, X, Send,
  ArrowLeft, Clock, Upload, Download, RefreshCw, Layers,
  BookUser, Settings, HelpCircle, CalendarDays, Eye, Paperclip, Trash2,
  Crown, CalendarOff, Briefcase, ListTodo, ShieldCheck, Newspaper
} from 'lucide-react'
import { authService } from '../services/authService'
import api from '../services/api'
import { downloadFile, fileObjectUrl, previewFile } from '../lib/download'
import { SettingsTab } from '../components/dashboard/SettingsTab'
import { HelpTab } from '../components/dashboard/HelpTab'
import { InvigilationsTab } from '../components/dashboard/InvigilationsTab'
import { CareerProfileTab } from '../components/dashboard/CareerProfileTab'
import { GraduatedStudentsTab } from '../components/dashboard/GraduatedStudentsTab'
import { EventBox } from '../components/dashboard/EventBox.jsx'
import { cn } from '../lib/utils'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import {
  PortalSidebar, PortalTopbar, Toast, StatCard, Panel, PageTitle,
  WelcomeBanner, EmptyState, Spinner, ACCENTS, FadedImage, ImageStrip,
} from '../components/dashboard/PortalUI'
import { uiImages } from '../assets/uiImages'
import welcomeFaculty from '../assets/ui/welcome-faculty.webp'
import { timeAgo } from '../lib/time'

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'â€”'
const fmtNum = (n, dp = 2) => (n == null ? 'â€”' : Number(n).toFixed(dp))
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

// â”€â”€â”€ Nav config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const GLOBAL_NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'subjectAssignments', label: 'My Subject Assignments', icon: BookUser },
  { id: 'questionPapers', label: 'Question Papers', icon: FileText },
  { id: 'careerProfile', label: 'Career Profile', icon: Users },
  { id: 'placements', label: 'Upcoming Placements', icon: Briefcase },
  { id: 'invigilations', label: 'Invigilation Duties', icon: CalendarDays },
  { id: 'notices', label: 'Notices', icon: Megaphone },
  { id: 'newsletters', label: 'Newsletters', icon: Newspaper },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'help', label: 'Help & Support', icon: HelpCircle },
]

const NAV_CATEGORY = {
  notices: 'NOTICE',
  invigilations: 'INVIGILATION',
}

const SECTION_TABS = [
  { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
  { id: 'studentDetails', label: 'Student Details', icon: Users },
  { id: 'internalMarks', label: 'Internal Marks', icon: BookMarked },
  { id: 'studentPerformance', label: 'Student Performance', icon: Users },
  { id: 'assignments', label: 'Assignments', icon: BookOpen },
  { id: 'assignmentMarks', label: 'Assignment Marks', icon: ClipboardList },
  { id: 'materials', label: 'Materials', icon: FolderOpen },
]

// â”€â”€â”€ Overview â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function OverviewTab({ sections, overviewData, onSectionSelect, reminders = [], onCreateReminder, onToggleReminder, onDeleteReminder }) {
  const [reminderTitle, setReminderTitle] = useState('')
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
          <EmptyState icon={BookOpen} title="No sections assigned" accent="violet" description="Assign yourself a subject from My Subject Assignments to load your sections and students. If you already assigned one, reload the page." />
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

      <Panel title="My Tasks & Reminders" icon={ListTodo} accent="emerald" hover>
        <form onSubmit={async (e) => {
          e.preventDefault()
          const value = reminderTitle.trim()
          if (!value) return
          await onCreateReminder?.(value)
          setReminderTitle('')
        }} className="flex gap-2 mb-3">
          <input value={reminderTitle} onChange={e => setReminderTitle(e.target.value)} placeholder="Add a reminder or task..." className="collego-input flex-1 !py-2" />
          <Button type="submit" variant="gradient" size="sm" disabled={!reminderTitle.trim()}><Plus size={13} /> Add</Button>
        </form>
        {reminders.length === 0 ? (
          <EmptyState icon={ListTodo} title="No reminders yet" accent="emerald" description="Add your first personal task above." />
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {reminders.map(r => (
              <div key={r.id} className="flex items-center gap-3 p-2 rounded-xl border border-white/60 bg-white/70">
                <button type="button" onClick={() => onToggleReminder?.(r.id)} aria-label={r.completed ? 'Mark pending' : 'Mark complete'}
                  className={cn('w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center', r.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-emerald-500')}>
                  {r.completed && <CheckCircle2 size={12} />}
                </button>
                <p className={cn('text-xs flex-1 min-w-0 truncate', r.completed ? 'line-through text-slate-400' : 'text-slate-700')}>{r.title}</p>
                <button type="button" onClick={() => onDeleteReminder?.(r.id)} aria-label="Delete" className="text-slate-300 hover:text-red-500"><Trash2 size={13} /></button>
              </div>
            ))}
            <p className="text-[10px] text-slate-400">
              {reminders.filter(r => !r.completed).length} pending · {reminders.filter(r => r.completed).length} completed
            </p>
          </div>
        )}
      </Panel>

      <EventBox accent="violet" />

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

// â”€â”€â”€ Section Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function SectionHeader({ section, activeTab, onTabChange, onBack }) {
  const headerImage = {
    attendance: uiImages.classroom,
    studentDetails: uiImages.groupStudy,
    internalMarks: uiImages.graduation,
    studentPerformance: uiImages.groupStudy,
    assignments: uiImages.groupStudy,
    materials: uiImages.library,
    }[activeTab]

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="p-2 rounded-xl text-slate-400 hover:text-violet-600 hover:bg-white/60 transition-all">
          <ArrowLeft size={15} />
        </button>
        <h2 className="text-lg font-bold text-slate-900">{section.courseName}</h2>
        <Badge variant="purple" className="text-[10px] px-2.5 py-0.5">{section.courseCode}</Badge>
        <p className="text-xs text-slate-400 ml-3 hidden sm:block">{section.sectionName} Â· {section.semesterName} Â· {section.enrolledStudents} students</p>
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

// â”€â”€â”€ Attendance Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function AttendanceTab({
  attendanceDate, setAttendanceDate, attendanceRecords, toggleAttendance, onSubmit, loading,
  holiday, holidays = [], holidayBusy, onDeclareHoliday, onRemoveHoliday,
}) {
  const present = attendanceRecords.filter(r => r.status === 'PRESENT').length
  const absent = attendanceRecords.length - present
  const pct = attendanceRecords.length > 0 ? Math.round((present / attendanceRecords.length) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <input type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} className="collego-input !w-auto" />
        {!holiday && (
          <>
            <Button variant="success" size="sm" onClick={() => attendanceRecords.forEach((_, i) => toggleAttendance(i, 'PRESENT'))} className="px-4">
              <CheckCircle2 size={13} /> All Present
            </Button>
            <Button variant="destructive" size="sm" onClick={() => attendanceRecords.forEach((_, i) => toggleAttendance(i, 'ABSENT'))} className="px-4">
              <X size={13} /> All Absent
            </Button>
            <Button variant="outline" size="sm" onClick={onDeclareHoliday} disabled={holidayBusy} className="px-4">
              {holidayBusy ? <RefreshCw size={13} className="animate-spin" /> : <CalendarOff size={13} />} Declare Holiday
            </Button>
          </>
        )}
        <div className="ml-auto flex items-center gap-3 text-xs">
          <span className="text-emerald-600 font-bold">{present} Present</span>
          <span className="text-red-500 font-bold">{absent} Absent</span>
          <span className="text-slate-400">/ {attendanceRecords.length} total</span>
        </div>
      </div>

      {holiday ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 flex flex-wrap items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <CalendarOff size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-amber-900">Holiday declared for {fmtDate(attendanceDate)}</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Attendance is not counted for this day.
              {holiday.note ? ` ${holiday.note}` : ''}
              {holiday.declaredBy ? ` Â· Declared by ${holiday.declaredBy}` : ''}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => onRemoveHoliday(holiday.id)} disabled={holidayBusy}>
            <Trash2 size={12} /> Remove Holiday
          </Button>
        </div>
      ) : (
        <>
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
                          {r.status === 'PRESENT' ? 'âœ“ Present' : 'âœ— Absent'}
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
        </>
      )}

      {holidays.length > 0 && (
        <div className="glass-card overflow-hidden border border-white/60">
          <div className="px-5 py-4 border-b border-white/50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <CalendarOff size={14} className="text-amber-500" /> Declared Holidays
            </h3>
            <span className="text-[10px] text-slate-400">{holidays.length} total</span>
          </div>
          <div className="divide-y divide-white/30">
            {holidays.slice(0, 10).map(h => (
              <div key={h.id} className="px-5 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">{fmtDate(h.date)}</p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {h.note || 'Declared as a holiday'}{h.declaredBy ? ` Â· ${h.declaredBy}` : ''}
                  </p>
                </div>
                <button onClick={() => onRemoveHoliday(h.id)} disabled={holidayBusy}
                  className="text-[11px] font-semibold text-red-500 hover:underline disabled:opacity-50">Remove</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// â”€â”€â”€ Internal Marks Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function StudentDetailsTab({ section, onDownload, loading }) {
  return (
    <div className="space-y-6">
      <div className="glass-card p-6 border border-white/60 flex flex-col sm:flex-row sm:items-center gap-5">
        <div className="w-14 h-14 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
          <Users size={24} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold text-slate-900">Student details â€” {section.courseName}</h3>
          <p className="text-sm text-slate-500 mt-1">
            Download the PDF roster for Section {section.sectionName} ({section.semesterName}, {section.enrolledStudents} students).
          </p>
        </div>
        <Button variant="gradient" onClick={() => onDownload(section)} disabled={loading} className="shrink-0">
          {loading
            ? <><RefreshCw size={14} className="animate-spin" /> Preparing...</>
            : <><Download size={14} /> Download PDF</>}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass-card p-5 border border-white/60">
          <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <ClipboardList size={14} className="text-violet-600" /> Included in the PDF
          </h4>
          <ul className="space-y-2 text-xs text-slate-500">
            {['Enrollment number and student name', 'Email address and phone number', 'Department, semester and academic year', 'Section, admission year and CR status'].map(item => (
              <li key={item} className="flex items-start gap-2">
                <CheckCircle2 size={12} className="text-emerald-500 mt-0.5 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="glass-card p-5 border border-white/60">
          <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <BookOpen size={14} className="text-violet-600" /> Section summary
          </h4>
          <div className="space-y-2 text-xs text-slate-500">
            <p><span className="font-semibold text-slate-700">Course:</span> {section.courseName} ({section.courseCode})</p>
            <p><span className="font-semibold text-slate-700">Section:</span> {section.sectionName}</p>
            <p><span className="font-semibold text-slate-700">Semester:</span> {section.semesterName}</p>
            <p><span className="font-semibold text-slate-700">Students:</span> {section.enrolledStudents}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function UpcomingPlacementsTab({ placements, loading, onRefresh }) {
  return (
    <div className="space-y-6">
      <PageTitle
        icon={Briefcase}
        title="Upcoming Placements"
        subtitle="Active placement drives shared by the placement cell."
        accent="violet"
        image={uiImages.graduation}
        imageAlt="Graduation celebration"
        actions={
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
            {loading ? <RefreshCw size={12} className="animate-spin" /> : <RefreshCw size={12} />} Refresh
          </Button>
        }
      />

      <div className="glass-card overflow-hidden border border-white/60">
        <div className="overflow-x-auto">
          <table className="collego-table">
            <thead>
              <tr>
                <th>Drive Title</th>
                <th>Company</th>
                <th>Salary / Package</th>
                <th>Drive Date</th>
                <th>Department</th>
                <th>Eligibility Criteria</th>
              </tr>
            </thead>
            <tbody>
              {placements.map((drive, index) => (
                <tr key={`${drive.companyName}-${drive.driveDate}-${index}`} className="hover:bg-white/30 transition-colors">
                  <td className="font-medium text-slate-800">{drive.title || 'â€”'}</td>
                  <td className="text-slate-700">{drive.companyName || 'â€”'}</td>
                  <td className="text-slate-700">{drive.packageOffered || 'â€”'}</td>
                  <td className="text-slate-700 whitespace-nowrap">{drive.driveDate ? fmtDate(drive.driveDate) : 'â€”'}</td>
                  <td><Badge variant="info">{drive.departmentName || 'All Departments'}</Badge></td>
                  <td className="text-slate-600 max-w-[300px] whitespace-normal">{drive.eligibilityCriteria || 'â€”'}</td>
                </tr>
              ))}
              {!loading && placements.length === 0 && (
                <tr><td colSpan={6} className="text-center text-slate-400 py-14">No upcoming placement drives.</td></tr>
              )}
              {loading && (
                <tr><td colSpan={6} className="text-center text-slate-400 py-14">Loading upcoming placements...</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

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
                        className="w-20 text-center collego-input py-1 text-sm" placeholder="â€”" />
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

// â”€â”€â”€ Assignment Marks Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
                                className="w-20 text-center collego-input py-1 text-sm" placeholder="â€”" />
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

// â”€â”€â”€ Student Performance Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
                      <td style={{ textAlign: 'center' }}>{attPct != null ? <AttBadge pct={attPct} /> : <span className="text-slate-300">â€”</span>}</td>
                      <td style={{ textAlign: 'center', color: '#7c3aed' }}>{s.ia1ObtainedMarks ?? 'â€”'}</td>
                      <td style={{ textAlign: 'center', color: '#7c3aed' }}>{s.ia2ObtainedMarks ?? 'â€”'}</td>
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

// â”€â”€â”€ Assignments Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ Assignment Submissions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
        <Users size={12} /> Submissions ({assignment.submissionCount ?? 0}){graded > 0 ? ` Â· ${graded} graded` : ''}
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
            {row.fileName && <span className="ml-2">Â· {row.fileName}</span>}
          </p>
          {row.note && <p className="text-xs text-slate-500 mt-1">â€œ{row.note}â€</p>}
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

// â”€â”€â”€ Materials Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
                    <td className="text-slate-500 text-xs max-w-xs truncate">{m.description || 'â€”'}</td>
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

// â”€â”€â”€ Question Papers Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ Notices Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function NoticesTab({ title, setTitle, message, setMessage, type, setType, targetYear, setTargetYear, departmentName, onSubmit, sentNotices, loading, inbox = [] }) {
  const TYPE_OPTIONS = ['GENERAL', 'ACADEMIC', 'PLACEMENT', 'EXAM']
  const [attachmentError, setAttachmentError] = useState('')

  const openAttachment = async (n) => {
    setAttachmentError('')
    try {
      await previewFile(`/api/notifications/${n.id}/attachment`, n.attachmentFileName || 'attachment')
    } catch (err) {
      setAttachmentError(err.response?.data?.message || 'Could not open the attachment.')
    }
  }

  const saveAttachment = async (n) => {
    setAttachmentError('')
    try {
      await downloadFile(`/api/notifications/${n.id}/attachment?download=true`, n.attachmentFileName || 'attachment')
    } catch (err) {
      setAttachmentError(err.response?.data?.message || 'Could not download the attachment.')
    }
  }

  return (
    <div className="space-y-6">
      <PageTitle icon={Megaphone} title="Notices" subtitle="Send announcements to students in a selected year of your department and read messages sent to you." accent="amber" image={uiImages.placementTalk} imageAlt="Placement talk" />
      {attachmentError && <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-600">{attachmentError}</div>}
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
      {inbox.length > 0 && (
        <div className="glass-card overflow-hidden border border-white/60">
          <div className="px-5 py-4 border-b border-white/50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Inbox</h3>
            <span className="text-[10px] text-slate-400">Messages sent to you</span>
          </div>
          <div className="divide-y divide-white/30">
            {inbox.map(n => (
              <div key={n.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{n.title}</p>
                    <p className="text-xs text-slate-500 mt-1">{n.message}</p>
                    {n.hasAttachment && (
                      <div className="mt-2.5 inline-flex flex-wrap items-center gap-2 rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-2">
                        <Paperclip size={12} className="text-amber-600 shrink-0" />
                        <span className="text-[11px] font-medium text-slate-600 truncate max-w-[220px]">{n.attachmentFileName || 'Attachment'}</span>
                        <button onClick={() => openAttachment(n)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:underline"><Eye size={11} /> View</button>
                        <button onClick={() => saveAttachment(n)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:underline"><Download size={11} /> Download</button>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 shrink-0">{timeAgo(n.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
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

// â”€â”€â”€ Subject Assignments Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function SubjectAssignmentsTab({ courses, semesters, myAssignments, loading, onAssign, onRemove,
  selectedSemesterId, setSelectedSemesterId, courseName, setCourseName, courseCode, setCourseCode,
  credits, setCredits, sectionFilter, setSectionFilter, onOpenElective, openElectiveLoading }) {
  const selectedSemester = semesters.find(s => String(s.id) === String(selectedSemesterId))
  const selectedYear = semesterYear(selectedSemester?.number)

  const [departments, setDepartments] = useState([])
  const [targetDepartmentId, setTargetDepartmentId] = useState('')
  const [particularStudents, setParticularStudents] = useState([])
  const [particularSelected, setParticularSelected] = useState([])
  const [particularQuery, setParticularQuery] = useState('')
  const [particularLoading, setParticularLoading] = useState(false)

  const [oeCourseName, setOeCourseName] = useState('')
  const [oeCredits, setOeCredits] = useState('4')
  const [oeSemesterId, setOeSemesterId] = useState('')
  const [oeCourseCode, setOeCourseCode] = useState('')
  const [oeDepartmentIds, setOeDepartmentIds] = useState([])
  const [oeStudents, setOeStudents] = useState([])
  const [oeSelected, setOeSelected] = useState([])
  const [oeQuery, setOeQuery] = useState('')
  const [oeLoadingStudents, setOeLoadingStudents] = useState(false)

  useEffect(() => {
    api.get('/api/departments')
      .then(res => setDepartments(Array.isArray(res.data) ? res.data : []))
      .catch(() => setDepartments([]))
  }, [])

  useEffect(() => {
    if (!targetDepartmentId) {
      setParticularStudents([])
      setParticularSelected([])
      return
    }
    setParticularLoading(true)
    api.get(`/api/faculty/departments/${targetDepartmentId}/students`)
      .then(res => {
        setParticularStudents(Array.isArray(res.data) ? res.data : [])
      })
      .catch(() => setParticularStudents([]))
      .finally(() => setParticularLoading(false))
    setParticularSelected([])
  }, [targetDepartmentId])

  useEffect(() => {
    setOeLoadingStudents(true)
    api.get('/api/faculty/all-students')
      .then(res => setOeStudents(Array.isArray(res.data) ? res.data : []))
      .catch(() => setOeStudents([]))
      .finally(() => setOeLoadingStudents(false))
  }, [])

  const toggleOeDepartment = (id) => {
    setOeDepartmentIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    setOeSelected([])
  }

  const filterStudents = (list, query) => {
    if (!query.trim()) return list
    const q = query.toLowerCase()
    return list.filter(s =>
      (s.name || '').toLowerCase().includes(q) ||
      (s.enrollmentNumber || '').toLowerCase().includes(q))
  }

  const toggle = (id, selected, setter) =>
    setter(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const filteredParticular = filterStudents(particularStudents, particularQuery)
  const filteredOe = filterStudents(
    oeStudents.filter(s => oeDepartmentIds.length === 0 || oeDepartmentIds.includes(s.departmentId)),
    oeQuery
  )

  return (
    <div className="space-y-6">
      <PageTitle icon={BookUser} title="My Subject Assignments" subtitle="Assign a subject, choose a semester and optionally load only a section or particular students." accent="violet"
        image={uiImages.campus} imageAlt="College campus"
        actions={<Badge variant="purple">Full Independence</Badge>} />

      <div className="glass-card p-6 border border-white/60">
        <h3 className="text-sm font-semibold text-slate-800 mb-5 flex items-center gap-2"><Plus size={14} className="text-violet-500" /> Assign New Subject</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Course Name</label>
            <input value={courseName} onChange={e => setCourseName(e.target.value)}
              placeholder="e.g. Machine Learning" className="collego-input" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Subject Code</label>
            <input value={courseCode} onChange={e => setCourseCode(e.target.value.toUpperCase())}
              placeholder="e.g. CSE301" maxLength={30} className="collego-input" />
            <p className="text-[10px] text-slate-400 mt-1">Leave blank to generate automatically.</p>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Credits</label>
            <input type="number" min="1" max="12" step="1" value={credits}
              onChange={e => setCredits(e.target.value)} placeholder="4" className="collego-input" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Section</label>
            <select value={sectionFilter} onChange={e => setSectionFilter(e.target.value)} className="collego-input">
              <option value="">All Sections</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </select>
            <p className="text-[10px] text-slate-400 mt-1">Load students of this section from the selected semester.</p>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Semester</label>
            <select value={selectedSemesterId} onChange={e => setSelectedSemesterId(e.target.value)} className="collego-input">
              <option value="">Select semester</option>
              {semesters.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.academicYear})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Department</label>
            <select value={targetDepartmentId} onChange={e => setTargetDepartmentId(e.target.value)} className="collego-input">
              <option value="">My Department</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-white/60 bg-white/50 p-3">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Semester to Academic Year</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SEMESTER_YEAR_MAP.map(item => (
              <div key={item.year} className={cn(
                'rounded-lg border px-2.5 py-2 text-center transition-colors',
                selectedYear === item.year ? 'border-violet-200 bg-violet-50' : 'border-white/70 bg-white/60'
              )}>
                <p className="text-[10px] text-slate-400">{item.semesters}</p>
                <p className={cn('text-xs font-semibold mt-0.5', selectedYear === item.year ? 'text-violet-700' : 'text-slate-700')}>{targetYearLabel(item.year)}</p>
              </div>
            ))}
          </div>
        </div>

        {targetDepartmentId && (
          <div className="mt-5 rounded-xl border border-violet-100 bg-violet-50/40 p-4">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Load particular students (backlog) - {particularSelected.length} selected
            </p>
            <input value={particularQuery} onChange={e => setParticularQuery(e.target.value)}
              placeholder="Search by name or USN" className="collego-input mb-2" />
            <div className="max-h-48 overflow-y-auto rounded-xl border border-white/60 bg-white/70 divide-y divide-white/50">
              {particularLoading ? (
                <div className="p-4 text-center text-xs text-slate-400">Loading students...</div>
              ) : filteredParticular.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">No students in this department.</div>
              ) : filteredParticular.map(s => (
                <label key={s.studentId} className="flex items-center gap-3 px-3 py-2 hover:bg-white cursor-pointer">
                  <input type="checkbox" checked={particularSelected.includes(s.studentId)}
                    onChange={() => toggle(s.studentId, particularSelected, setParticularSelected)}
                    className="rounded w-4 h-4 cursor-pointer" />
                  <span className="min-w-0 flex-1">
                    <span className="text-xs font-semibold text-slate-700 block truncate">{s.name}</span>
                    <span className="text-[10px] text-slate-400">{s.enrollmentNumber} - {s.departmentName}</span>
                  </span>
                </label>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-2">If none are selected, all students of the semester and section are loaded.</p>
          </div>
        )}

        <Button variant="gradient" size="sm" className="mt-5 px-5"
          onClick={() => onAssign({
            courseName: courseName.trim(), courseCode: courseCode.trim(), credits: Number(credits),
            semesterId: parseInt(selectedSemesterId), sectionFilter,
            departmentId: targetDepartmentId ? parseInt(targetDepartmentId) : undefined,
            studentIds: particularSelected,
          })}
          disabled={loading || !courseName.trim() || !selectedSemesterId || !Number(credits)}>
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
                  <p className="text-xs text-slate-400 mt-1">{a.courseCode} - {a.credits ?? 4} credits</p>
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

      <div className="glass-card p-6 border border-white/60">
        <h3 className="text-sm font-semibold text-slate-800 mb-1 flex items-center gap-2">
          <Layers size={15} className="text-violet-500" /> Open Elective Subject
        </h3>
        <p className="text-[11px] text-slate-400 mb-5">
          Add an elective and pick students from one or more departments.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Subject Name</label>
            <input value={oeCourseName} onChange={e => setOeCourseName(e.target.value)}
              placeholder="e.g. Cyber Security" className="collego-input" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Subject Code</label>
            <input value={oeCourseCode} onChange={e => setOeCourseCode(e.target.value.toUpperCase())}
              placeholder="e.g. OE301" maxLength={30} className="collego-input" />
            <p className="text-[10px] text-slate-400 mt-1">Leave blank to generate.</p>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Credits</label>
            <input type="number" min="1" max="12" value={oeCredits}
              onChange={e => setOeCredits(e.target.value)} className="collego-input" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Semester</label>
            <select value={oeSemesterId} onChange={e => setOeSemesterId(e.target.value)} className="collego-input">
              <option value="">Select semester</option>
              {semesters.map(s => <option key={s.id} value={s.id}>{s.name} ({s.academicYear})</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Departments</label>
            <div className="max-h-28 overflow-y-auto rounded-xl border border-white/60 bg-white/60 p-2 space-y-1">
              {departments.map(d => (
                <label key={d.id} className="flex items-center gap-2 text-[11px] text-slate-600 cursor-pointer hover:text-slate-900">
                  <input type="checkbox" checked={oeDepartmentIds.includes(d.id)}
                    onChange={() => toggleOeDepartment(d.id)} className="rounded w-3.5 h-3.5 cursor-pointer" />
                  <span className="truncate">{d.name}</span>
                </label>
              ))}
              {departments.length === 0 && <p className="text-[10px] text-slate-400">No departments available.</p>}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
            Students from selected departments - {oeSelected.length} selected
          </label>
          <input value={oeQuery} onChange={e => setOeQuery(e.target.value)}
            placeholder="Search by name or USN" className="collego-input mb-3" />
          <div className="max-h-64 overflow-y-auto rounded-xl border border-white/60 bg-white/50 divide-y divide-white/50">
            {oeLoadingStudents ? (
              <div className="p-6 text-center text-xs text-slate-400">Loading students...</div>
            ) : oeDepartmentIds.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">Select at least one department above.</div>
            ) : filteredOe.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">No students found in selected departments.</div>
            ) : filteredOe.map(s => (
              <label key={s.studentId} className="flex items-center gap-3 px-3 py-2 hover:bg-white/70 cursor-pointer">
                <input type="checkbox" checked={oeSelected.includes(s.studentId)}
                  onChange={() => toggle(s.studentId, oeSelected, setOeSelected)}
                  className="rounded w-4 h-4 cursor-pointer" />
                <span className="min-w-0 flex-1">
                  <span className="text-xs font-semibold text-slate-700 block truncate">{s.name}</span>
                  <span className="text-[10px] text-slate-400">{s.enrollmentNumber} - {s.departmentName}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <Button variant="gradient" size="sm" className="mt-4 px-5"
          disabled={openElectiveLoading || !oeCourseName.trim() || !oeSemesterId || oeDepartmentIds.length === 0 || !Number(oeCredits) || oeSelected.length === 0}
          onClick={() => onOpenElective({
            courseName: oeCourseName.trim(), courseCode: oeCourseCode.trim(),
            semesterId: parseInt(oeSemesterId), credits: Number(oeCredits),
            departmentIds: oeDepartmentIds, studentIds: oeSelected,
          })}>
          {openElectiveLoading ? <><RefreshCw size={14} className="animate-spin" /> Creating...</> : <><Plus size={13} /> Create Open Elective &amp; Add Students</>}
        </Button>
        <p className="text-[10px] text-slate-400 mt-2">
          Open elective subjects do not create visible sections. Students are added directly to the elective.
        </p>
      </div>

    </div>
  )
}

// â”€â”€â”€ HoD Class Representatives â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function HodClassRepresentativesTab({ showMsg }) {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [year, setYear] = useState('')
  const [section, setSection] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/api/faculty/hod/cr/students')
      setStudents(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load students.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const years = [...new Set(students.map(s => s.year).filter(Boolean))].sort((a, b) => a - b)
  const sectionOptions = [...new Set(students
    .filter(s => !year || String(s.year) === String(year))
    .map(s => s.section)
    .filter(Boolean))].sort()
  const filtered = students.filter(s =>
    (!year || String(s.year) === String(year)) && (!section || s.section === section))
  const currentCrs = filtered.filter(s => s.isCr)

  const assign = async (student) => {
    setBusyId(student.studentId)
    try {
      await api.put(`/api/faculty/hod/cr/${student.studentId}`)
      showMsg(`${student.name} is now the CR for ${student.yearLabel} Â· Section ${student.section}`)
      await load()
    } catch (err) {
      showMsg(err.response?.data?.message || 'Could not choose CR', 'error')
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (student) => {
    if (!await confirmAction({ title: 'Are you sure?', message: `Remove ${student.name} as class representative?`, confirmLabel: 'Confirm' })) return
    setBusyId(student.studentId)
    try {
      await api.delete(`/api/faculty/hod/cr/${student.studentId}`)
      showMsg('Class representative removed')
      await load()
    } catch (err) {
      showMsg(err.response?.data?.message || 'Could not remove CR', 'error')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageTitle icon={Crown} title="Class Representatives" accent="violet"
        subtitle="Choose one CR for each year and section in your department." />

      <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-4 flex items-start gap-3">
        <Crown size={18} className="text-violet-500 mt-0.5 shrink-0" />
        <p className="text-xs text-violet-800 leading-relaxed">
          A class can have one CR. Choosing a new CR automatically replaces the previous CR for that year and section.
          The selected student will see the CR badge in their portal.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select value={year} onChange={e => { setYear(e.target.value); setSection('') }} className="collego-input !w-auto">
          <option value="">All Years</option>
          {years.map(y => <option key={y} value={y}>{targetYearLabel(y)}</option>)}
        </select>
        <select value={section} onChange={e => setSection(e.target.value)} className="collego-input !w-auto">
          <option value="">All Sections</option>
          {sectionOptions.map(s => <option key={s} value={s}>Section {s}</option>)}
        </select>
        <div className="ml-auto flex items-center gap-4 text-xs">
          <span className="text-slate-400">{filtered.length} students</span>
          <span className="font-semibold text-violet-600">
            {currentCrs.length > 0 ? `CR: ${currentCrs.map(c => c.name).join(', ')}` : 'No CR selected'}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Spinner /></div>
      ) : error ? (
        <div className="glass-card p-6 border border-red-200 bg-red-50/60 text-sm text-red-600">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card border border-white/60">
          <EmptyState icon={Crown} title="No students found" accent="violet"
            description="Students in your department will appear here once they have a semester and section assigned." />
        </div>
      ) : (
        <div className="glass-card overflow-hidden border border-white/60">
          <div className="overflow-x-auto">
            <table className="collego-table">
              <thead><tr><th>Year</th><th>Section</th><th>Student</th><th>Enrollment</th><th style={{ textAlign: 'center' }}>CR</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.studentId} className="hover:bg-white/30 transition-colors">
                    <td><Badge variant="secondary">{s.yearLabel || targetYearLabel(s.year)}</Badge></td>
                    <td className="text-slate-600 font-medium">Section {s.section || 'â€”'}</td>
                    <td className="text-slate-800 font-medium">{s.name}</td>
                    <td><code className="text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded">{s.enrollmentNumber || 'â€”'}</code></td>
                    <td style={{ textAlign: 'center' }}>
                      {s.isCr ? <Badge variant="purple">CR</Badge> : <span className="text-slate-300">â€”</span>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {s.isCr ? (
                        <Button variant="outline" size="sm" onClick={() => remove(s)} disabled={busyId === s.studentId}>
                          <X size={12} /> Remove CR
                        </Button>
                      ) : (
                        <Button variant="gradient" size="sm" onClick={() => assign(s)} disabled={busyId === s.studentId}>
                          {busyId === s.studentId
                            ? <RefreshCw size={12} className="animate-spin" />
                            : <Crown size={12} />} Make CR
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

// â”€â”€â”€ HoD Class Timetables â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function HodTimetablesTab({ showMsg }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyKey, setBusyKey] = useState('')
  const [pending, setPending] = useState(null)
  const [preview, setPreview] = useState(null)
  const fileRef = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/api/faculty/hod/timetables')
      setRows(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load class timetables.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => () => { if (preview?.url) URL.revokeObjectURL(preview.url) }, [preview])

  const chooseFile = (row) => {
    setPending(row)
    if (fileRef.current) {
      fileRef.current.value = ''
      fileRef.current.click()
    }
  }

  const handleFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    const row = pending
    setPending(null)
    if (!file || !row) return
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      showMsg('Upload the timetable as a PDF', 'error')
      return
    }
    const key = `${row.year}-${row.sectionName}`
    setBusyKey(key)
    try {
      const fd = new FormData()
      fd.append('file', file)
      await api.post(`/api/faculty/hod/timetables?year=${row.year}&section=${encodeURIComponent(row.sectionName)}`, fd)
      if (preview?.id === row.id) {
        URL.revokeObjectURL(preview.url)
        setPreview(null)
      }
      showMsg(`Timetable uploaded for ${row.yearLabel} Â· Section ${row.sectionName}`)
      await load()
    } catch (err) {
      showMsg(err.response?.data?.message || 'Timetable upload failed', 'error')
    } finally {
      setBusyKey('')
    }
  }

  const openPreview = async (row) => {
    if (preview?.id === row.id) {
      URL.revokeObjectURL(preview.url)
      setPreview(null)
      return
    }
    try {
      const file = await fileObjectUrl(`/api/faculty/hod/timetables/${row.id}/file`)
      if (preview?.url) URL.revokeObjectURL(preview.url)
      setPreview({ id: row.id, url: file.url, title: `${row.yearLabel} Â· Section ${row.sectionName}` })
    } catch (err) {
      showMsg(err.response?.data?.message || 'Could not preview the timetable', 'error')
    }
  }

  const downloadRow = async (row) => {
    try {
      await downloadFile(`/api/faculty/hod/timetables/${row.id}/file?download=true`, row.fileName || 'class-timetable.pdf')
    } catch (err) {
      showMsg(err.response?.data?.message || 'Download failed', 'error')
    }
  }

  const removeRow = async (row) => {
    if (!await confirmAction({ title: 'Are you sure?', message: `Remove the timetable for ${row.yearLabel} Â· Section ${row.sectionName}?`, confirmLabel: 'Confirm' })) return
    setBusyKey(`${row.year}-${row.sectionName}`)
    try {
      await api.delete(`/api/faculty/hod/timetables/${row.id}`)
      showMsg('Timetable removed')
      if (preview?.id === row.id) { URL.revokeObjectURL(preview.url); setPreview(null) }
      await load()
    } catch (err) {
      showMsg(err.response?.data?.message || 'Could not remove the timetable', 'error')
    } finally {
      setBusyKey('')
    }
  }

  const years = [1, 2, 3, 4].map(year => ({
    year,
    label: targetYearLabel(year),
    rows: rows.filter(row => row.year === year),
  }))

  return (
    <div className="space-y-6">
      <PageTitle icon={CalendarDays} title="Class Timetables" subtitle="As Head of Department, upload the timetable for each section of each year in your department. Students in the matching class see it in their Timetable tab." accent="violet"
        image={uiImages.campus} imageAlt="College campus"
        actions={<Badge variant="purple">HoD Access</Badge>} />

      <input ref={fileRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={handleFile} />

      <div className="rounded-2xl border border-violet-100 bg-violet-50/60 px-4 py-3 flex items-start gap-3">
        <CalendarDays size={16} className="text-violet-500 mt-0.5 shrink-0" />
        <p className="text-xs text-violet-700 leading-relaxed">
          Upload a PDF for each section. Re-uploading replaces the previous file. Students only see the timetable for their own department, year and section.
        </p>
      </div>

      {error && <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-600">{error}</div>}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Spinner color="violet" /></div>
      ) : (
        <div className="space-y-6">
          {years.map(group => (
            <div key={group.year} className="glass-card overflow-hidden border border-white/60">
              <div className="px-5 py-4 border-b border-white/50 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">{group.label}</h3>
                <span className="text-[10px] text-slate-400">{group.rows.filter(r => r.hasFile).length}/{group.rows.length} sections uploaded</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-4">
                {group.rows.map(row => {
                  const key = `${row.year}-${row.sectionName}`
                  const busy = busyKey === key
                  return (
                    <div key={key} className="rounded-2xl border border-white/70 bg-white/70 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 shrink-0">
                            <Layers size={15} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800">Section {row.sectionName}</p>
                            <p className="text-[10px] text-slate-400 truncate">{row.hasFile ? `${row.fileName} Â· ${fmtDate(row.uploadedAt)}` : 'No timetable uploaded'}</p>
                          </div>
                        </div>
                        <Badge variant={row.hasFile ? 'success' : 'secondary'} className="text-[9px] px-2 py-0.5 shrink-0">{row.hasFile ? 'Uploaded' : 'Pending'}</Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Button variant={row.hasFile ? 'outline' : 'gradient'} size="sm" onClick={() => chooseFile(row)} disabled={busy} className="px-3">
                          {busy ? <><RefreshCw size={12} className="animate-spin" /> Uploading...</> : <><Upload size={12} /> {row.hasFile ? 'Replace PDF' : 'Upload PDF'}</>}
                        </Button>
                        {row.hasFile && (
                          <>
                            <button onClick={() => openPreview(row)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-600 hover:underline"><Eye size={12} /> {preview?.id === row.id ? 'Hide' : 'Preview'}</button>
                            <button onClick={() => downloadRow(row)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-600 hover:underline"><Download size={12} /> Download</button>
                            <button onClick={() => removeRow(row)} className="ml-auto p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors" title="Remove timetable"><Trash2 size={13} /></button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
                {group.rows.length === 0 && <p className="text-xs text-slate-400 p-2">No sections found for this year.</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {preview && (
        <div className="glass-card overflow-hidden border border-white/60">
          <div className="px-5 py-3 border-b border-white/50 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">Preview Â· {preview.title}</p>
            <button onClick={() => { URL.revokeObjectURL(preview.url); setPreview(null) }} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white transition-colors" title="Close preview"><X size={15} /></button>
          </div>
          <iframe src={preview.url} title="Class timetable preview" className="w-full h-[70vh] bg-white" />
        </div>
      )}
    </div>
  )
}

// â”€â”€â”€ Personal Reminders â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function FacultyNewslettersTab({ showMsg, isHod, onDownload }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/faculty/newsletters')
      setItems(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      showMsg(err.response?.data?.message || 'Could not load newsletters', 'error')
    } finally { setLoading(false) }
  }, [showMsg])

  useEffect(() => { load() }, [load])

  const upload = async (e) => {
    e.preventDefault()
    if (!title.trim() || !file || busy) return
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('title', title.trim())
      fd.append('file', file)
      await api.post('/api/faculty/hod/newsletters', fd)
      showMsg('Newsletter uploaded and shared with your department')
      setTitle('')
      setFile(null)
      await load()
    } catch (err) {
      showMsg(err.response?.data?.message || 'Could not upload newsletter', 'error')
    } finally { setBusy(false) }
  }

  return (
    <div className="space-y-6">
      <PageTitle icon={Newspaper} title="Department Newsletters" accent="emerald"
        subtitle="Newsletters shared by your Head of Department for this department." />

      {isHod && (
        <div className="glass-card p-6 border border-white/60">
          <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Plus size={15} className="text-emerald-500" /> Upload Newsletter
          </h3>
          <form onSubmit={upload} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div className="sm:col-span-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Quarterly Department Newsletter" className="collego-input" />
            </div>
            <div className="sm:col-span-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">File (PDF / Word)</label>
              <input type="file" accept=".pdf,.doc,.docx" onChange={e => setFile(e.target.files?.[0] || null)} className="collego-input" />
            </div>
            <Button type="submit" variant="gradient" disabled={busy || !title.trim() || !file}>
              {busy ? <><RefreshCw size={14} className="animate-spin" /> Uploading...</> : <><Upload size={14} /> Upload &amp; Share</>}
            </Button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16"><Spinner color="emerald" /></div>
      ) : items.length === 0 ? (
        <div className="glass-card p-12 border border-white/60">
          <EmptyState icon={Newspaper} title="No newsletters yet" accent="emerald" description="Department newsletters will appear here once uploaded." />
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(n => (
            <div key={n.id} className="glass-card p-5 border border-white/60 flex flex-wrap items-center gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800">{n.title}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {fmtDate(n.createdAt)} · {n.uploadedByName} · {n.fileName}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => onDownload(`/api/newsletters/${n.id}/file`, n.fileName || 'newsletter.pdf')}>
                <Download size={13} /> Download
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function HodResumeApprovalsTab({ showMsg }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [notes, setNotes] = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/faculty/hod/resumes/pending')
      setItems(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      showMsg(err.response?.data?.message || 'Could not load pending resumes', 'error')
    } finally { setLoading(false) }
  }, [showMsg])

  useEffect(() => { load() }, [load])

  const review = async (facultyId, approve) => {
    setBusyId(facultyId)
    try {
      await api.put(`/api/faculty/hod/resumes/${facultyId}/${approve ? 'approve' : 'reject'}`,
        approve ? undefined : { note: notes[facultyId] || '' })
      showMsg(approve ? 'Resume approved' : 'Resume rejected')
      await load()
    } catch (err) {
      showMsg(err.response?.data?.message || 'Could not review resume', 'error')
    } finally { setBusyId(null) }
  }

  return (
    <div className="space-y-6">
      <PageTitle icon={ShieldCheck} title="Resume Approvals" accent="violet"
        subtitle="Review resumes uploaded by faculty members of your department." />
      {loading ? (
        <div className="flex items-center justify-center py-16"><Spinner color="violet" /></div>
      ) : items.length === 0 ? (
        <div className="glass-card p-12 border border-white/60">
          <EmptyState icon={ShieldCheck} title="No resumes pending" accent="violet" description="Faculty uploads will appear here for your review." />
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(f => (
            <div key={f.id} className="glass-card p-5 border border-white/60 flex flex-wrap items-center gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800">{f.name}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{f.email} · {f.departmentName}</p>
                {f.resumeFileName && <p className="text-[11px] text-slate-500 mt-1 truncate">{f.resumeFileName}</p>}
                <input
                  value={notes[f.id] || ''}
                  onChange={e => setNotes(prev => ({ ...prev, [f.id]: e.target.value }))}
                  placeholder="Optional rejection note"
                  className="collego-input mt-2 !max-w-md"
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="success" size="sm" disabled={busyId === f.id} onClick={() => review(f.id, true)}>
                  <CheckCircle2 size={13} /> Approve
                </Button>
                <Button variant="destructive" size="sm" disabled={busyId === f.id} onClick={() => review(f.id, false)}>
                  <X size={13} /> Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function RemindersTab({ facultyReminders = [], loading, onCreate, onToggle, onDelete }) {
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const pending = facultyReminders.filter(r => !r.completed).length

  const submit = async (e) => {
    e.preventDefault()
    const value = title.trim()
    if (!value || busy) return
    setBusy(true)
    try {
      await onCreate(value)
      setTitle('')
    } catch { /* toast is shown by the parent */ } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageTitle icon={ListTodo} title="My Reminders" subtitle="Personal tasks and reminders. Tick them off once completed." accent="emerald"
        actions={facultyReminders.length > 0 ? <Badge variant={pending ? 'warning' : 'success'}>{pending ? `${pending} pending` : 'All done'}</Badge> : undefined} />

      <div className="glass-card p-6 border border-white/60">
        <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Plus size={15} className="text-emerald-500" /> Add a reminder
        </h3>
        <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Submit q-paper by Friday" maxLength={200} className="collego-input flex-1" />
          <Button type="submit" variant="gradient" disabled={!title.trim() || busy}>
            {busy ? <><RefreshCw size={14} className="animate-spin" /> Adding...</> : <><Plus size={14} /> Add Reminder</>}
          </Button>
        </form>
      </div>

      <div className="glass-card p-6 border border-white/60">
        <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <ListTodo size={15} className="text-emerald-500" /> To be completed
        </h3>
        {loading ? (
          <div className="flex items-center justify-center py-10"><Spinner color="emerald" /></div>
        ) : facultyReminders.length === 0 ? (
          <EmptyState icon={ListTodo} title="No reminders yet" accent="emerald" description="Add your first personal task above." />
        ) : (
          <div className="divide-y divide-white/60">
            {facultyReminders.map(r => (
              <div key={r.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <button type="button" onClick={() => onToggle(r.id)} aria-label={r.completed ? 'Mark as pending' : 'Mark as completed'}
                  className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                    r.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-emerald-500')}>
                  {r.completed && <CheckCircle2 size={14} />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={cn('text-sm', r.completed ? 'line-through text-slate-400' : 'text-slate-700')}>{r.title}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Added {fmtDate(r.createdAt)}{r.completedAt ? ` Â· Completed ${fmtDate(r.completedAt)}` : ''}</p>
                </div>
                <button type="button" onClick={() => onDelete(r.id)} aria-label="Delete reminder" className="text-slate-300 hover:text-red-500 transition-colors p-1">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// â”€â”€â”€ Main Faculty Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  const [attendanceHolidays, setAttendanceHolidays] = useState([])
  const [holidayBusy, setHolidayBusy] = useState(false)

  // Marks
  const [examName, setExamName] = useState('IA-1')
  const [maxMarks, setMaxMarks] = useState(50)
  const [marksEntries, setMarksEntries] = useState([])
  const [sectionMarks, setSectionMarks] = useState([])
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
  const [careerProfile, setCareerProfile] = useState(null)
  const [careerLoading, setCareerLoading] = useState(false)
  const [upcomingPlacements, setUpcomingPlacements] = useState([])
  const [placementsLoading, setPlacementsLoading] = useState(false)
  const [studentDetailsLoading, setStudentDetailsLoading] = useState(false)
  const [unreadCounts, setUnreadCounts] = useState({})
  const [notifications, setNotifications] = useState([])

  // Subject Assignments
  const [mySubjectAssignments, setMySubjectAssignments] = useState([])
  const [availableCourses, setAvailableCourses] = useState([])
  const [availableSemesters, setAvailableSemesters] = useState([])
  const [selectedSemesterId, setSelectedSemesterId] = useState('')
  const [newCourseName, setNewCourseName] = useState('')
  const [newCourseCode, setNewCourseCode] = useState('')
  const [newCourseCredits, setNewCourseCredits] = useState('4')
  const [sectionFilter, setSectionFilter] = useState('')
  const [subjectAssignmentsLoading, setSubjectAssignmentsLoading] = useState(false)

  // Personal Reminders
  const [facultyReminders, setFacultyReminders] = useState([])
  const [facultyRemindersLoading, setFacultyRemindersLoading] = useState(true)

  const sidebarWidth = collapsed ? 76 : 248
  const facultyDepartmentName = sections.find(s => s.departmentName)?.departmentName || 'your department'
  const showMsg = useCallback((text, type = 'success') => setMessage({ text, type }), [])

  const remindersKey = `collego-faculty-reminders-${email || 'faculty'}`
  const loadFacultyReminders = useCallback(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(remindersKey) || '[]')
      setFacultyReminders(Array.isArray(stored) ? stored : [])
    } catch { setFacultyReminders([]) }
    finally { setFacultyRemindersLoading(false) }
  }, [remindersKey])

  useEffect(() => { loadFacultyReminders() }, [loadFacultyReminders])

  const persistFacultyReminders = useCallback((list) => {
    setFacultyReminders(list)
    try { localStorage.setItem(remindersKey, JSON.stringify(list)) } catch { /* ignore */ }
  }, [remindersKey])

  const handleCreateReminder = useCallback((title) => {
    const reminder = { id: Date.now(), title, completed: false, createdAt: new Date().toISOString(), completedAt: null }
    persistFacultyReminders([reminder, ...facultyReminders])
    showMsg('Reminder added')
  }, [facultyReminders, persistFacultyReminders, showMsg])

  const handleToggleReminder = useCallback((id) => {
    persistFacultyReminders(facultyReminders.map(r => r.id === id
      ? { ...r, completed: !r.completed, completedAt: !r.completed ? new Date().toISOString() : null }
      : r))
  }, [facultyReminders, persistFacultyReminders])

  const handleDeleteReminder = useCallback((id) => {
    persistFacultyReminders(facultyReminders.filter(r => r.id !== id))
    showMsg('Reminder deleted')
  }, [facultyReminders, persistFacultyReminders, showMsg])

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

  const loadNotifications = useCallback(async () => {
    try {
      const [countsRes, notifRes] = await Promise.all([
        api.get('/api/faculty/notifications/unread-counts'),
        api.get('/api/faculty/notifications'),
      ])
      setUnreadCounts(countsRes.data || {})
      setNotifications(Array.isArray(notifRes.data) ? notifRes.data : [])
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

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
    if (tabId === 'careerProfile') loadCareerProfile()
    if (tabId === 'placements') loadUpcomingPlacements()
    if (tabId === 'notices' || tabId === 'invigilations') markNavRead(tabId)
  }

  const loadCareerProfile = async () => {
    setCareerLoading(true)
    try {
      const res = await api.get('/api/faculty/career-profile')
      setCareerProfile(res.data)
    } catch { showMsg('Failed to load your career profile', 'error') }
    finally { setCareerLoading(false) }
  }

  const loadUpcomingPlacements = async () => {
    setPlacementsLoading(true)
    try {
      const res = await api.get('/api/faculty/placements/upcoming')
      setUpcomingPlacements(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to load upcoming placements', 'error')
    } finally {
      setPlacementsLoading(false)
    }
  }

  // The top-right profile shows the signed-in faculty member's name and
  // department, so load the profile even before the Career Profile tab opens.
  useEffect(() => {
    let cancelled = false
    api.get('/api/faculty/career-profile')
      .then(res => { if (!cancelled) setCareerProfile(res.data) })
      .catch(() => { /* the tab will surface the error if it persists */ })
    return () => { cancelled = true }
  }, [])

  const handleUploadCareerResume = async (file) => {
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await api.post('/api/faculty/career-profile/resume', fd)
      setCareerProfile(res.data)
      showMsg('Resume submitted â€” waiting for admin approval')
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to upload resume', 'error')
      throw err
    }
  }

  const handleRemoveCareerResume = async () => {
    try {
      const res = await api.delete('/api/faculty/career-profile/resume')
      setCareerProfile(res.data)
      showMsg('Resume removed')
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to remove resume', 'error')
    }
  }

  const markNavRead = async (tabId) => {
    const category = NAV_CATEGORY[tabId]
    if (!category || !unreadCounts[category]) return
    setUnreadCounts(prev => ({ ...prev, [category]: 0 }))
    setNotifications(prev => prev.map(n => (n.category === category ? { ...n, read: true } : n)))
    try { await api.post(`/api/faculty/notifications/categories/${category}/read`) } catch { /* optimistic */ }
  }

  const handleSectionSelect = (section) => {
    setSelectedSection(section)
    setActiveTab('attendance')
    setSectionMarks([])
    setAssignmentMarksAssignmentId('')
    setAssignmentMarksEntries([])
    setAssignmentMarksRecorded([])
    setSectionAssignments([])
    setSectionMaterials([])
    setStudentPerformance([])
    setAttendanceHolidays([])
    loadEnrolledStudents(section.sectionId)
    loadHolidays(section.sectionId)
  }

  const loadEnrolledStudents = async (sectionId) => {
    try {
      const res = await api.get(`/api/faculty/attendance/${sectionId}`)
      const students = res.data
      setAttendanceRecords(students.map(s => ({ studentId: s.studentId, studentName: s.studentName, enrollmentNumber: s.enrollmentNumber, status: 'PRESENT' })))
      setMarksEntries(students.map(s => ({ studentId: s.studentId, studentName: s.studentName, enrollmentNumber: s.enrollmentNumber, obtainedMarks: '' })))
    } catch { showMsg('Failed to load student data', 'error') }
  }

  const loadHolidays = async (sectionId) => {
    try {
      const res = await api.get(`/api/faculty/attendance/holidays/${sectionId}`)
      setAttendanceHolidays(Array.isArray(res.data) ? res.data : [])
    } catch { setAttendanceHolidays([]) }
  }

  const handleDeclareHoliday = async () => {
    if (!selectedSection) return
    const note = window.prompt(
      `Declare ${fmtDate(attendanceDate)} as a holiday for this class?\n\nOptional note/reason:`, '')
    if (note === null) return
    setHolidayBusy(true)
    try {
      await api.post('/api/faculty/attendance/holidays', {
        sectionId: selectedSection.sectionId,
        date: attendanceDate,
        note: note.trim() || null,
      })
      showMsg('Holiday declared. Attendance for that day is not counted.')
      await loadHolidays(selectedSection.sectionId)
      await loadEnrolledStudents(selectedSection.sectionId)
    } catch (err) {
      showMsg(err.response?.data?.message || 'Could not declare holiday', 'error')
    } finally {
      setHolidayBusy(false)
    }
  }

  const handleRemoveHoliday = async (holidayId) => {
    if (!await confirmAction({ title: 'Are you sure?', message: 'Remove this holiday? You can then mark attendance for that day.', confirmLabel: 'Confirm' })) return
    setHolidayBusy(true)
    try {
      await api.delete(`/api/faculty/attendance/holidays/${holidayId}`)
      showMsg('Holiday removed')
      if (selectedSection) await loadHolidays(selectedSection.sectionId)
    } catch (err) {
      showMsg(err.response?.data?.message || 'Could not remove holiday', 'error')
    } finally {
      setHolidayBusy(false)
    }
  }

  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    if (!selectedSection) return
    if (tabId === 'assignments') loadAssignments()
    if (tabId === 'materials') loadMaterials()
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

  const handleDownloadStudentDetails = async (section) => {
    if (!section) return
    setStudentDetailsLoading(true)
    try {
      const fileName = `student-details-${section.courseCode || 'section'}-${section.sectionName || section.sectionId}.pdf`
      await downloadFile(`/api/faculty/sections/${section.sectionId}/students/pdf`, fileName)
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to download student details', 'error')
    } finally {
      setStudentDetailsLoading(false)
    }
  }


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

  const handleAssignSubject = async (payload) => {
    if (!payload.courseName || !payload.semesterId) return
    setSubjectAssignmentsLoading(true)
    try {
      const res = await api.post('/api/faculty/subject-assignments', payload)
      const studentCount = res.data?.studentCount ?? 0
      const yearLabel = res.data?.yearLabel || targetYearLabel(res.data?.year)
      const sectionCount = res.data?.sectionCount ?? 0
      setNewCourseName('')
      setNewCourseCode('')
      setNewCourseCredits('4')
      setSelectedSemesterId('')
      setSectionFilter('')
      await Promise.all([loadMySubjectAssignments(), fetchSections()])
      showMsg(studentCount > 0
        ? `Subject assigned - ${studentCount} ${yearLabel} students loaded into ${sectionCount} section${sectionCount === 1 ? '' : 's'}.`
        : `Subject assigned, but no students were found for this selection yet.`)
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

  const handleOpenElective = async (payload) => {
    setSubjectAssignmentsLoading(true)
    try {
      const res = await api.post('/api/faculty/open-elective', payload)
      const count = res.data?.studentCount ?? 0
      showMsg(`Open elective created - ${count} student${count === 1 ? '' : 's'} added from selected departments.`)
      await Promise.all([loadMySubjectAssignments(), fetchSections()])
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to create open elective', 'error')
    } finally { setSubjectAssignmentsLoading(false) }
  }

  useEffect(() => {
    if (activeTab === 'subjectAssignments') {
      loadAvailableCourses()
      loadAvailableSemesters()
      loadMySubjectAssignments()
    }
  }, [activeTab])

  const globalNavItems = [
    ...GLOBAL_NAV,
    ...(careerProfile?.isHod
      ? [
          { id: 'classRepresentatives', label: 'Class Representatives', icon: Crown },
          { id: 'hodTimetables', label: 'Class Timetables', icon: CalendarDays },
          { id: 'resumeApprovals', label: 'Resume Approvals', icon: ShieldCheck },
          { id: 'graduatedStudents', label: 'Graduated Students', icon: GraduationCap },
        ]
      : []),
  ]
  const navSections = [
    {
      items: globalNavItems.map(item => ({
        ...item,
        badge: NAV_CATEGORY[item.id] ? (unreadCounts[NAV_CATEGORY[item.id]] || 0) : 0,
      })),
    },
    {
      title: 'My Sections',
      items: sections.map(sec => ({ id: `section-${sec.sectionId}`, label: sec.courseName, icon: Layers, meta: `${sec.courseCode || ''} - Sec ${sec.sectionName} - ${targetYearLabel(sec.year)}` })),
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
        case 'overview': return <OverviewTab sections={sections} overviewData={overviewData} onSectionSelect={handleSectionSelect} reminders={facultyReminders} onCreateReminder={handleCreateReminder} onToggleReminder={handleToggleReminder} onDeleteReminder={handleDeleteReminder} />
        case 'subjectAssignments': return <SubjectAssignmentsTab courses={availableCourses} semesters={availableSemesters} myAssignments={mySubjectAssignments} loading={subjectAssignmentsLoading} onAssign={handleAssignSubject} onRemove={handleRemoveSubjectAssignment} selectedSemesterId={selectedSemesterId} setSelectedSemesterId={setSelectedSemesterId} courseName={newCourseName} setCourseName={setNewCourseName} courseCode={newCourseCode} setCourseCode={setNewCourseCode} credits={newCourseCredits} setCredits={setNewCourseCredits} sectionFilter={sectionFilter} setSectionFilter={setSectionFilter} onOpenElective={handleOpenElective} openElectiveLoading={subjectAssignmentsLoading} />
        case 'questionPapers': return <QuestionPapersTab sections={sections} examType={qpExamType} setExamType={setQpExamType} year={qpYear} setYear={setQpYear} targetYear={qpTargetYear} setTargetYear={setQpTargetYear} fileName={qpFileName} setFileName={setQpFileName} selectedSectionId={qpSelectedSectionId} setSelectedSectionId={setQpSelectedSectionId} onSubmit={handleUploadQP} papers={myQuestionPapers} loading={loading} uploadFileLoading={uploadFileLoading} />
        case 'careerProfile': return <CareerProfileTab profile={careerProfile} loading={careerLoading} onUpload={handleUploadCareerResume} onRemove={handleRemoveCareerResume} onDownload={handleDownload} />
        case 'placements': return <UpcomingPlacementsTab placements={upcomingPlacements} loading={placementsLoading} onRefresh={loadUpcomingPlacements} />
        case 'classRepresentatives': return <HodClassRepresentativesTab showMsg={showMsg} />
        case 'hodTimetables': return <HodTimetablesTab showMsg={showMsg} />
        case 'notices': return <NoticesTab title={noticeTitle} setTitle={setNoticeTitle} message={noticeMessage} setMessage={setNoticeMessage} type={noticeType} setType={setNoticeType} targetYear={noticeTargetYear} setTargetYear={setNoticeTargetYear} departmentName={facultyDepartmentName} onSubmit={handleDraftNotice} sentNotices={sentNotices} loading={loading} inbox={notifications} />
        case 'settings': return <SettingsTab showMsg={showMsg} accent="violet" />
        case 'help': return <HelpTab accent="violet" />
        case 'resumeApprovals': return <HodResumeApprovalsTab showMsg={showMsg} />
        case 'graduatedStudents': return <GraduatedStudentsTab endpoint="/api/faculty/hod/graduated-students" title="Department Graduates" />
        case 'newsletters': return <FacultyNewslettersTab showMsg={showMsg} isHod={careerProfile?.isHod} onDownload={handleDownload} />
        case 'invigilations': return <InvigilationsTab showMsg={showMsg} />
        default: return null
      }
    }

    switch (activeTab) {
      case 'studentDetails': return <StudentDetailsTab section={selectedSection} onDownload={handleDownloadStudentDetails} loading={studentDetailsLoading} />
      case 'attendance': return <AttendanceTab
        attendanceDate={attendanceDate}
        setAttendanceDate={setAttendanceDate}
        attendanceRecords={attendanceRecords}
        toggleAttendance={toggleAttendance}
        onSubmit={handleMarkAttendance}
        loading={loading}
        holiday={attendanceHolidays.find(h => h.date === attendanceDate) || null}
        holidays={attendanceHolidays}
        holidayBusy={holidayBusy}
        onDeclareHoliday={handleDeclareHoliday}
        onRemoveHoliday={handleRemoveHoliday}
      />
      case 'internalMarks': return <InternalMarksTab examName={examName} setExamName={setExamName} maxMarks={maxMarks} setMaxMarks={setMaxMarks} marksEntries={marksEntries} setMarksEntries={setMarksEntries} onSubmit={handleUploadInternalMarks} sectionMarks={sectionMarks} loading={loading} />
      case 'studentPerformance': return <StudentPerformanceTab data={studentPerformance} loading={tabLoading} />
      case 'assignments': return <AssignmentsTab title={assignmentTitle} setTitle={setAssignmentTitle} desc={assignmentDesc} setDesc={setAssignmentDesc} dueDate={assignmentDueDate} setDueDate={setAssignmentDueDate} maxMarks={assignmentMaxMarks} setMaxMarks={setAssignmentMaxMarks} targetYear={assignmentTargetYear} setTargetYear={setAssignmentTargetYear} onSubmit={handleCreateAssignment} assignments={sectionAssignments} loading={loading} onDownload={handleDownload} showMsg={showMsg} />
      case 'assignmentMarks': return <AssignmentMarksTab assignments={sectionAssignments} selectedAssignmentId={assignmentMarksAssignmentId} setSelectedAssignmentId={handleAssignmentMarksSelect} entries={assignmentMarksEntries} setEntries={setAssignmentMarksEntries} onSubmit={handleUploadAssignmentMarks} sectionMarks={assignmentMarksRecorded} loading={loading} />
      case 'materials': return <MaterialsTab title={materialTitle} setTitle={setMaterialTitle} desc={materialDesc} setDesc={setMaterialDesc} type={materialType} setType={setMaterialType} targetYear={materialTargetYear} setTargetYear={setMaterialTargetYear} onSubmit={handleCreateMaterial} materials={sectionMaterials} loading={loading} onDownload={handleDownload} />
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
        note={sections.length > 0 ? `${sections.length} sections Â· ${totalStudents} students assigned` : 'No sections assigned yet'}
      />
      <PortalTopbar
        sidebarWidth={sidebarWidth} accent="violet"
        user={{
          name: careerProfile?.name || 'Faculty',
          role: careerProfile?.departmentName
            ? `${careerProfile.designation ? `${careerProfile.designation} Â· ` : ''}${careerProfile.departmentName}`
            : 'Faculty',
          email,
        }}
        notificationCount={Object.values(unreadCounts).reduce((a, b) => a + (Number(b) || 0), 0)}
        notifications={(notifications || []).filter(n => !n.read).map(n => ({ id: n.id, title: n.title, message: n.message }))}
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


