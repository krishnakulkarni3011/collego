import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, BookOpen, ClipboardCheck,
  Award, DollarSign, Building2, Library, Sparkles,
  BarChart3, Settings, HelpCircle, Plus, GraduationCap,
  Megaphone, FileText, CheckCircle2,
  Clock, MapPin, Activity, BookMarked, Briefcase, X,
  RefreshCw, Upload, Edit, Power, Filter, Trophy,
  TrendingUp, XCircle, Wallet, Home, Landmark, Download,
  UsersRound, CalendarDays, ScrollText, Layers, ChevronRight, ArrowLeft, Send,
  Paperclip, Eye,
} from 'lucide-react'
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { authService } from '../services/authService'
import api from '../services/api'
import { downloadFile, previewFile } from '../lib/download'
import { SettingsTab } from '../components/dashboard/SettingsTab'
import { HelpTab } from '../components/dashboard/HelpTab'
import { ExamsAdminTab } from '../components/dashboard/ExamsAdminTab'
import { PromotionTab } from '../components/dashboard/PromotionTab'
import { GraduatedStudentsTab } from '../components/dashboard/GraduatedStudentsTab'
import { AdminEventsTab } from '../components/dashboard/AdminEventsTab.jsx'
import { PlacedStudentsPanel } from '../components/dashboard/PlacedStudentsPanel.jsx'
import { EventBox } from '../components/dashboard/EventBox.jsx'
import { confirmAction } from '../components/common/ConfirmDialog.jsx'
import { cn } from '../lib/utils'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import {
  PortalSidebar, PortalTopbar, Toast, StatCard, Panel, PageTitle,
  WelcomeBanner, ChartTooltip, EmptyState, AnimatedNumber, ACCENTS, ImageStrip,
} from '../components/dashboard/PortalUI'
import { uiImages } from '../assets/uiImages'
import { timeAgo } from '../lib/time'

// --- Helpers -----------------------------------------------------------------
const fmtNum = (n, dp = 1) => (n == null ? '-' : Number(n).toFixed(dp))
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'

