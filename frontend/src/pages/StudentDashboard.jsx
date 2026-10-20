import { useState, useEffect, useCallback, useId } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, ClipboardCheck, BookMarked, Calendar,
  DollarSign, Briefcase, Bell, Sparkles, Target,
  TrendingUp, Download, Send, FileText,
  GraduationCap, CheckCircle2, Bot,
  Layers, Award, Wallet, ScrollText, Search, AlertTriangle, RefreshCw,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { authService } from '../services/authService'
import api from '../services/api'
import { cn } from '../lib/utils'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import {
  PortalSidebar, PortalTopbar, Toast, StatCard, Panel, PageTitle,
  WelcomeBanner, ChartTooltip, EmptyState, Spinner,
} from '../components/dashboard/PortalUI'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const fmtNum = (n, dp = 2) => (n == null ? '—' : Number(n).toFixed(dp))
const timeAgo = (ts) => {
  if (!ts) return ''
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return d === 1 ? 'Yesterday' : `${d}d ago`
}

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
      { id: 'timetable', label: 'Timetable', icon: Calendar },
      { id: 'documents', label: 'Documents', icon: FileText },
    ],
  },
  {
    title: 'Services',
    items: [
      { id: 'fees', label: 'Fee Status', icon: DollarSign },
      { id: 'placements', label: 'Placements', icon: Briefcase },
      { id: 'notifications', label: 'Notifications', icon: Bell },
    ],
  },
  {
    title: 'AI Assistant',
    items: [
      { id: 'aiAssistant', label: 'AI Assistant', icon: Sparkles },
      { id: 'aiPrediction', label: 'AI Prediction', icon: Target },
      { id: 'aiSmartSearch', label: 'Smart Search', icon: Search },
      { id: 'aiAttendanceRisk', label: 'Attendance Risk', icon: AlertTriangle },
      { id: 'aiResumeAnalyzer', label: 'Resume Analyzer', icon: FileText },
      { id: 'aiPlacementAssistant', label: 'Placement Assistant', icon: Briefcase },
      { id: 'aiQpInsights', label: 'QP Insights', icon: FileText },
    ],
  },
]

