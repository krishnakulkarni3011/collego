import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/authService'
import api from '../services/api'

// ─── helpers ────────────────────────────────────────────────────────────────
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const fmtNum  = (n, dp = 2) => (n == null ? '—' : Number(n).toFixed(dp))

const GRADE_COLOR = {
  O: 'text-emerald-300', 'A+': 'text-emerald-400', A: 'text-teal-300',
  'B+': 'text-blue-300', B: 'text-blue-400', C: 'text-yellow-300',
  P: 'text-yellow-400', F: 'text-red-400',
}

// ─── small reusable components ───────────────────────────────────────────────
function StatCard({ label, value, sub, accent = 'violet' }) {
  const colors = {
    violet: 'from-violet-500/20 to-fuchsia-500/20 border-violet-500/30 text-violet-300',
    emerald: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-300',
    amber:   'from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-300',
    blue:    'from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-300',
    red:     'from-red-500/20 to-rose-500/20 border-red-500/30 text-red-300',
  }
  return (
    <div className={`bg-gradient-to-br ${colors[accent]} border rounded-xl p-5`}>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-3xl font-bold ${colors[accent].split(' ')[3]}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  )
}

function SectionBadge({ pct }) {
  if (pct >= 75) return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">{pct}%</span>
  if (pct >= 50) return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">{pct}%</span>
  return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/15 text-red-300 border border-red-500/30">{pct}%</span>
}