const PIE_COLORS = ['#4f46e5', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6']
const RANK_COLORS = ['#f59e0b', '#94a3b8', '#cd7f32', '#6366f1', '#6366f1']
const NOTICE_TYPES = {
  ACADEMIC: { variant: 'info', label: 'Academic' },
  PLACEMENT: { variant: 'purple', label: 'Placement' },
  EXAM: { variant: 'destructive', label: 'Exam' },
  FEE: { variant: 'warning', label: 'Fee' },
  GENERAL: { variant: 'secondary', label: 'General' },
}
const EVENT_COLORS = { Placement: '#10b981', Academic: '#6366f1', Exam: '#ef4444', Event: '#f59e0b' }

const NAV_SECTIONS = [
  { items: [{ id: 'overview', label: 'Dashboard', icon: LayoutDashboard }] },
  {
    title: 'Management',
    items: [
      { id: 'academics', label: 'Academics', icon: BookOpen },
      { id: 'examinations', label: 'Examinations', icon: BookMarked },
      { id: 'placements', label: 'Placements', icon: Briefcase },
      { id: 'broadcasts', label: 'Broadcast Center', icon: Send },
    ],
  },
  {
    title: 'Administration',
    items: [
      { id: 'announcements', label: 'Notices & Events', icon: Megaphone },
      { id: 'events', label: 'Upcoming Events', icon: CalendarDays },
      { id: 'reports', label: 'Reports', icon: BarChart3 },
      { id: 'promotion', label: 'Semester Promotion', icon: GraduationCap },
      { id: 'graduatedStudents', label: 'Graduated Students', icon: GraduationCap },
      { id: 'settings', label: 'Settings', icon: Settings },
      { id: 'help', label: 'Help & Support', icon: HelpCircle },
    ],
  },
]

// --- Overview Tab --------------------------------------------------------------
function OverviewTab({ overview, deptReports, attendanceSummary, placementStats, insights, semesters, onTabChange, onSemesterChange }) {
  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'

  const attendanceChartData = (attendanceSummary || [])
    .slice(0, 6)
    .map(d => ({ name: d.departmentName?.split(' ')[0] || d.departmentCode || 'N/A', attendance: Math.round(d.averageAttendancePercentage || 0) }))

  const totalStudentsInDepts = (deptReports || []).reduce((s, d) => s + (d.totalStudents || 0), 0) || 1
  const deptDistribution = (deptReports || [])
    .slice(0, 6)
    .map(d => ({ name: d.departmentCode || d.departmentName?.split(' ')[0] || '-', value: d.totalStudents || 0 }))
    .filter(d => d.value > 0)

  const topPerformers = insights?.topPerformers || []
  const recentNotices = insights?.recentNotices || []
  const upcomingEvents = insights?.upcomingEvents || []

  const quickActions = [
    { icon: GraduationCap, label: 'Manage Students', tab: 'academics', accent: 'blue', grad: 'from-blue-500 to-cyan-500' },
    { icon: Users, label: 'Manage Faculty', tab: 'academics', accent: 'violet', grad: 'from-violet-500 to-fuchsia-500' },
    { icon: Megaphone, label: 'Create Notice', tab: 'announcements', accent: 'amber', grad: 'from-amber-500 to-orange-500' },
    { icon: BarChart3, label: 'Generate Report', tab: 'reports', accent: 'indigo', grad: 'from-indigo-500 to-blue-500' },
    { icon: BookOpen, label: 'Manage Courses', tab: 'academics', accent: 'emerald', grad: 'from-emerald-500 to-teal-500' },
    { icon: ClipboardCheck, label: 'Broadcast', tab: 'broadcasts', accent: 'emerald', grad: 'from-emerald-500 to-teal-500' },
    { icon: BookMarked, label: 'Upload Marks', tab: 'examinations', accent: 'violet', grad: 'from-violet-500 to-fuchsia-500' },
    { icon: Briefcase, label: 'Placement Records', tab: 'placements', accent: 'amber', grad: 'from-amber-500 to-orange-500' },
  ]

  return (
    <div className="space-y-8">
      <WelcomeBanner
        greeting={greeting}
        name="Admin"
        subtitle="Here's what's happening across your college today."
        quote="Education transforms ideas into reality"
        accent="indigo"
      />

      {/* Stat cards row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard index={0} label="Total Students" value={overview?.totalStudents ?? 0} icon={GraduationCap} accent="blue"
          sub={`across ${overview?.totalDepartments ?? 0} departments`} onClick={() => onTabChange('academics')} glow />
        <StatCard index={1} label="Faculty Members" value={overview?.totalFaculty ?? 0} icon={UsersRound} accent="violet"
          sub={`${overview?.totalSections ?? 0} sections running`} onClick={() => onTabChange('academics')} glow />
        <StatCard index={2} label="Average Attendance" value={overview?.overallAverageAttendance ?? 0} decimals={1} suffix="%" icon={ClipboardCheck} accent="emerald"
          sub="college-wide average" glow />
        <StatCard index={3} label="Placed Students" value={placementStats?.studentsPlaced ?? 0} icon={Trophy} accent="amber"
          sub={`${placementStats?.totalOffersExtended ?? 0} offers extended`} onClick={() => onTabChange('placements')} glow />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <Panel title="Student Distribution" icon={Activity} accent="violet" className="xl:col-span-3">
          {deptDistribution.length === 0 ? (
            <EmptyState icon={Activity} title="No students yet" description="Department distribution will appear here." accent="violet" />
          ) : (
            <>
              <div className="relative">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={deptDistribution} cx="50%" cy="50%" innerRadius={56} outerRadius={82} paddingAngle={3} dataKey="value">
                      {deptDistribution.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <AnimatedNumber value={overview?.totalStudents ?? 0} className="text-2xl md:text-3xl font-extrabold text-slate-900" />
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Students</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                {deptDistribution.map((d, i) => (
                  <div key={d.name + i} className="flex items-center gap-2 min-w-0 p-1.5 rounded-xl hover:bg-slate-50/50 transition-colors">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-[11px] text-slate-500 truncate">{d.name}</span>
                    <span className="text-[11px] font-semibold text-slate-700 ml-auto">{Math.round((d.value / totalStudentsInDepts) * 100)}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Panel>

        <Panel title="Upcoming Events" icon={CalendarDays} accent="amber" className="xl:col-span-4"
          action={<button onClick={() => onTabChange('announcements')} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100 px-2 py-1 rounded-lg transition-colors">View All</button>}
        >
          {upcomingEvents.length === 0 ? (
            <EmptyState icon={CalendarDays} title="No upcoming events" description="New placement drives and activities will show up here." accent="amber" />
          ) : (
            <div className="space-y-2">
              {upcomingEvents.map((ev) => {
                const color = EVENT_COLORS[ev.category] || '#6366f1'
                const date = ev.date ? new Date(ev.date) : null
                return (
                  <motion.div key={ev.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }}
                    className="event-item relative overflow-hidden group">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-current" style={{ opacity: 0.15, backgroundColor: color }} />
                    <div className="flex items-center gap-3.5 p-3 rounded-xl border border-white/60 bg-white/70 backdrop-blur-sm hover:bg-white transition-colors group-hover:border-indigo-300/70">
                      <div className="flex flex-col items-center justify-center w-10 h-10 rounded-xl shrink-0" style={{ background: `${color}14`, border: `1px solid ${color}30` }}>
                        <span className="text-[9px] font-bold uppercase" style={{ color }}>{date ? date.toLocaleDateString('en-IN', { month: 'short' }) : '-'}</span>
                        <span className="text-sm font-extrabold text-slate-800 leading-none">{date ? date.getDate() : '-'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{ev.title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1 truncate">
                          <MapPin size={10} /> {ev.subtitle || ev.location}
                        </p>
                      </div>
                      <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full shrink-0" style={{ color, background: `${color}14` }}>
                        {ev.category}
                      </span>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </Panel>
      </div>

      {/* Notices / performers / quick actions */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <Panel title="Recent Notices" icon={Megaphone} accent="amber" className="xl:col-span-12"
          action={<button onClick={() => onTabChange('announcements')} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100 px-2 py-1 rounded-lg transition-colors">View All</button>}
        >
          {recentNotices.length === 0 ? (
            <EmptyState icon={Megaphone} title="No notices yet" description="Notices broadcast to students will appear here." accent="amber" />
          ) : (
            <div className="space-y-2">
              {recentNotices.map((n) => {
                const cfg = NOTICE_TYPES[n.type] || NOTICE_TYPES.GENERAL
                return (
                  <motion.div key={n.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-3 p-3 rounded-xl border border-white/60 bg-white/70 backdrop-blur-sm cursor-pointer group hover:bg-white/90 transition-all">
                    <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 mt-0.5">
                      <FileText size={15} className="text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={cfg.variant} className="text-[9px] px-2 py-0.5">{cfg.label}</Badge>
                        <span className="text-[9px] text-slate-400">{timeAgo(n.createdAt)}</span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 truncate leading-tight">{n.title}</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </Panel>

        </div>

      <EventBox accent="indigo" />

      <ImageStrip
        title="Campus at a Glance"
        subtitle="The people, places and moments that keep Collego moving."
        items={[
          { src: uiImages.campus, label: 'Our campus' },
          { src: uiImages.studentServices, label: 'Student services' },
          { src: uiImages.placementsFair, label: 'Placements' },
          { src: uiImages.placementTalk, label: 'Career talks' },
        ]}
      />
    </div>
  )
}

// --- Directory (Students / Faculty) ------------------------------------------
function DirectoryTab({
  users, departments, loading, query, fixedRole, title, subtitle, icon,
  onCreateUser, onEditUser, onToggleActive, onCsvImport, importResult,
  enableYearFilter = false,
}) {
  const [roleFilter, setRoleFilter] = useState(fixedRole || 'ALL')
  const [yearFilter, setYearFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', role: fixedRole || 'STUDENT', departmentId: '', isHod: false })
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', email: '' })

  const YEAR_OPTIONS = [
    { label: 'I Year', value: '1' },
    { label: 'II Year', value: '2' },
    { label: 'III Year', value: '3' },
    { label: 'Final Year', value: '4' },
  ]

  const filtered = useMemo(() => {
    const q = (query || '').trim().toLowerCase()
    return users.filter(u => {
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false
      if (!q) return true
      return `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(q)
    })
  }, [users, roleFilter, query])

  const yearFiltered = useMemo(() => {
    if (!enableYearFilter || !yearFilter) return filtered
    return filtered.filter(u => {
      const sem = u.semester || 0
      if (yearFilter === '1') return sem <= 2
      if (yearFilter === '2') return sem > 2 && sem <= 4
      if (yearFilter === '3') return sem > 4 && sem <= 6
      if (yearFilter === '4') return sem > 6
      return true
    })
  }, [filtered, enableYearFilter, yearFilter])

  const submitCreate = async (e) => {
    e.preventDefault()
    const ok = await onCreateUser({ ...form, departmentId: form.departmentId || null })
    if (ok) {
      setShowCreate(false)
      setForm({ firstName: '', lastName: '', email: '', password: '', role: fixedRole || 'STUDENT', departmentId: '', isHod: false })
    }
  }

  const submitEdit = async () => {
    if (!editing) return
    const ok = await onEditUser(editing.id, editForm)
    if (ok) setEditing(null)
  }

  return (
    <div className="space-y-6">
      <PageTitle
        icon={icon}
        title={title}
        subtitle={subtitle}
        actions={
          <>
            <button
              onClick={() => downloadFile(
                `/api/admin/export/${fixedRole === 'FACULTY' ? 'faculty' : 'students'}`,
                `${fixedRole === 'FACULTY' ? 'faculty' : 'students'}.csv`
              ).catch(() => {})}
              className="flex items-center gap-2 bg-white border border-white/60 text-slate-500 text-xs font-semibold px-3 py-2 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 transition-colors backdrop-blur-sm"
            >
              <Download size={14} /> Export CSV
            </button>
            <label className="flex items-center gap-2 bg-white border border-white/60 text-slate-500 text-xs font-semibold px-3 py-2 rounded-xl cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 transition-colors backdrop-blur-sm">
              <Upload size={14} />
              <span>Import CSV</span>
              <input type="file" accept=".csv" onChange={e => e.target.files?.[0] && onCsvImport(e.target.files[0])} className="hidden" />
            </label>
            <Button variant="gradient" size="sm" onClick={() => setShowCreate(v => !v)}>
              <Plus size={14} /> {showCreate ? 'Cancel' : 'Add User'}
            </Button>
          </>
        }
      />

      {importResult && (
        <div className="glass-card p-5 flex flex-wrap items-center gap-4 text-sm border border-white/60">
          <div className="flex items-center gap-2 text-emerald-600 font-medium">
            <CheckCircle2 size={15} /> {importResult.successCount} imported
          </div>
          <div className="flex items-center gap-2 text-red-500 font-medium">
            <X size={15} /> {importResult.failureCount} failed
          </div>
          <div className="px-2 py-1 rounded bg-slate-50 text-[10px] text-slate-500 font-medium">
            Total {importResult.totalProcessed}
          </div>
        </div>
      )}

      {showCreate && (
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 border border-white/60"
        >
          <h3 className="text-sm font-semibold text-slate-800 mb-5 flex items-center gap-2"><Plus size={15} className="text-indigo-500" /> Create New User</h3>
          <form onSubmit={submitCreate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {['firstName', 'lastName', 'email', 'password'].map(field => (
              <div key={field}>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">{field.replace(/([A-Z])/g, ' $1')}</label>
                <input
                  type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
                  value={form[field]} onChange={e => setForm({ ...form, [field]: e.target.value })}
                  className="collego-input" required
                />
              </div>
            ))}
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Role</label>
              <select value={form.role} disabled={!!fixedRole} onChange={e => setForm({ ...form, role: e.target.value })} className="collego-input disabled:opacity-60">
                <option value="STUDENT">Student</option>
                <option value="FACULTY">Faculty</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Department</label>
              <select value={form.departmentId} onChange={e => setForm({ ...form, departmentId: e.target.value })} className="collego-input">
                <option value="">Select Department</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            {form.role === 'FACULTY' && (
              <label className="col-span-full flex items-start gap-3 rounded-xl border border-violet-100 bg-violet-50/60 px-4 py-3 cursor-pointer">
                <input type="checkbox" checked={Boolean(form.isHod)} onChange={e => setForm({ ...form, isHod: e.target.checked })} className="mt-0.5 h-4 w-4 accent-violet-600" />
                <span>
                  <span className="block text-sm font-semibold text-slate-800">Head of Department (HoD)</span>
                  <span className="block text-[11px] text-slate-500 mt-0.5">Only one HoD per department. Assigning a new HoD replaces the current one.</span>
                </span>
              </label>
            )}
            <div className="col-span-full lg:col-span-3">
              <Button type="submit" variant="gradient" size="sm" disabled={loading}>
                {loading ? <><RefreshCw size={13} className="animate-spin" /> Creating...</> : <><Plus size={13} /> Create User</>}
              </Button>
            </div>
          </form>
        </motion.div>
      )}

      {editing && (
        <div className="glass-card p-6 border border-violet-100/50 bg-violet-50/30">
          <h3 className="text-sm font-semibold text-violet-700 mb-4 flex items-center gap-2"><Edit size={14} className="text-violet-500" /> Edit {editing.firstName} {editing.lastName}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input value={editForm.firstName} onChange={e => setEditForm({ ...editForm, firstName: e.target.value })} placeholder="First name" className="collego-input" />
            <input value={editForm.lastName} onChange={e => setEditForm({ ...editForm, lastName: e.target.value })} placeholder="Last name" className="collego-input" />
            <input value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} placeholder="Email" className="collego-input" />
          </div>
          <div className="flex gap-3 mt-5">
            <Button onClick={submitEdit} variant="gradient" size="sm">Save Changes</Button>
            <Button onClick={() => setEditing(null)} variant="outline" size="sm">Cancel</Button>
          </div>
        </div>
      )}

      {!fixedRole && (
        <div className="flex items-center gap-3">
          <Filter size={14} className="text-slate-400" />
          {['ALL', 'STUDENT', 'FACULTY', 'ADMIN'].map(r => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold transition-all border',
                roleFilter === r ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-500/20' : 'bg-white text-slate-500 border-white/60 hover:border-indigo-300 hover:bg-indigo-50 hover:text-slate-800'
              )}
            >
              {r === 'ALL' ? 'All' : r.charAt(0) + r.slice(1).toLowerCase()}
            </button>
          ))}
          <span className="ml-auto px-2 py-1 rounded bg-slate-50 text-[10px] text-slate-500 font-medium">{yearFiltered.length} users</span>
          {enableYearFilter && (
            <div className="flex items-center gap-2 ml-4">
              <label className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Year:</label>
              <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} className="collego-input !w-32 text-xs">
                <option value="">All Years</option>
                {YEAR_OPTIONS.map(y => (
                  <option key={y.value} value={y.value}>{y.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      <div className="glass-card overflow-hidden border border-white/60">
        <div className="overflow-x-auto">
          <table className="collego-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th style={{ textAlign: 'center' }}>Role</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {yearFiltered.map(u => (
                <tr key={u.id} className="hover:bg-white/30 transition-colors">
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[11px] font-bold text-white shrink-0 shadow-sm shadow-indigo-500/20">
                        {u.firstName?.[0]}{u.lastName?.[0]}
                      </div>
                      <span className="font-medium text-slate-800">{u.firstName} {u.lastName}</span>
                    </div>
                  </td>
                  <td className="text-slate-500">{u.email}</td>
                  <td style={{ textAlign: 'center' }}>
                    <Badge variant={u.role === 'ADMIN' ? 'destructive' : u.role === 'FACULTY' ? 'purple' : 'info'}>{u.role}</Badge>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <Badge variant={u.active ? 'success' : 'secondary'}>{u.active ? 'Active' : 'Inactive'}</Badge>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => { setEditing(u); setEditForm({ firstName: u.firstName, lastName: u.lastName, email: u.email }) }}
                        className="p-2.5 rounded-xl hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors" title="Edit"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => onToggleActive(u)}
                        className={cn('p-2.5 rounded-xl transition-colors', u.active ? 'hover:bg-amber-50 text-slate-400 hover:text-amber-600' : 'hover:bg-emerald-50 text-slate-400 hover:text-emerald-600')}
                        title={u.active ? 'Deactivate' : 'Activate'}
                      >
                        <Power size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="text-center text-slate-400 py-14">No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// --- Academics ---------------------------------------------------------------
const YEAR_OPTIONS = [
  { label: 'I Year', value: 1 },
  { label: 'II Year', value: 2 },
  { label: 'III Year', value: 3 },
  { label: 'Final Year', value: 4 },
]

function studentYear(user) {
  const sem = Number(user.semester || 0)
  return sem > 0 ? Math.ceil(sem / 2) : 0
}

function AcademicsTab({
  users, departments, overview, semesters, deptReports,
  onCreateUser, onEditUser, onToggleActive, onReviewResume,
  onCsvImport, importResult, onCreateDepartment,
}) {
  const [selectedDept, setSelectedDept] = useState(null)
  const [mode, setMode] = useState(null)
  const [year, setYear] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', enrollmentNumber: '', section: 'A', employeeId: '', designation: '', isHod: false })
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', email: '', semester: '', section: '', enrollmentNumber: '', employeeId: '', designation: '', isHod: false })
  const [showDeptCreate, setShowDeptCreate] = useState(false)
  const [deptForm, setDeptForm] = useState({ name: '', code: '', description: '' })
  const [deptBusy, setDeptBusy] = useState(false)

  const departmentList = useMemo(() => {
    if (deptReports?.length) return deptReports
    return (departments || []).map(d => ({
      departmentId: d.id,
      departmentName: d.name,
      departmentCode: d.code,
      totalStudents: 0,
      totalFaculty: 0,
      totalCourses: 0,
    }))
  }, [deptReports, departments])

  const stats = [
    { label: 'Departments', value: overview?.totalDepartments ?? departmentList.length, icon: Layers, accent: 'blue', grad: 'from-blue-500 to-cyan-500' },
    { label: 'Courses', value: overview?.totalCourses ?? 0, icon: BookOpen, accent: 'violet', grad: 'from-violet-500 to-fuchsia-500' },
    { label: 'Sections', value: overview?.totalSections ?? 0, icon: UsersRound, accent: 'emerald', grad: 'from-emerald-500 to-teal-500' },
    { label: 'Enrollments', value: overview?.totalEnrollments ?? 0, icon: ScrollText, accent: 'amber', grad: 'from-amber-500 to-orange-500' },
  ]

  const openDepartment = (dept) => {
    setSelectedDept(dept)
    setMode(null)
    setShowCreate(false)
    setEditing(null)
  }

  const goBack = () => {
    if (mode) { setMode(null); setShowCreate(false); setEditing(null); return }
    setSelectedDept(null)
    setShowCreate(false)
    setEditing(null)
  }

  const resetForm = () => setForm({ firstName: '', lastName: '', email: '', password: '', enrollmentNumber: '', section: 'A', employeeId: '', designation: '', isHod: false })

  const submitCreate = async (e) => {
    e.preventDefault()
    if (!selectedDept) return
    setBusy(true)
    const payload = mode === 'faculty'
      ? { ...form, role: 'FACULTY', departmentId: selectedDept.departmentId, employeeId: form.employeeId, designation: form.designation, isHod: Boolean(form.isHod) }
      : {
          ...form,
          role: 'STUDENT',
          departmentId: selectedDept.departmentId,
          semester: Number(year) * 2 - 1,
          admissionYear: new Date().getFullYear() - (Number(year) - 1),
        }
    const ok = await onCreateUser(payload)
    setBusy(false)
    if (ok) { setShowCreate(false); resetForm() }
  }

  const startEdit = (u) => {
    setEditing(u)
    setEditForm({
      firstName: u.firstName || '', lastName: u.lastName || '', email: u.email || '',
      semester: u.semester || '', section: u.section || '', enrollmentNumber: u.enrollmentNumber || '',
      employeeId: u.employeeId || '', designation: u.designation || '', isHod: Boolean(u.isHod),
    })
  }

  const submitEdit = async () => {
    if (!editing) return
    setBusy(true)
    const payload = mode === 'faculty'
      ? { firstName: editForm.firstName, lastName: editForm.lastName, email: editForm.email, employeeId: editForm.employeeId, designation: editForm.designation, departmentId: selectedDept.departmentId, isHod: Boolean(editForm.isHod) }
      : {
          firstName: editForm.firstName, lastName: editForm.lastName, email: editForm.email,
          enrollmentNumber: editForm.enrollmentNumber, semester: editForm.semester ? Number(editForm.semester) : null,
          section: editForm.section, departmentId: selectedDept.departmentId,
        }
    const ok = await onEditUser(editing.id, payload)
    setBusy(false)
    if (ok) setEditing(null)
  }

  const departmentFaculty = useMemo(() => {
    if (!selectedDept) return []
    return (users || []).filter(u => u.role === 'FACULTY' && u.departmentId === selectedDept.departmentId && u.active)
  }, [users, selectedDept])

  const departmentStudents = useMemo(() => {
    if (!selectedDept) return []
    return (users || []).filter(u => u.role === 'STUDENT' && u.departmentId === selectedDept.departmentId && u.active && studentYear(u) === Number(year))
  }, [users, selectedDept, year])

  const renderDepartmentHome = () => (
    <>
      <PageTitle icon={BookOpen} title="Academics" subtitle="Choose a department to manage its students and faculty." image={uiImages.classroom} imageAlt="Classroom lecture" />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s, i) => <StatCard key={s.label} index={i} label={s.label} value={s.value} icon={s.icon} accent={s.accent} glow />)}
      </div>
      <Panel title="Departments" icon={Building2} accent="blue"
        action={<Button variant="gradient" size="sm" onClick={() => setShowDeptCreate(v => !v)}><Plus size={14} /> {showDeptCreate ? 'Cancel' : 'Add New Department'}</Button>}>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {departmentList.map(d => (
            <button key={d.departmentId} onClick={() => openDepartment(d)}
              className="flex items-center gap-3 p-4 rounded-2xl border border-white/60 bg-white/70 backdrop-blur-sm hover:bg-white hover:border-indigo-200 hover:-translate-y-0.5 transition-all text-left group">
              <div className="w-11 h-11 rounded-xl bg-white border border-white/60 flex items-center justify-center font-bold text-xs text-indigo-600 shrink-0 shadow-sm">
                {d.departmentCode}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800 truncate">{d.departmentName}</p>
                <p className="text-[11px] text-slate-400">{d.totalStudents} students - {d.totalFaculty} faculty</p>
              </div>
              <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
            </button>
          ))}
          {departmentList.length === 0 && <EmptyState icon={Building2} title="No departments" accent="blue" />}
        </div>
      </Panel>

      {showDeptCreate && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 border border-white/60">
          <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2"><Plus size={15} className="text-indigo-500" /> Add New Department</h3>
          <form onSubmit={async (e) => {
            e.preventDefault()
            if (!deptForm.name.trim() || !deptForm.code.trim()) return
            setDeptBusy(true)
            const ok = await onCreateDepartment({ name: deptForm.name.trim(), code: deptForm.code.trim().toUpperCase(), description: deptForm.description.trim() })
            setDeptBusy(false)
            if (ok) { setDeptForm({ name: '', code: '', description: '' }); setShowDeptCreate(false) }
          }} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Department Name</label><input value={deptForm.name} onChange={e => setDeptForm({ ...deptForm, name: e.target.value })} placeholder="e.g. Computer Science" className="collego-input" required /></div>
            <div><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Code</label><input value={deptForm.code} onChange={e => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })} placeholder="e.g. CSE" className="collego-input" required /></div>
            <div><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Description</label><input value={deptForm.description} onChange={e => setDeptForm({ ...deptForm, description: e.target.value })} placeholder="Optional" className="collego-input" /></div>
            <div className="sm:col-span-3 flex gap-3">
              <Button type="submit" variant="gradient" size="sm" disabled={deptBusy}>{deptBusy ? <><RefreshCw size={14} className="animate-spin" /> Adding...</> : <><Plus size={14} /> Add Department</>}</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowDeptCreate(false)}>Cancel</Button>
            </div>
          </form>
          <p className="text-[10px] text-slate-400 mt-3">The new department will have its own Students and Faculty sections ready for manual or CSV additions.</p>
        </motion.div>
      )}

      <div className="glass-card p-5 border border-white/60">
        <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2"><CalendarDays size={14} className="text-violet-500" /> Semesters</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
          {(semesters || []).map(s => (
            <div key={s.id} className="flex items-center justify-between p-3 rounded-xl border border-white/60 bg-white/70">
              <div>
                <p className="text-sm font-semibold text-slate-800">{s.name}</p>
                <p className="text-[11px] text-slate-400">{s.academicYear}</p>
              </div>
              <Badge variant={s.active ? 'success' : 'secondary'}>{s.active ? 'Active' : 'Inactive'}</Badge>
            </div>
          ))}
          {(!semesters || semesters.length === 0) && <p className="text-xs text-slate-400">No semesters configured.</p>}
        </div>
      </div>
    </>
  )

  const renderChoice = () => (
    <>
      <PageTitle icon={Building2} title={selectedDept.departmentName} subtitle="Select what you want to manage in this department." image={uiImages.studentServices} imageAlt="Student services desk" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button onClick={() => { setMode('students'); setYear(1) }}
          className="glass-card p-8 border border-white/60 text-left hover:-translate-y-1 hover:border-emerald-200 transition-all group">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 mb-5">
            <GraduationCap size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Students</h3>
          <p className="text-sm text-slate-500 mt-2">View and manage students by year, including enrolment details and sections.</p>
          <p className="text-xs font-semibold text-emerald-600 mt-5 flex items-center gap-1">{selectedDept.totalStudents || departmentStudents.length} students <ChevronRight size={13} /></p>
        </button>
        <button onClick={() => setMode('faculty')}
          className="glass-card p-8 border border-white/60 text-left hover:-translate-y-1 hover:border-violet-200 transition-all group">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/20 mb-5">
            <Users size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Faculty</h3>
          <p className="text-sm text-slate-500 mt-2">Manage department faculty and approve their career-profile resumes.</p>
          <p className="text-xs font-semibold text-violet-600 mt-5 flex items-center gap-1">{selectedDept.totalFaculty || departmentFaculty.length} faculty <ChevronRight size={13} /></p>
        </button>
      </div>
    </>
  )

  const renderCreateForm = () => (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 border border-white/60">
      <h3 className="text-sm font-semibold text-slate-800 mb-5 flex items-center gap-2"><Plus size={15} className="text-indigo-500" /> Add {mode === 'faculty' ? 'Faculty' : `${YEAR_OPTIONS.find(y => y.value === Number(year))?.label || ''} Student`}</h3>
      <form onSubmit={submitCreate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">First Name</label><input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} className="collego-input" required /></div>
        <div><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Last Name</label><input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} className="collego-input" required /></div>
        <div><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Email</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="collego-input" required /></div>
        <div><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Temporary Password</label><input type="password" minLength={6} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="collego-input" required /></div>
        {mode === 'faculty' ? (
          <>
            <div><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Employee ID</label><input value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })} className="collego-input" /></div>
            <div><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Designation</label><input value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} placeholder="e.g., Assistant Professor" className="collego-input" /></div>
            <label className="col-span-full flex items-start gap-3 rounded-xl border border-violet-100 bg-violet-50/60 px-4 py-3 cursor-pointer">
              <input type="checkbox" checked={Boolean(form.isHod)} onChange={e => setForm({ ...form, isHod: e.target.checked })} className="mt-0.5 h-4 w-4 accent-violet-600" />
              <span>
                <span className="block text-sm font-semibold text-slate-800">Head of Department (HoD)</span>
                <span className="block text-[11px] text-slate-500 mt-0.5">Only one faculty member can be HoD per department. Assigning a new HoD automatically replaces the current one.</span>
              </span>
            </label>
          </>
        ) : (
          <>
            <div><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">USN / Enrollment No.</label><input value={form.enrollmentNumber} onChange={e => setForm({ ...form, enrollmentNumber: e.target.value })} placeholder="e.g., 2BA23CS001" className="collego-input" required /></div>
            <div><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Section</label><select value={form.section} onChange={e => setForm({ ...form, section: e.target.value })} className="collego-input"><option>A</option><option>B</option><option>C</option></select></div>
          </>
        )}
        <div className="col-span-full flex gap-3">
          <Button type="submit" variant="gradient" size="sm" disabled={busy}>{busy ? <><RefreshCw size={13} className="animate-spin" /> Saving...</> : <><Plus size={13} /> Create {mode === 'faculty' ? 'Faculty' : 'Student'}</>}</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
        </div>
      </form>
    </motion.div>
  )

  const renderEditForm = () => (
    <div className="glass-card p-6 border border-violet-100/50 bg-violet-50/30">
      <h3 className="text-sm font-semibold text-violet-700 mb-4 flex items-center gap-2"><Edit size={14} className="text-violet-500" /> Edit {editing.firstName} {editing.lastName}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <input value={editForm.firstName} onChange={e => setEditForm({ ...editForm, firstName: e.target.value })} placeholder="First name" className="collego-input" />
        <input value={editForm.lastName} onChange={e => setEditForm({ ...editForm, lastName: e.target.value })} placeholder="Last name" className="collego-input" />
        <input value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} placeholder="Email" className="collego-input" />
        {mode === 'faculty' ? (
          <>
            <input value={editForm.employeeId} onChange={e => setEditForm({ ...editForm, employeeId: e.target.value })} placeholder="Employee ID" className="collego-input" />
            <input value={editForm.designation} onChange={e => setEditForm({ ...editForm, designation: e.target.value })} placeholder="Designation" className="collego-input" />
            <label className="col-span-full flex items-center gap-3 rounded-xl border border-violet-100 bg-violet-50/60 px-4 py-3 cursor-pointer">
              <input type="checkbox" checked={Boolean(editForm.isHod)} onChange={e => setEditForm({ ...editForm, isHod: e.target.checked })} className="h-4 w-4 accent-violet-600" />
              <span className="text-xs text-slate-600"><span className="font-semibold text-slate-800">Head of Department</span> - can upload class timetables for every section of every year in this department.</span>
            </label>
          </>
        ) : (
          <>
            <input value={editForm.enrollmentNumber} onChange={e => setEditForm({ ...editForm, enrollmentNumber: e.target.value })} placeholder="USN" className="collego-input" />
            <select value={editForm.semester} onChange={e => setEditForm({ ...editForm, semester: e.target.value })} className="collego-input">
              <option value="">Select semester</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
            <input value={editForm.section} onChange={e => setEditForm({ ...editForm, section: e.target.value })} placeholder="Section" className="collego-input" />
          </>
        )}
      </div>
      <div className="flex gap-3 mt-5">
        <Button onClick={submitEdit} variant="gradient" size="sm" disabled={busy}>{busy ? 'Saving...' : 'Save Changes'}</Button>
        <Button onClick={() => setEditing(null)} variant="outline" size="sm">Cancel</Button>
      </div>
    </div>
  )

  const renderFaculty = () => (
    <>
      <PageTitle icon={Users} title={`${selectedDept.departmentName} Faculty`} subtitle="Add, edit or remove faculty and review career-profile resumes."
        image={uiImages.classroom} imageAlt="Classroom lecture"
        actions={<>
          <label className="flex items-center gap-2 bg-white border border-white/60 text-slate-500 text-xs font-semibold px-3 py-2 rounded-xl cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
            <Upload size={14} /> Import CSV
            <input type="file" accept=".csv" onChange={e => e.target.files?.[0] && onCsvImport?.(e.target.files[0])} className="hidden" />
          </label>
          <Button variant="gradient" size="sm" onClick={() => setShowCreate(v => !v)}><Plus size={14} /> {showCreate ? 'Cancel' : 'Add Faculty'}</Button>
        </>} />
      {showCreate && renderCreateForm()}
      {editing && renderEditForm()}
      <div className="glass-card overflow-hidden border border-white/60">
        <div className="overflow-x-auto">
          <table className="collego-table">
            <thead><tr><th>Faculty</th><th>Employee ID</th><th>Designation</th><th style={{ textAlign: 'center' }}>Resume</th><th style={{ textAlign: 'center' }}>Actions</th></tr></thead>
            <tbody>
              {departmentFaculty.map(u => (
                <tr key={u.id} className="hover:bg-white/30 transition-colors">
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-[11px] font-bold text-white shrink-0">{u.firstName?.[0]}{u.lastName?.[0]}</div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-slate-800">{u.firstName} {u.lastName}</p>
                          {u.isHod && <Badge variant="purple" className="text-[9px] px-1.5 py-0">HoD</Badge>}
                        </div>
                        <p className="text-[11px] text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-slate-500 text-xs font-mono">{u.employeeId || '-'}</td>
                  <td className="text-slate-500 text-xs">{u.designation || 'Faculty'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div className="flex flex-col items-center gap-1.5">
                      <Badge variant={u.resumeStatus === 'APPROVED' ? 'success' : u.resumeStatus === 'PENDING' ? 'warning' : u.resumeStatus === 'REJECTED' ? 'destructive' : 'secondary'} className="text-[9px] px-2 py-0.5">
                        {u.resumeStatus ? u.resumeStatus.charAt(0) + u.resumeStatus.slice(1).toLowerCase() : 'None'}
                      </Badge>
                      <div className="flex items-center justify-center gap-2">
                        {u.hasResume && (
                          <button onClick={() => downloadFile(`/api/faculty-directory/${u.facultyProfileId}/resume`, u.resumeFileName || 'faculty-resume.pdf').catch(() => {})}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 hover:underline" title={u.resumeFileName || 'Download resume'}>
                            <Download size={12} /> View
                          </button>
                        )}
                      </div>
                      {u.resumeStatus === 'PENDING' && (
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => onReviewResume?.(u.facultyProfileId, true)}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 px-2 py-1 rounded-lg hover:bg-emerald-50 transition-colors">
                            <CheckCircle2 size={11} /> Approve
                          </button>
                          <button onClick={() => onReviewResume?.(u.facultyProfileId, false, null)}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-500 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">
                            <XCircle size={11} /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => startEdit(u)} className="p-2.5 rounded-xl hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors" title="Edit"><Edit size={14} /></button>
                      <button onClick={() => onToggleActive(u)} className="p-2.5 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors" title="Remove faculty"><Power size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {departmentFaculty.length === 0 && <tr><td colSpan={5} className="text-center text-slate-400 py-14">No faculty in this department yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )

  const renderStudents = () => (
    <>
      <PageTitle icon={GraduationCap} title={`${selectedDept.departmentName} Students`} subtitle="Choose a year and manage the students enrolled in it."
        image={uiImages.studentServices} imageAlt="Student services desk"
        actions={<>
          <label className="flex items-center gap-2 bg-white border border-white/60 text-slate-500 text-xs font-semibold px-3 py-2 rounded-xl cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
            <Upload size={14} /> Import CSV
            <input type="file" accept=".csv" onChange={e => e.target.files?.[0] && onCsvImport?.(e.target.files[0])} className="hidden" />
          </label>
          <Button variant="gradient" size="sm" onClick={() => setShowCreate(v => !v)}><Plus size={14} /> {showCreate ? 'Cancel' : 'Add Student'}</Button>
        </>} />
      <div className="flex flex-wrap gap-2">
        {YEAR_OPTIONS.map(y => (
          <button key={y.value} onClick={() => { setYear(y.value); setShowCreate(false); setEditing(null) }}
            className={cn('px-4 py-2 rounded-xl text-xs font-semibold border transition-all', Number(year) === y.value ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-500/20' : 'bg-white text-slate-500 border-white/60 hover:border-emerald-300 hover:bg-emerald-50 hover:text-slate-800')}>
            {y.label}
          </button>
        ))}
        <span className="ml-auto self-center text-[10px] text-slate-400 font-medium">{departmentStudents.length} students</span>
      </div>
      {showCreate && renderCreateForm()}
      {editing && renderEditForm()}
      <div className="glass-card overflow-hidden border border-white/60">
        <div className="overflow-x-auto">
          <table className="collego-table">
            <thead><tr><th>Student</th><th>USN</th><th style={{ textAlign: 'center' }}>Semester</th><th style={{ textAlign: 'center' }}>Section</th><th style={{ textAlign: 'center' }}>Actions</th></tr></thead>
            <tbody>
              {departmentStudents.map(u => (
                <tr key={u.id} className="hover:bg-white/30 transition-colors">
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-[11px] font-bold text-white shrink-0">{u.firstName?.[0]}{u.lastName?.[0]}</div>
                      <div><p className="font-medium text-slate-800">{u.firstName} {u.lastName}</p><p className="text-[11px] text-slate-400">{u.email}</p></div>
                    </div>
                  </td>
                  <td className="text-slate-500 text-xs font-mono">{u.enrollmentNumber || '-'}</td>
                  <td style={{ textAlign: 'center' }} className="text-slate-500">{u.semester || '-'}</td>
                  <td style={{ textAlign: 'center' }}><Badge variant="info">{u.section || '-'}</Badge></td>
                  <td style={{ textAlign: 'center' }}>
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => startEdit(u)} className="p-2.5 rounded-xl hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors" title="Edit"><Edit size={14} /></button>
                      <button onClick={() => onToggleActive(u)} className="p-2.5 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors" title="Remove student"><Power size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {departmentStudents.length === 0 && <tr><td colSpan={5} className="text-center text-slate-400 py-14">No students in this year yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )

  return (
    <div className="space-y-6">
      {selectedDept && (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <button onClick={goBack} className="inline-flex items-center gap-1 hover:text-indigo-600 transition-colors"><ArrowLeft size={13} /> Back</button>
          <span>/</span>
          <button onClick={() => { setMode(null); setShowCreate(false); setEditing(null) }} className="hover:text-indigo-600 transition-colors">Academics</button>
          <span>/</span>
          <span className="text-slate-600 font-medium">{selectedDept.departmentName}</span>
          {mode && <><span>/</span><span className="text-slate-600 font-medium capitalize">{mode}</span></>}
        </div>
      )}
      {!selectedDept ? renderDepartmentHome() : !mode ? renderChoice() : mode === 'faculty' ? renderFaculty() : renderStudents()}
    </div>
  )
}

const AUDIENCE_OPTIONS = [
  { value: 'ALL_STUDENTS', label: 'All students' },
  { value: 'YEAR_STUDENTS', label: 'Students of a specific year' },
  { value: 'DEPARTMENT_STUDENTS', label: 'Students of a department' },
  { value: 'ALL_FACULTY', label: 'All faculty' },
  { value: 'DEPARTMENT_FACULTY', label: 'Faculty of a department' },
  { value: 'STUDENT', label: 'A particular student' },
  { value: 'FACULTY', label: 'A particular faculty member' },
]

function BroadcastCenterTab({ broadcasts = [], users = [], departments = [], onSend }) {
  const [audience, setAudience] = useState('ALL_STUDENTS')
  const [targetYear, setTargetYear] = useState('1')
  const [departmentId, setDepartmentId] = useState('')
  const [userId, setUserId] = useState('')
  const [type, setType] = useState('GENERAL')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)

  const needsYear = audience === 'YEAR_STUDENTS'
  const needsDepartment = audience === 'DEPARTMENT_STUDENTS' || audience === 'DEPARTMENT_FACULTY'
  const isSingle = audience === 'STUDENT' || audience === 'FACULTY'
  const recipientRole = audience === 'FACULTY' ? 'FACULTY' : 'STUDENT'
  const people = (users || []).filter(u => u.role === recipientRole && u.active)

  const submit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !message.trim()) return
    if (needsDepartment && !departmentId) return
    if (isSingle && !userId) return
    setBusy(true)
    const ok = await onSend({
      title: title.trim(),
      message: message.trim(),
      type,
      audience,
      targetYear: needsYear ? Number(targetYear) : null,
      departmentId: needsDepartment ? Number(departmentId) : null,
      userId: isSingle ? Number(userId) : null,
    }, file)
    setBusy(false)
    if (ok) {
      setTitle('')
      setMessage('')
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6">
      <PageTitle
        icon={Send}
        title="Broadcast Center"
        subtitle="Send a direct notification to students or faculty - a whole group, a year, a department or one person."
        accent="emerald"
        image={uiImages.placementTalk}
        imageAlt="Campus announcement"
      />
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3">
          <Panel title="Compose message" icon={Send} accent="emerald">
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Send to</label>
                  <select value={audience} onChange={e => { setAudience(e.target.value); setDepartmentId(''); setUserId('') }} className="collego-input">
                    {AUDIENCE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Category</label>
                  <select value={type} onChange={e => setType(e.target.value)} className="collego-input">
                    <option value="GENERAL">General</option>
                    <option value="ACADEMIC">Academic</option>
                    <option value="PLACEMENT">Placement</option>
                    <option value="FEE">Fee</option>
                  </select>
                </div>
              </div>

              {needsYear && (
                <div>
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Year</label>
                  <select value={targetYear} onChange={e => setTargetYear(e.target.value)} className="collego-input">
                    {YEAR_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
              )}

              {needsDepartment && (
                <div>
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Department</label>
                  <select value={departmentId} onChange={e => setDepartmentId(e.target.value)} className="collego-input">
                    <option value="">Select department</option>
                    {(departments || []).map(d => (
                      <option key={d.departmentId || d.id} value={d.departmentId || d.id}>{d.departmentName || d.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {isSingle && (
                <div>
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">{recipientRole === 'FACULTY' ? 'Faculty member' : 'Student'}</label>
                  <select value={userId} onChange={e => setUserId(e.target.value)} className="collego-input">
                    <option value="">Select {recipientRole === 'FACULTY' ? 'faculty' : 'student'}</option>
                    {people.map(person => (
                      <option key={person.id} value={person.id}>
                        {person.firstName} {person.lastName}
                        {person.enrollmentNumber ? ` - ${person.enrollmentNumber}` : person.employeeId ? ` - ${person.employeeId}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Title</label>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Semester fee deadline extended" className="collego-input" required />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Message</label>
                <textarea value={message} onChange={e => setMessage(e.target.value)} rows={5} placeholder="Write the message recipients will see in their portal..." className="collego-input resize-none" required />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Attachment (optional)</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
                  className="hidden"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                />
                {file ? (
                  <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2.5">
                    <Paperclip size={14} className="text-emerald-600 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-700 truncate">{file.name}</p>
                      <p className="text-[10px] text-slate-400">{Math.max(1, Math.round(file.size / 1024))} KB</p>
                    </div>
                    <button type="button" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = '' }} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-white transition-colors" title="Remove attachment"><X size={14} /></button>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-white/60 px-3 py-3 text-xs font-medium text-slate-500 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50/50 transition-all">
                    <Paperclip size={14} /> Attach a file (PDF, image, Office document - max 20 MB)
                  </button>
                )}
                <p className="text-[10px] text-slate-400 mt-1.5">Students and faculty can view or download this file from the notification.</p>
              </div>

              <div className="flex justify-end">
                <Button type="submit" variant="gradient" size="sm" disabled={busy || !title.trim() || !message.trim()}>
                  {busy ? <><RefreshCw size={13} className="animate-spin" /> Sending...</> : <><Send size={13} /> Send notification</>}
                </Button>
              </div>
            </form>
          </Panel>
        </div>

        <div className="xl:col-span-2">
          <Panel title="Sent messages" icon={Megaphone} accent="indigo">
            <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
              {(broadcasts || []).map(b => {
                const cfg = NOTICE_TYPES[b.type] || NOTICE_TYPES.GENERAL
                return (
                  <div key={b.id} className="p-4 rounded-2xl border border-white/60 bg-white/70">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <Badge variant={cfg.variant} className="text-[9px] px-2 py-0.5">{cfg.label}</Badge>
                      <span className="text-[10px] text-slate-400">{timeAgo(b.createdAt)}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800">{b.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{b.message}</p>
                    <p className="text-[10px] text-slate-400 mt-2">
                      To {b.audienceLabel} - {b.recipientCount} recipient{b.recipientCount === 1 ? '' : 's'}
                    </p>
                    {b.hasAttachment && (
                      <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2">
                        <Paperclip size={12} className="text-emerald-600 shrink-0" />
                        <span className="text-[11px] font-medium text-slate-600 truncate max-w-[200px]">{b.attachmentFileName || 'Attachment'}</span>
                        <button onClick={() => previewFile(`/api/admin/broadcasts/${b.id}/attachment`, b.attachmentFileName || 'attachment').catch(() => {})}
                          className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline"><Eye size={11} /> View</button>
                        <button onClick={() => downloadFile(`/api/admin/broadcasts/${b.id}/attachment?download=true`, b.attachmentFileName || 'attachment').catch(() => {})}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline"><Download size={11} /> Download</button>
                      </div>
                    )}
                  </div>
                )
              })}
              {(!broadcasts || broadcasts.length === 0) && (
                <EmptyState icon={Megaphone} title="Nothing sent yet" accent="indigo" description="Messages you send will be listed here with their audience." />
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}

function PlacementsTab({ placementStats, notices = [], departments = [], users = [], showMsg, onCreatePlacement, onDeactivatePlacement, onCreatePlacedStudents }) {
  const s = placementStats
  const deptData = s?.departmentBreakdown || []
  const [showCreate, setShowCreate] = useState(false)
  const [busy, setBusy] = useState(false)
  const [file, setFile] = useState(null)
  const [placedBusy, setPlacedBusy] = useState(false)
  const [placedStudents, setPlacedStudents] = useState([])
  const [placedForm, setPlacedForm] = useState({ studentIds: [], companyName: '', salary: '', role: '', departmentId: '' })
  const [form, setForm] = useState({
    title: '', companyName: '', driveDate: '', lastDate: '', packageOffered: '',
    description: '', eligibilityCriteria: '', departmentId: '',
  })

  const today = new Date().toISOString().split('T')[0]
  const upcoming = (notices || []).filter(n => n.active && (!n.driveDate || n.driveDate >= today))
  const studentOptions = (users || []).filter(u => u.role === 'STUDENT' && u.active)

  useEffect(() => {
    api.get('/api/placement/placed-students')
      .then(res => setPlacedStudents(Array.isArray(res.data) ? res.data : []))
      .catch(() => setPlacedStudents([]))
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    const ok = await onCreatePlacement({ ...form, file })
    setBusy(false)
    if (ok) {
      setForm({ title: '', companyName: '', driveDate: '', lastDate: '', packageOffered: '', description: '', eligibilityCriteria: '', departmentId: '' })
      setFile(null)
      setShowCreate(false)
    }
  }

  const submitPlaced = async () => {
    if (!placedForm.studentIds.length || !placedForm.companyName.trim()) return
    setPlacedBusy(true)
    const ok = await onCreatePlacedStudents(placedForm)
    setPlacedBusy(false)
    if (ok) {
      setPlacedForm({ studentIds: [], companyName: '', salary: '', role: '', departmentId: '' })
      api.get('/api/placement/placed-students')
        .then(res => setPlacedStudents(Array.isArray(res.data) ? res.data : []))
        .catch(() => {})
    }
  }

  return (
    <div className="space-y-6">
      <PageTitle icon={Briefcase} title="Placement Management" subtitle="Create upcoming drives, share attachments and monitor placements."
        image={uiImages.placementsFair} imageAlt="Campus placement fair"
        actions={<Button variant="gradient" size="sm" onClick={() => setShowCreate(v => !v)}><Plus size={14} /> {showCreate ? 'Cancel' : 'Add Upcoming Placement'}</Button>} />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard index={0} label="Students Placed" value={s?.studentsPlaced ?? 0} icon={Trophy} accent="emerald" glow />
        <StatCard index={1} label="Offers Extended" value={s?.totalOffersExtended ?? 0} icon={Award} accent="amber" glow />
        <StatCard index={2} label="Upcoming Drives" value={upcoming.length} icon={CalendarDays} accent="blue" glow />
        <StatCard index={3} label="Placement Rate" value={s?.placementRate ?? 0} decimals={1} suffix="%" icon={TrendingUp} accent="violet" glow />
      </div>

      {showCreate && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 border border-white/60">
          <h3 className="text-sm font-semibold text-slate-800 mb-5 flex items-center gap-2"><Plus size={15} className="text-emerald-500" /> Add Upcoming Placement</h3>
          <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Drive Title</label><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g., Software Engineer Drive" className="collego-input" required /></div>
            <div><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Company</label><input value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })} placeholder="Company name" className="collego-input" required /></div>
            <div><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Salary Range</label><input value={form.packageOffered} onChange={e => setForm({ ...form, packageOffered: e.target.value })} placeholder="e.g., 8-12 LPA" className="collego-input" /></div>
            <div><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Drive Date</label><input type="date" value={form.driveDate} onChange={e => setForm({ ...form, driveDate: e.target.value })} className="collego-input" required /></div>
            <div><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Last Date to Apply</label><input type="date" value={form.lastDate} onChange={e => setForm({ ...form, lastDate: e.target.value })} className="collego-input" /></div>
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Department</label>
              <select value={form.departmentId} onChange={e => setForm({ ...form, departmentId: e.target.value })} className="collego-input">
                <option value="">All Departments</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-3"><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Description</label><textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Role, location, rounds and other drive details..." className="collego-input resize-none" /></div>
            <div className="sm:col-span-2"><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Eligibility Criteria</label><input value={form.eligibilityCriteria} onChange={e => setForm({ ...form, eligibilityCriteria: e.target.value })} placeholder="e.g., CGPA >= 7.0, no active backlogs" className="collego-input" /></div>
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Attachment (optional)</label>
              <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={e => setFile(e.target.files?.[0] || null)}
                className="collego-input file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-emerald-600" />
              {file && <p className="text-[10px] text-slate-400 mt-1 truncate">{file.name}</p>}
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex gap-3">
              <Button type="submit" variant="gradient" size="sm" disabled={busy}>{busy ? <><RefreshCw size={13} className="animate-spin" /> Creating...</> : <><Plus size={13} /> Create Placement Drive</>}</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </form>
        </motion.div>
      )}

      <Panel title="Upcoming Placement Drives" icon={CalendarDays} accent="emerald">
        {upcoming.length === 0 ? (
          <EmptyState icon={Briefcase} title="No upcoming placements" accent="emerald" description="Use “Add Upcoming Placement” to announce a new drive." />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {upcoming.map(n => (
              <div key={n.id} className="rounded-2xl border border-white/60 bg-white/70 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{n.title}</p>
                    <p className="text-[11px] text-emerald-600 font-medium mt-0.5">{n.companyName}</p>
                  </div>
                  <Badge variant="success">{n.driveDate ? fmtDate(n.driveDate) : 'Upcoming'}</Badge>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {n.packageOffered && <Badge variant="success">₹ {n.packageOffered}</Badge>}
                  {n.departmentName && <Badge variant="info">{n.departmentName}</Badge>}
                  {n.lastDate && <Badge variant="secondary">Apply by {fmtDate(n.lastDate)}</Badge>}
                </div>
                {n.description && <p className="text-xs text-slate-500 mt-3 line-clamp-3">{n.description}</p>}
                <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-white/60">
                  <div>
                    {n.hasAttachment ? (
                      <button onClick={() => downloadFile(`/api/placement/notices/${n.id}/attachment`, n.attachmentName || 'placement-drive.pdf').catch(() => {})}
                        className="text-[11px] text-indigo-600 hover:underline inline-flex items-center gap-1"><Download size={12} /> {n.attachmentName || 'Attachment'}</button>
                    ) : <span className="text-[10px] text-slate-400">No attachment</span>}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => onDeactivatePlacement(n.id)}><X size={12} /> Remove</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title="Department Placements" icon={Layers} accent="indigo">
          {deptData.length === 0 ? <EmptyState icon={Briefcase} title="No placement data" accent="indigo" /> : (
            <div className="overflow-x-auto">
              <table className="collego-table">
                <thead><tr><th>Department</th><th style={{ textAlign: 'center' }}>Students</th><th style={{ textAlign: 'center' }}>Applied</th><th style={{ textAlign: 'center' }}>Placed</th><th style={{ textAlign: 'center' }}>Rate</th></tr></thead>
                <tbody>
                  {deptData.map(d => (
                    <tr key={d.departmentCode} className="hover:bg-white/30 transition-colors">
                      <td className="font-medium text-slate-800">{d.departmentName}</td>
                      <td style={{ textAlign: 'center' }}>{d.totalStudents}</td>
                      <td style={{ textAlign: 'center' }}>{d.studentsApplied}</td>
                      <td style={{ textAlign: 'center' }} className="font-semibold text-emerald-600">{d.studentsPlaced}</td>
                      <td style={{ textAlign: 'center' }}><Badge variant="info">{fmtNum(d.placementRate, 1)}%</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
        <PlacedStudentsPanel users={users} departments={departments} showMsg={showMsg} />
      </div>
    </div>
  )
}

function ReportsTab({ deptReports, subjectReports, departments = [] }) {
  const [view, setView] = useState('department')
  const [exportDepartmentId, setExportDepartmentId] = useState('')
  const [exportYear, setExportYear] = useState('')
  const [exportingStudents, setExportingStudents] = useState(false)

  const handleExportStudents = async () => {
    setExportingStudents(true)
    try {
      const params = new URLSearchParams()
      if (exportDepartmentId) params.append('departmentId', exportDepartmentId)
      if (exportYear) params.append('year', exportYear)
      const query = params.toString()
      await downloadFile(`/api/admin/export/students${query ? `?${query}` : ''}`, 'students.csv')
    } catch {
      /* downloadFile surfaces failures through the shared helper */
    } finally {
      setExportingStudents(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageTitle
        icon={BarChart3}
        title="Reports & Analytics"
        subtitle="Department performance, pass percentages and subject-level outcomes."
        image={uiImages.graduation} imageAlt="Graduation celebration"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => downloadFile('/api/admin/export/students', 'students.csv').catch(() => {})}>
              <span className="flex gap-1"><Download size={12} /> All Students</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => downloadFile('/api/admin/export/faculty', 'faculty.csv').catch(() => {})}>
              <span className="flex gap-1"><Download size={12} /> Faculty</span>
            </Button>
            <div className="flex bg-white border border-white/60 rounded-2xl p-1 backdrop-blur-sm">
              {[['department', 'Departments'], ['subject', 'Subjects']].map(([id, label]) => (
                <button key={id} onClick={() => setView(id)}
                  className={cn('px-4 py-2 rounded-xl text-xs font-medium transition-all', view === id ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50')}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        }
      />

      <div className="glass-card border border-white/60 p-5">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Users size={15} className="text-indigo-600" /> Student details by department & year
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Download enrollment number, name, email, phone, department, semester, year, section and CR status.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
            <select
              value={exportDepartmentId}
              onChange={e => setExportDepartmentId(e.target.value)}
              className="collego-input !w-auto min-w-[180px]"
              aria-label="Filter student export by department"
            >
              <option value="">All Departments</option>
              {(departments || []).map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
              ))}
            </select>
            <select
              value={exportYear}
              onChange={e => setExportYear(e.target.value)}
              className="collego-input !w-auto min-w-[130px]"
              aria-label="Filter student export by year"
            >
              <option value="">All Years</option>
              <option value="1">I Year</option>
              <option value="2">II Year</option>
              <option value="3">III Year</option>
              <option value="4">Final Year</option>
            </select>
            <Button variant="gradient" size="sm" onClick={handleExportStudents} disabled={exportingStudents}>
              {exportingStudents
                ? <><RefreshCw size={12} className="animate-spin" /> Preparing...</>
                : <><Download size={12} /> Download Students</>}
            </Button>
          </div>
        </div>
      </div>

      <div className="glass-card overflow-hidden border border-white/60">
        <div className="overflow-x-auto">
          {view === 'department' ? (
            <table className="collego-table">
              <thead><tr><th>Department</th><th style={{ textAlign: 'center' }}>Students</th><th style={{ textAlign: 'center' }}>Faculty</th><th style={{ textAlign: 'center' }}>Courses</th><th style={{ textAlign: 'center' }}>Attendance</th><th style={{ textAlign: 'center' }}>Pass %</th></tr></thead>
              <tbody>
                {(deptReports || []).map(d => (
                  <tr key={d.departmentId} className="hover:bg-white/30 transition-colors">
                    <td className="font-medium text-slate-800">{d.departmentName} <span className="text-slate-400">({d.departmentCode})</span></td>
                    <td style={{ textAlign: 'center' }}>{d.totalStudents}</td>
                    <td style={{ textAlign: 'center' }}>{d.totalFaculty}</td>
                    <td style={{ textAlign: 'center' }}>{d.totalCourses}</td>
                    <td style={{ textAlign: 'center' }}><Badge variant={d.averageAttendance >= 75 ? 'success' : 'warning'}>{fmtNum(d.averageAttendance, 1)}%</Badge></td>
                    <td style={{ textAlign: 'center' }}><Badge variant={d.averagePassPercentage >= 60 ? 'success' : 'warning'}>{fmtNum(d.averagePassPercentage, 1)}%</Badge></td>
                  </tr>
                ))}
                {(!deptReports || deptReports.length === 0) && <tr><td colSpan={6} className="text-center text-slate-400 py-14">No department reports.</td></tr>}
              </tbody>
            </table>
          ) : (
            <table className="collego-table">
              <thead><tr><th>Course</th><th>Section</th><th>Faculty</th><th style={{ textAlign: 'center' }}>Enrolled</th><th style={{ textAlign: 'center' }}>Avg Marks</th><th style={{ textAlign: 'center' }}>Attendance</th><th style={{ textAlign: 'center' }}>Pass %</th></tr></thead>
              <tbody>
                {(subjectReports || []).map(sr => (
                  <tr key={sr.sectionId} className="hover:bg-white/30 transition-colors">
                    <td className="font-medium text-slate-800">{sr.courseName} <span className="text-slate-400 font-mono text-xs">{sr.courseCode}</span></td>
                    <td>{sr.sectionName}</td>
                    <td className="text-slate-500">{sr.facultyName || '-'}</td>
                    <td style={{ textAlign: 'center' }}>{sr.totalEnrolled}</td>
                    <td style={{ textAlign: 'center' }}>{sr.averageMarks != null ? fmtNum(sr.averageMarks, 1) : '-'}</td>
                    <td style={{ textAlign: 'center' }}><Badge variant={sr.averageAttendance >= 75 ? 'success' : 'warning'}>{fmtNum(sr.averageAttendance, 1)}%</Badge></td>
                    <td style={{ textAlign: 'center' }}><Badge variant={sr.passPercentage >= 60 ? 'success' : 'destructive'}>{fmtNum(sr.passPercentage, 1)}%</Badge></td>
                  </tr>
                ))}
                {(!subjectReports || subjectReports.length === 0) && <tr><td colSpan={7} className="text-center text-slate-400 py-14">No subject reports.</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// --- Notices & Events --------------------------------------------------------
function NoticesTab({ broadcasts = [], insights }) {
  const notices = broadcasts
  const events = insights?.upcomingEvents || []
  return (
    <div className="space-y-6">
      <PageTitle icon={Megaphone} title="Notices & Events" subtitle="Messages you sent from the Broadcast Center, plus the campus activity calendar." image={uiImages.placementTalk} imageAlt="Placement talk" />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title="Your broadcasts" icon={Megaphone} accent="amber">
          <div className="space-y-3">
            {notices.map(n => {
              const cfg = NOTICE_TYPES[n.type] || NOTICE_TYPES.GENERAL
              return (
                <div key={n.id} className="p-4 rounded-2xl border border-white/60 bg-white/70 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <Badge variant={cfg.variant} className="text-[9px] px-2 py-0.5">{cfg.label}</Badge>
                    <span className="text-[10px] text-slate-400">{timeAgo(n.createdAt)}</span>
                    <span className="text-[10px] text-slate-400 ml-auto">
                      To {n.audienceLabel} - {n.recipientCount} recipient{n.recipientCount === 1 ? '' : 's'}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800">{n.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                </div>
              )
            })}
            {notices.length === 0 && <EmptyState icon={Megaphone} title="No notices sent yet" accent="amber" description="Use the Broadcast Center to message students or faculty." />}
          </div>
        </Panel>
        <Panel title="Upcoming Events" icon={CalendarDays} accent="indigo">
          <div className="space-y-3">
            {events.map(ev => {
              const color = EVENT_COLORS[ev.category] || '#6366f1'
              const date = ev.date ? new Date(ev.date) : null
              return (
                <div key={ev.id} className="flex items-center gap-3.5 p-3.5 rounded-xl border border-white/60 bg-white/70 backdrop-blur-sm hover:bg-white transition-colors">
                  <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl shrink-0" style={{ background: `${color}14`, border: `1px solid ${color}30` }}>
                    <span className="text-[9px] font-bold uppercase" style={{ color }}>{date ? date.toLocaleDateString('en-IN', { month: 'short' }) : '-'}</span>
                    <span className="text-base font-extrabold text-slate-800 leading-none">{date ? date.getDate() : '-'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{ev.title}</p>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1"><MapPin size={10} /> {ev.subtitle || ev.location}</p>
                  </div>
                </div>
              )
            })}
            {events.length === 0 && <EmptyState icon={CalendarDays} title="No upcoming events" accent="indigo" />}
          </div>
        </Panel>
      </div>
    </div>
  )
}

const COMING_SOON = {
  hostel: { title: 'Hostel & Facilities', icon: Home, accent: 'violet', copy: 'Hostel allocation, room availability, facility bookings and complaint tracking.' },
  library: { title: 'Library', icon: Landmark, accent: 'blue', copy: 'Book catalogue, issue and return workflow, fines and resource reservations.' },
  aiAssistant: { title: 'AI Assistant', icon: Sparkles, accent: 'violet', copy: 'AI-powered insights, risk detection, smart search and automated decision support are available across portals.' },
  settings: { title: 'System Settings', icon: Settings, accent: 'indigo', copy: 'Configure roles, permissions, academic sessions, notifications and system preferences.' },
  help: { title: 'Help & Support', icon: HelpCircle, accent: 'emerald', copy: 'Documentation, FAQs and support contacts for administrators and staff.' },
}

function ComingSoonTab({ id }) {
  const cfg = COMING_SOON[id] || COMING_SOON.settings
  const a = ACCENTS[cfg.accent] || ACCENTS.indigo
  return (
    <div className="space-y-6">
      <PageTitle icon={cfg.icon} title={cfg.title} subtitle="Planned module" />
      <div className="glass-card p-12 flex flex-col items-center text-center border border-white/60">
        <div className={cn('w-24 h-24 rounded-3xl flex items-center justify-center mb-6', a.softBg, a.shadow)}>
          <cfg.icon size={36} className={a.text} />
        </div>
        <h3 className="text-lg font-bold text-slate-900">{cfg.title}</h3>
        <p className="text-sm text-slate-500 max-w-md mt-3 leading-relaxed">{cfg.copy}</p>
        <Badge variant="info" className="mt-6">Backend-ready - UI rolling out</Badge>
      </div>
    </div>
  )
}

// --- Main --------------------------------------------------------------------
export default function AdminDashboard() {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [toast, setToast] = useState({ text: '', type: 'success' })
  const [loading, setLoading] = useState(false)
  const [query] = useState('')

  const [overview, setOverview] = useState(null)
  const [users, setUsers] = useState([])
  const [departments, setDepartments] = useState([])
  const [deptReports, setDeptReports] = useState([])
  const [subjectReports, setSubjectReports] = useState([])
  const [attendanceSummary, setAttendanceSummary] = useState([])
  const [placementStats, setPlacementStats] = useState(null)
  const [placementNotices, setPlacementNotices] = useState([])
  const [insights, setInsights] = useState(null)
  const [semesters, setSemesters] = useState([])
  const [importResult, setImportResult] = useState(null)
  const [broadcasts, setBroadcasts] = useState([])

  const sidebarWidth = collapsed ? 76 : 248
  const showMsg = useCallback((text, type = 'success') => setToast({ text, type }), [])

  const loadUsers = useCallback(async () => {
    try {
      const res = await api.get('/api/admin/users')
      setUsers(Array.isArray(res.data) ? res.data : res.data?.content || [])
    } catch { /* ignore */ }
  }, [])

  const loadAll = useCallback(async () => {
    const [ovRes, usRes, dpRes, drRes, srRes, asRes, psRes, pnRes, inRes, semRes, bcRes] = await Promise.allSettled([
      api.get('/api/admin/overview'),
      api.get('/api/admin/users'),
      api.get('/api/departments'),
      api.get('/api/admin/reports/departments'),
      api.get('/api/admin/reports/subjects'),
      api.get('/api/admin/reports/attendance'),
      api.get('/api/placement/stats'),
      api.get('/api/placement/notices'),
      api.get('/api/admin/dashboard/insights'),
      api.get('/api/semesters'),
      api.get('/api/admin/broadcasts'),
    ])
    if (ovRes.status === 'fulfilled') setOverview(ovRes.value.data)
    if (usRes.status === 'fulfilled') setUsers(Array.isArray(usRes.value.data) ? usRes.value.data : usRes.value.data?.content || [])
    if (dpRes.status === 'fulfilled') setDepartments(Array.isArray(dpRes.value.data) ? dpRes.value.data : [])
    if (drRes.status === 'fulfilled') setDeptReports(Array.isArray(drRes.value.data) ? drRes.value.data : [])
    if (srRes.status === 'fulfilled') setSubjectReports(Array.isArray(srRes.value.data) ? srRes.value.data : [])
    if (asRes.status === 'fulfilled') setAttendanceSummary(Array.isArray(asRes.value.data) ? asRes.value.data : [])
    if (psRes.status === 'fulfilled') setPlacementStats(psRes.value.data)
    if (pnRes.status === 'fulfilled') setPlacementNotices(Array.isArray(pnRes.value.data) ? pnRes.value.data : [])
    if (inRes.status === 'fulfilled') setInsights(inRes.value.data)
    if (semRes.status === 'fulfilled') setSemesters(Array.isArray(semRes.value.data) ? semRes.value.data : [])
    if (bcRes.status === 'fulfilled') setBroadcasts(Array.isArray(bcRes.value.data) ? bcRes.value.data : [])
  }, [])

  const handleSemesterChange = async (semId) => {
    setLoading(true)
    try {
      const res = await api.get(`/api/admin/reports/attendance${semId ? '?semesterId=' + semId : ''}`)
      setAttendanceSummary(Array.isArray(res.data) ? res.data : [])
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  const onCreateUser = async (payload) => {
    try {
      await api.post('/api/admin/users', payload)
      showMsg(`User created - login details sent to ${payload.email}`)
      loadUsers()
      loadAll()
      return true
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to create user', 'error')
      return false
    }
  }

  const onCreateDepartment = async (payload) => {
    try {
      await api.post('/api/admin/departments', payload)
      showMsg(`Department '${payload.name}' added with empty Students and Faculty sections`)
      loadUsers()
      loadAll()
      return true
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to add department', 'error')
      return false
    }
  }

  const onEditUser = async (id, payload) => {
    try {
      await api.put(`/api/admin/users/${id}`, payload)
      showMsg('User updated successfully')
      loadUsers()
      loadAll()
      return true
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to update user', 'error')
      return false
    }
  }

  const onToggleActive = async (user) => {
    if (user.active && !await confirmAction({
      title: 'Deactivate this account?',
      message: `${user.firstName} ${user.lastName} will no longer be able to sign in. Their records remain stored.`,
      confirmLabel: 'Deactivate',
    })) return
    const url = `/api/admin/users/${user.id}/${user.active ? 'deactivate' : 'activate'}`
    try {
      await api.put(url)
      showMsg(`${user.active ? 'Deactivated' : 'Activated'} successfully`)
      loadUsers()
      loadAll()
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to toggle user status', 'error')
    }
  }

  const handleSendBroadcast = async (payload, file) => {
    try {
      if (file) {
        const fd = new FormData()
        fd.append('data', new Blob([JSON.stringify(payload)], { type: 'application/json' }))
        fd.append('file', file)
        await api.post('/api/admin/broadcasts/with-file', fd)
      } else {
        await api.post('/api/admin/broadcasts', payload)
      }
      showMsg('Message sent successfully')
      const res = await api.get('/api/admin/broadcasts')
      setBroadcasts(Array.isArray(res.data) ? res.data : [])
      return true
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to send message', 'error')
      return false
    }
  }

  const onReviewResume = async (facultyProfileId, approve, note) => {
    try {
      await api.put(`/api/admin/faculty/${facultyProfileId}/resume/${approve ? 'approve' : 'reject'}`, approve ? undefined : { note })
      showMsg(approve ? 'Resume approved' : 'Resume rejected')
      await loadUsers()
      await loadAll()
      return true
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to review resume', 'error')
      return false
    }
  }

  const onCreatePlacement = async ({ file, ...payload }) => {
    const fd = new FormData()
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) fd.append(key, value)
    })
    if (file) fd.append('file', file)
    try {
      await api.post('/api/placement/notices', fd)
      showMsg('Upcoming placement created')
      await loadAll()
      return true
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to create placement', 'error')
      return false
    }
  }

  const onCreatePlacedStudents = async (payload) => {
    try {
      await api.post('/api/placement/placed-students', {
        studentIds: payload.studentIds,
        companyName: payload.companyName,
        salary: payload.salary || null,
        role: payload.role || null,
        departmentId: payload.departmentId ? Number(payload.departmentId) : null,
      })
      showMsg(`${payload.studentIds.length} student(s) recorded as placed at ${payload.companyName}`)
      await loadAll()
      return true
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to record placements', 'error')
      return false
    }
  }

  const onDeactivatePlacement = async (id) => {
    if (!await confirmAction({ title: 'Remove this placement drive?', message: 'The drive will be removed from upcoming listings.', confirmLabel: 'Remove' })) return
    try {
      await api.put(`/api/placement/notices/${id}/deactivate`)
      showMsg('Placement drive removed')
      await loadAll()
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to remove placement', 'error')
    }
  }

  const onCsvImport = async (file) => {
    if (!await confirmAction({
      title: 'Import users from CSV?',
      message: `This will create user accounts from '${file.name}'. This action cannot be undone automatically.`,
      confirmLabel: 'Import',
    })) return
    const fd = new FormData(); fd.append('file', file)
    setLoading(true)
    try {
      const res = await api.post('/api/admin/users/import', fd)
      setImportResult(res.data)
      loadUsers()
      loadAll()
    } catch (err) {
      showMsg(err.response?.data?.message || 'Import failed', 'error')
    } finally { setLoading(false) }
  }

  useEffect(() => { loadAll() }, [loadAll])

  const renderTab = () => {
    switch (activeTab) {
      case 'overview': return <OverviewTab overview={overview} deptReports={deptReports} attendanceSummary={attendanceSummary} placementStats={placementStats} insights={insights} semesters={semesters} onTabChange={setActiveTab} onSemesterChange={handleSemesterChange} />
      case 'academics': return <AcademicsTab users={users} departments={departments} overview={overview} semesters={semesters} deptReports={deptReports} onCreateUser={onCreateUser} onEditUser={onEditUser} onToggleActive={onToggleActive} onReviewResume={onReviewResume} onCsvImport={onCsvImport} importResult={importResult} onCreateDepartment={onCreateDepartment} />
      case 'examinations': return <ExamsAdminTab showMsg={showMsg} />
      case 'placements': return <PlacementsTab placementStats={placementStats} notices={placementNotices} departments={departments} users={users} showMsg={showMsg} onCreatePlacement={onCreatePlacement} onDeactivatePlacement={onDeactivatePlacement} onCreatePlacedStudents={onCreatePlacedStudents} />
      case 'broadcasts': return <BroadcastCenterTab broadcasts={broadcasts} users={users} departments={departments} onSend={handleSendBroadcast} />
      case 'reports': return <ReportsTab deptReports={deptReports} subjectReports={subjectReports} departments={departments} />
      case 'promotion': return <PromotionTab semesters={semesters} showMsg={showMsg} />
      case 'graduatedStudents': return <GraduatedStudentsTab endpoint="/api/admin/graduated-students" />
      case 'announcements': return <NoticesTab broadcasts={broadcasts} insights={insights} />
      case 'events': return <AdminEventsTab showMsg={showMsg} />
      case 'settings': return <SettingsTab showMsg={showMsg} accent="indigo" />
      case 'help': return <HelpTab accent="indigo" />
      default: return null
    }
  }

  return (
    <div className="min-h-screen portal-bg">
      <Toast message={toast} onClose={() => setToast({ text: '', type: 'success' })} />
      <PortalSidebar
        collapsed={collapsed} onToggle={() => setCollapsed(c => !c)}
        navSections={NAV_SECTIONS} activeTab={activeTab} onTabChange={setActiveTab}
        accent="indigo" portalLabel="Admin Portal"
      />
      <PortalTopbar
        sidebarWidth={sidebarWidth} accent="indigo"
        user={{ name: 'Admin', role: 'System Administrator', email: 'admin@collego.edu' }}
        notificationCount={0}
        notifications={(broadcasts || []).map(b => ({ id: b.id, title: b.title, message: b.message }))}
        onLogout={() => { authService.clearTokens(); navigate('/login') }}
      />
      <main className="main-content" style={{ marginLeft: sidebarWidth }}>
        <div className="p-5 md:p-7 max-w-[1700px] mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {renderTab()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
