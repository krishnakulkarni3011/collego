import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, BookOpen, Calendar, ClipboardCheck,
  Award, DollarSign, Building2, Library, Bell, Sparkles,
  BarChart3, Settings, HelpCircle, ChevronRight, ChevronLeft,
  Search, LogOut, Menu, TrendingUp, TrendingDown, Plus,
  GraduationCap, UserPlus, Megaphone, FileText, Shield,
  Database, AlertTriangle, CheckCircle2, Clock, MapPin,
  Activity, Target, BookMarked, Briefcase, X, ExternalLink,
  ArrowUpRight, ArrowDownRight, Minus, RefreshCw, Download,
  Upload, Eye, Edit, Trash2, Filter, MoreHorizontal, Star,
  Trophy, Zap, Coffee, Heart, Grid3X3
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, RadialBarChart, RadialBar
} from 'recharts'
import { authService } from '../services/authService'
import api from '../services/api'
import { cn } from '../lib/utils'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtNum = (n, dp = 1) => (n == null ? '—' : Number(n).toFixed(dp))
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const timeAgo = (ts) => {
  if (!ts) return ''
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d === 1) return 'Yesterday'
  return `${d}d ago`
}

// ─── Toast ───────────────────────────────────────────────────────────────────
function Toast({ message, onClose }) {
  useEffect(() => {
    if (message?.text) {
      const t = setTimeout(onClose, 4000)
      return () => clearTimeout(t)
    }
  }, [message, onClose])

  return (
    <AnimatePresence>
      {message?.text && (
        <motion.div
          initial={{ opacity: 0, y: -20, x: 20 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: -20, x: 20 }}
          className={cn(
            'fixed top-4 right-4 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-medium shadow-2xl border',
            message.type === 'error'
              ? 'bg-red-950/90 text-red-300 border-red-500/30 backdrop-blur-xl'
              : 'bg-emerald-950/90 text-emerald-300 border-emerald-500/30 backdrop-blur-xl'
          )}
        >
          {message.type === 'error' ? <X size={16} /> : <CheckCircle2 size={16} />}
          {message.text}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Sidebar Nav Items ────────────────────────────────────────────────────────
const NAV_SECTIONS = [
  {
    items: [
      { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    ]
  },
  {
    title: 'Management',
    items: [
      { id: 'users', label: 'Students', icon: GraduationCap },
      { id: 'faculty', label: 'Faculty', icon: Users },
      { id: 'academics', label: 'Academics', icon: BookOpen },
      { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
      { id: 'examinations', label: 'Examinations', icon: BookMarked },
      { id: 'placements', label: 'Placements', icon: Briefcase },
    ]
  },
  {
    title: 'Finance & Admin',
    items: [
      { id: 'fees', label: 'Fees & Finance', icon: DollarSign },
      { id: 'hostel', label: 'Hostel & Facilities', icon: Building2 },
      { id: 'library', label: 'Library', icon: Library },
      { id: 'announcements', label: 'Notices & Events', icon: Megaphone },
    ]
  },
  {
    title: 'AI Assistant',
    items: [
      { id: 'aiAssistant', label: 'AI Assistant', icon: Sparkles },
    ]
  },
  {
    title: 'Administration',
    items: [
      { id: 'deptReports', label: 'Reports', icon: BarChart3 },
      { id: 'settings', label: 'Settings', icon: Settings },
      { id: 'help', label: 'Help & Support', icon: HelpCircle },
    ]
  },
]

// ─── Sidebar ─────────────────────────────────────────────────────────────────
function Sidebar({ activeTab, onTabChange, collapsed, onToggle }) {
  return (
    <aside className={cn('sidebar', collapsed && 'collapsed')}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-zinc-800/60 shrink-0">
        <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-lg shadow-indigo-500/30">
          <GraduationCap size={18} className="text-white" />
        </div>
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
            >
              <p className="text-sm font-bold text-white leading-tight">COLLEGO</p>
              <p className="text-[10px] text-zinc-500 tracking-wider">College ERP</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 scrollbar-hide px-2">
        {NAV_SECTIONS.map((section, si) => (
          <div key={si} className="mb-2">
            {section.title && !collapsed && (
              <p className="text-[9px] font-semibold text-zinc-600 uppercase tracking-widest px-3 pt-4 pb-1.5">
                {section.title}
              </p>
            )}
            {section.items.map(item => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-all duration-200 relative group mb-0.5',
                    isActive ? 'nav-item-active' : 'text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-200'
                  )}
                >
                  <Icon size={16} className={cn('shrink-0', isActive ? 'text-indigo-400' : '')} />
                  {!collapsed && (
                    <span className="text-xs font-medium leading-none">{item.label}</span>
                  )}
                  {isActive && !collapsed && (
                    <ChevronRight size={12} className="ml-auto text-indigo-400" />
                  )}
                  {/* Tooltip when collapsed */}
                  {collapsed && (
                    <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-zinc-900 text-zinc-200 text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl border border-zinc-800">
                      {item.label}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Bottom - College Building Image */}
      {!collapsed && (
        <div className="mx-3 mb-3 rounded-xl overflow-hidden relative h-24 bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-indigo-500/20">
          <div className="absolute inset-0 flex flex-col items-start justify-end p-3">
            <p className="text-[10px] font-semibold text-indigo-300">Building Better</p>
            <p className="text-[10px] text-zinc-500">Tomorrow</p>
          </div>
          <div className="absolute bottom-0 right-0 text-4xl opacity-20">🏫</div>
          <button className="absolute top-2 right-2 w-5 h-5 bg-indigo-500/30 rounded-full flex items-center justify-center">
            <ChevronRight size={10} className="text-indigo-400" />
          </button>
        </div>
      )}

      {/* Collapse toggle */}
      <div className="border-t border-zinc-800/60 p-2 shrink-0">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 py-2 text-zinc-500 hover:text-zinc-300 text-xs rounded-xl hover:bg-zinc-800/60 transition-colors"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          {!collapsed && <span className="text-xs">Collapse</span>}
        </button>
      </div>
    </aside>
  )
}

// ─── Top Navbar ───────────────────────────────────────────────────────────────
function Topbar({ email, pendingCount, onLogout, sidebarWidth }) {
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'
  const [showNotif, setShowNotif] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const initials = email ? email.substring(0, 2).toUpperCase() : 'AD'

  return (
    <header
      className="topbar px-5"
      style={{ left: sidebarWidth }}
    >
      {/* Search */}
      <div className="flex items-center gap-3 flex-1">
        <div className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-800 rounded-xl px-3.5 py-2.5 w-80 group focus-within:border-indigo-500/50 focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] transition-all">
          <Search size={14} className="text-zinc-600 group-focus-within:text-indigo-400 transition-colors shrink-0" />
          <input
            className="bg-transparent text-sm text-zinc-400 placeholder-zinc-600 outline-none w-full"
            placeholder="Search students, faculty, courses, notices..."
          />
          <kbd className="text-[9px] text-zinc-700 bg-zinc-800 px-1.5 py-0.5 rounded font-mono hidden md:block shrink-0">Ctrl K</kbd>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Date */}
        <div className="hidden lg:flex items-center gap-2 bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-3 py-2">
          <Calendar size={13} className="text-indigo-400" />
          <p className="text-xs text-zinc-400">{dateStr}</p>
        </div>

        {/* Apps grid */}
        <button className="p-2 rounded-xl text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-all">
          <Grid3X3 size={17} />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotif(!showNotif)}
            className="relative p-2 rounded-xl text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-all"
          >
            <Bell size={17} />
            {pendingCount > 0 && (
              <span className="notification-dot" style={{ width: '7px', height: '7px', top: '7px', right: '7px' }} />
            )}
          </button>
          {pendingCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4.5 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center px-1">
              {pendingCount > 9 ? '9+' : pendingCount}
            </span>
          )}
        </div>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-zinc-800/60 transition-all"
          >
            <div className="avatar-ring w-8 h-8 flex items-center justify-center">
              <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-[11px] font-bold text-white">
                {initials}
              </div>
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-zinc-200">Admin User</p>
              <p className="text-[10px] text-zinc-500">Administrator</p>
            </div>
            <ChevronRight size={12} className="text-zinc-600 hidden md:block" />
          </button>

          <AnimatePresence>
            {showProfile && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                className="absolute right-0 top-full mt-2 w-48 glass-card rounded-xl py-1 z-50"
              >
                <div className="px-4 py-3 border-b border-zinc-800/60">
                  <p className="text-sm font-semibold text-zinc-200">Admin User</p>
                  <p className="text-xs text-zinc-500 truncate">{email}</p>
                </div>
                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}

// ─── Stat Card Component ──────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, trend, trendLabel, iconColor, bgColor, onClick, index = 0 }) {
  const isPositive = trend >= 0
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      onClick={onClick}
      className={cn(
        'glass-card rounded-2xl p-5 flex items-center gap-4 transition-all duration-200',
        onClick && 'cursor-pointer hover:scale-[1.01] hover:shadow-lg hover:shadow-indigo-500/10'
      )}
    >
      <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center shrink-0', bgColor)}>
        <Icon size={24} className={iconColor} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-zinc-500 font-medium mb-1">{label}</p>
        <p className="text-2xl font-bold text-white leading-none">{value ?? '—'}</p>
        {trend != null && (
          <div className={cn('flex items-center gap-1 mt-1.5 text-xs font-medium', isPositive ? 'text-emerald-400' : 'text-red-400')}>
            {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(trend)}% {trendLabel}
          </div>
        )}
      </div>
      {/* Mini sparkline placeholder */}
      <div className="shrink-0 opacity-40">
        {trend != null && (
          <div className="flex items-end gap-0.5 h-8">
            {[40, 60, 45, 70, 55, 80, 65, 90].map((h, i) => (
              <div
                key={i}
                className={cn('w-1 rounded-sm', isPositive ? 'bg-emerald-500' : 'bg-red-500')}
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ─── Custom Tooltip ──────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card rounded-xl px-3 py-2.5 border border-indigo-500/20">
      <p className="text-xs font-semibold text-zinc-300 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs" style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{p.value}{p.unit || ''}</span>
        </p>
      ))}
    </div>
  )
}

// ─── Overview Dashboard Tab ───────────────────────────────────────────────────
function OverviewTab({ overview, deptReports, attendanceSummary, pendingQPs, auditLogs, placementStats, onTabChange }) {
  const email = authService.getEmail()
  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'
  const emoji = hour < 12 ? '☀️' : hour < 17 ? '👋' : '🌙'
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const quote = '"Education transforms ideas into reality"'

  // Mock chart data from real API data
  const attendanceChartData = (attendanceSummary || []).slice(0, 5).map(d => ({
    name: d.departmentCode || d.departmentName?.substring(0, 3) || 'N/A',
    attendance: Math.round(d.averageAttendancePercentage || 0),
  }))

  // Pie chart data for department distribution
  const deptDistribution = (deptReports || []).slice(0, 5).map((d, i) => ({
    name: d.departmentCode || d.departmentName?.substring(0, 3) || `D${i+1}`,
    value: d.totalStudents || Math.floor(Math.random() * 600) + 100,
  }))
  const PIE_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b']

  // Recent notices mock data (replace with real API when available)
  const recentNotices = [
    { id: 1, title: 'Mid-Semester Examination Schedule', dept: 'Examination Cell', time: '2 hours ago', badge: 'Important', badgeColor: 'destructive' },
    { id: 2, title: 'Placement Drive Registration Open', dept: 'Placement Cell', time: '1 day ago', badge: 'New', badgeColor: 'success' },
    { id: 3, title: 'Project Review Submission Deadline', dept: 'CSE Department', time: '2 days ago', badge: 'Academic', badgeColor: 'info' },
    { id: 4, title: 'College Annual Day 2025', dept: 'Cultural Committee', time: '3 days ago', badge: 'Event', badgeColor: 'purple' },
  ]

  // Upcoming events
  const upcomingEvents = [
    { date: { day: '20', month: 'OCT' }, title: 'Mid-Semester Examination', time: '10:00 AM – 01:00 PM', location: 'Main Campus', color: '#ef4444' },
    { date: { day: '22', month: 'OCT' }, title: 'Placement Drive (Infosys)', time: '09:00 AM – 05:00 PM', location: 'Seminar Hall', color: '#10b981' },
    { date: { day: '25', month: 'OCT' }, title: 'Project Review Submission', time: 'Deadline: 11:59 PM', location: 'Online Portal', color: '#6366f1' },
    { date: { day: '28', month: 'OCT' }, title: 'Tech Fest 2025', time: '09:30 AM – 06:00 PM', location: 'Auditorium', color: '#f59e0b' },
  ]

  // Top performers
  const topPerformers = [
    { rank: 1, name: 'Aarav Sharma', dept: 'CSE – 7th Sem', attendance: 98, color: '#fbbf24' },
    { rank: 2, name: 'Sneha Rao', dept: 'ISE – 7th Sem', attendance: 96, color: '#94a3b8' },
    { rank: 3, name: 'Priya Desai', dept: 'CSE – 7th Sem', attendance: 94, color: '#cd7f32' },
    { rank: 4, name: 'Ananya Joshi', dept: 'CSE – 5th Sem', attendance: 92, color: '#6366f1' },
    { rank: 5, name: 'Rahul Patil', dept: 'ECE – 5th Sem', attendance: 91, color: '#6366f1' },
  ]

  // Quick actions
  const quickActions = [
    { icon: '👨‍🎓', label: 'Add Student', onClick: () => onTabChange('users'), color: 'hover:bg-indigo-500/10' },
    { icon: '👨‍🏫', label: 'Add Faculty', onClick: () => onTabChange('faculty'), color: 'hover:bg-purple-500/10' },
    { icon: '📢', label: 'Create Notice', onClick: () => onTabChange('announcements'), color: 'hover:bg-red-500/10' },
    { icon: '📊', label: 'Generate Report', onClick: () => onTabChange('deptReports'), color: 'hover:bg-amber-500/10' },
    { icon: '📚', label: 'Manage Courses', onClick: () => onTabChange('academics'), color: 'hover:bg-teal-500/10' },
    { icon: '✅', label: 'Take Attendance', onClick: () => onTabChange('attendance'), color: 'hover:bg-emerald-500/10' },
    { icon: '📝', label: 'Upload Marks', onClick: () => onTabChange('examinations'), color: 'hover:bg-violet-500/10' },
    { icon: '💼', label: 'Placement Records', onClick: () => onTabChange('placements'), color: 'hover:bg-orange-500/10' },
  ]

  // Bar chart colors
  const BAR_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b']

  return (
    <div className="space-y-6">
      {/* ── Header Banner ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl overflow-hidden border border-indigo-500/10"
        style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(168,85,247,0.05) 50%, rgba(6,182,212,0.03) 100%)' }}
      >
        <div className="flex items-center justify-between p-6">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {greeting}, Admin {emoji}
            </h2>
            <p className="text-zinc-500 text-sm mt-1">Here's what's happening at your college today.</p>
          </div>
          <div className="hidden md:flex flex-col items-end gap-1 text-right">
            <div className="flex items-center gap-2 text-indigo-300">
              <Calendar size={14} />
              <span className="text-sm font-medium">{dateStr}</span>
            </div>
            <p className="text-xs text-zinc-600 italic">{quote}</p>
          </div>
        </div>
        {/* Decorative background element */}
        <div className="absolute right-0 top-0 w-64 h-full opacity-10 pointer-events-none">
          <div className="absolute right-8 top-4 text-8xl">🏫</div>
        </div>
      </motion.div>

      {/* ── Stat Cards Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard index={0} label="Total Students" value={overview?.totalStudents?.toLocaleString() ?? '2,450'} icon={GraduationCap} iconColor="text-indigo-400" bgColor="bg-indigo-500/10" trend={8.2} trendLabel="from last year" onClick={() => onTabChange('users')} />
        <StatCard index={1} label="Faculty Members" value={overview?.totalFaculty ?? '186'} icon={Users} iconColor="text-purple-400" bgColor="bg-purple-500/10" trend={4.1} trendLabel="from last year" onClick={() => onTabChange('faculty')} />
        <StatCard index={2} label="Average Attendance" value={overview?.overallAverageAttendance ? `${fmtNum(overview.overallAverageAttendance)}%` : '87.4%'} icon={ClipboardCheck} iconColor="text-teal-400" bgColor="bg-teal-500/10" trend={2.3} trendLabel="this month" />
        <StatCard index={3} label="Placed Students" value={placementStats?.offersReceived ?? '324'} icon={Trophy} iconColor="text-amber-400" bgColor="bg-amber-500/10" trend={12.5} trendLabel="this year" onClick={() => onTabChange('placements')} />
      </div>

      {/* ── Charts + Events Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Attendance Bar Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-4 glass-card rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <BarChart3 size={15} className="text-indigo-400" />
                Attendance Overview
              </h3>
            </div>
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5">This Semester</Badge>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={attendanceChartData.length > 0 ? attendanceChartData : [
              { name: 'CSE', attendance: 92 }, { name: 'ISE', attendance: 88 },
              { name: 'ECE', attendance: 85 }, { name: 'ME', attendance: 79 }, { name: 'Civil', attendance: 83 }
            ]} barSize={22} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.08)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#71717a' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="attendance" radius={[6, 6, 0, 0]}>
                {(attendanceChartData.length > 0 ? attendanceChartData : [0,1,2,3,4]).map((_, i) => (
                  <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Pie Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="lg:col-span-3 glass-card rounded-2xl p-5 flex flex-col"
        >
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
            <Activity size={15} className="text-purple-400" />
            Student Statistics
          </h3>
          <div className="flex-1 flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie
                  data={deptDistribution.length > 0 ? deptDistribution : [
                    { name: 'CSE', value: 32 }, { name: 'ISE', value: 24 },
                    { name: 'ECE', value: 18 }, { name: 'ME', value: 14 }, { name: 'Civil', value: 12 }
                  ]}
                  cx="50%" cy="50%" innerRadius={45} outerRadius={65}
                  dataKey="value" paddingAngle={3}
                >
                  {PIE_COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
              <p className="text-xl font-bold text-white">{overview?.totalStudents?.toLocaleString() ?? '2,450'}</p>
              <p className="text-[10px] text-zinc-500">Students</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 mt-2">
            {['CSE', 'ISE', 'ECE', 'ME', 'Civil'].map((d, i) => (
              <div key={d} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: PIE_COLORS[i] }} />
                <span className="text-[10px] text-zinc-500">{d} {[32,24,18,14,12][i]}%</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Upcoming Events */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-5 glass-card rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Calendar size={15} className="text-indigo-400" />
              Upcoming Events
            </h3>
            <button className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">View All</button>
          </div>
          <div className="space-y-1">
            {upcomingEvents.map((ev, i) => (
              <div key={i} className="event-item">
                <div className="flex flex-col items-center justify-center w-10 h-10 rounded-xl shrink-0" style={{ background: `${ev.color}15`, border: `1px solid ${ev.color}30` }}>
                  <span className="text-[10px] font-bold" style={{ color: ev.color }}>{ev.date.month}</span>
                  <span className="text-sm font-bold text-white leading-none">{ev.date.day}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-zinc-200 truncate">{ev.title}</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5 flex items-center gap-1">
                    <Clock size={9} /> {ev.time}
                  </p>
                  <p className="text-[10px] text-zinc-600 flex items-center gap-1">
                    <MapPin size={9} /> {ev.location}
                  </p>
                </div>
                <ChevronRight size={12} className="text-zinc-700 shrink-0" />
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Notices + Top Performers + Quick Actions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Recent Notices */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="lg:col-span-4 glass-card rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Megaphone size={15} className="text-amber-400" />
              Recent Notices
            </h3>
            <button onClick={() => onTabChange('announcements')} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">View All</button>
          </div>
          <div className="space-y-2">
            {recentNotices.map(n => (
              <div key={n.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.02] transition-colors cursor-pointer group">
                <div className="w-8 h-8 rounded-xl bg-zinc-800/80 flex items-center justify-center shrink-0">
                  <FileText size={14} className="text-zinc-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-zinc-200 truncate">{n.title}</p>
                  <p className="text-[10px] text-zinc-600">{n.dept} · {n.time}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge variant={n.badgeColor} className="text-[9px] px-2 py-0">{n.badge}</Badge>
                  <ChevronRight size={10} className="text-zinc-700 group-hover:text-zinc-400 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Top Performers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-4 glass-card rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Trophy size={15} className="text-amber-400" />
              Top Performers (Attendance)
            </h3>
            <button className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">View All</button>
          </div>
          <div className="space-y-1">
            {topPerformers.map((p, i) => (
              <div key={i} className="performer-item">
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: `${p.color}20`, border: `1px solid ${p.color}40` }}>
                  <span className="text-[10px] font-bold" style={{ color: p.color }}>{p.rank}</span>
                </div>
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-white">{p.name[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-zinc-200 truncate">{p.name}</p>
                  <p className="text-[10px] text-zinc-600">{p.dept}</p>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-sm font-bold text-emerald-400">{p.attendance}%</span>
                  <div className="w-12 progress-bar mt-1">
                    <div className="progress-bar-fill bg-emerald-500" style={{ width: `${p.attendance}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.45 }}
          className="lg:col-span-4 glass-card rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
            <Zap size={15} className="text-amber-400" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {quickActions.map((qa, i) => (
              <button
                key={i}
                onClick={qa.onClick}
                className={cn('quick-action', qa.color)}
              >
                <span className="text-xl">{qa.icon}</span>
                <span className="text-[9px] text-zinc-500 text-center leading-tight">{qa.label}</span>
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

// ─── Users Tab ────────────────────────────────────────────────────────────────
function UsersTab({ users, departments, showCreateForm, setShowCreateForm, formData, setFormData, onCreateUser, editingUser, setEditingUser, editForm, setEditForm, onEditUser, onToggleActive, csvFile, setCsvFile, onCsvImport, importResult, loading }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <GraduationCap size={20} className="text-indigo-400" />
            User Management
          </h2>
          <p className="text-sm text-zinc-500 mt-0.5">Manage students, faculty and administrators</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 bg-zinc-800/80 border border-zinc-700 text-zinc-400 text-xs px-3 py-2 rounded-xl cursor-pointer hover:border-indigo-500/40 transition-colors">
            <Upload size={13} />
            <span>Import CSV</span>
            <input type="file" accept=".csv" onChange={e => setCsvFile(e.target.files?.[0] || null)} className="hidden" />
          </label>
          {csvFile && (
            <Button variant="outline" size="sm" onClick={onCsvImport} disabled={loading}>
              <Upload size={13} /> Import
            </Button>
          )}
          <Button variant="gradient" size="sm" onClick={() => setShowCreateForm(!showCreateForm)}>
            <Plus size={14} />
            {showCreateForm ? 'Cancel' : 'Create User'}
          </Button>
        </div>
      </div>

      {importResult && (
        <div className="glass-card rounded-2xl p-4">
          <div className="flex gap-4 text-sm">
            <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 size={13} /> {importResult.successCount} success</span>
            <span className="text-red-400 flex items-center gap-1"><X size={13} /> {importResult.failureCount} failed</span>
            <span className="text-zinc-400">Total: {importResult.totalProcessed}</span>
          </div>
          {importResult.errors?.length > 0 && (
            <div className="text-xs text-red-300 space-y-1 mt-2 max-h-24 overflow-y-auto">
              {importResult.errors.map((e, i) => <div key={i}>{e}</div>)}
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <form onSubmit={onCreateUser} className="glass-card rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2"><Plus size={14} className="text-indigo-400" /> Create New User</h3>
              <div className="grid grid-cols-2 gap-3">
                {['firstName', 'lastName', 'email', 'password'].map(field => (
                  <div key={field}>
                    <label className="text-xs text-zinc-500 mb-1.5 block capitalize">{field.replace(/([A-Z])/g, ' $1')}</label>
                    <input
                      type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
                      value={formData[field]}
                      onChange={e => setFormData({ ...formData, [field]: e.target.value })}
                      className="collego-input"
                      required
                    />
                  </div>
                ))}
                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Role</label>
                  <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className="collego-input">
                    <option value="STUDENT">Student</option>
                    <option value="FACULTY">Faculty</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Department</label>
                  <select value={formData.departmentId} onChange={e => setFormData({ ...formData, departmentId: e.target.value })} className="collego-input">
                    <option value="">Select Department</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>
              <Button type="submit" variant="gradient" size="sm" className="mt-4">Create User</Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {editingUser && (
        <div className="glass-card rounded-2xl p-5 border border-purple-500/20">
          <h3 className="text-sm font-semibold text-purple-300 mb-3 flex items-center gap-2"><Edit size={13} /> Edit User #{editingUser.id}</h3>
          <div className="grid grid-cols-3 gap-3">
            <input value={editForm.firstName} onChange={e => setEditForm({ ...editForm, firstName: e.target.value })} placeholder="First Name" className="collego-input" />
            <input value={editForm.lastName} onChange={e => setEditForm({ ...editForm, lastName: e.target.value })} placeholder="Last Name" className="collego-input" />
            <input value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} placeholder="Email" className="collego-input" />
          </div>
          <div className="flex gap-2 mt-3">
            <Button onClick={onEditUser} variant="gradient" size="sm">Save Changes</Button>
            <Button onClick={() => setEditingUser(null)} variant="outline" size="sm">Cancel</Button>
          </div>
        </div>
      )}

      <div className="glass-card rounded-2xl overflow-hidden">
        <table className="collego-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th style={{ textAlign: 'center' }}>Role</th>
              <th style={{ textAlign: 'center' }}>Status</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td className="font-medium text-zinc-200">{u.firstName} {u.lastName}</td>
                <td style={{ textAlign: 'center' }}>
                  <Badge variant={u.role === 'ADMIN' ? 'destructive' : u.role === 'FACULTY' ? 'purple' : 'info'}>
                    {u.role}
                  </Badge>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <Badge variant={u.active ? 'success' : 'secondary'}>
                    {u.active ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => { setEditingUser(u); setEditForm({ firstName: u.firstName, lastName: u.lastName, email: u.email }) }} className="p-1.5 rounded-lg hover:bg-indigo-500/10 text-zinc-500 hover:text-indigo-400 transition-colors">
                      <Edit size={13} />
                    </button>
                    <button onClick={() => onToggleActive(u)} className="p-1.5 rounded-lg hover:bg-amber-500/10 text-zinc-500 hover:text-amber-400 transition-colors">
                      {u.active ? <Eye size={13} /> : <Eye size={13} className="opacity-40" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: '#52525b', padding: '2rem' }}>No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Placeholder Tab ──────────────────────────────────────────────────────────
function PlaceholderTab({ title, icon: Icon, description, color = 'indigo' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[60vh] text-center"
    >
      <div className={`w-20 h-20 rounded-2xl bg-${color}-500/10 border border-${color}-500/20 flex items-center justify-center mb-6`}>
        <Icon size={36} className={`text-${color}-400`} />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
      <p className="text-zinc-500 max-w-sm">{description}</p>
      <Badge variant="info" className="mt-4">Fully implemented — UI coming from backend</Badge>
    </motion.div>
  )
}

// ─── Main Admin Dashboard ─────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [toast, setToast] = useState({ text: '', type: 'success' })
  const [loading, setLoading] = useState(false)

  // API data states
  const [overview, setOverview] = useState(null)
  const [users, setUsers] = useState([])
  const [departments, setDepartments] = useState([])
  const [deptReports, setDeptReports] = useState([])
  const [attendanceSummary, setAttendanceSummary] = useState([])
  const [pendingQPs, setPendingQPs] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [placementStats, setPlacementStats] = useState(null)

  // User form state
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', password: '', role: 'STUDENT', departmentId: '' })
  const [editingUser, setEditingUser] = useState(null)
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', email: '' })
  const [csvFile, setCsvFile] = useState(null)
  const [importResult, setImportResult] = useState(null)

  const sidebarWidth = collapsed ? 68 : 240

  const showMsg = useCallback((text, type = 'success') => {
    setToast({ text, type })
  }, [])

  const handleLogout = () => {
    authService.clearTokens()
    navigate('/login')
  }

  useEffect(() => {
    const load = async () => {
      try {
        const [ovRes, usRes, dpRes, drRes, asSummary, qpRes, alRes, psRes] = await Promise.allSettled([
          api.get('/api/admin/dashboard/overview'),
          api.get('/api/admin/users'),
          api.get('/api/admin/departments'),
          api.get('/api/admin/reports/departments'),
          api.get('/api/admin/reports/attendance-summary'),
          api.get('/api/admin/question-papers/pending'),
          api.get('/api/admin/audit-logs?page=0&size=8'),
          api.get('/api/admin/placements/stats'),
        ])
        if (ovRes.status === 'fulfilled') setOverview(ovRes.value.data)
        if (usRes.status === 'fulfilled') setUsers(Array.isArray(usRes.value.data) ? usRes.value.data : usRes.value.data.content || [])
        if (dpRes.status === 'fulfilled') setDepartments(Array.isArray(dpRes.value.data) ? dpRes.value.data : [])
        if (drRes.status === 'fulfilled') setDeptReports(Array.isArray(drRes.value.data) ? drRes.value.data : [])
        if (asSummary.status === 'fulfilled') setAttendanceSummary(Array.isArray(asSummary.value.data) ? asSummary.value.data : [])
        if (qpRes.status === 'fulfilled') setPendingQPs(Array.isArray(qpRes.value.data) ? qpRes.value.data : [])
        if (alRes.status === 'fulfilled') setAuditLogs(Array.isArray(alRes.value.data) ? alRes.value.data : alRes.value.data.content || [])
        if (psRes.status === 'fulfilled') setPlacementStats(psRes.value.data)
      } catch (e) {
        console.error(e)
      }
    }
    load()
  }, [])

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/api/admin/users', { ...formData, departmentId: formData.departmentId || null })
      showMsg('User created successfully!')
      setShowCreateForm(false)
      setFormData({ firstName: '', lastName: '', email: '', password: '', role: 'STUDENT', departmentId: '' })
      const res = await api.get('/api/admin/users')
      setUsers(Array.isArray(res.data) ? res.data : res.data.content || [])
    } catch (e) {
      showMsg(e.response?.data?.message || 'Failed to create user.', 'error')
    } finally { setLoading(false) }
  }

  const handleEditUser = async () => {
    if (!editingUser) return
    setLoading(true)
    try {
      await api.put(`/api/admin/users/${editingUser.id}`, editForm)
      showMsg('User updated successfully!')
      setEditingUser(null)
      const res = await api.get('/api/admin/users')
      setUsers(Array.isArray(res.data) ? res.data : res.data.content || [])
    } catch (e) {
      showMsg(e.response?.data?.message || 'Failed to update user.', 'error')
    } finally { setLoading(false) }
  }

  const handleToggleActive = async (user) => {
    try {
      const endpoint = user.active ? `/api/admin/users/${user.id}/deactivate` : `/api/admin/users/${user.id}/activate`
      await api.patch(endpoint)
      showMsg(`User ${user.active ? 'deactivated' : 'activated'}.`)
      const res = await api.get('/api/admin/users')
      setUsers(Array.isArray(res.data) ? res.data : res.data.content || [])
    } catch (e) {
      showMsg(e.response?.data?.message || 'Action failed.', 'error')
    }
  }

  const handleCsvImport = async () => {
    if (!csvFile) return
    setLoading(true)
    try {
      const fd = new FormData(); fd.append('file', csvFile)
      const res = await api.post('/api/admin/users/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setImportResult(res.data)
      showMsg(`Import complete: ${res.data.successCount} users created.`)
      setCsvFile(null)
      const usRes = await api.get('/api/admin/users')
      setUsers(Array.isArray(usRes.data) ? usRes.data : usRes.data.content || [])
    } catch (e) {
      showMsg(e.response?.data?.message || 'CSV import failed.', 'error')
    } finally { setLoading(false) }
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab
          overview={overview} deptReports={deptReports} attendanceSummary={attendanceSummary}
          pendingQPs={pendingQPs} auditLogs={auditLogs} placementStats={placementStats}
          onTabChange={setActiveTab}
        />
      case 'users':
        return <UsersTab
          users={users} departments={departments} showCreateForm={showCreateForm} setShowCreateForm={setShowCreateForm}
          formData={formData} setFormData={setFormData} onCreateUser={handleCreateUser}
          editingUser={editingUser} setEditingUser={setEditingUser} editForm={editForm} setEditForm={setEditForm}
          onEditUser={handleEditUser} onToggleActive={handleToggleActive}
          csvFile={csvFile} setCsvFile={setCsvFile} onCsvImport={handleCsvImport} importResult={importResult} loading={loading}
        />
      case 'faculty':
        return <PlaceholderTab title="Faculty Management" icon={Users} description="Manage faculty profiles, course assignments and performance." color="purple" />
      case 'academics':
        return <PlaceholderTab title="Academic Management" icon={BookOpen} description="Manage departments, courses, semesters, sections, and timetables." color="blue" />
      case 'attendance':
        return <PlaceholderTab title="Attendance Management" icon={ClipboardCheck} description="Track and manage student attendance across all departments." color="teal" />
      case 'examinations':
        return <PlaceholderTab title="Examinations & Marks" icon={BookMarked} description="Internal marks, semester results, grade management." color="amber" />
      case 'placements':
        return <PlaceholderTab title="Placement Management" icon={Briefcase} description="Company drives, student applications, placement analytics." color="emerald" />
      case 'fees':
        return <PlaceholderTab title="Fees & Finance" icon={DollarSign} description="Student fee management, payment tracking and reports." color="orange" />
      case 'hostel':
        return <PlaceholderTab title="Hostel & Facilities" icon={Building2} description="Hostel allocation, facilities management and complaints." color="red" />
      case 'library':
        return <PlaceholderTab title="Library Management" icon={Library} description="Book catalog, issue/return tracking, fine management." color="cyan" />
      case 'announcements':
        return <PlaceholderTab title="Notices & Events" icon={Megaphone} description="Create and manage college announcements and events." color="indigo" />
      case 'aiAssistant':
        return <PlaceholderTab title="AI Assistant" icon={Sparkles} description="AI-powered chat, insights, and automated decision support." color="purple" />
      case 'deptReports':
        return <PlaceholderTab title="Reports & Analytics" icon={BarChart3} description="Department-wise reports, attendance summaries, academic analytics." color="violet" />
      case 'settings':
        return <PlaceholderTab title="System Settings" icon={Settings} description="Configure system preferences, roles, and access control." color="zinc" />
      case 'help':
        return <PlaceholderTab title="Help & Support" icon={HelpCircle} description="Documentation, FAQs, and support contact." color="teal" />
      default:
        return <OverviewTab overview={overview} deptReports={deptReports} attendanceSummary={attendanceSummary} pendingQPs={pendingQPs} auditLogs={auditLogs} placementStats={placementStats} onTabChange={setActiveTab} />
    }
  }

  return (
    <div className="min-h-screen bg-mesh" style={{ background: 'rgb(9, 9, 11)' }}>
      <Toast message={toast} onClose={() => setToast({ text: '', type: 'success' })} />
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <Topbar email={authService.getEmail()} pendingCount={pendingQPs.length} onLogout={handleLogout} sidebarWidth={sidebarWidth} />

      <main
        className="main-content"
        style={{ marginLeft: sidebarWidth }}
      >
        <div className="p-6 bg-mesh">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {renderTab()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
