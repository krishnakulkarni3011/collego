import { useState, useEffect } from 'react'
import { CalendarDays, Clock, MapPin, Users } from 'lucide-react'
import api from '../../services/api'
import { PageTitle, Panel, Spinner } from './PortalUI'
import { Badge } from '../ui/badge'

function fmtDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function InvigilationsTab({ showMsg }) {
  const [duties, setDuties] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const res = await api.get('/api/faculty/invigilations')
        if (active) setDuties(Array.isArray(res.data) ? res.data : [])
      } catch {
        if (active) showMsg?.('Failed to load invigilation duties', 'error')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [showMsg])

  const upcoming = duties.filter(d => !d.examDate || new Date(d.examDate) >= new Date(new Date().toDateString()))
  const past = duties.filter(d => d.examDate && new Date(d.examDate) < new Date(new Date().toDateString()))

  const renderTable = (rows) => (
    <div className="overflow-x-auto">
      <table className="collego-table">
        <thead>
          <tr><th>Course</th><th>Section</th><th>Date</th><th>Time</th><th>Room</th><th>Students</th></tr>
        </thead>
        <tbody>
          {rows.map(d => (
            <tr key={d.id}>
              <td className="text-slate-700 font-medium">{d.courseName} <span className="text-slate-400 text-[10px]">{d.courseCode}</span></td>
              <td className="text-slate-500">{d.sectionName}</td>
              <td className="text-slate-500">{fmtDate(d.examDate)}</td>
              <td className="text-slate-500">{d.startTime?.slice(0, 5)} – {d.endTime?.slice(0, 5)}</td>
              <td className="text-slate-500">{d.room || 'TBA'}</td>
              <td className="text-slate-500">{d.studentCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Spinner color="violet" /></div>
  }

  return (
    <div className="space-y-6">
      <PageTitle
        icon={CalendarDays}
        title="Invigilation Duties"
        subtitle="Examination papers assigned to you by the examination section."
        accent="violet"
        actions={<Badge variant={upcoming.length > 0 ? 'info' : 'secondary'}>{upcoming.length} upcoming</Badge>}
      />

      <Panel title="Upcoming duties" icon={Clock} accent="violet">
        {upcoming.length === 0 ? (
          <p className="text-xs text-slate-400">No upcoming invigilation duties have been assigned to you.</p>
        ) : renderTable(upcoming)}
      </Panel>

      {past.length > 0 && (
        <Panel title="Past duties" icon={Users} accent="blue">
          {renderTable(past)}
        </Panel>
      )}

      <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
        <MapPin size={12} /> Report to the examination room 15 minutes before the start time.
      </p>
    </div>
  )
}
