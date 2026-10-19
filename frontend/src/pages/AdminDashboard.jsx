import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
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
  if (d === 1) return 'Yesterday'
  return `${d}d ago`
}

const PIE_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6']
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

// ─── Overview ────────────────────────────────────────────────────────────────
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
    { icon: GraduationCap, label: 'Add Student', tab: 'users', accent: 'blue' },
    { icon: Users, label: 'Add Faculty', tab: 'faculty', accent: 'violet' },
    { icon: Megaphone, label: 'Create Notice', tab: 'announcements', accent: 'amber' },
    { icon: BarChart3, label: 'Generate Report', tab: 'reports', accent: 'indigo' },
    { icon: BookOpen, label: 'Manage Courses', tab: 'academics', accent: 'emerald' },
    { icon: ClipboardCheck, label: 'Take Attendance', tab: 'attendance', accent: 'emerald' },
    { icon: BookMarked, label: 'Upload Marks', tab: 'examinations', accent: 'violet' },
    { icon: Briefcase, label: 'Placement Records', tab: 'placements', accent: 'amber' },
  ]

  return (
    <div className="space-y-6">
      <WelcomeBanner
        greeting={greeting}
        name="Admin"
        subtitle="Here's what's happening across your college today."
        quote="Education transforms ideas into reality"
        accent="indigo"
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard index={0} label="Total Students" value={overview?.totalStudents ?? 0} icon={GraduationCap} accent="blue"
          sub={`across ${overview?.totalDepartments ?? 0} departments`} onClick={() => onTabChange('users')} />
        <StatCard index={1} label="Faculty Members" value={overview?.totalFaculty ?? 0} icon={UsersRound} accent="violet"
          sub={`${overview?.totalSections ?? 0} sections running`} onClick={() => onTabChange('faculty')} />
        <StatCard index={2} label="Average Attendance" value={overview?.overallAverageAttendance ?? 0} decimals={1} suffix="%" icon={ClipboardCheck} accent="emerald"
          sub="college-wide average" onClick={() => onTabChange('attendance')} />
        <StatCard index={3} label="Placed Students" value={placementStats?.studentsPlaced ?? 0} icon={Trophy} accent="amber"
          sub={`${placementStats?.totalOffersExtended ?? 0} offers extended`} onClick={() => onTabChange('placements')} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <Panel title="Attendance Overview" icon={BarChart3} accent="indigo" className="xl:col-span-5"
          action={
            <select
              onChange={(e) => onSemesterChange(e.target.value || null)}
              className="collego-input !w-auto text-xs py-1.5 pr-7"
              defaultValue=""
            >
              <option value="">All semesters</option>
              {(semesters || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          }
        >
          {attendanceChartData.length === 0 ? (
            <EmptyState icon={BarChart3} title="No attendance data" description="Attendance will appear once records are marked." />
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={attendanceChartData} barSize={26} margin={{ top: 6, right: 4, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef1f8" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#8a94ad' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#8a94ad' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip unit="%" />} cursor={{ fill: 'rgba(99,102,241,0.05)' }} />
                <Bar dataKey="attendance" name="Attendance" radius={[8, 8, 0, 0]}>
                  {attendanceChartData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel title="Student Statistics" icon={Activity} accent="violet" className="xl:col-span-3">
          {deptDistribution.length === 0 ? (
            <EmptyState icon={Activity} title="No students yet" description="Department distribution will appear here." />
          ) : (
            <>
              <div className="relative">
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Pie data={deptDistribution} cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={3} dataKey="value">
                      {deptDistribution.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <AnimatedNumber value={overview?.totalStudents ?? 0} className="text-2xl font-extrabold text-slate-900" />
                  <p className="text-[10px] text-slate-400 font-medium">Students</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                {deptDistribution.map((d, i) => (
                  <div key={d.name + i} className="flex items-center gap-1.5 min-w-0">
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
          action={<button onClick={() => onTabChange('announcements')} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">View All</button>}
        >
          {upcomingEvents.length === 0 ? (
            <EmptyState icon={CalendarDays} title="No upcoming events" description="New placement drives and activities will show up here." />
          ) : (
            <div className="space-y-1">
              {upcomingEvents.map((ev) => {
                const color = EVENT_COLORS[ev.category] || '#6366f1'
                const date = ev.date ? new Date(ev.date) : null
                return (
                  <div key={ev.id} className="event-item">
                    <div className="flex flex-col items-center justify-center w-11 h-11 rounded-xl shrink-0"
                      style={{ background: `${color}14`, border: `1px solid ${color}30` }}>
                      <span className="text-[9px] font-bold uppercase" style={{ color }}>
                        {date ? date.toLocaleDateString('en-IN', { month: 'short' }) : '—'}
                      </span>
                      <span className="text-sm font-extrabold text-slate-800 leading-none">{date ? date.getDate() : '—'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{ev.title}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1 truncate">
                        <MapPin size={10} /> {ev.subtitle || ev.location}
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ color, background: `${color}14` }}>
                      {ev.category}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </Panel>
      </div>

      {/* Notices / performers / quick actions */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <Panel title="Recent Notices" icon={Megaphone} accent="amber" className="xl:col-span-4"
          action={<button onClick={() => onTabChange('announcements')} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">View All</button>}
        >
          {recentNotices.length === 0 ? (
            <EmptyState icon={Megaphone} title="No notices yet" description="Notices broadcast to students will appear here." />
          ) : (
            <div className="space-y-2">
              {recentNotices.map((n) => {
                const cfg = NOTICE_TYPES[n.type] || NOTICE_TYPES.GENERAL
                return (
                  <div key={n.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                      <FileText size={15} className="text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700 truncate">{n.title}</p>
                      <p className="text-[11px] text-slate-400">{timeAgo(n.createdAt)}</p>
                    </div>
                    <Badge variant={cfg.variant} className="text-[9px] px-2 py-0 shrink-0">{cfg.label}</Badge>
                  </div>
                )
              })}
            </div>
          )}
        </Panel>

        <Panel title="Top Performers" icon={Trophy} accent="amber" className="xl:col-span-4"
          action={<span className="text-[11px] text-slate-400">By attendance</span>}
        >
          {topPerformers.length === 0 ? (
            <EmptyState icon={Trophy} title="No performance data" description="Rankings build up as attendance is recorded." />
          ) : (
            <div className="space-y-1">
              {topPerformers.map((p, i) => (
                <div key={p.studentId} className="performer-item">
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
                    <div className="w-12 progress-bar mt-1">
                      <div className="progress-bar-fill bg-emerald-500" style={{ width: `${Math.min(p.attendancePercentage, 100)}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Quick Actions" icon={Zap} accent="amber" className="xl:col-span-4">
          <div className="grid grid-cols-4 gap-2.5">
            {quickActions.map((qa) => {
              const Icon = qa.icon
              const a = ACCENTS[qa.accent]
              return (
                <button key={qa.label} onClick={() => onTabChange(qa.tab)} className="quick-action">
                  <span className={cn('w-9 h-9 rounded-xl flex items-center justify-center', a.softBg)}>
                    <Icon size={16} className={a.text} />
                  </span>
                  <span className="text-[10px] text-slate-500 text-center leading-tight font-medium">{qa.label}</span>
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
}) {
  const [roleFilter, setRoleFilter] = useState(fixedRole || 'ALL')
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', role: fixedRole || 'STUDENT', departmentId: '' })
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', email: '' })

  const filtered = useMemo(() => {
    const q = (query || '').trim().toLowerCase()
    return users.filter(u => {
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false
      if (!q) return true
      return `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(q)
    })
  }, [users, roleFilter, query])

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
    <div className="space-y-5">
      <PageTitle
        icon={icon}
        title={title}
        subtitle={subtitle}
        actions={
          <>
            <label className="flex items-center gap-2 bg-white border border-slate-200 text-slate-500 text-xs font-medium px-3 py-2 rounded-xl cursor-pointer hover:border-indigo-300 hover:text-indigo-600 transition-colors">
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
        <div className="glass-card p-4 flex flex-wrap items-center gap-4 text-sm">
          <span className="text-emerald-600 flex items-center gap-1.5 font-medium"><CheckCircle2 size={15} /> {importResult.successCount} imported</span>
          <span className="text-red-500 flex items-center gap-1.5 font-medium"><XCircle size={15} /> {importResult.failureCount} failed</span>
          <span className="text-slate-400">Total {importResult.totalProcessed}</span>
        </div>
      )}

      {showCreate && (
        <motion.form
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          onSubmit={submitCreate}
          className="glass-card p-5"
        >
          <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2"><Plus size={15} className="text-indigo-500" /> Create New User</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {['firstName', 'lastName', 'email', 'password'].map(field => (
              <div key={field}>
                <label className="text-xs text-slate-500 mb-1.5 block capitalize">{field.replace(/([A-Z])/g, ' $1')}</label>
                <input
                  type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
                  value={form[field]} onChange={e => setForm({ ...form, [field]: e.target.value })}
                  className="collego-input" required
                />
              </div>
            ))}
            <div>
              <label className="text-xs text-slate-500 mb-1.5 block">Role</label>
              <select value={form.role} disabled={!!fixedRole} onChange={e => setForm({ ...form, role: e.target.value })} className="collego-input disabled:opacity-60">
                <option value="STUDENT">Student</option>
                <option value="FACULTY">Faculty</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1.5 block">Department</label>
              <select value={form.departmentId} onChange={e => setForm({ ...form, departmentId: e.target.value })} className="collego-input">
                <option value="">Select Department</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <Button type="submit" variant="gradient" size="sm" className="mt-4" disabled={loading}>
            {loading ? <><RefreshCw size={13} className="animate-spin" /> Creating...</> : <><Plus size={13} /> Create User</>}
          </Button>
        </motion.form>
      )}

      {editing && (
        <div className="glass-card p-5 border-violet-200">
          <h3 className="text-sm font-semibold text-violet-700 mb-3 flex items-center gap-2"><Edit size={14} /> Edit {editing.firstName} {editing.lastName}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input value={editForm.firstName} onChange={e => setEditForm({ ...editForm, firstName: e.target.value })} placeholder="First name" className="collego-input" />
            <input value={editForm.lastName} onChange={e => setEditForm({ ...editForm, lastName: e.target.value })} placeholder="Last name" className="collego-input" />
            <input value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} placeholder="Email" className="collego-input" />
          </div>
          <div className="flex gap-2 mt-3">
            <Button onClick={submitEdit} variant="gradient" size="sm">Save Changes</Button>
            <Button onClick={() => setEditing(null)} variant="outline" size="sm">Cancel</Button>
          </div>
        </div>
      )}

      {!fixedRole && (
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          {['ALL', 'STUDENT', 'FACULTY', 'ADMIN'].map(r => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors border',
                roleFilter === r ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'
              )}
            >
              {r === 'ALL' ? 'All' : r.charAt(0) + r.slice(1).toLowerCase()}
            </button>
          ))}
          <span className="text-xs text-slate-400 ml-auto">{filtered.length} users</span>
        </div>
      )}

      <div className="glass-card overflow-hidden">
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
              {filtered.map(u => (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
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
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => { setEditing(u); setEditForm({ firstName: u.firstName, lastName: u.lastName, email: u.email }) }}
                        className="p-2 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors" title="Edit"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => onToggleActive(u)}
                        className={cn('p-2 rounded-lg transition-colors', u.active ? 'hover:bg-amber-50 text-slate-400 hover:text-amber-600' : 'hover:bg-emerald-50 text-slate-400 hover:text-emerald-600')}
                        title={u.active ? 'Deactivate' : 'Activate'}
                      >
                        <Power size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="text-center text-slate-400 py-12">No users found.</td></tr>
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
    { label: 'Departments', value: overview?.totalDepartments ?? departments.length, icon: Layers, accent: 'blue' },
    { label: 'Courses', value: overview?.totalCourses ?? 0, icon: BookOpen, accent: 'violet' },
    { label: 'Sections', value: overview?.totalSections ?? 0, icon: UsersRound, accent: 'emerald' },
    { label: 'Enrollments', value: overview?.totalEnrollments ?? 0, icon: ScrollText, accent: 'amber' },
  ]
  return (
    <div className="space-y-5">
      <PageTitle icon={BookOpen} title="Academic Management" subtitle="Departments, courses, sections, semesters and enrolments." />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s, i) => <StatCard key={s.label} index={i} label={s.label} value={s.value} icon={s.icon} accent={s.accent} />)}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Panel title="Departments" icon={Building2} accent="blue" className="xl:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(deptReports || []).map(d => (
              <div key={d.departmentId} className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 bg-slate-50/60">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-bold text-xs text-indigo-600 shrink-0">
                  {d.departmentCode}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 truncate">{d.departmentName}</p>
                  <p className="text-[11px] text-slate-400">{d.totalStudents} students · {d.totalFaculty} faculty · {d.totalCourses} courses</p>
                </div>
              </div>
            ))}
            {(!deptReports || deptReports.length === 0) && <EmptyState icon={Building2} title="No departments" />}
          </div>
        </Panel>
        <Panel title="Semesters" icon={CalendarDays} accent="violet">
          <div className="space-y-2">
            {(semesters || []).map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{s.name}</p>
                  <p className="text-[11px] text-slate-400">{s.academicYear}</p>
                </div>
                <Badge variant={s.active ? 'success' : 'secondary'}>{s.active ? 'Active' : 'Inactive'}</Badge>
              </div>
            ))}
            {(!semesters || semesters.length === 0) && <EmptyState icon={CalendarDays} title="No semesters" />}
          </div>
        </Panel>
      </div>
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
    <div className="space-y-5">
      <PageTitle icon={ClipboardCheck} title="Attendance Management" subtitle="Department-wise attendance health and at-risk students." />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard index={0} label="Average Attendance" value={overview?.overallAverageAttendance ?? 0} decimals={1} suffix="%" icon={Percent} accent="emerald" />
        <StatCard index={1} label="Above 75%" value={totals.above75} icon={CheckCircle2} accent="blue" />
        <StatCard index={2} label="50% – 75%" value={totals.below75} icon={Activity} accent="amber" />
        <StatCard index={3} label="Below 50%" value={totals.below50} icon={XCircle} accent="violet" />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title="Attendance by Department" icon={BarChart3} accent="indigo">
          {chartData.length === 0 ? <EmptyState icon={BarChart3} title="No data" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} barSize={28} margin={{ top: 6, right: 4, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef1f8" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#8a94ad' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#8a94ad' }} axisLine={false} tickLine={false} />
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
                  <tr key={d.departmentId}>
                    <td className="font-medium text-slate-800">{d.departmentName}</td>
                    <td style={{ textAlign: 'center' }}>{d.totalStudents}</td>
                    <td style={{ textAlign: 'center' }}><Badge variant={d.averageAttendancePercentage >= 75 ? 'success' : d.averageAttendancePercentage >= 50 ? 'warning' : 'destructive'}>{fmtNum(d.averageAttendancePercentage, 1)}%</Badge></td>
                    <td style={{ textAlign: 'center' }} className="text-amber-600 font-semibold">{d.studentsBelow75}</td>
                  </tr>
                ))}
                {(!attendanceSummary || attendanceSummary.length === 0) && <tr><td colSpan={4} className="text-center text-slate-400 py-10">No attendance data.</td></tr>}
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
    <div className="space-y-5">
      <PageTitle icon={BookMarked} title="Examinations & Marks" subtitle="Approve question papers and monitor examination readiness." />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard index={0} label="Pending Approvals" value={pendingQPs.length} icon={Clock} accent="amber" />
        <StatCard index={1} label="Approved" value={pendingQPs.filter(q => q.status === 'APPROVED').length} icon={CheckCircle2} accent="emerald" />
        <StatCard index={2} label="Rejected" value={pendingQPs.filter(q => q.status === 'REJECTED').length} icon={XCircle} accent="violet" />
        <StatCard index={3} label="Total Papers" value={pendingQPs.length} icon={FileText} accent="blue" />
      </div>
      <Panel title="Question Papers Awaiting Approval" icon={FileText} accent="indigo">
        {pendingQPs.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="All caught up" description="No question papers are pending approval." />
        ) : (
          <div className="space-y-2">
            {pendingQPs.map(qp => (
              <div key={qp.id} className="flex flex-wrap items-center gap-3 p-3.5 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                  <FileText size={17} className="text-indigo-600" />
                </div>
                <div className="flex-1 min-w-[180px]">
                  <p className="text-sm font-semibold text-slate-800">{qp.courseName} <span className="text-slate-400 font-normal">({qp.courseCode})</span></p>
                  <p className="text-[11px] text-slate-400">{qp.examType} · {qp.year} · Sem {qp.semesterNumber} · {qp.uploadedByName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="success" size="sm" disabled={loading} onClick={() => onApprove(qp.id)}><CheckCircle2 size={13} /> Approve</Button>
                  <Button variant="destructive" size="sm" disabled={loading} onClick={() => onReject(qp.id)}><X size={13} /> Reject</Button>
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
    <div className="space-y-5">
      <PageTitle icon={Briefcase} title="Placement Management" subtitle="Company drives, applications and placement analytics." />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard index={0} label="Students Placed" value={s?.studentsPlaced ?? 0} icon={Trophy} accent="emerald" />
        <StatCard index={1} label="Offers Extended" value={s?.totalOffersExtended ?? 0} icon={Award} accent="amber" />
        <StatCard index={2} label="Open Postings" value={s?.openJobPostings ?? 0} icon={Briefcase} accent="blue" />
        <StatCard index={3} label="Placement Rate" value={s?.placementRate ?? 0} decimals={1} suffix="%" icon={TrendingUp} accent="violet" />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Panel title="Department Placements" icon={Layers} accent="indigo" className="xl:col-span-2">
          {deptData.length === 0 ? <EmptyState icon={Briefcase} title="No placement data" /> : (
            <div className="overflow-x-auto">
              <table className="collego-table">
                <thead><tr><th>Department</th><th style={{ textAlign: 'center' }}>Students</th><th style={{ textAlign: 'center' }}>Applied</th><th style={{ textAlign: 'center' }}>Placed</th><th style={{ textAlign: 'center' }}>Rate</th></tr></thead>
                <tbody>
                  {deptData.map(d => (
                    <tr key={d.departmentCode}>
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
              <div key={c.companyId} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100">
                <div className="w-7 h-7 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{c.companyName}</p>
                  <p className="text-[11px] text-slate-400">Highest {c.highestPackage || '—'}</p>
                </div>
                <span className="text-sm font-bold text-slate-700">{c.offersExtended}</span>
              </div>
            ))}
            {(!s?.topCompanies || s.topCompanies.length === 0) && <EmptyState icon={Award} title="No recruiters yet" />}
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
    <div className="space-y-5">
      <PageTitle
        icon={BarChart3}
        title="Reports & Analytics"
        subtitle="Department performance, pass percentages and subject-level outcomes."
        actions={
          <div className="flex bg-white border border-slate-200 rounded-xl p-1">
            {[['department', 'Departments'], ['subject', 'Subjects']].map(([id, label]) => (
              <button key={id} onClick={() => setView(id)}
                className={cn('px-4 py-1.5 rounded-lg text-xs font-medium transition-all', view === id ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-800')}>
                {label}
              </button>
            ))}
          </div>
        }
      />
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          {view === 'department' ? (
            <table className="collego-table">
              <thead><tr><th>Department</th><th style={{ textAlign: 'center' }}>Students</th><th style={{ textAlign: 'center' }}>Faculty</th><th style={{ textAlign: 'center' }}>Courses</th><th style={{ textAlign: 'center' }}>Attendance</th><th style={{ textAlign: 'center' }}>Pass %</th></tr></thead>
              <tbody>
                {(deptReports || []).map(d => (
                  <tr key={d.departmentId}>
                    <td className="font-medium text-slate-800">{d.departmentName} <span className="text-slate-400">({d.departmentCode})</span></td>
                    <td style={{ textAlign: 'center' }}>{d.totalStudents}</td>
                    <td style={{ textAlign: 'center' }}>{d.totalFaculty}</td>
                    <td style={{ textAlign: 'center' }}>{d.totalCourses}</td>
                    <td style={{ textAlign: 'center' }}><Badge variant={d.averageAttendance >= 75 ? 'success' : 'warning'}>{fmtNum(d.averageAttendance, 1)}%</Badge></td>
                    <td style={{ textAlign: 'center' }}><Badge variant={d.averagePassPercentage >= 60 ? 'success' : 'warning'}>{fmtNum(d.averagePassPercentage, 1)}%</Badge></td>
                  </tr>
                ))}
                {(!deptReports || deptReports.length === 0) && <tr><td colSpan={6} className="text-center text-slate-400 py-12">No department reports.</td></tr>}
              </tbody>
            </table>
          ) : (
            <table className="collego-table">
              <thead><tr><th>Course</th><th>Section</th><th>Faculty</th><th style={{ textAlign: 'center' }}>Enrolled</th><th style={{ textAlign: 'center' }}>Avg Marks</th><th style={{ textAlign: 'center' }}>Attendance</th><th style={{ textAlign: 'center' }}>Pass %</th></tr></thead>
              <tbody>
                {(subjectReports || []).map(sr => (
                  <tr key={sr.sectionId}>
                    <td className="font-medium text-slate-800">{sr.courseName} <span className="text-slate-400 font-mono text-xs">{sr.courseCode}</span></td>
                    <td>{sr.sectionName}</td>
                    <td className="text-slate-500">{sr.facultyName || '—'}</td>
                    <td style={{ textAlign: 'center' }}>{sr.totalEnrolled}</td>
                    <td style={{ textAlign: 'center' }}>{sr.averageMarks != null ? fmtNum(sr.averageMarks, 1) : '—'}</td>
                    <td style={{ textAlign: 'center' }}><Badge variant={sr.averageAttendance >= 75 ? 'success' : 'warning'}>{fmtNum(sr.averageAttendance, 1)}%</Badge></td>
                    <td style={{ textAlign: 'center' }}><Badge variant={sr.passPercentage >= 60 ? 'success' : 'destructive'}>{fmtNum(sr.passPercentage, 1)}%</Badge></td>
                  </tr>
                ))}
                {(!subjectReports || subjectReports.length === 0) && <tr><td colSpan={7} className="text-center text-slate-400 py-12">No subject reports.</td></tr>}
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
    <div className="space-y-5">
      <PageTitle icon={Megaphone} title="Notices & Events" subtitle="Latest broadcasts and the campus activity calendar." />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title="Recent Notices" icon={Megaphone} accent="amber">
          <div className="space-y-3">
            {notices.map(n => {
              const cfg = NOTICE_TYPES[n.type] || NOTICE_TYPES.GENERAL
              return (
                <div key={n.id} className="p-4 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge variant={cfg.variant} className="text-[10px]">{cfg.label}</Badge>
                    <span className="text-[11px] text-slate-400">{timeAgo(n.createdAt)}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800">{n.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                </div>
              )
            })}
            {notices.length === 0 && <EmptyState icon={Megaphone} title="No notices yet" />}
          </div>
        </Panel>
        <Panel title="Upcoming Events" icon={CalendarDays} accent="indigo">
          <div className="space-y-2">
            {events.map(ev => {
              const color = EVENT_COLORS[ev.category] || '#6366f1'
              const date = ev.date ? new Date(ev.date) : null
              return (
                <div key={ev.id} className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-100">
                  <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl shrink-0" style={{ background: `${color}14`, border: `1px solid ${color}30` }}>
                    <span className="text-[9px] font-bold uppercase" style={{ color }}>{date ? date.toLocaleDateString('en-IN', { month: 'short' }) : '—'}</span>
                    <span className="text-base font-extrabold text-slate-800 leading-none">{date ? date.getDate() : '—'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{ev.title}</p>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1"><MapPin size={10} /> {ev.subtitle || ev.location}</p>
                  </div>
                </div>
              )
            })}
            {events.length === 0 && <EmptyState icon={CalendarDays} title="No upcoming events" />}
          </div>
        </Panel>
      </div>
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
    <div className="space-y-5">
      <PageTitle icon={cfg.icon} title={cfg.title} subtitle="Planned module" />
      <div className="glass-card p-10 flex flex-col items-center text-center">
        <div className={cn('w-20 h-20 rounded-3xl flex items-center justify-center mb-5', a.softBg)}>
          <cfg.icon size={34} className={a.text} />
        </div>
        <h3 className="text-lg font-bold text-slate-900">{cfg.title}</h3>
        <p className="text-sm text-slate-500 max-w-md mt-2">{cfg.copy}</p>
        <Badge variant="info" className="mt-4">Backend-ready · UI rolling out</Badge>
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
  const [query, setQuery] = useState('')

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

  const sidebarWidth = collapsed ? 76 : 248
  const showMsg = useCallback((text, type = 'success') => setToast({ text, type }), [])

  const loadUsers = useCallback(async () => {
    try {
      const res = await api.get('/api/admin/users')
      setUsers(Array.isArray(res.data) ? res.data : res.data?.content || [])
    } catch { /* ignore */ }
  }, [])

  const loadAll = useCallback(async () => {
    const [ovRes, usRes, dpRes, drRes, srRes, asRes, qpRes, psRes, inRes, semRes] = await Promise.allSettled([
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
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const handleLogout = () => { authService.clearTokens(); navigate('/login') }

  const handleCreateUser = async (payload) => {
    setLoading(true)
    try {
      await api.post('/api/admin/users', payload)
      showMsg('User created successfully.')
      await loadUsers()
      return true
    } catch (e) {
      showMsg(e.response?.data?.message || 'Failed to create user.', 'error')
      return false
    } finally { setLoading(false) }
  }

  const handleEditUser = async (id, payload) => {
    setLoading(true)
    try {
      await api.put(`/api/admin/users/${id}`, payload)
      showMsg('User updated successfully.')
      await loadUsers()
      return true
    } catch (e) {
      showMsg(e.response?.data?.message || 'Failed to update user.', 'error')
      return false
    } finally { setLoading(false) }
  }

  const handleToggleActive = async (user) => {
    try {
      await api.put(`/api/admin/users/${user.id}/${user.active ? 'deactivate' : 'activate'}`)
      showMsg(`User ${user.active ? 'deactivated' : 'activated'}.`)
      await loadUsers()
    } catch (e) {
      showMsg(e.response?.data?.message || 'Action failed.', 'error')
    }
  }

  const handleCsvImport = async (file) => {
    setLoading(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await api.post('/api/admin/users/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setImportResult(res.data)
      showMsg(`Import complete: ${res.data.successCount} users created.`)
      await loadUsers()
    } catch (e) {
      showMsg(e.response?.data?.message || 'CSV import failed.', 'error')
    } finally { setLoading(false) }
  }

  const handleApproveQP = async (id) => {
    setLoading(true)
    try {
      await api.put(`/api/admin/question-papers/${id}/approve`)
      showMsg('Question paper approved.')
      setPendingQPs(prev => prev.filter(q => q.id !== id))
    } catch (e) { showMsg(e.response?.data?.message || 'Approval failed.', 'error') }
    finally { setLoading(false) }
  }

  const handleRejectQP = async (id) => {
    setLoading(true)
    try {
      await api.put(`/api/admin/question-papers/${id}/reject`)
      showMsg('Question paper rejected.')
      setPendingQPs(prev => prev.filter(q => q.id !== id))
    } catch (e) { showMsg(e.response?.data?.message || 'Rejection failed.', 'error') }
    finally { setLoading(false) }
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab overview={overview} deptReports={deptReports} attendanceSummary={attendanceSummary}
          placementStats={placementStats} insights={insights} semesters={semesters}
          onTabChange={setActiveTab} onSemesterChange={() => loadAll()} />
      case 'users':
        return <DirectoryTab users={users} departments={departments} loading={loading} query={query}
          title="Student Directory" subtitle="Manage student accounts, profiles and access." icon={GraduationCap}
          onCreateUser={handleCreateUser} onEditUser={handleEditUser} onToggleActive={handleToggleActive}
          onCsvImport={handleCsvImport} importResult={importResult} />
      case 'faculty':
        return <DirectoryTab users={users} departments={departments} loading={loading} query={query} fixedRole="FACULTY"
          title="Faculty Directory" subtitle="Manage faculty accounts and department assignments." icon={Users}
          onCreateUser={handleCreateUser} onEditUser={handleEditUser} onToggleActive={handleToggleActive}
          onCsvImport={handleCsvImport} importResult={importResult} />
      case 'academics':
        return <AcademicsTab departments={departments} overview={overview} semesters={semesters} deptReports={deptReports} />
      case 'attendance':
        return <AttendanceTab attendanceSummary={attendanceSummary} overview={overview} />
      case 'examinations':
        return <ExaminationsTab pendingQPs={pendingQPs} onApprove={handleApproveQP} onReject={handleRejectQP} loading={loading} />
      case 'placements':
        return <PlacementsTab placementStats={placementStats} />
      case 'reports':
        return <ReportsTab deptReports={deptReports} subjectReports={subjectReports} />
      case 'announcements':
        return <NoticesTab insights={insights} />
      case 'fees':
      case 'hostel':
      case 'library':
      case 'aiAssistant':
      case 'settings':
      case 'help':
        return <ComingSoonTab id={activeTab} />
      default:
        return null
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
        user={{ name: 'Admin User', role: 'Administrator', email: authService.getEmail() || 'admin@collego.edu' }}
        placeholder="Search users, courses, notices..."
        notificationCount={pendingQPs.length}
        notifications={(insights?.recentNotices || []).map(n => ({ id: n.id, title: n.title, message: n.message }))}
        onLogout={handleLogout}
        searchValue={query} onSearchChange={setQuery}
      />

      <main className="main-content" style={{ marginLeft: sidebarWidth }}>
        <div className="p-5 md:p-6 max-w-[1600px] mx-auto">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
            {renderTab()}
          </motion.div>
        </div>
      </main>
    </div>
  )
}
