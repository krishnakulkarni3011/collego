import { useMemo, useState } from 'react'
import { Download, Mail, Search, Users } from 'lucide-react'
import { PageTitle, EmptyState, Spinner } from './PortalUI'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'

/**
 * Read-only faculty directory shared by the student and faculty portals.
 * Resumes are uploaded by administrators and downloaded through an
 * authenticated endpoint.
 */
export function FacultyDirectoryTab({
  faculty = [],
  loading = false,
  accent = 'blue',
  onDownload,
  title = 'Faculty Directory',
  subtitle = 'Faculty members and their resumes, grouped by department.',
}) {
  const [query, setQuery] = useState('')

  const grouped = useMemo(() => {
    const term = query.trim().toLowerCase()
    const filtered = (faculty || []).filter((f) => {
      if (!term) return true
      return [f.name, f.email, f.designation, f.employeeId, f.departmentName, f.departmentCode]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    })
    const map = new Map()
    filtered.forEach((f) => {
      const key = f.departmentName || 'Other'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(f)
    })
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [faculty, query])

  return (
    <div className="space-y-6">
      <PageTitle icon={Users} title={title} subtitle={subtitle} accent={accent} />
      <div className="glass-card p-4 border border-white/60">
        <div className="relative max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, department or designation..."
            className="collego-input pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="glass-card p-12 border border-white/60"><Spinner /></div>
      ) : grouped.length === 0 ? (
        <div className="glass-card p-12 border border-white/60">
          <EmptyState icon={Users} title="No faculty found" accent={accent} description="Faculty profiles will appear here once added by the administration." />
        </div>
      ) : (
        grouped.map(([department, members]) => (
          <section key={department} className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-800">{department}</h3>
              <Badge variant="secondary">{members.length} faculty</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {members.map((f) => (
                <div key={f.id} className="glass-card p-5 border border-white/60 flex flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center text-sm font-semibold shrink-0 shadow-lg shadow-indigo-500/20">
                      {(f.name || 'F').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{f.name}</p>
                      <p className="text-[11px] text-slate-500">{f.designation || 'Faculty'}</p>
                      {f.employeeId && <p className="text-[10px] text-slate-400 mt-0.5">ID: {f.employeeId}</p>}
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5 min-w-0">
                    <Mail size={12} className="shrink-0" />
                    <span className="truncate">{f.email}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-white/60 pt-3">
                    <span className={`text-[10px] font-medium ${f.hasResume ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {f.hasResume ? 'Resume available' : 'No resume uploaded'}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!f.hasResume}
                      onClick={() => onDownload?.(`/api/faculty-directory/${f.id}/resume`, f.resumeFileName || `${f.name}-resume.pdf`)}
                    >
                      <Download size={12} /> Resume
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}
