import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, ClipboardCheck, BookMarked, Calendar,
  DollarSign, Briefcase, Bell, Sparkles, Trophy, Target,
  ChevronRight, ChevronLeft, LogOut, Search, TrendingUp,
  TrendingDown, Download, Send, BookOpen, FileText,
  GraduationCap, Activity, AlertCircle, CheckCircle2,
  X, ArrowUpRight, ArrowDownRight, Bot, User, Clock,
  Zap, Star, BarChart3, AlertTriangle, Grid3X3
} from 'lucide-react'
import {
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts'
import { authService } from '../services/authService'
import api from '../services/api'
import { cn } from '../lib/utils'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const fmtNum = (n, dp = 2) => (n == null ? '—' : Number(n).toFixed(dp))

const GRADE_COLORS = { O: '#10b981', 'A+': '#34d399', A: '#06b6d4', 'B+': '#60a5fa', B: '#818cf8', C: '#fbbf24', P: '#f59e0b', F: '#ef4444' }

const NAV_ITEMS = [
  { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
  { id: 'marks', label: 'Marks & CGPA', icon: BookMarked },
  { id: 'timetable', label: 'Timetable', icon: Calendar },
  { id: 'fees', label: 'Fee Status', icon: DollarSign },
  { id: 'placements', label: 'Placements', icon: Briefcase },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'aiAssistant', label: 'AI Assistant', icon: Sparkles },
  { id: 'aiPrediction', label: 'AI Prediction', icon: Target },
]

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

// ─── Sidebar ─────────────────────────────────────────────────────────────────
function Sidebar({ activeTab, onTabChange, collapsed, onToggle, profile }) {
  return (
    <aside className={cn('sidebar', collapsed && 'collapsed')}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-zinc-800/60 shrink-0">
        <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/30">
          <GraduationCap size={18} className="text-white" />
        </div>
        {!collapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <p className="text-sm font-bold text-white">COLLEGO</p>
            <p className="text-[10px] text-zinc-500">Student Portal</p>
          </motion.div>
        )}
      </div>

      {/* Profile card in sidebar */}
      {!collapsed && profile && (
        <div className="mx-3 mt-3 p-3 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/15">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {profile.firstName?.[0]}{profile.lastName?.[0]}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-zinc-200 truncate">{profile.firstName} {profile.lastName}</p>
              <p className="text-[10px] text-zinc-500 truncate">{profile.enrollmentNumber}</p>
            </div>
          </div>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto py-3 scrollbar-hide px-2 mt-2">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              title={collapsed ? item.label : undefined}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-all duration-200 relative group mb-0.5',
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400 border-r-2 border-emerald-500'
                  : 'text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-200'
              )}
            >
              <Icon size={16} className="shrink-0" />
              {!collapsed && <span className="text-xs font-medium">{item.label}</span>}
              {isActive && !collapsed && <ChevronRight size={12} className="ml-auto text-emerald-400" />}
              {collapsed && (
                <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-zinc-900 text-zinc-200 text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl border border-zinc-800">
                  {item.label}
                </div>
              )}
            </button>
          )
        })}
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
function Topbar({ profile, unreadCount, onLogout, sidebarWidth }) {
  const initials = profile ? `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}` : 'ST'
  return (
    <header className="topbar px-5" style={{ left: sidebarWidth }}>
      <div className="flex-1 flex items-center gap-3">
        <div className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-800 rounded-xl px-3.5 py-2.5 w-72 group focus-within:border-emerald-500/50 transition-all">
          <Search size={14} className="text-zinc-600 group-focus-within:text-emerald-400 transition-colors" />
          <input className="bg-transparent text-sm text-zinc-400 placeholder-zinc-600 outline-none w-full" placeholder="Search subjects, notices..." />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="relative p-2 rounded-xl text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-all">
          <Bell size={17} />
          {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />}
        </button>
        <div className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-zinc-800/60 transition-all">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-xs font-bold text-white">{initials}</div>
          <div className="hidden md:block">
            <p className="text-xs font-semibold text-zinc-200">{profile?.firstName} {profile?.lastName}</p>
            <p className="text-[10px] text-zinc-500">{profile?.departmentName} · Sem {profile?.currentSemester}</p>
          </div>
        </div>
        <button onClick={onLogout} className="p-2 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Logout">
          <LogOut size={15} />
        </button>
      </div>
    </header>
  )
}

