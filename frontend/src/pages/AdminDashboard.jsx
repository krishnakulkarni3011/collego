import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { authService } from '../services/authService'
import api from '../services/api'

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtNum = (n, dp = 1) => (n == null ? '—' : Number(n).toFixed(dp))
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const timeAgo = (ts) => {
  if (!ts) return ''
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} hr ago`
  const d = Math.floor(h / 24)
  if (d === 1) return 'Yesterday'
  return `${d} days ago`
}

// ─── Toast ───────────────────────────────────────────────────────────────────
function Toast({ message }) {
  if (!message?.text) return null
  return (
    <div className={`fixed top-4 right-4 z-[200] px-5 py-3 rounded-xl text-sm font-medium shadow-2xl border transition-all ${
      message.type === 'error'
        ? 'bg-red-500/20 text-red-300 border-red-500/30'
        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
    }`}>
      {message.text}
    </div>
  )
}

// ─── Spinner ─────────────────────────────────────────────────────────────────
function Spinner({ size = 6 }) {
  return (
    <div className="flex items-center justify-center py-8">
      <div className={`w-${size} h-${size} border-2 border-rose-500 border-t-transparent rounded-full animate-spin`} />
    </div>
  )
}

// ─── Sidebar nav items ────────────────────────────────────────────────────────
const NAV_SECTIONS = [
  {
    items: [
      { id: 'overview', label: 'Dashboard', icon: '⊞' },
    ]
  },
  {
    title: 'ACADEMICS',
    items: [
      { id: 'academics', label: 'Academics', icon: '🏛️' },
    ]
  },
  {
    title: 'RESOURCES',
    items: [
      { id: 'questionPapers', label: 'Question Papers', icon: '📄' },
      { id: 'documents', label: 'Documents', icon: '🗄️' },
    ]
  },
  {
    title: 'PLACEMENTS',
    items: [
      { id: 'companies', label: 'Companies', icon: '🏢' },
      { id: 'jobOpportunities', label: 'Job Opportunities', icon: '💼' },
      { id: 'applications', label: 'Applications', icon: '📨' },
      { id: 'placementAnalytics', label: 'Placement Analytics', icon: '📊' },
    ]
  },
  {
    title: 'ADMINISTRATION',
    items: [
      { id: 'users', label: 'User Management', icon: '👥' },
      { id: 'announcements', label: 'Announcements', icon: '📢' },
      { id: 'deptReports', label: 'Reports', icon: '📈' },
      { id: 'audit', label: 'Audit Logs', icon: '🔍' },
      { id: 'backup', label: 'Backup & Restore', icon: '💾' },
    ]
  },
  {
    title: 'AI & INSIGHTS',
    items: [
      { id: 'academicRisk', label: 'Academic Risk', icon: '🤖' },
      { id: 'attendanceRisk', label: 'Attendance Risk', icon: '📉' },
      { id: 'aiAssistant', label: 'AI Assistant', icon: '✨' },
    ]
  },
]

// ─── Sidebar ─────────────────────────────────────────────────────────────────
function Sidebar({ activeTab, onTabChange, collapsed, onToggle }) {
  return (
    <aside
      className={`fixed top-0 left-0 h-screen bg-slate-900 border-r border-slate-800 z-50 flex flex-col transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-800 shrink-0">
        <div className="w-8 h-8 bg-gradient-to-br from-rose-500 to-orange-500 rounded-lg flex items-center justify-center font-bold text-sm shrink-0">
          C
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-white leading-tight whitespace-nowrap">COLLEGO</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest whitespace-nowrap">Admin Portal</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 scrollbar-hide">
        {NAV_SECTIONS.map((section, si) => (
          <div key={si} className="mb-1">
            {section.title && !collapsed && (
              <p className="text-[9px] font-semibold text-slate-600 uppercase tracking-widest px-4 pt-3 pb-1">
                {section.title}
              </p>
            )}
            {section.items.map(item => (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-all rounded-none relative group ${
                  activeTab === item.id
                    ? 'bg-rose-500/15 text-rose-300 border-r-2 border-rose-500'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <span className="text-base shrink-0">{item.icon}</span>
                {!collapsed && (
                  <span className="truncate text-left text-xs font-medium">{item.label}</span>
                )}
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-slate-200 text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg">
                    {item.label}
                  </div>
                )}
              </button>
            ))}
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-slate-800 p-3 shrink-0">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 py-2 text-slate-500 hover:text-slate-300 text-xs rounded-lg hover:bg-slate-800 transition-colors"
        >
          <span>{collapsed ? '→' : '←'}</span>
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  )
}

