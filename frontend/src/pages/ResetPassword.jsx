import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, Lock, RefreshCw } from 'lucide-react'
import { authService } from '../services/authService'
import { Button } from '../components/ui/button'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!token) {
      setError('This reset link is missing its token. Please request a new link.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await authService.resetPassword(token, password)
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.message || 'This reset link is invalid or has expired. Please request a new one.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen portal-bg login-bg relative overflow-hidden flex items-center justify-center px-4 py-10">
      <div className="bg-mesh" />
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative z-10 w-full max-w-md glass-card border border-white/60 p-7 sm:p-8"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center">
            <Lock size={19} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Reset password</h1>
            <p className="text-xs text-slate-500">Choose a new password for your Collego account.</p>
          </div>
        </div>

        {success ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={28} className="text-emerald-600" />
            </div>
            <h2 className="text-base font-semibold text-slate-900 mb-2">Password updated</h2>
            <p className="text-sm text-slate-500 mb-6">
              Your password has been reset. The link can no longer be used.
            </p>
            <Button variant="gradient" className="w-full py-3" onClick={() => navigate('/login', { replace: true })}>
              Back to sign in
            </Button>
          </div>
        ) : (
          <>
            {!token && (
              <div className="mb-5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>This page needs a valid reset link from your email.</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  New Password
                </label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="collego-input pl-9 pr-10"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter the new password"
                    className="collego-input pl-9"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-600">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                variant="gradient"
                type="submit"
                className="w-full py-3"
                disabled={loading || !token || !password || !confirmPassword}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw size={14} className="animate-spin" /> Updating...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Lock size={14} /> Set New Password
                  </span>
                )}
              </Button>
            </form>

            <button
              type="button"
              onClick={() => navigate('/login', { replace: true })}
              className="mt-5 w-full flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-700"
            >
              <ArrowLeft size={13} /> Back to sign in
            </button>
          </>
        )}
      </motion.div>
    </div>
  )
}
