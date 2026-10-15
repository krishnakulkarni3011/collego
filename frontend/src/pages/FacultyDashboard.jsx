import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, BookOpen, ClipboardCheck, FileText,
  Megaphone, Target, ChevronRight, ChevronLeft, LogOut,
  Search, GraduationCap, Users, BookMarked, BarChart3,
  FolderOpen, Plus, CheckCircle2, X, Send, Sparkles,
  ArrowLeft, Edit, Clock, Calendar, Star, Trophy,
  AlertTriangle, TrendingUp, Upload, Grid3X3, Bell,
  RefreshCw, ChevronDown, Bot, Zap
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, AreaChart, Area
} from 'recharts'
import { authService } from '../services/authService'
import api from '../services/api'
import { cn } from '../lib/utils'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const fmtNum = (n, dp = 2) => (n == null ? '—' : Number(n).toFixed(dp))

// ─── Toast ───────────────────────────────────────────────────────────────────
function Toast({ message, onClose }) {
  useEffect(() => {
    if (message?.text) { const t = setTimeout(onClose, 4000); return () => clearTimeout(t) }
  }, [message, onClose])
  return (
    <AnimatePresence>
      {message?.text && (
        <motion.div
          initial={{ opacity: 0, y: -20, x: 20 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: -20, x: 20 }}
          className={cn(
            'fixed top-4 right-4 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-medium shadow-2xl border backdrop-blur-xl',
            message.type === 'error' ? 'bg-red-950/90 text-red-300 border-red-500/30' : 'bg-emerald-950/90 text-emerald-300 border-emerald-500/30'
          )}
        >
          {message.type === 'error' ? <X size={16} /> : <CheckCircle2 size={16} />}
          {message.text}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Attendance Badge ─────────────────────────────────────────────────────────
function AttBadge({ pct }) {
  if (pct >= 75) return <Badge variant="success">{pct}%</Badge>
  if (pct >= 50) return <Badge variant="warning">{pct}%</Badge>
  return <Badge variant="destructive">{pct}%</Badge>
}

// ─── Custom Tooltip ──────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card rounded-xl px-3 py-2.5 border border-violet-500/20">
      <p className="text-xs font-semibold text-zinc-300 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs" style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

// ─── Global Nav items ─────────────────────────────────────────────────────────
const GLOBAL_NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'questionPapers', label: 'Question Papers', icon: FileText },
  { id: 'notices', label: 'Notices', icon: Megaphone },
  { id: 'ai-notice-gen', label: 'AI Notice Generator', icon: Sparkles },
]

const SECTION_TABS = [
  { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
  { id: 'internalMarks', label: 'Internal Marks', icon: BookMarked },
  { id: 'semesterMarks', label: 'Semester Marks', icon: GraduationCap },
  { id: 'studentPerformance', label: 'Student Performance', icon: Users },
  { id: 'assignments', label: 'Assignments', icon: BookOpen },
  { id: 'materials', label: 'Materials', icon: FolderOpen },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
]

// ─── Sidebar ─────────────────────────────────────────────────────────────────
function Sidebar({ activeTab, selectedSection, sections, onGlobalNav, onSectionSelect, onBack, collapsed, onToggle, loading }) {
  return (
    <aside className={cn('sidebar', collapsed && 'collapsed')}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-zinc-800/60 shrink-0">
        <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/30">
          <GraduationCap size={18} className="text-white" />
        </div>
        {!collapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <p className="text-sm font-bold text-white">COLLEGO</p>
            <p className="text-[10px] text-zinc-500">Faculty Portal</p>
          </motion.div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-3 scrollbar-hide px-2">
        {/* Global Nav */}
        {!collapsed && <p className="text-[9px] font-semibold text-zinc-600 uppercase tracking-widest px-3 pt-2 pb-1.5">Dashboard</p>}
        {GLOBAL_NAV.map(item => {
          const Icon = item.icon
          const isActive = activeTab === item.id && !selectedSection
          return (
            <button
              key={item.id}
              onClick={() => onGlobalNav(item.id)}
              title={collapsed ? item.label : undefined}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative group mb-0.5',
                isActive ? 'bg-violet-500/10 text-violet-400 border-r-2 border-violet-500' : 'text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-200'
              )}
            >
              <Icon size={16} className="shrink-0" />
              {!collapsed && <span className="text-xs font-medium">{item.label}</span>}
              {isActive && !collapsed && <ChevronRight size={12} className="ml-auto" />}
              {collapsed && (
                <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-zinc-900 text-zinc-200 text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl border border-zinc-800">
                  {item.label}
                </div>
              )}
            </button>
          )
        })}

        {/* My Sections */}
        {!collapsed && <p className="text-[9px] font-semibold text-zinc-600 uppercase tracking-widest px-3 pt-4 pb-1.5">My Sections</p>}
        {loading && sections.length === 0 && !collapsed && (
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="w-4 h-4 border border-violet-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-zinc-600">Loading...</span>
          </div>
        )}
        {sections.length === 0 && !loading && !collapsed && (
          <p className="text-xs text-zinc-700 px-3 py-2">No sections assigned yet.</p>
        )}
        {sections.map(sec => {
          const isActive = selectedSection?.sectionId === sec.sectionId
          return (
            <button
              key={sec.sectionId}
              onClick={() => onSectionSelect(sec)}
              title={collapsed ? `${sec.courseName} (${sec.courseCode})` : undefined}
              className={cn(
                'w-full flex items-start gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative group mb-0.5',
                isActive ? 'bg-violet-500/10 text-violet-400 border-r-2 border-violet-500' : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
              )}
            >
              <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5', isActive ? 'bg-violet-500/20 text-violet-400' : 'bg-zinc-800 text-zinc-500')}>
                {sec.courseCode?.substring(0, 2)}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-medium truncate">{sec.courseName}</p>
                  <p className="text-[10px] text-zinc-600">Sec {sec.sectionName} · {sec.enrolledStudents} students</p>
                </div>
              )}
              {collapsed && (
                <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-zinc-900 text-zinc-200 text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl border border-zinc-800">
                  {sec.courseName} — Sec {sec.sectionName}
                </div>
              )}
            </button>
          )
        })}

        {/* Summary */}
        {!collapsed && sections.length > 0 && (
          <div className="mx-2 mt-4 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/40">
            <p className="text-[10px] text-zinc-600">
              <span className="text-zinc-300 font-semibold">{sections.length}</span> sections ·{' '}
              <span className="text-zinc-300 font-semibold">{sections.reduce((a, s) => a + (s.enrolledStudents || 0), 0)}</span> students
            </p>
          </div>
        )}
      </nav>

      <div className="border-t border-zinc-800/60 p-2 shrink-0">
        <button onClick={onToggle} className="w-full flex items-center justify-center gap-2 py-2 text-zinc-500 hover:text-zinc-300 text-xs rounded-xl hover:bg-zinc-800/60 transition-colors">
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  )
}

