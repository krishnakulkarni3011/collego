import { useState, useEffect, useCallback } from 'react'
import { confirmAction } from '../common/ConfirmDialog.jsx'
import { GraduationCap, RefreshCw, ArrowUpRight, Check, AlertTriangle } from 'lucide-react'
import { PageTitle, Panel, EmptyState, Spinner } from './PortalUI'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import api from '../../services/api'

/** Admin-controlled semester promotion. No automatic hold-backs. */
export function PromotionTab({ semesters = [], showMsg }) {
  const [fromId, setFromId] = useState('')
  const [toId, setToId] = useState('')
  const [students, setStudents] = useState([])
  const [heldBack, setHeldBack] = useState([])
  const [notes, setNotes] = useState({})
  const [previewLoading, setPreviewLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [history, setHistory] = useState([])

  const loadHistory = useCallback(async () => {
    try {
      const res = await api.get('/api/admin/exams/promotion/history')
      setHistory(Array.isArray(res.data) ? res.data : [])
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])

  const chooseFrom = (id) => {
    setFromId(id)
    setToId('')
    setStudents([])
    setHeldBack([])
    const from = semesters.find(s => String(s.id) === String(id))
    if (from) {
      const target = semesters.find(s => s.number === (from.number === 8 ? 8 : from.number + 1))
      if (target) setToId(String(target.id))
    }
  }

  const preview = async () => {
    if (!fromId || !toId) return
    setPreviewLoading(true)
    try {
      const res = await api.get('/api/admin/exams/promotion/preview-batch', {
        params: { fromSemesterId: Number(fromId), toSemesterId: Number(toId) },
      })
      setStudents(Array.isArray(res.data) ? res.data : [])
      setHeldBack([])
      setNotes({})
    } catch (err) {
      showMsg(err.response?.data?.message || 'Could not preview promotion', 'error')
    } finally { setPreviewLoading(false) }
  }

  const toggleHold = (id) => setHeldBack(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const run = async () => {
    if (!students.length) return
    const graduating = students[0]?.defaultOutcome === 'GRADUATE'
    const action = graduating ? 'graduate' : 'promote'
    const count = graduating ? students.length - heldBack.length : students.length - heldBack.length
    if (!await confirmAction({ title: 'Are you sure?', message: `${count} student(s) will ${action}. ${heldBack.length} held back. Continue?`, confirmLabel: 'Confirm' })) return
    setBusy(true)
    try {
      const res = await api.post('/api/admin/exams/promotion/run', {
        fromSemesterId: Number(fromId),
        toSemesterId: Number(toId),
        heldBackStudentIds: heldBack,
        notes,
      })
      const r = res.data || {}
      showMsg(`Done - ${r.promoted || 0} promoted, ${r.graduated || 0} graduated, ${r.heldBack || 0} held back.`)
      setStudents([])
      setHeldBack([])
      await loadHistory()
    } catch (err) {
      showMsg(err.response?.data?.message || 'Promotion failed', 'error')
    } finally { setBusy(false) }
  }

  return (
    <div className="space-y-6">
      <PageTitle icon={ArrowUpRight} title="Semester Promotion" accent="emerald"
        subtitle="Promote a batch or graduate final-semester students. Only students you explicitly select are held back." />

      <div className="glass-card p-6 border border-white/60">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">From semester</label>
            <select value={fromId} onChange={e => chooseFrom(e.target.value)} className="collego-input">
              <option value="">Select semester</option>
              {semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">To semester</label>
            <select value={toId} onChange={e => setToId(e.target.value)} className="collego-input">
              <option value="">Select semester</option>
              {semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <Button variant="outline" size="sm" onClick={preview} disabled={!fromId || !toId || previewLoading}>
            {previewLoading ? <><RefreshCw size={14} className="animate-spin" /> Loading...</> : <>Preview batch</>}
          </Button>
          <Button variant="gradient" size="sm" onClick={run} disabled={busy || !students.length}>
            {busy ? <><RefreshCw size={14} className="animate-spin" /> Working...</> : <><Check size={14} /> Confirm promotion</>}
          </Button>
        </div>
        <p className="text-[10px] text-slate-400 mt-3">
          Semester 8 batches graduate by default. Attendance/backlog columns are informational only.
        </p>
      </div>

      {previewLoading ? (
        <div className="flex items-center justify-center py-16"><Spinner color="emerald" /></div>
      ) : students.length > 0 ? (
        <Panel title={`Students in batch (${heldBack.length} held back)`} icon={GraduationCap} accent="emerald">
          <div className="overflow-x-auto">
            <table className="collego-table">
              <thead>
                <tr>
                  <th>Hold back</th><th>Name</th><th>USN</th><th>Department</th>
                  <th>Sec</th><th>Attendance</th><th>Backlogs</th><th>Default</th><th>Note</th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.studentId} className={heldBack.includes(s.studentId) ? 'bg-amber-50/60' : ''}>
                    <td>
                      <input type="checkbox" checked={heldBack.includes(s.studentId)}
                        onChange={() => toggleHold(s.studentId)} className="rounded w-4 h-4 cursor-pointer" />
                    </td>
                    <td className="font-medium text-slate-800">{s.name}</td>
                    <td><code className="text-[10px] text-slate-400">{s.usn}</code></td>
                    <td>{s.departmentName}</td>
                    <td>{s.section || '-'}</td>
                    <td>{Number(s.attendancePercentage || 0).toFixed(1)}%</td>
                    <td>{s.backlogCount ?? 0}</td>
                    <td><Badge variant={s.defaultOutcome === 'GRADUATE' ? 'success' : 'info'}>{s.defaultOutcome}</Badge></td>
                    <td>
                      <input value={notes[s.studentId] || ''}
                        onChange={e => setNotes(prev => ({ ...prev, [s.studentId]: e.target.value }))}
                        placeholder="Optional" className="collego-input !py-1 !text-xs" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : (
        <div className="glass-card p-12 border border-white/60">
          <EmptyState icon={AlertTriangle} title="No preview yet" accent="emerald"
            description="Choose semesters and preview to see the batch." />
        </div>
      )}

      <Panel title="Promotion history" icon={GraduationCap} accent="violet">
        {history.length === 0 ? (
          <p className="text-xs text-slate-400">No promotion batches yet.</p>
        ) : (
          <div className="space-y-2">
            {history.map(b => (
              <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-white/60 bg-white/60">
                <p className="text-xs font-semibold text-slate-700">Semester {b.fromSemester} to {b.toSemester} - {b.academicYear}</p>
                <p className="text-[11px] text-slate-400">
                  {b.promoted} promoted - {b.graduated} graduated - {b.heldBack} held back
                </p>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}
