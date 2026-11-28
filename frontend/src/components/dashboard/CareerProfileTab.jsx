import { useRef, useState } from 'react'
import { Download, FileText, RefreshCw, ShieldCheck, Trash2, Upload, UserCircle } from 'lucide-react'
import { PageTitle, Panel } from './PortalUI'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'

const STATUS = {
  NONE: { label: 'Not submitted', variant: 'secondary', copy: 'Upload your resume to start the approval process.' },
  PENDING: { label: 'Pending review', variant: 'warning', copy: 'Your Head of Department is reviewing your resume. Students cannot download it yet.' },
  APPROVED: { label: 'Approved', variant: 'success', copy: 'Your resume is live in the student faculty directory.' },
  REJECTED: { label: 'Rejected', variant: 'destructive', copy: 'Your resume was not approved. Upload a revised copy.' },
}

/**
 * Faculty Career Profile - the only place a faculty member can manage their
 * own resume. Other faculty resumes are not visible here.
 */
export function CareerProfileTab({ profile, loading, onUpload, onRemove, onDownload }) {
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)

  const status = profile?.resumeStatus || 'NONE'
  const cfg = STATUS[status] || STATUS.NONE

  const submit = async () => {
    if (!file) return
    setBusy(true)
    try {
      await onUpload(file)
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    try {
      await onRemove()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageTitle
        icon={UserCircle}
        title="Career Profile"
        subtitle="Upload your resume. Only you and your Head of Department can see it until it is approved."
        accent="violet"
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <Panel title="Resume" icon={FileText} accent="violet">
            {loading ? (
              <div className="flex items-center justify-center py-10"><RefreshCw size={18} className="animate-spin text-violet-500" /></div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant={cfg.variant}>{cfg.label}</Badge>
                  {profile?.resumeFileName && (
                    <span className="text-xs text-slate-500 truncate max-w-[320px]">{profile.resumeFileName}</span>
                  )}
                </div>
                <p className="text-sm text-slate-500">{cfg.copy}</p>
                {status === 'REJECTED' && profile?.resumeReviewNote && (
                  <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                    Reviewer note: {profile.resumeReviewNote}
                  </p>
                )}

                <div className="border border-dashed border-violet-200 rounded-2xl p-5 bg-violet-50/40">
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Choose a file</label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={e => setFile(e.target.files?.[0] || null)}
                    className="collego-input file:mr-3 file:rounded-lg file:border-0 file:bg-violet-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-violet-700"
                  />
                  <p className="text-[10px] text-slate-400 mt-2">PDF or Word document, up to 10 MB. Uploading a new copy replaces the current resume and resets approval.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="gradient" size="sm" onClick={submit} disabled={!file || busy}>
                    {busy ? <><RefreshCw size={13} className="animate-spin" /> Saving...</> : <><Upload size={13} /> {profile?.hasResume ? 'Replace resume' : 'Upload resume'}</>}
                  </Button>
                  {profile?.hasResume && (
                    <Button variant="outline" size="sm" onClick={() => onDownload('/api/faculty/career-profile/resume', profile.resumeFileName || 'resume.pdf')}>
                      <Download size={13} /> Download mine
                    </Button>
                  )}
                  {profile?.hasResume && (
                    <Button variant="outline" size="sm" onClick={remove} disabled={busy} className="text-red-500 hover:text-red-600">
                      <Trash2 size={13} /> Remove
                    </Button>
                  )}
                </div>
              </div>
            )}
          </Panel>
        </div>

        <Panel title="How approval works" icon={ShieldCheck} accent="emerald">
          <ol className="space-y-4 text-xs text-slate-500">
            <li className="flex gap-2.5">
              <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-600 font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
              Upload your latest resume here. It is visible only to you and your Head of Department.
            </li>
            <li className="flex gap-2.5">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
              Your Head of Department reviews the file. Your status changes to Pending while you wait.
            </li>
            <li className="flex gap-2.5">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 font-bold flex items-center justify-center shrink-0 text-[10px]">3</span>
              Once approved, students can download it from the Faculty Directory.
            </li>
          </ol>
        </Panel>
      </div>
    </div>
  )
}
