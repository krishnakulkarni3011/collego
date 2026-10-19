import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap, ChevronRight, ChevronLeft, Search, LogOut, Bell,
  Grid3X3, Calendar, CheckCircle2, X, Building2,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import heroImg from '../../assets/hero.png'

// ─── Accent token sets (per portal) ──────────────────────────────────────────
export const ACCENTS = {
  indigo: {
    grad: 'from-indigo-500 to-violet-600',
    shadow: 'shadow-indigo-500/30',
    text: 'text-indigo-600',
    softBg: 'bg-indigo-50',
    softBorder: 'border-indigo-100',
    bar: '#6366f1',
    focus: 'focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100',
    banner: 'linear-gradient(135deg, #eef2ff 0%, #f5f3ff 45%, #ecfeff 100%)',
  },
  emerald: {
    grad: 'from-emerald-500 to-teal-600',
    shadow: 'shadow-emerald-500/30',
    text: 'text-emerald-600',
    softBg: 'bg-emerald-50',
    softBorder: 'border-emerald-100',
    bar: '#10b981',
    focus: 'focus-within:border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-100',
    banner: 'linear-gradient(135deg, #ecfdf5 0%, #eff6ff 50%, #ecfeff 100%)',
  },
  violet: {
    grad: 'from-violet-500 to-fuchsia-600',
    shadow: 'shadow-violet-500/30',
    text: 'text-violet-600',
    softBg: 'bg-violet-50',
    softBorder: 'border-violet-100',
    bar: '#8b5cf6',
    focus: 'focus-within:border-violet-300 focus-within:ring-2 focus-within:ring-violet-100',
    banner: 'linear-gradient(135deg, #f5f3ff 0%, #fdf4ff 50%, #eef2ff 100%)',
  },
  blue: {
    grad: 'from-blue-500 to-indigo-600',
    shadow: 'shadow-blue-500/30',
    text: 'text-blue-600',
    softBg: 'bg-blue-50',
    softBorder: 'border-blue-100',
    bar: '#3b82f6',
    focus: 'focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100',
    banner: 'linear-gradient(135deg, #eff6ff 0%, #eef2ff 50%, #ecfeff 100%)',
  },
  amber: {
    grad: 'from-amber-500 to-orange-500',
    shadow: 'shadow-amber-500/30',
    text: 'text-amber-600',
    softBg: 'bg-amber-50',
    softBorder: 'border-amber-100',
    bar: '#f59e0b',
    focus: 'focus-within:border-amber-300 focus-within:ring-2 focus-within:ring-amber-100',
    banner: 'linear-gradient(135deg, #fffbeb 0%, #fff7ed 50%, #fef3c7 100%)',
  },
}