// ─── Top Navbar ───────────────────────────────────────────────────────────────
function Topbar({ email, pendingCount, onLogout, sidebarWidth }) {
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
  const dayStr = now.toLocaleDateString('en-IN', { weekday: 'long' })
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <header
      className="fixed top-0 right-0 z-40 flex items-center justify-between bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 px-5 py-3"
      style={{ left: sidebarWidth }}
    >
      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 w-72">
          <span className="text-slate-500 text-sm">🔍</span>
          <input
            className="bg-transparent text-sm text-slate-400 placeholder-slate-500 outline-none w-full"
            placeholder="Search students, faculty, subjects..."
          />
          <span className="text-[10px] text-slate-600 bg-slate-700 px-1.5 py-0.5 rounded font-mono hidden md:block">Ctrl+K</span>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        {/* Date */}
        <div className="hidden lg:flex items-center gap-2 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-right">
          <span className="text-slate-500 text-sm">📅</span>
          <div>
            <p className="text-xs font-medium text-slate-200">{dateStr}</p>
            <p className="text-[10px] text-slate-500">{dayStr}</p>
          </div>
        </div>

        {/* Notification bell */}
        <button className="relative p-2 rounded-lg hover:bg-slate-800 transition-colors">
          <span className="text-lg">🔔</span>
          {pendingCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {pendingCount}
            </span>
          )}
        </button>

        {/* User avatar + logout */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-rose-500 to-orange-500 rounded-full flex items-center justify-center text-sm font-bold">
            {email?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <div className="hidden md:block text-right">
            <p className="text-xs font-semibold text-slate-200">{email}</p>
            <p className="text-[10px] text-slate-500">Administrator</p>
          </div>
          <button
            onClick={onLogout}
            className="ml-1 p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
            title="Logout"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, trend, trendLabel, onClick, iconBg = 'from-slate-700 to-slate-600' }) {
  return (
    <div
      onClick={onClick}
      className={`bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-center gap-3 hover:border-slate-700 transition-all ${onClick ? 'cursor-pointer hover:bg-slate-800/50' : ''}`}
    >
      <div className={`w-12 h-12 bg-gradient-to-br ${iconBg} rounded-xl flex items-center justify-center text-xl shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 truncate">{label}</p>
        <p className="text-2xl font-bold text-white leading-tight">{value ?? '—'}</p>
        {trend != null && (
          <p className={`text-[10px] mt-0.5 ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)} {trendLabel}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Metric Wide Card ─────────────────────────────────────────────────────────
function MetricCard({ label, value, unit, trend, trendLabel, icon, color }) {
  const colorMap = {
    blue: 'text-blue-400 border-blue-500/20',
    teal: 'text-teal-400 border-teal-500/20',
    emerald: 'text-emerald-400 border-emerald-500/20',
    violet: 'text-violet-400 border-violet-500/20',
    amber: 'text-amber-400 border-amber-500/20',
  }
  return (
    <div className={`bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex items-center gap-4`}>
      <div className="text-3xl">{icon}</div>
      <div>
        <p className="text-xs text-slate-500 mb-0.5">{label}</p>
        <p className={`text-3xl font-bold ${colorMap[color]?.split(' ')[0] || 'text-white'}`}>
          {value != null ? `${Number(value).toFixed(1)}${unit || ''}` : '—'}
        </p>
        {trend != null && (
          <p className={`text-xs mt-1 ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}% {trendLabel}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── SVG Line Chart (Attendance Trend) ───────────────────────────────────────
function AttendanceTrendChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-600 text-sm">
        No attendance trend data available
      </div>
    )
  }

  const W = 400, H = 140, PAD = { t: 10, r: 10, b: 30, l: 40 }
  const iW = W - PAD.l - PAD.r
  const iH = H - PAD.t - PAD.b

  const vals = data.map(d => d.averageAttendancePercentage || 0)
  const minV = Math.max(0, Math.min(...vals) - 10)
  const maxV = Math.min(100, Math.max(...vals) + 10)
  const range = maxV - minV || 1

  const pts = vals.map((v, i) => ({
    x: PAD.l + (i / Math.max(vals.length - 1, 1)) * iW,
    y: PAD.t + iH - ((v - minV) / range) * iH,
    v
  }))

  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaD = `${pathD} L ${pts[pts.length - 1].x} ${PAD.t + iH} L ${pts[0].x} ${PAD.t + iH} Z`

  const yTicks = [minV, (minV + maxV) / 2, maxV].map(v => Math.round(v))

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 240 }}>
        {/* Grid lines */}
        {yTicks.map((t, i) => {
          const y = PAD.t + iH - ((t - minV) / range) * iH
          return (
            <g key={i}>
              <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="#1e293b" strokeWidth="1" strokeDasharray="3,3" />
              <text x={PAD.l - 4} y={y + 4} textAnchor="end" fontSize="8" fill="#475569">{t}%</text>
            </g>
          )
        })}

        {/* Area fill */}
        <defs>
          <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#attGrad)" />

        {/* Line */}
        <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Dots */}
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill="#3b82f6" stroke="#1e293b" strokeWidth="1.5">
            <title>{data[i]?.departmentName || `Point ${i}`}: {p.v.toFixed(1)}%</title>
          </circle>
        ))}

        {/* X labels */}
        {data.map((d, i) => (
          <text
            key={i}
            x={PAD.l + (i / Math.max(data.length - 1, 1)) * iW}
            y={H - 4}
            textAnchor="middle"
            fontSize="8"
            fill="#475569"
          >
            {d.departmentName?.substring(0, 4) || d.departmentCode || `D${i + 1}`}
          </text>
        ))}
      </svg>
    </div>
  )
}

// ─── Department Performance Bars ─────────────────────────────────────────────
function DeptPerformanceChart({ depts }) {
  if (!depts || depts.length === 0) {
    return <p className="text-slate-600 text-sm py-4">No department data available.</p>
  }

  const BAR_COLORS = ['#10b981', '#8b5cf6', '#6366f1', '#f59e0b', '#ef4444', '#14b8a6']
  const sorted = [...depts].sort((a, b) => (b.averagePassPercentage || 0) - (a.averagePassPercentage || 0)).slice(0, 7)

  return (
    <div className="space-y-3">
      {sorted.map((d, i) => {
        const pct = Number(d.averagePassPercentage || 0).toFixed(1)
        const color = BAR_COLORS[i % BAR_COLORS.length]
        return (
          <div key={d.departmentId} className="flex items-center gap-3">
            <span className="text-xs text-slate-400 w-12 text-right shrink-0">{d.departmentCode || d.departmentName?.substring(0, 4)}</span>
            <div className="flex-1 bg-slate-800 rounded-full h-3 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
              />
            </div>
            <span className="text-xs font-semibold text-slate-300 w-10 shrink-0">{pct}%</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Quick Action Button ──────────────────────────────────────────────────────
function QuickAction({ icon, label, onClick, color = 'slate' }) {
  const colors = {
    emerald: 'hover:border-emerald-500/40 hover:bg-emerald-500/5',
    violet: 'hover:border-violet-500/40 hover:bg-violet-500/5',
    blue: 'hover:border-blue-500/40 hover:bg-blue-500/5',
    amber: 'hover:border-amber-500/40 hover:bg-amber-500/5',
    rose: 'hover:border-rose-500/40 hover:bg-rose-500/5',
    teal: 'hover:border-teal-500/40 hover:bg-teal-500/5',
    fuchsia: 'hover:border-fuchsia-500/40 hover:bg-fuchsia-500/5',
    cyan: 'hover:border-cyan-500/40 hover:bg-cyan-500/5',
    slate: 'hover:border-slate-600 hover:bg-slate-800/50',
  }
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-2 p-4 bg-slate-900/60 border border-slate-800 rounded-xl transition-all active:scale-95 ${colors[color]}`}
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-[11px] text-slate-400 text-center leading-tight">{label}</span>
    </button>
  )
}

// ─── Overview Dashboard Tab ───────────────────────────────────────────────────
function OverviewTab({ overview, deptReports, attendanceSummary, pendingQPs, auditLogs, placementStats, onTabChange, showMsg }) {
  const email = authService.getEmail()
  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  // Requires attention items
  const lowAttendanceCount = attendanceSummary.reduce((s, d) => s + (d.studentsBelow75 || 0), 0)
  const pendingQPCount = pendingQPs.length

  const attentionItems = [
    ...(lowAttendanceCount > 0 ? [{
      icon: '🎓', color: 'rose',
      title: `${lowAttendanceCount} students have attendance below 75%`,
      sub: 'At risk of detention',
      action: 'Review Students', tab: 'attendance',
    }] : []),
    ...(pendingQPCount > 0 ? [{
      icon: '📄', color: 'amber',
      title: `${pendingQPCount} question paper${pendingQPCount > 1 ? 's' : ''} awaiting approval`,
      sub: 'Pending review from admin',
      action: 'Review Papers', tab: 'questionPapers',
    }] : []),
    ...(placementStats?.closingSoonDrives > 0 ? [{
      icon: '💼', color: 'blue',
      title: `${placementStats.closingSoonDrives} placement drives closing soon`,
      sub: 'Registration closing within 48 hours',
      action: 'View Drives', tab: 'jobOpportunities',
    }] : []),
  ]

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div>
        <h2 className="text-2xl font-bold text-white">
          {greeting}, Admin <span>👋</span>
        </h2>
        <p className="text-slate-500 text-sm mt-0.5">Here's what's happening across COLLEGO</p>
      </div>

      {/* Top stat cards row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Students', value: overview?.totalStudents, icon: '🎓', iconBg: 'from-emerald-600 to-teal-600', trend: overview?.newStudentsThisMonth, trendLabel: 'this month', tab: 'students' },
          { label: 'Faculty', value: overview?.totalFaculty, icon: '👨‍🏫', iconBg: 'from-violet-600 to-fuchsia-600', trend: overview?.newFacultyThisMonth, trendLabel: 'this month', tab: 'faculty' },
          { label: 'Departments', value: overview?.totalDepartments, icon: '🏛️', iconBg: 'from-blue-600 to-cyan-600', tab: 'departments' },
          { label: 'Courses', value: overview?.totalCourses, icon: '📚', iconBg: 'from-amber-600 to-orange-600', tab: 'courses' },
          { label: 'Sections', value: overview?.totalSections, icon: '🗂️', iconBg: 'from-pink-600 to-rose-600', tab: 'sections' },
          { label: 'Enrollments', value: overview?.totalEnrollments, icon: '👤', iconBg: 'from-teal-600 to-emerald-600', tab: 'students' },
        ].map(card => (
          <StatCard
            key={card.label}
            label={card.label}
            value={card.value}
            icon={card.icon}
            iconBg={card.iconBg}
            trend={card.trend}
            trendLabel={card.trendLabel}
            onClick={card.tab ? () => onTabChange(card.tab) : undefined}
          />
        ))}
      </div>

      {/* Avg Attendance + Pass Rate */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricCard
          label="Average Attendance"
          value={overview?.overallAverageAttendance}
          unit="%"
          trend={overview?.attendanceTrend}
          trendLabel="vs last month"
          icon="📈"
          color="blue"
        />
        <MetricCard
          label="Pass Rate"
          value={overview?.overallPassPercentage}
          unit="%"
          trend={overview?.passRateTrend}
          trendLabel="vs last semester"
          icon="🎯"
          color="teal"
        />
      </div>

      {/* Requires Attention + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Requires Attention */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <span>⚠️</span> Requires Attention
            </h3>
            <button onClick={() => onTabChange('questionPapers')} className="text-xs text-rose-400 hover:text-rose-300">View All →</button>
          </div>
          <div className="space-y-3">
            {attentionItems.length === 0 ? (
              <p className="text-slate-600 text-sm py-2">🎉 All clear! No issues require attention.</p>
            ) : (
              attentionItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${
                      item.color === 'rose' ? 'bg-rose-500/15' : item.color === 'amber' ? 'bg-amber-500/15' : 'bg-blue-500/15'
                    }`}>
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-200">{item.title}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{item.sub}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onTabChange(item.tab)}
                    className={`shrink-0 text-[10px] font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                      item.color === 'rose' ? 'bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500/25' :
                      item.color === 'amber' ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25' :
                      'bg-blue-500/15 text-blue-300 border-blue-500/30 hover:bg-blue-500/25'
                    }`}
                  >
                    {item.action}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
            <span>⚡</span> Quick Actions
          </h3>
          <div className="grid grid-cols-4 gap-2">
            <QuickAction icon="🎓" label="Add Student" onClick={() => onTabChange('users')} color="emerald" />
            <QuickAction icon="👨‍🏫" label="Add Faculty" onClick={() => onTabChange('users')} color="violet" />
            <QuickAction icon="📢" label="Announcement" onClick={() => onTabChange('announcements')} color="blue" />
            <QuickAction icon="📄" label="Upload Doc" onClick={() => onTabChange('documents')} color="amber" />
            <QuickAction icon="📅" label="Timetable" onClick={() => onTabChange('timetable')} color="teal" />
            <QuickAction icon="📊" label="Generate Report" onClick={() => onTabChange('deptReports')} color="fuchsia" />
            <QuickAction icon="💾" label="Backup DB" onClick={() => onTabChange('backup')} color="rose" />
            <QuickAction icon="🔍" label="Audit Logs" onClick={() => onTabChange('audit')} color="cyan" />
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Attendance Trend */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Attendance Trend</h3>
              <p className="text-[10px] text-slate-500">By Department</p>
            </div>
          </div>
          <AttendanceTrendChart data={attendanceSummary} />
        </div>

        {/* Department Performance */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Department Performance</h3>
              <p className="text-[10px] text-slate-500">Pass Rate</p>
            </div>
          </div>
          <DeptPerformanceChart depts={deptReports} />
        </div>
      </div>

      {/* Placement Overview */}
      {placementStats && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Placement Overview</h3>
            <button onClick={() => onTabChange('placementAnalytics')} className="text-xs text-rose-400 hover:text-rose-300">View All →</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Active Drives', value: placementStats.activeDrives, icon: '💼', color: 'from-rose-600 to-orange-600' },
              { label: 'Students Eligible', value: placementStats.studentsEligible, icon: '🎓', color: 'from-violet-600 to-fuchsia-600' },
              { label: 'Applications', value: placementStats.totalApplications, icon: '📨', color: 'from-blue-600 to-cyan-600' },
              { label: 'Offers Received', value: placementStats.offersReceived, icon: '✅', color: 'from-emerald-600 to-teal-600' },
            ].map(s => (
              <div key={s.label} className="bg-slate-800/50 rounded-xl p-4 flex items-center gap-3">
                <div className={`w-10 h-10 bg-gradient-to-br ${s.color} rounded-lg flex items-center justify-center text-lg`}>{s.icon}</div>
                <div>
                  <p className="text-xs text-slate-500">{s.label}</p>
                  <p className="text-2xl font-bold text-white">{s.value ?? '—'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity + Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Activity */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Recent Activity</h3>
            <button onClick={() => onTabChange('audit')} className="text-xs text-rose-400 hover:text-rose-300">View All →</button>
          </div>
          <div className="space-y-3">
            {auditLogs.slice(0, 5).map((log, i) => (
              <div key={log.id || i} className="flex items-start gap-3">
                <div className="w-7 h-7 bg-slate-800 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5">
                  {log.action?.includes('CREATE') ? '➕' : log.action?.includes('UPDATE') ? '✏️' : log.action?.includes('DELETE') ? '🗑️' : log.action?.includes('LOGIN') ? '🔐' : '📝'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-300 leading-snug truncate">{log.details || log.action}</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">{log.userEmail || 'System'}</p>
                </div>
                <span className="text-[10px] text-slate-600 whitespace-nowrap shrink-0">{timeAgo(log.timestamp)}</span>
              </div>
            ))}
            {auditLogs.length === 0 && <p className="text-slate-600 text-sm">No recent activity.</p>}
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            <button className="text-xs text-rose-400 hover:text-rose-300">View All →</button>
          </div>
          <div className="space-y-3">
            {pendingQPs.slice(0, 3).map((qp, i) => (
              <div key={qp.id || i} className="flex items-start gap-3">
                <span className="w-2 h-2 bg-amber-400 rounded-full mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-300 leading-snug">
                    {qp.courseName} question paper awaiting approval
                  </p>
                </div>
                <span className="text-[10px] text-slate-600 shrink-0">{timeAgo(qp.uploadedAt)}</span>
              </div>
            ))}
            {lowAttendanceCount > 0 && (
              <div className="flex items-start gap-3">
                <span className="w-2 h-2 bg-rose-400 rounded-full mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-300 leading-snug">
                    {lowAttendanceCount} students fell below 75% attendance
                  </p>
                </div>
              </div>
            )}
            {pendingQPs.length === 0 && lowAttendanceCount === 0 && (
              <p className="text-slate-600 text-sm">No new notifications.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Users Tab ────────────────────────────────────────────────────────────────
function UsersTab({ users, departments, showCreateForm, setShowCreateForm, formData, setFormData, onCreateUser, editingUser, setEditingUser, editForm, setEditForm, onEditUser, onToggleActive, csvFile, setCsvFile, onCsvImport, importResult, loading }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">👥 User Management</h2>
        <div className="flex items-center gap-2">
          <input type="file" accept=".csv" onChange={e => setCsvFile(e.target.files?.[0] || null)}
            className="text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-slate-800 file:text-slate-300 file:cursor-pointer" />
          {csvFile && (
            <button onClick={onCsvImport} disabled={loading}
              className="text-xs bg-blue-500/15 text-blue-300 border border-blue-500/30 px-3 py-2 rounded-lg hover:bg-blue-500/25">
              📤 Import CSV
            </button>
          )}
          <button onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 px-4 py-2 rounded-lg text-sm font-medium transition-all">
            {showCreateForm ? 'Cancel' : '+ Create User'}
          </button>
        </div>
      </div>

      {importResult && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-sm">
          <div className="flex gap-4 mb-2">
            <span className="text-emerald-400">✅ {importResult.successCount} success</span>
            <span className="text-red-400">❌ {importResult.failureCount} failed</span>
            <span className="text-slate-400">Total: {importResult.totalProcessed}</span>
          </div>
          {importResult.errors?.length > 0 && (
            <div className="text-xs text-red-300 space-y-1 mt-2 max-h-32 overflow-y-auto">
              {importResult.errors.map((e, i) => <div key={i}>{e}</div>)}
            </div>
          )}
        </div>
      )}

      {showCreateForm && (
        <form onSubmit={onCreateUser} className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Create New User</h3>
          <div className="grid grid-cols-2 gap-3">
            {['firstName', 'lastName', 'email', 'password'].map(field => (
              <div key={field}>
                <label className="text-xs text-slate-400 mb-1 block capitalize">{field.replace(/([A-Z])/g, ' $1')}</label>
                <input type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
                  value={formData[field]} onChange={e => setFormData({ ...formData, [field]: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-rose-500" required />
              </div>
            ))}
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Role</label>
              <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-rose-500">
                <option value="STUDENT">Student</option>
                <option value="FACULTY">Faculty</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Department</label>
              <select value={formData.departmentId} onChange={e => setFormData({ ...formData, departmentId: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-rose-500">
                <option value="">Select Department</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" className="mt-3 bg-gradient-to-r from-rose-600 to-orange-600 px-5 py-2 rounded-lg text-sm font-medium hover:from-rose-500 hover:to-orange-500">
            Create User
          </button>
        </form>
      )}

      {editingUser && (
        <div className="bg-slate-900/50 border border-violet-500/30 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-violet-300 mb-3">Edit User #{editingUser.id}</h3>
          <div className="grid grid-cols-3 gap-3">
            <input value={editForm.firstName} onChange={e => setEditForm({ ...editForm, firstName: e.target.value })}
              placeholder="First Name" className="bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-violet-500" />
            <input value={editForm.lastName} onChange={e => setEditForm({ ...editForm, lastName: e.target.value })}
              placeholder="Last Name" className="bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-violet-500" />
            <input value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })}
              placeholder="Email" className="bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-violet-500" />
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={onEditUser} className="bg-violet-600 hover:bg-violet-500 px-4 py-2 rounded-lg text-sm">Save</button>
            <button onClick={() => setEditingUser(null)} className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900">
            <tr className="text-slate-400 text-xs uppercase">
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-center">Role</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-800/50 transition-colors">
                <td className="px-4 py-3 text-slate-300">{u.email}</td>
                <td className="px-4 py-3 text-slate-200">{u.firstName} {u.lastName}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${
                    u.role === 'ADMIN' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                    u.role === 'FACULTY' ? 'bg-violet-500/20 text-violet-300 border-violet-500/30' :
                    'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  }`}>{u.role}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs ${u.active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                    {u.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {u.role !== 'ADMIN' && (
                    <div className="flex gap-2 justify-center">
                      <button onClick={() => { setEditingUser(u); setEditForm({ firstName: u.firstName, lastName: u.lastName, email: u.email }) }}
                        className="text-xs text-blue-400 hover:text-blue-300">Edit</button>
                      <button onClick={() => onToggleActive(u)}
                        className={`text-xs ${u.active ? 'text-red-400 hover:text-red-300' : 'text-emerald-400 hover:text-emerald-300'}`}>
                        {u.active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <p className="p-4 text-slate-500 text-center text-sm">No users found. Click "Create User" to add one.</p>}
      </div>
      <p className="text-xs text-slate-600">CSV format: email,password,firstName,lastName,role,departmentCode</p>
    </div>
  )
}

// ─── Dept Reports Tab ─────────────────────────────────────────────────────────
function DeptReportsTab({ deptReports }) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4 text-white">🏛️ Department Reports</h2>
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900">
            <tr className="text-slate-400 text-xs uppercase">
              <th className="px-4 py-3 text-left">Department</th>
              <th className="px-4 py-3 text-center">Students</th>
              <th className="px-4 py-3 text-center">Faculty</th>
              <th className="px-4 py-3 text-center">Courses</th>
              <th className="px-4 py-3 text-center">Sections</th>
              <th className="px-4 py-3 text-center">Avg Attendance</th>
              <th className="px-4 py-3 text-center">Pass %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {deptReports.map(d => (
              <tr key={d.departmentId} className="hover:bg-slate-800/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-200">{d.departmentName}</div>
                  <div className="text-xs text-slate-500">{d.departmentCode}</div>
                </td>
                <td className="px-4 py-3 text-center text-emerald-400">{d.totalStudents}</td>
                <td className="px-4 py-3 text-center text-violet-400">{d.totalFaculty}</td>
                <td className="px-4 py-3 text-center text-blue-400">{d.totalCourses}</td>
                <td className="px-4 py-3 text-center text-slate-300">{d.totalSections}</td>
                <td className="px-4 py-3 text-center">
                  <span className={Number(d.averageAttendance) >= 75 ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                    {fmtNum(d.averageAttendance)}%
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={Number(d.averagePassPercentage) >= 60 ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                    {fmtNum(d.averagePassPercentage)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {deptReports.length === 0 && <p className="p-4 text-slate-500 text-center text-sm">No data available.</p>}
      </div>
    </div>
  )
}

// ─── Subject Reports Tab ──────────────────────────────────────────────────────
function SubjectReportsTab({ subjectReports }) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4 text-white">📝 Subject-wise Pass Percentage</h2>
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900">
            <tr className="text-slate-400 text-xs uppercase">
              <th className="px-4 py-3 text-left">Course</th>
              <th className="px-4 py-3 text-left">Section</th>
              <th className="px-4 py-3 text-left">Faculty</th>
              <th className="px-4 py-3 text-center">Enrolled</th>
              <th className="px-4 py-3 text-center">Passed</th>
              <th className="px-4 py-3 text-center">Failed</th>
              <th className="px-4 py-3 text-center">Pass %</th>
              <th className="px-4 py-3 text-center">Avg Marks</th>
              <th className="px-4 py-3 text-center">Attendance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {subjectReports.map(s => (
              <tr key={s.sectionId} className="hover:bg-slate-800/50 transition-colors">
                <td className="px-4 py-3"><div className="font-medium text-slate-200">{s.courseName}</div><div className="text-xs text-slate-500">{s.courseCode}</div></td>
                <td className="px-4 py-3 text-slate-400">{s.sectionName}</td>
                <td className="px-4 py-3 text-slate-400">{s.facultyName || '-'}</td>
                <td className="px-4 py-3 text-center text-slate-300">{s.totalEnrolled}</td>
                <td className="px-4 py-3 text-center text-emerald-400">{s.totalPassed}</td>
                <td className="px-4 py-3 text-center text-red-400">{s.totalFailed}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`font-semibold ${Number(s.passPercentage) >= 60 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtNum(s.passPercentage)}%</span>
                </td>
                <td className="px-4 py-3 text-center text-slate-300">{s.averageMarks || '-'}{s.maxMarks ? `/${s.maxMarks}` : ''}</td>
                <td className="px-4 py-3 text-center"><span className={Number(s.averageAttendance) >= 75 ? 'text-emerald-400' : 'text-amber-400'}>{fmtNum(s.averageAttendance)}%</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {subjectReports.length === 0 && <p className="p-4 text-slate-500 text-center text-sm">No data available.</p>}
      </div>
    </div>
  )
}

// ─── Backlogs Tab ─────────────────────────────────────────────────────────────
function BacklogsTab({ backlogReport }) {
  if (!backlogReport) return <Spinner />
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4 text-white">⚠️ Backlog Analysis</h2>
      <div className="flex gap-4 mb-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-3">
          <div className="text-2xl font-bold text-red-400">{backlogReport.totalStudentsWithBacklogs}</div>
          <div className="text-xs text-slate-500">Students with backlogs</div>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-5 py-3">
          <div className="text-2xl font-bold text-amber-400">{backlogReport.totalBacklogInstances}</div>
          <div className="text-xs text-slate-500">Total backlog subjects</div>
        </div>
      </div>
      <div className="space-y-2">
        {backlogReport.students?.map(s => (
          <div key={s.studentId} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <div>
                <span className="font-medium text-slate-200">{s.studentName}</span>
                <span className="text-xs text-slate-500 ml-2">{s.enrollmentNumber} · {s.departmentName}</span>
              </div>
              <span className="text-xs bg-red-500/15 text-red-300 border border-red-500/30 px-2 py-1 rounded-md">{s.backlogCount} backlogs</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {s.backlogCourses?.map((c, i) => (
                <span key={i} className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">{c.courseName} ({c.courseCode})</span>
              ))}
            </div>
          </div>
        ))}
        {backlogReport.students?.length === 0 && <p className="text-slate-500 text-sm text-center py-8">🎉 No backlogs found!</p>}
      </div>
    </div>
  )
}

// ─── Attendance Summary Tab ───────────────────────────────────────────────────
function AttendanceSummaryTab({ attendanceSummary }) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4 text-white">📋 Department-wise Attendance Summary</h2>
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900">
            <tr className="text-slate-400 text-xs uppercase">
              <th className="px-4 py-3 text-left">Department</th>
              <th className="px-4 py-3 text-center">Total Students</th>
              <th className="px-4 py-3 text-center">Avg Attendance</th>
              <th className="px-4 py-3 text-center">≥75%</th>
              <th className="px-4 py-3 text-center">50-75%</th>
              <th className="px-4 py-3 text-center">&lt;50%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {attendanceSummary.map(a => (
              <tr key={a.departmentId} className="hover:bg-slate-800/50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-200">{a.departmentName}</td>
                <td className="px-4 py-3 text-center text-slate-300">{a.totalStudents}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`font-semibold ${Number(a.averageAttendancePercentage) >= 75 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {fmtNum(a.averageAttendancePercentage)}%
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-emerald-400">{a.studentsAbove75}</td>
                <td className="px-4 py-3 text-center text-amber-400">{a.studentsBelow75}</td>
                <td className="px-4 py-3 text-center text-red-400">{a.studentsBelow50}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {attendanceSummary.length === 0 && <p className="p-4 text-slate-500 text-center text-sm">No attendance data available.</p>}
      </div>
    </div>
  )
}

// ─── Question Papers Tab ──────────────────────────────────────────────────────
function QuestionPapersTab({ pendingQPs, allQPs, onApprove, onReject }) {
  return (
    <div className="space-y-6">
      {pendingQPs.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 text-white">🔔 Pending Approval ({pendingQPs.length})</h2>
          <div className="space-y-2">
            {pendingQPs.map(qp => (
              <div key={qp.id} className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <div className="font-medium text-slate-200">{qp.courseName} <span className="text-xs text-slate-500">({qp.courseCode})</span></div>
                  <div className="text-xs text-slate-500 mt-0.5">{qp.examType} · {qp.year} · Sem {qp.semesterNumber} · {qp.departmentName}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onApprove(qp.id)} className="text-xs bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-lg hover:bg-emerald-500/25">✅ Approve</button>
                  <button onClick={() => onReject(qp.id)} className="text-xs bg-red-500/15 text-red-300 border border-red-500/30 px-3 py-1.5 rounded-lg hover:bg-red-500/25">❌ Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div>
        <h2 className="text-lg font-semibold mb-3 text-white">📄 All Question Papers</h2>
        <div className="space-y-2">
          {allQPs.map(qp => (
            <div key={qp.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex justify-between items-center hover:bg-slate-800/40 transition-colors">
              <div>
                <div className="font-medium text-slate-200">{qp.courseName} <span className="text-xs text-slate-500">({qp.courseCode})</span></div>
                <div className="text-xs text-slate-500 mt-0.5">{qp.examType} · {qp.year} · {qp.departmentName}</div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-md border ${
                qp.status === 'APPROVED' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                qp.status === 'REJECTED' ? 'text-red-400 bg-red-500/10 border-red-500/20' :
                'text-amber-400 bg-amber-500/10 border-amber-500/20'
              }`}>{qp.status}</span>
            </div>
          ))}
          {allQPs.length === 0 && <p className="text-slate-500 text-sm text-center py-8">No question papers uploaded yet.</p>}
        </div>
      </div>
    </div>
  )
}

// ─── Audit Logs Tab ───────────────────────────────────────────────────────────
function AuditLogsTab({ auditLogs }) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4 text-white">🔍 Audit Log</h2>
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900">
            <tr className="text-slate-400 text-xs uppercase">
              <th className="px-4 py-3 text-left">Timestamp</th>
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-left">Action</th>
              <th className="px-4 py-3 text-left">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {auditLogs.map(l => (
              <tr key={l.id} className="hover:bg-slate-800/50 transition-colors">
                <td className="px-4 py-3 text-xs text-slate-500">{new Date(l.timestamp).toLocaleString()}</td>
                <td className="px-4 py-3 text-slate-300">{l.userEmail || 'System'}</td>
                <td className="px-4 py-3"><span className="text-xs bg-blue-500/15 text-blue-300 border border-blue-500/30 px-2 py-1 rounded-md">{l.action}</span></td>
                <td className="px-4 py-3 text-xs text-slate-400">{l.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {auditLogs.length === 0 && <p className="p-4 text-slate-500 text-center text-sm">No audit logs.</p>}
      </div>
    </div>
  )
}

// ─── Backup Tab ───────────────────────────────────────────────────────────────
function BackupTab({ onBackup, loading }) {
  return (
    <div className="max-w-xl">
      <h2 className="text-lg font-semibold mb-4 text-white">💾 Backup & Restore</h2>
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
        <p className="text-sm text-slate-400 mb-4">
          Trigger a full system backup. Backup data is stored securely on the server.
        </p>
        <button
          onClick={onBackup}
          disabled={loading}
          className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 px-5 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? (
            <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" /> Running Backup…</>
          ) : (
            <>💾 Trigger Backup</>
          )}
        </button>
      </div>
    </div>
  )
}

// ─── Placement Analytics Tab ──────────────────────────────────────────────────
function PlacementAnalyticsTab({ placementStats }) {
  if (!placementStats) return <Spinner />
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-white">📊 Placement Analytics</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Drives', value: placementStats.activeDrives, icon: '💼', color: 'rose' },
          { label: 'Students Eligible', value: placementStats.studentsEligible, icon: '🎓', color: 'violet' },
          { label: 'Total Applications', value: placementStats.totalApplications, icon: '📨', color: 'blue' },
          { label: 'Offers Received', value: placementStats.offersReceived, icon: '✅', color: 'emerald' },
        ].map(s => (
          <div key={s.label} className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
            <div className="text-3xl mb-2">{s.icon}</div>
            <div className="text-2xl font-bold text-white">{s.value ?? '—'}</div>
            <div className="text-xs text-slate-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Coming Soon placeholder ──────────────────────────────────────────────────
function ComingSoon({ label }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-slate-600">
      <div className="text-5xl mb-4">🚧</div>
      <p className="text-lg font-medium">{label}</p>
      <p className="text-sm mt-1">This section is coming soon.</p>
    </div>
  )
}

// ─── People Edit Modal ────────────────────────────────────────────────────────
function PeopleEditModal({ user, departments, onSave, onClose }) {
  const [form, setForm] = useState({
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email || '',
    departmentId: '',
  })

  // pre-select current department by matching name → id
  useEffect(() => {
    if (user.departmentName && departments.length > 0) {
      const match = departments.find(d => d.name === user.departmentName)
      if (match) setForm(f => ({ ...f, departmentId: String(match.id) }))
    }
  }, [user.departmentName, departments])

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-white">Edit User</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-lg leading-none">✕</button>
        </div>
        <div className="space-y-3">
          {[['First Name', 'firstName'], ['Last Name', 'lastName'], ['Email', 'email']].map(([label, key]) => (
            <div key={key}>
              <label className="text-xs text-slate-400 block mb-1">{label}</label>
              <input
                value={form[key]}
                onChange={e => setForm({ ...form, [key]: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-violet-500"
              />
            </div>
          ))}
          <div>
            <label className="text-xs text-slate-400 block mb-1">Department</label>
            <select
              value={form.departmentId}
              onChange={e => setForm({ ...form, departmentId: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-violet-500"
            >
              <option value="">— No Department —</option>
              {departments.map(d => (
                <option key={d.id} value={String(d.id)}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button
            onClick={() => onSave({ ...form, departmentId: form.departmentId ? Number(form.departmentId) : null })}
            className="flex-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 py-2 rounded-lg text-sm font-medium transition-all"
          >
            Save Changes
          </button>
          <button onClick={onClose} className="flex-1 bg-slate-800 hover:bg-slate-700 py-2 rounded-lg text-sm transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Dept People List (shared by Students & Faculty) ─────────────────────────
function DeptPeopleList({ people, role, departments, onEdit, onDeactivate, onBack, deptName, loading }) {
  const [search, setSearch] = useState('')
  const filtered = people.filter(p => {
    const q = search.toLowerCase()
    return (
      p.firstName?.toLowerCase().includes(q) ||
      p.lastName?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q)
    )
  })

  const roleColor = role === 'STUDENT'
    ? { badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', accent: 'text-emerald-400' }
    : { badge: 'bg-violet-500/20 text-violet-300 border-violet-500/30', accent: 'text-violet-400' }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button onClick={onBack} className="text-slate-400 hover:text-rose-400 transition-colors flex items-center gap-1">
          <span>←</span>
          <span>{role === 'STUDENT' ? 'Students' : 'Faculty'}</span>
        </button>
        <span className="text-slate-700">/</span>
        <span className="text-white font-medium">{deptName}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">
            {role === 'STUDENT' ? '🎓' : '👨‍🏫'} {deptName} — {role === 'STUDENT' ? 'Students' : 'Faculty'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">{filtered.length} {role === 'STUDENT' ? 'student' : 'faculty member'}{filtered.length !== 1 ? 's' : ''} found</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2">
          <span className="text-slate-500 text-sm">🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Search ${role === 'STUDENT' ? 'students' : 'faculty'}…`}
            className="bg-transparent text-sm text-slate-300 placeholder-slate-500 outline-none w-48"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? <Spinner /> : (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-900">
              <tr className="text-slate-400 text-xs uppercase">
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Joined</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        role === 'STUDENT' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-violet-500/20 text-violet-300'
                      }`}>
                        {(p.firstName?.[0] || '?').toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-200">{p.firstName} {p.lastName}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${roleColor.badge}`}>{p.role}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{p.email}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs ${p.active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>
                      {p.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-slate-500">
                    {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={() => onEdit(p)}
                        className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => onDeactivate(p)}
                        className={`text-xs font-medium transition-colors ${
                          p.active ? 'text-red-400 hover:text-red-300' : 'text-emerald-400 hover:text-emerald-300'
                        }`}
                      >
                        {p.active ? '🚫 Remove' : '✅ Restore'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="p-8 text-slate-500 text-center text-sm">
              {search ? 'No results match your search.' : `No ${role === 'STUDENT' ? 'students' : 'faculty'} in this department yet.`}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Dept Cards Grid (shared by Students & Faculty) ───────────────────────────
function DeptCardsGrid({ departments, allPeople, role, onSelectDept, loading }) {
  const DEPT_COLORS = [
    { bg: 'from-emerald-600/20 to-teal-600/20', border: 'border-emerald-500/20', icon: 'bg-emerald-500/20 text-emerald-300', accent: 'text-emerald-400' },
    { bg: 'from-violet-600/20 to-fuchsia-600/20', border: 'border-violet-500/20', icon: 'bg-violet-500/20 text-violet-300', accent: 'text-violet-400' },
    { bg: 'from-blue-600/20 to-cyan-600/20', border: 'border-blue-500/20', icon: 'bg-blue-500/20 text-blue-300', accent: 'text-blue-400' },
    { bg: 'from-amber-600/20 to-orange-600/20', border: 'border-amber-500/20', icon: 'bg-amber-500/20 text-amber-300', accent: 'text-amber-400' },
    { bg: 'from-rose-600/20 to-pink-600/20', border: 'border-rose-500/20', icon: 'bg-rose-500/20 text-rose-300', accent: 'text-rose-400' },
    { bg: 'from-teal-600/20 to-cyan-600/20', border: 'border-teal-500/20', icon: 'bg-teal-500/20 text-teal-300', accent: 'text-teal-400' },
  ]

  const isStudent = role === 'STUDENT'

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-white">
          {isStudent ? '🎓 Students' : '👨‍🏫 Faculty'} — Select a Department
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">Click a department to view and manage its {isStudent ? 'students' : 'faculty members'}</p>
      </div>

      {loading ? <Spinner /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept, i) => {
            const color = DEPT_COLORS[i % DEPT_COLORS.length]
            const count = allPeople.filter(p => p.departmentName === dept.name).length
            const activeCount = allPeople.filter(p => p.departmentName === dept.name && p.active).length
            return (
              <button
                key={dept.id}
                onClick={() => onSelectDept(dept)}
                className={`text-left bg-gradient-to-br ${color.bg} border ${color.border} rounded-2xl p-5 hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20 active:scale-[0.99] transition-all duration-200 group`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${color.icon}`}>
                    {isStudent ? '🎓' : '👨‍🏫'}
                  </div>
                  <span className="text-[10px] text-slate-500 bg-slate-800/60 px-2 py-1 rounded-lg">{dept.code}</span>
                </div>
                <h3 className="font-semibold text-slate-200 text-sm leading-snug mb-1 group-hover:text-white transition-colors">
                  {dept.name}
                </h3>
                {dept.description && (
                  <p className="text-[11px] text-slate-500 mb-3 line-clamp-2">{dept.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2">
                  <div>
                    <p className={`text-2xl font-bold ${color.accent}`}>{count}</p>
                    <p className="text-[10px] text-slate-500">{isStudent ? 'Students' : 'Faculty'}</p>
                  </div>
                  <div className="h-8 w-px bg-slate-700" />
                  <div>
                    <p className="text-2xl font-bold text-emerald-400">{activeCount}</p>
                    <p className="text-[10px] text-slate-500">Active</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1 text-[11px] text-slate-500 group-hover:text-slate-400 transition-colors">
                  <span>View {isStudent ? 'students' : 'faculty'}</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </button>
            )
          })}
          {departments.length === 0 && (
            <p className="col-span-full text-center text-slate-500 text-sm py-12">
              No departments found. Create departments first.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Students Tab ─────────────────────────────────────────────────────────────
function StudentsTab({ students, departments, loading, onEdit, onToggleActive }) {
  const [selectedDept, setSelectedDept] = useState(null)

  if (selectedDept) {
    const deptStudents = students.filter(s => s.departmentName === selectedDept.name)
    return (
      <DeptPeopleList
        people={deptStudents}
        role="STUDENT"
        departments={departments}
        onEdit={onEdit}
        onDeactivate={onToggleActive}
        onBack={() => setSelectedDept(null)}
        deptName={selectedDept.name}
        loading={loading}
      />
    )
  }

  return (
    <DeptCardsGrid
      departments={departments}
      allPeople={students}
      role="STUDENT"
      onSelectDept={setSelectedDept}
      loading={loading}
    />
  )
}

// ─── Faculty Tab ──────────────────────────────────────────────────────────────
function FacultyTab({ faculty, departments, loading, onEdit, onToggleActive }) {
  const [selectedDept, setSelectedDept] = useState(null)

  if (selectedDept) {
    const deptFaculty = faculty.filter(f => f.departmentName === selectedDept.name)
    return (
      <DeptPeopleList
        people={deptFaculty}
        role="FACULTY"
        departments={departments}
        onEdit={onEdit}
        onDeactivate={onToggleActive}
        onBack={() => setSelectedDept(null)}
        deptName={selectedDept.name}
        loading={loading}
      />
    )
  }

  return (
    <DeptCardsGrid
      departments={departments}
      allPeople={faculty}
      role="FACULTY"
      onSelectDept={setSelectedDept}
      loading={loading}
    />
  )
}

// ─── Academics Tab (unified department-first navigation) ──────────────────────
function AcademicsTab({
  departments, students, faculty, attendanceSummary, subjectReports, backlogReport,
  loading, onEdit, onToggleActive, onFetchStudents, onFetchFaculty,
  onFetchAttendance, onFetchSubjectReports, onFetchBacklogs,
}) {
  const [view, setView] = useState('departments')
  const [selectedDept, setSelectedDept] = useState(null)
  const [selectedYear, setSelectedYear] = useState(null)
  const [selectedSection, setSelectedSection] = useState(null)
  const [sections, setSections] = useState([])
  const [ttMeta, setTtMeta] = useState(null)          // { fileName, uploadedAt } or null
  const [ttLoading, setTtLoading] = useState(false)
  const [ttUploading, setTtUploading] = useState(false)
  const [crForm, setCrForm] = useState({ maleClassRep: '', femaleClassRep: '' })
  const [crEditing, setCrEditing] = useState(false)
  const [sectionDetail, setSectionDetail] = useState(null)

  const YEARS = [
    { label: 'I Year',     semesters: [1, 2], color: 'from-emerald-600/20 to-teal-600/20', border: 'border-emerald-500/20', accent: 'text-emerald-400', icon: '1️⃣' },
    { label: 'II Year',    semesters: [3, 4], color: 'from-violet-600/20 to-fuchsia-600/20', border: 'border-violet-500/20', accent: 'text-violet-400', icon: '2️⃣' },
    { label: 'III Year',   semesters: [5, 6], color: 'from-blue-600/20 to-cyan-600/20', border: 'border-blue-500/20', accent: 'text-blue-400', icon: '3️⃣' },
    { label: 'Final Year', semesters: [7, 8], color: 'from-rose-600/20 to-orange-600/20', border: 'border-rose-500/20', accent: 'text-rose-400', icon: '🎓' },
  ]

  const DEPT_COLORS = [
    { bg: 'from-emerald-600/20 to-teal-600/20', border: 'border-emerald-500/20', icon: 'bg-emerald-500/20 text-emerald-300', accent: 'text-emerald-400' },
    { bg: 'from-violet-600/20 to-fuchsia-600/20', border: 'border-violet-500/20', icon: 'bg-violet-500/20 text-violet-300', accent: 'text-violet-400' },
    { bg: 'from-blue-600/20 to-cyan-600/20', border: 'border-blue-500/20', icon: 'bg-blue-500/20 text-blue-300', accent: 'text-blue-400' },
    { bg: 'from-amber-600/20 to-orange-600/20', border: 'border-amber-500/20', icon: 'bg-amber-500/20 text-amber-300', accent: 'text-amber-400' },
    { bg: 'from-rose-600/20 to-pink-600/20', border: 'border-rose-500/20', icon: 'bg-rose-500/20 text-rose-300', accent: 'text-rose-400' },
    { bg: 'from-teal-600/20 to-cyan-600/20', border: 'border-teal-500/20', icon: 'bg-teal-500/20 text-teal-300', accent: 'text-teal-400' },
  ]

  const SUB_OPTIONS = [
    { id: 'students',       label: 'Students',          icon: '🎓', color: 'from-emerald-600/20 to-teal-600/20', border: 'border-emerald-500/20', accent: 'text-emerald-400' },
    { id: 'faculty',        label: 'Faculty',           icon: '👨‍🏫', color: 'from-violet-600/20 to-fuchsia-600/20', border: 'border-violet-500/20', accent: 'text-violet-400' },
    { id: 'courses',        label: 'Courses & Subjects',icon: '📚', color: 'from-blue-600/20 to-cyan-600/20', border: 'border-blue-500/20', accent: 'text-blue-400' },
    { id: 'sections',       label: 'Sections',          icon: '🗂️', color: 'from-amber-600/20 to-orange-600/20', border: 'border-amber-500/20', accent: 'text-amber-400' },
    { id: 'attendance',     label: 'Attendance',        icon: '📋', color: 'from-teal-600/20 to-cyan-600/20', border: 'border-teal-500/20', accent: 'text-teal-400' },
    { id: 'subjectReports', label: 'Marks & Results',   icon: '📝', color: 'from-indigo-600/20 to-violet-600/20', border: 'border-indigo-500/20', accent: 'text-indigo-400' },
    { id: 'backlogs',       label: 'Backlogs',          icon: '⚠️', color: 'from-red-600/20 to-rose-600/20', border: 'border-red-500/20', accent: 'text-red-400' },
  ]

  const handleSelectDept = (dept) => { setSelectedDept(dept); setView('dept-home') }
  const goToDepts   = () => { setView('departments'); setSelectedDept(null); setSelectedYear(null); setSelectedSection(null) }
  const goToDeptHome = () => { setView('dept-home'); setSelectedYear(null); setSelectedSection(null) }
  const goToYearPicker = () => { setView('students'); setSelectedYear(null) }
  const goToSectionPicker = () => { setView('sections'); setSelectedSection(null); setSectionDetail(null) }

  const handleSelectSubView = async (subId) => {
    setView(subId)
    setSelectedYear(null)
    setSelectedSection(null)
    if (subId === 'students') onFetchStudents()
    if (subId === 'faculty') onFetchFaculty()
    if (subId === 'attendance') onFetchAttendance()
    if (subId === 'subjectReports') onFetchSubjectReports()
    if (subId === 'backlogs') onFetchBacklogs()
    if (subId === 'sections' && selectedDept) {
      try {
        const r = await api.get(`/api/sections?departmentId=${selectedDept.id}`)
        setSections(r.data)
      } catch (e) { console.error(e) }
    }
  }

  const handleSelectSection = async (sectionName) => {
    setSelectedSection(sectionName)
    // find all section objects matching this name in this dept
    const matched = sections.filter(s => s.name === sectionName)
    setSectionDetail(matched[0] || null)
    if (matched[0]) {
      setCrForm({ maleClassRep: matched[0].maleClassRep || '', femaleClassRep: matched[0].femaleClassRep || '' })
    }
    setTtMeta(null)
    // load timetable PDF meta for this section
    setTtLoading(true)
    try {
      const r = await api.get(`/api/sections/${matched[0]?.id}/timetable/meta`)
      setTtMeta(r.data || null)
    } catch (e) {
      setTtMeta(null) // 204 = no timetable
    } finally { setTtLoading(false) }
  }

  const handleUploadPdf = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !sectionDetail) return
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('Only PDF files are allowed.')
      return
    }
    setTtUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await api.post(`/api/admin/sections/${sectionDetail.id}/timetable`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setTtMeta(r.data)
    } catch (err) { alert(err.response?.data?.message || 'Upload failed') }
    finally { setTtUploading(false) }
  }

  const handleDeletePdf = async () => {
    if (!sectionDetail) return
    if (!confirm('Delete the timetable for this section?')) return
    try {
      await api.delete(`/api/admin/sections/${sectionDetail.id}/timetable`)
      setTtMeta(null)
    } catch (err) { alert('Failed to delete timetable') }
  }

  const handleViewPdf = async () => {
    if (!sectionDetail) return
    try {
      const r = await api.get(`/api/sections/${sectionDetail.id}/timetable`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }))
      window.open(url, '_blank')
      // revoke after a short delay to allow the tab to load
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } catch (err) { alert('Failed to open timetable') }
  }

  const handleSaveCR = async () => {
    if (!sectionDetail) return
    // Save for all sections with same name in this dept
    const matched = sections.filter(s => s.name === selectedSection)
    try {
      for (const sec of matched) {
        await api.put(`/api/admin/sections/${sec.id}/class-reps`, crForm)
      }
      setSectionDetail(prev => prev ? { ...prev, ...crForm } : prev)
      setCrEditing(false)
    } catch (err) { alert('Failed to update CR') }
  }

  // ── Breadcrumb ──
  const Breadcrumb = () => {
    const subLabel = SUB_OPTIONS.find(o => o.id === view)?.label
    return (
      <div className="flex items-center gap-2 text-sm mb-5 flex-wrap">
        <button onClick={goToDepts} className="text-slate-400 hover:text-rose-400 transition-colors">Academics</button>
        {selectedDept && (
          <>
            <span className="text-slate-700">/</span>
            <button onClick={goToDeptHome} className={`${view === 'dept-home' ? 'text-white font-medium' : 'text-slate-400 hover:text-rose-400 transition-colors'}`}>{selectedDept.name}</button>
          </>
        )}
        {view !== 'departments' && view !== 'dept-home' && subLabel && (
          <>
            <span className="text-slate-700">/</span>
            <button
              onClick={view === 'students' ? goToYearPicker : view === 'sections' ? goToSectionPicker : undefined}
              className={`${(selectedYear || selectedSection) ? 'text-slate-400 hover:text-rose-400 transition-colors' : 'text-white font-medium'}`}
            >
              {subLabel}
            </button>
          </>
        )}
        {selectedYear && (
          <>
            <span className="text-slate-700">/</span>
            <span className="text-white font-medium">{selectedYear.label}</span>
          </>
        )}
        {selectedSection && (
          <>
            <span className="text-slate-700">/</span>
            <span className="text-white font-medium">Section {selectedSection}</span>
          </>
        )}
      </div>
    )
  }

  // ── Department grid ──
  if (view === 'departments') {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-white">🏛️ Academics — Select a Department</h2>
          <p className="text-xs text-slate-500 mt-0.5">Choose a department to manage its students, faculty, courses, attendance and more</p>
        </div>
        {loading ? <Spinner /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((dept, i) => {
              const color = DEPT_COLORS[i % DEPT_COLORS.length]
              const studentCount = students.filter(s => s.departmentName === dept.name).length
              const facultyCount = faculty.filter(f => f.departmentName === dept.name).length
              return (
                <button key={dept.id} onClick={() => handleSelectDept(dept)}
                  className={`text-left bg-gradient-to-br ${color.bg} border ${color.border} rounded-2xl p-5 hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20 active:scale-[0.99] transition-all duration-200 group`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${color.icon}`}>🏛️</div>
                    <span className="text-[10px] text-slate-500 bg-slate-800/60 px-2 py-1 rounded-lg">{dept.code}</span>
                  </div>
                  <h3 className="font-semibold text-slate-200 text-sm leading-snug mb-1 group-hover:text-white transition-colors">{dept.name}</h3>
                  {dept.description && <p className="text-[11px] text-slate-500 mb-3 line-clamp-2">{dept.description}</p>}
                  <div className="flex items-center gap-4 mt-3">
                    <div><p className={`text-xl font-bold ${color.accent}`}>{studentCount}</p><p className="text-[10px] text-slate-500">Students</p></div>
                    <div className="h-8 w-px bg-slate-700" />
                    <div><p className={`text-xl font-bold ${color.accent}`}>{facultyCount}</p><p className="text-[10px] text-slate-500">Faculty</p></div>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-[11px] text-slate-500 group-hover:text-slate-400 transition-colors">
                    <span>Open Department</span><span className="group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </button>
              )
            })}
            {departments.length === 0 && <p className="col-span-full text-center text-slate-500 text-sm py-12">No departments found.</p>}
          </div>
        )}
      </div>
    )
  }

  // ── Department sub-options home ──
  if (view === 'dept-home') {
    return (
      <div className="space-y-5">
        <Breadcrumb />
        <div>
          <h2 className="text-lg font-semibold text-white">🏛️ {selectedDept?.name}</h2>
          <p className="text-xs text-slate-500 mt-0.5">Select a section to manage</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {SUB_OPTIONS.map(opt => (
            <button key={opt.id} onClick={() => handleSelectSubView(opt.id)}
              className={`text-left bg-gradient-to-br ${opt.color} border ${opt.border} rounded-2xl p-5 hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20 active:scale-[0.99] transition-all duration-200 group flex flex-col items-start gap-3`}
            >
              <span className="text-3xl">{opt.icon}</span>
              <div>
                <p className={`font-semibold text-sm ${opt.accent} group-hover:text-white transition-colors`}>{opt.label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5 group-hover:text-slate-400 transition-colors">Manage →</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const deptStudents      = students.filter(s => s.departmentName === selectedDept?.name)
  const deptFaculty       = faculty.filter(f => f.departmentName === selectedDept?.name)
  const deptAttendance    = attendanceSummary.filter(a => a.departmentName === selectedDept?.name)

  return (
    <div className="space-y-4">
      <Breadcrumb />

      {/* ─── STUDENTS: Year Picker ─── */}
      {view === 'students' && !selectedYear && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-white">🎓 {selectedDept?.name} — Select Year</h2>
            <p className="text-xs text-slate-500 mt-0.5">Choose a year to view students</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {YEARS.map(yr => {
              const count = deptStudents.filter(s => yr.semesters.includes(s.semester)).length
              return (
                <button key={yr.label} onClick={() => setSelectedYear(yr)}
                  className={`text-left bg-gradient-to-br ${yr.color} border ${yr.border} rounded-2xl p-6 hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20 active:scale-[0.99] transition-all duration-200 group flex flex-col items-start gap-4`}
                >
                  <span className="text-4xl">{yr.icon}</span>
                  <div>
                    <p className={`font-bold text-base ${yr.accent} group-hover:text-white transition-colors`}>{yr.label}</p>
                    <p className="text-xs text-slate-500 mt-1">Sem {yr.semesters.join(' & ')}</p>
                    <p className={`text-2xl font-bold mt-2 ${yr.accent}`}>{count}</p>
                    <p className="text-[10px] text-slate-500">Students enrolled</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ─── STUDENTS: Year filtered list ─── */}
      {view === 'students' && selectedYear && (
        <DeptPeopleList
          people={deptStudents.filter(s => selectedYear.semesters.includes(s.semester))}
          role="STUDENT"
          departments={departments}
          onEdit={onEdit}
          onDeactivate={onToggleActive}
          onBack={goToYearPicker}
          deptName={`${selectedDept?.name} — ${selectedYear.label}`}
          loading={loading}
        />
      )}

      {/* ─── FACULTY ─── */}
      {view === 'faculty' && (
        <DeptPeopleList people={deptFaculty} role="FACULTY" departments={departments}
          onEdit={onEdit} onDeactivate={onToggleActive} onBack={goToDeptHome} deptName={selectedDept?.name} loading={loading} />
      )}

      {/* ─── ATTENDANCE ─── */}
      {view === 'attendance' && (
        deptAttendance.length > 0
          ? <AttendanceSummaryTab attendanceSummary={deptAttendance} />
          : <p className="py-12 text-center text-slate-500 text-sm">No attendance data for {selectedDept?.name}.</p>
      )}

      {view === 'subjectReports' && <SubjectReportsTab subjectReports={subjectReports} />}
      {view === 'backlogs'       && <BacklogsTab backlogReport={backlogReport} />}
      {view === 'courses'        && <ComingSoon label="Courses & Subjects" />}

      {/* ─── SECTIONS: Section A/B picker ─── */}
      {view === 'sections' && !selectedSection && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-white">🗂️ {selectedDept?.name} — Sections</h2>
            <p className="text-xs text-slate-500 mt-0.5">Select a section to view timetable and students</p>
          </div>
          {/* Unique section names in this dept (from enrolled students) */}
          {(() => {
            const sectionNames = [...new Set([
              ...deptStudents.map(s => s.section).filter(Boolean),
              ...sections.map(s => s.name).filter(Boolean),
            ])].sort()
            const displaySections = sectionNames.length > 0 ? sectionNames : ['A', 'B']
            return (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {displaySections.map((name, i) => {
                  const secStudents = deptStudents.filter(s => s.section === name)
                  const colors = [
                    { bg: 'from-amber-600/20 to-orange-600/20', border: 'border-amber-500/20', accent: 'text-amber-400' },
                    { bg: 'from-cyan-600/20 to-blue-600/20',   border: 'border-cyan-500/20',  accent: 'text-cyan-400' },
                    { bg: 'from-pink-600/20 to-rose-600/20',   border: 'border-pink-500/20',  accent: 'text-pink-400' },
                    { bg: 'from-teal-600/20 to-emerald-600/20',border: 'border-teal-500/20',  accent: 'text-teal-400' },
                  ]
                  const c = colors[i % colors.length]
                  return (
                    <button key={name} onClick={() => handleSelectSection(name)}
                      className={`text-left bg-gradient-to-br ${c.bg} border ${c.border} rounded-2xl p-6 hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20 active:scale-[0.99] transition-all duration-200 group flex flex-col items-start gap-4`}
                    >
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl font-bold ${c.accent} bg-slate-800/60`}>{name}</div>
                      <div>
                        <p className={`font-bold text-base ${c.accent} group-hover:text-white transition-colors`}>Section {name}</p>
                        <p className={`text-2xl font-bold mt-2 ${c.accent}`}>{secStudents.length}</p>
                        <p className="text-[10px] text-slate-500">Students</p>
                      </div>
                      <p className="text-[11px] text-slate-500 group-hover:text-slate-400 transition-colors">View details →</p>
                    </button>
                  )
                })}
              </div>
            )
          })()}
        </div>
      )}

      {/* ─── SECTIONS: Section detail (timetable + student list + CR) ─── */}
      {view === 'sections' && selectedSection && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-white">🗂️ {selectedDept?.name} — Section {selectedSection}</h2>

          {/* Class Representatives */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">🏅 Class Representatives</h3>
              <button onClick={() => setCrEditing(e => !e)} className="text-xs text-rose-400 hover:text-rose-300">
                {crEditing ? 'Cancel' : 'Edit CRs'}
              </button>
            </div>
            {crEditing ? (
              <div className="flex gap-3 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-xs text-slate-400 mb-1 block">👨 Male CR Name</label>
                  <input value={crForm.maleClassRep} onChange={e => setCrForm(f => ({...f, maleClassRep: e.target.value}))}
                    placeholder="e.g. Arjun Sharma"
                    className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-rose-500" />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="text-xs text-slate-400 mb-1 block">👩 Female CR Name</label>
                  <input value={crForm.femaleClassRep} onChange={e => setCrForm(f => ({...f, femaleClassRep: e.target.value}))}
                    placeholder="e.g. Priya Patel"
                    className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-rose-500" />
                </div>
                <div className="flex items-end">
                  <button onClick={handleSaveCR} className="bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 px-4 py-2 rounded-lg text-sm font-medium transition-all">Save</button>
                </div>
              </div>
            ) : (
              <div className="flex gap-6">
                <div className="flex items-center gap-3 bg-slate-800/50 rounded-xl px-4 py-3">
                  <span className="text-2xl">👨</span>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Male CR</p>
                    <p className="text-sm font-semibold text-emerald-300">{sectionDetail?.maleClassRep || crForm.maleClassRep || '— Not set —'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-slate-800/50 rounded-xl px-4 py-3">
                  <span className="text-2xl">👩</span>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Female CR</p>
                    <p className="text-sm font-semibold text-violet-300">{sectionDetail?.femaleClassRep || crForm.femaleClassRep || '— Not set —'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Timetable PDF */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-5">
              <span className="text-2xl">📅</span>
              <div>
                <h3 className="text-sm font-semibold text-white">Timetable — Section {selectedSection}</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">One PDF timetable per section. Upload to add or replace.</p>
              </div>
            </div>

            {ttLoading ? <Spinner /> : ttMeta ? (
              /* ── Timetable exists ── */
              <div className="flex items-center gap-4 bg-slate-800/60 border border-slate-700 rounded-xl px-5 py-4">
                <span className="text-3xl shrink-0">📄</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-200 truncate">{ttMeta.fileName}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Uploaded {new Date(ttMeta.uploadedAt).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={handleViewPdf}
                    className="flex items-center gap-1.5 bg-blue-500/15 text-blue-300 border border-blue-500/30 px-3 py-1.5 rounded-lg text-xs hover:bg-blue-500/25 transition-colors">
                    👁️ View
                  </button>
                  <label className="flex items-center gap-1.5 bg-amber-500/15 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-lg text-xs hover:bg-amber-500/25 transition-colors cursor-pointer">
                    {ttUploading ? '⏳ Uploading…' : '🔄 Replace'}
                    <input type="file" accept=".pdf" className="hidden" onChange={handleUploadPdf} disabled={ttUploading} />
                  </label>
                  <button onClick={handleDeletePdf}
                    className="flex items-center gap-1.5 bg-red-500/15 text-red-300 border border-red-500/30 px-3 py-1.5 rounded-lg text-xs hover:bg-red-500/25 transition-colors">
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ) : (
              /* ── No timetable yet ── */
              <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-700 hover:border-rose-500/50 rounded-xl p-10 cursor-pointer transition-colors group">
                <span className="text-5xl group-hover:scale-110 transition-transform">📤</span>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">
                    {ttUploading ? 'Uploading…' : 'Upload Timetable PDF'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Click to select a PDF file from your device</p>
                  <p className="text-[10px] text-slate-600 mt-1">Only PDF files · One per section</p>
                </div>
                <input type="file" accept=".pdf" className="hidden" onChange={handleUploadPdf} disabled={ttUploading} />
              </label>
            )}
          </div>

          {/* Students in this section */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">🎓 Students — Section {selectedSection}</h3>
            {(() => {
              const secStudents = deptStudents.filter(s => s.section === selectedSection)
              const maleCR   = sectionDetail?.maleClassRep   || crForm.maleClassRep
              const femaleCR = sectionDetail?.femaleClassRep  || crForm.femaleClassRep
              const crStudents = secStudents.filter(s => {
                const full = `${s.firstName} ${s.lastName}`.toLowerCase()
                return (maleCR && full.includes(maleCR.toLowerCase().split(' ')[0]?.toLowerCase())) ||
                       (femaleCR && full.includes(femaleCR.toLowerCase().split(' ')[0]?.toLowerCase()))
              })
              const otherStudents = secStudents.filter(s => !crStudents.includes(s))

              return secStudents.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-8">No students found in Section {selectedSection}.</p>
              ) : (
                <div className="space-y-1.5">
                  {/* CR students pinned on top */}
                  {maleCR && (
                    <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5">
                      <span className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-xs font-bold shrink-0">♂</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-emerald-300">{maleCR}</p>
                        <p className="text-[10px] text-slate-500">Male Class Representative</p>
                      </div>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">CR</span>
                    </div>
                  )}
                  {femaleCR && (
                    <div className="flex items-center gap-3 bg-violet-500/10 border border-violet-500/20 rounded-xl px-4 py-2.5">
                      <span className="w-8 h-8 rounded-full bg-violet-500/20 text-violet-300 flex items-center justify-center text-xs font-bold shrink-0">♀</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-violet-300">{femaleCR}</p>
                        <p className="text-[10px] text-slate-500">Female Class Representative</p>
                      </div>
                      <span className="text-[10px] bg-violet-500/20 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded-full">CR</span>
                    </div>
                  )}
                  {(maleCR || femaleCR) && otherStudents.length > 0 && (
                    <div className="h-px bg-slate-800 my-2" />
                  )}
                  {/* Remaining students */}
                  {otherStudents.map(s => (
                    <div key={s.id} className="flex items-center gap-3 bg-slate-800/40 border border-slate-700/50 rounded-xl px-4 py-2.5 hover:bg-slate-800/70 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold shrink-0">
                        {(s.firstName?.[0] || '?').toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-200">{s.firstName} {s.lastName}</p>
                        <p className="text-[10px] text-slate-500">{s.email}</p>
                      </div>
                      <span className="text-[10px] text-slate-500">Sem {s.semester || '—'}</span>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
function AdminDashboard() {
  const navigate = useNavigate()
  const email = authService.getEmail()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })

  // Data state
  const [overview, setOverview] = useState(null)
  const [users, setUsers] = useState([])
  const [students, setStudents] = useState([])
  const [faculty, setFaculty] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [deptReports, setDeptReports] = useState([])
  const [subjectReports, setSubjectReports] = useState([])
  const [backlogReport, setBacklogReport] = useState(null)
  const [attendanceSummary, setAttendanceSummary] = useState([])
  const [pendingQPs, setPendingQPs] = useState([])
  const [allQPs, setAllQPs] = useState([])
  const [departments, setDepartments] = useState([])
  const [placementStats, setPlacementStats] = useState(null)

  // Inline edit modal state (used by Students & Faculty tabs)
  const [editingPerson, setEditingPerson] = useState(null)

  // User form state
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({ email: '', password: '', firstName: '', lastName: '', role: 'STUDENT', departmentId: '' })
  const [csvFile, setCsvFile] = useState(null)
  const [importResult, setImportResult] = useState(null)
  const [editingUser, setEditingUser] = useState(null)
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', email: '' })

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 4000)
  }

  // Fetch functions
  const fetchOverview     = async () => { try { const r = await api.get('/api/admin/overview'); setOverview(r.data) } catch (e) { console.error(e) } }
  const fetchUsers        = async () => { try { const r = await api.get('/api/admin/users'); setUsers(r.data) } catch (e) { console.error(e) } }
  const fetchStudents     = async () => { try { const r = await api.get('/api/admin/users?role=STUDENT'); setStudents(r.data) } catch (e) { console.error(e) } }
  const fetchFaculty      = async () => { try { const r = await api.get('/api/admin/users?role=FACULTY'); setFaculty(r.data) } catch (e) { console.error(e) } }
  const fetchDepartments  = async () => { try { const r = await api.get('/api/departments'); setDepartments(r.data) } catch (e) { console.error(e) } }
  const fetchAuditLogs    = async () => { try { const r = await api.get('/api/admin/audit-logs'); setAuditLogs(r.data) } catch (e) { console.error(e) } }
  const fetchDeptReports  = async () => { try { const r = await api.get('/api/admin/reports/departments'); setDeptReports(r.data) } catch (e) { console.error(e) } }
  const fetchSubjectReports = async () => { try { const r = await api.get('/api/admin/reports/subjects'); setSubjectReports(r.data) } catch (e) { console.error(e) } }
  const fetchBacklogs     = async () => { try { const r = await api.get('/api/admin/reports/backlogs'); setBacklogReport(r.data) } catch (e) { console.error(e) } }
  const fetchAttendanceSummary = async () => { try { const r = await api.get('/api/admin/reports/attendance'); setAttendanceSummary(r.data) } catch (e) { console.error(e) } }
  const fetchPendingQPs   = async () => { try { const r = await api.get('/api/admin/question-papers/pending'); setPendingQPs(r.data) } catch (e) { console.error(e) } }
  const fetchAllQPs       = async () => { try { const r = await api.get('/api/admin/question-papers'); setAllQPs(r.data) } catch (e) { console.error(e) } }
  const fetchPlacementStats = async () => { try { const r = await api.get('/api/placement/stats'); setPlacementStats(r.data) } catch (e) { console.error(e) } }

  // Initial load: fetch everything for the dashboard
  useEffect(() => {
    Promise.allSettled([
      fetchOverview(),
      fetchDepartments(),
      fetchAttendanceSummary(),
      fetchPendingQPs(),
      fetchAuditLogs(),
      fetchDeptReports(),
      fetchPlacementStats(),
    ])
  }, [])

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    if (tab === 'academics') { fetchStudents(); fetchFaculty() }  // pre-load counts for dept cards
    if (tab === 'users') fetchUsers()
    if (tab === 'audit') fetchAuditLogs()
    if (tab === 'deptReports') fetchDeptReports()
    if (tab === 'questionPapers') { fetchPendingQPs(); fetchAllQPs() }
    if (tab === 'placementAnalytics') fetchPlacementStats()
    if (tab === 'overview') { fetchOverview(); fetchAttendanceSummary(); fetchPendingQPs(); fetchAuditLogs(); fetchDeptReports(); fetchPlacementStats() }
  }

  // Shared edit handler for Students & Faculty tabs
  const handlePersonEdit = async (payload) => {
    if (!editingPerson) return
    try {
      await api.put(`/api/admin/users/${editingPerson.id}`, payload)
      showMsg('User updated successfully')
      setEditingPerson(null)
      // Refresh whichever list is active
      if (activeTab === 'students') fetchStudents()
      if (activeTab === 'faculty') fetchFaculty()
    } catch (err) { showMsg(err.response?.data?.message || 'Failed to update user', 'error') }
  }

  const handlePersonToggleActive = async (person) => {
    try {
      if (person.active) { await api.put(`/api/admin/users/${person.id}/deactivate`) }
      else { await api.put(`/api/admin/users/${person.id}/activate`) }
      showMsg(person.active ? 'User deactivated' : 'User restored')
      if (activeTab === 'students') fetchStudents()
      if (activeTab === 'faculty') fetchFaculty()
    } catch (err) { showMsg(err.response?.data?.message || 'Failed', 'error') }
  }

  const handleLogout = async () => { await authService.logout(); navigate('/login') }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    try {
      await api.post('/api/admin/users', formData)
      showMsg('User created successfully')
      setFormData({ email: '', password: '', firstName: '', lastName: '', role: 'STUDENT', departmentId: '' })
      setShowCreateForm(false)
      fetchUsers()
    } catch (err) { showMsg(err.response?.data?.message || 'Failed to create user', 'error') }
  }

  const handleToggleActive = async (user) => {
    try {
      if (user.active) { await api.put(`/api/admin/users/${user.id}/deactivate`) }
      else { await api.put(`/api/admin/users/${user.id}/activate`) }
      fetchUsers()
    } catch (err) { showMsg(err.response?.data?.message || 'Failed', 'error') }
  }

  const handleEditUser = async () => {
    try {
      await api.put(`/api/admin/users/${editingUser.id}`, editForm)
      showMsg('User updated')
      setEditingUser(null)
      fetchUsers()
    } catch (err) { showMsg(err.response?.data?.message || 'Failed to update', 'error') }
  }

  const handleCsvImport = async () => {
    if (!csvFile) return
    try {
      setLoading(true)
      const fd = new FormData()
      fd.append('file', csvFile)
      const r = await api.post('/api/admin/users/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setImportResult(r.data)
      showMsg(`Imported ${r.data.successCount}/${r.data.totalProcessed} users`)
      setCsvFile(null)
    } catch (err) { showMsg(err.response?.data?.message || 'Import failed', 'error') }
    finally { setLoading(false) }
  }

  const handleApproveQP = async (id) => {
    try { await api.put(`/api/admin/question-papers/${id}/approve`); showMsg('Approved'); fetchPendingQPs(); fetchAllQPs() }
    catch (err) { showMsg(err.response?.data?.message || 'Failed', 'error') }
  }

  const handleRejectQP = async (id) => {
    try { await api.put(`/api/admin/question-papers/${id}/reject`); showMsg('Rejected'); fetchPendingQPs(); fetchAllQPs() }
    catch (err) { showMsg(err.response?.data?.message || 'Failed', 'error') }
  }

  const handleBackup = async () => {
    try {
      setLoading(true)
      const r = await api.post('/api/admin/backup')
      showMsg(r.data.message)
    } catch (err) { showMsg(err.response?.data?.message || 'Backup failed', 'error') }
    finally { setLoading(false) }
  }

  const sidebarWidth = sidebarCollapsed ? 64 : 224 // px

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Toast message={message} />

      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(v => !v)}
      />

      <Topbar
        email={email}
        pendingCount={pendingQPs.length}
        onLogout={handleLogout}
        sidebarWidth={sidebarWidth}
      />

      {/* Main Content */}
      <main
        className="pt-16 min-h-screen transition-all duration-300"
        style={{ marginLeft: sidebarWidth }}
      >
        <div className="p-5 max-w-screen-2xl mx-auto">

          {activeTab === 'overview' && (
            <OverviewTab
              overview={overview}
              deptReports={deptReports}
              attendanceSummary={attendanceSummary}
              pendingQPs={pendingQPs}
              auditLogs={auditLogs}
              placementStats={placementStats}
              onTabChange={handleTabChange}
              showMsg={showMsg}
            />
          )}

          {activeTab === 'users' && (
            <UsersTab
              users={users}
              departments={departments}
              showCreateForm={showCreateForm}
              setShowCreateForm={setShowCreateForm}
              formData={formData}
              setFormData={setFormData}
              onCreateUser={handleCreateUser}
              editingUser={editingUser}
              setEditingUser={setEditingUser}
              editForm={editForm}
              setEditForm={setEditForm}
              onEditUser={handleEditUser}
              onToggleActive={handleToggleActive}
              csvFile={csvFile}
              setCsvFile={setCsvFile}
              onCsvImport={handleCsvImport}
              importResult={importResult}
              loading={loading}
            />
          )}

          {activeTab === 'deptReports' && <DeptReportsTab deptReports={deptReports} />}
          {activeTab === 'questionPapers' && <QuestionPapersTab pendingQPs={pendingQPs} allQPs={allQPs} onApprove={handleApproveQP} onReject={handleRejectQP} />}
          {activeTab === 'audit' && <AuditLogsTab auditLogs={auditLogs} />}
          {activeTab === 'backup' && <BackupTab onBackup={handleBackup} loading={loading} />}
          {activeTab === 'placementAnalytics' && <PlacementAnalyticsTab placementStats={placementStats} />}

          {activeTab === 'academics' && (
            <AcademicsTab
              departments={departments}
              students={students}
              faculty={faculty}
              attendanceSummary={attendanceSummary}
              subjectReports={subjectReports}
              backlogReport={backlogReport}
              loading={loading}
              onEdit={setEditingPerson}
              onToggleActive={handlePersonToggleActive}
              onFetchStudents={fetchStudents}
              onFetchFaculty={fetchFaculty}
              onFetchAttendance={fetchAttendanceSummary}
              onFetchSubjectReports={fetchSubjectReports}
              onFetchBacklogs={fetchBacklogs}
            />
          )}

          {/* Edit modal rendered at root level so it floats above everything */}
          {editingPerson && (
            <PeopleEditModal
              user={editingPerson}
              departments={departments}
              onSave={handlePersonEdit}
              onClose={() => setEditingPerson(null)}
            />
          )}

          {/* Coming soon stubs for sidebar items without dedicated views yet */}
          {['documents', 'companies', 'jobOpportunities', 'applications', 'announcements', 'academicRisk', 'attendanceRisk', 'aiAssistant'].includes(activeTab) && (
            <ComingSoon label={NAV_SECTIONS.flatMap(s => s.items).find(i => i.id === activeTab)?.label || activeTab} />
          )}
        </div>
      </main>
    </div>
  )
}

export default AdminDashboard
