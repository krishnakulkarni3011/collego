import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap, ChevronRight, ChevronLeft, Eye, EyeOff,
  Mail, Lock, AlertCircle, CheckCircle2,
  Shield, BookOpen, RefreshCw,
  IdCard, HelpCircle
} from 'lucide-react'
import { authService } from '../services/authService'
import { cn } from '../lib/utils'
import { Button } from '../components/ui/button'

const ROLES = [
  {
    id: 'STUDENT',
    label: 'Student',
    description: 'Login with USN',
    icon: GraduationCap,
    grad: 'from-emerald-500 to-teal-500',
    text: 'text-emerald-600',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    badgeColor: 'bg-emerald-500',
    placeholder: 'Enter your USN (e.g., 1CG24CS001)'
  },
  {
    id: 'FACULTY',
    label: 'Faculty',
    description: 'Manage courses & students',
    icon: BookOpen,
    grad: 'from-violet-500 to-fuchsia-500',
    text: 'text-violet-600',
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    badgeColor: 'bg-violet-500',
    placeholder: 'Enter your email'
  },
  {
    id: 'ADMIN',
    label: 'Admin',
    description: 'System administration',
    icon: Shield,
    grad: 'from-indigo-500 to-blue-500',
    text: 'text-indigo-600',
    iconBg: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
    badgeColor: 'bg-indigo-500',
    placeholder: 'Enter your email'
  },
]

