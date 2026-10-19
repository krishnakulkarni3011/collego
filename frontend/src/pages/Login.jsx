import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap, ChevronRight, ChevronLeft, Eye, EyeOff,
  Mail, Lock, AlertCircle, CheckCircle2, Sparkles,
  Shield, BookOpen, BarChart3, Zap
} from 'lucide-react'
import { authService } from '../services/authService'
import { cn } from '../lib/utils'
import hero from '../assets/hero.png'

const ROLES = [
  {
    id: 'STUDENT',
    label: 'Student',
    description: 'Access academic portal',
    icon: GraduationCap,
    gradient: 'from-emerald-500 to-teal-500',
    glow: 'shadow-emerald-500/25',
    activeBorder: 'border-emerald-400',
    activeBg: 'bg-emerald-50',
    activeText: 'text-emerald-600',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    badgeColor: 'bg-emerald-500',
  },
  {
    id: 'FACULTY',
    label: 'Faculty',
    description: 'Manage courses & students',
    icon: BookOpen,
    gradient: 'from-violet-500 to-fuchsia-500',
    glow: 'shadow-violet-500/25',
    activeBorder: 'border-violet-400',
    activeBg: 'bg-violet-50',
    activeText: 'text-violet-600',
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
    badgeColor: 'bg-violet-500',
  },
  {
    id: 'ADMIN',
    label: 'Admin',
    description: 'System administration',
    icon: Shield,
    gradient: 'from-indigo-500 to-blue-500',
    glow: 'shadow-indigo-500/25',
    activeBorder: 'border-indigo-400',
    activeBg: 'bg-indigo-50',
    activeText: 'text-indigo-600',
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    badgeColor: 'bg-indigo-500',
  },
]

