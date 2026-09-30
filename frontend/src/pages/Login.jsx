import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/authService'

// ── small helpers ────────────────────────────────────────────────────────────
const ROLES = [
  {
    id: 'STUDENT',
    label: 'Student',
    description: 'Access your academic portal',
    icon: '🎓',
    gradient: 'from-emerald-500 to-teal-500',
    activeBg: 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300',
    inactiveBg: 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300',
    accent: 'emerald',
  },
  {
    id: 'FACULTY',
    label: 'Faculty',
    description: 'Access your faculty portal',
    icon: '🏫',
    gradient: 'from-violet-500 to-fuchsia-500',
    activeBg: 'bg-violet-500/15 border-violet-500/50 text-violet-300',
    inactiveBg: 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300',
    accent: 'violet',
  },
  {
    id: 'ADMIN',
    label: 'Admin',
    description: 'System administration',
    icon: '🛡️',
    gradient: 'from-rose-500 to-orange-500',
    activeBg: 'bg-rose-500/15 border-rose-500/50 text-rose-300',
    inactiveBg: 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300',
    accent: 'rose',
  },
]

// ── main component ────────────────────────────────────────────────────────────
export default function Login() {
  const [step, setStep]         = useState('role')   // 'role' | 'credentials'
  const [selectedRole, setSelectedRole] = useState(null)
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const navigate = useNavigate()

  const activeRoleConfig = ROLES.find(r => r.id === selectedRole)

  // ── step 1: pick role ──
  const handleRoleSelect = (roleId) => {
    setSelectedRole(roleId)
    setError('')
  }

  const handleRoleContinue = () => {
    if (!selectedRole) { setError('Please select a role to continue.'); return }
    setError('')
    setStep('credentials')
  }

  // ── step 2: login ──
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = await authService.login(email, password)
      const returnedRole = data.role // e.g. 'STUDENT', 'FACULTY', 'ADMIN'

      // Strict role enforcement: the returned role must exactly match what the user selected.
      // Admin credentials only work when the user has explicitly selected "Admin".
      if (returnedRole !== selectedRole) {
        // Account exists but for a different role (including ADMIN trying to log in via Student/Faculty portal) — deny access
        authService.clearTokens()  // clear tokens client-side only
        const selectedLabel  = ROLES.find(r => r.id === selectedRole)?.label  || selectedRole
        const returnedLabel  = ROLES.find(r => r.id === returnedRole)?.label  || returnedRole
        setError(
          `This account is registered as a ${returnedLabel}, not a ${selectedLabel}. ` +
          `Please go back and select the correct role.`
        )
        return
      }

      if (returnedRole === 'STUDENT') navigate('/student')
      else if (returnedRole === 'FACULTY') navigate('/faculty')
      else if (returnedRole === 'ADMIN') navigate('/admin')
      else navigate('/')
    } catch (err) {
      const message = err.response?.data?.message || 'Invalid email or password.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  // ── Google sign-in placeholder ──
  const handleGoogleSignIn = () => {
    // TODO: Replace with real Google OAuth flow using your Client ID
    alert('Google Sign-In is not yet configured. Add your Google OAuth Client ID to enable this.')
  }

  // ── shared error box ──
  const ErrorBox = () =>
    error ? (
      <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl text-sm">
        <span className="mt-0.5 shrink-0">⚠</span>
        <p>{error}</p>
      </div>
    ) : null

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">

      {/* Background glow effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">

        {/* ── Logo / Header ── */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl mb-4 shadow-lg shadow-violet-500/25">
            <span className="text-2xl font-bold">C</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Collego
          </h1>
          <p className="text-slate-500 text-sm mt-1">AI-Powered College ERP</p>
        </div>

        {/* ── Card ── */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">

          {/* Progress bar */}
          <div className="h-0.5 bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
              style={{ width: step === 'role' ? '50%' : '100%' }}
            />
          </div>

          <div className="p-8">

            {/* ── STEP 1: Role Selection ── */}
            {step === 'role' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-white">Who are you?</h2>
                  <p className="text-slate-500 text-sm mt-1">Select your role to continue</p>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-6">
                  {ROLES.map(role => (
                    <button
                      key={role.id}
                      id={`role-${role.id.toLowerCase()}`}
                      onClick={() => handleRoleSelect(role.id)}
                      className={`relative flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all duration-200 focus:outline-none ${
                        selectedRole === role.id ? role.activeBg : role.inactiveBg
                      }`}
                    >
                      {selectedRole === role.id && (
                        <span className="absolute top-2.5 right-2.5 w-5 h-5 bg-current rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-slate-950" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      )}
                      <span className="text-3xl">{role.icon}</span>
                      <div className="text-center">
                        <p className="font-semibold text-sm">{role.label}</p>
                        <p className="text-xs mt-0.5 opacity-70">{role.description}</p>
                      </div>
                    </button>
                  ))}
                </div>

                <ErrorBox />

                <button
                  id="btn-continue-role"
                  onClick={handleRoleContinue}
                  className="w-full mt-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-violet-500/20 active:scale-[0.98]"
                >
                  Continue →
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px bg-slate-800" />
                  <span className="text-slate-600 text-xs">or</span>
                  <div className="flex-1 h-px bg-slate-800" />
                </div>

                {/* Google Sign-In */}
                <button
                  id="btn-google-signin"
                  onClick={handleGoogleSignIn}
                  className="w-full flex items-center justify-center gap-3 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 hover:border-slate-600 py-3 rounded-xl text-sm font-medium text-slate-300 hover:text-white transition-all active:scale-[0.98]"
                >
                  {/* Google icon */}
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button>
              </div>
            )}

            {/* ── STEP 2: Credentials ── */}
            {step === 'credentials' && (
              <div>
                {/* Back button + role badge */}
                <div className="flex items-center gap-3 mb-6">
                  <button
                    id="btn-back-to-role"
                    onClick={() => { setStep('role'); setError(''); setEmail(''); setPassword('') }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    aria-label="Go back"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${activeRoleConfig?.activeBg}`}>
                    <span>{activeRoleConfig?.icon}</span>
                    <span>Signing in as {activeRoleConfig?.label}</span>
                  </div>
                </div>

                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-white">Welcome back</h2>
                  <p className="text-slate-500 text-sm mt-1">Enter your credentials to sign in</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Email */}
                  <div>
                    <label htmlFor="login-email" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </span>
                      <input
                        id="login-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-slate-800/80 border border-slate-700 focus:border-violet-500 rounded-xl px-4 py-3 pl-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all"
                        placeholder="you@college.edu"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label htmlFor="login-password" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </span>
                      <input
                        id="login-password"
                        type={showPass ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-slate-800/80 border border-slate-700 focus:border-violet-500 rounded-xl px-4 py-3 pl-10 pr-11 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all"
                        placeholder="Enter your password"
                        required
                      />
                      <button
                        type="button"
                        id="btn-toggle-password"
                        onClick={() => setShowPass(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1"
                        aria-label={showPass ? 'Hide password' : 'Show password'}
                      >
                        {showPass ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <ErrorBox />

                  {/* Submit */}
                  <button
                    id="btn-login-submit"
                    type="submit"
                    disabled={loading}
                    className={`w-full py-3 rounded-xl font-semibold text-white transition-all shadow-lg active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed ${
                      selectedRole === 'STUDENT'
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/20'
                        : selectedRole === 'ADMIN'
                        ? 'bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 shadow-rose-500/20'
                        : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 shadow-violet-500/20'
                    }`}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        Signing in…
                      </span>
                    ) : `Sign In as ${activeRoleConfig?.label}`}
                  </button>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px bg-slate-800" />
                  <span className="text-slate-600 text-xs">or</span>
                  <div className="flex-1 h-px bg-slate-800" />
                </div>

                {/* Google Sign-In */}
                <button
                  id="btn-google-signin-step2"
                  onClick={handleGoogleSignIn}
                  className="w-full flex items-center justify-center gap-3 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 hover:border-slate-600 py-3 rounded-xl text-sm font-medium text-slate-300 hover:text-white transition-all active:scale-[0.98]"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-600 text-xs mt-6">
          © {new Date().getFullYear()} Collego · AI-Powered College ERP
        </p>
      </div>
    </div>
  )
}
