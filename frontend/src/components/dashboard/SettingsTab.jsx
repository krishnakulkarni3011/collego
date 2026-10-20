import { useState, useEffect } from 'react'
import { User, Lock, Save, Mail, ShieldCheck, Phone, BadgeCheck, RefreshCw } from 'lucide-react'
import api from '../../services/api'
import { authService } from '../../services/authService'
import { PageTitle, Spinner } from './PortalUI'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'

/**
 * Shared self-service settings screen: edit name/phone and change password.
 * Used by the student, faculty, and admin portals.
 */
export function SettingsTab({ showMsg, accent = 'blue' }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const res = await api.get('/api/profile')
        if (!mounted) return
        setProfile(res.data)
        setFirstName(res.data.firstName || '')
        setLastName(res.data.lastName || '')
        setPhone(res.data.phone || '')
      } catch {
        showMsg?.('Failed to load profile', 'error')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [showMsg])

  const saveProfile = async (e) => {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim()) {
      showMsg?.('First and last name are required', 'error')
      return
    }
    setSavingProfile(true)
    try {
      const res = await api.put('/api/profile', { firstName, lastName, phone })
      setProfile(res.data)
      showMsg?.('Profile updated')
    } catch (err) {
      showMsg?.(err.response?.data?.message || 'Failed to update profile', 'error')
    } finally {
      setSavingProfile(false)
    }
  }

  const changePassword = async (e) => {
    e.preventDefault()
    if (newPassword.length < 8) {
      showMsg?.('New password must be at least 8 characters', 'error')
      return
    }
    if (newPassword !== confirmPassword) {
      showMsg?.('New passwords do not match', 'error')
      return
    }
    setSavingPassword(true)
    try {
      await api.post('/api/profile/password', { currentPassword, newPassword })
      showMsg?.('Password changed. Please sign in again.')
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
      setTimeout(() => {
        authService.logout()
        window.location.href = '/login'
      }, 1400)
    } catch (err) {
      showMsg?.(err.response?.data?.message || 'Failed to change password', 'error')
    } finally {
      setSavingPassword(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Spinner color={accent} /></div>
  }

  return (
    <div className="space-y-6">
      <PageTitle
        icon={User}
        title="Settings"
        subtitle="Manage your profile details and account security."
        accent={accent}
        actions={profile?.role && <Badge variant="info">{profile.role}</Badge>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 border border-white/60">
          <h3 className="text-sm font-semibold text-slate-800 mb-5 flex items-center gap-2">
            <User size={15} className="text-blue-500" /> Profile
          </h3>
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">First name</label>
                <input value={firstName} onChange={e => setFirstName(e.target.value)} className="collego-input" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Last name</label>
                <input value={lastName} onChange={e => setLastName(e.target.value)} className="collego-input" />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Email</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={profile?.email || ''} readOnly className="collego-input !pl-9 bg-slate-50/70 text-slate-500" />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Phone</label>
              <div className="relative">
                <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Optional" className="collego-input !pl-9" />
              </div>
            </div>

            {(profile?.enrollmentNumber || profile?.employeeId) && (
              <div className="flex flex-wrap gap-2 pt-1">
                {profile.enrollmentNumber && <Badge variant="purple">USN: {profile.enrollmentNumber}</Badge>}
                {profile.employeeId && <Badge variant="purple">ID: {profile.employeeId}</Badge>}
                {profile.departmentCode && <Badge variant="secondary">{profile.departmentCode}</Badge>}
                {profile.designation && <Badge variant="secondary">{profile.designation}</Badge>}
                {profile.currentSemester && <Badge variant="secondary">Semester {profile.currentSemester}</Badge>}
              </div>
            )}

            <Button type="submit" variant="gradient" size="sm" disabled={savingProfile}>
              {savingProfile
                ? <span className="flex gap-1"><RefreshCw size={13} className="animate-spin" /> Saving...</span>
                : <span className="flex gap-1"><Save size={13} /> Save profile</span>}
            </Button>
          </form>
        </div>

        <div className="glass-card p-6 border border-white/60">
          <h3 className="text-sm font-semibold text-slate-800 mb-5 flex items-center gap-2">
            <Lock size={15} className="text-rose-500" /> Change password
          </h3>
          <form onSubmit={changePassword} className="space-y-4">
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Current password</label>
              <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="collego-input" autoComplete="current-password" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">New password</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="collego-input" autoComplete="new-password" />
              <p className="text-[10px] text-slate-400 mt-1">At least 8 characters.</p>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Confirm new password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="collego-input" autoComplete="new-password" />
            </div>
            <Button type="submit" variant="gradient" size="sm" disabled={savingPassword}>
              {savingPassword
                ? <span className="flex gap-1"><RefreshCw size={13} className="animate-spin" /> Updating...</span>
                : <span className="flex gap-1"><ShieldCheck size={13} /> Update password</span>}
            </Button>
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              <BadgeCheck size={11} /> You will be signed out of all sessions after changing your password.
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