// ─── Animated number ─────────────────────────────────────────────────────────
export function AnimatedNumber({ value, duration = 900, decimals = 0, prefix = '', suffix = '', className }) {
  const [display, setDisplay] = useState(0)
  const fromRef = useRef(0)

  useEffect(() => {
    const target = Number(value)
    if (value == null || Number.isNaN(target)) return
    const start = performance.now()
    const from = fromRef.current
    let frame
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      const current = from + (target - from) * eased
      setDisplay(current)
      if (p < 1) frame = requestAnimationFrame(tick)
      else fromRef.current = target
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, duration])

  const shown = Number.isFinite(display) ? display.toFixed(decimals) : '—'
  return <span className={className}>{prefix}{Number(shown).toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</span>
}

// ─── Toast ───────────────────────────────────────────────────────────────────
export function Toast({ message, onClose }) {
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
          initial={{ opacity: 0, y: -18, x: 24 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: -18, x: 24 }}
          className={cn(
            'fixed top-5 right-5 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-medium shadow-2xl border bg-white/95 backdrop-blur-xl',
            message.type === 'error'
              ? 'text-red-600 border-red-200 shadow-red-500/10'
              : 'text-emerald-700 border-emerald-200 shadow-emerald-500/10'
          )}
        >
          {message.type === 'error'
            ? <X size={16} className="text-red-500" />
            : <CheckCircle2 size={16} className="text-emerald-500" />}
          {message.text}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Spinner / Empty state ───────────────────────────────────────────────────
export function Spinner({ className }) {
  return <div className={cn('w-8 h-8 border-[3px] border-indigo-500 border-t-transparent rounded-full animate-spin', className)} />
}

export function EmptyState({ icon: Icon, title, description, accent = 'indigo' }) {
  const a = ACCENTS[accent] || ACCENTS.indigo
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center mb-4', a.softBg)}>
        {Icon ? <Icon size={28} className={a.text} /> : <Building2 size={28} className={a.text} />}
      </div>
      <p className="text-base font-semibold text-slate-800">{title}</p>
      {description && <p className="text-sm text-slate-500 mt-1 max-w-xs">{description}</p>}
    </div>
  )
}

// ─── Page title ──────────────────────────────────────────────────────────────
export function PageTitle({ icon: Icon, title, subtitle, accent = 'indigo', actions }) {
  const a = ACCENTS[accent] || ACCENTS.indigo
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center shrink-0', a.softBg)}>
            <Icon size={20} className={a.text} />
          </div>
        )}
        <div>
          <h2 className="text-xl font-bold text-slate-900 leading-tight">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

// ─── Panel (section card) ────────────────────────────────────────────────────
export function Panel({ title, icon: Icon, accent = 'indigo', action, children, className, bodyClassName }) {
  const a = ACCENTS[accent] || ACCENTS.indigo
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn('glass-card p-5 flex flex-col', className)}
    >
      {(title || action) && (
        <div className="flex items-center justify-between mb-4 gap-3">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            {Icon && <Icon size={15} className={a.text} />}
            {title}
          </h3>
          {action}
        </div>
      )}
      <div className={cn('flex-1', bodyClassName)}>{children}</div>
    </motion.section>
  )
}

// ─── Stat card ───────────────────────────────────────────────────────────────
export function StatCard({
  label, value, icon: Icon, accent = 'indigo', sub, trend, trendLabel,
  onClick, index = 0, decimals = 0, suffix = '', prefix = '', spark,
}) {
  const a = ACCENTS[accent] || ACCENTS.indigo
  const positive = trend == null || trend >= 0
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.4 }}
      onClick={onClick}
      className={cn(
        'glass-card glass-card-hover p-5 flex items-start gap-4',
        onClick && 'cursor-pointer'
      )}
    >
      <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-gradient-to-br text-white shadow-lg', a.grad, a.shadow)}>
        <Icon size={22} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="text-2xl font-extrabold text-slate-900 leading-tight mt-0.5">
          {typeof value === 'number'
            ? <AnimatedNumber value={value} decimals={decimals} prefix={prefix} suffix={suffix} />
            : value}
        </p>
        {(sub || trend != null) && (
          <div className="flex items-center gap-1.5 mt-1.5">
            {trend != null && (
              <span className={cn('text-[11px] font-semibold', positive ? 'text-emerald-600' : 'text-red-500')}>
                {positive ? '▲' : '▼'} {Math.abs(trend)}%
              </span>
            )}
            {(trendLabel || sub) && <span className="text-[11px] text-slate-400">{trendLabel || sub}</span>}
          </div>
        )}
      </div>
      {spark && <div className="shrink-0 self-end opacity-80">{spark}</div>}
    </motion.div>
  )
}