// ─── Mini Sparkline ───────────────────────────────────────────────────────────
function Sparkline({ data, color }) {
  return (
    <ResponsiveContainer width="100%" height={40}>
      <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <defs>
          <linearGradient id={`sg-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} fill={`url(#sg-${color})`} strokeWidth={1.5} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ─── Attendance Progress Badge ────────────────────────────────────────────────
function AttBadge({ pct }) {
  if (pct >= 75) return <Badge variant="success">{pct}%</Badge>
  if (pct >= 50) return <Badge variant="warning">{pct}%</Badge>
  return <Badge variant="destructive">{pct}%</Badge>
}

// ─── Custom Tooltip ──────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card rounded-xl px-3 py-2.5 border border-emerald-500/20">
      <p className="text-xs font-semibold text-zinc-300 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs" style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

// ─── OVERVIEW TAB ────────────────────────────────────────────────────────────
function OverviewTab({ profile, attendance, cgpa, fees, notifications, onTabChange }) {
  const unread = notifications.filter(n => !n.read).length
  const pendingFees = fees.filter(f => f.status === 'PENDING')
  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'
  const emoji = hour < 12 ? '☀️' : hour < 17 ? '👋' : '🌙'

  // SGPA trend data
  const sgpaData = (cgpa?.semesters || []).map(s => ({ name: s.semesterName?.substring(0, 4) || 'Sem', v: s.sgpa || 0 }))
  const attData = [50, 60, 55, 70, 65, 78, 75, 80, 82, 87].map(v => ({ v }))

  const statCards = [
    {
      label: 'Overall Attendance',
      value: `${fmtNum(attendance?.overallPercentage, 1)}%`,
      icon: ClipboardCheck,
      iconColor: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      sparkColor: '#10b981',
      sparkData: attData,
      sub: `${attendance?.totalPresent ?? 0}/${attendance?.totalClasses ?? 0} classes`,
      trend: 2.3,
      onClick: () => onTabChange('attendance'),
    },
    {
      label: 'Current CGPA',
      value: fmtNum(cgpa?.cumulativeCgpa),
      icon: GraduationCap,
      iconColor: 'text-violet-400',
      bgColor: 'bg-violet-500/10',
      sparkColor: '#8b5cf6',
      sparkData: sgpaData.length ? sgpaData : [{ v: 0 }],
      sub: `${cgpa?.totalCreditsAllSemesters?.toFixed(0) ?? 0} total credits`,
      onClick: () => onTabChange('marks'),
    },
    {
      label: 'Fee Status',
      value: pendingFees.length === 0 ? 'Clear' : `${pendingFees.length} Pending`,
      icon: DollarSign,
      iconColor: pendingFees.length === 0 ? 'text-emerald-400' : 'text-amber-400',
      bgColor: pendingFees.length === 0 ? 'bg-emerald-500/10' : 'bg-amber-500/10',
      sparkColor: '#f59e0b',
      sparkData: [{ v: 80 }, { v: 60 }, { v: 90 }],
      sub: pendingFees.length === 0 ? 'All paid' : 'Action required',
      onClick: () => onTabChange('fees'),
    },
    {
      label: 'Notifications',
      value: unread,
      icon: Bell,
      iconColor: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      sparkColor: '#60a5fa',
      sparkData: [{ v: 3 }, { v: 5 }, { v: 2 }, { v: 7 }, { v: 4 }],
      sub: `${notifications.length} total`,
      onClick: () => onTabChange('notifications'),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl p-6 border border-emerald-500/10 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(6,182,212,0.05) 100%)' }}
      >
        <div>
          <h2 className="text-2xl font-bold text-white">{greeting}, {profile?.firstName} {emoji}</h2>
          <p className="text-zinc-500 text-sm mt-1">
            {profile?.enrollmentNumber} · {profile?.departmentName} · Semester {profile?.currentSemester} · Section {profile?.section}
          </p>
        </div>
        <div className="absolute right-6 top-4 opacity-10 text-7xl pointer-events-none">🎓</div>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={card.onClick}
              className={cn(
                'glass-card rounded-2xl p-5 cursor-pointer transition-all hover:scale-[1.01]',
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', card.bgColor)}>
                  <Icon size={17} className={card.iconColor} />
                </div>
                {card.trend && (
                  <div className="flex items-center gap-0.5 text-xs text-emerald-400">
                    <ArrowUpRight size={11} /> {card.trend}%
                  </div>
                )}
              </div>
              <p className="text-xs text-zinc-500 mb-0.5">{card.label}</p>
              <p className="text-2xl font-bold text-white">{card.value}</p>
              <p className="text-[10px] text-zinc-600 mt-0.5">{card.sub}</p>
              <div className="mt-3">
                <Sparkline data={card.sparkData} color={card.sparkColor} />
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Attendance chart + SGPA + Recent Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Attendance bar chart */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <ClipboardCheck size={15} className="text-emerald-400" />
            Subject-wise Attendance
          </h3>
          <div className="space-y-3">
            {(attendance?.subjectWise || []).slice(0, 6).map((s, i) => (
              <motion.div key={s.sectionId || i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs text-zinc-300 truncate max-w-[200px]">{s.courseName}</span>
                  <AttBadge pct={Math.round(s.percentage || 0)} />
                </div>
                <div className="progress-bar">
                  <div
                    className={cn('progress-bar-fill', s.percentage >= 75 ? 'bg-emerald-500' : s.percentage >= 50 ? 'bg-amber-500' : 'bg-red-500')}
                    style={{ width: `${Math.min(s.percentage || 0, 100)}%` }}
                  />
                </div>
              </motion.div>
            ))}
            {!attendance?.subjectWise?.length && (
              <div className="text-center py-8 text-zinc-600">
                <ClipboardCheck size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No attendance data available</p>
              </div>
            )}
          </div>
        </div>

        {/* SGPA history */}
        <div className="glass-card rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <GraduationCap size={15} className="text-violet-400" />
            SGPA History
          </h3>
          {sgpaData.length > 0 ? (
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={sgpaData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="sgpaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.08)" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#71717a' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 9, fill: '#71717a' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="v" stroke="#8b5cf6" fill="url(#sgpaGrad)" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 3 }} name="SGPA" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-zinc-600 text-sm">No results yet</div>
          )}
          <div className="mt-3 p-3 rounded-xl bg-violet-500/5 border border-violet-500/10">
            <p className="text-xs text-zinc-500">Cumulative CGPA</p>
            <p className="text-2xl font-bold text-violet-400">{fmtNum(cgpa?.cumulativeCgpa)}</p>
          </div>
        </div>
      </div>

      {/* Recent Notifications */}
      {notifications.slice(0, 3).length > 0 && (
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Bell size={15} className="text-blue-400" /> Recent Notifications
            </h3>
            <button onClick={() => onTabChange('notifications')} className="text-xs text-indigo-400 hover:text-indigo-300">View All</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {notifications.slice(0, 3).map(n => (
              <div key={n.id} className={cn('rounded-xl p-3 border', !n.read ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-zinc-800/30 border-zinc-800/40')}>
                {!n.read && <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full mb-2" />}
                <p className="text-xs font-semibold text-zinc-200">{n.title}</p>
                <p className="text-[10px] text-zinc-500 mt-1 line-clamp-2">{n.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── ATTENDANCE TAB ──────────────────────────────────────────────────────────
function AttendanceTab({ attendance, semesters, onSemesterChange, loading }) {
  const overall = attendance?.overallPercentage || 0
  const overallColor = overall >= 75 ? '#10b981' : overall >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><ClipboardCheck size={20} className="text-emerald-400" /> Attendance</h2>
        <select onChange={e => onSemesterChange(e.target.value || null)} className="collego-input w-48">
          <option value="">Current Semester</option>
          {semesters.map(s => <option key={s.id} value={s.id}>{s.name} ({s.academicYear})</option>)}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Classes', value: attendance?.totalClasses ?? 0, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Classes Present', value: attendance?.totalPresent ?? 0, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Overall %', value: `${fmtNum(overall, 1)}%`, color: overall >= 75 ? 'text-emerald-400' : overall >= 50 ? 'text-amber-400' : 'text-red-400', bg: overall >= 75 ? 'bg-emerald-500/10' : 'bg-amber-500/10' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="glass-card rounded-2xl p-5">
            <p className="text-xs text-zinc-500 mb-1">{s.label}</p>
            <p className={cn('text-3xl font-bold', s.color)}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="collego-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Code</th>
                <th style={{ textAlign: 'center' }}>Total</th>
                <th style={{ textAlign: 'center' }}>Present</th>
                <th style={{ textAlign: 'center' }}>Absent</th>
                <th style={{ textAlign: 'center' }}>%</th>
                <th>Progress</th>
              </tr>
            </thead>
            <tbody>
              {(attendance?.subjectWise || []).map(s => (
                <tr key={s.sectionId}>
                  <td className="text-zinc-200 font-medium">{s.courseName}</td>
                  <td><code className="text-[10px] text-zinc-500 bg-zinc-800/60 px-1.5 py-0.5 rounded">{s.courseCode}</code></td>
                  <td style={{ textAlign: 'center' }}>{s.totalClasses}</td>
                  <td style={{ textAlign: 'center', color: '#10b981', fontWeight: 600 }}>{s.present}</td>
                  <td style={{ textAlign: 'center', color: '#ef4444', fontWeight: 600 }}>{s.absent}</td>
                  <td style={{ textAlign: 'center' }}><AttBadge pct={Math.round(s.percentage || 0)} /></td>
                  <td className="w-32">
                    <div className="progress-bar">
                      <div className={cn('progress-bar-fill', s.percentage >= 75 ? 'bg-emerald-500' : s.percentage >= 50 ? 'bg-amber-500' : 'bg-red-500')} style={{ width: `${Math.min(s.percentage || 0, 100)}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
              {!attendance?.subjectWise?.length && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#52525b' }}>No attendance data found for this semester.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── MARKS TAB ───────────────────────────────────────────────────────────────
function MarksTab({ internalMarks, cgpa, loading }) {
  const [view, setView] = useState('cgpa')

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><BookMarked size={20} className="text-violet-400" /> Marks & Results</h2>
        <div className="flex bg-zinc-900/80 border border-zinc-800 rounded-xl p-1">
          {[['cgpa', '🎓 CGPA/SGPA'], ['internal', '📊 Internal Marks']].map(([id, label]) => (
            <button key={id} onClick={() => setView(id)} className={cn('px-4 py-1.5 rounded-lg text-xs font-medium transition-all', view === id ? 'bg-violet-500/20 text-violet-300' : 'text-zinc-500 hover:text-zinc-300')}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {view === 'cgpa' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card rounded-2xl p-5">
              <p className="text-xs text-zinc-500">Cumulative CGPA</p>
              <p className="text-4xl font-bold text-violet-400 mt-1">{fmtNum(cgpa?.cumulativeCgpa)}</p>
              <p className="text-xs text-zinc-600 mt-1">All semesters</p>
            </div>
            <div className="glass-card rounded-2xl p-5">
              <p className="text-xs text-zinc-500">Total Credits</p>
              <p className="text-4xl font-bold text-blue-400 mt-1">{cgpa?.totalCreditsAllSemesters?.toFixed(0) ?? '—'}</p>
              <p className="text-xs text-zinc-600 mt-1">Across all semesters</p>
            </div>
          </div>
          {(cgpa?.semesters || []).map(sem => (
            <div key={sem.semesterId} className="glass-card rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/60">
                <div>
                  <p className="font-semibold text-zinc-100">{sem.semesterName}</p>
                  <p className="text-xs text-zinc-500">{sem.academicYear} · {sem.totalCredits?.toFixed(0)} credits</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-violet-400">{fmtNum(sem.sgpa)}</p>
                  <p className="text-[10px] text-zinc-600">SGPA</p>
                </div>
              </div>
              <table className="collego-table">
                <thead><tr><th>Subject</th><th style={{ textAlign: 'center' }}>Credits</th><th style={{ textAlign: 'center' }}>Marks</th><th style={{ textAlign: 'center' }}>Grade</th><th style={{ textAlign: 'center' }}>GP</th></tr></thead>
                <tbody>
                  {(sem.subjects || []).map(sub => (
                    <tr key={sub.sectionId}>
                      <td><p className="text-zinc-200">{sub.courseName}</p><p className="text-[10px] text-zinc-600 font-mono">{sub.courseCode}</p></td>
                      <td style={{ textAlign: 'center', color: '#94a3b8' }}>{sub.credits}</td>
                      <td style={{ textAlign: 'center' }}>{sub.obtainedMarks != null ? `${sub.obtainedMarks}/${sub.maxMarks}` : '—'}</td>
                      <td style={{ textAlign: 'center' }}><span className="font-bold" style={{ color: GRADE_COLORS[sub.grade] || '#94a3b8' }}>{sub.grade || '—'}</span></td>
                      <td style={{ textAlign: 'center', color: '#94a3b8' }}>{sub.gradePoints?.toFixed(1) ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {!cgpa?.semesters?.length && <p className="text-zinc-600 text-sm">No results found yet.</p>}
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="collego-table">
            <thead><tr><th>Subject</th><th style={{ textAlign: 'center' }}>IA-1 (Obtained / Max)</th><th style={{ textAlign: 'center' }}>IA-2 (Obtained / Max)</th></tr></thead>
            <tbody>
              {(internalMarks || []).map(m => (
                <tr key={m.sectionId}>
                  <td><p className="text-zinc-200">{m.courseName}</p><p className="text-[10px] text-zinc-600 font-mono">{m.courseCode}</p></td>
                  <td style={{ textAlign: 'center' }}>{m.ia1ObtainedMarks != null ? <span className="text-violet-300 font-semibold">{m.ia1ObtainedMarks} / {m.ia1MaxMarks}</span> : <span className="text-zinc-700">—</span>}</td>
                  <td style={{ textAlign: 'center' }}>{m.ia2ObtainedMarks != null ? <span className="text-violet-300 font-semibold">{m.ia2ObtainedMarks} / {m.ia2MaxMarks}</span> : <span className="text-zinc-700">—</span>}</td>
                </tr>
              ))}
              {!internalMarks?.length && <tr><td colSpan={3} style={{ textAlign: 'center', padding: '3rem', color: '#52525b' }}>No internal marks found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── TIMETABLE TAB ───────────────────────────────────────────────────────────
const DAY_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
const DAY_COLORS = { MONDAY: '#6366f1', TUESDAY: '#8b5cf6', WEDNESDAY: '#06b6d4', THURSDAY: '#10b981', FRIDAY: '#f59e0b', SATURDAY: '#ef4444' }

function TimetableTab({ timetable, loading }) {
  const days = timetable?.weeklySchedule ? DAY_ORDER.filter(d => timetable.weeklySchedule[d]?.length > 0) : []
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-white flex items-center gap-2"><Calendar size={20} className="text-teal-400" /> Timetable</h2>
      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : days.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center"><Calendar size={48} className="mx-auto mb-3 opacity-20 text-teal-400" /><p className="text-zinc-500">No timetable data found for active enrollments.</p></div>
      ) : (
        <div className="space-y-4">
          {DAY_ORDER.map(day => {
            const slots = timetable?.weeklySchedule?.[day] || []
            if (!slots.length) return null
            const color = DAY_COLORS[day] || '#6366f1'
            return (
              <motion.div key={day} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="glass-card rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-zinc-800/60 flex items-center gap-3" style={{ background: `${color}10` }}>
                  <div className="w-2 h-5 rounded-full" style={{ background: color }} />
                  <h3 className="text-sm font-semibold" style={{ color }}>{day.charAt(0) + day.slice(1).toLowerCase()}</h3>
                </div>
                <div>
                  {slots.sort((a, b) => a.startTime?.localeCompare(b.startTime)).map(slot => (
                    <div key={slot.id} className="flex items-center px-5 py-4 hover:bg-white/[0.02] transition-colors border-b border-zinc-800/30 last:border-0">
                      <div className="w-24 shrink-0">
                        <p className="text-sm font-mono font-semibold" style={{ color }}>{slot.startTime}</p>
                        <p className="text-xs font-mono text-zinc-600">{slot.endTime}</p>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-zinc-200">{slot.courseName}</p>
                        <p className="text-xs text-zinc-500">{slot.courseCode} · Sec {slot.sectionName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-zinc-400">{slot.facultyName || '—'}</p>
                        <p className="text-xs text-zinc-600">{slot.roomNumber}</p>
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

// ─── FEES TAB ────────────────────────────────────────────────────────────────
function FeesTab({ fees, loading }) {
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-white flex items-center gap-2"><DollarSign size={20} className="text-amber-400" /> Fee Status</h2>
      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : fees.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center"><DollarSign size={48} className="mx-auto mb-3 opacity-20 text-amber-400" /><p className="text-zinc-500">No fee records found.</p></div>
      ) : (
        <div className="space-y-4">
          {fees.map(fee => {
            const isPaid = fee.status === 'PAID'
            return (
              <motion.div key={fee.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/60">
                  <div>
                    <p className="font-semibold text-zinc-100">{fee.semesterName}</p>
                    <p className="text-xs text-zinc-500">Due: {fmtDate(fee.dueDate)}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-lg font-bold text-zinc-100">₹{Number(fee.totalAmount).toLocaleString('en-IN')}</p>
                      <p className="text-xs text-zinc-600">Total Amount</p>
                    </div>
                    <Badge variant={isPaid ? 'success' : 'warning'}>{fee.status}</Badge>
                  </div>
                </div>
                {fee.items?.map((item, i) => (
                  <div key={i} className="flex justify-between items-center px-5 py-2.5 text-sm border-b border-zinc-800/30 last:border-0 hover:bg-white/[0.01]">
                    <span className="text-zinc-400">{item.description}</span>
                    <span className="text-zinc-300 font-medium">₹{Number(item.amount).toLocaleString('en-IN')}</span>
                  </div>
                ))}
                {isPaid && (
                  <div className="px-5 py-3 bg-emerald-500/5 border-t border-emerald-500/10">
                    <p className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 size={11} /> Paid on {fmtDate(fee.paidAt)}{fee.transactionRef && <span className="ml-2 text-zinc-600">Ref: {fee.transactionRef}</span>}</p>
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

// ─── AI ASSISTANT TAB ────────────────────────────────────────────────────────
function AiAssistantTab({ attendance, cgpa, fees }) {
  const [messages, setMessages] = useState([{ role: 'assistant', content: "Hi! I'm Collego AI 🤖 Ask me anything about your attendance, marks, fees, placements, timetable, and more!" }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useState(null)

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMsg = { role: 'user', content: input }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    try {
      const res = await api.post('/api/ai/chat', { message: input, history: messages.slice(-6).map(m => ({ role: m.role, content: m.content })), context: { attendance, cgpa, fees } })
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply || "I couldn't process that. Please try again." }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'AI service is temporarily offline. Please try again later.' }])
    } finally { setLoading(false) }
  }

  const quickPrompts = ['What is my current attendance?', 'Show my CGPA', 'Any pending fees?', 'What placements are available?', 'Show my timetable']

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-120px)]">
      <h2 className="text-xl font-bold text-white flex items-center gap-2">
        <Bot size={20} className="text-violet-400" /> AI College Assistant
        <Badge variant="purple" className="ml-1">Phase 9</Badge>
      </h2>
      <div className="flex-1 glass-card rounded-2xl overflow-hidden flex flex-col" style={{ minHeight: '400px' }}>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mr-2 shrink-0 self-end mb-1">
                  <Bot size={13} className="text-white" />
                </div>
              )}
              <div className={cn('max-w-[80%] px-4 py-3 rounded-2xl text-sm', msg.role === 'user' ? 'bg-indigo-600/30 text-indigo-100 rounded-br-sm border border-indigo-500/20' : 'bg-zinc-800/80 text-zinc-200 rounded-bl-sm border border-zinc-700/40')}>
                {msg.role === 'assistant' && <p className="text-[10px] text-violet-400 font-semibold mb-1">Collego AI</p>}
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
            </motion.div>
          ))}
          {loading && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0"><Bot size={13} className="text-white" /></div>
              <div className="bg-zinc-800/80 border border-zinc-700/40 px-4 py-3 rounded-2xl rounded-bl-sm">
                <div className="flex gap-1">{[0, 1, 2].map(i => <div key={i} className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}</div>
              </div>
            </div>
          )}
        </div>
        <div className="border-t border-zinc-800/60 p-3 flex gap-2">
          <input
            value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask about attendance, marks, fees, placements..."
            className="collego-input flex-1"
          />
          <Button variant="gradient" size="sm" onClick={sendMessage} disabled={loading || !input.trim()}>
            <Send size={14} /> Send
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {quickPrompts.map(p => (
          <button key={p} onClick={() => setInput(p)} className="text-xs bg-zinc-800/60 hover:bg-zinc-700 border border-zinc-700 text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded-lg transition-colors">
            {p}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── DOCUMENTS TAB ────────────────────────────────────────────────────────────
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
    } catch (err) { showMessage(err.response?.data?.message || `No marks data for ${semName}`, 'error')
    } finally { setDownloading(null) }
  }
  const downloadTranscript = async () => {
    try {
      setDownloading('transcript')
      const res = await api.get('/api/student/transcript', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a'); a.href = url; a.download = 'academic_transcript.pdf'; a.click()
      window.URL.revokeObjectURL(url)
      showMessage('Transcript downloaded')
    } catch { showMessage('No academic data for transcript yet', 'error')
    } finally { setDownloading(null) }
  }
  const sems = cgpa?.semesters || []
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-white flex items-center gap-2"><FileText size={20} className="text-teal-400" /> Academic Documents</h2>
      <div className="glass-card rounded-2xl p-6 border border-violet-500/15 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(6,182,212,0.04) 100%)' }}>
        <div>
          <h3 className="font-semibold text-zinc-100 mb-1">Full Academic Transcript</h3>
          <p className="text-sm text-zinc-400">Complete academic history across all semesters with CGPA</p>
        </div>
        <Button variant="gradient" onClick={downloadTranscript} disabled={downloading === 'transcript'}>
          <Download size={14} /> {downloading === 'transcript' ? 'Generating...' : 'Download Transcript'}
        </Button>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-zinc-400 mb-3">Semester Marksheets</h3>
        <div className="space-y-3">
          {sems.map(sem => (
            <div key={sem.semesterId} className="glass-card rounded-2xl p-5 flex items-center justify-between hover:border-zinc-700 transition-colors">
              <div>
                <p className="font-semibold text-zinc-100">{sem.semesterName}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{sem.academicYear} · {sem.subjects?.length} subjects · SGPA {fmtNum(sem.sgpa)}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => downloadMarksheet(sem.semesterId, sem.semesterName)} disabled={downloading === `sem-${sem.semesterId}`}>
                <Download size={13} /> {downloading === `sem-${sem.semesterId}` ? 'Generating...' : 'Download PDF'}
              </Button>
            </div>
          ))}
          {!sems.length && <p className="text-zinc-600 text-sm">No semester results available yet for download.</p>}
        </div>
      </div>
    </div>
  )
}

// ─── NOTIFICATIONS TAB ────────────────────────────────────────────────────────
function NotificationsTab({ notifications, onMarkRead, loading }) {
  const TYPE_CONFIG = { ACADEMIC: { v: 'info', label: '📚' }, FEE: { v: 'warning', label: '💰' }, PLACEMENT: { v: 'purple', label: '💼' }, GENERAL: { v: 'secondary', label: '📢' } }
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-white flex items-center gap-2"><Bell size={20} className="text-blue-400" /> Notifications</h2>
      <div className="space-y-2">
        {(notifications || []).map(n => {
          const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.GENERAL
          return (
            <motion.div key={n.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className={cn('glass-card rounded-2xl p-4 flex items-start gap-4', !n.read ? 'border-indigo-500/20' : 'opacity-60')}>
              <div className="mt-0.5">{!n.read && <div className="w-2 h-2 bg-indigo-400 rounded-full" />}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={cfg.v} className="text-[10px]">{n.type}</Badge>
                  <span className="text-[10px] text-zinc-600">{fmtDate(n.createdAt)}</span>
                </div>
                <p className="text-sm font-semibold text-zinc-200">{n.title}</p>
                <p className="text-sm text-zinc-400 mt-0.5">{n.message}</p>
              </div>
              {!n.read && (
                <Button variant="outline" size="sm" onClick={() => onMarkRead(n.id)} className="shrink-0">Mark read</Button>
              )}
            </motion.div>
          )
        })}
        {!notifications?.length && <div className="glass-card rounded-2xl p-12 text-center"><Bell size={40} className="mx-auto mb-3 opacity-20 text-blue-400" /><p className="text-zinc-500">No notifications yet.</p></div>}
      </div>
    </div>
  )
}

// ─── PLACEMENTS TAB ──────────────────────────────────────────────────────────
function PlacementsTab({ notices, loading }) {
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-white flex items-center gap-2"><Briefcase size={20} className="text-emerald-400" /> Placement Notices</h2>
      {(notices || []).map(notice => {
        const isExpired = notice.lastDate && new Date(notice.lastDate) < new Date()
        return (
          <motion.div key={notice.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn('glass-card rounded-2xl p-5', isExpired ? 'opacity-50' : 'hover:border-emerald-500/20 transition-colors')}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-zinc-100">{notice.title}</h3>
                  {isExpired && <Badge variant="secondary">Expired</Badge>}
                </div>
                <p className="text-sm text-emerald-400 mb-2">{notice.companyName}</p>
                <p className="text-sm text-zinc-400 mb-3">{notice.description}</p>
                <div className="flex flex-wrap gap-2">
                  {notice.eligibilityCriteria && <Badge variant="secondary">{notice.eligibilityCriteria}</Badge>}
                  {notice.packageOffered && <Badge variant="success">💰 {notice.packageOffered}</Badge>}
                  <Badge variant="info">🏢 {notice.departmentName}</Badge>
                </div>
              </div>
              {notice.lastDate && (
                <div className={cn('text-right shrink-0', isExpired ? 'text-zinc-600' : 'text-amber-400')}>
                  <p className="text-xs font-semibold">Last Date</p>
                  <p className="text-sm font-bold">{fmtDate(notice.lastDate)}</p>
                </div>
              )}
            </div>
          </motion.div>
        )
      })}
      {!notices?.length && <div className="glass-card rounded-2xl p-12 text-center"><Briefcase size={40} className="mx-auto mb-3 opacity-20 text-emerald-400" /><p className="text-zinc-500">No placement notices right now.</p></div>}
    </div>
  )
}

// ─── AI PREDICTION TAB ────────────────────────────────────────────────────────
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

  const RISK_CONFIG = { LOW: { v: 'success', icon: '🟢' }, MEDIUM: { v: 'warning', icon: '🟡' }, HIGH: { v: 'destructive', icon: '🔴' } }
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-white flex items-center gap-2"><Target size={20} className="text-indigo-400" /> AI Performance Prediction <Badge variant="purple">Phase 9</Badge></h2>
      <p className="text-sm text-zinc-500">AI-powered CGPA/SGPA projection based on your academic history using linear regression trend analysis.</p>
      {loading && <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>}
      {error && <div className="glass-card rounded-2xl p-5 border border-red-500/20"><p className="text-red-300 text-sm">{error}</p></div>}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card rounded-2xl p-5">
            <p className="text-xs text-zinc-500">Predicted SGPA</p>
            <p className="text-3xl font-bold text-indigo-400 mt-1">{data.predictedSgpa?.toFixed(2) ?? '—'}</p>
          </div>
          <div className="glass-card rounded-2xl p-5">
            <p className="text-xs text-zinc-500">Risk Level</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={RISK_CONFIG[data.riskLevel]?.v ?? 'secondary'}>{RISK_CONFIG[data.riskLevel]?.icon} {data.riskLevel}</Badge>
            </div>
          </div>
          <div className="glass-card rounded-2xl p-5">
            <p className="text-xs text-zinc-500">Trend</p>
            <p className="text-sm font-semibold text-zinc-200 mt-2">{data.trend}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Student Dashboard ───────────────────────────────────────────────────
export default function StudentDashboard() {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [toast, setToast] = useState({ text: '', type: 'success' })

  const [profile, setProfile] = useState(null)
  const [attendance, setAttendance] = useState(null)
  const [cgpa, setCgpa] = useState(null)
  const [fees, setFees] = useState([])
  const [notifications, setNotifications] = useState([])
  const [timetable, setTimetable] = useState(null)
  const [internalMarks, setInternalMarks] = useState([])
  const [placements, setPlacements] = useState([])
  const [semesters, setSemesters] = useState([])
  const [loadingTab, setLoadingTab] = useState(false)

  const sidebarWidth = collapsed ? 68 : 240
  const showMsg = useCallback((text, type = 'success') => setToast({ text, type }), [])

  useEffect(() => {
    const load = async () => {
      const [prRes, atRes, cgRes, feRes, notRes, ttRes, imRes, plRes, semRes] = await Promise.allSettled([
        api.get('/api/student/profile'),
        api.get('/api/student/attendance'),
        api.get('/api/student/cgpa'),
        api.get('/api/student/fees'),
        api.get('/api/student/notifications'),
        api.get('/api/student/timetable'),
        api.get('/api/student/internal-marks'),
        api.get('/api/student/placement-notices'),
        api.get('/api/student/semesters'),
      ])
      if (prRes.status === 'fulfilled') setProfile(prRes.value.data)
      if (atRes.status === 'fulfilled') setAttendance(atRes.value.data)
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
      await api.patch(`/api/student/notifications/${id}/read`)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    } catch { showMsg('Failed to mark as read', 'error') }
  }

  const handleSemesterChange = async (semId) => {
    setLoadingTab(true)
    try {
      const url = semId ? `/api/student/attendance?semesterId=${semId}` : '/api/student/attendance'
      const res = await api.get(url)
      setAttendance(res.data)
    } catch { } finally { setLoadingTab(false) }
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'overview': return <OverviewTab profile={profile} attendance={attendance} cgpa={cgpa} fees={fees} notifications={notifications} onTabChange={setActiveTab} />
      case 'attendance': return <AttendanceTab attendance={attendance} semesters={semesters} onSemesterChange={handleSemesterChange} loading={loadingTab} />
      case 'marks': return <MarksTab internalMarks={internalMarks} cgpa={cgpa} loading={loadingTab} />
      case 'timetable': return <TimetableTab timetable={timetable} loading={loadingTab} />
      case 'fees': return <FeesTab fees={fees} loading={loadingTab} />
      case 'placements': return <PlacementsTab notices={placements} loading={loadingTab} />
      case 'notifications': return <NotificationsTab notifications={notifications} onMarkRead={handleMarkRead} loading={loadingTab} />
      case 'documents': return <DocumentsTab cgpa={cgpa} showMessage={showMsg} />
      case 'aiAssistant': return <AiAssistantTab attendance={attendance} cgpa={cgpa} fees={fees} />
      case 'aiPrediction': return <AiPredictionTab />
      default: return null
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="min-h-screen" style={{ background: 'rgb(9, 9, 11)' }}>
      <Toast message={toast} onClose={() => setToast({ text: '', type: 'success' })} />
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} profile={profile} />
      <Topbar profile={profile} unreadCount={unreadCount} onLogout={() => { authService.clearTokens(); navigate('/login') }} sidebarWidth={sidebarWidth} />
      <main className="main-content" style={{ marginLeft: sidebarWidth }}>
        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              {renderTab()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
