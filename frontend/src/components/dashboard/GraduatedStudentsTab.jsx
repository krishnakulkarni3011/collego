import { useState, useEffect, useCallback } from 'react'
import { GraduationCap } from 'lucide-react'
import { PageTitle, Panel, EmptyState, Spinner } from './PortalUI'
import { Badge } from '../ui/badge'
import api from '../../services/api'

/** Read-only archive: name, USN, department and years only, grouped by department. */
export function GraduatedStudentsTab({ endpoint, title = 'Graduated Students' }) {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get(endpoint)
      setStudents(Array.isArray(res.data) ? res.data : [])
    } catch { setStudents([]) }
    finally { setLoading(false) }
  }, [endpoint])

  useEffect(() => { load() }, [load])

  const groups = students.reduce((acc, s) => {
    const key = s.department || 'Unknown'
    ;(acc[key] ||= []).push(s)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <PageTitle icon={GraduationCap} title={title} accent="emerald"
        subtitle="Department-wise archive of graduated students."
        actions={<Badge variant="success">{students.length} graduated</Badge>} />
      {loading ? (
        <div className="flex items-center justify-center py-16"><Spinner color="emerald" /></div>
      ) : students.length === 0 ? (
        <div className="glass-card p-12 border border-white/60">
          <EmptyState icon={GraduationCap} title="No graduated students yet" accent="emerald"
            description="Students graduated from semester 8 will appear here." />
        </div>
      ) : (
        Object.keys(groups).sort().map(dept => (
          <Panel key={dept} title={dept} icon={GraduationCap} accent="violet">
            <div className="overflow-x-auto">
              <table className="collego-table">
                <thead><tr><th>Name</th><th>USN</th><th>Department</th><th>Years</th></tr></thead>
                <tbody>
                  {groups[dept].map(s => (
                    <tr key={s.id}>
                      <td className="font-medium text-slate-800">{s.name}</td>
                      <td><code className="text-[10px] text-slate-400">{s.usn}</code></td>
                      <td>{s.department}</td>
                      <td>{s.years}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        ))
      )}
    </div>
  )
}
