import { useEffect, useState } from 'react'
import { CalendarDays, Image as ImageIcon } from 'lucide-react'
import { Panel, EmptyState } from './PortalUI'
import api from '../../services/api'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Date TBA'

/** Campus events published by Admin, shown on all three dashboards. */
export function EventBox({ accent = 'violet' }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    api.get('/api/events/upcoming')
      .then(res => { if (!cancelled) setEvents(Array.isArray(res.data) ? res.data : []) })
      .catch(() => { if (!cancelled) setEvents([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return (
    <Panel title="Upcoming Events" icon={CalendarDays} accent={accent}>
      {loading ? (
        <div className="flex items-center justify-center py-10"><span className="text-xs text-slate-400">Loading events...</span></div>
      ) : events.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No upcoming events" accent={accent} description="Published campus events will appear here." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {events.map(event => (
            <div key={event.id} className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-32 bg-slate-100 overflow-hidden flex items-center justify-center">
                {event.posterUrl ? (
                  <img src={event.posterUrl} alt={event.title} className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon size={28} className="text-slate-300" />
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 text-[10px] font-semibold text-indigo-600 uppercase tracking-wider">
                  <CalendarDays size={12} /> {fmtDate(event.eventDate)}
                </div>
                <h4 className="text-sm font-bold text-slate-800 mt-1 truncate">{event.title}</h4>
                {event.description && <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{event.description}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}
