import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, BookOpen, ClipboardCheck,
  Award, DollarSign, Building2, Library, Sparkles,
  BarChart3, Settings, HelpCircle, Plus, GraduationCap,
  Megaphone, FileText, CheckCircle2,
  Clock, MapPin, Activity, BookMarked, Briefcase, X,
  RefreshCw, Upload, Edit, Power, Filter, Trophy, Zap,
  TrendingUp, Percent, XCircle, Wallet, Home, Landmark,
  UsersRound, CalendarDays, ScrollText, Layers,
} from 'lucide-react'
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { authService } from '../services/authService'
import api from '../services/api'
import { cn } from '../lib/utils'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import {
  PortalSidebar, PortalTopbar, Toast, StatCard, Panel, PageTitle,
  WelcomeBanner, ChartTooltip, EmptyState, AnimatedNumber, ACCENTS,
} from '../components/dashboard/PortalUI'

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtNum = (n, dp = 1) => (n == null ? '—' : Number(n).toFixed(dp))
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

const PIE_COLORS = ['#4f46e5', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6']
const RANK_COLORS = ['#f59e0b', '#94a3b8', '#cd7f32', '#6366f1', '#6366f1']
const NOTICE_TYPES = {
  ACADEMIC: { variant: 'info', label: 'Academic' },
  FEE: { variant: 'warning', label: 'Fee' },
  PLACEMENT: { variant: 'purple', label: 'Placement' },
  EXAM: { variant: 'destructive', label: 'Exam' },
  GENERAL: { variant: 'secondary', label: 'General' },
}
const EVENT_COLORS = { Placement: '#10b981', Academic: '#6366f1', Exam: '#ef4444', Event: '#f59e0b' }

const NAV_SECTIONS = [
  { items: [{ id: 'overview', label: 'Dashboard', icon: LayoutDashboard }] },
  {
    title: 'Management',
    items: [
      { id: 'users', label: 'Students', icon: GraduationCap },
      { id: 'faculty', label: 'Faculty', icon: Users },
      { id: 'academics', label: 'Academics', icon: BookOpen },
      { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
      { id: 'examinations', label: 'Examinations', icon: BookMarked },
      { id: 'placements', label: 'Placements', icon: Briefcase },
    ],
  },
  {
    title: 'Finance & Admin',
    items: [
      { id: 'fees', label: 'Fees & Finance', icon: DollarSign },
      { id: 'hostel', label: 'Hostel & Facilities', icon: Building2 },
      { id: 'library', label: 'Library', icon: Library },
      { id: 'announcements', label: 'Notices & Events', icon: Megaphone },
    ],
  },
  { title: 'AI Assistant', items: [{ id: 'aiAssistant', label: 'AI Assistant', icon: Sparkles }] },
  {
    title: 'Administration',
    items: [
      { id: 'reports', label: 'Reports', icon: BarChart3 },
      { id: 'settings', label: 'Settings', icon: Settings },
      { id: 'help', label: 'Help & Support', icon: HelpCircle },
    ],
  },
]

// ─── Overview Tab ──────────────────────────────────────────────────────────────
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
    .map(d => ({ name: d.departmentCode || d.departmentName?.split(' ')[0] || '—', value: d.totalStudents || 0 }))
    .filter(d => d.value > 0)

  const topPerformers = insights?.topPerformers || []
  const recentNotices = insights?.recentNotices || []
  const upcomingEvents = insights?.upcomingEvents || []

  const quickActions = [
    { icon: GraduationCap, label: 'Add Student', tab: 'users', accent: 'blue', grad: 'from-blue-500 to-cyan-500' },
    { icon: Users, label: 'Add Faculty', tab: 'faculty', accent: 'violet', grad: 'from-violet-500 to-fuchsia-500' },
    { icon: Megaphone, label: 'Create Notice', tab: 'announcements', accent: 'amber', grad: 'from-amber-500 to-orange-500' },
    { icon: BarChart3, label: 'Generate Report', tab: 'reports', accent: 'indigo', grad: 'from-indigo-500 to-blue-500' },
    { icon: BookOpen, label: 'Manage Courses', tab: 'academics', accent: 'emerald', grad: 'from-emerald-500 to-teal-500' },
    { icon: ClipboardCheck, label: 'Take Attendance', tab: 'attendance', accent: 'emerald', grad: 'from-emerald-500 to-teal-500' },
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
          sub={`across ${overview?.totalDepartments ?? 0} departments`} onClick={() => onTabChange('users')} glow />
        <StatCard index={1} label="Faculty Members" value={overview?.totalFaculty ?? 0} icon={UsersRound} accent="violet"
          sub={`${overview?.totalSections ?? 0} sections running`} onClick={() => onTabChange('faculty')} glow />
        <StatCard index={2} label="Average Attendance" value={overview?.overallAverageAttendance ?? 0} decimals={1} suffix="%" icon={ClipboardCheck} accent="emerald"
          sub="college-wide average" onClick={() => onTabChange('attendance')} glow />
        <StatCard index={3} label="Placed Students" value={placementStats?.studentsPlaced ?? 0} icon={Trophy} accent="amber"
          sub={`${placementStats?.totalOffersExtended ?? 0} offers extended`} onClick={() => onTabChange('placements')} glow />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <Panel title="Attendance Overview" icon={BarChart3} accent="indigo" className="xl:col-span-5"
          action={
            <select
              onChange={(e) => onSemesterChange(e.target.value || null)}
              className="collego-input !w-auto text-xs py-2 pr-7"
              defaultValue=""
            >
              <option value="">All semesters</option>
              {(semesters || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          }
        >
          {attendanceChartData.length === 0 ? (
            <EmptyState icon={BarChart3} title="No attendance data" description="Attendance will appear once records are marked." accent="indigo" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={attendanceChartData} barSize={28} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip unit="%" />} cursor={{ fill: 'rgba(99,102,241,0.05)' }} />
                <Bar dataKey="attendance" name="Attendance" radius={[8, 8, 0, 0]} fill="#4f46e5">
                  {attendanceChartData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>

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
          action={<button onClick={() => onTabChange('announcements')} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50/50 px-2 py-1 rounded-lg transition-colors">View All</button>}
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
                    <div className="flex items-center gap-3.5 p-3 rounded-xl border border-white/60 bg-white/70 backdrop-blur-sm hover:bg-white transition-colors group-hover:border-white/80">
                      <div className="flex flex-col items-center justify-center w-10 h-10 rounded-xl shrink-0" style={{ background: `${color}14`, border: `1px solid ${color}30` }}>
                        <span className="text-[9px] font-bold uppercase" style={{ color }}>{date ? date.toLocaleDateString('en-IN', { month: 'short' }) : '—'}</span>
                        <span className="text-sm font-extrabold text-slate-800 leading-none">{date ? date.getDate() : '—'}</span>
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
        <Panel title="Recent Notices" icon={Megaphone} accent="amber" className="xl:col-span-4"
          action={<button onClick={() => onTabChange('announcements')} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50/50 px-2 py-1 rounded-lg transition-colors">View All</button>}
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

        <Panel title="Top Performers" icon={Trophy} accent="amber" className="xl:col-span-4"
          action={<span className="text-[10px] text-slate-400 font-medium">Ranked by attendance</span>}
        >
          {topPerformers.length === 0 ? (
            <EmptyState icon={Trophy} title="No performance data" description="Rankings build up as attendance is recorded." accent="amber" />
          ) : (
            <div className="space-y-2">
              {topPerformers.map((p, i) => (
                <motion.div key={p.studentId} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className="performer-item relative overflow-hidden group">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 font-bold text-[10px]"
                    style={{ background: `${RANK_COLORS[i]}1f`, color: RANK_COLORS[i], border: `1px solid ${RANK_COLORS[i]}40` }}>
                    {i + 1}
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0">
                    <span className="text-[11px] font-bold text-white">{p.studentName?.[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{p.studentName}</p>
                    <p className="text-[10px] text-slate-400 truncate">{p.departmentName}{p.semester ? ` · Sem ${p.semester}` : ''}</p>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-sm font-bold text-emerald-600">{fmtNum(p.attendancePercentage, 0)}%</span>
                    <div className="w-14 progress-bar mt-1" style={{ width: `${Math.min(p.attendancePercentage, 100)}%` }}>
                      <div className="progress-bar-fill bg-emerald-500" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Quick Actions" icon={Zap} accent="amber" className="xl:col-span-4">
          <div className="grid grid-cols-4 gap-3">
            {quickActions.map((qa) => {
              const Icon = qa.icon
              return (
                <button key={qa.label} onClick={() => onTabChange(qa.tab)} className="quick-action group relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  <span className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0 relative z-10', qa.grad, 'shadow-lg')}>
                    <Icon size={16} className="text-white" />
                  </span>
                  <span className="text-[10px] font-medium text-slate-600 group-hover:text-slate-900 text-center leading-tight">{qa.label}</span>
                </button>
              )
            })}
          </div>
        </Panel>
      </div>
    </div>
  )
}

// ─── Directory (Students / Faculty) ──────────────────────────────────────────
function DirectoryTab({
  users, departments, loading, query, fixedRole, title, subtitle, icon,
  onCreateUser, onEditUser, onToggleActive, onCsvImport, importResult,
  enableYearFilter = false,
}) {
  const [roleFilter, setRoleFilter] = useState(fixedRole || 'ALL')
  const [yearFilter, setYearFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', role: fixedRole || 'STUDENT', departmentId: '' })
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
      setForm({ firstName: '', lastName: '', email: '', password: '', role: fixedRole || 'STUDENT', departmentId: '' })
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
            <label className="flex items-center gap-2 bg-white border border-white/60 text-slate-500 text-xs font-semibold px-3 py-2 rounded-xl cursor-pointer hover:border-indigo-300 hover:text-indigo-600 transition-colors backdrop-blur-sm">
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
                roleFilter === r ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-500/20' : 'bg-white text-slate-500 border-white/60 hover:border-indigo-300 hover:text-slate-800'
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

// ─── Academics ───────────────────────────────────────────────────────────────
function AcademicsTab({ departments, overview, semesters, deptReports }) {
  const stats = [
    { label: 'Departments', value: overview?.totalDepartments ?? departments.length, icon: Layers, accent: 'blue', grad: 'from-blue-500 to-cyan-500' },
    { label: 'Courses', value: overview?.totalCourses ?? 0, icon: BookOpen, accent: 'violet', grad: 'from-violet-500 to-fuchsia-500' },
    { label: 'Sections', value: overview?.totalSections ?? 0, icon: UsersRound, accent: 'emerald', grad: 'from-emerald-500 to-teal-500' },
    { label: 'Enrollments', value: overview?.totalEnrollments ?? 0, icon: ScrollText, accent: 'amber', grad: 'from-amber-500 to-orange-500' },
  ]
  const [sections, setSections] = useState([])
  const [selectedSection, setSelectedSection] = useState(null)
  const [timetableMeta, setTimetableMeta] = useState(null)
  const [sectionStudents, setSectionStudents] = useState([])
  const [loadingSections, setLoadingSections] = useState(false)
  const [uploadingTimetable, setUploadingTimetable] = useState(false)
  const [classRepLoading, setClassRepLoading] = useState(false)
  const [timetableFile, setTimetableFile] = useState(null)

  useEffect(() => {
    loadSections()
  }, [])

  const loadSections = async () => {
    setLoadingSections(true)
    try {
      const res = await api.get('/api/sections')
      setSections(Array.isArray(res.data) ? res.data : [])
    } catch { /* ignore */ } finally { setLoadingSections(false) }
  }

  const loadSectionStudents = async (sectionId) => {
    try {
      const res = await api.get(`/api/sections/${sectionId}/students`)
      setSectionStudents(Array.isArray(res.data) ? res.data : [])
    } catch {
      // Try alternative endpoint
      try {
        const res = await api.get(`/api/faculty/attendance/${sectionId}`)
        setSectionStudents(Array.isArray(res.data) ? res.data.map(s => ({ studentName: s.studentName, enrollmentNumber: s.enrollmentNumber })) : [])
      } catch { /* ignore */ }
    }
  }

  const handleUpdateClassReps = async (sectionId, maleRep, femaleRep) => {
    setClassRepLoading(true)
    try {
      await api.put(`/api/admin/sections/${sectionId}/class-reps`, { maleClassRep: maleRep, femaleClassRep: femaleRep })
      showMsg('Class representatives updated')
      loadSections()
    } catch (err) { showMsg(err.response?.data?.message || 'Failed to update class reps', 'error') }
    finally { setClassRepLoading(false) }
  }

  const handleUploadTimetable = async (file) => {
    if (!selectedSection) return
    setUploadingTimetable(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      await api.post(`/api/admin/sections/${selectedSection.sectionId}/timetable`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      showMsg('Timetable uploaded successfully')
      setTimetableFile(null)
      const res = await api.get(`/api/sections/${selectedSection.sectionId}/timetable/meta`)
      setTimetableMeta(res.data)
    } catch (err) { showMsg(err.response?.data?.message || 'Failed to upload timetable', 'error') }
    finally { setUploadingTimetable(false) }
  }

  const handleDeleteTimetable = async () => {
    if (!selectedSection) return
    try {
      await api.delete(`/api/admin/sections/${selectedSection.sectionId}/timetable`)
      showMsg('Timetable deleted')
      setTimetableMeta(null)
    } catch (err) { showMsg(err.response?.data?.message || 'Failed to delete timetable', 'error') }
  }

  const viewTimetable = () => {
    if (!selectedSection) return
    window.open(`/api/sections/${selectedSection.sectionId}/timetable`, '_blank')
  }

  const sectionOptions = sections.map(s => ({
    label: `${s.courseName} - Sec ${s.sectionName} (${s.semesterName})`,
    value: s.sectionId,
    section: s,
  }))

  return (
    <div className="space-y-6">
      <PageTitle icon={BookOpen} title="Academic Management" subtitle="Departments, courses, sections, semesters and enrolments." />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s, i) => <StatCard key={s.label} index={i} label={s.label} value={s.value} icon={s.icon} accent={s.accent} glow />)}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Panel title="Departments" icon={Building2} accent="blue" className="xl:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(deptReports || []).map(d => (
              <div key={d.departmentId} className="flex items-center gap-3 p-4 rounded-2xl border border-white/60 bg-white/70 backdrop-blur-sm hover:bg-white transition-colors group">
                <div className="w-10 h-10 rounded-xl bg-white border border-white/60 flex items-center justify-center font-bold text-xs text-indigo-600 shrink-0 shadow-sm">
                  {d.departmentCode}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 truncate">{d.departmentName}</p>
                  <p className="text-[11px] text-slate-400">{d.totalStudents} students · {d.totalFaculty} faculty · {d.totalCourses} courses</p>
                </div>
              </div>
            ))}
            {(!deptReports || deptReports.length === 0) && <EmptyState icon={Building2} title="No departments" accent="blue" />}
          </div>
        </Panel>
        <Panel title="Semesters" icon={CalendarDays} accent="violet">
          <div className="space-y-2">
            {(semesters || []).map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-xl border border-white/60 bg-white/70 backdrop-blur-sm hover:bg-white transition-colors group">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{s.name}</p>
                  <p className="text-[11px] text-slate-400">{s.academicYear}</p>
                </div>
                <Badge variant={s.active ? 'success' : 'secondary'}>{s.active ? 'Active' : 'Inactive'}</Badge>
              </div>
            ))}
            {(!semesters || semesters.length === 0) && <EmptyState icon={CalendarDays} title="No semesters" accent="violet" />}
          </div>
        </Panel>
      </div>

      {/* Section Management Panel */}
      <Panel title="Section Management & Timetable" icon={Layers} accent="emerald">
        <div className="space-y-5">
          <div className="glass-card p-5 border border-white/60">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-0">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Select Section</label>
                <select value={selectedSection?.sectionId || ''} onChange={e => {
                  const sec = sections.find(s => s.sectionId === Number(e.target.value))
                  if (sec) {
                    setSelectedSection(sec)
                    setTimetableMeta(null)
                    loadSectionStudents(sec.sectionId)
                  }
                }} className="collego-input">
                  <option value="">Select a section</option>
                  {sectionOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={loadSections}
                className="px-3 py-2 rounded-xl text-xs text-slate-400 border border-white/60 hover:border-indigo-300 hover:text-indigo-600 transition-colors bg-white/50"
              >
                <RefreshCw size={14} /> Refresh
              </button>
              {loadingSections && <span className="text-xs text-indigo-500 animate-pulse">Loading...</span>}
            </div>
          </div>
          </div>
          {selectedSection && (
            <div className="glass-card p-5 border border-white/60">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-slate-800">{selectedSection.courseName}</h3>
                  <p className="text-[10px] text-slate-500">{selectedSection.courseCode} · Sec {selectedSection.sectionName} · {selectedSection.semesterName}</p>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Male Class Rep:</span>
                      <input
                        value={selectedSection.maleClassRep || ''}
                        onChange={e => {
                          const updated = { ...selectedSection, maleClassRep: e.target.value }
                          setSelectedSection(updated)
                        }}
                        className="collego-input text-sm w-40"
                        placeholder="Name"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Female Class Rep:</span>
                      <input
                        value={selectedSection.femaleClassRep || ''}
                        onChange={e => {
                          const updated = { ...selectedSection, femaleClassRep: e.target.value }
                          setSelectedSection(updated)
                        }}
                        className="collego-input text-sm w-40"
                        placeholder="Name"
                      />
                    </div>
                    <button
                      onClick={() => handleUpdateClassReps(selectedSection.sectionId, selectedSection.maleClassRep, selectedSection.femaleClassRep)}
                      disabled={classRepLoading}
                      className="px-3 py-1.5 rounded-xl text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition-colors disabled:opacity-50"
                    >
                      {classRepLoading ? <span className="flex gap-1"><RefreshCw size={12} className="animate-spin" /> Saving...</span> : <span className="flex gap-1"><UsersRound size={12} /> Save Class Reps</span>}
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {timetableMeta ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Timetable uploaded:</span>
                      <a
                        href={`/api/sections/${selectedSection.sectionId}/timetable`}
                        download={timetableMeta.fileName}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition-colors"
                      >
                        <Download size={12} /> {timetableMeta.fileName}
                      </a>
                      <button
                        onClick={handleDeleteTimetable}
                        className="px-2 py-1.5 rounded-lg text-xs text-red-500 bg-red-50 border border-red-100 hover:bg-red-100 transition-colors"
                        title="Delete Timetable"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Upload Timetable (PDF)</label>
                      <div className="relative group">
                        <input
                          ref={null}
                          type="file"
                          className="sr-only"
                          accept=".pdf"
                          onChange={e => {
                            if (e.target.files?.[0]) {
                              setTimetableFile(e.target.files[0])
                              handleUploadTimetable(e.target.files[0])
                            }
                          }}
                        />
                        <button type="button" className="collego-input px-4 py-2 text-[10px] text-slate-400 border border-white/60 rounded-xl hover:border-indigo-300 hover:text-indigo-600 transition-all bg-white/50 w-full text-left">
                          {timetableFile ? <span className="text-xs text-indigo-600 font-medium">{timetableFile.name}</span> : <span>Choose PDF</span>}
                        </button>
                        {uploadingTimetable && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                            <span className="flex gap-1 text-xs"><RefreshCw size={12} className="animate-spin" /> Uploading...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {sectionStudents.length > 0 && (
            <div className="glass-card overflow-hidden border border-white/60 mt-6">
              <div className="px-5 py-4 border-b border-white/50 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">Students in Section</h3>
                <span className="text-xs font-semibold text-slate-400">{sectionStudents.length} students</span>
              </div>
              <div className="overflow-x-auto">
                <table className="collego-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Student Name</th>
                      <th style={{ textAlign: 'center' }}>Enrollment</th>
                      <th style={{ textAlign: 'center' }}>Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sectionStudents.map((s, i) => {
                      const isMaleRep = s.studentName === selectedSection.maleClassRep
                      const isFemaleRep = s.studentName === selectedSection.femaleClassRep
                      return (
                        <tr key={i} className="hover:bg-white/30 transition-colors">
                          <td className="text-slate-400">{i + 1}</td>
                          <td className="text-slate-800 font-medium">{s.studentName}</td>
                          <td style={{ textAlign: 'center' }} className="text-slate-500 text-xs font-mono">{s.enrollmentNumber}</td>
                          <td style={{ textAlign: 'center' }}>
                            <div className="flex items-center justify-center gap-1">
                              {isMaleRep && <span className="px-2 py-0.5 rounded text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-100">♂ Class Rep</span>}
                              {isFemaleRep && <span className="px-2 py-0.5 rounded text-[9px] font-bold text-pink-600 bg-pink-50 border border-pink-100">♀ Class Rep</span>}
                              {!isMaleRep && !isFemaleRep && <span className="text-[9px] text-slate-400">Student</span>}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Panel>
      </div>
    )
}

// ─── Attendance ──────────────────────────────────────────────────────────────
function AttendanceTab({ attendanceSummary, overview }) {
  const chartData = (attendanceSummary || []).map(d => ({
    name: d.departmentName?.split(' ')[0] || 'N/A',
    attendance: Math.round(d.averageAttendancePercentage || 0),
  }))
  const totals = (attendanceSummary || []).reduce((acc, d) => ({
    students: acc.students + (d.totalStudents || 0),
    above75: acc.above75 + (d.studentsAbove75 || 0),
    below75: acc.below75 + (d.studentsBelow75 || 0),
    below50: acc.below50 + (d.studentsBelow50 || 0),
  }), { students: 0, above75: 0, below75: 0, below50: 0 })

  return (
    <div className="space-y-6">
      <PageTitle icon={ClipboardCheck} title="Attendance Management" subtitle="Department-wise attendance health and at-risk students." />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard index={0} label="Average Attendance" value={overview?.overallAverageAttendance ?? 0} decimals={1} suffix="%" icon={Percent} accent="emerald" glow />
        <StatCard index={1} label="Above 75%" value={totals.above75} icon={CheckCircle2} accent="blue" glow />
        <StatCard index={2} label="50% – 75%" value={totals.below75} icon={Activity} accent="amber" glow />
        <StatCard index={3} label="Below 50%" value={totals.below50} icon={XCircle} accent="violet" glow />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title="Attendance by Department" icon={BarChart3} accent="indigo">
          {chartData.length === 0 ? <EmptyState icon={BarChart3} title="No data" accent="indigo" /> : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} barSize={30} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip unit="%" />} cursor={{ fill: 'rgba(99,102,241,0.05)' }} />
                <Bar dataKey="attendance" name="Attendance" radius={[8, 8, 0, 0]}>
                  {chartData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>
        <Panel title="Department Breakdown" icon={Layers} accent="violet">
          <div className="overflow-x-auto">
            <table className="collego-table">
              <thead><tr><th>Department</th><th style={{ textAlign: 'center' }}>Students</th><th style={{ textAlign: 'center' }}>Avg %</th><th style={{ textAlign: 'center' }}>&lt;75%</th></tr></thead>
              <tbody>
                {(attendanceSummary || []).map(d => (
                  <tr key={d.departmentId} className="hover:bg-white/30 transition-colors">
                    <td className="font-medium text-slate-800">{d.departmentName}</td>
                    <td style={{ textAlign: 'center' }}>{d.totalStudents}</td>
                    <td style={{ textAlign: 'center' }}><Badge variant={d.averageAttendancePercentage >= 75 ? 'success' : d.averageAttendancePercentage >= 50 ? 'warning' : 'destructive'}>{fmtNum(d.averageAttendancePercentage, 1)}%</Badge></td>
                    <td style={{ textAlign: 'center' }} className="text-amber-600 font-semibold">{d.studentsBelow75}</td>
                  </tr>
                ))}
                {(!attendanceSummary || attendanceSummary.length === 0) && <tr><td colSpan={4} className="text-center text-slate-400 py-12">No attendance data.</td></tr>}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  )
}

// ─── Examinations ────────────────────────────────────────────────────────────
function ExaminationsTab({ pendingQPs, onApprove, onReject, loading }) {
  return (
    <div className="space-y-6">
      <PageTitle icon={BookMarked} title="Examinations & Marks" subtitle="Approve question papers and monitor examination readiness." />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard index={0} label="Pending Approvals" value={pendingQPs.length} icon={Clock} accent="amber" glow />
        <StatCard index={1} label="Approved" value={pendingQPs.filter(q => q.status === 'APPROVED').length} icon={CheckCircle2} accent="emerald" glow />
        <StatCard index={2} label="Rejected" value={pendingQPs.filter(q => q.status === 'REJECTED').length} icon={XCircle} accent="violet" glow />
        <StatCard index={3} label="Total Papers" value={pendingQPs.length} icon={FileText} accent="blue" glow />
      </div>
      <Panel title="Question Papers Awaiting Approval" icon={FileText} accent="indigo">
        {pendingQPs.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="All caught up" description="No question papers are pending approval." accent="indigo" />
        ) : (
          <div className="space-y-3">
            {pendingQPs.map(qp => (
              <div key={qp.id} className="flex flex-wrap items-center gap-3 p-4 rounded-2xl border border-white/60 bg-white/70 backdrop-blur-sm hover:bg-white transition-all group">
                <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 shadow-sm shadow-indigo-500/10">
                  <FileText size={17} className="text-indigo-600" />
                </div>
                <div className="flex-1 min-w-[180px]">
                  <p className="text-sm font-semibold text-slate-800">{qp.courseName} <span className="text-slate-400 font-normal text-xs">({qp.courseCode})</span></p>
                  <p className="text-[11px] text-slate-400">{qp.examType} · {qp.year} · Sem {qp.semesterNumber} · {qp.uploadedByName}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="success" size="sm" disabled={loading} onClick={() => onApprove(qp.id)} className="px-4"><CheckCircle2 size={13} /> Approve</Button>
                  <Button variant="destructive" size="sm" disabled={loading} onClick={() => onReject(qp.id)} className="px-4"><X size={13} /> Reject</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}

// ─── Placements ──────────────────────────────────────────────────────────────
function PlacementsTab({ placementStats }) {
  const s = placementStats
  const deptData = s?.departmentBreakdown || []
  return (
    <div className="space-y-6">
      <PageTitle icon={Briefcase} title="Placement Management" subtitle="Company drives, applications and placement analytics." />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard index={0} label="Students Placed" value={s?.studentsPlaced ?? 0} icon={Trophy} accent="emerald" glow />
        <StatCard index={1} label="Offers Extended" value={s?.totalOffersExtended ?? 0} icon={Award} accent="amber" glow />
        <StatCard index={2} label="Open Postings" value={s?.openJobPostings ?? 0} icon={Briefcase} accent="blue" glow />
        <StatCard index={3} label="Placement Rate" value={s?.placementRate ?? 0} decimals={1} suffix="%" icon={TrendingUp} accent="violet" glow />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Panel title="Department Placements" icon={Layers} accent="indigo" className="xl:col-span-2">
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
        <Panel title="Top Recruiters" icon={Award} accent="amber">
          <div className="space-y-2">
            {(s?.topCompanies || []).map((c, i) => (
              <div key={c.companyId} className="flex items-center gap-3 p-3.5 rounded-xl border border-white/60 bg-white/70 backdrop-blur-sm hover:bg-white transition-colors">
                <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-xs font-bold shrink-0 shadow-sm shadow-amber-500/10">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{c.companyName}</p>
                  <p className="text-[10px] text-slate-400">Highest {c.highestPackage || '—'}</p>
                </div>
                <span className="text-sm font-bold text-slate-700">{c.offersExtended}</span>
              </div>
            ))}
            {(!s?.topCompanies || s.topCompanies.length === 0) && <EmptyState icon={Award} title="No recruiters yet" accent="amber" />}
          </div>
        </Panel>
      </div>
    </div>
  )
}

// ─── Reports ─────────────────────────────────────────────────────────────────
function ReportsTab({ deptReports, subjectReports }) {
  const [view, setView] = useState('department')
  return (
    <div className="space-y-6">
      <PageTitle
        icon={BarChart3}
        title="Reports & Analytics"
        subtitle="Department performance, pass percentages and subject-level outcomes."
        actions={
          <div className="flex bg-white border border-white/60 rounded-2xl p-1 backdrop-blur-sm">
            {[['department', 'Departments'], ['subject', 'Subjects']].map(([id, label]) => (
              <button key={id} onClick={() => setView(id)}
                className={cn('px-4 py-2 rounded-xl text-xs font-medium transition-all', view === id ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50')}>
                {label}
              </button>
            ))}
          </div>
        }
      />
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
                    <td className="text-slate-500">{sr.facultyName || '—'}</td>
                    <td style={{ textAlign: 'center' }}>{sr.totalEnrolled}</td>
                    <td style={{ textAlign: 'center' }}>{sr.averageMarks != null ? fmtNum(sr.averageMarks, 1) : '—'}</td>
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

// ─── Notices & Events ────────────────────────────────────────────────────────
function NoticesTab({ insights }) {
  const notices = insights?.recentNotices || []
  const events = insights?.upcomingEvents || []
  return (
    <div className="space-y-6">
      <PageTitle icon={Megaphone} title="Notices & Events" subtitle="Latest broadcasts and the campus activity calendar." />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title="Recent Notices" icon={Megaphone} accent="amber">
          <div className="space-y-3">
            {notices.map(n => {
              const cfg = NOTICE_TYPES[n.type] || NOTICE_TYPES.GENERAL
              return (
                <div key={n.id} className="p-4 rounded-2xl border border-white/60 bg-white/70 backdrop-blur-sm cursor-pointer hover:bg-white transition-colors">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge variant={cfg.variant} className="text-[9px] px-2 py-0.5">{cfg.label}</Badge>
                    <span className="text-[10px] text-slate-400">{timeAgo(n.createdAt)}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800">{n.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                </div>
              )
            })}
            {notices.length === 0 && <EmptyState icon={Megaphone} title="No notices yet" accent="amber" />}
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
                    <span className="text-[9px] font-bold uppercase" style={{ color }}>{date ? date.toLocaleDateString('en-IN', { month: 'short' }) : '—'}</span>
                    <span className="text-base font-extrabold text-slate-800 leading-none">{date ? date.getDate() : '—'}</span>
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

// ─── Fee Management Tab ──────────────────────────────────────────────────────
function FeeTab({ fees, onCreateFee, onUpdateFee, onPayFee, onAddFeeItem }) {
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ studentId: '', semesterId: '', totalAmount: '', paidAmount: '', dueDate: '', status: 'PENDING', items: [] })

  const totalOutstanding = fees.reduce((s, f) => s + (f.status !== 'PAID' ? Number(f.totalAmount || 0) : 0), 0)
  const totalPaid = fees.reduce((s, f) => s + (Number(f.paidAmount || 0)), 0)

  return (
    <div className="space-y-6">
      <PageTitle icon={Wallet} title="Fee Management" subtitle="Student fee structures, payment tracking, and financial reports." />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard index={0} label="Total Outstanding" value={totalOutstanding} prefix="₹" icon={Wallet} accent="amber" glow />
        <StatCard index={1} label="Total Paid" value={totalPaid} prefix="₹" icon={CheckCircle2} accent="emerald" glow />
        <StatCard index={2} label="Fee Records" value={fees.length} icon={ScrollText} accent="blue" glow />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title="Create Fee Record" icon={Plus} accent="emerald">
          <div className="glass-card p-5 border border-white/60">
            <form onSubmit={(e) => { e.preventDefault(); onCreateFee({ ...form, totalAmount: Number(form.totalAmount), paidAmount: Number(form.paidAmount || 0), items: form.items.filter(i => i.description) })}} className="space-y-4">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Student ID</label>
                <input value={form.studentId} onChange={e => setForm({ ...form, studentId: e.target.value })} placeholder="e.g., 10" className="collego-input" required />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Semester ID</label>
                <input value={form.semesterId} onChange={e => setForm({ ...form, semesterId: e.target.value })} placeholder="e.g., 20" className="collego-input" required />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Total Amount (₹)</label>
                <input type="number" value={form.totalAmount} onChange={e => setForm({ ...form, totalAmount: e.target.value })} placeholder="0" className="collego-input" required />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Paid Amount (₹)</label>
                <input type="number" value={form.paidAmount} onChange={e => setForm({ ...form, paidAmount: e.target.value })} placeholder="0" className="collego-input" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Due Date</label>
                <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} className="collego-input" required />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="collego-input">
                  <option value="PENDING">Pending</option>
                  <option value="PAID">Paid</option>
                  <option value="OVERDUE">Overdue</option>
                </select>
              </div>
              <Button type="submit" variant="gradient" size="sm" className="w-full">
                <Plus size={13} /> Create Fee Record
              </Button>
            </form>
          </div>
        </Panel>

        <Panel title="Fee Records" icon={ScrollText} accent="blue">
          <div className="overflow-x-auto">
            <table className="collego-table">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Semester</th>
                  <th style={{ textAlign: 'center' }}>Total</th>
                  <th style={{ textAlign: 'center' }}>Paid</th>
                  <th style={{ textAlign: 'center' }}>Due Date</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {fees.map(f => (
                  <tr key={f.id} className="hover:bg-white/30 transition-colors">
                    <td className="text-slate-800 font-medium">#{f.studentId}</td>
                    <td className="text-slate-500">{f.semesterName || '—'}</td>
                    <td style={{ textAlign: 'center' }} className="font-medium">₹{Number(f.totalAmount || 0).toLocaleString()}</td>
                    <td style={{ textAlign: 'center' }} className="font-medium">₹{Number(f.paidAmount || 0).toLocaleString()}</td>
                    <td style={{ textAlign: 'center' }} className="text-slate-500">{f.dueDate || '—'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <Badge variant={f.status === 'PAID' ? 'success' : f.status === 'OVERDUE' ? 'destructive' : 'warning'}>{f.status}</Badge>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {f.status !== 'PAID' && (
                        <Button variant="success" size="sm" onClick={() => onPayFee(f.id, { paidAmount: f.totalAmount, paymentMethod: 'CARD' })} className="px-3">
                          <CheckCircle2 size={13} /> Pay
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {fees.length === 0 && <tr><td colSpan={7} className="text-center text-slate-400 py-12">No fee records found.</td></tr>}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {showCreate && (
        <div className="glass-card p-6 border border-white/60">
          <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2"><Plus size={15} className="text-emerald-500" /> Create New Fee</h3>
          <p className="text-xs text-slate-500 mb-4">Fee records will appear in the table above once created.</p>
        </div>
      )}
    </div>
  )
}

// ─── Coming soon / informational ─────────────────────────────────────────────
const COMING_SOON = {
  fees: { title: 'Fees & Finance', icon: Wallet, accent: 'amber', copy: 'Student fee structures, payment tracking, receipts and financial reports will be managed here.' },
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
        <Badge variant="info" className="mt-6">Backend-ready · UI rolling out</Badge>
      </div>
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────
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
  const [pendingQPs, setPendingQPs] = useState([])
  const [placementStats, setPlacementStats] = useState(null)
  const [insights, setInsights] = useState(null)
  const [semesters, setSemesters] = useState([])
  const [importResult, setImportResult] = useState(null)
  const [fees, setFees] = useState([])

  const sidebarWidth = collapsed ? 76 : 248
  const showMsg = useCallback((text, type = 'success') => setToast({ text, type }), [])

  const loadUsers = useCallback(async () => {
    try {
      const res = await api.get('/api/admin/users')
      setUsers(Array.isArray(res.data) ? res.data : res.data?.content || [])
    } catch { /* ignore */ }
  }, [])

  const loadAll = useCallback(async () => {
    const [ovRes, usRes, dpRes, drRes, srRes, asRes, qpRes, psRes, inRes, semRes, feesRes] = await Promise.allSettled([
      api.get('/api/admin/overview'),
      api.get('/api/admin/users'),
      api.get('/api/departments'),
      api.get('/api/admin/reports/departments'),
      api.get('/api/admin/reports/subjects'),
      api.get('/api/admin/reports/attendance'),
      api.get('/api/admin/question-papers/pending'),
      api.get('/api/placement/stats'),
      api.get('/api/admin/dashboard/insights'),
      api.get('/api/semesters'),
      api.get('/api/admin/fees'),
    ])
    if (ovRes.status === 'fulfilled') setOverview(ovRes.value.data)
    if (usRes.status === 'fulfilled') setUsers(Array.isArray(usRes.value.data) ? usRes.value.data : usRes.value.data?.content || [])
    if (dpRes.status === 'fulfilled') setDepartments(Array.isArray(dpRes.value.data) ? dpRes.value.data : [])
    if (drRes.status === 'fulfilled') setDeptReports(Array.isArray(drRes.value.data) ? drRes.value.data : [])
    if (srRes.status === 'fulfilled') setSubjectReports(Array.isArray(srRes.value.data) ? srRes.value.data : [])
    if (asRes.status === 'fulfilled') setAttendanceSummary(Array.isArray(asRes.value.data) ? asRes.value.data : [])
    if (qpRes.status === 'fulfilled') setPendingQPs(Array.isArray(qpRes.value.data) ? qpRes.value.data : [])
    if (psRes.status === 'fulfilled') setPlacementStats(psRes.value.data)
    if (inRes.status === 'fulfilled') setInsights(inRes.value.data)
    if (semRes.status === 'fulfilled') setSemesters(Array.isArray(semRes.value.data) ? semRes.value.data : [])
    if (feesRes.status === 'fulfilled') setFees(Array.isArray(feesRes.value.data) ? feesRes.value.data : [])
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
      showMsg('User created successfully')
      loadUsers()
      loadAll()
      return true
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to create user', 'error')
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

  const onCsvImport = async (file) => {
    const fd = new FormData(); fd.append('file', file)
    setLoading(true)
    try {
      const res = await api.post('/api/admin/users/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setImportResult(res.data)
      loadUsers()
      loadAll()
    } catch (err) {
      showMsg(err.response?.data?.message || 'Import failed', 'error')
    } finally { setLoading(false) }
  }

  const handleApproveQP = async (id) => {
    try {
      await api.put(`/api/admin/question-papers/${id}/approve`)
      showMsg('Question paper approved')
      loadAll()
    } catch (err) { showMsg(err.response?.data?.message || 'Failed to approve', 'error') }
  }

  const handleRejectQP = async (id) => {
    try {
      await api.put(`/api/admin/question-papers/${id}/reject`)
      showMsg('Question paper rejected')
      loadAll()
    } catch (err) { showMsg(err.response?.data?.message || 'Failed to reject', 'error') }
  }

  // ─── Fee CRUD handlers ─────────────────────────────────────────────────────
  const onCreateFee = async (payload) => {
    try {
      await api.post('/api/admin/fees', payload)
      showMsg('Fee created successfully')
      loadAll()
      return true
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to create fee', 'error')
      return false
    }
  }

  const onUpdateFee = async (id, payload) => {
    try {
      await api.put(`/api/admin/fees/${id}`, payload)
      showMsg('Fee updated successfully')
      loadAll()
      return true
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to update fee', 'error')
      return false
    }
  }

  const onPayFee = async (id, payload) => {
    try {
      await api.post(`/api/admin/fees/${id}/pay`, payload)
      showMsg('Fee payment recorded')
      loadAll()
      return true
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to record payment', 'error')
      return false
    }
  }

  const onAddFeeItem = async (feeId, payload) => {
    try {
      await api.post(`/api/admin/fees/${feeId}/items`, payload)
      showMsg('Fee item added')
      loadAll()
      return true
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to add fee item', 'error')
      return false
    }
  }

  useEffect(() => { loadAll() }, [loadAll])

  const unreadCount = insights?.recentNotices?.filter(n => !n.read).length || 0

  const renderTab = () => {
    switch (activeTab) {
      case 'overview': return <OverviewTab overview={overview} deptReports={deptReports} attendanceSummary={attendanceSummary} placementStats={placementStats} insights={insights} semesters={semesters} onTabChange={setActiveTab} onSemesterChange={handleSemesterChange} />
      case 'users': return <DirectoryTab users={users} departments={departments} loading={loading} query={query} fixedRole="STUDENT" title="Student Directory" subtitle="Manage and enroll students across departments." icon={GraduationCap} onCreateUser={onCreateUser} onEditUser={onEditUser} onToggleActive={onToggleActive} onCsvImport={onCsvImport} importResult={importResult} enableYearFilter />
      case 'faculty': return <DirectoryTab users={users} departments={departments} loading={loading} query={query} fixedRole="FACULTY" title="Faculty Directory" subtitle="Manage faculty members and teaching assignments." icon={Users} onCreateUser={onCreateUser} onEditUser={onEditUser} onToggleActive={onToggleActive} onCsvImport={onCsvImport} importResult={null} />
      case 'academics': return <AcademicsTab departments={departments} overview={overview} semesters={semesters} deptReports={deptReports} />
      case 'attendance': return <AttendanceTab attendanceSummary={attendanceSummary} overview={overview} />
      case 'examinations': return <ExaminationsTab pendingQPs={pendingQPs} onApprove={handleApproveQP} onReject={handleRejectQP} loading={loading} />
      case 'placements': return <PlacementsTab placementStats={placementStats} />
      case 'reports': return <ReportsTab deptReports={deptReports} subjectReports={subjectReports} />
      case 'announcements': return <NoticesTab insights={insights} />
      case 'aiAssistant': return <ComingSoonTab id="aiAssistant" />
      case 'fees': return <FeeTab fees={fees} onCreateFee={onCreateFee} onUpdateFee={onUpdateFee} onPayFee={onPayFee} onAddFeeItem={onAddFeeItem} />
      case 'hostel': return <ComingSoonTab id="hostel" />
      case 'library': return <ComingSoonTab id="library" />
      case 'settings': return <ComingSoonTab id="settings" />
      case 'help': return <ComingSoonTab id="help" />
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
        placeholder="Search students, departments, reports..."
        notificationCount={unreadCount}
        notifications={(insights?.recentNotices || []).map(n => ({ id: n.id, title: n.title, message: n.message }))}
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
