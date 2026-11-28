import { useCallback, useEffect, useState } from 'react'
import { Check, RefreshCw, Search, Trophy, X } from 'lucide-react'
import { Panel, EmptyState } from './PortalUI'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import api from '../../services/api'

/** Clean, searchable placement recorder (replaces the old clumsy form). */
export function PlacedStudentsPanel({ users = [], departments = [], showMsg }) {
  const [records, setRecords] = useState([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState([])
  const [form, setForm] = useState({ companyName: '', salary: '', role: '', departmentId: '' })
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/placement/placed-students')
      setRecords(Array.isArray(res.data) ? res.data : [])
    } catch { setRecords([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const students = (users || []).filter(u => u.role === 'STUDENT' && u.active)
  const filtered = students.filter(s => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return (s.firstName || '').toLowerCase().includes(q)
      || (s.lastName || '').toLowerCase().includes(q)
      || (s.usn || s.enrollmentNumber || '').toLowerCase().includes(q)
      || (s.email || '').toLowerCase().includes(q)
  })

  const toggle = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const submit = async () => {
    if (!selected.length || !form.companyName.trim()) return
    setBusy(true)
    try {
      await api.post('/api/placement/placed-students', {
        studentIds: selected,
        companyName: form.companyName.trim(),
        salary: form.salary || null,
        role: form.role || null,
        departmentId: form.departmentId ? Number(form.departmentId) : null,
      })
      showMsg(`${selected.length} student(s) recorded as placed at ${form.companyName.trim()}`)
      setSelected([])
      setForm({ companyName: '', salary: '', role: '', departmentId: '' })
      await load()
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to record placements', 'error')
    } finally { setBusy(false) }
  }

  return (
    <Panel title="Placed Students" icon={Trophy} accent="amber">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-white/60 bg-white/60 p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="text-xs font-semibold text-slate-700">Select students <Badge variant="secondary" className="ml-1">{selected.length}</Badge></p>
            {selected.length > 0 && <button onClick={() => setSelected([])} className="text-[11px] text-indigo-600 hover:underline">Clear</button>}
          </div>
          <div className="relative mb-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name, USN or email" className="collego-input !pl-9" />
          </div>
          <div className="max-h-56 overflow-y-auto rounded-xl border border-white/60 bg-white/70 divide-y divide-white/50">
            {filtered.length === 0 ? (
              <p className="p-4 text-center text-xs text-slate-400">No students found.</p>
            ) : filtered.map(s => (
              <button key={s.id} onClick={() => toggle(s.id)} className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-white transition-colors ${selected.includes(s.id) ? 'bg-indigo-50/70' : ''}`}>
                <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selected.includes(s.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'}`}>
                  {selected.includes(s.id) && <Check size={12} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-xs font-semibold text-slate-700 block truncate">{s.firstName} {s.lastName}</span>
                  <span className="text-[10px] text-slate-400">{s.usn || s.enrollmentNumber || s.email}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/60 bg-white/60 p-4 space-y-3">
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Company Name</label>
            <input value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })} placeholder="Company" className="collego-input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Salary</label>
              <input value={form.salary} onChange={e => setForm({ ...form, salary: e.target.value })} placeholder="e.g. 8 LPA" className="collego-input" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Role</label>
              <input value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} placeholder="e.g. SDE" className="collego-input" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Department (optional)</label>
            <select value={form.departmentId} onChange={e => setForm({ ...form, departmentId: e.target.value })} className="collego-input">
              <option value="">Use student department</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <Button variant="gradient" size="sm" onClick={submit} disabled={busy || !selected.length || !form.companyName.trim()} className="w-full">
            {busy ? <><RefreshCw size={14} className="animate-spin" /> Saving...</> : <>Record {selected.length || ''} Placement{selected.length === 1 ? '' : 's'}</>}
          </Button>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Recorded placements</p>
        {loading ? (
          <p className="text-xs text-slate-400">Loading...</p>
        ) : records.length === 0 ? (
          <EmptyState icon={Trophy} title="No placements recorded" accent="amber" description="Select students and add a company above." />
        ) : (
          <div className="divide-y divide-white/60 rounded-xl border border-white/60 bg-white/50 max-h-64 overflow-y-auto">
            {records.map(r => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{r.name} <span className="text-slate-400 font-normal">({r.usn})</span></p>
                  <p className="text-[10px] text-slate-400">{r.companyName} - {r.role || 'Role N/A'} - {r.salary || 'Salary N/A'} - {r.department || 'N/A'}</p>
                </div>
                <Badge variant="success">{r.companyName}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </Panel>
  )
}
