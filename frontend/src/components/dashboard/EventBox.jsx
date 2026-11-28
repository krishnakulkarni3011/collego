import { useEffect, useState } from 'react'
import { CalendarDays, Download, Eye, Image as ImageIcon } from 'lucide-react'
import { Panel, EmptyState } from './PortalUI'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import api from '../../services/api'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Date TBA'

/** Merged campus events + placement drives, shown on all three dashboards. */
export function EventBox({ accent = 'violet' }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [preview, setPreview] = useState(null)

  useEffect(() => {
    let cancelled = false
    api.get('/api/events/merged')
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
        <EmptyState icon={CalendarDays} title="No upcoming events" accent={accent} description="Published campus events and placement drives will appear here." />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {events.map(event => (
              <div key={event.id} className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className="relative h-32 bg-slate-50 flex items-center justify-center border-b border-white/60">
                  {event.posterUrl ? (
                    <img src={event.posterUrl} alt={event.title} className="h-full w-full object-contain p-2" />
                  ) : (
                    <ImageIcon size={32} className="text-slate-300" />
                  )}
                  {event.posterUrl && (
                    <div className="absolute bottom-2 right-2 flex gap-1.5">
                      <button type="button" onClick={() => setPreview(event)}
                        title="Preview poster" aria-label="Preview poster"
                        className="w-8 h-8 rounded-lg bg-white/95 border border-white/70 text-slate-600 hover:text-indigo-600 shadow-sm flex items-center justify-center">
                        <Eye size={14} />
                      </button>
                      <a href={event.posterUrl} download={event.title || 'event-poster'}
                        title="Download poster" aria-label="Download poster"
                        className="w-8 h-8 rounded-lg bg-white/95 border border-white/70 text-slate-600 hover:text-indigo-600 shadow-sm flex items-center justify-center">
                        <Download size={14} />
                      </a>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider">{fmtDate(event.date)}</span>
                    <Badge variant={event.source === 'Campus Event' ? 'purple' : 'info'} className="text-[9px] px-1.5 py-0">
                      {event.source}
                    </Badge>
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 mt-1 truncate">{event.title}</h4>
                  {event.description && <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{event.description}</p>}
                </div>
              </div>
            ))}
          </div>

          {preview && (
            <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={() => setPreview(null)} />
              <div className="relative w-full max-w-3xl rounded-3xl bg-white border border-white/70 shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-white/60">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 truncate">{preview.title}</h3>
                    <p className="text-[11px] text-slate-400">{fmtDate(preview.date)} - {preview.source}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a href={preview.posterUrl} download={preview.title || 'event-poster'}><Download size={13} /> Download</a>
                    </Button>
                    <button onClick={() => setPreview(null)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"><XIcon /></button>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 flex items-center justify-center min-h-[300px]">
                  <img src={preview.posterUrl} alt={preview.title} className="max-h-[70vh] max-w-full object-contain" />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </Panel>
  )
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}