// ─── Sparkline (premium area) ─────────────────────────────────────────────────
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

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({ profile, overall, subjects, cgpa, fees, notifications, placements, timetable, onTabChange }) {
  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'
  const unread = notifications.filter(n => !n.read).length
  const pendingFees = fees.filter(f => f.status === 'PENDING')
  const overallPct = overall?.overallPercentage || 0

  const sgpaData = (cgpa?.semesters || []).map(s => ({ name: s.semesterName?.substring(0, 4) || 'Sem', v: s.sgpa || 0 }))
  const attData = [50, 60, 55, 70, 65, 78, 75, 80, 82, 87].map(v => ({ v }))

  const statCards = [
    { label: 'Overall Attendance', value: overallPct, decimals: 1, suffix: '%', icon: ClipboardCheck, accent: 'emerald',
      sub: `${overall?.totalPresent ?? 0}/${overall?.totalClasses ?? 0} classes`, onClick: () => onTabChange('attendance'),
      spark: <Sparkline data={attData} color="#10b981" />, glow: true },
    { label: 'Current CGPA', value: cgpa?.cumulativeCgpa ?? 0, decimals: 2, icon: GraduationCap, accent: 'violet',
      sub: `${cgpa?.totalCreditsAllSemesters?.toFixed(0) ?? 0} total credits`, onClick: () => onTabChange('marks'),
      spark: <Sparkline data={sgpaData.length ? sgpaData : [{ v: 0 }]} color="#8b5cf6" />, glow: true },
    { label: 'Fee Status', value: pendingFees.length === 0 ? 'Clear' : `${pendingFees.length} Pending`, icon: Wallet,
      accent: pendingFees.length === 0 ? 'emerald' : 'amber',
      sub: pendingFees.length === 0 ? 'All paid' : 'Action required', onClick: () => onTabChange('fees'),
      spark: <Sparkline data={[{ v: 80 }, { v: 60 }, { v: 90 }]} color="#f59e0b" />, glow: true },
    { label: 'Notifications', value: unread, icon: Bell, accent: 'blue',
      sub: `${notifications.length} total`, onClick: () => onTabChange('notifications'),
      spark: <Sparkline data={[{ v: 3 }, { v: 5 }, { v: 2 }, { v: 7 }, { v: 4 }]} color="#3b82f6" />, glow: true },
  ]

  const today = DAY_ORDER[now.getDay() === 0 ? 5 : now.getDay() - 1]
  const todaySlots = (timetable?.weeklySchedule?.[today] || []).slice().sort((a, b) => a.startTime?.localeCompare(b.startTime))
  const upcomingPlacements = (placements || []).filter(p => !p.lastDate || new Date(p.lastDate) >= new Date()).slice(0, 3)

  return (
    <div className="space-y-8">
      <WelcomeBanner
        greeting={greeting}
        name={profile?.firstName || 'Student'}
        subtitle={`${profile?.enrollmentNumber || ''} · ${profile?.departmentName || ''} · Semester ${profile?.currentSemester || ''} · Section ${profile?.section || ''}`}
        quote="Every class attended is a step closer to your goal"
        accent="emerald"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((c, i) => <StatCard key={c.label} index={i} {...c} />)}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <Panel title="Subject-wise Attendance" icon={ClipboardCheck} accent="emerald" className="xl:col-span-5"
          action={<button onClick={() => onTabChange('attendance')} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50/50 px-2 py-1 rounded-lg transition-colors">Details</button>}>
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

        <Panel title="SGPA History" icon={GraduationCap} accent="violet" className="xl:col-span-4">
          {sgpaData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={sgpaData} margin={{ top: 8, right: 8, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="sgpaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="v" stroke="#8b5cf6" fill="url(#sgpaGrad)" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 3 }} name="SGPA" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={GraduationCap} title="No results yet" accent="violet" description="SGPA trend appears after semester results." />
          )}
          <div className="mt-4 p-3 rounded-2xl border border-violet-100 bg-violet-50/40 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Cumulative CGPA</p>
              <span className="text-2xl font-bold text-violet-600">{fmtNum(cgpa?.cumulativeCgpa)}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-white/70 flex items-center justify-center text-violet-600 border border-violet-200">
              <GraduationCap size={14} />
            </div>
          </div>
        </Panel>

        <Panel title="Today's Schedule" icon={Calendar} accent="blue" className="xl:col-span-3"
          action={<button onClick={() => onTabChange('timetable')} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50/50 px-2 py-1 rounded-lg transition-colors">Full</button>}>
          {todaySlots.length === 0 ? (
            <EmptyState icon={Calendar} title="No classes today" accent="blue" description="Enjoy your day off!" />
          ) : (
            <div className="space-y-2">
              {todaySlots.map(slot => (
                <div key={slot.id} className="flex items-center gap-3 p-3 rounded-xl border border-white/60 bg-white/70 backdrop-blur-sm hover:bg-white transition-all group">
                  <div className="text-center shrink-0 w-16">
                    <p className="text-xs font-bold font-mono text-indigo-600">{slot.startTime}</p>
                    <p className="text-[9px] font-mono text-slate-400">{slot.endTime}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-800 truncate">{slot.courseName}</p>
                    <p className="text-[9px] text-slate-400 truncate">{slot.roomNumber} · {slot.facultyName || 'TBD'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title="Recent Notifications" icon={Bell} accent="blue"
          action={<button onClick={() => onTabChange('notifications')} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50/50 px-2 py-1 rounded-lg transition-colors">View All</button>}>
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
          action={<button onClick={() => onTabChange('placements')} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50/50 px-2 py-1 rounded-lg transition-colors">View All</button>}>
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
    </div>
  )
}

// ─── Attendance ──────────────────────────────────────────────────────────────
function AttendanceTab({ overall, subjects, semesters, onSemesterChange, loading }) {
  const pct = overall?.overallPercentage || 0
  const overallAccent = pct >= 75 ? 'emerald' : pct >= 50 ? 'amber' : 'violet'
  return (
    <div className="space-y-6">
      <PageTitle icon={ClipboardCheck} title="Attendance" subtitle="Your attendance across enrolled subjects." accent="emerald"
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
      )}
    </div>
  )
}

// ─── Marks ───────────────────────────────────────────────────────────────────
function MarksTab({ internalMarks, cgpa }) {
  const [view, setView] = useState('cgpa')
  return (
    <div className="space-y-6">
      <PageTitle icon={BookMarked} title="Marks & Results" subtitle="Semester grades, CGPA and internal assessment marks." accent="violet"
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
                  <p className="text-[10px] text-slate-400">{sem.academicYear} · {sem.totalCredits?.toFixed(0)} credits</p>
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
                        <td style={{ textAlign: 'center' }}>{sub.obtainedMarks != null ? `${sub.obtainedMarks}/${sub.maxMarks}` : '—'}</td>
                        <td style={{ textAlign: 'center' }}><span className="font-bold" style={{ color: GRADE_COLORS[sub.grade] || '#64748b' }}>{sub.grade || '—'}</span></td>
                        <td style={{ textAlign: 'center', color: '#64748b' }}>{sub.gradePoints?.toFixed(1) ?? '—'}</td>
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
                    <td style={{ textAlign: 'center' }}>{m.ia1ObtainedMarks != null ? <span className="text-violet-600 font-semibold">{m.ia1ObtainedMarks} / {m.ia1MaxMarks}</span> : <span className="text-slate-300">—</span>}</td>
                    <td style={{ textAlign: 'center' }}>{m.ia2ObtainedMarks != null ? <span className="text-violet-600 font-semibold">{m.ia2ObtainedMarks} / {m.ia2MaxMarks}</span> : <span className="text-slate-300">—</span>}</td>
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

// ─── Timetable ───────────────────────────────────────────────────────────────
function TimetableTab({ timetable, loading }) {
  const days = timetable?.weeklySchedule ? DAY_ORDER.filter(d => timetable.weeklySchedule[d]?.length > 0) : []
  return (
    <div className="space-y-6">
      <PageTitle icon={Calendar} title="Timetable" subtitle="Your weekly class schedule." accent="blue" />
      {loading ? (
        <div className="flex items-center justify-center py-16"><Spinner color="blue" /></div>
      ) : days.length === 0 ? (
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
                        <p className="text-xs text-slate-500">{slot.courseCode} · Sec {slot.sectionName}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm text-slate-600">{slot.facultyName || '—'}</p>
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

// ─── Fees ────────────────────────────────────────────────────────────────────
function FeesTab({ fees, loading }) {
  const totalDue = fees.filter(f => f.status !== 'PAID').reduce((s, f) => s + Number(f.totalAmount || 0), 0)
  return (
    <div className="space-y-6">
      <PageTitle icon={Wallet} title="Fee Status" subtitle="Your semester fee structure and payment history." accent="amber" />
      {fees.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard index={0} label="Total Records" value={fees.length} icon={ScrollText} accent="blue" glow />
          <StatCard index={1} label="Outstanding" value={totalDue} prefix="₹" icon={Wallet} accent={totalDue > 0 ? 'amber' : 'emerald'} sub="Due amount" glow />
          <StatCard index={2} label="Paid Semesters" value={fees.filter(f => f.status === 'PAID').length} icon={CheckCircle2} accent="emerald" glow />
        </div>
      )}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Spinner color="amber" /></div>
      ) : fees.length === 0 ? (
        <div className="glass-card p-12 border border-white/60"><EmptyState icon={Wallet} title="No fee records" accent="amber" description="Fee details will appear here once published." /></div>
      ) : (
        <div className="space-y-4">
          {fees.map(fee => {
            const isPaid = fee.status === 'PAID'
            return (
              <motion.div key={fee.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card overflow-hidden border border-white/60 hover:border-white/80 transition-all">
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-white/50">
                  <div>
                    <p className="font-semibold text-slate-800">{fee.semesterName}</p>
                    <p className="text-xs text-slate-400">Due: {fmtDate(fee.dueDate)}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-800">₹{Number(fee.totalAmount).toLocaleString('en-IN')}</p>
                      <p className="text-xs text-slate-400">Total Amount</p>
                    </div>
                    <Badge variant={isPaid ? 'success' : 'warning'}>{fee.status}</Badge>
                  </div>
                </div>
                {fee.items?.map((item, i) => (
                  <div key={i} className="flex justify-between items-center px-5 py-3 text-sm border-b border-white/30 last:border-0 hover:bg-white/30 transition-colors">
                    <span className="text-slate-500">{item.description}</span>
                    <span className="text-slate-700 font-medium">₹{Number(item.amount).toLocaleString('en-IN')}</span>
                  </div>
                ))}
                {isPaid && (
                  <div className="px-5 py-3 bg-emerald-50/40 border-t border-emerald-100/50">
                    <p className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 size={11} /> Paid on {fmtDate(fee.paidAt)}{fee.transactionRef && <span className="ml-2 text-slate-400 text-[10px]">Ref: {fee.transactionRef}</span>}</p>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Placements ──────────────────────────────────────────────────────────────
function PlacementsTab({ notices }) {
  return (
    <div className="space-y-6">
      <PageTitle icon={Briefcase} title="Placement Notices" subtitle="Active campus drives and internship opportunities." accent="emerald" />
      {(!notices || notices.length === 0) ? (
        <div className="glass-card p-12 border border-white/60"><EmptyState icon={Briefcase} title="No placement notices" accent="emerald" description="New drives will be announced here." /></div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {notices.map(notice => {
            const isExpired = notice.lastDate && new Date(notice.lastDate) < new Date()
            return (
              <motion.div key={notice.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={cn('glass-card p-5 border border-white/60 hover:border-white/80 hover:-translate-y-1 transition-all', isExpired ? 'opacity-70' : '')}>
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
                      {notice.packageOffered && <Badge variant="success">₹ {notice.packageOffered}</Badge>}
                      {notice.departmentName && <Badge variant="info">{notice.departmentName}</Badge>}
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

// ─── Notifications ───────────────────────────────────────────────────────────
const NOTIF_TYPES = { ACADEMIC: { v: 'info', label: 'Academic' }, FEE: { v: 'warning', label: 'Fee' }, PLACEMENT: { v: 'purple', label: 'Placement' }, EXAM: { v: 'destructive', label: 'Exam' }, GENERAL: { v: 'secondary', label: 'General' } }

function NotificationsTab({ notifications, onMarkRead }) {
  return (
    <div className="space-y-6">
      <PageTitle icon={Bell} title="Notifications" subtitle="Announcements and updates from your college." accent="blue" />
      <div className="space-y-3">
        {(notifications || []).map(n => {
          const cfg = NOTIF_TYPES[n.type] || NOTIF_TYPES.GENERAL
          return (
            <motion.div key={n.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              className={cn('glass-card p-4 flex items-start gap-4 border border-white/60 hover:border-white/80 transition-all', !n.read ? 'bg-indigo-50/50 border-indigo-100/50' : 'bg-white/60')}>
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

// ─── Documents ───────────────────────────────────────────────────────────────
function DocumentsTab({ cgpa, showMessage }) {
  const [downloading, setDownloading] = useState(null)
  const downloadMarksheet = async (semesterId, semName) => {
    try {
      setDownloading(`sem-${semesterId}`)
      const res = await api.get(`/api/student/marksheet/${semesterId}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a'); a.href = url; a.download = `marksheet_${semName.replace(/ /g, '_')}.pdf`; a.click()
      window.URL.revokeObjectURL(url)
      showMessage(`Downloaded marksheet for ${semName}`)
    } catch (err) { showMessage(err.response?.data?.message || `No marks data for ${semName}`, 'error') } finally { setDownloading(null) }
  }
  const downloadTranscript = async () => {
    try {
      setDownloading('transcript')
      const res = await api.get('/api/student/transcript', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a'); a.href = url; a.download = 'academic_transcript.pdf'; a.click()
      window.URL.revokeObjectURL(url)
      showMessage('Transcript downloaded')
    } catch { showMessage('No academic data for transcript yet', 'error') } finally { setDownloading(null) }
  }
  const sems = cgpa?.semesters || []
  return (
    <div className="space-y-6">
      <PageTitle icon={FileText} title="Academic Documents" subtitle="Download your marksheets and official transcript." accent="violet" />
      <div className="glass-card p-6 flex flex-wrap items-center justify-between gap-5 border border-white/60">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/25">
            <ScrollText size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 mb-0.5">Full Academic Transcript</h3>
            <p className="text-sm text-slate-500">Complete academic history across all semesters with CGPA.</p>
          </div>
        </div>
        <Button variant="gradient" onClick={downloadTranscript} disabled={downloading === 'transcript'} className="px-5">
          <Download size={14} /> {downloading === 'transcript' ? 'Generating...' : 'Download Transcript'}
        </Button>
      </div>
      <div>
        <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-4">Semester Marksheets</h3>
        <div className="space-y-3">
          {sems.map(sem => (
            <div key={sem.semesterId} className="glass-card p-5 flex items-center justify-between border border-white/60 hover:border-white/80 transition-all">
              <div>
                <p className="font-semibold text-slate-800">{sem.semesterName}</p>
                <p className="text-xs text-slate-400 mt-0.5">{sem.academicYear} · {sem.subjects?.length} subjects · SGPA {fmtNum(sem.sgpa)}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => downloadMarksheet(sem.semesterId, sem.semesterName)} disabled={downloading === `sem-${sem.semesterId}`} className="px-4">
                <Download size={13} /> {downloading === `sem-${sem.semesterId}` ? 'Generating...' : 'Download PDF'}
              </Button>
            </div>
          ))}
          {!sems.length && <EmptyState icon={FileText} title="No documents yet" accent="violet" description="Marksheets appear once results are published." />}
        </div>
      </div>
    </div>
  )
}

// ─── AI Assistant ────────────────────────────────────────────────────────────
function AiAssistantTab({ overall, cgpa, fees }) {
  const [messages, setMessages] = useState([{ role: 'assistant', content: "Hi! I'm Collego AI 🤖 Ask me anything about your attendance, marks, fees, placements, timetable, and more!" }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const text = input
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setInput('')
    setLoading(true)
    try {
      const res = await api.post('/api/ai/chat', { message: text, history: messages.slice(-6).map(m => ({ role: m.role, content: m.content })), context: { attendance: overall, cgpa, fees } })
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply || "I couldn't process that. Please try again." }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'AI service is temporarily offline. Please try again later.' }])
    } finally { setLoading(false) }
  }

  const quickPrompts = ['What is my current attendance?', 'Show my CGPA', 'Any pending fees?', 'What placements are available?', 'Show my timetable']

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-160px)]">
      <PageTitle icon={Sparkles} title="AI College Assistant" subtitle="Your 24/7 academic companion." accent="violet"
        actions={<Badge variant="purple">AI Powered</Badge>} />
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
          {loading && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shrink-0"><Bot size={14} className="text-white" /></div>
              <div className="bg-slate-100/60 px-4 py-3 rounded-2xl rounded-bl-sm">
                <div className="flex gap-1">{[0, 1, 2].map(i => <div key={i} className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}</div>
              </div>
            </div>
          )}
        </div>
        <div className="border-t border-white/60 p-4 flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask about attendance, marks, fees, placements..." className="collego-input flex-1" />
          <Button variant="gradient" size="sm" onClick={sendMessage} disabled={loading || !input.trim()} className="px-5"><Send size={14} /> Send</Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {quickPrompts.map(p => (
          <button key={p} onClick={() => setInput(p)} className="text-xs bg-white border border-white/60 hover:border-violet-200 hover:text-violet-600 text-slate-500 px-3 py-1.5 rounded-xl font-medium transition-all active:scale-95">{p}</button>
        ))}
      </div>
    </div>
  )
}

// ─── AI Prediction ───────────────────────────────────────────────────────────
function AiPredictionTab() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await api.get('/api/ai/performance-prediction')
        setData(res.data)
      } catch (e) { setError(e.response?.data?.message || 'AI prediction service unavailable.') }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const RISK = { LOW: { v: 'success', label: 'Low Risk' }, MEDIUM: { v: 'warning', label: 'Medium Risk' }, HIGH: { v: 'destructive', label: 'High Risk' } }
  return (
    <div className="space-y-6">
      <PageTitle icon={Target} title="AI Performance Prediction" subtitle="CGPA/SGPA projection from your academic history using trend analysis." accent="indigo"
        actions={<Badge variant="purple">AI Powered</Badge>} />
      {loading && <div className="flex justify-center py-16"><Spinner color="indigo" /></div>}
      {error && <div className="glass-card p-5 border-red-100/50 bg-red-50/10"><p className="text-red-600 text-sm">{error}</p></div>}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard index={0} label="Predicted SGPA" value={data.predictedSgpa ?? 0} decimals={2} icon={TrendingUp} accent="indigo" glow />
          <div className="glass-card p-6 border border-white/60">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-4">Risk Level</p>
            <div className="flex items-center gap-2">
              <Badge variant={RISK[data.riskLevel]?.v ?? 'secondary'}>{RISK[data.riskLevel]?.label ?? data.riskLevel}</Badge>
            </div>
            <p className="text-[10px] text-slate-400 mt-4">Based on attendance & past performance</p>
          </div>
          <div className="glass-card p-6 border border-white/60">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-4">Trend</p>
            <p className="text-sm font-semibold text-slate-700 mt-2">{data.trend}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── AI Smart Search ─────────────────────────────────────────────────────────
function AiSmartSearchTab() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)

  const search = async () => {
    if (!query.trim()) return
    setLoading(true)
    try {
      const res = await api.post('/api/ai/smart-search', { query })
      setResults(res.data)
    } catch { setResults(null) }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <PageTitle icon={Search} title="AI Smart Search" subtitle="Search across attendance, marks, placements, notices, and more using natural language." accent="indigo"
        actions={<Badge variant="purple">AI Powered</Badge>} />
      <div className="glass-card p-6 border border-white/60">
        <div className="flex gap-2 mb-6">
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="e.g., 'Show my attendance below 75%', 'Find placement notices for CSE'..." className="collego-input flex-1" />
          <Button variant="gradient" onClick={search} disabled={loading || !query.trim()} className="px-5">
            {loading ? (
              <span className="flex gap-1"><RefreshCw size={14} className="animate-spin" /> Searching...</span>
            ) : (
              <span className="flex gap-1"><Search size={14} /> Search</span>
            )}
          </Button>
        </div>
        {loading && <div className="flex justify-center py-8"><Spinner color="indigo" /></div>}
        {results && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-800">Search Results</h3>
            {Object.entries(results).map(([key, value]) => (
              <div key={key} className="p-4 rounded-xl border border-white/60 bg-white/50">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{key}</p>
                <p className="text-sm text-slate-700">{JSON.stringify(value)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── AI Attendance Risk ──────────────────────────────────────────────────────
function AiAttendanceRiskTab() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await api.get('/api/ai/attendance-risk')
        setData(res.data)
      } catch (e) { setError(e.response?.data?.message || 'Attendance risk service unavailable.') }
      finally { setLoading(false) }
    }
    load()
  }, [])

  return (
    <div className="space-y-6">
      <PageTitle icon={AlertTriangle} title="Attendance Risk Early Warning" subtitle="AI-powered early warning for students at risk of low attendance." accent="amber"
        actions={<Badge variant="purple">AI Powered</Badge>} />
      {loading && <div className="flex justify-center py-16"><Spinner color="amber" /></div>}
      {error && <div className="glass-card p-5 border-red-100/50 bg-red-50/10"><p className="text-red-600 text-sm">{error}</p></div>}
      {data && (
        <div className="space-y-4">
          <div className="glass-card p-6 border border-white/60">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Subject Attendance Risk</h3>
            <div className="space-y-3">
              {(data.subjectAttendance || []).map((s, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-white/60 bg-white/50">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{s.courseName}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{s.courseCode}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-400">{s.present} / {s.totalClasses}</span>
                    <Badge variant={Number(s.percentage) >= 75 ? 'success' : Number(s.percentage) >= 50 ? 'warning' : 'destructive'}>
                      {Number(s.percentage).toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── AI Resume Analyzer ──────────────────────────────────────────────────────
function AiResumeAnalyzerTab() {
  const [resumeText, setResumeText] = useState('')
  const [targetRole, setTargetRole] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const analyze = async () => {
    if (!resumeText.trim()) return
    setLoading(true)
    try {
      const res = await api.post('/api/ai/resume-analyze', { resumeText, targetRole })
      setResult(res.data)
    } catch { setResult(null) }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <PageTitle icon={FileText} title="AI Resume Analyzer" subtitle="ATS-friendly resume analysis with feedback and improvement suggestions." accent="violet"
        actions={<Badge variant="purple">AI Powered</Badge>} />
      <div className="glass-card p-6 border border-white/60">
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Resume Text</label>
            <textarea value={resumeText} onChange={e => setResumeText(e.target.value)} rows={6} placeholder="Paste your resume text here..." className="collego-input resize-none" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Target Role (optional)</label>
            <input value={targetRole} onChange={e => setTargetRole(e.target.value)} placeholder="e.g., Software Engineer" className="collego-input" />
          </div>
          <Button variant="gradient" onClick={analyze} disabled={loading || !resumeText.trim()} className="w-auto px-6">
            {loading ? (
              <span className="flex gap-1"><RefreshCw size={14} className="animate-spin" /> Analyzing...</span>
            ) : (
              <span className="flex gap-1"><Sparkles size={14} /> Analyze Resume</span>
            )}
          </Button>
        </div>
      </div>
      {result && (
        <div className="glass-card p-6 border border-white/60">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Analysis Result</h3>
          <div className="space-y-3">
            <p className="text-sm text-slate-700">{typeof result === 'string' ? result : JSON.stringify(result)}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── AI Placement Assistant ──────────────────────────────────────────────────
function AiPlacementAssistantTab() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const ask = async () => {
    if (!query.trim()) return
    setLoading(true)
    try {
      const res = await api.post('/api/ai/placement-assistant', { query })
      setResult(res.data)
    } catch { setResult(null) }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <PageTitle icon={Briefcase} title="AI Placement Assistant" subtitle="AI-powered placement recommendations and mock interview preparation." accent="emerald"
        actions={<Badge variant="purple">AI Powered</Badge>} />
      <div className="glass-card p-6 border border-white/60">
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Ask about placements</label>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="e.g., 'Which companies are hiring CSE students?', 'Help me prepare for Google interview'..." className="collego-input" />
          </div>
          <Button variant="gradient" onClick={ask} disabled={loading || !query.trim()} className="w-auto px-6">
            {loading ? (
              <span className="flex gap-1"><RefreshCw size={14} className="animate-spin" /> Thinking...</span>
            ) : (
              <span className="flex gap-1"><Briefcase size={14} /> Get Advice</span>
            )}
          </Button>
        </div>
      </div>
      {result && (
        <div className="glass-card p-6 border border-white/60">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Placement Guidance</h3>
          <div className="space-y-3">
            <p className="text-sm text-slate-700">{typeof result === 'string' ? result : JSON.stringify(result)}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── AI Question Paper Insights ───────────────────────────────────────────────
function AiQuestionPaperInsightsTab() {
  const [courseId, setCourseId] = useState('')
  const [courseCode, setCourseCode] = useState('')
  const [courseName, setCourseName] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const getInsights = async () => {
    if (!courseId.trim()) return
    setLoading(true)
    try {
      const res = await api.get('/api/ai/question-paper-insights', {
        params: { courseId: Number(courseId), courseCode, courseName }
      })
      setResult(res.data)
    } catch { setResult(null) }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <PageTitle icon={FileText} title="AI Question Paper Insights" subtitle="Analyze past question papers for topic weightage and trends." accent="indigo"
        actions={<Badge variant="purple">AI Powered</Badge>} />
      <div className="glass-card p-6 border border-white/60">
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Course ID</label>
            <input value={courseId} onChange={e => setCourseId(e.target.value)} placeholder="e.g., 101" className="collego-input" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Course Code (optional)</label>
              <input value={courseCode} onChange={e => setCourseCode(e.target.value)} placeholder="CS101" className="collego-input" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Course Name (optional)</label>
              <input value={courseName} onChange={e => setCourseName(e.target.value)} placeholder="Data Structures" className="collego-input" />
            </div>
          </div>
          <Button variant="gradient" onClick={getInsights} disabled={loading || !courseId.trim()} className="w-auto px-6">
            {loading ? (
              <span className="flex gap-1"><RefreshCw size={14} className="animate-spin" /> Analyzing...</span>
            ) : (
              <span className="flex gap-1"><FileText size={14} /> Get Insights</span>
            )}
          </Button>
        </div>
      </div>
      {result && (
        <div className="glass-card p-6 border border-white/60">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Question Paper Analysis</h3>
          <div className="space-y-4">
            {typeof result === 'string' ? (
              <p className="text-sm text-slate-700">{result}</p>
            ) : (
              <div>
                {result.topicWeightage && (
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-2">Topic Weightage</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(result.topicWeightage).map(([topic, weight]) => (
                        <div key={topic} className="p-3 rounded-xl border border-white/60 bg-white/50">
                          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{topic}</p>
                          <p className="text-sm font-bold text-slate-800">{weight}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {result.importantQuestions && Array.isArray(result.importantQuestions) && (
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-2">Important Questions</p>
                    <ul className="space-y-2 text-sm text-slate-700">
                      {result.importantQuestions.map((q, i) => (
                        <li key={i} className="flex items-start gap-2 pl-3">
                          <span className="text-indigo-500">•</span>
                          {q}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.examPattern && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                    <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider mb-1">Exam Pattern</p>
                    <p className="text-sm text-slate-700">{result.examPattern}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function StudentDashboard() {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [toast, setToast] = useState({ text: '', type: 'success' })

  const [profile, setProfile] = useState(null)
  const [overall, setOverall] = useState(null)
  const [subjects, setSubjects] = useState([])
  const [cgpa, setCgpa] = useState(null)
  const [fees, setFees] = useState([])
  const [notifications, setNotifications] = useState([])
  const [timetable, setTimetable] = useState(null)
  const [internalMarks, setInternalMarks] = useState([])
  const [placements, setPlacements] = useState([])
  const [semesters, setSemesters] = useState([])
  const [loadingTab, setLoadingTab] = useState(false)

  const sidebarWidth = collapsed ? 76 : 248
  const showMsg = useCallback((text, type = 'success') => setToast({ text, type }), [])

  useEffect(() => {
    const load = async () => {
      const [prRes, atRes, ovRes, cgRes, feRes, notRes, ttRes, imRes, plRes, semRes] = await Promise.allSettled([
        api.get('/api/student/profile'),
        api.get('/api/student/attendance'),
        api.get('/api/student/attendance/overall'),
        api.get('/api/student/cgpa'),
        api.get('/api/student/fees'),
        api.get('/api/student/notifications'),
        api.get('/api/student/timetable'),
        api.get('/api/student/marks/internal'),
        api.get('/api/student/placements'),
        api.get('/api/semesters'),
      ])
      if (prRes.status === 'fulfilled') setProfile(prRes.value.data)
      if (atRes.status === 'fulfilled') setSubjects(Array.isArray(atRes.value.data) ? atRes.value.data : [])
      if (ovRes.status === 'fulfilled') setOverall(ovRes.value.data)
      if (cgRes.status === 'fulfilled') setCgpa(cgRes.value.data)
      if (feRes.status === 'fulfilled') setFees(Array.isArray(feRes.value.data) ? feRes.value.data : [])
      if (notRes.status === 'fulfilled') setNotifications(Array.isArray(notRes.value.data) ? notRes.value.data : [])
      if (ttRes.status === 'fulfilled') setTimetable(ttRes.value.data)
      if (imRes.status === 'fulfilled') setInternalMarks(Array.isArray(imRes.value.data) ? imRes.value.data : [])
      if (plRes.status === 'fulfilled') setPlacements(Array.isArray(plRes.value.data) ? plRes.value.data : [])
      if (semRes.status === 'fulfilled') setSemesters(Array.isArray(semRes.value.data) ? semRes.value.data : [])
    }
    load()
  }, [])

  const handleMarkRead = async (id) => {
    try {
      await api.put(`/api/student/notifications/${id}/read`)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
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

  const renderTab = () => {
    switch (activeTab) {
      case 'overview': return <OverviewTab profile={profile} overall={overall} subjects={subjects} cgpa={cgpa} fees={fees} notifications={notifications} placements={placements} timetable={timetable} onTabChange={setActiveTab} />
      case 'attendance': return <AttendanceTab overall={overall} subjects={subjects} semesters={semesters} onSemesterChange={handleSemesterChange} loading={loadingTab} />
      case 'marks': return <MarksTab internalMarks={internalMarks} cgpa={cgpa} />
      case 'timetable': return <TimetableTab timetable={timetable} loading={loadingTab} />
      case 'fees': return <FeesTab fees={fees} loading={loadingTab} />
      case 'placements': return <PlacementsTab notices={placements} />
      case 'notifications': return <NotificationsTab notifications={notifications} onMarkRead={handleMarkRead} />
      case 'documents': return <DocumentsTab cgpa={cgpa} showMessage={showMsg} />
      case 'aiAssistant': return <AiAssistantTab overall={overall} cgpa={cgpa} fees={fees} />
      case 'aiPrediction': return <AiPredictionTab />
      case 'aiSmartSearch': return <AiSmartSearchTab />
      case 'aiAttendanceRisk': return <AiAttendanceRiskTab />
      case 'aiResumeAnalyzer': return <AiResumeAnalyzerTab />
      case 'aiPlacementAssistant': return <AiPlacementAssistantTab />
      case 'aiQpInsights': return <AiQuestionPaperInsightsTab />
      default: return null
    }
  }

  return (
    <div className="min-h-screen portal-bg">
      <Toast message={toast} onClose={() => setToast({ text: '', type: 'success' })} />
      <PortalSidebar
        collapsed={collapsed} onToggle={() => setCollapsed(c => !c)}
        navSections={NAV_SECTIONS} activeTab={activeTab} onTabChange={setActiveTab}
        accent="emerald" portalLabel="Student Portal"
      />
      <PortalTopbar
        sidebarWidth={sidebarWidth} accent="emerald"
        user={{ name: `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || 'Student', role: profile?.departmentName ? `Student · ${profile.departmentName}` : 'Student', email: profile?.email }}
        placeholder="Search subjects, notices..."
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
