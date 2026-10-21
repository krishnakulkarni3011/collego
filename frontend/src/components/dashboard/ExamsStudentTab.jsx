import { useState, useEffect, useCallback } from 'react'
import { BookMarked, CalendarDays, Download, ChevronDown, ChevronUp, RefreshCw, Send, AlertTriangle, CheckCircle2, XCircle, Clock } from 'lucide-react'
import api from '../../services/api'
import { PageTitle, Panel, EmptyState, Spinner } from './PortalUI'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { uiImages } from '../../assets/uiImages'

function fmtDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function ExamsStudentTab({ showMsg, onDownload }) {
  const [exams, setExams] = useState([])
  const [courses, setCourses] = useState([])
  const [revaluations, setRevaluations] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [schedule, setSchedule] = useState([])
  const [loadingSchedule, setLoadingSchedule] = useState(false)

  const [form, setForm] = useState({ courseKey: '', reason: '' })
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [examRes, courseRes, revalRes] = await Promise.all([
        api.get('/api/student/exams'),
        api.get('/api/student/exams/courses'),
        api.get('/api/student/exams/revaluations'),
      ])
      setExams(Array.isArray(examRes.data) ? examRes.data : [])
      setCourses(Array.isArray(courseRes.data) ? courseRes.data : [])
      setRevaluations(Array.isArray(revalRes.data) ? revalRes.data : [])
    } catch {
      showMsg?.('Failed to load examinations', 'error')
    } finally {
      setLoading(false)
    }
  }, [showMsg])

  useEffect(() => { load() }, [load])

  const toggleExam = async (exam) => {
    if (expandedId === exam.id) { setExpandedId(null); setSchedule([]); return }
    setExpandedId(exam.id)
    setLoadingSchedule(true)
    try {
      const res = await api.get(`/api/student/exams/${exam.id}/schedule`)
      setSchedule(Array.isArray(res.data) ? res.data : [])
    } catch {
      setSchedule([])
    } finally {
      setLoadingSchedule(false)
    }
  }

  const submitRevaluation = async (e) => {
    e.preventDefault()
    if (!form.courseKey) { showMsg?.('Select a course', 'error'); return }
    if (!form.reason.trim()) { showMsg?.('Please describe the issue', 'error'); return }
    const [courseId, semesterId] = form.courseKey.split(':').map(Number)
    setSubmitting(true)
    try {
      await api.post('/api/student/exams/revaluations', {
        courseId,
        semesterId,
        reason: form.reason.trim(),
      })
      showMsg?.('Revaluation request submitted')
      setForm({ courseKey: '', reason: '' })
      await load()
    } catch (err) {
      showMsg?.(err.response?.data?.message || 'Failed to submit request', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Spinner color="blue" /></div>
  }

  return (
    <div className="space-y-6">
      <PageTitle
        icon={BookMarked}
        title="Examinations"
        subtitle="Published exams, hall tickets and revaluation requests."
        accent="blue"
        image={uiImages.library} imageAlt="Students studying in the library"
      />

      {exams.length === 0 ? (
        <div className="glass-card p-12 border border-white/60">
          <EmptyState icon={CalendarDays} title="No published exams" accent="blue" description="Your exam schedule and hall tickets will appear here once the examination section publishes them." />
        </div>
      ) : (
        <div className="space-y-4">
          {exams.map(exam => {
            const expanded = expandedId === exam.id
            return (
              <div key={exam.id} className="glass-card overflow-hidden border border-white/60">
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <button onClick={() => toggleExam(exam)} className="flex items-center gap-2 text-left">
                    {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                    <div>
                      <p className="font-semibold text-slate-800">{exam.name}</p>
                      <p className="text-xs text-slate-400">
                        {exam.semesterName} · {exam.examType?.replace('_', ' ')}
                        {' · '}{fmtDate(exam.startDate)} – {fmtDate(exam.endDate)}
                        {' · '}{exam.scheduleCount} paper{exam.scheduleCount === 1 ? '' : 's'}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-3">
                    <Badge variant={exam.status === 'PUBLISHED' ? 'success' : 'secondary'}>{exam.status}</Badge>
                    {exam.hallTicketAvailable && (
                      <Button
                        variant="gradient"
                        size="sm"
                        onClick={() => onDownload(`/api/student/exams/${exam.id}/hall-ticket`, `hall-ticket-${exam.name.replace(/\s+/g, '-')}.pdf`)}
                      >
                        <span className="flex gap-1"><Download size={13} /> Hall ticket</span>
                      </Button>
                    )}
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-white/50 bg-white/20">
                    {loadingSchedule ? (
                      <p className="px-5 py-4 text-xs text-slate-400">Loading schedule...</p>
                    ) : schedule.length === 0 ? (
                      <p className="px-5 py-4 text-xs text-slate-400">No papers are scheduled for your section.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="collego-table">
                          <thead><tr><th>Course</th><th>Date</th><th>Time</th><th>Room</th><th>Invigilator</th></tr></thead>
                          <tbody>
                            {schedule.map(s => (
                              <tr key={s.id}>
                                <td className="text-slate-700 font-medium">{s.courseName} <span className="text-slate-400 text-[10px]">{s.courseCode}</span></td>
                                <td className="text-slate-500">{fmtDate(s.examDate)}</td>
                                <td className="text-slate-500">{s.startTime?.slice(0, 5)} – {s.endTime?.slice(0, 5)}</td>
                                <td className="text-slate-500">{s.room || 'TBA'}</td>
                                <td className="text-slate-500">{s.invigilatorName || 'TBA'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <p className="px-5 py-3 text-[10px] text-slate-400">
                      Seat numbers are printed on the hall ticket. Carry your college ID to every paper.
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Panel title="Revaluation requests" icon={AlertTriangle} accent="amber">
        <form onSubmit={submitRevaluation} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Course</label>
            <select value={form.courseKey} onChange={e => setForm({ ...form, courseKey: e.target.value })} className="collego-input">
              <option value="">Select course</option>
              {courses.map(c => (
                <option key={`${c.courseId}:${c.semesterId}`} value={`${c.courseId}:${c.semesterId}`}>
                  {c.semesterName} · {c.courseName} ({c.courseCode})
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Reason</label>
            <div className="flex gap-2">
              <input value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
                placeholder="e.g. Marks for question 4 were not counted"
                className="collego-input flex-1" />
              <Button type="submit" variant="gradient" size="sm" disabled={submitting}>
                {submitting ? <span className="flex gap-1"><RefreshCw size={13} className="animate-spin" /> Sending...</span> : <span className="flex gap-1"><Send size={13} /> Request</span>}
              </Button>
            </div>
          </div>
        </form>

        {revaluations.length === 0 ? (
          <p className="text-xs text-slate-400">You have not requested revaluation for any course.</p>
        ) : (
          <div className="space-y-2">
            {revaluations.map(item => (
              <div key={item.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-white/70 bg-white/50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-700">{item.courseName} <span className="text-slate-400 text-xs">({item.courseCode})</span></p>
                  <p className="text-[11px] text-slate-400">{item.semesterName} · requested {fmtDate(item.requestedAt)}</p>
                  <p className="text-[11px] text-slate-500 mt-1">{item.reason}</p>
                  {item.response && <p className="text-[11px] text-slate-500 mt-1">Office response: {item.response}</p>}
                </div>
                <Badge variant={item.status === 'APPROVED' ? 'success' : item.status === 'REJECTED' ? 'destructive' : 'warning'}>
                  <span className="flex items-center gap-1">
                    {item.status === 'APPROVED' ? <CheckCircle2 size={11} /> : item.status === 'REJECTED' ? <XCircle size={11} /> : <Clock size={11} />}
                    {item.status}
                  </span>
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}