function Toast({ message }) {
  if (!message.text) return null
  return (
    <div className={`fixed top-20 right-6 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-2xl border transition-all ${
      message.type === 'error'
        ? 'bg-red-500/20 text-red-300 border-red-500/30'
        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
    }`}>
      {message.text}
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

// ─── TAB: OVERVIEW ───────────────────────────────────────────────────────────
function OverviewTab({ profile, attendance, cgpa, fees, notifications }) {
  const unread = notifications.filter(n => !n.read).length
  const currentFee = fees.find(f => f.status === 'PENDING') || fees[0]
  const pendingFees = fees.filter(f => f.status === 'PENDING')

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-violet-500/10 via-fuchsia-500/10 to-blue-500/10 border border-violet-500/20 rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-white mb-1">
          Welcome, {profile?.firstName} {profile?.lastName} 👋
        </h2>
        <p className="text-slate-400 text-sm">
          {profile?.enrollmentNumber} · {profile?.departmentName} · Semester {profile?.currentSemester} · Section {profile?.section}
        </p>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Overall Attendance"
          value={`${fmtNum(attendance?.overallPercentage, 1)}%`}
          sub={`${attendance?.totalPresent}/${attendance?.totalClasses} classes`}
          accent={attendance?.overallPercentage >= 75 ? 'emerald' : 'amber'}
        />
        <StatCard
          label="Current CGPA"
          value={fmtNum(cgpa?.cumulativeCgpa)}
          sub={`${cgpa?.totalCreditsAllSemesters?.toFixed(0)} total credits`}
          accent="violet"
        />
        <StatCard
          label="Fee Status"
          value={pendingFees.length === 0 ? 'Clear' : `${pendingFees.length} Pending`}
          sub={currentFee ? `${currentFee.semesterName}` : 'All paid'}
          accent={pendingFees.length === 0 ? 'emerald' : 'amber'}
        />
        <StatCard
          label="Notifications"
          value={unread}
          sub={`${notifications.length} total`}
          accent={unread > 0 ? 'violet' : 'blue'}
        />
      </div>

      {/* Attendance & recent subjects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">📊 Subject-wise Attendance</h3>
          <div className="space-y-3">
            {attendance?.subjectWise?.slice(0, 6).map(s => (
              <div key={s.sectionId}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-300 truncate max-w-[180px]">{s.courseName}</span>
                  <SectionBadge pct={s.percentage} />
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${s.percentage >= 75 ? 'bg-emerald-500' : s.percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(s.percentage, 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {!attendance?.subjectWise?.length && <p className="text-slate-600 text-sm">No attendance data yet.</p>}
          </div>
        </div>

        {/* CGPA per semester */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">🎓 Semester SGPA History</h3>
          <div className="space-y-3">
            {cgpa?.semesters?.map(sem => (
              <div key={sem.semesterId} className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-300">{sem.semesterName}</p>
                  <p className="text-xs text-slate-500">{sem.academicYear} · {sem.totalCredits?.toFixed(0)} credits</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-violet-400">{fmtNum(sem.sgpa)}</p>
                  <p className="text-xs text-slate-500">SGPA</p>
                </div>
              </div>
            ))}
            {!cgpa?.semesters?.length && <p className="text-slate-600 text-sm">No results data yet.</p>}
          </div>
        </div>
      </div>

      {/* Recent notifications */}
      {notifications.slice(0, 4).length > 0 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">🔔 Recent Notifications</h3>
          <div className="space-y-2">
            {notifications.slice(0, 4).map(n => (
              <div key={n.id} className={`flex items-start gap-3 p-3 rounded-lg ${!n.read ? 'bg-violet-500/10 border border-violet-500/20' : 'bg-slate-800/40'}`}>
                {!n.read && <span className="mt-1.5 w-2 h-2 bg-violet-400 rounded-full shrink-0" />}
                <div className={n.read ? 'ml-5' : ''}>
                  <p className="text-sm font-medium text-slate-200">{n.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── TAB: ATTENDANCE ─────────────────────────────────────────────────────────
function AttendanceTab({ attendance, semesters, onSemesterChange, loading }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold">📋 Attendance</h2>
        <select
          onChange={e => onSemesterChange(e.target.value || null)}
          className="bg-slate-900 border border-slate-700 text-white px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:border-violet-500"
        >
          <option value="">Current Semester</option>
          {semesters.map(s => (
            <option key={s.id} value={s.id}>{s.name} ({s.academicYear})</option>
          ))}
        </select>
      </div>

      {/* Overall stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Classes" value={attendance?.totalClasses ?? '—'} accent="blue" />
        <StatCard label="Present" value={attendance?.totalPresent ?? '—'} accent="emerald" />
        <StatCard
          label="Overall %"
          value={`${fmtNum(attendance?.overallPercentage, 1)}%`}
          accent={attendance?.overallPercentage >= 75 ? 'emerald' : attendance?.overallPercentage >= 50 ? 'amber' : 'red'}
        />
      </div>

      {loading ? <Spinner /> : (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-900">
              <tr className="text-slate-400 text-xs uppercase">
                <th className="px-4 py-3 text-left">Subject</th>
                <th className="px-4 py-3 text-left">Code</th>
                <th className="px-4 py-3 text-center">Total</th>
                <th className="px-4 py-3 text-center">Present</th>
                <th className="px-4 py-3 text-center">Absent</th>
                <th className="px-4 py-3 text-center">%</th>
                <th className="px-4 py-3 text-left">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {attendance?.subjectWise?.map(s => (
                <tr key={s.sectionId} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 text-slate-200 font-medium">{s.courseName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{s.courseCode}</td>
                  <td className="px-4 py-3 text-center text-slate-400">{s.totalClasses}</td>
                  <td className="px-4 py-3 text-center text-emerald-400 font-semibold">{s.present}</td>
                  <td className="px-4 py-3 text-center text-red-400 font-semibold">{s.absent}</td>
                  <td className="px-4 py-3 text-center"><SectionBadge pct={s.percentage} /></td>
                  <td className="px-4 py-3 w-36">
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${s.percentage >= 75 ? 'bg-emerald-500' : s.percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(s.percentage, 100)}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {!attendance?.subjectWise?.length && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-600">No attendance data found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── TAB: MARKS ──────────────────────────────────────────────────────────────
function MarksTab({ internalMarks, semesters, cgpa, loading }) {
  const [view, setView] = useState('cgpa') // 'cgpa' | 'internal'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">📝 Marks & Results</h2>
        <div className="flex bg-slate-900/50 border border-slate-800 rounded-lg p-0.5">
          {[['cgpa', '🎓 CGPA / SGPA'], ['internal', '📊 Internal Marks']].map(([id, label]) => (
            <button key={id} onClick={() => setView(id)}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${view === id ? 'bg-violet-500/20 text-violet-300' : 'text-slate-400 hover:text-slate-200'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? <Spinner /> : view === 'cgpa' ? (
        <div className="space-y-4">
          {/* CGPA summary */}
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Cumulative CGPA" value={fmtNum(cgpa?.cumulativeCgpa)} sub="All semesters" accent="violet" />
            <StatCard label="Total Credits" value={cgpa?.totalCreditsAllSemesters?.toFixed(0) ?? '—'} sub="Across all semesters" accent="blue" />
          </div>

          {cgpa?.semesters?.map(sem => (
            <div key={sem.semesterId} className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 bg-slate-900/80 border-b border-slate-800">
                <div>
                  <p className="font-semibold text-slate-200">{sem.semesterName}</p>
                  <p className="text-xs text-slate-500">{sem.academicYear} · {sem.totalCredits?.toFixed(0)} credits</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-violet-400">{fmtNum(sem.sgpa)}</p>
                  <p className="text-xs text-slate-500">SGPA</p>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-500 text-xs uppercase bg-slate-900/40">
                    <th className="px-4 py-2.5 text-left">Subject</th>
                    <th className="px-4 py-2.5 text-center">Credits</th>
                    <th className="px-4 py-2.5 text-center">Marks</th>
                    <th className="px-4 py-2.5 text-center">Grade</th>
                    <th className="px-4 py-2.5 text-center">GP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {sem.subjects.map(sub => (
                    <tr key={sub.sectionId} className="hover:bg-slate-800/30">
                      <td className="px-4 py-2.5">
                        <p className="text-slate-200">{sub.courseName}</p>
                        <p className="text-xs text-slate-500 font-mono">{sub.courseCode}</p>
                      </td>
                      <td className="px-4 py-2.5 text-center text-slate-400">{sub.credits}</td>
                      <td className="px-4 py-2.5 text-center text-slate-300">
                        {sub.obtainedMarks != null ? `${sub.obtainedMarks}/${sub.maxMarks}` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-center font-bold">
                        <span className={GRADE_COLOR[sub.grade] || 'text-slate-400'}>{sub.grade || '—'}</span>
                      </td>
                      <td className="px-4 py-2.5 text-center text-slate-400">{sub.gradePoints != null ? sub.gradePoints.toFixed(1) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {!cgpa?.semesters?.length && <p className="text-slate-600 text-sm">No results found yet.</p>}
        </div>
      ) : (
        /* Internal Marks */
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-900">
              <tr className="text-slate-400 text-xs uppercase">
                <th className="px-4 py-3 text-left">Subject</th>
                <th className="px-4 py-3 text-center">IA-1 (Obtained / Max)</th>
                <th className="px-4 py-3 text-center">IA-2 (Obtained / Max)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {internalMarks.map(m => (
                <tr key={m.sectionId} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3">
                    <p className="text-slate-200">{m.courseName}</p>
                    <p className="text-xs text-slate-500 font-mono">{m.courseCode}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {m.ia1ObtainedMarks != null
                      ? <span className="text-violet-300 font-semibold">{m.ia1ObtainedMarks} / {m.ia1MaxMarks}</span>
                      : <span className="text-slate-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {m.ia2ObtainedMarks != null
                      ? <span className="text-violet-300 font-semibold">{m.ia2ObtainedMarks} / {m.ia2MaxMarks}</span>
                      : <span className="text-slate-600">—</span>}
                  </td>
                </tr>
              ))}
              {!internalMarks.length && (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-600">No internal marks found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── TAB: TIMETABLE ──────────────────────────────────────────────────────────
const DAY_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']

function TimetableTab({ timetable, loading }) {
  const days = timetable?.weeklySchedule ? DAY_ORDER.filter(d => timetable.weeklySchedule[d]?.length > 0) : []

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">📅 Timetable</h2>
      {loading ? <Spinner /> : days.length === 0
        ? <p className="text-slate-600">No timetable data found for active enrollments.</p>
        : (
          <div className="space-y-4">
            {DAY_ORDER.map(day => {
              const slots = timetable.weeklySchedule[day] || []
              if (!slots.length) return null
              return (
                <div key={day} className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="bg-slate-900/80 px-5 py-3 border-b border-slate-800">
                    <h3 className="text-sm font-semibold text-slate-300 capitalize">{day.charAt(0) + day.slice(1).toLowerCase()}</h3>
                  </div>
                  <div className="divide-y divide-slate-800/60">
                    {slots.sort((a, b) => a.startTime.localeCompare(b.startTime)).map(slot => (
                      <div key={slot.id} className="flex items-center px-5 py-4 hover:bg-slate-800/30 transition-colors">
                        <div className="w-28 shrink-0">
                          <p className="text-sm font-mono text-violet-400">{slot.startTime}</p>
                          <p className="text-xs text-slate-500 font-mono">{slot.endTime}</p>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-200">{slot.courseName}</p>
                          <p className="text-xs text-slate-500">{slot.courseCode} · Sec {slot.sectionName}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-400">{slot.facultyName || '—'}</p>
                          <p className="text-xs text-slate-600">{slot.roomNumber}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
    </div>
  )
}

// ─── TAB: FEES ───────────────────────────────────────────────────────────────
function FeesTab({ fees, loading }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">💰 Fee Status</h2>
      {loading ? <Spinner /> : fees.length === 0
        ? <p className="text-slate-600">No fee records found.</p>
        : (
          <div className="space-y-4">
            {fees.map(fee => {
              const isPaid = fee.status === 'PAID'
              return (
                <div key={fee.id} className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 bg-slate-900/80 border-b border-slate-800">
                    <div>
                      <p className="font-semibold text-slate-200">{fee.semesterName}</p>
                      <p className="text-xs text-slate-500">Due: {fmtDate(fee.dueDate)}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-lg font-bold text-slate-200">₹{Number(fee.totalAmount).toLocaleString('en-IN')}</p>
                        <p className="text-xs text-slate-500">Total Amount</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${isPaid ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/15 text-amber-300 border-amber-500/30'}`}>
                        {fee.status}
                      </span>
                    </div>
                  </div>

                  {fee.items && fee.items.length > 0 && (
                    <div className="divide-y divide-slate-800/60">
                      {fee.items.map((item, i) => (
                        <div key={i} className="flex justify-between items-center px-5 py-2.5 text-sm hover:bg-slate-800/20">
                          <span className="text-slate-400">{item.description}</span>
                          <span className="text-slate-300 font-medium">₹{Number(item.amount).toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {isPaid && (
                    <div className="px-5 py-3 bg-emerald-500/5 border-t border-emerald-500/10">
                      <p className="text-xs text-emerald-400">
                        ✓ Paid on {fmtDate(fee.paidAt)}
                        {fee.transactionRef && <span className="ml-3 text-slate-500">Ref: {fee.transactionRef}</span>}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
    </div>
  )
}

// ─── TAB: PLACEMENT NOTICES ──────────────────────────────────────────────────
function PlacementsTab({ notices, loading }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">🏢 Placement Notices</h2>
      {loading ? <Spinner /> : notices.length === 0
        ? <p className="text-slate-600">No placement notices right now.</p>
        : (
          <div className="space-y-3">
            {notices.map(notice => {
              const isExpired = notice.lastDate && new Date(notice.lastDate) < new Date()
              return (
                <div key={notice.id} className={`bg-slate-900/50 border rounded-xl p-5 ${isExpired ? 'border-slate-800/50 opacity-60' : 'border-slate-800 hover:border-violet-500/30 transition-colors'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-200">{notice.title}</h3>
                        {isExpired && <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">Expired</span>}
                      </div>
                      <p className="text-sm font-medium text-violet-400 mb-2">{notice.companyName}</p>
                      <p className="text-sm text-slate-400 mb-3">{notice.description}</p>
                      <div className="flex flex-wrap gap-3 text-xs">
                        {notice.eligibilityCriteria && (
                          <span className="text-slate-400 bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
                            ✅ {notice.eligibilityCriteria}
                          </span>
                        )}
                        {notice.packageOffered && (
                          <span className="text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                            💰 {notice.packageOffered}
                          </span>
                        )}
                        <span className="text-slate-500 bg-slate-800/50 px-2.5 py-1 rounded-md border border-slate-700/50">
                          🏢 {notice.departmentName}
                        </span>
                      </div>
                    </div>
                    {notice.lastDate && (
                      <div className={`text-right shrink-0 ${isExpired ? 'text-slate-600' : 'text-amber-300'}`}>
                        <p className="text-xs font-semibold">Last Date</p>
                        <p className="text-sm font-bold">{fmtDate(notice.lastDate)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
    </div>
  )
}

// ─── TAB: NOTIFICATIONS ──────────────────────────────────────────────────────
function NotificationsTab({ notifications, onMarkRead, loading }) {
  const TYPE_COLORS = {
    ACADEMIC: 'text-blue-300 bg-blue-500/10 border-blue-500/20',
    FEE: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
    PLACEMENT: 'text-violet-300 bg-violet-500/10 border-violet-500/20',
    GENERAL: 'text-slate-300 bg-slate-700/30 border-slate-700',
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">🔔 Notifications</h2>
      {loading ? <Spinner /> : notifications.length === 0
        ? <p className="text-slate-600">No notifications yet.</p>
        : (
          <div className="space-y-2">
            {notifications.map(n => (
              <div key={n.id} className={`flex items-start gap-4 p-4 rounded-xl border transition-colors ${!n.read ? 'bg-violet-500/8 border-violet-500/25' : 'bg-slate-900/40 border-slate-800 opacity-70'}`}>
                <div className="shrink-0 mt-0.5">
                  {!n.read && <div className="w-2 h-2 bg-violet-400 rounded-full mt-1" />}
                  {n.read && <div className="w-2 h-2 bg-transparent mt-1" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${TYPE_COLORS[n.type] || TYPE_COLORS.GENERAL}`}>
                      {n.type}
                    </p>
                    <span className="text-xs text-slate-600">{fmtDate(n.createdAt)}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-200">{n.title}</p>
                  <p className="text-sm text-slate-400 mt-0.5">{n.message}</p>
                </div>
                {!n.read && (
                  <button
                    onClick={() => onMarkRead(n.id)}
                    className="shrink-0 text-xs text-violet-400 hover:text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Mark read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
    </div>
  )
}

// ─── TAB: DOCUMENTS ──────────────────────────────────────────────────────────
function DocumentsTab({ semesters, cgpa, showMessage }) {
  const [downloading, setDownloading] = useState(null)

  const downloadMarksheet = async (semesterId, semName) => {
    try {
      setDownloading(`sem-${semesterId}`)
      const res = await api.get(`/api/student/marksheet/${semesterId}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a'); a.href = url
      a.download = `marksheet_${semName.replace(/ /g, '_')}.pdf`; a.click()
      window.URL.revokeObjectURL(url)
      showMessage(`Downloaded marksheet for ${semName}`)
    } catch (err) {
      showMessage(err.response?.data?.message || `No marks data for ${semName}`, 'error')
    } finally {
      setDownloading(null)
    }
  }

  const downloadTranscript = async () => {
    try {
      setDownloading('transcript')
      const res = await api.get('/api/student/transcript', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a'); a.href = url
      a.download = 'academic_transcript.pdf'; a.click()
      window.URL.revokeObjectURL(url)
      showMessage('Transcript downloaded')
    } catch (err) {
      showMessage('No academic data for transcript yet', 'error')
    } finally {
      setDownloading(null)
    }
  }

  const semestersWithMarks = cgpa?.semesters || []

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">📄 Academic Documents</h2>

      {/* Transcript */}
      <div className="bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 rounded-xl p-6 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-200 mb-1">Full Academic Transcript</h3>
          <p className="text-sm text-slate-400">Complete academic history across all semesters with CGPA</p>
        </div>
        <button
          onClick={downloadTranscript}
          disabled={downloading === 'transcript'}
          className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 px-5 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 shadow-lg shadow-violet-500/20 shrink-0"
        >
          {downloading === 'transcript' ? '⏳ Generating...' : '⬇ Download Transcript'}
        </button>
      </div>

      {/* Per-semester marksheets */}
      <div>
        <h3 className="text-sm font-semibold text-slate-400 mb-3">Semester Marksheets</h3>
        <div className="space-y-3">
          {semestersWithMarks.map(sem => (
            <div key={sem.semesterId} className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 flex items-center justify-between hover:border-slate-700 transition-colors">
              <div>
                <p className="font-semibold text-slate-200">{sem.semesterName}</p>
                <p className="text-xs text-slate-500 mt-0.5">{sem.academicYear} · {sem.subjects?.length} subjects · SGPA {fmtNum(sem.sgpa)}</p>
              </div>
              <button
                onClick={() => downloadMarksheet(sem.semesterId, sem.semesterName)}
                disabled={downloading === `sem-${sem.semesterId}`}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white px-4 py-2 rounded-lg text-sm transition-all disabled:opacity-50"
              >
                {downloading === `sem-${sem.semesterId}` ? '⏳ Generating...' : '⬇ Download PDF'}
              </button>
            </div>
          ))}
          {!semestersWithMarks.length && (
            <p className="text-slate-600 text-sm">No semester results available yet for download.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── TAB: AI ASSISTANT (Phase 9 Feature 1 + Smart Search) ───────────────────
function AiAssistantTab({ attendance, cgpa, fees }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I\'m Collego Assistant 🤖 Ask me anything about your attendance, marks, fees, placements, timetable, and more!' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useState(null)

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMsg = { role: 'user', content: input }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    try {
      const res = await api.post('/api/ai/chat', {
        message: input,
        history: messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
        context: { attendance, cgpa, fees }
      })
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply || 'I couldn\'t process that. Please try again.' }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'AI service is temporarily offline. Please try again later.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">🤖 AI College Assistant</h2>
        <span className="text-xs bg-violet-500/15 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded-full">Phase 9</span>
      </div>
      <p className="text-sm text-slate-500">Ask me anything about your college data — attendance, marks, fees, placements, timetable, and more. I have access to your live data.</p>

      {/* Chat window */}
      <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden flex flex-col" style={{minHeight: '420px'}}>
        <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{maxHeight: '400px'}}>
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                msg.role === 'user'
                  ? 'bg-violet-600/40 text-violet-100 rounded-br-sm'
                  : 'bg-slate-800 text-slate-200 rounded-bl-sm border border-slate-700'
              }`}>
                {msg.role === 'assistant' && (
                  <div className="text-xs text-violet-400 font-semibold mb-1">🤖 Collego AI</div>
                )}
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-800 border border-slate-700 px-4 py-3 rounded-2xl rounded-bl-sm">
                <div className="flex gap-1">
                  {[0,1,2].map(i => <div key={i} className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{animationDelay: `${i*0.15}s`}} />)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-slate-800 p-3 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask about attendance, marks, fees, placements..."
            className="flex-1 bg-slate-800 border border-slate-700 text-white px-4 py-2 rounded-xl text-sm focus:outline-none focus:border-violet-500 placeholder-slate-600"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 px-4 py-2 rounded-xl text-sm font-medium transition-all"
          >
            Send
          </button>
        </div>
      </div>

      {/* Quick prompts */}
      <div>
        <p className="text-xs text-slate-500 mb-2">Quick prompts:</p>
        <div className="flex flex-wrap gap-2">
          {[
            'What is my current attendance?',
            'Show my CGPA',
            'Do I have any pending fees?',
            'What placements are available?',
            'Show my timetable'
          ].map(prompt => (
            <button
              key={prompt}
              onClick={() => { setInput(prompt); }}
              className="text-xs bg-slate-800/60 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── TAB: AI PERFORMANCE PREDICTION (Phase 9 Feature 3) ─────────────────────
function AiPredictionTab() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await api.get('/api/ai/performance-prediction')
        setData(res.data)
      } catch (e) {
        setError(e.response?.data?.message || 'AI prediction service unavailable.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const TREND_CONFIG = {
    improving: { color: 'text-emerald-300', bg: 'bg-emerald-500/10 border-emerald-500/30', icon: '📈' },
    declining: { color: 'text-red-300', bg: 'bg-red-500/10 border-red-500/30', icon: '📉' },
    stable: { color: 'text-blue-300', bg: 'bg-blue-500/10 border-blue-500/30', icon: '➡️' },
  }
  const RISK_CONFIG = {
    LOW: { color: 'text-emerald-300', bg: 'bg-emerald-500/10 border-emerald-500/30', label: '🟢 Low Risk' },
    MEDIUM: { color: 'text-amber-300', bg: 'bg-amber-500/10 border-amber-500/30', label: '🟡 Medium Risk' },
    HIGH: { color: 'text-red-300', bg: 'bg-red-500/10 border-red-500/30', label: '🔴 High Risk' },
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">🎯 AI Performance Prediction</h2>
        <span className="text-xs bg-violet-500/15 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded-full">Phase 9</span>
      </div>
      <p className="text-sm text-slate-500">AI-powered CGPA/SGPA projection based on your academic history using linear regression trend analysis.</p>

      {loading && <Spinner />}
      {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm">{error}</div>}

      {data && !loading && (
        <div className="space-y-5">
          {/* Prediction Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Predicted SGPA" value={fmtNum(data.predictedSgpa)} sub="Next semester" accent="violet" />
            <StatCard label="Projected CGPA" value={fmtNum(data.predictedCgpa)} sub="With predicted" accent="blue" />
            <div className={`border rounded-xl p-5 ${(TREND_CONFIG[data.trend] || TREND_CONFIG.stable).bg}`}>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Trend</p>
              <p className={`text-2xl font-bold ${(TREND_CONFIG[data.trend] || TREND_CONFIG.stable).color}`}>
                {(TREND_CONFIG[data.trend] || TREND_CONFIG.stable).icon}
              </p>
              <p className={`text-sm font-semibold mt-1 capitalize ${(TREND_CONFIG[data.trend] || TREND_CONFIG.stable).color}`}>{data.trend}</p>
            </div>
            <div className={`border rounded-xl p-5 ${(RISK_CONFIG[data.riskLevel] || RISK_CONFIG.LOW).bg}`}>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Risk Level</p>
              <p className={`text-sm font-bold mt-2 ${(RISK_CONFIG[data.riskLevel] || RISK_CONFIG.LOW).color}`}>
                {(RISK_CONFIG[data.riskLevel] || RISK_CONFIG.LOW).label}
              </p>
              <p className="text-xs text-slate-600 mt-1">Confidence: {Math.round((data.confidenceScore || 0) * 100)}%</p>
            </div>
          </div>

          {/* AI Insights */}
          {data.insights && data.insights.length > 0 && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">💡 AI Insights</h3>
              <div className="space-y-2">
                {data.insights.map((insight, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-violet-400 mt-0.5 shrink-0">•</span>
                    <p className="text-sm text-slate-300">{insight}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!data && !loading && !error && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center text-slate-600 text-sm">
          No academic history data available for prediction. Complete at least one semester.
        </div>
      )}
    </div>
  )
}

// ─── TAB: AI ATTENDANCE RISK (Phase 9 Feature 4) ────────────────────────────
function AiAttendanceRiskTab() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await api.get('/api/ai/attendance-risk')
        setData(res.data)
      } catch (e) {
        setError(e.response?.data?.message || 'AI attendance risk service unavailable.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const RISK_COLORS = {
    SAFE: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
    WARNING: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
    CRITICAL: 'bg-red-500/10 border-red-500/30 text-red-300',
    DEFAULTER: 'bg-red-900/20 border-red-700/50 text-red-200',
  }
  const OVERALL_RISK_COLORS = {
    LOW: 'from-emerald-500/10 to-teal-500/10 border-emerald-500/20',
    MEDIUM: 'from-amber-500/10 to-orange-500/10 border-amber-500/20',
    HIGH: 'from-red-500/10 to-rose-500/10 border-red-500/20',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">⚠️ Attendance Risk Analysis</h2>
        <span className="text-xs bg-violet-500/15 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded-full">Phase 9</span>
      </div>
      <p className="text-sm text-slate-500">AI early-warning system analyzing your attendance trends and predicting examination eligibility risk.</p>

      {loading && <Spinner />}
      {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm">{error}</div>}

      {data && !loading && (
        <div className="space-y-5">
          {/* Overall Risk Banner */}
          <div className={`bg-gradient-to-r ${(OVERALL_RISK_COLORS[data.overallRisk] || OVERALL_RISK_COLORS.LOW)} border rounded-2xl p-5`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Overall Risk Status</p>
                <p className={`text-2xl font-bold ${
                  data.overallRisk === 'HIGH' ? 'text-red-300' : data.overallRisk === 'MEDIUM' ? 'text-amber-300' : 'text-emerald-300'
                }`}>
                  {data.overallRisk === 'HIGH' ? '🔴 High Risk' : data.overallRisk === 'MEDIUM' ? '🟡 Medium Risk' : '🟢 Low Risk'}
                </p>
              </div>
              <p className="text-sm text-slate-400 max-w-sm text-right">{data.summary}</p>
            </div>
          </div>

          {/* Subject Risk Cards */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-400">Subject-wise Risk Assessment</h3>
            {data.riskItems && data.riskItems.map((item, i) => (
              <div key={i} className={`border rounded-xl p-4 ${RISK_COLORS[item.riskLevel] || RISK_COLORS.SAFE}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-200">{item.courseName}</span>
                      <span className="font-mono text-xs text-slate-500">{item.courseCode}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${RISK_COLORS[item.riskLevel]}`}>{item.riskLevel}</span>
                    </div>
                    <p className="text-sm mt-1">{item.message}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-2xl font-bold ${
                      item.currentPercentage >= 75 ? 'text-emerald-300' :
                      item.currentPercentage >= 65 ? 'text-amber-300' : 'text-red-300'
                    }`}>{item.currentPercentage}%</p>
                    {item.classesNeededToReach75 > 0 && (
                      <p className="text-xs text-slate-500 mt-0.5">Need {item.classesNeededToReach75} more</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Recommendations */}
          {data.recommendations && data.recommendations.length > 0 && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">💡 Recommendations</h3>
              <div className="space-y-2">
                {data.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5 shrink-0">→</span>
                    <p className="text-sm text-slate-300">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!data && !loading && !error && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center text-slate-600 text-sm">
          No attendance data available for risk analysis.
        </div>
      )}
    </div>
  )
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',       label: '🏠 Overview' },
  { id: 'attendance',     label: '📋 Attendance' },
  { id: 'marks',          label: '📝 Marks & CGPA' },
  { id: 'timetable',      label: '📅 Timetable' },
  { id: 'fees',           label: '💰 Fees' },
  { id: 'placements',     label: '🏢 Placements' },
  { id: 'notifications',  label: '🔔 Notifications' },
  { id: 'documents',      label: '📄 Documents' },
  { id: 'ai-assistant',   label: '🤖 AI Assistant' },
  { id: 'ai-prediction',  label: '🎯 AI Insights' },
  { id: 'ai-risk',        label: '⚠️ Risk Alert' },
]

export default function StudentDashboard() {
  const navigate   = useNavigate()
  const email      = authService.getEmail()
  const [activeTab, setActiveTab]           = useState('overview')
  const [loading, setLoading]               = useState(false)
  const [message, setMessage]               = useState({ text: '', type: '' })

  // Data
  const [profile, setProfile]               = useState(null)
  const [attendance, setAttendance]         = useState(null)
  const [internalMarks, setInternalMarks]   = useState([])
  const [cgpa, setCgpa]                     = useState(null)
  const [timetable, setTimetable]           = useState(null)
  const [fees, setFees]                     = useState([])
  const [notices, setNotices]               = useState([])
  const [notifications, setNotifications]   = useState([])
  const [semesters, setSemesters]           = useState([])
  const [attendanceSemId, setAttendanceSemId] = useState(null)

  const showMessage = useCallback((text, type = 'success') => {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 4000)
  }, [])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [profileRes, overallAttRes, internalRes, cgpaRes, ttRes, feesRes, noticesRes, notifsRes] = await Promise.allSettled([
        api.get('/api/student/profile'),
        api.get('/api/student/attendance/overall'),
        api.get('/api/student/marks/internal'),
        api.get('/api/student/cgpa'),
        api.get('/api/student/timetable'),
        api.get('/api/student/fees'),
        api.get('/api/student/placements'),
        api.get('/api/student/notifications'),
      ])

      if (profileRes.status === 'fulfilled')   setProfile(profileRes.value.data)
      if (overallAttRes.status === 'fulfilled') setAttendance(overallAttRes.value.data)
      if (internalRes.status === 'fulfilled')  setInternalMarks(internalRes.value.data)
      if (cgpaRes.status === 'fulfilled')      setCgpa(cgpaRes.value.data)
      if (ttRes.status === 'fulfilled')        setTimetable(ttRes.value.data)
      if (feesRes.status === 'fulfilled')      setFees(feesRes.value.data)
      if (noticesRes.status === 'fulfilled')   setNotices(noticesRes.value.data)
      if (notifsRes.status === 'fulfilled')    setNotifications(notifsRes.value.data)
    } catch (err) {
      showMessage('Failed to load some data', 'error')
    } finally {
      setLoading(false)
    }
  }, [showMessage])

  // Fetch semesters for the attendance filter
  useEffect(() => {
    api.get('/api/semesters').then(r => setSemesters(r.data)).catch(() => {})
    fetchAll()
  }, [fetchAll])

  const handleAttendanceSemesterChange = async (semId) => {
    setAttendanceSemId(semId)
    try {
      const url = semId ? `/api/student/attendance?semesterId=${semId}` : '/api/student/attendance/overall'
      const res = await api.get(url)
      if (semId) {
        // endpoint returns array of SubjectAttendanceResponse
        const arr = res.data
        const totalClasses = arr.reduce((s, x) => s + x.totalClasses, 0)
        const totalPresent = arr.reduce((s, x) => s + x.present, 0)
        setAttendance({
          subjectWise: arr,
          totalClasses,
          totalPresent,
          overallPercentage: totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 1000) / 10 : 0
        })
      } else {
        setAttendance(res.data)
      }
    } catch {
      showMessage('Failed to load attendance for selected semester', 'error')
    }
  }

  const handleMarkRead = async (id) => {
    try {
      await api.put(`/api/student/notifications/${id}/read`)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    } catch {
      showMessage('Failed to mark notification as read', 'error')
    }
  }

  const handleLogout = async () => {
    await authService.logout()
    navigate('/login')
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* ── Navbar ── */}
      <nav className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center font-bold text-sm">C</div>
          <h1 className="text-lg font-semibold tracking-tight">
            Collego <span className="text-slate-500 font-normal">Student</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          {unreadCount > 0 && (
            <button onClick={() => setActiveTab('notifications')} className="relative">
              <span className="text-slate-400 text-lg">🔔</span>
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-violet-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{unreadCount}</span>
            </button>
          )}
          <span className="text-sm text-slate-400 hidden sm:block">{email}</span>
          <button
            onClick={handleLogout}
            className="text-sm bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg transition-colors border border-slate-700"
          >
            Logout
          </button>
        </div>
      </nav>

      <Toast message={message} />

      <div className="flex">
        {/* ── Sidebar ── */}
        <aside className="w-56 shrink-0 min-h-[calc(100vh-65px)] bg-slate-900/50 border-r border-slate-800 p-3 sticky top-[65px] self-start">
          <div className="space-y-0.5">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex items-center justify-between ${
                  activeTab === tab.id
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                <span>{tab.label}</span>
                {tab.id === 'notifications' && unreadCount > 0 && (
                  <span className="bg-violet-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                )}
              </button>
            ))}
          </div>

          {/* Profile mini-card */}
          {profile && (
            <div className="mt-6 bg-slate-900/80 border border-slate-800 rounded-xl p-3">
              <p className="text-xs font-semibold text-slate-200 truncate">{profile.firstName} {profile.lastName}</p>
              <p className="text-xs text-slate-500 mt-0.5 truncate">{profile.enrollmentNumber}</p>
              <p className="text-xs text-slate-600 mt-0.5 truncate">{profile.departmentName}</p>
              {cgpa?.cumulativeCgpa != null && (
                <div className="mt-2 flex justify-between items-center">
                  <span className="text-xs text-slate-500">CGPA</span>
                  <span className="text-sm font-bold text-violet-400">{fmtNum(cgpa.cumulativeCgpa)}</span>
                </div>
              )}
            </div>
          )}
        </aside>

        {/* ── Main Content ── */}
        <main className="flex-1 p-6 min-w-0">
          {activeTab === 'overview' && (
            <OverviewTab
              profile={profile}
              attendance={attendance}
              cgpa={cgpa}
              fees={fees}
              notifications={notifications}
            />
          )}
          {activeTab === 'attendance' && (
            <AttendanceTab
              attendance={attendance}
              semesters={semesters}
              onSemesterChange={handleAttendanceSemesterChange}
              loading={loading}
            />
          )}
          {activeTab === 'marks' && (
            <MarksTab
              internalMarks={internalMarks}
              semesters={semesters}
              cgpa={cgpa}
              loading={loading}
            />
          )}
          {activeTab === 'timetable' && (
            <TimetableTab timetable={timetable} loading={loading} />
          )}
          {activeTab === 'fees' && (
            <FeesTab fees={fees} loading={loading} />
          )}
          {activeTab === 'placements' && (
            <PlacementsTab notices={notices} loading={loading} />
          )}
          {activeTab === 'notifications' && (
            <NotificationsTab
              notifications={notifications}
              onMarkRead={handleMarkRead}
              loading={loading}
            />
          )}
          {activeTab === 'documents' && (
            <DocumentsTab
              semesters={semesters}
              cgpa={cgpa}
              showMessage={showMessage}
            />
          )}
          {activeTab === 'ai-assistant' && (
            <AiAssistantTab attendance={attendance} cgpa={cgpa} fees={fees} />
          )}
          {activeTab === 'ai-prediction' && <AiPredictionTab />}
          {activeTab === 'ai-risk' && <AiAttendanceRiskTab />}
        </main>
      </div>
    </div>
  )
}