function Particles() {
  const particles = Array.from({ length: 22 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 5 + 2,
    duration: Math.random() * 10 + 7,
    delay: Math.random() * 5,
  }))

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-indigo-200/40 blur-sm"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
          animate={{ y: [-25, 25, -25], opacity: [0.15, 0.5, 0.15] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

export default function Login() {
  const [step, setStep] = useState('role')
  const [selectedRole, setSelectedRole] = useState(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [forgotStep, setForgotStep] = useState('email')
  const [forgotEmail, setForgotEmail] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
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
      const data = await authService.login(username, password)
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
      setError(err.response?.data?.message || 'Invalid username/USN or password.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = () => {
    alert('Google Sign-In is not yet configured. Add your Google OAuth Client ID to enable this.')
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authService.forgotPassword(forgotEmail)
      setForgotStep('success')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset link')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authService.resetPassword(resetToken, newPassword)
      setForgotStep('success')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  const progress = step === 'role' ? 50 : 100

  return (
    <div className="min-h-screen flex flex-col portal-bg login-bg relative overflow-x-hidden">
      <div className="bg-mesh" />
      <Particles />

      {/* Brand header */}
      <header className="relative z-10 flex flex-col items-center text-center px-6 pt-10 pb-8 lg:pt-14">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-xl shadow-indigo-500/25">
            <GraduationCap size={24} className="text-white" />
          </div>
          <div className="text-left">
            <p className="text-xl lg:text-2xl font-extrabold text-slate-900 tracking-wide">COLLEGO</p>
            <p className="text-[10px] text-slate-400 tracking-[0.2em] uppercase font-semibold">AI College ERP</p>
          </div>
        </div>
        <h1 className="mt-5 text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
          The Future of{' '}
          <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-500 bg-clip-text text-transparent">
            College Management
          </span>
        </h1>
      </header>

      {/* Centered sign-in */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 pb-10">
        <div className="w-full max-w-[440px]">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="login-card relative rounded-[2rem] overflow-hidden bg-white border border-white/60 shadow-2xl shadow-slate-900/5 backdrop-blur-md"
          >
            <div className="h-1 bg-slate-100">
              <motion.div
                className="h-full rounded-r-full"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
                style={{ background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }}
              />
            </div>

            <div className="p-8 lg:p-10">
              <AnimatePresence mode="wait">

                {/* STEP 1: Role Selection */}
                {step === 'role' && (
                  <motion.div
                    key="role"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="mb-8">
                      <h2 className="text-2xl xl:text-3xl font-extrabold text-slate-900 mb-1">Welcome back</h2>
                      <p className="text-slate-400 text-sm">Select your role to sign in to Collego</p>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-8">
                      {ROLES.map(role => {
                        const Icon = role.icon
                        const isActive = selectedRole === role.id
                        return (
                          <button
                            key={role.id}
                            id={`role-${role.id.toLowerCase()}`}
                            onClick={() => { setSelectedRole(role.id); setError(''); setUsername(''); setPassword('') }}
                            className={cn(
                              'relative flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all duration-300 focus:outline-none group',
                              isActive
                                ? `${cn(role.iconBg, role.badgeColor.replace('bg-', 'border-'))}`
                                : 'border-slate-300/80 hover:border-indigo-400 bg-white/70 hover:bg-indigo-50/70'
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
                            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center transition-all', isActive ? role.iconBg : 'bg-white border border-slate-300/80 group-hover:border-indigo-400')}>
                              <Icon size={20} className={isActive ? role.iconColor : 'text-slate-400 group-hover:text-slate-500'} />
                            </div>
                            <div className="text-center">
                              <p className={cn('text-sm font-semibold', isActive ? role.text : 'text-slate-500 group-hover:text-slate-700')}>{role.label}</p>
                              <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">{role.description}</p>
                            </div>
                          </button>
                        )
                      })}
                    </div>

                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm mb-6"
                      >
                        <AlertCircle size={14} className="shrink-0" />
                        {error}
                      </motion.div>
                    )}

                    <button
                      id="btn-continue-role"
                      onClick={handleRoleContinue}
                      className="login-primary w-full flex items-center justify-center gap-1.5 py-3.5 rounded-xl font-semibold text-white transition-all active:scale-[0.98] mb-6"
                    >
                      Continue
                      <ChevronRight size={16} />
                    </button>

                    <div className="relative flex items-center gap-3 my-6">
                      <div className="flex-1 h-px bg-slate-200" />
                      <span className="text-xs text-slate-400">or</span>
                      <div className="flex-1 h-px bg-slate-200" />
                    </div>

                    <button
                      id="btn-google-signin"
                      onClick={handleGoogleSignIn}
                      className="w-full flex items-center justify-center gap-3 bg-white hover:bg-indigo-50/70 border border-slate-300/80 hover:border-indigo-300 py-3.5 rounded-xl text-sm font-medium text-slate-600 hover:text-indigo-700 transition-all active:scale-[0.98]"
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

                {/* STEP 2: Credentials */}
                {step === 'credentials' && (
                  <motion.div
                    key="credentials"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="flex items-center gap-3 mb-8">
                      <button
                        id="btn-back-to-role"
                        onClick={() => { setStep('role'); setError(''); setUsername(''); setPassword('') }}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      {activeRole && (
                        <div className={cn(
                          'flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-semibold border',
                          activeRole.iconBg, activeRole.iconBg.replace('bg-', 'border-'), activeRole.text
                        )}>
                          <activeRole.icon size={12} />
                          Signing in as {activeRole.label}
                        </div>
                      )}
                    </div>

                    <div className="mb-7">
                      <h2 className="text-2xl xl:text-3xl font-extrabold text-slate-900 mb-1">Sign in</h2>
                      <p className="text-slate-400 text-sm">Enter your credentials to access your portal</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label htmlFor="login-username" className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                          {activeRole?.id === 'STUDENT' ? 'University Serial Number (USN)' : 'Email Address'}
                        </label>
                        <div className="relative">
                          {activeRole?.id === 'STUDENT' ? (
                            <IdCard size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          ) : (
                            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          )}
                          <input
                            id="login-username"
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            className="collego-input"
                            style={{ paddingLeft: '2.5rem' }}
                            placeholder={activeRole?.placeholder || 'you@college.edu'}
                            required
                            autoFocus
                            autoComplete={activeRole?.id === 'STUDENT' ? 'username' : 'email'}
                          />
                        </div>
                        {activeRole?.id === 'STUDENT' && (
                          <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                            <HelpCircle size={11} /> Format: 1CG24CS001 (Year + Branch + Number)
                          </p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="login-password" className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Password</label>
                        <div className="relative">
                          <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            id="login-password"
                            type={showPass ? 'text' : 'password'}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="collego-input"
                            style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                            placeholder="Enter your password"
                            required
                            autoComplete="current-password"
                          />
                          <button
                            type="button"
                            id="btn-toggle-password"
                            onClick={() => setShowPass(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-0"
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

                      <div className="flex items-center justify-between mt-3">
                        <button
                          type="button"
                          onClick={() => setStep('forgot')}
                          className="text-xs text-indigo-600 hover:text-indigo-700 font-medium hover:underline"
                        >
                          Forgot password?
                        </button>
                        {step !== 'forgot' && (
                          <button
                            id="btn-login-submit"
                            type="submit"
                            disabled={loading}
                            className={cn(
                              'login-submit w-auto shrink-0 whitespace-nowrap px-5 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed',
                              activeRole?.id === 'STUDENT'
                                ? 'login-submit-emerald'
                                : activeRole?.id === 'FACULTY'
                                  ? 'login-submit-violet'
                                  : 'login-submit-indigo'
                            )}
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
                        )}
                      </div>
                    </form>

                    {step === 'forgot' && forgotStep === 'email' && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-6 glass-card p-6 border border-white/60"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <button onClick={() => setStep('credentials')} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
                            <ChevronLeft size={14} /> Back
                          </button>
                          <h3 className="text-sm font-semibold text-slate-800">Forgot Password</h3>
                        </div>
                        <p className="text-sm text-slate-500 mb-5">Enter your email and we'll send you a reset link.</p>
                        <form onSubmit={handleForgotPassword} className="space-y-3">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                            <input
                              type="email"
                              value={forgotEmail}
                              onChange={e => setForgotEmail(e.target.value)}
                              placeholder="you@college.edu"
                              className="collego-input"
                              required
                              autoFocus
                            />
                          </div>
                          <Button variant="gradient" type="submit" className="w-full py-3" disabled={loading || !forgotEmail.trim()}>
                            {loading ? (
                              <span className="flex items-center justify-center gap-2"><RefreshCw size={14} className="animate-spin" /> Sending...</span>
                            ) : (
                              <span className="flex items-center justify-center gap-2"><Mail size={14} /> Send Reset Link</span>
                            )}
                          </Button>
                        </form>
                      </motion.div>
                    )}

                    {step === 'forgot' && forgotStep === 'reset' && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-6 glass-card p-6 border border-white/60"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <button onClick={() => setForgotStep('email')} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
                            <ChevronLeft size={14} /> Back
                          </button>
                          <h3 className="text-sm font-semibold text-slate-800">Reset Password</h3>
                        </div>
                        <p className="text-sm text-slate-500 mb-5">Enter your new password below.</p>
                        <form onSubmit={handleResetPassword} className="space-y-3">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Reset Token</label>
                            <input
                              type="text"
                              value={resetToken}
                              onChange={e => setResetToken(e.target.value)}
                              placeholder="Token from reset email"
                              className="collego-input"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">New Password</label>
                            <input
                              type="password"
                              value={newPassword}
                              onChange={e => setNewPassword(e.target.value)}
                              placeholder="New password"
                              className="collego-input"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Confirm Password</label>
                            <input
                              type="password"
                              value={confirmPassword}
                              onChange={e => setConfirmPassword(e.target.value)}
                              placeholder="Confirm new password"
                              className="collego-input"
                              required
                            />
                          </div>
                          {newPassword !== confirmPassword && newPassword && confirmPassword && (
                            <p className="text-xs text-red-500">Passwords do not match</p>
                          )}
                          <Button variant="gradient" type="submit" className="w-full py-3" disabled={loading || !newPassword || !confirmPassword || newPassword !== confirmPassword}>
                            {loading ? (
                              <span className="flex items-center justify-center gap-2"><RefreshCw size={14} className="animate-spin" /> Resetting...</span>
                            ) : (
                              <span className="flex items-center justify-center gap-2"><Lock size={14} /> Reset Password</span>
                            )}
                          </Button>
                        </form>
                      </motion.div>
                    )}

                    {step === 'forgot' && forgotStep === 'success' && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-6 glass-card p-6 border border-white/60 text-center"
                      >
                        <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                          <CheckCircle2 size={24} className="text-emerald-600" />
                        </div>
                        <h3 className="text-sm font-semibold text-slate-800 mb-2">Password Reset</h3>
                        <p className="text-sm text-slate-500 mb-4">{forgotStep === 'success' && resetToken ? 'Your password has been reset successfully.' : 'A reset link has been sent to your email.'}</p>
                        <button
                          onClick={() => { setStep('credentials'); setForgotStep('email'); setResetToken(''); setNewPassword(''); setConfirmPassword(''); setForgotEmail('') }}
                          className="w-full py-3 rounded-xl text-xs text-indigo-600 font-medium hover:bg-indigo-50 transition-colors border border-slate-300/80 hover:border-indigo-300"
                        >
                          Back to Sign In
                        </button>
                      </motion.div>
                    )}

                    <div className="relative flex items-center gap-3 my-6">
                      <div className="flex-1 h-px bg-slate-200" />
                      <span className="text-xs text-slate-400">or</span>
                      <div className="flex-1 h-px bg-slate-200" />
                    </div>

                    <button
                      id="btn-google-signin-step2"
                      onClick={handleGoogleSignIn}
                      className="w-full flex items-center justify-center gap-3 bg-white hover:bg-indigo-50/70 border border-slate-300/80 hover:border-indigo-300 py-3.5 rounded-xl text-sm font-medium text-slate-600 hover:text-indigo-700 transition-all active:scale-[0.98]"
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

          <p className="text-center text-slate-400 text-xs mt-8">
            © {new Date().getFullYear()} Collego · AI-Powered College ERP
          </p>
        </div>
      </main>
    </div>
  )
}