// ─── Floating particles for ambient effect ────────────────────────────────────
function Particles() {
  const particles = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 2,
    duration: Math.random() * 8 + 6,
    delay: Math.random() * 4,
  }))

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-indigo-300/30"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
          animate={{ y: [-20, 20, -20], opacity: [0.15, 0.5, 0.15] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

export default function Login() {
  const [step, setStep] = useState('role')
  const [selectedRole, setSelectedRole] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const activeRole = ROLES.find(r => r.id === selectedRole)

  const handleRoleContinue = () => {
    if (!selectedRole) { setError('Please select your role to continue.'); return }
    setError('')
    setStep('credentials')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await authService.login(email, password)
      const rawRole = data?.role || data?.data?.role || data?.userRole || data?.user?.role || authService.getRole() || ''
      const returnedRole = String(rawRole).toUpperCase().replace(/^ROLE_/, '')
      const normalizedSelected = String(selectedRole || '').toUpperCase().replace(/^ROLE_/, '')

      if (returnedRole && normalizedSelected && returnedRole !== normalizedSelected) {
        authService.clearTokens()
        const selectedLabel = ROLES.find(r => r.id === normalizedSelected)?.label || normalizedSelected
        const returnedLabel = ROLES.find(r => r.id === returnedRole)?.label || returnedRole || 'another role'
        setError(`This account is registered as a ${returnedLabel}, not a ${selectedLabel}. Please go back and select the correct role.`)
        return
      }

      const active = returnedRole || normalizedSelected
      if (active === 'STUDENT') navigate('/student')
      else if (active === 'FACULTY') navigate('/faculty')
      else if (active === 'ADMIN') navigate('/admin')
      else navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = () => {
    alert('Google Sign-In is not yet configured. Add your Google OAuth Client ID to enable this.')
  }

  // Progress: step 1 = 50%, step 2 = 100%
  const progress = step === 'role' ? 50 : 100

  return (
    <div className="min-h-screen flex portal-bg">
      <Particles />

      {/* ── Left Panel (feature showcase) ── */}
      <div className="hidden lg:flex lg:w-[46%] xl:w-1/2 flex-col relative overflow-hidden">
        {/* Soft gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-violet-50 to-cyan-50" />
        <div className="absolute inset-0 bg-mesh" />
        <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-200/40 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-violet-200/40 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />

        <div className="relative z-10 flex flex-col h-full p-12">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-14">
            <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <GraduationCap size={22} className="text-white" />
            </div>
            <div>
              <p className="text-lg font-extrabold text-slate-900 tracking-wide">COLLEGO</p>
              <p className="text-[10px] text-slate-400 tracking-[0.2em] uppercase font-medium">College ERP</p>
            </div>
          </div>

          {/* Headline */}
          <div className="flex-1 flex flex-col justify-center max-w-lg">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6 }}
            >
              <h1 className="text-4xl xl:text-5xl font-extrabold text-slate-900 leading-tight mb-4">
                The future of{' '}
                <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-500 bg-clip-text text-transparent">
                  college management
                </span>
              </h1>
              <p className="text-slate-500 text-base leading-relaxed mb-8">
                AI-powered ERP system for modern educational institutions. From attendance to placement — everything in one place.
              </p>
            </motion.div>

            {/* Hero image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="hidden xl:block mb-8 rounded-3xl overflow-hidden border border-white shadow-xl shadow-indigo-500/10"
            >
              <img src={hero} alt="Campus" className="w-full h-40 object-cover" />
            </motion.div>

            {/* Feature cards */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Sparkles, title: 'AI Insights', desc: 'Prediction & risk detection', color: 'text-violet-600', bg: 'bg-violet-100' },
                { icon: BarChart3, title: 'Real-time Analytics', desc: 'Attendance, marks, placements', color: 'text-indigo-600', bg: 'bg-indigo-100' },
                { icon: Zap, title: 'Instant Operations', desc: 'Bulk uploads & PDF generation', color: 'text-amber-600', bg: 'bg-amber-100' },
                { icon: Shield, title: 'Secure RBAC', desc: 'Role-based access control', color: 'text-emerald-600', bg: 'bg-emerald-100' },
              ].map((f, i) => {
                const Icon = f.icon
                return (
                  <motion.div
                    key={f.title}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.08, duration: 0.5 }}
                    className="flex items-start gap-3 p-3.5 rounded-2xl border border-white/80 bg-white/70 backdrop-blur-sm shadow-sm"
                  >
                    <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center shrink-0', f.bg)}>
                      <Icon size={15} className={f.color} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-slate-800">{f.title}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">{f.desc}</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-10">
            <p className="text-xs text-slate-400">© {new Date().getFullYear()} Collego · AI-Powered College ERP</p>
          </div>
        </div>
      </div>

      {/* ── Right Panel (login form) ── */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-[420px]">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 justify-center mb-8">
            <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <GraduationCap size={22} className="text-white" />
            </div>
            <p className="text-xl font-extrabold text-slate-900">COLLEGO</p>
          </div>

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="relative rounded-3xl overflow-hidden bg-white border border-slate-200/80 shadow-xl shadow-slate-900/5"
          >
            {/* Progress bar */}
            <div className="h-1 bg-slate-100">
              <motion.div
                className="h-full rounded-r-full"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
                style={{ background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }}
              />
            </div>

            <div className="p-8">
              <AnimatePresence mode="wait">

                {/* ── STEP 1: Role Selection ── */}
                {step === 'role' && (
                  <motion.div
                    key="role"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="mb-7">
                      <h2 className="text-2xl font-extrabold text-slate-900 mb-1">Welcome back</h2>
                      <p className="text-slate-400 text-sm">Select your role to sign in to Collego</p>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-6">
                      {ROLES.map(role => {
                        const Icon = role.icon
                        const isActive = selectedRole === role.id
                        return (
                          <button
                            key={role.id}
                            id={`role-${role.id.toLowerCase()}`}
                            onClick={() => { setSelectedRole(role.id); setError('') }}
                            className={cn(
                              'relative flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all duration-200 focus:outline-none group',
                              isActive
                                ? `${role.activeBorder} ${role.activeBg}`
                                : 'border-slate-200 hover:border-slate-300 bg-slate-50/60 hover:bg-slate-50'
                            )}
                          >
                            {isActive && (
                              <motion.div
                                layoutId="roleCheck"
                                className={cn('absolute top-2.5 right-2.5 w-4 h-4 rounded-full flex items-center justify-center', role.badgeColor)}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                              >
                                <CheckCircle2 size={10} className="text-white" />
                              </motion.div>
                            )}
                            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center transition-all', isActive ? role.iconBg : 'bg-white border border-slate-200 group-hover:border-slate-300')}>
                              <Icon size={19} className={isActive ? role.iconColor : 'text-slate-400 group-hover:text-slate-500'} />
                            </div>
                            <div className="text-center">
                              <p className={cn('text-sm font-semibold', isActive ? role.activeText : 'text-slate-500 group-hover:text-slate-700')}>{role.label}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{role.description}</p>
                            </div>
                          </button>
                        )
                      })}
                    </div>

                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm mb-4"
                      >
                        <AlertCircle size={14} className="shrink-0" />
                        {error}
                      </motion.div>
                    )}

                    <button
                      id="btn-continue-role"
                      onClick={handleRoleContinue}
                      className="w-full flex items-center justify-center gap-1 py-3 rounded-xl font-semibold text-white transition-all active:scale-[0.98] mb-4 hover:shadow-lg hover:shadow-indigo-500/25"
                      style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                    >
                      Continue
                      <ChevronRight size={16} />
                    </button>

                    <div className="relative flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-slate-200" />
                      <span className="text-xs text-slate-400">or</span>
                      <div className="flex-1 h-px bg-slate-200" />
                    </div>

                    <button
                      id="btn-google-signin"
                      onClick={handleGoogleSignIn}
                      className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 py-3 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-800 transition-all active:scale-[0.98]"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Continue with Google
                    </button>
                  </motion.div>
                )}

                {/* ── STEP 2: Credentials ── */}
                {step === 'credentials' && (
                  <motion.div
                    key="credentials"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                  >
                    {/* Back + role badge */}
                    <div className="flex items-center gap-3 mb-6">
                      <button
                        id="btn-back-to-role"
                        onClick={() => { setStep('role'); setError(''); setEmail(''); setPassword('') }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      {activeRole && (
                        <div className={cn(
                          'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border',
                          activeRole.activeBg, activeRole.activeBorder, activeRole.activeText
                        )}>
                          <activeRole.icon size={12} />
                          Signing in as {activeRole.label}
                        </div>
                      )}
                    </div>

                    <div className="mb-6">
                      <h2 className="text-2xl font-extrabold text-slate-900 mb-1">Sign in</h2>
                      <p className="text-slate-400 text-sm">Enter your credentials to access your portal</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      {/* Email */}
                      <div>
                        <label htmlFor="login-email" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
                        <div className="relative">
                          <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            id="login-email"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="collego-input pl-9"
                            placeholder="you@college.edu"
                            required
                            autoFocus
                          />
                        </div>
                      </div>

                      {/* Password */}
                      <div>
                        <label htmlFor="login-password" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Password</label>
                        <div className="relative">
                          <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            id="login-password"
                            type={showPass ? 'text' : 'password'}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="collego-input pl-9 pr-10"
                            placeholder="Enter your password"
                            required
                          />
                          <button
                            type="button"
                            id="btn-toggle-password"
                            onClick={() => setShowPass(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-0.5"
                          >
                            {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>

                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm"
                        >
                          <AlertCircle size={14} className="mt-0.5 shrink-0" />
                          <p>{error}</p>
                        </motion.div>
                      )}

                      <button
                        id="btn-login-submit"
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 rounded-xl font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mt-2 hover:shadow-lg"
                        style={{
                          background: activeRole
                            ? `linear-gradient(135deg, ${activeRole.id === 'STUDENT' ? '#10b981, #0d9488' : activeRole.id === 'FACULTY' ? '#8b5cf6, #d946ef' : '#6366f1, #3b82f6'})`
                            : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                          boxShadow: `0 8px 24px ${activeRole?.id === 'STUDENT' ? 'rgba(16,185,129,0.25)' : activeRole?.id === 'FACULTY' ? 'rgba(139,92,246,0.25)' : 'rgba(99,102,241,0.25)'}`
                        }}
                      >
                        {loading ? (
                          <span className="flex items-center justify-center gap-2">
                            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Signing in…
                          </span>
                        ) : `Sign In as ${activeRole?.label}`}
                      </button>
                    </form>

                    <div className="relative flex items-center gap-3 my-5">
                      <div className="flex-1 h-px bg-slate-200" />
                      <span className="text-xs text-slate-400">or</span>
                      <div className="flex-1 h-px bg-slate-200" />
                    </div>

                    <button
                      id="btn-google-signin-step2"
                      onClick={handleGoogleSignIn}
                      className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 py-3 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-800 transition-all active:scale-[0.98]"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Continue with Google
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Footer text */}
          <p className="text-center text-slate-400 text-xs mt-6">
            © {new Date().getFullYear()} Collego · AI-Powered College ERP
          </p>
        </div>
      </div>
    </div>
  )
}
