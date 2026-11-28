import { useState, useEffect, useCallback, useId, useRef } from 'react'
import { confirmAction } from '../components/common/ConfirmDialog.jsx'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, ClipboardCheck, BookMarked, Calendar, CalendarDays,
  Briefcase, Bell, Sparkles, Target,
  TrendingUp, Download, Send, FileText,
  GraduationCap, CheckCircle2, Bot,
  Layers, Award, Search, AlertTriangle, RefreshCw,
  BookOpen, FolderOpen, Upload, Clock, Paperclip, Settings, HelpCircle, Users, Eye, X,
  CalendarOff, ListTodo, Plus, Trash2, Newspaper,
} from 'lucide-react'
import {
  AreaChart, Area, ResponsiveContainer,
} from 'recharts'
import { authService } from '../services/authService'
import api from '../services/api'
import { downloadFile, fileObjectUrl, previewFile } from '../lib/download'
import { SettingsTab } from '../components/dashboard/SettingsTab'
import { HelpTab } from '../components/dashboard/HelpTab'
import { FacultyDirectoryTab } from '../components/dashboard/FacultyDirectoryTab'
import { ExamsStudentTab } from '../components/dashboard/ExamsStudentTab'
import { EventBox } from '../components/dashboard/EventBox.jsx'
import { cn } from '../lib/utils'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import {
  PortalSidebar, PortalTopbar, Toast, StatCard, Panel, PageTitle,
  WelcomeBanner, EmptyState, Spinner, ImageStrip,
} from '../components/dashboard/PortalUI'
import { uiImages } from '../assets/uiImages'
import welcomeStudent from '../assets/ui/welcome-student.webp'
import { timeAgo } from '../lib/time'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'
const fmtNum = (n, dp = 2) => (n == null ? '-' : Number(n).toFixed(dp))
const sortReminders = (list = []) => [...list].sort((a, b) =>
  Number(a.completed) - Number(b.completed) ||
  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

const GRADE_COLORS = { O: '#10b981', 'A+': '#059669', A: '#06b6d4', 'B+': '#3b82f6', B: '#6366f1', C: '#f59e0b', P: '#f59e0b', F: '#ef4444' }
const DAY_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
const DAY_COLORS = { MONDAY: '#4f46e5', TUESDAY: '#8b5cf6', WEDNESDAY: '#06b6d4', THURSDAY: '#10b981', FRIDAY: '#f59e0b', SATURDAY: '#ef4444' }

const NAV_SECTIONS = [
  { items: [{ id: 'overview', label: 'Dashboard', icon: LayoutDashboard }] },
  {
    title: 'Academics',
    items: [
      { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
      { id: 'marks', label: 'Marks & CGPA', icon: BookMarked },
      { id: 'assignments', label: 'Assignments', icon: BookOpen },
      { id: 'materials', label: 'Study Materials', icon: FolderOpen },
      { id: 'questionPapers', label: 'Question Papers', icon: FileText },
      { id: 'facultyDirectory', label: 'Faculty Directory', icon: Users },
      { id: 'exams', label: 'Examinations', icon: CalendarDays },
      { id: 'timetable', label: 'Timetable', icon: Calendar },
      { id: 'documents', label: 'Documents', icon: FileText },
    ],
  },
  {
    // Kept above Services so the two AI entries stay visible without
    // scrolling on a laptop-height sidebar.
    title: 'AI Assistant',
    items: [
      { id: 'aiAssistant', label: 'AI Assistant', icon: Sparkles },
      { id: 'aiResumeAnalyzer', label: 'Resume Analyzer', icon: FileText },
    ],
  },
  {
    title: 'Services',
    items: [
      { id: 'placements', label: 'Placements', icon: Briefcase },
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'newsletters', label: 'Newsletters', icon: Newspaper },
      { id: 'settings', label: 'Settings', icon: Settings },
      { id: 'help', label: 'Help & Support', icon: HelpCircle },
    ],
  },
]

// --- Sparkline (premium area) -------------------------------------------------
function Sparkline({ data, color }) {
  const gid = `sg${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  return (
    <ResponsiveContainer width="100%" height={44}>
      <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} fill={`url(#${gid})`} strokeWidth={1.8} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function AttBadge({ pct }) {
  if (pct >= 75) return <Badge variant="success">{pct}%</Badge>
  if (pct >= 50) return <Badge variant="warning">{pct}%</Badge>
  return <Badge variant="destructive">{pct}%</Badge>
}

// --- Overview Tab -------------------------------------------------------------
function OverviewTab({ profile, overall, subjects, cgpa, notifications, placements, reminders = [], onTabChange, onCreateReminder, onToggleReminder, onDeleteReminder }) {
  const [reminderTitle, setReminderTitle] = useState('')
  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'
  const unread = notifications.filter(n => !n.read).length
  const overallPct = overall?.overallPercentage || 0

  const attData = [50, 60, 55, 70, 65, 78, 75, 80, 82, 87].map(v => ({ v }))

  const statCards = [
    { label: 'Overall Attendance', value: overallPct, decimals: 1, suffix: '%', icon: ClipboardCheck, accent: 'emerald',
      sub: `${overall?.totalPresent ?? 0}/${overall?.totalClasses ?? 0} classes`, onClick: () => onTabChange('attendance'),
      spark: <Sparkline data={attData} color="#10b981" />, glow: true },
    { label: 'Current CGPA', value: cgpa?.cumulativeCgpa ?? 0, decimals: 2, icon: GraduationCap, accent: 'violet',
      sub: `${cgpa?.totalCreditsAllSemesters?.toFixed(0) ?? 0} total credits`, onClick: () => onTabChange('marks'), glow: true },
    { label: 'Notifications', value: unread, icon: Bell, accent: 'blue',
      sub: `${notifications.length} total`, onClick: () => onTabChange('notifications'),
      spark: <Sparkline data={[{ v: 3 }, { v: 5 }, { v: 2 }, { v: 7 }, { v: 4 }]} color="#3b82f6" />, glow: true },
  ]

  const pendingReminders = (reminders || []).filter(r => !r.completed).slice(0, 5)
  const upcomingPlacements = (placements || []).filter(p => {
    const deadline = p.lastDate || p.driveDate
    return !deadline || new Date(deadline) >= new Date()
  }).slice(0, 3)

  return (
    <div className="space-y-8">
      <WelcomeBanner
        greeting={greeting}
        name={profile?.firstName || 'Student'}
        badge={profile?.isCr ? 'CR' : null}
        subtitle={`${profile?.enrollmentNumber || ''} - ${profile?.departmentName || ''} - Semester ${profile?.currentSemester || ''} - Section ${profile?.section || ''}${profile?.isCr ? ' - Class Representative' : ''}`}
        quote="Every class attended is a step closer to your goal"
        accent="emerald"
        image={welcomeStudent}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((c, i) => <StatCard key={c.label} index={i} {...c} />)}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <Panel title="Subject-wise Attendance" icon={ClipboardCheck} accent="emerald" className="xl:col-span-7"
          action={<button onClick={() => onTabChange('attendance')} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 px-2 py-1 rounded-lg transition-colors">Details</button>}>
          {subjects.length === 0 ? (
            <EmptyState icon={ClipboardCheck} title="No attendance data" accent="emerald" description="Your subject attendance will appear once classes are marked." />
          ) : (
            <div className="space-y-3.5">
              {subjects.slice(0, 6).map((s, i) => (
                <motion.div key={s.sectionId || i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-3 p-3 rounded-xl border border-white/60 bg-white/70 backdrop-blur-sm hover:bg-white transition-all group">
                  <div className="flex flex-col gap-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate leading-tight">{s.courseName}</p>
                    <p className="text-[9px] text-slate-400 font-mono">{s.courseCode}</p>
                  </div>
                  <AttBadge pct={Math.round(s.percentage || 0)} />
                  <div className="w-24 mt-0.5">
                    <div className="progress-bar">
                      <div className={cn('progress-bar-fill', s.percentage >= 75 ? 'bg-emerald-500' : s.percentage >= 50 ? 'bg-amber-500' : 'bg-red-500')} style={{ width: `${Math.min(s.percentage || 0, 100)}%` }} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="My Tasks & Reminders" icon={ListTodo} accent="emerald" className="xl:col-span-5">
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
                {reminders.filter(r => !r.completed).length} pending - {reminders.filter(r => r.completed).length} completed
              </p>
            </div>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title="Recent Notifications" icon={Bell} accent="blue"
          action={<button onClick={() => onTabChange('notifications')} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100 px-2 py-1 rounded-lg transition-colors">View All</button>}>
          {notifications.slice(0, 4).length === 0 ? (
            <EmptyState icon={Bell} title="No notifications" accent="blue" />
          ) : (
            <div className="space-y-2.5">
              {notifications.slice(0, 4).map(n => (
                <motion.div key={n.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className={cn('rounded-xl p-3.5 border flex items-start gap-3 transition-all', !n.read ? 'bg-indigo-50/60 border-indigo-100' : 'bg-white/80 border-white/60 cursor-pointer group hover:bg-white/90')}>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-indigo-500 mt-1 shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-800 truncate leading-tight">{n.title}</p>
                    <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">{n.message}</p>
                  </div>
                  <span className="text-[9px] text-slate-400 shrink-0">{timeAgo(n.createdAt)}</span>
                </motion.div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Upcoming Placements" icon={Briefcase} accent="emerald"
          action={<button onClick={() => onTabChange('placements')} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 px-2 py-1 rounded-lg transition-colors">View All</button>}>
          {upcomingPlacements.length === 0 ? (
            <EmptyState icon={Briefcase} title="No active drives" accent="emerald" description="New placement notices will appear here." />
          ) : (
            <div className="space-y-2.5">
              {upcomingPlacements.map(p => (
                <motion.div key={p.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 p-3 rounded-xl border border-white/60 bg-white/70 backdrop-blur-sm hover:bg-white transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/10">
                    <Briefcase size={16} className="text-emerald-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-800 truncate">{p.title}</p>
                    <p className="text-[10px] text-emerald-600 font-medium truncate">{p.companyName}</p>
                  </div>
                  {p.lastDate && (
                    <div className="text-right shrink-0">
                      <p className="text-[9px] text-slate-400 uppercase tracking-wider font-medium">Last date</p>
                      <p className="text-xs font-bold text-slate-700">{fmtDate(p.lastDate)}</p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <EventBox accent="emerald" />

      <ImageStrip
        title="Campus Moments"
        subtitle="A little inspiration for your day."
        items={[
          { src: uiImages.library, label: 'Study spaces' },
          { src: uiImages.onlineLearning, label: 'Learn anywhere' },
          { src: uiImages.campusReading, label: 'Campus life' },
        ]}
      />
    </div>
  )
}

// --- Attendance --------------------------------------------------------------
function AttendanceTab({ overall, subjects, semesters, onSemesterChange, loading }) {
  const pct = overall?.overallPercentage || 0
  const overallAccent = pct >= 75 ? 'emerald' : pct >= 50 ? 'amber' : 'violet'
  return (
    <div className="space-y-6">
      <PageTitle icon={ClipboardCheck} title="Attendance" subtitle="Your attendance across enrolled subjects." accent="emerald"
        image={uiImages.classroom} imageAlt="Classroom lecture"
        actions={
          <select onChange={e => onSemesterChange(e.target.value || null)} className="collego-input !w-auto text-xs py-2 pr-8">
            <option value="">All Semesters</option>
            {semesters.map(s => <option key={s.id} value={s.id}>{s.name} ({s.academicYear})</option>)}
          </select>
        }
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard index={0} label="Total Classes" value={overall?.totalClasses ?? 0} icon={Layers} accent="blue" glow />
        <StatCard index={1} label="Classes Present" value={overall?.totalPresent ?? 0} icon={CheckCircle2} accent="emerald" glow />
        <StatCard index={2} label="Overall %" value={pct} decimals={1} suffix="%" icon={TrendingUp} accent={overallAccent} glow />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Spinner color="emerald" /></div>
      ) : (
        <div className="space-y-6">
          <div className="glass-card overflow-hidden border border-white/60">
            <div className="overflow-x-auto">
              <table className="collego-table">
                <thead>
                  <tr>
                    <th>Subject</th><th>Code</th>
                    <th style={{ textAlign: 'center' }}>Total</th>
                    <th style={{ textAlign: 'center' }}>Present</th>
                    <th style={{ textAlign: 'center' }}>Absent</th>
                    <th style={{ textAlign: 'center' }}>%</th>
                    <th>Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map(s => (
                    <tr key={s.sectionId} className="hover:bg-white/30 transition-colors">
                      <td className="text-slate-800 font-medium">{s.courseName}</td>
                      <td><code className="text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded">{s.courseCode}</code></td>
                      <td style={{ textAlign: 'center' }}>{s.totalClasses}</td>
                      <td style={{ textAlign: 'center', color: '#059669', fontWeight: 600 }}>{s.present}</td>
                      <td style={{ textAlign: 'center', color: '#dc2626', fontWeight: 600 }}>{s.absent}</td>
                      <td style={{ textAlign: 'center' }}><AttBadge pct={Math.round(s.percentage || 0)} /></td>
                      <td className="w-32">
                        <div className="progress-bar">
                          <div className={cn('progress-bar-fill', s.percentage >= 75 ? 'bg-emerald-500' : s.percentage >= 50 ? 'bg-amber-500' : 'bg-red-500')} style={{ width: `${Math.min(s.percentage || 0, 100)}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                  {subjects.length === 0 && (
                    <tr><td colSpan={7} className="text-center text-slate-400 py-14">No attendance data found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {overall?.holidays?.length > 0 && (
            <div className="glass-card overflow-hidden border border-white/60">
              <div className="px-5 py-4 border-b border-white/50 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <CalendarOff size={14} className="text-amber-500" /> Declared Holidays
                </h3>
                <span className="text-[10px] text-slate-400">{overall.holidays.length} total</span>
              </div>
              <div className="divide-y divide-white/30">
                {overall.holidays.slice(0, 8).map(h => (
                  <div key={h.id} className="px-5 py-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">
                        {fmtDate(h.date)} - {h.courseCode || h.courseName}
                      </p>
                      <p className="text-[11px] text-slate-500">{h.note || 'Declared as a holiday'}</p>
                    </div>
                    <Badge variant="warning">Holiday</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// --- Marks -------------------------------------------------------------------
function MarksTab({ internalMarks, cgpa }) {
  const [view, setView] = useState('cgpa')
  return (
    <div className="space-y-6">
      <PageTitle icon={BookMarked} title="Marks & Results" subtitle="Semester grades, CGPA and internal assessment marks." accent="violet"
        image={uiImages.graduation} imageAlt="Graduation celebration"
        actions={
          <div className="flex bg-white border border-white/60 rounded-2xl p-1 backdrop-blur-sm">
            {[['cgpa', 'CGPA / SGPA'], ['internal', 'Internal Marks']].map(([id, label]) => (
              <button key={id} onClick={() => setView(id)} className={cn('px-4 py-2 rounded-xl text-xs font-medium transition-all', view === id ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/20' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50')}>{label}</button>
            ))}
          </div>
        }
      />
      {view === 'cgpa' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard index={0} label="Cumulative CGPA" value={cgpa?.cumulativeCgpa ?? 0} decimals={2} icon={GraduationCap} accent="violet" sub="Across all semesters" glow />
            <StatCard index={1} label="Total Credits" value={cgpa?.totalCreditsAllSemesters ?? 0} icon={Award} accent="blue" sub="Credits earned" glow />
          </div>
          {(cgpa?.semesters || []).map(sem => (
            <div key={sem.semesterId} className="glass-card overflow-hidden border border-white/60">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/60 bg-white/30">
                <div>
                  <p className="font-semibold text-slate-800">{sem.semesterName}</p>
                  <p className="text-[10px] text-slate-400">{sem.academicYear} - {sem.totalCredits?.toFixed(0)} credits</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-violet-600">{fmtNum(sem.sgpa)}</p>
                  <p className="text-[10px] text-slate-400">SGPA</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="collego-table">
                  <thead><tr><th>Subject</th><th style={{ textAlign: 'center' }}>Credits</th><th style={{ textAlign: 'center' }}>Marks</th><th style={{ textAlign: 'center' }}>Grade</th><th style={{ textAlign: 'center' }}>GP</th></tr></thead>
                  <tbody>
                    {(sem.subjects || []).map(sub => (
                      <tr key={sub.sectionId} className="hover:bg-white/30 transition-colors">
                        <td><p className="text-slate-800">{sub.courseName}</p><p className="text-[10px] text-slate-400 font-mono">{sub.courseCode}</p></td>
                        <td style={{ textAlign: 'center', color: '#64748b' }}>{sub.credits}</td>
                        <td style={{ textAlign: 'center' }}>{sub.obtainedMarks != null ? `${sub.obtainedMarks}/${sub.maxMarks}` : '-'}</td>
                        <td style={{ textAlign: 'center' }}><span className="font-bold" style={{ color: GRADE_COLORS[sub.grade] || '#64748b' }}>{sub.grade || '-'}</span></td>
                        <td style={{ textAlign: 'center', color: '#64748b' }}>{sub.gradePoints?.toFixed(1) ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          {!cgpa?.semesters?.length && <EmptyState icon={GraduationCap} title="No results yet" accent="violet" description="Your semester results will appear here." />}
        </div>
      ) : (
        <div className="glass-card overflow-hidden border border-white/60">
          <div className="overflow-x-auto">
            <table className="collego-table">
              <thead><tr><th>Subject</th><th style={{ textAlign: 'center' }}>IA-1 (Obtained / Max)</th><th style={{ textAlign: 'center' }}>IA-2 (Obtained / Max)</th></tr></thead>
              <tbody>
                {(internalMarks || []).map(m => (
                  <tr key={m.sectionId} className="hover:bg-white/30 transition-colors">
                    <td><p className="text-slate-800">{m.courseName}</p><p className="text-[10px] text-slate-400 font-mono">{m.courseCode}</p></td>
                    <td style={{ textAlign: 'center' }}>{m.ia1ObtainedMarks != null ? <span className="text-violet-600 font-semibold">{m.ia1ObtainedMarks} / {m.ia1MaxMarks}</span> : <span className="text-slate-300">-</span>}</td>
                    <td style={{ textAlign: 'center' }}>{m.ia2ObtainedMarks != null ? <span className="text-violet-600 font-semibold">{m.ia2ObtainedMarks} / {m.ia2MaxMarks}</span> : <span className="text-slate-300">-</span>}</td>
                  </tr>
                ))}
                {!internalMarks?.length && <tr><td colSpan={3} className="text-center text-slate-400 py-14">No internal marks found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// --- Timetable ---------------------------------------------------------------
function TimetableTab({ timetable, loading }) {
  const days = timetable?.weeklySchedule ? DAY_ORDER.filter(d => timetable.weeklySchedule[d]?.length > 0) : []
  const classTimetable = timetable?.classTimetable
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState('')

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  const togglePreview = async () => {
    if (previewUrl) { setPreviewUrl(''); return }
    setPreviewLoading(true)
    setPreviewError('')
    try {
      const file = await fileObjectUrl('/api/student/timetable/class/file')
      setPreviewUrl(file.url)
    } catch (err) {
      setPreviewError(err.response?.data?.message || 'Could not load the timetable preview.')
    } finally {
      setPreviewLoading(false)
    }
  }

  const downloadClassTimetable = async () => {
    try {
      await downloadFile('/api/student/timetable/class/file?download=true', classTimetable?.fileName || 'class-timetable.pdf')
    } catch (err) {
      setPreviewError(err.response?.data?.message || 'Download failed.')
    }
  }

  return (
    <div className="space-y-6">
      <PageTitle icon={Calendar} title="Timetable" subtitle="Your weekly class schedule and the class timetable uploaded by your HoD." accent="blue" image={uiImages.classroom} imageAlt="Classroom lecture" />
      {!loading && classTimetable?.hasFile && (
        <div className="glass-card overflow-hidden border border-white/60">
          <div className="p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0">
                <Calendar size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">Class Timetable - {classTimetable.yearLabel} - Section {classTimetable.sectionName}</p>
                <p className="text-xs text-slate-500 truncate">{classTimetable.fileName || 'class-timetable.pdf'} - uploaded {fmtDate(classTimetable.uploadedAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={togglePreview} disabled={previewLoading} className="px-4">
                {previewLoading ? <><RefreshCw size={13} className="animate-spin" /> Loading...</> : <><Eye size={13} /> {previewUrl ? 'Hide preview' : 'Preview'}</>}
              </Button>
              <Button variant="gradient" size="sm" onClick={downloadClassTimetable} className="px-4">
                <Download size={13} /> Download
              </Button>
            </div>
          </div>
          {previewError && <p className="px-5 pb-4 text-xs text-red-500">{previewError}</p>}
          {previewUrl && (
            <div className="px-5 pb-5">
              <iframe src={previewUrl} title="Class timetable preview" className="w-full h-[70vh] rounded-xl border border-white/60 bg-white" />
            </div>
          )}
        </div>
      )}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Spinner color="blue" /></div>
      ) : days.length === 0 && !classTimetable?.hasFile ? (
        <div className="glass-card p-12 border border-white/60"><EmptyState icon={Calendar} title="No timetable" accent="blue" description="No timetable data found for active enrollments." /></div>
      ) : (
        <div className="space-y-4">
          {DAY_ORDER.map(day => {
            const slots = timetable?.weeklySchedule?.[day] || []
            if (!slots.length) return null
            const color = DAY_COLORS[day] || '#4f46e5'
            return (
              <motion.div key={day} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="glass-card overflow-hidden border border-white/60">
                <div className="px-5 py-3.5 border-b border-white/50 flex items-center gap-3" style={{ background: `${color}0d` }}>
                  <div className="w-1.5 h-5 rounded-full" style={{ background: color }} />
                  <h3 className="text-sm font-semibold" style={{ color }}>{day.charAt(0) + day.slice(1).toLowerCase()}</h3>
                </div>
                <div>
                  {slots.slice().sort((a, b) => a.startTime?.localeCompare(b.startTime)).map(slot => (
                    <div key={slot.id} className="flex items-center px-5 py-4 hover:bg-white/30 transition-colors border-b border-white/30 last:border-0">
                      <div className="w-24 shrink-0">
                        <p className="text-sm font-mono font-semibold" style={{ color }}>{slot.startTime}</p>
                        <p className="text-xs font-mono text-slate-400">{slot.endTime}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{slot.courseName}</p>
                        <p className="text-xs text-slate-500">{slot.courseCode} - Sec {slot.sectionName}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm text-slate-600">{slot.facultyName || '-'}</p>
                        <p className="text-xs text-slate-400">{slot.roomNumber}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// --- Assignments -------------------------------------------------------------
function AssignmentsTab({ assignments = [], loading, onSubmit, onDownload }) {
  const list = Array.isArray(assignments) ? assignments : []
  const pending = list.filter(a => a.canSubmit !== false && !a.submissionStatus).length

  return (
    <div className="space-y-6">
      <PageTitle icon={BookOpen} title="Assignments" subtitle="Assignments shared with your department and academic year. Submit work for your enrolled subjects." accent="amber"
        image={uiImages.groupStudy} imageAlt="Students collaborating"
        actions={list.length > 0 ? <Badge variant={pending ? 'warning' : 'success'}>{pending ? `${pending} pending` : 'No pending work'}</Badge> : undefined} />
      {loading ? (
        <div className="flex items-center justify-center py-16"><Spinner color="amber" /></div>
      ) : list.length === 0 ? (
        <div className="glass-card p-12 border border-white/60">
          <EmptyState icon={BookOpen} title="No assignments yet" accent="amber" description="Assignments shared by your department faculty will appear here." />
        </div>
      ) : (
        <div className="space-y-4">
          {list.map(a => <StudentAssignmentCard key={a.id} assignment={a} onSubmit={onSubmit} onDownload={onDownload} />)}
        </div>
      )}
    </div>
  )
}

function StudentAssignmentCard({ assignment: a, onSubmit, onDownload }) {
  const [showSubmit, setShowSubmit] = useState(false)
  const [file, setFile] = useState(null)
  const [physical, setPhysical] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)

  const submitted = Boolean(a.submissionStatus)
  const graded = a.submissionStatus === 'GRADED'
  const canSubmit = a.canSubmit !== false
  const overdue = canSubmit && !submitted && a.dueDate && new Date(a.dueDate).getTime() < Date.now()

  const submit = async () => {
    if (!physical && !file) return
    setBusy(true)
    try {
      await onSubmit(a.id, physical ? null : file, note)
      setShowSubmit(false)
      setFile(null)
      setPhysical(false)
      setNote('')
      if (fileRef.current) fileRef.current.value = ''
    } catch { /* toast is shown by the parent */ } finally {
      setBusy(false)
    }
  }

  return (
    <div className="glass-card p-5 border border-white/60 hover:border-indigo-300/70 transition-all">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-slate-800">{a.title}</h3>
            <Badge variant={!canSubmit ? 'secondary' : graded ? 'success' : submitted ? 'info' : overdue ? 'destructive' : 'warning'}>
              {!canSubmit ? 'View only' : graded ? 'Graded' : submitted ? 'Submitted' : overdue ? 'Overdue' : 'Pending'}
            </Badge>
          </div>
          <p className="text-[11px] text-slate-400">{a.courseName} - {a.courseCode}</p>
          {a.description && <p className="text-sm text-slate-500 mt-2.5 leading-relaxed">{a.description}</p>}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-[11px] text-slate-500">
            {a.dueDate && <span className={cn('flex items-center gap-1', overdue && 'text-red-500 font-medium')}><Clock size={12} /> Due {fmtDate(a.dueDate)}</span>}
            {a.maxMarks != null && <span>{a.maxMarks} marks</span>}
            {a.submittedAt && <span>Submitted {fmtDate(a.submittedAt)}</span>}
            {a.late && <span className="text-amber-600 font-medium">Late submission</span>}
          </div>
          {graded && (
            <div className="mt-3 p-3 rounded-xl bg-emerald-50/70 border border-emerald-100">
              <p className="text-xs font-semibold text-emerald-700">
                Score: {a.marks ?? '-'} / {a.maxMarks ?? '-'}
              </p>
              {a.feedback && <p className="text-xs text-emerald-600 mt-1">{a.feedback}</p>}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {a.hasFile && (
            <Button variant="outline" size="sm" onClick={() => onDownload(`/api/student/assignments/${a.id}/file`, a.fileName || `assignment-${a.id}`)}>
              <Download size={12} /> Attachment
            </Button>
          )}
          {canSubmit && !submitted && (
            <Button
              variant="gradient"
              size="sm"
              onClick={() => {
                if (showSubmit) {
                  setShowSubmit(false)
                  setPhysical(false)
                  setFile(null)
                  setNote('')
                  if (fileRef.current) fileRef.current.value = ''
                } else {
                  setShowSubmit(true)
                }
              }}
            >
              <Upload size={12} /> {showSubmit ? 'Cancel' : 'Submit'}
            </Button>
          )}
        </div>
      </div>

      {showSubmit && !submitted && (
        <div className="mt-4 pt-4 border-t border-white/60 space-y-3">
          {!physical && (
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Your file</label>
              <input ref={fileRef} type="file" onChange={e => setFile(e.target.files?.[0] || null)}
                className="collego-input file:mr-3 file:rounded-lg file:border-0 file:bg-amber-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-amber-600" />
              {file && <p className="text-[10px] text-slate-400 mt-1 truncate">{file.name}</p>}
            </div>
          )}
          <label className="flex items-start gap-2.5 rounded-xl border border-amber-100 bg-amber-50/50 p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={physical}
              onChange={e => {
                setPhysical(e.target.checked)
                if (e.target.checked) {
                  setFile(null)
                  if (fileRef.current) fileRef.current.value = ''
                }
              }}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
            />
            <span>
              <span className="text-xs font-semibold text-slate-700">Submitting physically to faculty</span>
              <span className="block text-[10px] text-slate-400 mt-0.5">
                Choose this if you are handing over the assignment in person instead of uploading a file.
              </span>
            </span>
          </label>
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Note (optional)</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Add a note for your faculty..."
              className="collego-input resize-none" />
          </div>
          <div className="flex justify-end">
            <Button variant="success" size="sm" onClick={submit} disabled={busy || (!physical && !file)}>
              {busy
                ? <><RefreshCw size={12} className="animate-spin" /> Submitting...</>
                : physical
                  ? <><CheckCircle2 size={12} /> Submit Without File</>
                  : <><Upload size={12} /> Submit Assignment</>}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// --- Personal Reminders ------------------------------------------------------
function NewslettersTab({ newsletters = [], showMessage }) {
  return (
    <div className="space-y-6">
      <PageTitle icon={Newspaper} title="Department Newsletters" accent="emerald"
        subtitle="Newsletters shared by your Head of Department." />
      {newsletters.length === 0 ? (
        <div className="glass-card p-12 border border-white/60">
          <EmptyState icon={Newspaper} title="No newsletters yet" accent="emerald" description="Department newsletters will appear here once uploaded." />
        </div>
      ) : (
        <div className="space-y-3">
          {newsletters.map(n => (
            <div key={n.id} className="glass-card p-5 border border-white/60 flex flex-wrap items-center gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800">{n.title}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {fmtDate(n.createdAt)} - {n.uploadedByName} - {n.fileName}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => downloadFile(`/api/newsletters/${n.id}/file`, n.fileName || 'newsletter.pdf').catch(() => showMessage('Download failed', 'error'))}>
                <Download size={13} /> Download
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function RemindersTab({ reminders = [], loading, onCreate, onToggle, onDelete }) {
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const pending = reminders.filter(r => !r.completed).length

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
      <PageTitle
        icon={ListTodo}
        title="My Reminders"
        subtitle="Personal tasks and reminders. Tick them off once completed."
        accent="emerald"
        actions={reminders.length > 0
          ? <Badge variant={pending ? 'warning' : 'success'}>{pending ? `${pending} pending` : 'All done'}</Badge>
          : undefined}
      />

      <div className="glass-card p-6 border border-white/60">
        <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Plus size={15} className="text-emerald-500" /> Add a reminder
        </h3>
        <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Submit physics record book by Friday"
            maxLength={200}
            className="collego-input flex-1"
          />
          <Button type="submit" variant="gradient" disabled={!title.trim() || busy}>
            {busy ? <><RefreshCw size={14} className="animate-spin" /> Adding...</> : <><Plus size={14} /> Add Reminder</>}
          </Button>
        </form>
        <p className="text-[10px] text-slate-400 mt-2">Reminders are private to your account.</p>
      </div>

      <div className="glass-card p-6 border border-white/60">
        <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <ListTodo size={15} className="text-emerald-500" /> To be completed
        </h3>
        {loading ? (
          <div className="flex items-center justify-center py-10"><Spinner color="emerald" /></div>
        ) : reminders.length === 0 ? (
          <EmptyState icon={ListTodo} title="No reminders yet" accent="emerald" description="Add your first personal task above." />
        ) : (
          <div className="divide-y divide-white/60">
            {reminders.map(r => (
              <div key={r.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <button
                  type="button"
                  onClick={() => onToggle(r.id)}
                  aria-label={r.completed ? 'Mark as pending' : 'Mark as completed'}
                  className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                    r.completed
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'border-slate-300 hover:border-emerald-500'
                  )}
                >
                  {r.completed && <CheckCircle2 size={14} />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={cn('text-sm', r.completed ? 'line-through text-slate-400' : 'text-slate-700')}>
                    {r.title}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Added {fmtDate(r.createdAt)}
                    {r.completedAt ? ` - Completed ${fmtDate(r.completedAt)}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(r.id)}
                  aria-label="Delete reminder"
                  className="text-slate-300 hover:text-red-500 transition-colors p-1"
                >
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

// --- Study Materials ---------------------------------------------------------
function MaterialsTab({ materials = [], loading, onDownload }) {
  const list = Array.isArray(materials) ? materials : []

  return (
    <div className="space-y-6">
      <PageTitle icon={FolderOpen} title="Study Materials" subtitle="Notes, slides and references shared with your department and academic year." accent="blue" image={uiImages.library} imageAlt="Students studying in the library" />
      {loading ? (
        <div className="flex items-center justify-center py-16"><Spinner color="blue" /></div>
      ) : list.length === 0 ? (
        <div className="glass-card p-12 border border-white/60">
          <EmptyState icon={FolderOpen} title="No study materials yet" accent="blue" description="Materials shared by your department faculty will appear here." />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {list.map((m, i) => (
            <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="glass-card p-5 border border-white/60 hover:border-indigo-300/70 transition-all flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{m.title}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{m.courseName} - {m.courseCode}</p>
                </div>
                <Badge variant="info">{m.materialType || 'MATERIAL'}</Badge>
              </div>
              {m.description && <p className="text-sm text-slate-500 mt-3 leading-relaxed line-clamp-3">{m.description}</p>}
              <div className="flex items-center justify-between gap-3 mt-auto pt-4 border-t border-white/60">
                <p className="text-[11px] text-slate-400 truncate flex items-center gap-1.5">
                  <Paperclip size={12} /> {m.fileName || 'No attachment'}
                </p>
                {m.hasFile && (
                  <Button variant="outline" size="sm" onClick={() => onDownload(`/api/student/materials/${m.id}/file`, m.fileName || `material-${m.id}`)}>
                    <Download size={12} /> Download
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

// --- Placements --------------------------------------------------------------
function QuestionPapersTab({ papers, onDownload }) {
  return (
    <div className="space-y-6">
      <PageTitle icon={FileText} title="Question Papers" subtitle="Previous and current question papers published for your department and academic year." accent="violet" image={uiImages.classroom} imageAlt="Classroom lecture" />
      {(!papers || papers.length === 0) ? (
        <div className="glass-card p-12 border border-white/60">
          <EmptyState icon={FileText} title="No question papers yet" accent="violet" description="Papers uploaded by your department faculty will appear here." />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {papers.map((qp, i) => (
            <motion.div key={qp.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="glass-card p-5 border border-white/60 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{qp.courseName}</p>
                  <p className="text-[11px] text-slate-400">{qp.courseCode} - {qp.departmentName}</p>
                </div>
                <Badge variant="info">{qp.examType}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                <span className="flex items-center gap-1"><Calendar size={12} /> {qp.year}</span>
                <span>Semester {qp.semesterNumber}</span>
                {qp.uploadedByName && <span>By {qp.uploadedByName}</span>}
                <span className="flex items-center gap-1"><Download size={12} /> {qp.downloadCount || 0}</span>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-white/60 pt-3">
                <p className="text-[11px] text-slate-400 truncate flex items-center gap-1"><Paperclip size={12} /> {qp.fileName || 'Question paper'}</p>
                <Button variant="outline" size="sm" disabled={!qp.fileName} onClick={() => onDownload(`/api/student/question-papers/${qp.id}/file`, qp.fileName || `question-paper-${qp.id}.pdf`)}>
                  <Download size={13} /> Download
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

function PlacementsTab({ notices, onDownload }) {
  return (
    <div className="space-y-6">
      <PageTitle icon={Briefcase} title="Placement Notices" subtitle="Active campus drives and internship opportunities." accent="emerald" image={uiImages.placementsFair} imageAlt="Campus placement fair" />
      {(!notices || notices.length === 0) ? (
        <div className="glass-card p-12 border border-white/60"><EmptyState icon={Briefcase} title="No placement notices" accent="emerald" description="New drives will be announced here." /></div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {notices.map(notice => {
            const isExpired = notice.lastDate && new Date(notice.lastDate) < new Date()
            return (
              <motion.div key={notice.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={cn('glass-card p-5 border border-white/60 hover:border-indigo-300/70 hover:-translate-y-1 transition-all', isExpired ? 'opacity-70' : '')}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-slate-800 truncate">{notice.title}</h3>
                      {isExpired && <Badge variant="secondary">Expired</Badge>}
                    </div>
                    <p className="text-sm text-emerald-600 font-medium mb-2.5 flex items-center gap-1.5"><Briefcase size={13} /> {notice.companyName}</p>
                    <p className="text-sm text-slate-500 mb-4 line-clamp-3">{notice.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {notice.eligibilityCriteria && <Badge variant="secondary">{notice.eligibilityCriteria}</Badge>}
                      {notice.packageOffered && <Badge variant="success">Rs. {notice.packageOffered}</Badge>}
                      {notice.departmentName && <Badge variant="info">{notice.departmentName}</Badge>}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 mt-4 text-[11px] text-slate-500">
                      {notice.driveDate && <span className="flex items-center gap-1"><Calendar size={12} /> Drive: {fmtDate(notice.driveDate)}</span>}
                      {notice.hasAttachment && (
                        <button className="text-indigo-600 hover:underline flex items-center gap-1"
                          onClick={() => onDownload?.(`/api/placement/notices/${notice.id}/attachment`, notice.attachmentName || 'placement-drive.pdf')}>
                          <Paperclip size={12} /> {notice.attachmentName || 'Attachment'}
                        </button>
                      )}
                    </div>
                  </div>
                  {notice.lastDate && (
                    <div className={cn('text-right shrink-0', isExpired ? 'text-slate-400' : 'text-amber-600')}>
                      <p className="text-[9px] font-semibold uppercase tracking-wider">Last Date</p>
                      <p className="text-sm font-bold">{fmtDate(notice.lastDate)}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// --- Notifications -----------------------------------------------------------
const NOTIF_TYPES = { ACADEMIC: { v: 'info', label: 'Academic' }, PLACEMENT: { v: 'purple', label: 'Placement' }, EXAM: { v: 'destructive', label: 'Exam' }, GENERAL: { v: 'secondary', label: 'General' } }

function NotificationsTab({ notifications, onMarkRead }) {
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
      <PageTitle icon={Bell} title="Notifications" subtitle="Announcements and updates from your college." accent="blue" image={uiImages.campusReading} imageAlt="Student reading on campus" />
      {attachmentError && <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-600">{attachmentError}</div>}
      <div className="space-y-3">
        {(notifications || []).map(n => {
          const cfg = NOTIF_TYPES[n.type] || NOTIF_TYPES.GENERAL
          return (
            <motion.div key={n.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              className={cn('glass-card p-4 flex items-start gap-4 border border-white/60 hover:border-indigo-300/70 transition-all', !n.read ? 'bg-indigo-50/50 border-indigo-100/50' : 'bg-white/60')}>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 shadow-sm shadow-indigo-500/10">
                <Bell size={16} className="text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={cfg.v} className="text-[10px] px-2 py-0.5">{cfg.label}</Badge>
                  <span className="text-[10px] text-slate-400">{fmtDate(n.createdAt)}</span>
                </div>
                <p className="text-sm font-semibold text-slate-800">{n.title}</p>
                <p className="text-sm text-slate-500 mt-0.5">{n.message}</p>
                {n.hasAttachment && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2">
                    <Paperclip size={13} className="text-indigo-500 shrink-0" />
                    <span className="text-xs font-medium text-slate-600 truncate max-w-[240px]">{n.attachmentFileName || 'Attachment'}</span>
                    <button onClick={() => openAttachment(n)} className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:underline"><Eye size={12} /> View</button>
                    <button onClick={() => saveAttachment(n)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:underline"><Download size={12} /> Download</button>
                  </div>
                )}
              </div>
              {!n.read && <Button variant="outline" size="sm" onClick={() => onMarkRead(n.id)} className="shrink-0 px-3">Mark read</Button>}
            </motion.div>
          )
        })}
        {!notifications?.length && <div className="glass-card p-12 border border-white/60"><EmptyState icon={Bell} title="No notifications" accent="blue" description="You're all caught up." /></div>}
      </div>
    </div>
  )
}

// --- Documents ---------------------------------------------------------------
function DocumentsTab({ semesters = [], showMessage }) {
  const [downloading, setDownloading] = useState(null)
  const list = Array.isArray(semesters) ? semesters : []

  const downloadDocument = async (semesterId, semName) => {
    try {
      setDownloading(`sem-${semesterId}`)
      const res = await api.get(`/api/student/marksheet/${semesterId}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `internal_assessment_${semName.replace(/ /g, '_')}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
      showMessage(`Downloaded ${semName} internal assessment & attendance`)
    } catch (err) {
      showMessage(err.response?.data?.message || `No internal assessment data for ${semName}`, 'error')
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageTitle
        icon={FileText}
        title="Academic Documents"
        subtitle="Download semester-wise internal assessment marks and attendance."
        accent="violet"
        image={uiImages.studentServices}
        imageAlt="Student services desk"
      />
      <div>
        <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-4">Semester-wise Documents</h3>
        <div className="space-y-3">
          {list.map(sem => (
            <div key={sem.id} className="glass-card p-5 flex items-center justify-between border border-white/60 hover:border-indigo-300/70 transition-all">
              <div>
                <p className="font-semibold text-slate-800">{sem.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {sem.academicYear} - Internal exam marks & attendance %
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadDocument(sem.id, sem.name)}
                disabled={downloading === `sem-${sem.id}`}
                className="px-4"
              >
                <Download size={13} /> {downloading === `sem-${sem.id}` ? 'Generating...' : 'Download PDF'}
              </Button>
            </div>
          ))}
          {!list.length && (
            <EmptyState
              icon={FileText}
              title="No documents yet"
              accent="violet"
              description="Documents appear once you are enrolled in a semester."
            />
          )}
        </div>
      </div>
    </div>
  )
}

// --- AI Assistant ------------------------------------------------------------
// Smart Search, Performance Prediction, Attendance Risk and Placement
// Readiness all live inside this one tab: the deterministic insights are
// rendered as assistant replies, and natural-language questions use the
// scoped chat tools on the backend.
const fmtNumber = (value, digits = 2) =>
  typeof value === 'number' ? value.toFixed(digits) : (value ?? '-')

// The model is told to answer in plain text but still slips in bold/heading
// markers. Chat bubbles render plain text, so strip the common ones.
const stripMarkdown = (text) => String(text ?? '')
  .replace(/\*\*(.+?)\*\*/g, '$1')
  .replace(/`([^`]+)`/g, '$1')
  .replace(/^#{1,6}\s+/gm, '')
  .replace(/^\s*[-*]\s+/gm, '- ')

const formatPerformanceInsight = (r) => [
  ' Performance prediction',
  '',
  `Predicted SGPA: ${fmtNumber(r.predictedSgpa)}`,
  `Predicted CGPA: ${fmtNumber(r.predictedCgpa)}`,
  `Trend: ${r.trend || '-'}`,
  `Risk level: ${r.riskLevel || '-'}`,
  `Confidence: ${Math.round((r.confidenceScore || 0) * 100)}%`,
  ...(r.insights?.length ? ['', ...r.insights.map(i => `- ${i}`)] : []),
].join('\n')

const formatAttendanceRisk = (r) => [
  ' Attendance risk',
  '',
  `Overall risk: ${r.overallRisk || '-'}`,
  r.summary || '',
  ...(r.riskItems?.length
    ? ['', ...r.riskItems.map(i => {
      const note = i.riskLevel === 'DEFAULTER'
        ? ' - critical: contact your faculty'
        : i.classesNeededToReach75 > 0
          ? ` - ${i.classesNeededToReach75} classes to reach 75%`
          : i.riskLevel === 'SAFE' ? ' - on track' : ' - keep attending'
      return `- ${i.courseCode} ${i.courseName}: ${fmtNumber(i.currentPercentage, 1)}% (${i.riskLevel})${note}`
    })]
    : []),
  ...(r.recommendations?.length ? ['', 'Recommendations:', ...r.recommendations.map(i => `- ${i}`)] : []),
].filter(Boolean).join('\n')

const formatPlacementReadiness = (r) => [
  ' Placement readiness',
  '',
  r.advice || '',
  ...(r.recommendations?.length
    ? ['', 'Recommended drives:', ...r.recommendations.map(c => `- ${c.companyName || c.company || c.name || 'Company'}${c.role ? ` - ${c.role}` : ''}`)]
    : []),
  ...(r.skillGaps?.length ? ['', 'Skill gaps:', ...r.skillGaps.map(s => `- ${s}`)] : []),
  ...(r.mockInterviewQuestions?.length ? ['', 'Mock interview questions:', ...r.mockInterviewQuestions.slice(0, 5).map(s => `- ${s}`)] : []),
].filter(Boolean).join('\n')

function AiAssistantTab({ overall, cgpa }) {
  const [messages, setMessages] = useState([{ role: 'assistant', content: "Hi! I'm Collego AI  Ask me anything about your attendance, marks, placements, timetable, and more. You can also use the quick tools below for predictions, risk analysis, placement readiness and smart search." }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState('')
  const [mode, setMode] = useState('chat') // 'chat' | 'search'

  const append = (content) => setMessages(prev => [...prev, { role: 'assistant', content: stripMarkdown(content) }])

  const sendMessage = async (override) => {
    const text = (typeof override === 'string' ? override : input).trim()
    if (!text || loading) return
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setInput('')
    setLoading(true)
    try {
      if (mode === 'search') {
        const res = await api.post('/api/ai/smart-search', { query: text })
        const route = res.data?.route ? `\n\nOpen: ${res.data.route}` : ''
        append(`${res.data?.message || 'No matching records found.'}${route}`)
      } else {
        const res = await api.post('/api/ai/chat', { message: text, history: messages.slice(-6).map(m => ({ role: m.role, content: m.content })), context: { attendance: overall, cgpa } })
        append(res.data.reply || "I couldn't process that. Please try again.")
      }
    } catch {
      append('AI service is temporarily offline. Please try again later.')
    } finally { setLoading(false) }
  }

  const runInsight = async (kind) => {
    if (actionLoading) return
    setActionLoading(kind)
    const prompts = {
      performance: 'Predict my performance',
      risk: 'Show my attendance risk',
      placement: 'Am I placement ready?',
    }
    setMessages(prev => [...prev, { role: 'user', content: prompts[kind] }])
    try {
      if (kind === 'performance') {
        const res = await api.get('/api/ai/performance-prediction')
        append(formatPerformanceInsight(res.data || {}))
      } else if (kind === 'risk') {
        const res = await api.get('/api/ai/attendance-risk')
        append(formatAttendanceRisk(res.data || {}))
      } else {
        const res = await api.post('/api/ai/placement-assistant', { requestType: 'recommend' })
        append(formatPlacementReadiness(res.data || {}))
      }
    } catch {
      append('That insight is unavailable right now. Please try again in a moment.')
    } finally { setActionLoading('') }
  }

  const quickPrompts = ['What is my current attendance?', 'Show my CGPA', 'What placements are available?', 'Show my timetable', 'Where are my study materials?']

  const tools = [
    { key: 'performance', label: 'Performance prediction', icon: Target, onClick: () => runInsight('performance') },
    { key: 'risk', label: 'Attendance risk', icon: AlertTriangle, onClick: () => runInsight('risk') },
    { key: 'placement', label: 'Placement readiness', icon: Briefcase, onClick: () => runInsight('placement') },
    { key: 'search', label: 'Smart search', icon: Search, onClick: () => { setMode('search'); setInput('') } },
  ]

  const busy = loading || Boolean(actionLoading)

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-160px)]">
      <PageTitle icon={Sparkles} title="AI College Assistant" subtitle="Ask anything, or use the built-in prediction, risk, placement and search tools." accent="violet"
        image={uiImages.onlineLearning} imageAlt="Student learning online"
        actions={<Badge variant="purple">AI Powered</Badge>} />

      <div className="flex flex-wrap gap-2">
        {tools.map(({ key, label, icon: Icon, onClick }) => (
          <button key={key} onClick={onClick} disabled={busy}
            className={cn(
              'text-xs px-3 py-1.5 rounded-xl font-medium border transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5',
              mode === 'search' && key === 'search'
                ? 'bg-violet-600 text-white border-violet-600'
                : 'bg-white border-white/60 text-slate-600 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-600'
            )}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      <div className="flex-1 glass-card overflow-hidden flex flex-col min-h-[400px] border border-white/60">
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5 pr-3">
          {messages.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center mr-2 shrink-0 self-end mb-1 shadow-sm shadow-violet-500/20">
                  <Bot size={14} className="text-white" />
                </div>
              )}
              <div className={cn('max-w-[85%] px-4 py-3 rounded-2xl text-sm', msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-sm shadow-sm shadow-indigo-500/20' : 'bg-slate-50/60 text-slate-700 rounded-bl-sm border border-white/60')}>
                {msg.role === 'assistant' && <p className="text-[10px] text-violet-600 font-semibold mb-1 uppercase tracking-wider">Collego AI</p>}
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
            </motion.div>
          ))}
          {busy && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shrink-0"><Bot size={14} className="text-white" /></div>
              <div className="bg-slate-100/60 px-4 py-3 rounded-2xl rounded-bl-sm">
                <div className="flex gap-1">{[0, 1, 2].map(i => <div key={i} className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}</div>
              </div>
            </div>
          )}
        </div>
        <div className="border-t border-white/60 p-4">
          {mode === 'search' && (
            <div className="flex items-center gap-2 mb-2 text-[11px] text-violet-600">
              <Search size={12} /> Smart search mode - searching your own college records.
              <button onClick={() => setMode('chat')} className="ml-auto text-slate-400 hover:text-slate-600 underline">Back to chat</button>
            </div>
          )}
          <div className="flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder={mode === 'search' ? "Search e.g. 'attendance below 75%', 'DBMS materials'..." : 'Ask about attendance, marks, placements, timetable...'} className="collego-input flex-1" />
            <Button variant="gradient" size="sm" onClick={() => sendMessage()} disabled={busy || !input.trim()} className="px-5">
              {mode === 'search' ? <><Search size={14} /> Search</> : <><Send size={14} /> Send</>}
            </Button>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {quickPrompts.map(p => (
          <button key={p} onClick={() => { setMode('chat'); setInput(p) }} className="text-xs bg-white border border-white/60 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-600 text-slate-500 px-3 py-1.5 rounded-xl font-medium transition-all active:scale-95">{p}</button>
        ))}
      </div>
    </div>
  )
}

// --- AI Resume Analyzer ------------------------------------------------------
const formatBytes = (bytes) => {
  if (!bytes) return '0 KB'
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function AiResumeAnalyzerTab() {
  const [file, setFile] = useState(null)
  const [targetRole, setTargetRole] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const fileRef = useRef(null)

  const chooseFile = (selected) => {
    if (!selected) return
    setFile(selected)
    setResult(null)
    setError('')
  }

  const clearFile = () => {
    setFile(null)
    setResult(null)
    setError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const analyze = async () => {
    if (!file) return
    setLoading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      if (targetRole.trim()) fd.append('targetRole', targetRole.trim())
      const res = await api.post('/api/ai/resume-analyze-file', fd)
      if (res.data?.error) {
        setError(res.data.message || 'The AI service is temporarily unavailable. Please try again.')
        setResult(null)
      } else {
        setResult(res.data)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not analyze this resume. Please try again.')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  const score = Number(result?.atsScore ?? 0)
  const scoreTone = score >= 80
    ? { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', bar: 'from-emerald-500 to-teal-500' }
    : score >= 60
      ? { text: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', bar: 'from-blue-500 to-cyan-500' }
      : score >= 40
        ? { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', bar: 'from-amber-500 to-orange-500' }
        : { text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', bar: 'from-red-500 to-rose-500' }

  const list = (value) => (Array.isArray(value) ? value : [])

  return (
    <div className="space-y-6">
      <PageTitle icon={FileText} title="AI Resume Analyzer" subtitle="Upload your resume to get an ATS score and specific, actionable feedback." accent="violet"
        actions={<Badge variant="purple">AI Powered</Badge>} />

      <div className="glass-card p-6 border border-white/60">
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Resume File</label>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              className="hidden"
              onChange={e => chooseFile(e.target.files?.[0])}
            />
            {file ? (
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50/60 px-4 py-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-violet-100 flex items-center justify-center text-violet-600 shrink-0">
                  <FileText size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 truncate">{file.name}</p>
                  <p className="text-[11px] text-slate-500">{formatBytes(file.size)} - ready to analyse</p>
                </div>
                <button onClick={clearFile} className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-white transition-colors" title="Remove file">
                  <X size={15} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/40 px-6 py-8 text-center hover:border-violet-300 hover:bg-violet-50/70 transition-all group"
              >
                <div className="w-12 h-12 mx-auto rounded-2xl bg-white border border-violet-100 flex items-center justify-center text-violet-500 group-hover:scale-105 transition-transform">
                  <Upload size={20} />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-800">Upload your resume</p>
                <p className="mt-1 text-xs text-slate-500">PDF, DOCX, TXT or MD - maximum 10 MB</p>
              </button>
            )}
          </div>

          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Target Role (optional)</label>
            <input value={targetRole} onChange={e => setTargetRole(e.target.value)} placeholder="e.g., Software Engineer" className="collego-input" />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-600">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button variant="gradient" onClick={analyze} disabled={loading || !file} className="w-auto px-6">
            {loading ? (
              <span className="flex gap-1"><RefreshCw size={14} className="animate-spin" /> Reading &amp; analyzing...</span>
            ) : (
              <span className="flex gap-1"><Sparkles size={14} /> Analyze Resume</span>
            )}
          </Button>
        </div>
      </div>

      {result && (
        <div className="space-y-4">
          <div className={cn('glass-card p-6 border', scoreTone.border)}>
            <div className="flex flex-wrap items-center gap-6">
              <div className={cn('w-28 h-28 rounded-full flex flex-col items-center justify-center border-4', scoreTone.border, scoreTone.bg)}>
                <span className={cn('text-3xl font-bold leading-none', scoreTone.text)}>{score}</span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">ATS Score</span>
              </div>
              <div className="flex-1 min-w-[220px]">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={score >= 80 ? 'success' : score >= 60 ? 'info' : score >= 40 ? 'warning' : 'destructive'}>
                    {result.readinessLevel || 'Analysis complete'}
                  </Badge>
                  <span className="text-xs text-slate-400">out of 100</span>
                </div>
                <p className="mt-2 text-sm text-slate-700 leading-relaxed">{result.summary || 'Your resume has been analysed.'}</p>
                <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className={cn('h-full rounded-full bg-gradient-to-r', scoreTone.bar)} style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ResumeInsightList title="Strengths" items={list(result.strengths)} icon={CheckCircle2} tone="emerald" />
            <ResumeInsightList title="Weaknesses" items={list(result.weaknesses)} icon={AlertTriangle} tone="red" />
            <ResumeInsightList title="Missing Skills" items={list(result.missingSkills)} icon={Target} tone="amber" />
            <ResumeInsightList title="Suggestions" items={list(result.suggestions)} icon={Sparkles} tone="indigo" />
          </div>
        </div>
      )}
    </div>
  )
}

function ResumeInsightList({ title, items, icon: Icon, tone }) {
  const tones = {
    emerald: 'border-emerald-100 bg-emerald-50/60 text-emerald-600',
    red: 'border-red-100 bg-red-50/60 text-red-600',
    amber: 'border-amber-100 bg-amber-50/60 text-amber-600',
    indigo: 'border-indigo-100 bg-indigo-50/60 text-indigo-600',
  }
  return (
    <div className="glass-card p-5 border border-white/60">
      <div className="flex items-center gap-2 mb-3">
        <div className={cn('w-8 h-8 rounded-xl border flex items-center justify-center', tones[tone])}>
          <Icon size={14} />
        </div>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      </div>
      {items.length ? (
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li key={index} className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
              <span className={cn('mt-1.5 w-1.5 h-1.5 rounded-full shrink-0', tone === 'red' ? 'bg-red-400' : tone === 'amber' ? 'bg-amber-400' : tone === 'emerald' ? 'bg-emerald-400' : 'bg-indigo-400')} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-slate-400">Nothing flagged here.</p>
      )}
    </div>
  )
}

// --- Main --------------------------------------------------------------------
// Maps a sidebar tab to the notification category that badges it.
const TAB_CATEGORY = {
  notifications: 'NOTICE',
  questionPapers: 'QUESTION_PAPER',
  materials: 'MATERIAL',
  assignments: 'ASSIGNMENT',
  exams: 'EXAM',
}

export default function StudentDashboard() {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [toast, setToast] = useState({ text: '', type: 'success' })

  const [profile, setProfile] = useState(null)
  const [overall, setOverall] = useState(null)
  const [subjects, setSubjects] = useState([])
  const [cgpa, setCgpa] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [timetable, setTimetable] = useState(null)
  const [internalMarks, setInternalMarks] = useState([])
  const [placements, setPlacements] = useState([])
  const [semesters, setSemesters] = useState([])
  const [mySemesters, setMySemesters] = useState([])
  const [reminders, setReminders] = useState([])
  const [remindersLoading, setRemindersLoading] = useState(true)
  const [newsletters, setNewsletters] = useState([])
  const [assignments, setAssignments] = useState([])
  const [materials, setMaterials] = useState([])
  const [questionPapers, setQuestionPapers] = useState([])
  const [facultyDirectory, setFacultyDirectory] = useState([])
  const [unreadCounts, setUnreadCounts] = useState({})
  const [loadingTab, setLoadingTab] = useState(false)

  const sidebarWidth = collapsed ? 76 : 248
  const showMsg = useCallback((text, type = 'success') => setToast({ text, type }), [])

  const refreshAssignments = useCallback(async () => {
    try {
      const res = await api.get('/api/student/assignments')
      setAssignments(Array.isArray(res.data) ? res.data : [])
    } catch { /* ignore */ }
  }, [])

  const refreshMaterials = useCallback(async () => {
    try {
      const res = await api.get('/api/student/materials')
      setMaterials(Array.isArray(res.data) ? res.data : [])
    } catch { /* ignore */ }
  }, [])

  const handleDownload = useCallback(async (url, name) => {
    try {
      await downloadFile(url, name)
    } catch (err) {
      showMsg(err.response?.data?.message || 'Download failed', 'error')
    }
  }, [showMsg])

  const handleSubmitAssignment = useCallback(async (assignmentId, file, note) => {
    const fd = new FormData()
    if (file) fd.append('file', file)
    if (note) fd.append('note', note)
    else if (!file) fd.append('note', 'Submitted physically to faculty (no file uploaded).')
    try {
      await api.post(`/api/student/assignments/${assignmentId}/submit`, fd)
      showMsg('Assignment submitted successfully')
      await refreshAssignments()
    } catch (err) {
      showMsg(err.response?.data?.message || 'Submission failed', 'error')
      throw err
    }
  }, [refreshAssignments, showMsg])

  const handleCreateReminder = useCallback(async (title) => {
    try {
      const res = await api.post('/api/student/reminders', { title })
      setReminders(prev => sortReminders([res.data, ...prev]))
      showMsg('Reminder added')
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to add reminder', 'error')
      throw err
    }
  }, [showMsg])

  const handleToggleReminder = useCallback(async (id) => {
    try {
      const res = await api.put(`/api/student/reminders/${id}/toggle`)
      setReminders(prev => sortReminders(prev.map(r => r.id === id ? res.data : r)))
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to update reminder', 'error')
    }
  }, [showMsg])

  const handleDeleteReminder = useCallback(async (id) => {
    if (!await confirmAction({ title: 'Are you sure?', message: 'Delete this reminder?', confirmLabel: 'Confirm' })) return
    try {
      await api.delete(`/api/student/reminders/${id}`)
      setReminders(prev => prev.filter(r => r.id !== id))
      showMsg('Reminder deleted')
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to delete reminder', 'error')
    }
  }, [showMsg])

  useEffect(() => {
    const load = async () => {
      const [prRes, atRes, ovRes, cgRes, notRes, ttRes, imRes, plRes, semRes, mySemRes, remRes, nlRes, asRes, maRes, qpRes, fdRes, ucRes] = await Promise.allSettled([
        api.get('/api/student/profile'),
        api.get('/api/student/attendance'),
        api.get('/api/student/attendance/overall'),
        api.get('/api/student/cgpa'),
        api.get('/api/student/notifications'),
        api.get('/api/student/timetable'),
        api.get('/api/student/marks/internal'),
        api.get('/api/student/placements'),
        api.get('/api/semesters'),
        api.get('/api/student/semesters'),
        api.get('/api/student/reminders'),
        api.get('/api/student/newsletters'),
        api.get('/api/student/assignments'),
        api.get('/api/student/materials'),
        api.get('/api/student/question-papers'),
        api.get('/api/faculty-directory'),
        api.get('/api/student/notifications/unread-counts'),
      ])
      if (prRes.status === 'fulfilled') setProfile(prRes.value.data)
      if (atRes.status === 'fulfilled') setSubjects(Array.isArray(atRes.value.data) ? atRes.value.data : [])
      if (ovRes.status === 'fulfilled') setOverall(ovRes.value.data)
      if (cgRes.status === 'fulfilled') setCgpa(cgRes.value.data)
      if (notRes.status === 'fulfilled') setNotifications(Array.isArray(notRes.value.data) ? notRes.value.data : [])
      if (ttRes.status === 'fulfilled') setTimetable(ttRes.value.data)
      if (imRes.status === 'fulfilled') setInternalMarks(Array.isArray(imRes.value.data) ? imRes.value.data : [])
      if (plRes.status === 'fulfilled') setPlacements(Array.isArray(plRes.value.data) ? plRes.value.data : [])
      if (semRes.status === 'fulfilled') setSemesters(Array.isArray(semRes.value.data) ? semRes.value.data : [])
      if (mySemRes.status === 'fulfilled') setMySemesters(Array.isArray(mySemRes.value.data) ? mySemRes.value.data : [])
      if (remRes.status === 'fulfilled') setReminders(sortReminders(remRes.value.data || []))
      if (nlRes.status === 'fulfilled') setNewsletters(Array.isArray(nlRes.value.data) ? nlRes.value.data : [])
      setRemindersLoading(false)
      if (asRes.status === 'fulfilled') setAssignments(Array.isArray(asRes.value.data) ? asRes.value.data : [])
      if (maRes.status === 'fulfilled') setMaterials(Array.isArray(maRes.value.data) ? maRes.value.data : [])
      if (qpRes.status === 'fulfilled') setQuestionPapers(Array.isArray(qpRes.value.data) ? qpRes.value.data : [])
      if (fdRes.status === 'fulfilled') setFacultyDirectory(Array.isArray(fdRes.value.data) ? fdRes.value.data : [])
      if (ucRes.status === 'fulfilled') setUnreadCounts(ucRes.value.data || {})
    }
    load()
  }, [])

  const handleMarkRead = async (id) => {
    try {
      await api.put(`/api/student/notifications/${id}/read`)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
      setUnreadCounts(prev => ({ ...prev, NOTICE: Math.max(0, (prev.NOTICE || 0) - 1) }))
    } catch { showMsg('Failed to mark as read', 'error') }
  }

  const handleSemesterChange = async (semId) => {
    setLoadingTab(true)
    try {
      const url = semId ? `/api/student/attendance?semesterId=${semId}` : '/api/student/attendance'
      const res = await api.get(url)
      setSubjects(Array.isArray(res.data) ? res.data : [])
    } catch { /* ignore */ } finally { setLoadingTab(false) }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  const navSections = NAV_SECTIONS.map(section => ({
    ...section,
    items: section.items.map(item => ({
      ...item,
      badge: TAB_CATEGORY[item.id] ? (unreadCounts[TAB_CATEGORY[item.id]] || 0) : 0,
    })),
  }))

  const handleTabChange = useCallback(async (id) => {
    setActiveTab(id)
    const category = TAB_CATEGORY[id]
    if (!category || !unreadCounts[category]) return
    setUnreadCounts(prev => ({ ...prev, [category]: 0 }))
    setNotifications(prev => prev.map(n => (n.category === category ? { ...n, read: true } : n)))
    try {
      await api.post(`/api/student/notifications/categories/${category}/read`)
    } catch { /* badge already cleared optimistically */ }
  }, [unreadCounts])

  const renderTab = () => {
    switch (activeTab) {
      case 'overview': return <OverviewTab profile={profile} overall={overall} subjects={subjects} cgpa={cgpa} notifications={notifications} placements={placements} reminders={reminders} onTabChange={handleTabChange} onCreateReminder={handleCreateReminder} onToggleReminder={handleToggleReminder} onDeleteReminder={handleDeleteReminder} />
      case 'attendance': return <AttendanceTab overall={overall} subjects={subjects} semesters={semesters} onSemesterChange={handleSemesterChange} loading={loadingTab} />
      case 'marks': return <MarksTab internalMarks={internalMarks} cgpa={cgpa} />
      case 'assignments': return <AssignmentsTab assignments={assignments} loading={loadingTab} onSubmit={handleSubmitAssignment} onDownload={handleDownload} />
      case 'materials': return <MaterialsTab materials={materials} loading={loadingTab} onDownload={handleDownload} />
      case 'questionPapers': return <QuestionPapersTab papers={questionPapers} onDownload={handleDownload} />
      case 'facultyDirectory': return <FacultyDirectoryTab faculty={facultyDirectory} onDownload={handleDownload} />
      case 'exams': return <ExamsStudentTab showMsg={showMsg} onDownload={handleDownload} />
      case 'timetable': return <TimetableTab timetable={timetable} loading={loadingTab} />
      case 'placements': return <PlacementsTab notices={placements} onDownload={handleDownload} />
      case 'notifications': return <NotificationsTab notifications={notifications} onMarkRead={handleMarkRead} />
      case 'documents': return <DocumentsTab semesters={mySemesters} showMessage={showMsg} />
      case 'newsletters': return <NewslettersTab newsletters={newsletters} showMessage={showMsg} />
      case 'aiAssistant': return <AiAssistantTab overall={overall} cgpa={cgpa} />
      case 'aiResumeAnalyzer': return <AiResumeAnalyzerTab />
      case 'settings': return <SettingsTab showMsg={showMsg} accent="blue" />
      case 'help': return <HelpTab accent="blue" />
      default: return null
    }
  }

  return (
    <div className="min-h-screen portal-bg">
      <Toast message={toast} onClose={() => setToast({ text: '', type: 'success' })} />
      <PortalSidebar
        collapsed={collapsed} onToggle={() => setCollapsed(c => !c)}
        navSections={navSections} activeTab={activeTab} onTabChange={handleTabChange}
        accent="emerald" portalLabel="Student Portal"
      />
      <PortalTopbar
        sidebarWidth={sidebarWidth} accent="emerald"
        user={{
          name: `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || 'Student',
          role: profile?.isCr
            ? `Class Representative - ${profile?.departmentName || 'Student'}`
            : (profile?.departmentName ? `Student - ${profile.departmentName}` : 'Student'),
          email: profile?.email,
        }}
        notificationCount={unreadCount}
        notifications={(notifications || []).map(n => ({ id: n.id, title: n.title, message: n.message }))}
        onLogout={() => { authService.clearTokens(); navigate('/login') }}
      />
      <main className="main-content" style={{ marginLeft: sidebarWidth }}>
        <div className="p-5 md:p-7 max-w-[1700px] mx-auto">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
              {renderTab()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
