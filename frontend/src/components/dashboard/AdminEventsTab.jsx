import { useCallback, useEffect, useState } from 'react'
import { CalendarDays, RefreshCw, Trash2, Upload } from 'lucide-react'
import { PageTitle, Panel, EmptyState } from './PortalUI'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { confirmAction } from '../common/ConfirmDialog.jsx'
import api from '../../services/api'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Date TBA'

export function AdminEventsTab({ showMsg }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', eventDate: '' })
  const [poster, setPoster] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/admin/events')
      setEvents(Array.isArray(res.data) ? res.data : [])
    } catch { setEvents([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const publish = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || !poster) return
    const ok = await confirmAction({
      title: 'Are you sure you want to publish this Event?',
      message: `The event "${form.title.trim()}" with its poster will be visible in the Dashboard of all three portals.`,
      confirmLabel: 'Publish Event',
      tone: 'info',
    })
    if (!ok) return
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('title', form.title.trim())
      fd.append('description', form.description || '')
      fd.append('eventDate', form.eventDate || '')
      fd.append('poster', poster)
      await api.post('/api/admin/events', fd)
      showMsg('Event published to all portals')
      setForm({ title: '', description: '', eventDate: '' })
      setPoster(null)
      await load()
    } catch (err) {
      showMsg(err.response?.data?.message || 'Could not publish event', 'error')
    } finally { setBusy(false) }
  }

  const remove = async (event) => {
    const ok = await confirmAction({
      title: 'Remove this event?',
      message: `"${event.title}" will no longer be shown in any portal.`,
      confirmLabel: 'Remove',
    })
    if (!ok) return
    try {
      await api.delete(`/api/admin/events/${event.id}`)
      showMsg('Event removed')
      await load()
    } catch (err) {
      showMsg(err.response?.data?.message || 'Could not remove event', 'error')
    }
  }

  return (
    <div className="space-y-6">
      <PageTitle icon={CalendarDays} title="Upcoming Events" accent="emerald"
        subtitle="Publish campus events with a poster. They appear in all three portals." />

      <div className="glass-card p-6 border border-white/60">
        <h3 className="text-sm font-semibold text-slate-800 mb-5 flex items-center gap-2"><Upload size={15} className="text-emerald-500" /> Publish New Event</h3>
        <form onSubmit={publish} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Title</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Annual Tech Fest" className="collego-input" required />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Event Date</label>
            <input type="date" value={form.eventDate} onChange={e => setForm({ ...form, eventDate: e.target.value })} className="collego-input" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} placeholder="What is happening, where and when..." className="collego-input resize-none" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Poster (JPG / PNG, max 5 MB)</label>
            <input type="file" accept=".jpg,.jpeg,.png" onChange={e => setPoster(e.target.files?.[0] || null)} className="collego-input" />
            {poster && <p className="text-[10px] text-slate-400 mt-1 truncate">{poster.name}</p>}
          </div>
          <div className="sm:col-span-2 flex gap-3">
            <Button type="submit" variant="gradient" size="sm" disabled={busy || !form.title.trim() || !poster}>
              {busy ? <><RefreshCw size={14} className="animate-spin" /> Publishing...</> : <>Publish Event</>}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => { setForm({ title: '', description: '', eventDate: '' }); setPoster(null) }}>Clear</Button>
          </div>
        </form>
      </div>

      <Panel title="Published Events" icon={CalendarDays} accent="violet">
        {loading ? (
          <div className="flex items-center justify-center py-10"><span className="text-xs text-slate-400">Loading events...</span></div>
        ) : events.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No events published" accent="violet" description="Publish an event above to show it on all dashboards." />
        ) : (
          <div className="space-y-3">
            {events.map(event => (
              <div key={event.id} className="flex flex-wrap items-center gap-4 p-4 rounded-2xl border border-white/60 bg-white/70">
                <img src={event.posterUrl} alt="" className="h-14 w-14 rounded-xl object-cover bg-slate-100" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800 truncate">{event.title}</p>
                    <Badge variant={event.active ? 'success' : 'secondary'}>{event.active ? 'Live' : 'Hidden'}</Badge>
                  </div>
                  <p className="text-[11px] text-slate-400">{fmtDate(event.eventDate)}{event.description ? ` - ${event.description}` : ''}</p>
                </div>
                {event.active && (
                  <Button variant="destructive" size="sm" onClick={() => remove(event)}><Trash2 size={13} /> Remove</Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}