// ─── Topbar ───────────────────────────────────────────────────────────────────
function Topbar({ email, sidebarWidth, onLogout }) {
  const initials = email ? email.substring(0, 2).toUpperCase() : 'FC'
  return (
    <header className="topbar px-5" style={{ left: sidebarWidth }}>
      <div className="flex-1 flex items-center gap-3">
        <div className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-800 rounded-xl px-3.5 py-2.5 w-72 group focus-within:border-violet-500/50 transition-all">
          <Search size={14} className="text-zinc-600 group-focus-within:text-violet-400 transition-colors" />
          <input className="bg-transparent text-sm text-zinc-400 placeholder-zinc-600 outline-none w-full" placeholder="Search students, courses, papers..." />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="p-2 rounded-xl text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-all"><Bell size={17} /></button>
        <div className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-zinc-800/60 transition-all">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-xs font-bold text-white">{initials}</div>
          <div className="hidden md:block">
            <p className="text-xs font-semibold text-zinc-200">Faculty User</p>
            <p className="text-[10px] text-zinc-500">{email}</p>
          </div>
        </div>
        <button onClick={onLogout} className="p-2 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Logout">
          <LogOut size={15} />
        </button>
      </div>
    </header>
  )
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({ sections, overviewData, onSectionSelect }) {
  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'
  const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl p-6 border border-violet-500/10 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(168,85,247,0.05) 50%, rgba(6,182,212,0.03) 100%)' }}>
        <h2 className="text-2xl font-bold text-white">{greeting}, Faculty 👋</h2>
        <p className="text-zinc-500 text-sm mt-1">Here's a summary of your teaching assignments.</p>
        <div className="absolute right-6 top-4 opacity-10 text-7xl pointer-events-none">🏫</div>
      </motion.div>

      {/* Stats */}
      {overviewData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Sections Assigned', value: overviewData.totalSections, icon: BookOpen, color: 'text-violet-400', bg: 'bg-violet-500/10' },
            { label: 'Total Students', value: overviewData.totalStudents, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { label: 'Unique Courses', value: overviewData.courses.length, icon: BookMarked, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Semesters', value: overviewData.semesters.length, icon: Calendar, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          ].map((s, i) => {
            const Icon = s.icon
            return (
              <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="glass-card rounded-2xl p-5">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', s.bg)}>
                  <Icon size={18} className={s.color} />
                </div>
                <p className="text-xs text-zinc-500">{s.label}</p>
                <p className={cn('text-3xl font-bold mt-1', s.color)}>{s.value}</p>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Section Cards */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-400 mb-3 flex items-center gap-2">
          <BookOpen size={14} /> My Teaching Sections
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sections.map((sec, i) => (
            <motion.button
              key={sec.sectionId}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => onSectionSelect(sec)}
              className="glass-card rounded-2xl p-5 text-left hover:border-violet-500/30 transition-all group hover:scale-[1.01]"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-zinc-200 group-hover:text-violet-300 transition-colors truncate">{sec.courseName}</h4>
                  <p className="text-xs text-zinc-600 font-mono mt-0.5">{sec.courseCode}</p>
                </div>
                <div className="w-8 h-8 rounded-xl shrink-0 ml-2 flex items-center justify-center text-sm font-bold" style={{ background: `${COLORS[i % COLORS.length]}20`, color: COLORS[i % COLORS.length] }}>
                  {sec.sectionName}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-zinc-600 mb-3">
                <span className="flex items-center gap-1"><Users size={10} /> {sec.enrolledStudents} students</span>
                <span>{sec.semesterName}</span>
                <span>{sec.credits} credits</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  {SECTION_TABS.slice(0, 4).map(tab => {
                    const Icon = tab.icon
                    return <div key={tab.id} className="w-6 h-6 rounded-lg bg-zinc-800/60 flex items-center justify-center"><Icon size={10} className="text-zinc-600" /></div>
                  })}
                </div>
                <span className="text-xs text-violet-400 group-hover:text-violet-300 transition-colors flex items-center gap-1">Manage <ChevronRight size={11} /></span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Feature Guide */}
      <div className="glass-card rounded-2xl p-5 border border-violet-500/10">
        <h3 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
          <Zap size={14} className="text-amber-400" /> Available Features
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {[
            { icon: ClipboardCheck, label: 'Mark Attendance', desc: 'Bulk per-session entry', color: 'text-emerald-400' },
            { icon: BookMarked, label: 'Internal Marks', desc: 'IA-1, IA-2, IA-3 upload', color: 'text-violet-400' },
            { icon: GraduationCap, label: 'Semester Marks', desc: 'Auto grade calculation', color: 'text-blue-400' },
            { icon: Users, label: 'Student Performance', desc: 'Combined view per student', color: 'text-teal-400' },
            { icon: BookOpen, label: 'Assignments', desc: 'Create & track assignments', color: 'text-amber-400' },
            { icon: Sparkles, label: 'AI Notice Gen', desc: 'AI-powered notice drafting', color: 'text-fuchsia-400' },
          ].map(f => {
            const Icon = f.icon
            return (
              <div key={f.label} className="flex items-start gap-3 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/40">
                <Icon size={16} className={cn('mt-0.5 shrink-0', f.color)} />
                <div>
                  <p className="text-xs font-semibold text-zinc-300">{f.label}</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">{f.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Section Header + Tab Bar ─────────────────────────────────────────────────
function SectionHeader({ section, activeTab, onTabChange, onBack }) {
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <button onClick={onBack} className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-all">
              <ArrowLeft size={14} />
            </button>
            <h2 className="text-lg font-bold text-white">{section.courseName}</h2>
            <Badge variant="purple" className="text-[10px]">{section.courseCode}</Badge>
          </div>
          <p className="text-xs text-zinc-500 ml-7">Section {section.sectionName} · {section.semesterName} · {section.enrolledStudents} students · {section.credits} credits</p>
        </div>
      </div>
      <div className="flex gap-1 bg-zinc-900/60 rounded-xl p-1 border border-zinc-800/60 overflow-x-auto scrollbar-hide">
        {SECTION_TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
                activeTab === tab.id ? 'bg-violet-500/20 text-violet-300' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40'
              )}
            >
              <Icon size={12} />
              {tab.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Attendance Tab ───────────────────────────────────────────────────────────
function AttendanceTab({ attendanceDate, setAttendanceDate, attendanceRecords, toggleAttendance, onSubmit, loading }) {
  const present = attendanceRecords.filter(r => r.status === 'PRESENT').length
  const absent = attendanceRecords.length - present
  const pct = attendanceRecords.length > 0 ? Math.round((present / attendanceRecords.length) * 100) : 0

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <input type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} className="collego-input w-44" />
        <Button variant="success" size="sm" onClick={() => attendanceRecords.forEach((_, i) => toggleAttendance(i, 'PRESENT'))}>
          <CheckCircle2 size={13} /> All Present
        </Button>
        <Button variant="destructive" size="sm" onClick={() => attendanceRecords.forEach((_, i) => toggleAttendance(i, 'ABSENT'))}>
          <X size={13} /> All Absent
        </Button>
        <div className="ml-auto flex items-center gap-3 text-xs">
          <span className="text-emerald-400 font-bold">{present} Present</span>
          <span className="text-red-400 font-bold">{absent} Absent</span>
          <span className="text-zinc-600">/ {attendanceRecords.length} total</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">{present}</p>
          <p className="text-xs text-zinc-500">Present</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-400">{absent}</p>
          <p className="text-xs text-zinc-500">Absent</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <p className={cn('text-2xl font-bold', pct >= 75 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400')}>{pct}%</p>
          <p className="text-xs text-zinc-500">Attendance</p>
        </div>
      </div>

      {/* Student list */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <table className="collego-table">
          <thead>
            <tr><th>#</th><th>Enrollment</th><th>Student Name</th><th style={{ textAlign: 'center' }}>Status</th></tr>
          </thead>
          <tbody>
            {attendanceRecords.map((r, i) => (
              <tr key={r.studentId}>
                <td className="text-zinc-600">{i + 1}</td>
                <td><code className="text-[10px] bg-zinc-800/60 px-1.5 py-0.5 rounded">{r.enrollmentNumber}</code></td>
                <td className="text-zinc-200 font-medium">{r.studentName}</td>
                <td style={{ textAlign: 'center' }}>
                  <button
                    onClick={() => toggleAttendance(i)}
                    className={cn(
                      'px-4 py-1.5 rounded-xl text-xs font-bold transition-all border',
                      r.status === 'PRESENT'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                        : 'bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/25'
                    )}
                  >
                    {r.status === 'PRESENT' ? '✓ Present' : '✗ Absent'}
                  </button>
                </td>
              </tr>
            ))}
            {attendanceRecords.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: '#52525b' }}>No students enrolled in this section.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {attendanceRecords.length > 0 && (
        <Button variant="gradient" onClick={onSubmit} disabled={loading}>
          {loading ? <><RefreshCw size={14} className="animate-spin" /> Saving...</> : <><CheckCircle2 size={14} /> Save Attendance</>}
        </Button>
      )}
    </div>
  )
}

// ─── Internal Marks Tab ───────────────────────────────────────────────────────
function InternalMarksTab({ examName, setExamName, maxMarks, setMaxMarks, marksEntries, setMarksEntries, onSubmit, sectionMarks, loading }) {
  return (
    <div className="space-y-5">
      <div className="glass-card rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2"><Plus size={14} className="text-violet-400" /> Enter Internal Marks</h3>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs text-zinc-500 mb-1.5 block">Exam Name</label>
            <select value={examName} onChange={e => setExamName(e.target.value)} className="collego-input">
              {['IA-1', 'IA-2', 'IA-3', 'Mid-Sem', 'Quiz-1', 'Quiz-2'].map(n => <option key={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1.5 block">Max Marks</label>
            <input type="number" value={maxMarks} onChange={e => setMaxMarks(e.target.value)} className="collego-input" min="1" />
          </div>
        </div>
        <div className="glass-card rounded-xl overflow-hidden mb-4">
          <table className="collego-table">
            <thead><tr><th>Enrollment</th><th>Student</th><th style={{ textAlign: 'center' }}>Marks / {maxMarks}</th></tr></thead>
            <tbody>
              {marksEntries.map((entry, i) => (
                <tr key={entry.studentId}>
                  <td><code className="text-[10px] bg-zinc-800/60 px-1.5 py-0.5 rounded">{entry.enrollmentNumber}</code></td>
                  <td className="text-zinc-200">{entry.studentName}</td>
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="number" value={entry.obtainedMarks} min="0" max={maxMarks}
                      onChange={e => setMarksEntries(prev => prev.map((m, j) => j === i ? { ...m, obtainedMarks: e.target.value } : m))}
                      className="w-20 text-center collego-input py-1 text-sm"
                      placeholder="—"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button variant="gradient" onClick={onSubmit} disabled={loading}>
          {loading ? <><RefreshCw size={14} className="animate-spin" /> Saving...</> : <><Upload size={14} /> Upload Marks</>}
        </Button>
      </div>

      {sectionMarks.length > 0 && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-800/60">
            <h3 className="text-sm font-semibold text-zinc-300">Recorded Marks</h3>
          </div>
          <table className="collego-table">
            <thead><tr><th>Student</th><th>Exam</th><th style={{ textAlign: 'center' }}>Obtained</th><th style={{ textAlign: 'center' }}>Max</th></tr></thead>
            <tbody>
              {sectionMarks.map(m => (
                <tr key={m.id}>
                  <td><p className="text-zinc-200">{m.studentName}</p><code className="text-[10px] text-zinc-600">{m.enrollmentNumber}</code></td>
                  <td><Badge variant="secondary">{m.examName}</Badge></td>
                  <td style={{ textAlign: 'center', color: '#a78bfa', fontWeight: 600 }}>{m.obtainedMarks}</td>
                  <td style={{ textAlign: 'center', color: '#71717a' }}>{m.maxMarks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Semester Marks Tab ───────────────────────────────────────────────────────
function SemesterMarksTab({ semMaxMarks, setSemMaxMarks, semMarksEntries, setSemMarksEntries, onSubmit, loading }) {
  return (
    <div className="space-y-5">
      <div className="glass-card rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2"><GraduationCap size={14} className="text-blue-400" /> Upload Semester Marks</h3>
        <div className="mb-4">
          <label className="text-xs text-zinc-500 mb-1.5 block">Max Marks</label>
          <input type="number" value={semMaxMarks} onChange={e => setSemMaxMarks(e.target.value)} className="collego-input w-32" min="1" />
        </div>
        <div className="glass-card rounded-xl overflow-hidden mb-4">
          <table className="collego-table">
            <thead><tr><th>Enrollment</th><th>Student</th><th style={{ textAlign: 'center' }}>Marks / {semMaxMarks}</th></tr></thead>
            <tbody>
              {semMarksEntries.map((entry, i) => (
                <tr key={entry.studentId}>
                  <td><code className="text-[10px] bg-zinc-800/60 px-1.5 py-0.5 rounded">{entry.enrollmentNumber}</code></td>
                  <td className="text-zinc-200">{entry.studentName}</td>
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="number" value={entry.obtainedMarks} min="0" max={semMaxMarks}
                      onChange={e => setSemMarksEntries(prev => prev.map((m, j) => j === i ? { ...m, obtainedMarks: e.target.value } : m))}
                      className="w-20 text-center collego-input py-1 text-sm"
                      placeholder="—"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button variant="gradient" onClick={onSubmit} disabled={loading}>
          {loading ? <><RefreshCw size={14} className="animate-spin" /> Saving...</> : <><Upload size={14} /> Upload Semester Marks</>}
        </Button>
      </div>
    </div>
  )
}

// ─── Student Performance Tab ──────────────────────────────────────────────────
function StudentPerformanceTab({ data, loading }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2"><Users size={15} className="text-teal-400" /> Student Performance Overview</h3>
      {loading ? (
        <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="collego-table">
            <thead><tr><th>Student</th><th>Enrollment</th><th style={{ textAlign: 'center' }}>Attendance %</th><th style={{ textAlign: 'center' }}>IA-1</th><th style={{ textAlign: 'center' }}>IA-2</th></tr></thead>
            <tbody>
              {data.map(s => {
                const attPct = s.attendance ? Math.round((s.attendance.presentClasses / (s.attendance.totalClasses || 1)) * 100) : null
                return (
                  <tr key={s.studentId}>
                    <td className="text-zinc-200 font-medium">{s.studentName}</td>
                    <td><code className="text-[10px] bg-zinc-800/60 px-1.5 py-0.5 rounded">{s.enrollmentNumber}</code></td>
                    <td style={{ textAlign: 'center' }}>{attPct != null ? <AttBadge pct={attPct} /> : <span className="text-zinc-700">—</span>}</td>
                    <td style={{ textAlign: 'center', color: '#a78bfa' }}>{s.ia1ObtainedMarks ?? '—'}</td>
                    <td style={{ textAlign: 'center', color: '#a78bfa' }}>{s.ia2ObtainedMarks ?? '—'}</td>
                  </tr>
                )
              })}
              {data.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: '#52525b' }}>No performance data found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Assignments Tab ──────────────────────────────────────────────────────────
function AssignmentsTab({ title, setTitle, desc, setDesc, dueDate, setDueDate, onSubmit, assignments, loading }) {
  return (
    <div className="space-y-5">
      <div className="glass-card rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2"><Plus size={14} className="text-amber-400" /> Create Assignment</h3>
        <div className="space-y-3">
          <div><label className="text-xs text-zinc-500 mb-1.5 block">Title</label><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Assignment title" className="collego-input" /></div>
          <div><label className="text-xs text-zinc-500 mb-1.5 block">Description</label><textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} placeholder="Assignment description..." className="collego-input resize-none" /></div>
          <div><label className="text-xs text-zinc-500 mb-1.5 block">Due Date (optional)</label><input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="collego-input w-48" /></div>
        </div>
        <Button variant="gradient" size="sm" className="mt-4" onClick={onSubmit} disabled={loading || !title.trim()}>
          {loading ? <><RefreshCw size={13} className="animate-spin" /> Creating...</> : <><Plus size={13} /> Create Assignment</>}
        </Button>
      </div>
      {assignments.length > 0 && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-800/60"><h3 className="text-sm font-semibold text-zinc-300">Existing Assignments</h3></div>
          <div className="divide-y divide-zinc-800/40">
            {assignments.map(a => (
              <div key={a.id} className="px-5 py-4 hover:bg-white/[0.01] transition-colors">
                <div className="flex items-start justify-between">
                  <div><p className="text-sm font-semibold text-zinc-200">{a.title}</p><p className="text-xs text-zinc-500 mt-0.5">{a.description}</p></div>
                  {a.dueDate && <span className="text-xs text-amber-400 shrink-0 ml-4 flex items-center gap-1"><Clock size={11} /> {fmtDate(a.dueDate)}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Materials Tab ────────────────────────────────────────────────────────────
function MaterialsTab({ title, setTitle, desc, setDesc, type, setType, onSubmit, materials, loading }) {
  const MATERIAL_TYPES = ['NOTES', 'SLIDES', 'REFERENCE', 'VIDEO', 'ASSIGNMENT', 'OTHER']
  return (
    <div className="space-y-5">
      <div className="glass-card rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2"><Plus size={14} className="text-teal-400" /> Add Course Material</h3>
        <div className="space-y-3">
          <div><label className="text-xs text-zinc-500 mb-1.5 block">Title</label><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Material title" className="collego-input" /></div>
          <div><label className="text-xs text-zinc-500 mb-1.5 block">Description</label><textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} placeholder="Description..." className="collego-input resize-none" /></div>
          <div>
            <label className="text-xs text-zinc-500 mb-1.5 block">Type</label>
            <select value={type} onChange={e => setType(e.target.value)} className="collego-input w-48">
              {MATERIAL_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <Button variant="gradient" size="sm" className="mt-4" onClick={onSubmit} disabled={loading || !title.trim()}>
          {loading ? <><RefreshCw size={13} className="animate-spin" /> Adding...</> : <><Plus size={13} /> Add Material</>}
        </Button>
      </div>
      {materials.length > 0 && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="collego-table">
            <thead><tr><th>Title</th><th>Type</th><th>Description</th></tr></thead>
            <tbody>
              {materials.map(m => (
                <tr key={m.id}>
                  <td className="text-zinc-200 font-medium">{m.title}</td>
                  <td><Badge variant="info">{m.materialType}</Badge></td>
                  <td className="text-zinc-500 text-xs max-w-xs truncate">{m.description || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Analytics Tab ────────────────────────────────────────────────────────────
function AnalyticsTab({ analytics, loading }) {
  const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b']
  const attData = analytics ? [
    { name: '<50%', value: analytics.studentsBelow50 || 0 },
    { name: '50-75%', value: (analytics.studentsBelow75 || 0) - (analytics.studentsBelow50 || 0) },
    { name: '>75%', value: analytics.studentsAbove75 || 0 },
  ] : []

  return (
    <div className="space-y-5">
      {loading ? (
        <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : !analytics ? (
        <div className="glass-card rounded-2xl p-12 text-center"><BarChart3 size={40} className="mx-auto mb-3 opacity-20 text-violet-400" /><p className="text-zinc-500">No analytics data available yet.</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass-card rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-zinc-300 mb-4">Attendance Distribution</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={attData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={entry => `${entry.name}: ${entry.value}`} labelLine={false}>
                  {['#ef4444', '#f59e0b', '#10b981'].map((c, i) => <Cell key={i} fill={c} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="glass-card rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-zinc-300 mb-4">Section Summary</h3>
            <div className="space-y-3">
              {[
                { label: 'Average Attendance', value: `${fmtNum(analytics.averageAttendancePercentage, 1)}%`, color: 'text-emerald-400' },
                { label: 'Students > 75%', value: analytics.studentsAbove75 || 0, color: 'text-emerald-400' },
                { label: 'Students 50-75%', value: (analytics.studentsBelow75 || 0) - (analytics.studentsBelow50 || 0), color: 'text-amber-400' },
                { label: 'Students < 50%', value: analytics.studentsBelow50 || 0, color: 'text-red-400' },
                { label: 'Avg Internal Marks', value: fmtNum(analytics.averageInternalMarks), color: 'text-violet-400' },
                { label: 'Pass Rate', value: `${fmtNum(analytics.passPercentage, 1)}%`, color: 'text-blue-400' },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center">
                  <span className="text-xs text-zinc-500">{item.label}</span>
                  <span className={cn('text-sm font-bold', item.color)}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Question Papers Tab ──────────────────────────────────────────────────────
function QuestionPapersTab({ sections, examType, setExamType, year, setYear, semNum, setSemNum, fileName, setFileName, selectedSectionId, setSelectedSectionId, onSubmit, papers, loading }) {
  return (
    <div className="space-y-5">
      <div className="glass-card rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2"><Upload size={14} className="text-blue-400" /> Upload Question Paper</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-500 mb-1.5 block">Course / Section</label>
            <select value={selectedSectionId} onChange={e => setSelectedSectionId(e.target.value)} className="collego-input">
              <option value="">Select course</option>
              {sections.map(s => <option key={s.sectionId} value={s.sectionId}>{s.courseName} (Sec {s.sectionName})</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1.5 block">Exam Type</label>
            <select value={examType} onChange={e => setExamType(e.target.value)} className="collego-input">
              {['END_TERM', 'MID_TERM', 'INTERNAL', 'QUIZ'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1.5 block">Year</label>
            <input type="number" value={year} onChange={e => setYear(e.target.value)} className="collego-input" min="2000" max="2100" />
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1.5 block">File Name (optional)</label>
            <input value={fileName} onChange={e => setFileName(e.target.value)} placeholder="e.g., CS101_EndTerm_2025.pdf" className="collego-input" />
          </div>
        </div>
        <Button variant="gradient" size="sm" className="mt-4" onClick={onSubmit} disabled={loading || !selectedSectionId}>
          {loading ? <><RefreshCw size={13} className="animate-spin" /> Uploading...</> : <><Upload size={13} /> Submit for Approval</>}
        </Button>
      </div>
      {papers.length > 0 && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-800/60"><h3 className="text-sm font-semibold text-zinc-300">My Uploaded Papers</h3></div>
          <table className="collego-table">
            <thead><tr><th>Course</th><th>Exam Type</th><th>Year</th><th style={{ textAlign: 'center' }}>Status</th></tr></thead>
            <tbody>
              {papers.map(p => (
                <tr key={p.id}>
                  <td className="text-zinc-200">{p.courseName}</td>
                  <td><Badge variant="info">{p.examType}</Badge></td>
                  <td className="text-zinc-400">{p.year}</td>
                  <td style={{ textAlign: 'center' }}>
                    <Badge variant={p.status === 'APPROVED' ? 'success' : p.status === 'REJECTED' ? 'destructive' : 'warning'}>
                      {p.status || 'PENDING'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Notices Tab ─────────────────────────────────────────────────────────────
function NoticesTab({ title, setTitle, message, setMessage, type, setType, deptId, setDeptId, departments, onSubmit, sentNotices, loading }) {
  const TYPE_OPTIONS = ['GENERAL', 'ACADEMIC', 'PLACEMENT', 'FEE', 'EXAM']
  return (
    <div className="space-y-5">
      <div className="glass-card rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2"><Megaphone size={14} className="text-amber-400" /> Broadcast Notice</h3>
        <div className="space-y-3">
          <div><label className="text-xs text-zinc-500 mb-1.5 block">Title</label><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Notice title" className="collego-input" /></div>
          <div><label className="text-xs text-zinc-500 mb-1.5 block">Message</label><textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} placeholder="Notice message..." className="collego-input resize-none" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-500 mb-1.5 block">Type</label>
              <select value={type} onChange={e => setType(e.target.value)} className="collego-input">
                {TYPE_OPTIONS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1.5 block">Department (optional)</label>
              <select value={deptId} onChange={e => setDeptId(e.target.value)} className="collego-input">
                <option value="">All departments</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
        </div>
        <Button variant="gradient" size="sm" className="mt-4" onClick={onSubmit} disabled={loading || !title.trim() || !message.trim()}>
          {loading ? <><RefreshCw size={13} className="animate-spin" /> Sending...</> : <><Send size={13} /> Send Notice</>}
        </Button>
      </div>
      {sentNotices.length > 0 && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-800/60"><h3 className="text-sm font-semibold text-zinc-300">Sent Notices</h3></div>
          <div className="divide-y divide-zinc-800/40">
            {sentNotices.map((n, i) => (
              <div key={i} className="px-5 py-4">
                <div className="flex items-start justify-between">
                  <div><p className="text-sm font-semibold text-zinc-200">{n.title}</p><p className="text-xs text-zinc-500 mt-1">{n.message}</p></div>
                  <div className="text-right shrink-0 ml-4">
                    <Badge variant="info">{n.type}</Badge>
                    <p className="text-[10px] text-zinc-600 mt-1">{n.recipientCount} recipients</p>
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

// ─── AI Notice Generator Tab ──────────────────────────────────────────────────
function AiNoticeGenTab({ prompt, setPrompt, audience, setAudience, noticeType, setNoticeType, onGenerate, result, loading, onUse }) {
  return (
    <div className="space-y-5">
      <div className="glass-card rounded-2xl p-5 border border-fuchsia-500/10">
        <h3 className="text-sm font-semibold text-zinc-300 mb-1 flex items-center gap-2">
          <Sparkles size={15} className="text-fuchsia-400" /> AI Notice Generator
          <Badge variant="purple" className="text-[10px]">Phase 9</Badge>
        </h3>
        <p className="text-xs text-zinc-600 mb-4">Describe the notice briefly and AI will generate a professional, complete notice.</p>
        <div className="space-y-3">
          <div><label className="text-xs text-zinc-500 mb-1.5 block">Your Prompt</label><textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3} placeholder="e.g., 'Inform students about mid-semester exam schedule starting next week'" className="collego-input resize-none" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-500 mb-1.5 block">Audience</label>
              <select value={audience} onChange={e => setAudience(e.target.value)} className="collego-input">
                {['students', 'faculty', 'all'].map(a => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1.5 block">Notice Type</label>
              <select value={noticeType} onChange={e => setNoticeType(e.target.value)} className="collego-input">
                {['GENERAL', 'ACADEMIC', 'EXAM', 'PLACEMENT', 'FEE'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>
        <Button variant="gradient" size="sm" className="mt-4" onClick={onGenerate} disabled={loading || !prompt.trim()}>
          {loading ? (
            <><div className="flex gap-0.5">{[0,1,2].map(i => <div key={i} className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}</div> Generating...</>
          ) : (
            <><Sparkles size={13} /> Generate with AI</>
          )}
        </Button>
      </div>

      {result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-5 border border-fuchsia-500/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-fuchsia-300 flex items-center gap-2"><Bot size={14} /> AI Generated Notice</h3>
            <Button variant="gradient" size="sm" onClick={onUse}><CheckCircle2 size={13} /> Use this Notice</Button>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-zinc-500 mb-1">Title</p>
              <p className="text-sm font-semibold text-zinc-200 bg-zinc-800/40 px-3 py-2 rounded-lg">{result.title}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">Body</p>
              <p className="text-sm text-zinc-300 bg-zinc-800/40 px-3 py-3 rounded-lg leading-relaxed whitespace-pre-wrap">{result.body}</p>
            </div>
            {result.summary && (
              <div>
                <p className="text-xs text-zinc-500 mb-1">Summary</p>
                <p className="text-xs text-zinc-400 italic">{result.summary}</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  )
}

// ─── Main Faculty Dashboard ───────────────────────────────────────────────────
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
  const [studentPerformance, setStudentPerformance] = useState([])

  // Assignments & Materials
  const [assignmentTitle, setAssignmentTitle] = useState('')
  const [assignmentDesc, setAssignmentDesc] = useState('')
  const [assignmentDueDate, setAssignmentDueDate] = useState('')
  const [sectionAssignments, setSectionAssignments] = useState([])
  const [materialTitle, setMaterialTitle] = useState('')
  const [materialDesc, setMaterialDesc] = useState('')
  const [materialType, setMaterialType] = useState('NOTES')
  const [sectionMaterials, setSectionMaterials] = useState([])

  // Notices
  const [noticeTitle, setNoticeTitle] = useState('')
  const [noticeMessage, setNoticeMessage] = useState('')
  const [noticeType, setNoticeType] = useState('GENERAL')
  const [noticeDeptId, setNoticeDeptId] = useState('')
  const [departments, setDepartments] = useState([])
  const [sentNotices, setSentNotices] = useState([])

  // Question Papers
  const [qpExamType, setQpExamType] = useState('END_TERM')
  const [qpYear, setQpYear] = useState(new Date().getFullYear())
  const [qpSemNum, setQpSemNum] = useState(1)
  const [qpFileName, setQpFileName] = useState('')
  const [qpSelectedSectionId, setQpSelectedSectionId] = useState('')
  const [myQuestionPapers, setMyQuestionPapers] = useState([])

  // Analytics
  const [analytics, setAnalytics] = useState(null)

  // AI Notice Gen
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiAudience, setAiAudience] = useState('students')
  const [aiNoticeType, setAiNoticeType] = useState('GENERAL')
  const [aiResult, setAiResult] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)

  const sidebarWidth = collapsed ? 68 : 240
  const showMsg = useCallback((text, type = 'success') => {
    setMessage({ text, type })
  }, [])

  useEffect(() => {
    fetchSections()
    fetchDepartments()
  }, [])

  const fetchSections = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/faculty/sections')
      setSections(res.data)
    } catch { showMsg('Failed to load sections', 'error') }
    finally { setLoading(false) }
  }

  const fetchDepartments = async () => {
    try { const res = await api.get('/api/departments'); setDepartments(res.data) } catch { }
  }

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

  const handleGlobalNav = (tabId) => {
    setSelectedSection(null)
    setActiveTab(tabId)
    if (tabId === 'questionPapers') loadMyQPs()
  }

  const handleSectionSelect = (section) => {
    setSelectedSection(section)
    setActiveTab('attendance')
    setAnalytics(null)
    setSectionMarks([])
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
    if (tabId === 'internalMarks') loadSectionMarks()
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
      loadSectionMarks()
    } catch (err) { showMsg(err.response?.data?.message || 'Failed to upload marks', 'error') }
    finally { setLoading(false) }
  }

  const loadSectionMarks = async () => {
    setTabLoading(true)
    try { const res = await api.get(`/api/faculty/marks/internal/${selectedSection.sectionId}`); setSectionMarks(res.data) }
    catch { } finally { setTabLoading(false) }
  }

  const handleUploadSemesterMarks = async () => {
    const entries = semMarksEntries.filter(e => e.obtainedMarks !== '' && e.obtainedMarks !== null).map(e => ({ studentId: e.studentId, obtainedMarks: parseFloat(e.obtainedMarks) }))
    if (!entries.length) { showMsg('Enter marks for at least one student', 'error'); return }
    setLoading(true)
    try {
      const res = await api.post('/api/faculty/marks/semester', { sectionId: selectedSection.sectionId, maxMarks: parseFloat(semMaxMarks), entries })
      showMsg(`Semester marks saved: ${res.data.created} created, ${res.data.updated} updated`)
    } catch (err) { showMsg(err.response?.data?.message || 'Failed to upload semester marks', 'error') }
    finally { setLoading(false) }
  }

  const loadStudentPerformance = useCallback(async () => {
    if (!selectedSection) return
    setTabLoading(true)
    try {
      const [attRes, marksRes] = await Promise.all([api.get(`/api/faculty/attendance/${selectedSection.sectionId}`), api.get(`/api/faculty/marks/internal/${selectedSection.sectionId}`)])
      const attMap = {}; attRes.data.forEach(s => { attMap[s.studentId] = s })
      const combined = marksRes.data.map(m => ({ ...m, attendance: attMap[m.studentId] || null }))
      attRes.data.forEach(s => { if (!combined.find(c => c.studentId === s.studentId)) combined.push({ studentId: s.studentId, studentName: s.studentName, enrollmentNumber: s.enrollmentNumber, attendance: s }) })
      setStudentPerformance(combined)
    } catch { } finally { setTabLoading(false) }
  }, [selectedSection])

  const handleCreateAssignment = async () => {
    setLoading(true)
    try {
      await api.post('/api/faculty/assignments', { sectionId: selectedSection.sectionId, title: assignmentTitle, description: assignmentDesc, dueDate: assignmentDueDate || null, fileName: null })
      showMsg('Assignment created successfully')
      setAssignmentTitle(''); setAssignmentDesc(''); setAssignmentDueDate('')
      loadAssignments()
    } catch (err) { showMsg(err.response?.data?.message || 'Failed to create assignment', 'error') }
    finally { setLoading(false) }
  }

  const loadAssignments = async () => {
    setTabLoading(true)
    try { const res = await api.get(`/api/faculty/assignments/${selectedSection.sectionId}`); setSectionAssignments(res.data) }
    catch { } finally { setTabLoading(false) }
  }

  const handleCreateMaterial = async () => {
    setLoading(true)
    try {
      await api.post('/api/faculty/materials', { sectionId: selectedSection.sectionId, title: materialTitle, description: materialDesc, materialType, fileName: null })
      showMsg('Material added successfully')
      setMaterialTitle(''); setMaterialDesc('')
      loadMaterials()
    } catch (err) { showMsg(err.response?.data?.message || 'Failed to add material', 'error') }
    finally { setLoading(false) }
  }

  const loadMaterials = async () => {
    setTabLoading(true)
    try { const res = await api.get(`/api/faculty/materials/${selectedSection.sectionId}`); setSectionMaterials(res.data) }
    catch { } finally { setTabLoading(false) }
  }

  const handleUploadQP = async () => {
    const sec = sections.find(s => s.sectionId === parseInt(qpSelectedSectionId))
    if (!sec) { showMsg('Please select a course/section', 'error'); return }
    setLoading(true)
    try {
      await api.post('/api/faculty/question-papers', { courseId: sec.courseId, departmentId: null, examType: qpExamType, year: parseInt(qpYear), semesterNumber: sec.semesterNumber, fileName: qpFileName || `${sec.courseCode}_${qpExamType}_${qpYear}.pdf` })
      showMsg('Question paper uploaded (pending admin approval)')
      setQpFileName(''); loadMyQPs()
    } catch (err) {
      try {
        await api.post('/api/faculty/question-papers', { courseId: sec.courseId, departmentId: departments[0]?.id || 1, examType: qpExamType, year: parseInt(qpYear), semesterNumber: sec.semesterNumber, fileName: qpFileName || `${sec.courseCode}_${qpExamType}_${qpYear}.pdf` })
        showMsg('Question paper uploaded (pending admin approval)')
        setQpFileName(''); loadMyQPs()
      } catch (e2) { showMsg(e2.response?.data?.message || 'Failed to upload', 'error') }
    } finally { setLoading(false) }
  }

  const loadMyQPs = async () => {
    try { const res = await api.get('/api/faculty/question-papers'); setMyQuestionPapers(res.data) } catch { }
  }

  const handleDraftNotice = async () => {
    setLoading(true)
    try {
      const res = await api.post('/api/faculty/notices', { title: noticeTitle, message: noticeMessage, type: noticeType, departmentId: noticeDeptId ? parseInt(noticeDeptId) : null })
      showMsg(`Notice sent to ${res.data.recipientCount} students`)
      setSentNotices(prev => [{ title: noticeTitle, message: noticeMessage, type: noticeType, recipientCount: res.data.recipientCount, sentAt: new Date().toISOString() }, ...prev])
      setNoticeTitle(''); setNoticeMessage('')
    } catch (err) { showMsg(err.response?.data?.message || 'Failed to send notice', 'error') }
    finally { setLoading(false) }
  }

  const handleAiGenerateNotice = async () => {
    if (!aiPrompt.trim()) { showMsg('Enter a prompt for the notice', 'error'); return }
    setAiLoading(true); setAiResult(null)
    try {
      const res = await api.post('/api/ai/generate-notice', { prompt: aiPrompt, audience: aiAudience, noticeType: aiNoticeType })
      setAiResult(res.data)
      showMsg('AI notice generated! Review the content below.')
    } catch (err) { showMsg(err.response?.data?.message || 'AI notice generation failed', 'error') }
    finally { setAiLoading(false) }
  }

  const useAiNotice = () => {
    if (!aiResult) return
    setNoticeTitle(aiResult.title || ''); setNoticeMessage(aiResult.body || '')
    setSelectedSection(null); setActiveTab('notices')
    showMsg('AI notice copied to Notice form!')
  }

  const loadAnalytics = async () => {
    setTabLoading(true)
    try { const res = await api.get(`/api/faculty/analytics/${selectedSection.sectionId}`); setAnalytics(res.data) }
    catch { } finally { setTabLoading(false) }
  }

  const renderContent = () => {
    if (!selectedSection) {
      switch (activeTab) {
        case 'overview': return <OverviewTab sections={sections} overviewData={overviewData} onSectionSelect={handleSectionSelect} />
        case 'questionPapers': return <QuestionPapersTab sections={sections} examType={qpExamType} setExamType={setQpExamType} year={qpYear} setYear={setQpYear} semNum={qpSemNum} setSemNum={setQpSemNum} fileName={qpFileName} setFileName={setQpFileName} selectedSectionId={qpSelectedSectionId} setSelectedSectionId={setQpSelectedSectionId} onSubmit={handleUploadQP} papers={myQuestionPapers} loading={loading} />
        case 'notices': return <NoticesTab title={noticeTitle} setTitle={setNoticeTitle} message={noticeMessage} setMessage={setNoticeMessage} type={noticeType} setType={setNoticeType} deptId={noticeDeptId} setDeptId={setNoticeDeptId} departments={departments} onSubmit={handleDraftNotice} sentNotices={sentNotices} loading={loading} />
        case 'ai-notice-gen': return <AiNoticeGenTab prompt={aiPrompt} setPrompt={setAiPrompt} audience={aiAudience} setAudience={setAiAudience} noticeType={aiNoticeType} setNoticeType={setAiNoticeType} onGenerate={handleAiGenerateNotice} result={aiResult} loading={aiLoading} onUse={useAiNotice} />
        default: return null
      }
    }

    switch (activeTab) {
      case 'attendance': return <AttendanceTab attendanceDate={attendanceDate} setAttendanceDate={setAttendanceDate} attendanceRecords={attendanceRecords} toggleAttendance={toggleAttendance} onSubmit={handleMarkAttendance} loading={loading} />
      case 'internalMarks': return <InternalMarksTab examName={examName} setExamName={setExamName} maxMarks={maxMarks} setMaxMarks={setMaxMarks} marksEntries={marksEntries} setMarksEntries={setMarksEntries} onSubmit={handleUploadInternalMarks} sectionMarks={sectionMarks} loading={loading} />
      case 'semesterMarks': return <SemesterMarksTab semMaxMarks={semMaxMarks} setSemMaxMarks={setSemMaxMarks} semMarksEntries={semMarksEntries} setSemMarksEntries={setSemMarksEntries} onSubmit={handleUploadSemesterMarks} loading={loading} />
      case 'studentPerformance': return <StudentPerformanceTab data={studentPerformance} loading={tabLoading} />
      case 'assignments': return <AssignmentsTab title={assignmentTitle} setTitle={setAssignmentTitle} desc={assignmentDesc} setDesc={setAssignmentDesc} dueDate={assignmentDueDate} setDueDate={setAssignmentDueDate} onSubmit={handleCreateAssignment} assignments={sectionAssignments} loading={loading} />
      case 'materials': return <MaterialsTab title={materialTitle} setTitle={setMaterialTitle} desc={materialDesc} setDesc={setMaterialDesc} type={materialType} setType={setMaterialType} onSubmit={handleCreateMaterial} materials={sectionMaterials} loading={loading} />
      case 'analytics': return <AnalyticsTab analytics={analytics} loading={tabLoading} />
      default: return null
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'rgb(9, 9, 11)' }}>
      <Toast message={message} onClose={() => setMessage({ text: '', type: '' })} />
      <Sidebar
        activeTab={activeTab} selectedSection={selectedSection} sections={sections}
        onGlobalNav={handleGlobalNav} onSectionSelect={handleSectionSelect}
        onBack={() => { setSelectedSection(null); setActiveTab('overview') }}
        collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} loading={loading}
      />
      <Topbar email={email} sidebarWidth={sidebarWidth} onLogout={async () => { await authService.logout(); navigate('/login') }} />

      <main className="main-content" style={{ marginLeft: sidebarWidth }}>
        <div className="p-6">
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
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
