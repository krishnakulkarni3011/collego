import { useState, useEffect, useCallback } from 'react'
import {
  BookMarked, Plus, RefreshCw, Trash2, CalendarDays, MapPin,
  Users, ChevronDown, ChevronUp, CheckCircle2, XCircle,
  ArrowUpRight, GraduationCap, AlertTriangle,
} from 'lucide-react'
import api from '../../services/api'
import { PageTitle, Panel, StatCard, EmptyState, Spinner } from './PortalUI'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'

const EXAM_TYPES = [
  { value: 'MID_TERM', label: 'Mid-term' },
  { value: 'END_SEMESTER', label: 'End semester' },
  { value: 'PRACTICAL', label: 'Practical' },
  { value: 'INTERNAL', label: 'Internal' },
]

function fmtDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function ExamsAdminTab({ showMsg }) {
  const [exams, setExams] = useState([])
  const [sections, setSections] = useState([])
  const [semesters, setSemesters] = useState([])
  const [invigilators, setInvigilators] = useState([])
  const [revaluations, setRevaluations] = useState([])
  const [loading, setLoading] = useState(true)

  const [showExamForm, setShowExamForm] = useState(false)
  const [examForm, setExamForm] = useState({ name: '', examType: 'MID_TERM', semesterId: '', startDate: '', endDate: '' })
  const [creating, setCreating] = useState(false)

  const [expandedId, setExpandedId] = useState(null)
  const [schedules, setSchedules] = useState([])
  const [scheduleForm, setScheduleForm] = useState({ courseId: '', sectionId: '', examDate: '', startTime: '', endTime: '', room: '', invigilatorId: '' })
  const [savingSchedule, setSavingSchedule] = useState(false)

  const [seatingId, setSeatingId] = useState(null)
  const [seating, setSeating] = useState([])

  const [responses, setResponses] = useState({})
  const [promotion, setPromotion] = useState({ fromSemesterId: '', toSemesterId: '', preview: null })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [examRes, sectionRes, semesterRes, invigRes, revalRes] = await Promise.all([
        api.get('/api/admin/exams'),
        api.get('/api/sections'),
        api.get('/api/semesters'),
        api.get('/api/admin/exams/invigilators'),
        api.get('/api/admin/exams/revaluations'),
      ])
      setExams(Array.isArray(examRes.data) ? examRes.data : [])
      setSections(Array.isArray(sectionRes.data) ? sectionRes.data : [])
      setSemesters(Array.isArray(semesterRes.data) ? semesterRes.data : [])
      setInvigilators(Array.isArray(invigRes.data) ? invigRes.data : [])
      setRevaluations(Array.isArray(revalRes.data) ? revalRes.data : [])
    } catch {
      showMsg?.('Failed to load examination data', 'error')
    } finally {
      setLoading(false)
    }
  }, [showMsg])

  useEffect(() => { load() }, [load])

  const createExam = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      await api.post('/api/admin/exams', {
        ...examForm,
        semesterId: Number(examForm.semesterId),
        startDate: examForm.startDate || null,
        endDate: examForm.endDate || null,
      })
      showMsg?.('Exam created as draft')
      setShowExamForm(false)
      setExamForm({ name: '', examType: 'MID_TERM', semesterId: '', startDate: '', endDate: '' })
      await load()
    } catch (err) {
      showMsg?.(err.response?.data?.message || 'Failed to create exam', 'error')
    } finally {
      setCreating(false)
    }
  }

  const setStatus = async (exam, status) => {
    try {
      await api.put(`/api/admin/exams/${exam.id}/status`, null, { params: { status } })
      showMsg?.(`Exam marked ${status.toLowerCase()}`)
      await load()
    } catch (err) {
      showMsg?.(err.response?.data?.message || 'Failed to update exam', 'error')
    }
  }

  const deleteExam = async (exam) => {
    if (!window.confirm(`Delete "${exam.name}" and all its papers?`)) return
    try {
      await api.delete(`/api/admin/exams/${exam.id}`)
      showMsg?.('Exam deleted')
      if (expandedId === exam.id) setExpandedId(null)
      if (seatingId === exam.id) { setSeatingId(null); setSeating([]) }
      await load()
    } catch (err) {
      showMsg?.(err.response?.data?.message || 'Failed to delete exam', 'error')
    }
  }

  const toggleExam = async (exam) => {
    if (expandedId === exam.id) { setExpandedId(null); setSchedules([]); return }
    setExpandedId(exam.id)
    setScheduleForm({ courseId: '', sectionId: '', examDate: '', startTime: '', endTime: '', room: '', invigilatorId: '' })
    try {
      const res = await api.get(`/api/admin/exams/${exam.id}/schedules`)
      setSchedules(Array.isArray(res.data) ? res.data : [])
    } catch {
      setSchedules([])
    }
  }

  const activeExam = exams.find(e => e.id === expandedId) || null
  const examSections = activeExam ? sections.filter(s => s.semesterId === activeExam.semesterId) : []
  const courseOptions = Array.from(
    new Map(examSections.map(s => [s.courseId, { id: s.courseId, name: s.courseName, code: s.courseCode }])).values()
  )
  const sectionOptions = scheduleForm.courseId
    ? examSections.filter(s => s.courseId === Number(scheduleForm.courseId))
    : examSections

  const addSchedule = async (e) => {
    e.preventDefault()
    if (!activeExam) return
    setSavingSchedule(true)
    try {
      await api.post('/api/admin/exams/schedules', {
        examId: activeExam.id,
        courseId: Number(scheduleForm.courseId),
        sectionId: Number(scheduleForm.sectionId),
        examDate: scheduleForm.examDate,
        startTime: scheduleForm.startTime,
        endTime: scheduleForm.endTime,
        room: scheduleForm.room || null,
        invigilatorId: scheduleForm.invigilatorId ? Number(scheduleForm.invigilatorId) : null,
      })
      showMsg?.('Paper added to exam')
      const res = await api.get(`/api/admin/exams/${activeExam.id}/schedules`)
      setSchedules(Array.isArray(res.data) ? res.data : [])
      setScheduleForm({ courseId: '', sectionId: '', examDate: '', startTime: '', endTime: '', room: '', invigilatorId: '' })
      await load()
    } catch (err) {
      showMsg?.(err.response?.data?.message || 'Failed to add paper', 'error')
    } finally {
      setSavingSchedule(false)
    }
  }

  const removeSchedule = async (schedule) => {
    if (!window.confirm('Remove this paper from the exam?')) return
    try {
      await api.delete(`/api/admin/exams/schedules/${schedule.id}`)
      const res = await api.get(`/api/admin/exams/${activeExam.id}/schedules`)
      setSchedules(Array.isArray(res.data) ? res.data : [])
      await load()
    } catch (err) {
      showMsg?.(err.response?.data?.message || 'Failed to remove paper', 'error')
    }
  }

  const changeInvigilator = async (schedule, facultyId) => {
    try {
      await api.put(`/api/admin/exams/schedules/${schedule.id}/invigilator`, null, {
        params: { facultyId: facultyId ? Number(facultyId) : null },
      })
      const res = await api.get(`/api/admin/exams/${activeExam.id}/schedules`)
      setSchedules(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      showMsg?.(err.response?.data?.message || 'Failed to assign invigilator', 'error')
    }
  }

  const viewSeating = async (exam) => {
    if (seatingId === exam.id) { setSeatingId(null); setSeating([]); return }
    setSeatingId(exam.id)
    try {
      const res = await api.get(`/api/admin/exams/${exam.id}/seating`)
      setSeating(Array.isArray(res.data) ? res.data : [])
    } catch {
      setSeating([])
    }
  }

  const resolveRevaluation = async (item, status) => {
    try {
      await api.put(`/api/admin/exams/revaluations/${item.id}`, {
        status,
        response: responses[item.id] || null,
      })
      showMsg?.(`Revaluation ${status.toLowerCase()}`)
      const res = await api.get('/api/admin/exams/revaluations')
      setRevaluations(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      showMsg?.(err.response?.data?.message || 'Failed to update request', 'error')
    }
  }

  const previewPromotion = async () => {
    if (!promotion.fromSemesterId || !promotion.toSemesterId) {
      showMsg?.('Select both semesters', 'error')
      return
    }
    try {
      const res = await api.get('/api/admin/exams/promotion/preview', {
        params: { fromSemesterId: promotion.fromSemesterId, toSemesterId: promotion.toSemesterId },
      })
      setPromotion(p => ({ ...p, preview: res.data }))
    } catch (err) {
      showMsg?.(err.response?.data?.message || 'Failed to preview promotion', 'error')
    }
  }

  const runPromotion = async () => {
    if (!promotion.preview) return
    if (!window.confirm(`Promote ${promotion.preview.eligibleCount} students from ${promotion.preview.fromSemester} to ${promotion.preview.toSemester}? This updates their semester and enrolments.`)) return
    try {
      const res = await api.post('/api/admin/exams/promotion', null, {
        params: { fromSemesterId: promotion.fromSemesterId, toSemesterId: promotion.toSemesterId },
      })
      showMsg?.(`${res.data.promoted} students promoted`)
      setPromotion(p => ({ ...p, preview: null }))
      await load()
    } catch (err) {
      showMsg?.(err.response?.data?.message || 'Promotion failed', 'error')
    }
  }

  const pendingRevaluations = revaluations.filter(r => r.status === 'PENDING').length
  const publishedExams = exams.filter(e => e.status === 'PUBLISHED').length

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Spinner color="indigo" /></div>
  }

  const seatingGroups = seating.reduce((groups, row) => {
    const key = row.scheduleId
    if (!groups[key]) groups[key] = []
    groups[key].push(row)
    return groups
  }, {})

  return (
    <div className="space-y-6">
      <PageTitle
        icon={BookMarked}
        title="Examinations"
        subtitle="Exam periods, paper schedules, seating, invigilation, revaluation and promotion."
        accent="indigo"
        actions={
          <Button variant="gradient" size="sm" onClick={() => setShowExamForm(v => !v)}>
            <span className="flex gap-1"><Plus size={14} /> {showExamForm ? 'Cancel' : 'New exam'}</span>
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard index={0} label="Exams" value={exams.length} icon={BookMarked} accent="indigo" sub={`${publishedExams} published`} glow />
        <StatCard index={1} label="Papers scheduled" value={exams.reduce((sum, e) => sum + Number(e.scheduleCount || 0), 0)} icon={CalendarDays} accent="blue" glow />
        <StatCard index={2} label="Pending revaluations" value={pendingRevaluations} icon={AlertTriangle} accent={pendingRevaluations > 0 ? 'amber' : 'emerald'} glow />
      </div>

      {showExamForm && (
        <Panel title="Create exam" icon={Plus} accent="indigo">
          <form onSubmit={createExam} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Name</label>
              <input required value={examForm.name} onChange={e => setExamForm({ ...examForm, name: e.target.value })} className="collego-input" placeholder="Mid-term examinations" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Type</label>
              <select value={examForm.examType} onChange={e => setExamForm({ ...examForm, examType: e.target.value })} className="collego-input">
                {EXAM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Semester</label>
              <select required value={examForm.semesterId} onChange={e => setExamForm({ ...examForm, semesterId: e.target.value })} className="collego-input">
                <option value="">Select semester</option>
                {semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Start date</label>
              <input type="date" value={examForm.startDate} onChange={e => setExamForm({ ...examForm, startDate: e.target.value })} className="collego-input" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">End date</label>
              <input type="date" value={examForm.endDate} onChange={e => setExamForm({ ...examForm, endDate: e.target.value })} className="collego-input" />
            </div>
            <div className="flex items-end">
              <Button type="submit" variant="gradient" size="sm" disabled={creating} className="w-full">
                {creating ? <span className="flex gap-1"><RefreshCw size={13} className="animate-spin" /> Creating...</span> : 'Create exam'}
              </Button>
            </div>
          </form>
        </Panel>
      )}

      <Panel title="Exam periods" icon={CalendarDays} accent="blue">
        {exams.length === 0 ? (
          <EmptyState icon={BookMarked} title="No exams yet" accent="indigo" description="Create an exam period, add papers, then publish it to release hall tickets." />
        ) : (
          <div className="space-y-3">
            {exams.map(exam => {
              const expanded = expandedId === exam.id
              return (
                <div key={exam.id} className="rounded-2xl border border-white/70 bg-white/50 overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <button onClick={() => toggleExam(exam)} className="flex items-center gap-2 text-left">
                      {expanded ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{exam.name}</p>
                        <p className="text-[11px] text-slate-400">
                          {exam.semesterName} · {EXAM_TYPES.find(t => t.value === exam.examType)?.label || exam.examType}
                          {' · '}{fmtDate(exam.startDate)} – {fmtDate(exam.endDate)}
                          {' · '}{exam.scheduleCount} paper{exam.scheduleCount === 1 ? '' : 's'}
                        </p>
                      </div>
                    </button>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={exam.status === 'PUBLISHED' ? 'success' : exam.status === 'COMPLETED' ? 'secondary' : 'warning'}>{exam.status}</Badge>
                      {exam.status === 'DRAFT' && (
                        <Button variant="success" size="sm" onClick={() => setStatus(exam, 'PUBLISHED')}><CheckCircle2 size={12} /> Publish</Button>
                      )}
                      {exam.status === 'PUBLISHED' && (
                        <Button variant="outline" size="sm" onClick={() => setStatus(exam, 'COMPLETED')}>Complete</Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => viewSeating(exam)}>
                        <Users size={12} /> Seating
                      </Button>
                      <button onClick={() => deleteExam(exam)} className="text-rose-500 hover:text-rose-700 p-1.5"><Trash2 size={14} /></button>
                    </div>
                  </div>

                  {expanded && (
                    <div className="border-t border-white/60 bg-slate-50/40 p-4 space-y-4">
                      {schedules.length === 0 ? (
                        <p className="text-xs text-slate-400">No papers scheduled yet.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="collego-table">
                            <thead>
                              <tr>
                                <th>Course</th><th>Section</th><th>Date</th><th>Time</th><th>Room</th><th>Invigilator</th><th>Students</th><th></th>
                              </tr>
                            </thead>
                            <tbody>
                              {schedules.map(s => (
                                <tr key={s.id}>
                                  <td className="text-slate-700 font-medium">{s.courseName}<span className="text-slate-400 text-[10px] ml-1">{s.courseCode}</span></td>
                                  <td className="text-slate-500">{s.sectionName}</td>
                                  <td className="text-slate-500">{fmtDate(s.examDate)}</td>
                                  <td className="text-slate-500">{s.startTime?.slice(0, 5)} – {s.endTime?.slice(0, 5)}</td>
                                  <td className="text-slate-500">{s.room || '—'}</td>
                                  <td>
                                    <select
                                      value={s.invigilatorId || ''}
                                      onChange={e => changeInvigilator(s, e.target.value)}
                                      className="collego-input !py-1.5 !text-[11px] min-w-[150px]"
                                    >
                                      <option value="">Unassigned</option>
                                      {invigilators.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                    </select>
                                  </td>
                                  <td className="text-slate-500">{s.studentCount}</td>
                                  <td>
                                    <button onClick={() => removeSchedule(s)} className="text-rose-500 hover:text-rose-700"><Trash2 size={13} /></button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      <form onSubmit={addSchedule} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                        <div>
                          <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Course</label>
                          <select required value={scheduleForm.courseId} onChange={e => setScheduleForm({ ...scheduleForm, courseId: e.target.value, sectionId: '' })} className="collego-input">
                            <option value="">Select course</option>
                            {courseOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Section</label>
                          <select required value={scheduleForm.sectionId} onChange={e => setScheduleForm({ ...scheduleForm, sectionId: e.target.value })} className="collego-input">
                            <option value="">Select section</option>
                            {sectionOptions.map(s => <option key={s.id} value={s.id}>{s.courseName} · {s.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Date</label>
                          <input required type="date" value={scheduleForm.examDate} onChange={e => setScheduleForm({ ...scheduleForm, examDate: e.target.value })} className="collego-input" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Start</label>
                            <input required type="time" value={scheduleForm.startTime} onChange={e => setScheduleForm({ ...scheduleForm, startTime: e.target.value })} className="collego-input" />
                          </div>
                          <div>
                            <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">End</label>
                            <input required type="time" value={scheduleForm.endTime} onChange={e => setScheduleForm({ ...scheduleForm, endTime: e.target.value })} className="collego-input" />
                          </div>
                        </div>
                        <div>
                          <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Room</label>
                          <input value={scheduleForm.room} onChange={e => setScheduleForm({ ...scheduleForm, room: e.target.value })} className="collego-input" placeholder="e.g. CSE-201" />
                        </div>
                        <div>
                          <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Invigilator</label>
                          <select value={scheduleForm.invigilatorId} onChange={e => setScheduleForm({ ...scheduleForm, invigilatorId: e.target.value })} className="collego-input">
                            <option value="">Unassigned</option>
                            {invigilators.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                          </select>
                        </div>
                        <div className="flex items-end xl:col-span-2">
                          <Button type="submit" variant="gradient" size="sm" disabled={savingSchedule}>
                            {savingSchedule ? <span className="flex gap-1"><RefreshCw size={13} className="animate-spin" /> Adding...</span> : <span className="flex gap-1"><Plus size={13} /> Add paper</span>}
                          </Button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Panel>

      {seatingId && (
        <Panel title="Seating plan" icon={Users} accent="violet">
          {seating.length === 0 ? (
            <p className="text-xs text-slate-400">No enrolled students for the scheduled papers.</p>
          ) : (
            <div className="space-y-5">
              {Object.entries(seatingGroups).map(([scheduleId, rows]) => {
                const first = rows[0]
                return (
                  <div key={scheduleId} className="rounded-xl border border-white/70 bg-white/50 overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-50/70">
                      <p className="text-xs font-semibold text-slate-700">
                        {first.courseName} <span className="text-slate-400 font-normal">({first.courseCode})</span>
                        {' · '}{fmtDate(first.examDate)} · {first.startTime?.slice(0, 5)} – {first.endTime?.slice(0, 5)}
                      </p>
                      <p className="text-[11px] text-slate-500 flex items-center gap-3">
                        <span className="flex items-center gap-1"><MapPin size={11} /> {first.room || 'TBA'}</span>
                        <span className="flex items-center gap-1"><Users size={11} /> {first.invigilatorName || 'No invigilator'}</span>
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="collego-table">
                        <thead><tr><th>Seat</th><th>USN</th><th>Student</th><th>Section</th></tr></thead>
                        <tbody>
                          {rows.map(r => (
                            <tr key={`${r.scheduleId}-${r.studentId}`}>
                              <td className="font-semibold text-slate-700">{r.seatNumber}</td>
                              <td className="text-slate-500">{r.enrollmentNumber}</td>
                              <td className="text-slate-700">{r.studentName}</td>
                              <td className="text-slate-500">{r.sectionName}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Panel>
      )}

      <Panel title="Revaluation requests" icon={AlertTriangle} accent="amber">
        {revaluations.length === 0 ? (
          <p className="text-xs text-slate-400">No revaluation requests yet.</p>
        ) : (
          <div className="space-y-2">
            {revaluations.map(item => (
              <div key={item.id} className="rounded-xl border border-white/70 bg-white/50 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{item.studentName} <span className="text-slate-400 text-xs">({item.enrollmentNumber})</span></p>
                    <p className="text-xs text-slate-500">{item.courseName} · {item.semesterName}</p>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-2xl">{item.reason}</p>
                    {item.response && <p className="text-[11px] text-slate-500 mt-1">Response: {item.response}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={item.status === 'APPROVED' ? 'success' : item.status === 'REJECTED' ? 'destructive' : 'warning'}>{item.status}</Badge>
                    {item.status === 'PENDING' && (
                      <>
                        <input
                          value={responses[item.id] || ''}
                          onChange={e => setResponses({ ...responses, [item.id]: e.target.value })}
                          placeholder="Response (optional)"
                          className="collego-input !py-1.5 !text-[11px] w-44"
                        />
                        <Button variant="success" size="sm" onClick={() => resolveRevaluation(item, 'APPROVED')}><CheckCircle2 size={12} /> Approve</Button>
                        <Button variant="destructive" size="sm" onClick={() => resolveRevaluation(item, 'REJECTED')}><XCircle size={12} /> Reject</Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Semester promotion" icon={ArrowUpRight} accent="emerald">
        <p className="text-xs text-slate-500 mb-4">
          Promote a batch to the next semester. Current enrolments are closed and new enrolments are created
          from the target semester's sections. Review the preview before confirming.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">From</label>
            <select value={promotion.fromSemesterId} onChange={e => setPromotion({ ...promotion, fromSemesterId: e.target.value, preview: null })} className="collego-input">
              <option value="">Select semester</option>
              {semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">To</label>
            <select value={promotion.toSemesterId} onChange={e => setPromotion({ ...promotion, toSemesterId: e.target.value, preview: null })} className="collego-input">
              <option value="">Select semester</option>
              {semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <Button variant="outline" size="sm" onClick={previewPromotion}>Preview</Button>
            <Button variant="gradient" size="sm" onClick={runPromotion} disabled={!promotion.preview}>Promote</Button>
          </div>
        </div>
        {promotion.preview && (
          <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-xs text-emerald-800">
            <p className="font-semibold flex items-center gap-1"><GraduationCap size={14} /> {promotion.preview.fromSemester} → {promotion.preview.toSemester}</p>
            <p className="mt-1">
              {promotion.preview.studentCount} students in the source semester,{' '}
              {promotion.preview.eligibleCount} eligible, {promotion.preview.targetSectionCount} sections in the target semester.
            </p>
          </div>
        )}
      </Panel>
    </div>
  )
}