// ─── Chart tooltip ───────────────────────────────────────────────────────────
export function ChartTooltip({ active, payload, label, unit = '' }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-3.5 py-2.5 bg-white border border-slate-200 shadow-xl">
      {label != null && <p className="text-xs font-semibold text-slate-700 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="text-xs flex items-center gap-1.5" style={{ color: p.color || '#4f46e5' }}>
          <span className="w-2 h-2 rounded-full" style={{ background: p.color || '#4f46e5' }} />
          {p.name}: <span className="font-bold">{p.value}{unit}</span>
        </p>
      ))}
    </div>
  )
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────
export function PortalSidebar({
  collapsed, onToggle, navSections, activeTab, onTabChange,
  brand = 'COLLEGO', portalLabel = 'College ERP', accent = 'indigo', note,
}) {
  const a = ACCENTS[accent] || ACCENTS.indigo
  return (
    <aside className={cn('sidebar', collapsed && 'collapsed')}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-[72px] border-b border-slate-100 shrink-0">
        <div className={cn('w-10 h-10 rounded-2xl bg-gradient-to-br flex items-center justify-center shrink-0 shadow-lg text-white', a.grad, a.shadow)}>
          <GraduationCap size={20} />
        </div>
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="min-w-0"
            >
              <p className="text-sm font-extrabold text-slate-900 leading-tight tracking-wide">{brand}</p>
              <p className="text-[10px] text-slate-400 tracking-wider">{portalLabel}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 scrollbar-hide px-2.5">
        {navSections.map((section, si) => (
          <div key={si} className="mb-1.5">
            {section.title && !collapsed && (
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.16em] px-3 pt-4 pb-1.5">
                {section.title}
              </p>
            )}
            {section.items.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-all duration-200 relative group mb-0.5',
                    isActive ? 'nav-item-active' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                  )}
                >
                  <Icon size={17} className={cn('shrink-0', isActive ? a.text : 'text-slate-400 group-hover:text-slate-600')} />
                  {!collapsed && <span className="text-[13px] font-medium leading-none flex-1 min-w-0 truncate">{item.label}</span>}
                  {item.meta && !collapsed && (
                    <span className="text-[10px] text-slate-400 ml-auto shrink-0">{item.meta}</span>
                  )}
                  {isActive && !collapsed && !item.meta && <ChevronRight size={13} className={cn('ml-auto', a.text)} />}
                  {collapsed && (
                    <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl">
                      {item.label}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Summary note */}
      {!collapsed && note && (
        <div className="mx-3 mb-2 p-3 rounded-xl bg-slate-50 border border-slate-100 shrink-0">
          <p className="text-[10px] text-slate-500 leading-relaxed">{note}</p>
        </div>
      )}

      {/* Campus card */}
      {!collapsed && (
        <div className="mx-3 mb-3 rounded-2xl overflow-hidden relative h-28 shrink-0 border border-slate-100 shadow-sm">
          <img src={heroImg} alt="Campus" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/85 via-indigo-900/30 to-transparent" />
          <div className="absolute inset-0 flex flex-col items-start justify-end p-3">
            <p className="text-[11px] font-bold text-white leading-tight">Building Better</p>
            <p className="text-[10px] text-indigo-200">Tomorrow</p>
          </div>
        </div>
      )}

      {/* Collapse */}
      <div className="border-t border-slate-100 p-2 shrink-0">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 py-2 text-slate-400 hover:text-slate-700 text-xs rounded-xl hover:bg-slate-100 transition-colors"
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          {!collapsed && <span className="text-xs">Collapse</span>}
        </button>
      </div>
    </aside>
  )
}

// ─── Topbar ──────────────────────────────────────────────────────────────────
export function PortalTopbar({
  sidebarWidth, accent = 'indigo', user = {}, placeholder = 'Search...',
  notificationCount = 0, notifications = [], onLogout, onApps,
  searchValue, onSearchChange,
}) {
  const a = ACCENTS[accent] || ACCENTS.indigo
  const [showNotif, setShowNotif] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const searchRef = useRef(null)
  const initials = user.initials || (user.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'U')
  const dateStr = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <header className="topbar px-5 gap-3" style={{ left: sidebarWidth }}>
      {/* Search */}
      <div className={cn('hidden sm:flex items-center gap-2.5 bg-white border border-slate-200 rounded-2xl px-4 py-2.5 w-full max-w-md transition-all', a.focus)}>
        <Search size={15} className="text-slate-400 shrink-0" />
        <input
          ref={searchRef}
          value={searchValue ?? ''}
          onChange={(e) => onSearchChange?.(e.target.value)}
          className="bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none w-full"
          placeholder={placeholder}
        />
        <kbd className="text-[10px] text-slate-400 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded font-mono hidden md:block shrink-0">Ctrl K</kbd>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <div className="hidden xl:flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-3.5 py-2.5">
          <Calendar size={14} className={a.text} />
          <p className="text-xs text-slate-500 font-medium">{dateStr}</p>
        </div>

        {/* Apps */}
        <button
          onClick={onApps}
          className="p-2.5 rounded-2xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
          title="Apps"
        >
          <Grid3X3 size={18} />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setShowNotif(v => !v); setShowProfile(false) }}
            className="relative p-2.5 rounded-2xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
          >
            <Bell size={18} />
            {notificationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </button>
          <AnimatePresence>
            {showNotif && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-50"
              >
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">Notifications</p>
                  <span className="text-[11px] text-slate-400">{notifications.length} recent</span>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 && (
                    <p className="text-xs text-slate-400 px-4 py-6 text-center">You're all caught up.</p>
                  )}
                  {notifications.slice(0, 6).map((n, i) => (
                    <div key={n.id ?? i} className="px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                      <p className="text-xs font-semibold text-slate-700 truncate">{n.title}</p>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{n.message}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => { setShowProfile(v => !v); setShowNotif(false) }}
            className="flex items-center gap-2.5 pl-1.5 pr-2.5 py-1.5 rounded-2xl hover:bg-slate-100 transition-all"
          >
            <div className="avatar-ring w-9 h-9 flex items-center justify-center">
              <div className={cn('w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center text-[11px] font-bold text-white', a.grad)}>
                {initials}
              </div>
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-slate-800 leading-tight">{user.name || 'User'}</p>
              <p className="text-[10px] text-slate-400">{user.role || 'Member'}</p>
            </div>
            <ChevronRight size={13} className="text-slate-300 hidden md:block rotate-90" />
          </button>

          <AnimatePresence>
            {showProfile && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-2xl py-1.5 z-50 overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-800">{user.name || 'User'}</p>
                  <p className="text-xs text-slate-400 truncate">{user.email}</p>
                </div>
                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={15} />
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

// ─── Welcome banner ──────────────────────────────────────────────────────────
export function WelcomeBanner({ greeting, name, subtitle, quote, accent = 'indigo' }) {
  const a = ACCENTS[accent] || ACCENTS.indigo
  const dateStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-3xl overflow-hidden border border-white/60 shadow-[0_14px_40px_-24px_rgba(79,70,229,0.45)]"
      style={{ background: a.banner }}
    >
      <div className="relative z-10 flex items-center justify-between gap-4 p-6 md:p-7">
        <div className="max-w-xl">
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight">
            {greeting}, {name} 👋
          </h1>
          <p className="text-slate-600 text-sm mt-1.5">{subtitle}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-white/70 border border-white rounded-full px-3 py-1">
              <Calendar size={12} className={a.text} /> {dateStr}
            </span>
            {quote && <p className="text-xs text-slate-500 italic">“{quote}”</p>}
          </div>
        </div>
      </div>
      <div className="absolute right-0 top-0 h-full w-64 md:w-80 pointer-events-none">
        <div className={cn('absolute -right-10 -top-10 w-56 h-56 rounded-full blur-3xl opacity-40 bg-gradient-to-br', a.grad)} />
        <img src={heroImg} alt="Campus" className="absolute right-4 md:right-8 bottom-0 h-[88%] object-contain drop-shadow-2xl opacity-95" />
      </div>
    </motion.div>
  )
}
