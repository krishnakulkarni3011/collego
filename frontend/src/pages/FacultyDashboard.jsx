import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/authService'
import api from '../services/api'

// ─── helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const fmtNum = (n, dp = 2) => (n == null ? '—' : Number(n).toFixed(dp))

// ─── tiny shared UI ───────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent = 'violet', icon }) {
  const colors = {
    violet: 'from-violet-500/20 to-fuchsia-500/20 border-violet-500/30 text-violet-300',
    emerald: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-300',
    amber: 'from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-300',
    blue: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-300',
    red: 'from-red-500/20 to-rose-500/20 border-red-500/30 text-red-300',
    fuchsia: 'from-fuchsia-500/20 to-pink-500/20 border-fuchsia-500/30 text-fuchsia-300',
  }
  const c = colors[accent]
  return (
    <div className={`bg-gradient-to-br ${c} border rounded-xl p-5`}>
      {icon && <div className="text-2xl mb-2">{icon}</div>}
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-3xl font-bold ${c.split(' ')[3]}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function Toast({ message }) {
  if (!message.text) return null
  return (
    <div
      className={`fixed top-20 right-6 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-2xl border transition-all ${
        message.type === 'error'
          ? 'bg-red-500/20 text-red-300 border-red-500/30'
          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
      }`}
    >
      {message.text}
    </div>
  )
}

function AttendanceBadge({ pct }) {
  if (pct >= 75)
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">{pct}%</span>
  if (pct >= 50)
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">{pct}%</span>
  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/15 text-red-300 border border-red-500/30">{pct}%</span>
}

function ProgressBar({ value, max = 100 }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const color = pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden w-full">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

// ─── TABS ─────────────────────────────────────────────────────────────────────
const SECTION_TABS = [
  { id: 'attendance', label: '📋 Attendance' },
  { id: 'internalMarks', label: '📝 Internal Marks' },
  { id: 'semesterMarks', label: '🎓 Semester Marks' },
  { id: 'studentPerformance', label: '👥 Student Performance' },
  { id: 'assignments', label: '📚 Assignments' },
  { id: 'materials', label: '📂 Materials' },
  { id: 'analytics', label: '📊 Analytics' },
]

const GLOBAL_TABS = [
  { id: 'overview', label: '🏠 Overview' },
  { id: 'questionPapers', label: '📄 Question Papers' },
  { id: 'notices', label: '📢 Notices' },
  { id: 'ai-notice-gen', label: '🤖 AI Notice Gen' },
]

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
function FacultyDashboard() {
  const navigate = useNavigate()
  const email = authService.getEmail()

  const [sections, setSections] = useState([])
  const [selectedSection, setSelectedSection] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(false)
  const [tabLoading, setTabLoading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })

  // Overview state
  const [overviewData, setOverviewData] = useState(null)

  // Attendance state
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0])
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [sectionAttendance, setSectionAttendance] = useState([])

  // Marks state
  const [examName, setExamName] = useState('IA-1')
  const [maxMarks, setMaxMarks] = useState(50)
  const [marksEntries, setMarksEntries] = useState([])
  const [sectionMarks, setSectionMarks] = useState([])

  // Semester marks state
  const [semMaxMarks, setSemMaxMarks] = useState(100)
  const [semMarksEntries, setSemMarksEntries] = useState([])

  // Student performance state
  const [studentPerformance, setStudentPerformance] = useState([])

  // Assignment state
  const [assignmentTitle, setAssignmentTitle] = useState('')
  const [assignmentDesc, setAssignmentDesc] = useState('')
  const [assignmentDueDate, setAssignmentDueDate] = useState('')
  const [sectionAssignments, setSectionAssignments] = useState([])

  // Material state
  const [materialTitle, setMaterialTitle] = useState('')
  const [materialDesc, setMaterialDesc] = useState('')
  const [materialType, setMaterialType] = useState('NOTES')
  const [sectionMaterials, setSectionMaterials] = useState([])

  // Notice state
  const [noticeTitle, setNoticeTitle] = useState('')
  const [noticeMessage, setNoticeMessage] = useState('')
  const [noticeType, setNoticeType] = useState('GENERAL')
  const [noticeDeptId, setNoticeDeptId] = useState('')
  const [departments, setDepartments] = useState([])
  const [sentNotices, setSentNotices] = useState([])

  // Question Paper state
  const [qpExamType, setQpExamType] = useState('END_TERM')
  const [qpYear, setQpYear] = useState(new Date().getFullYear())
  const [qpSemNum, setQpSemNum] = useState(1)
  const [qpFileName, setQpFileName] = useState('')
  const [qpSelectedSectionId, setQpSelectedSectionId] = useState('')
  const [myQuestionPapers, setMyQuestionPapers] = useState([])

  // Analytics state
  const [analytics, setAnalytics] = useState(null)

  // AI Notice Generator state (Phase 9 Feature 9)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiAudience, setAiAudience] = useState('students')
  const [aiNoticeType, setAiNoticeType] = useState('GENERAL')
  const [aiResult, setAiResult] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)

  // ─── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchSections()
    fetchDepartments()
  }, [])

  const fetchSections = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/faculty/sections')
      setSections(res.data)
    } catch {
      showMessage('Failed to load sections', 'error')
    } finally {
      setLoading(false)
    }
  }

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/api/departments')
      setDepartments(res.data)
    } catch {
      /* silent */
    }
  }

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 4000)
  }

  const handleLogout = async () => {
    await authService.logout()
    navigate('/login')
  }

  // ─── Overview ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'overview' && sections.length > 0) {
      buildOverview()
    }
  }, [activeTab, sections])

  const buildOverview = () => {
    const totalStudents = sections.reduce((s, sec) => s + (sec.enrolledStudents || 0), 0)
    setOverviewData({
      totalSections: sections.length,
      totalStudents,
      semesters: [...new Set(sections.map((s) => s.semesterName))],
      courses: [...new Set(sections.map((s) => s.courseName))],
    })
  }

  // ─── Section selection ───────────────────────────────────────────────────────
  const selectSection = (section) => {
    setSelectedSection(section)
    setActiveTab('attendance')
    setAnalytics(null)
    setSectionMarks([])
    setSectionAssignments([])
    setSectionMaterials([])
    setStudentPerformance([])
    loadEnrolledStudents(section.sectionId)
  }

  const loadEnrolledStudents = async (sectionId) => {
    try {
      const res = await api.get(`/api/faculty/attendance/${sectionId}`)
      const students = res.data
      setSectionAttendance(students)
      setAttendanceRecords(
        students.map((s) => ({
          studentId: s.studentId,
          studentName: s.studentName,
          enrollmentNumber: s.enrollmentNumber,
          status: 'PRESENT',
        }))
      )
      setMarksEntries(
        students.map((s) => ({
          studentId: s.studentId,
          studentName: s.studentName,
          enrollmentNumber: s.enrollmentNumber,
          obtainedMarks: '',
        }))
      )
      setSemMarksEntries(
        students.map((s) => ({
          studentId: s.studentId,
          studentName: s.studentName,
          enrollmentNumber: s.enrollmentNumber,
          obtainedMarks: '',
        }))
      )
    } catch {
      showMessage('Failed to load student data', 'error')
    }
  }

  // ─── Attendance ──────────────────────────────────────────────────────────────
  const handleMarkAttendance = async () => {
    try {
      setLoading(true)
      const res = await api.post('/api/faculty/attendance', {
        sectionId: selectedSection.sectionId,
        date: attendanceDate,
        records: attendanceRecords.map((r) => ({ studentId: r.studentId, status: r.status })),
      })
      showMessage(`Attendance saved: ${res.data.markedPresent} present, ${res.data.markedAbsent} absent`)
      loadEnrolledStudents(selectedSection.sectionId)
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to mark attendance', 'error')
    } finally {
      setLoading(false)
    }
  }

  const toggleAttendance = (idx) => {
    setAttendanceRecords((prev) =>
      prev.map((r, i) =>
        i === idx ? { ...r, status: r.status === 'PRESENT' ? 'ABSENT' : 'PRESENT' } : r
      )
    )
  }

  // ─── Internal Marks ──────────────────────────────────────────────────────────
  const handleUploadInternalMarks = async () => {
    const entries = marksEntries
      .filter((e) => e.obtainedMarks !== '' && e.obtainedMarks !== null)
      .map((e) => ({ studentId: e.studentId, obtainedMarks: parseFloat(e.obtainedMarks) }))
    if (entries.length === 0) { showMessage('Enter marks for at least one student', 'error'); return }
    try {
      setLoading(true)
      const res = await api.post('/api/faculty/marks/internal', {
        sectionId: selectedSection.sectionId,
        examName,
        maxMarks: parseFloat(maxMarks),
        entries,
      })
      showMessage(`Internal marks saved: ${res.data.created} created, ${res.data.updated} updated`)
      loadSectionMarks()
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to upload marks', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadSectionMarks = async () => {
    try {
      setTabLoading(true)
      const res = await api.get(`/api/faculty/marks/internal/${selectedSection.sectionId}`)
      setSectionMarks(res.data)
    } catch {
      showMessage('Failed to load marks', 'error')
    } finally {
      setTabLoading(false)
    }
  }

  // ─── Semester Marks ──────────────────────────────────────────────────────────
  const handleUploadSemesterMarks = async () => {
    const entries = semMarksEntries
      .filter((e) => e.obtainedMarks !== '' && e.obtainedMarks !== null)
      .map((e) => ({ studentId: e.studentId, obtainedMarks: parseFloat(e.obtainedMarks) }))
    if (entries.length === 0) { showMessage('Enter marks for at least one student', 'error'); return }
    try {
      setLoading(true)
      const res = await api.post('/api/faculty/marks/semester', {
        sectionId: selectedSection.sectionId,
        maxMarks: parseFloat(semMaxMarks),
        entries,
      })
      showMessage(`Semester marks saved: ${res.data.created} created, ${res.data.updated} updated`)
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to upload semester marks', 'error')
    } finally {
      setLoading(false)
    }
  }

  // ─── Student Performance (combined marks + attendance per student) ─────────
  const loadStudentPerformance = useCallback(async () => {
    if (!selectedSection) return
    try {
      setTabLoading(true)
      const [attRes, marksRes] = await Promise.all([
        api.get(`/api/faculty/attendance/${selectedSection.sectionId}`),
        api.get(`/api/faculty/marks/internal/${selectedSection.sectionId}`),
      ])
      const attMap = {}
      attRes.data.forEach((s) => { attMap[s.studentId] = s })
      const combined = marksRes.data.map((m) => ({
        ...m,
        attendance: attMap[m.studentId] || null,
      }))
      // Also add students who have attendance but no marks entry
      attRes.data.forEach((s) => {
        if (!combined.find((c) => c.studentId === s.studentId)) {
          combined.push({ studentId: s.studentId, studentName: s.studentName, enrollmentNumber: s.enrollmentNumber, attendance: s })
        }
      })
      setStudentPerformance(combined)
    } catch {
      showMessage('Failed to load student performance', 'error')
    } finally {
      setTabLoading(false)
    }
  }, [selectedSection])

  // ─── Assignments ─────────────────────────────────────────────────────────────
  const handleCreateAssignment = async () => {
    try {
      setLoading(true)
      await api.post('/api/faculty/assignments', {
        sectionId: selectedSection.sectionId,
        title: assignmentTitle,
        description: assignmentDesc,
        dueDate: assignmentDueDate || null,
        fileName: null,
      })
      showMessage('Assignment created successfully')
      setAssignmentTitle(''); setAssignmentDesc(''); setAssignmentDueDate('')
      loadAssignments()
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to create assignment', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadAssignments = async () => {
    try {
      setTabLoading(true)
      const res = await api.get(`/api/faculty/assignments/${selectedSection.sectionId}`)
      setSectionAssignments(res.data)
    } catch {
      showMessage('Failed to load assignments', 'error')
    } finally {
      setTabLoading(false)
    }
  }

  // ─── Materials ───────────────────────────────────────────────────────────────
  const handleCreateMaterial = async () => {
    try {
      setLoading(true)
      await api.post('/api/faculty/materials', {
        sectionId: selectedSection.sectionId,
        title: materialTitle,
        description: materialDesc,
        materialType,
        fileName: null,
      })
      showMessage('Course material added successfully')
      setMaterialTitle(''); setMaterialDesc('')
      loadMaterials()
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to add material', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadMaterials = async () => {
    try {
      setTabLoading(true)
      const res = await api.get(`/api/faculty/materials/${selectedSection.sectionId}`)
      setSectionMaterials(res.data)
    } catch {
      showMessage('Failed to load materials', 'error')
    } finally {
      setTabLoading(false)
    }
  }

  // ─── Question Papers ─────────────────────────────────────────────────────────
  const handleUploadQP = async () => {
    const sec = sections.find((s) => s.sectionId === parseInt(qpSelectedSectionId))
    if (!sec) { showMessage('Please select a course/section', 'error'); return }
    try {
      setLoading(true)
      await api.post('/api/faculty/question-papers', {
        courseId: sec.courseId,
        departmentId: null, // Will be derived from course on backend if needed
        examType: qpExamType,
        year: parseInt(qpYear),
        semesterNumber: sec.semesterNumber,
        fileName: qpFileName || `${sec.courseCode}_${qpExamType}_${qpYear}.pdf`,
      })
      showMessage('Question paper uploaded (pending admin approval)')
      setQpFileName('')
      loadMyQPs()
    } catch (err) {
      // Fallback: try with explicit dept from first dept
      try {
        await api.post('/api/faculty/question-papers', {
          courseId: sec.courseId,
          departmentId: departments[0]?.id || 1,
          examType: qpExamType,
          year: parseInt(qpYear),
          semesterNumber: sec.semesterNumber,
          fileName: qpFileName || `${sec.courseCode}_${qpExamType}_${qpYear}.pdf`,
        })
        showMessage('Question paper uploaded (pending admin approval)')
        setQpFileName('')
        loadMyQPs()
      } catch (err2) {
        showMessage(err2.response?.data?.message || 'Failed to upload question paper', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  const loadMyQPs = async () => {
    try {
      const res = await api.get('/api/faculty/question-papers')
      setMyQuestionPapers(res.data)
    } catch {
      showMessage('Failed to load question papers', 'error')
    }
  }

  // ─── Notices ─────────────────────────────────────────────────────────────────
  const handleDraftNotice = async () => {
    try {
      setLoading(true)
      const res = await api.post('/api/faculty/notices', {
        title: noticeTitle,
        message: noticeMessage,
        type: noticeType,
        departmentId: noticeDeptId ? parseInt(noticeDeptId) : null,
      })
      showMessage(`Notice sent to ${res.data.recipientCount} students`)
      setSentNotices((prev) => [{ title: noticeTitle, message: noticeMessage, type: noticeType, recipientCount: res.data.recipientCount, sentAt: new Date().toISOString() }, ...prev])
      setNoticeTitle(''); setNoticeMessage('')
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to send notice', 'error')
    } finally {
      setLoading(false)
    }
  }

  // ─── AI Notice Generator (Phase 9) ──────────────────────────────────────────
  const handleAiGenerateNotice = async () => {
    if (!aiPrompt.trim()) { showMessage('Enter a prompt for the notice', 'error'); return }
    try {
      setAiLoading(true)
      setAiResult(null)
      const res = await api.post('/api/ai/generate-notice', {
        prompt: aiPrompt,
        audience: aiAudience,
        noticeType: aiNoticeType,
      })
      setAiResult(res.data)
      showMessage('AI notice generated! Review and use the content below.')
    } catch (err) {
      showMessage(err.response?.data?.message || 'AI notice generation failed', 'error')
    } finally {
      setAiLoading(false)
    }
  }

  const useAiNotice = () => {
    if (!aiResult) return
    setNoticeTitle(aiResult.title || '')
    setNoticeMessage(aiResult.body || '')
    setActiveTab('notices')
    setSelectedSection(null)
    showMessage('AI-generated notice copied to Notice form!')
  }

  // ─── Analytics ───────────────────────────────────────────────────────────────
  const loadAnalytics = async () => {
    try {
      setTabLoading(true)
      const res = await api.get(`/api/faculty/analytics/${selectedSection.sectionId}`)
      setAnalytics(res.data)
    } catch {
      showMessage('Failed to load analytics', 'error')
    } finally {
      setTabLoading(false)
    }
  }

  // ─── Tab change handler ───────────────────────────────────────────────────────
  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    if (!selectedSection) return
    if (tabId === 'assignments') loadAssignments()
    if (tabId === 'materials') loadMaterials()
    if (tabId === 'analytics') loadAnalytics()
    if (tabId === 'internalMarks') loadSectionMarks()
    if (tabId === 'studentPerformance') loadStudentPerformance()
  }

  // ─── Derived helpers ──────────────────────────────────────────────────────────
  const presentCount = attendanceRecords.filter((r) => r.status === 'PRESENT').length
  const absentCount = attendanceRecords.length - presentCount

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      {/* Navbar */}
      <nav className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-lg flex items-center justify-center font-bold text-sm">C</div>
          <h1 className="text-lg font-semibold tracking-tight">Collego <span className="text-slate-500 font-normal">Faculty</span></h1>
        </div>
        <div className="flex items-center gap-4">
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
        {/* Sidebar */}
        <aside className="w-72 min-h-[calc(100vh-65px)] bg-slate-900/50 border-r border-slate-800 p-4 flex flex-col gap-2 sticky top-[65px] self-start overflow-y-auto">
          {/* Global Tabs */}
          <div className="mb-2">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">Dashboard</h2>
            {GLOBAL_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setSelectedSection(null)
                  setActiveTab(tab.id)
                  if (tab.id === 'questionPapers') loadMyQPs()
                }}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all mb-0.5 ${
                  activeTab === tab.id && !selectedSection
                    ? 'bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/30'
                    : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* My Sections */}
          <div>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">My Sections</h2>
            {loading && sections.length === 0 && <p className="text-sm text-slate-500 px-2">Loading...</p>}
            {sections.length === 0 && !loading && (
              <p className="text-xs text-slate-600 px-2">No sections assigned yet.</p>
            )}
            {sections.map((sec) => (
              <button
                key={sec.sectionId}
                onClick={() => selectSection(sec)}
                className={`w-full text-left px-3 py-3 rounded-lg text-sm transition-all mb-0.5 ${
                  selectedSection?.sectionId === sec.sectionId
                    ? 'bg-violet-500/15 text-violet-300 border border-violet-500/30'
                    : 'hover:bg-slate-800 text-slate-300 border border-transparent'
                }`}
              >
                <div className="font-medium truncate">{sec.courseName}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {sec.courseCode} · Sec {sec.sectionName} · {sec.enrolledStudents} students
                </div>
                <div className="text-xs text-slate-600 mt-0.5">{sec.semesterName}</div>
              </button>
            ))}
          </div>

          {/* Summary */}
          {sections.length > 0 && (
            <div className="mt-auto pt-4 border-t border-slate-800">
              <div className="bg-slate-900/60 rounded-lg p-3 space-y-1">
                <p className="text-xs text-slate-500">
                  <span className="text-slate-300 font-semibold">{sections.length}</span> sections
                  · <span className="text-slate-300 font-semibold">{sections.reduce((a, s) => a + (s.enrolledStudents || 0), 0)}</span> students
                </p>
                <p className="text-xs text-slate-600">{[...new Set(sections.map((s) => s.semesterName))].join(', ')}</p>
              </div>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 min-h-[calc(100vh-65px)]">

          {/* ===== OVERVIEW ===== */}
          {activeTab === 'overview' && !selectedSection && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Faculty Portal</h2>
                <p className="text-slate-400 text-sm">Welcome back! Here's a summary of your teaching assignments.</p>
              </div>

              {overviewData ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard icon="📚" label="Sections Assigned" value={overviewData.totalSections} accent="violet" />
                    <StatCard icon="👥" label="Total Students" value={overviewData.totalStudents} accent="blue" />
                    <StatCard icon="📖" label="Unique Courses" value={overviewData.courses.length} accent="emerald" />
                    <StatCard icon="🗓️" label="Semesters" value={overviewData.semesters.length} sub={overviewData.semesters.join(', ')} accent="amber" />
                  </div>

                  {/* Section cards */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">My Teaching Sections</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {sections.map((sec) => (
                        <button
                          key={sec.sectionId}
                          onClick={() => selectSection(sec)}
                          className="text-left bg-slate-900/50 border border-slate-800 hover:border-violet-500/40 rounded-xl p-5 transition-all hover:bg-slate-900/80 group"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-semibold text-slate-200 group-hover:text-violet-300 transition-colors">{sec.courseName}</h4>
                              <p className="text-xs text-slate-500 font-mono mt-0.5">{sec.courseCode}</p>
                            </div>
                            <span className="text-xs bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2 py-1 rounded-md">Sec {sec.sectionName}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>👥 {sec.enrolledStudents} students</span>
                            <span>{sec.semesterName}</span>
                            <span>{sec.credits} credits</span>
                          </div>
                          <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-violet-400 group-hover:text-violet-300 transition-colors">
                            Click to manage →
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Phase 4 Feature Guide */}
                  <div className="bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 border border-violet-500/20 rounded-xl p-5">
                    <h3 className="font-semibold text-slate-300 mb-3">📋 Phase 4 — Available Features</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                      {[
                        { icon: '📋', label: 'Mark Attendance', desc: 'Bulk per-session entry' },
                        { icon: '📝', label: 'Internal Marks', desc: 'IA-1, IA-2, IA-3 upload' },
                        { icon: '🎓', label: 'Semester Marks', desc: 'Auto grade calculation' },
                        { icon: '👥', label: 'Student Performance', desc: 'Combined view per student' },
                        { icon: '📚', label: 'Assignments', desc: 'Create & track assignments' },
                        { icon: '📂', label: 'Course Materials', desc: 'Syllabus, notes, references' },
                        { icon: '📄', label: 'Question Papers', desc: 'Upload for admin approval' },
                        { icon: '📢', label: 'Notices', desc: 'Broadcast to students' },
                        { icon: '📊', label: 'Analytics', desc: 'Attendance & marks insights' },
                      ].map((f) => (
                        <div key={f.label} className="flex items-start gap-2 bg-slate-900/40 rounded-lg p-3">
                          <span className="text-lg">{f.icon}</span>
                          <div>
                            <p className="text-slate-300 font-medium text-xs">{f.label}</p>
                            <p className="text-slate-600 text-xs">{f.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
                  {loading ? <Spinner /> : 'Select a section from the sidebar to begin.'}
                </div>
              )}
            </div>
          )}

          {/* Section header + tabs */}
          {selectedSection && activeTab !== 'questionPapers' && activeTab !== 'notices' && activeTab !== 'overview' && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg font-semibold">
                  {selectedSection.courseName}{' '}
                  <span className="text-slate-500 text-sm font-normal">({selectedSection.courseCode})</span>
                </h2>
                <button
                  onClick={() => { setSelectedSection(null); setActiveTab('overview') }}
                  className="text-xs text-slate-500 hover:text-slate-300 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg transition-colors"
                >
                  ← Back to Overview
                </button>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Section {selectedSection.sectionName} · {selectedSection.semesterName} · {selectedSection.enrolledStudents} students · {selectedSection.credits} credits
              </p>
              <div className="flex gap-1 bg-slate-900/50 rounded-xl p-1 border border-slate-800 flex-wrap">
                {SECTION_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`flex-1 min-w-[90px] px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      activeTab === tab.id ? 'bg-violet-500/20 text-violet-300' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ===== ATTENDANCE TAB ===== */}
          {activeTab === 'attendance' && selectedSection && (
            <div className="space-y-5">
              <div className="flex items-center gap-4 flex-wrap">
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-violet-500"
                />
                <button
                  onClick={() => setAttendanceRecords((prev) => prev.map((r) => ({ ...r, status: 'PRESENT' })))}
                  className="text-xs bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-3 py-2 rounded-lg hover:bg-emerald-500/25 transition-colors"
                >
                  ✓ All Present
                </button>
                <button
                  onClick={() => setAttendanceRecords((prev) => prev.map((r) => ({ ...r, status: 'ABSENT' })))}
                  className="text-xs bg-red-500/15 text-red-300 border border-red-500/30 px-3 py-2 rounded-lg hover:bg-red-500/25 transition-colors"
                >
                  ✗ All Absent
                </button>
                <div className="ml-auto flex items-center gap-3 text-xs text-slate-500">
                  <span className="text-emerald-400 font-semibold">{presentCount} Present</span>
                  <span className="text-red-400 font-semibold">{absentCount} Absent</span>
                  <span>/ {attendanceRecords.length} total</span>
                </div>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-900">
                    <tr className="text-slate-400 text-xs uppercase">
                      <th className="px-4 py-3 text-left">#</th>
                      <th className="px-4 py-3 text-left">Enrollment</th>
                      <th className="px-4 py-3 text-left">Student Name</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {attendanceRecords.map((r, i) => (
                      <tr key={r.studentId} className="hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-400">{r.enrollmentNumber}</td>
                        <td className="px-4 py-3 text-slate-200">{r.studentName}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => toggleAttendance(i)}
                            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                              r.status === 'PRESENT'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                                : 'bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30'
                            }`}
                          >
                            {r.status}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {attendanceRecords.length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-600">No students enrolled in this section.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <button
                onClick={handleMarkAttendance}
                disabled={loading || attendanceRecords.length === 0}
                className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 px-6 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 shadow-lg shadow-violet-500/20"
              >
                {loading ? 'Saving...' : `Submit Attendance for ${attendanceDate}`}
              </button>

              {/* Attendance Summary */}
              {sectionAttendance.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-slate-400 mb-3">📊 Cumulative Attendance Summary</h3>
                  <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-900">
                        <tr className="text-slate-400 text-xs uppercase">
                          <th className="px-4 py-3 text-left">Student</th>
                          <th className="px-4 py-3 text-center">Total</th>
                          <th className="px-4 py-3 text-center">Present</th>
                          <th className="px-4 py-3 text-center">Absent</th>
                          <th className="px-4 py-3 text-center">Percentage</th>
                          <th className="px-4 py-3 text-left w-36">Progress</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {sectionAttendance.map((s) => (
                          <tr key={s.studentId} className="hover:bg-slate-800/40">
                            <td className="px-4 py-3">
                              <p className="text-slate-200">{s.studentName}</p>
                              <p className="text-xs text-slate-500 font-mono">{s.enrollmentNumber}</p>
                            </td>
                            <td className="px-4 py-3 text-center text-slate-400">{s.totalClasses}</td>
                            <td className="px-4 py-3 text-center text-emerald-400 font-semibold">{s.present}</td>
                            <td className="px-4 py-3 text-center text-red-400 font-semibold">{s.absent}</td>
                            <td className="px-4 py-3 text-center"><AttendanceBadge pct={s.percentage} /></td>
                            <td className="px-4 py-3"><ProgressBar value={s.percentage} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== INTERNAL MARKS TAB ===== */}
          {activeTab === 'internalMarks' && selectedSection && (
            <div className="space-y-5">
              {/* Entry form */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-slate-300 mb-4">Enter Internal Marks</h3>
                <div className="flex items-center gap-4 mb-4 flex-wrap">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Exam</label>
                    <select
                      value={examName}
                      onChange={(e) => setExamName(e.target.value)}
                      className="bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-violet-500"
                    >
                      <option value="IA-1">IA-1</option>
                      <option value="IA-2">IA-2</option>
                      <option value="IA-3">IA-3</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Max Marks</label>
                    <input
                      type="number"
                      value={maxMarks}
                      onChange={(e) => setMaxMarks(e.target.value)}
                      className="w-24 bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={() => setMarksEntries((prev) => prev.map((m) => ({ ...m, obtainedMarks: '' })))}
                      className="text-xs text-slate-400 hover:text-slate-200 bg-slate-800 border border-slate-700 px-3 py-2 rounded-lg transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-900">
                      <tr className="text-slate-400 text-xs uppercase">
                        <th className="px-4 py-3 text-left">#</th>
                        <th className="px-4 py-3 text-left">Enrollment</th>
                        <th className="px-4 py-3 text-left">Student Name</th>
                        <th className="px-4 py-3 text-center">Marks (/{maxMarks})</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {marksEntries.map((e, i) => (
                        <tr key={e.studentId} className="hover:bg-slate-800/50">
                          <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-400">{e.enrollmentNumber}</td>
                          <td className="px-4 py-3 text-slate-200">{e.studentName}</td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max={maxMarks}
                              value={e.obtainedMarks}
                              onChange={(ev) =>
                                setMarksEntries((prev) =>
                                  prev.map((m, j) =>
                                    j === i ? { ...m, obtainedMarks: ev.target.value } : m
                                  )
                                )
                              }
                              className="w-24 bg-slate-800 border border-slate-600 text-white px-3 py-1.5 rounded-lg text-sm text-center focus:outline-none focus:border-violet-500"
                            />
                          </td>
                        </tr>
                      ))}
                      {marksEntries.length === 0 && (
                        <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-600">No students enrolled.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center gap-4 mt-4">
                  <button
                    onClick={handleUploadInternalMarks}
                    disabled={loading}
                    className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 px-6 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 shadow-lg shadow-violet-500/20"
                  >
                    {loading ? 'Saving...' : `Save ${examName} Marks`}
                  </button>
                  <button
                    onClick={loadSectionMarks}
                    className="text-sm text-slate-400 hover:text-slate-200 bg-slate-800 border border-slate-700 px-4 py-2.5 rounded-lg transition-colors"
                  >
                    Refresh Existing
                  </button>
                </div>
              </div>

              {/* Existing marks - nicely formatted table */}
              {tabLoading ? <Spinner /> : sectionMarks.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-400 mb-3">📋 Existing Internal Marks for Section</h3>
                  <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-900">
                        <tr className="text-slate-400 text-xs uppercase">
                          <th className="px-4 py-3 text-left">Student</th>
                          <th className="px-4 py-3 text-center">IA-1</th>
                          <th className="px-4 py-3 text-center">IA-2</th>
                          <th className="px-4 py-3 text-center">IA-3</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {sectionMarks.map((student) => (
                          <tr key={student.studentId} className="hover:bg-slate-800/40">
                            <td className="px-4 py-3">
                              <p className="text-slate-200">{student.studentName}</p>
                              <p className="text-xs text-slate-500 font-mono">{student.enrollmentNumber}</p>
                            </td>
                            {['IA-1', 'IA-2', 'IA-3'].map((ia) => (
                              <td key={ia} className="px-4 py-3 text-center">
                                {student[ia] ? (
                                  <div>
                                    <span className="text-violet-300 font-semibold">{student[ia].obtainedMarks}</span>
                                    <span className="text-slate-500">/{student[ia].maxMarks}</span>
                                    <div className="mt-1 mx-auto w-20">
                                      <ProgressBar value={student[ia].obtainedMarks} max={student[ia].maxMarks} />
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-slate-700">—</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== SEMESTER MARKS TAB ===== */}
          {activeTab === 'semesterMarks' && selectedSection && (
            <div className="space-y-5">
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-slate-300 mb-4">Enter Semester / End-Term Marks</h3>
                <div className="flex items-center gap-4 mb-4">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Max Marks</label>
                    <input
                      type="number"
                      value={semMaxMarks}
                      onChange={(e) => setSemMaxMarks(e.target.value)}
                      className="w-28 bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-4">Grades (O/A+/A/B+/B/C/P/F) and grade points are auto-calculated from percentage.</p>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-900">
                      <tr className="text-slate-400 text-xs uppercase">
                        <th className="px-4 py-3 text-left">#</th>
                        <th className="px-4 py-3 text-left">Enrollment</th>
                        <th className="px-4 py-3 text-left">Student Name</th>
                        <th className="px-4 py-3 text-center">Marks (/{semMaxMarks})</th>
                        <th className="px-4 py-3 text-center">% (Preview)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {semMarksEntries.map((e, i) => {
                        const pct = e.obtainedMarks !== '' ? Math.round((parseFloat(e.obtainedMarks) / parseFloat(semMaxMarks)) * 100) : null
                        return (
                          <tr key={e.studentId} className="hover:bg-slate-800/50">
                            <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                            <td className="px-4 py-3 font-mono text-xs text-slate-400">{e.enrollmentNumber}</td>
                            <td className="px-4 py-3 text-slate-200">{e.studentName}</td>
                            <td className="px-4 py-3 text-center">
                              <input
                                type="number"
                                min="0"
                                max={semMaxMarks}
                                value={e.obtainedMarks}
                                onChange={(ev) =>
                                  setSemMarksEntries((prev) =>
                                    prev.map((m, j) =>
                                      j === i ? { ...m, obtainedMarks: ev.target.value } : m
                                    )
                                  )
                                }
                                className="w-24 bg-slate-800 border border-slate-600 text-white px-3 py-1.5 rounded-lg text-sm text-center focus:outline-none focus:border-violet-500"
                              />
                            </td>
                            <td className="px-4 py-3 text-center">
                              {pct !== null ? <AttendanceBadge pct={pct} /> : <span className="text-slate-700">—</span>}
                            </td>
                          </tr>
                        )
                      })}
                      {semMarksEntries.length === 0 && (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-600">No students enrolled.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <button
                  onClick={handleUploadSemesterMarks}
                  disabled={loading}
                  className="mt-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 px-6 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 shadow-lg shadow-violet-500/20"
                >
                  {loading ? 'Saving...' : 'Save Semester Marks'}
                </button>
              </div>

              {/* Grade reference */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Grade Reference Table</h4>
                <div className="grid grid-cols-4 md:grid-cols-8 gap-2 text-xs">
                  {[
                    { range: '≥90%', grade: 'O', gp: '10', color: 'text-emerald-300' },
                    { range: '80–89%', grade: 'A+', gp: '9', color: 'text-emerald-400' },
                    { range: '70–79%', grade: 'A', gp: '8', color: 'text-teal-300' },
                    { range: '60–69%', grade: 'B+', gp: '7', color: 'text-blue-300' },
                    { range: '55–59%', grade: 'B', gp: '6', color: 'text-blue-400' },
                    { range: '50–54%', grade: 'C', gp: '5', color: 'text-yellow-300' },
                    { range: '45–49%', grade: 'P', gp: '4', color: 'text-yellow-400' },
                    { range: '<45%', grade: 'F', gp: '0', color: 'text-red-400' },
                  ].map((g) => (
                    <div key={g.grade} className="bg-slate-800/50 rounded-lg p-2 text-center border border-slate-700/50">
                      <p className={`text-lg font-bold ${g.color}`}>{g.grade}</p>
                      <p className="text-slate-500">{g.gp} GP</p>
                      <p className="text-slate-600 text-[10px] mt-0.5">{g.range}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ===== STUDENT PERFORMANCE TAB ===== */}
          {activeTab === 'studentPerformance' && selectedSection && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-200">👥 Student Performance Overview</h3>
                <button
                  onClick={loadStudentPerformance}
                  className="text-xs text-slate-400 hover:text-slate-200 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg transition-colors"
                >
                  ↻ Refresh
                </button>
              </div>
              {tabLoading ? <Spinner /> : (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-900">
                      <tr className="text-slate-400 text-xs uppercase">
                        <th className="px-4 py-3 text-left">Student</th>
                        <th className="px-4 py-3 text-center">Attendance</th>
                        <th className="px-4 py-3 text-center">IA-1</th>
                        <th className="px-4 py-3 text-center">IA-2</th>
                        <th className="px-4 py-3 text-center">IA-3</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {studentPerformance.map((sp) => (
                        <tr key={sp.studentId} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3">
                            <p className="text-slate-200 font-medium">{sp.studentName}</p>
                            <p className="text-xs text-slate-500 font-mono">{sp.enrollmentNumber}</p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {sp.attendance ? (
                              <div>
                                <AttendanceBadge pct={sp.attendance.percentage} />
                                <p className="text-xs text-slate-600 mt-0.5">{sp.attendance.present}/{sp.attendance.totalClasses}</p>
                              </div>
                            ) : <span className="text-slate-700">—</span>}
                          </td>
                          {['IA-1', 'IA-2', 'IA-3'].map((ia) => (
                            <td key={ia} className="px-4 py-3 text-center">
                              {sp[ia] ? (
                                <div>
                                  <span className="text-violet-300 font-semibold">{sp[ia].obtainedMarks}</span>
                                  <span className="text-slate-500">/{sp[ia].maxMarks}</span>
                                </div>
                              ) : <span className="text-slate-700">—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {studentPerformance.length === 0 && (
                        <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-600">No data available. Mark attendance or upload marks first.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ===== ASSIGNMENTS TAB ===== */}
          {activeTab === 'assignments' && selectedSection && (
            <div className="space-y-6">
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-semibold text-slate-300 mb-1">📚 New Assignment</h3>
                <input
                  type="text"
                  placeholder="Assignment title *"
                  value={assignmentTitle}
                  onChange={(e) => setAssignmentTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-violet-500"
                />
                <textarea
                  placeholder="Description / instructions (optional)"
                  value={assignmentDesc}
                  onChange={(e) => setAssignmentDesc(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-violet-500 h-24 resize-none"
                />
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-400">Due Date:</label>
                    <input
                      type="date"
                      value={assignmentDueDate}
                      onChange={(e) => setAssignmentDueDate(e.target.value)}
                      className="bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <button
                    onClick={handleCreateAssignment}
                    disabled={loading || !assignmentTitle}
                    className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 px-5 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                  >
                    {loading ? 'Creating...' : 'Create Assignment'}
                  </button>
                </div>
              </div>

              {tabLoading ? <Spinner /> : sectionAssignments.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-400 mb-3">Existing Assignments ({sectionAssignments.length})</h3>
                  <div className="space-y-3">
                    {sectionAssignments.map((a) => {
                      const isOverdue = a.dueDate && new Date(a.dueDate) < new Date()
                      return (
                        <div key={a.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1">
                              <h4 className="font-medium text-slate-200">{a.title}</h4>
                              {a.description && <p className="text-xs text-slate-500 mt-1">{a.description}</p>}
                              <p className="text-xs text-slate-600 mt-2">Created {fmtDate(a.createdAt)}</p>
                            </div>
                            <div className="text-right shrink-0">
                              {a.dueDate ? (
                                <span className={`text-xs px-2 py-1 rounded-md border ${isOverdue ? 'text-red-400 bg-red-500/10 border-red-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20'}`}>
                                  {isOverdue ? '⚠ Overdue: ' : 'Due: '}{fmtDate(a.dueDate)}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-600">No due date</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {!tabLoading && sectionAssignments.length === 0 && (
                <p className="text-slate-600 text-sm">No assignments created yet for this section.</p>
              )}
            </div>
          )}

          {/* ===== MATERIALS TAB ===== */}
          {activeTab === 'materials' && selectedSection && (
            <div className="space-y-6">
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-semibold text-slate-300 mb-1">📂 Add Course Material</h3>
                <input
                  type="text"
                  placeholder="Material title *"
                  value={materialTitle}
                  onChange={(e) => setMaterialTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-violet-500"
                />
                <textarea
                  placeholder="Description (optional)"
                  value={materialDesc}
                  onChange={(e) => setMaterialDesc(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-violet-500 h-20 resize-none"
                />
                <div className="flex items-center gap-4">
                  <select
                    value={materialType}
                    onChange={(e) => setMaterialType(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-violet-500"
                  >
                    <option value="SYLLABUS">📋 Syllabus</option>
                    <option value="NOTES">📝 Lecture Notes</option>
                    <option value="REFERENCE">📖 Reference Material</option>
                    <option value="OTHER">📎 Other</option>
                  </select>
                  <button
                    onClick={handleCreateMaterial}
                    disabled={loading || !materialTitle}
                    className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 px-5 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                  >
                    {loading ? 'Adding...' : 'Add Material'}
                  </button>
                </div>
              </div>

              {tabLoading ? <Spinner /> : sectionMaterials.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-400 mb-3">Uploaded Materials ({sectionMaterials.length})</h3>
                  <div className="space-y-2">
                    {sectionMaterials.map((m) => {
                      const typeIcon = { SYLLABUS: '📋', NOTES: '📝', REFERENCE: '📖', OTHER: '📎' }
                      return (
                        <div key={m.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex items-center justify-between hover:border-slate-700 transition-colors">
                          <div className="flex items-start gap-3">
                            <span className="text-xl mt-0.5">{typeIcon[m.materialType] || '📎'}</span>
                            <div>
                              <h4 className="font-medium text-slate-200">{m.title}</h4>
                              {m.description && <p className="text-xs text-slate-500 mt-0.5">{m.description}</p>}
                              <p className="text-xs text-slate-600 mt-0.5">{m.materialType} · {fmtDate(m.createdAt)}</p>
                            </div>
                          </div>
                          {m.fileName && (
                            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded font-mono">{m.fileName}</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {!tabLoading && sectionMaterials.length === 0 && (
                <p className="text-slate-600 text-sm">No materials added yet for this section.</p>
              )}
            </div>
          )}

          {/* ===== ANALYTICS TAB ===== */}
          {activeTab === 'analytics' && selectedSection && (
            <div className="space-y-5">
              {tabLoading ? <Spinner /> : !analytics ? (
                <div className="flex flex-col items-center justify-center h-48 gap-3">
                  <p className="text-slate-500 text-sm">Analytics not loaded yet.</p>
                  <button onClick={loadAnalytics} className="bg-violet-500/20 text-violet-300 border border-violet-500/30 px-4 py-2 rounded-lg text-sm hover:bg-violet-500/30 transition-colors">
                    Load Analytics
                  </button>
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                    <h3 className="font-semibold text-slate-200">{analytics.courseName} <span className="text-slate-500 font-normal text-sm">({analytics.courseCode})</span></h3>
                    <p className="text-xs text-slate-500 mt-0.5">{analytics.totalStudents} enrolled students</p>
                  </div>

                  {/* Stat cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard icon="📋" label="Avg Attendance" value={`${fmtNum(analytics.averageAttendancePercentage, 1)}%`} accent={analytics.averageAttendancePercentage >= 75 ? 'emerald' : 'amber'} />
                    <StatCard icon="✅" label="≥75% Attendance" value={analytics.studentsAbove75Attendance} sub="students" accent="emerald" />
                    <StatCard icon="⚠️" label="<75% Attendance" value={analytics.studentsBelow75Attendance} sub="at risk" accent="amber" />
                    <StatCard icon="🎓" label="Pass Rate" value={analytics.passPercentage !== null ? `${fmtNum(analytics.passPercentage, 1)}%` : '—'} sub={`${analytics.totalPassed} passed · ${analytics.totalFailed} failed`} accent={analytics.passPercentage >= 50 ? 'emerald' : 'red'} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Attendance breakdown */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Attendance Distribution</h4>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-emerald-400">≥75% (Satisfactory)</span>
                            <span className="text-slate-400">{analytics.studentsAbove75Attendance} students</span>
                          </div>
                          <ProgressBar value={analytics.studentsAbove75Attendance} max={analytics.totalStudents} />
                        </div>
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-amber-400">&lt;75% (At Risk)</span>
                            <span className="text-slate-400">{analytics.studentsBelow75Attendance} students</span>
                          </div>
                          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${analytics.totalStudents > 0 ? (analytics.studentsBelow75Attendance / analytics.totalStudents) * 100 : 0}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Internal marks */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Internal Marks Averages</h4>
                      <div className="space-y-4">
                        {analytics.ia1Average !== null && (
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-slate-300">IA-1 Average</span>
                              <span className="text-violet-400 font-semibold">{fmtNum(analytics.ia1Average, 1)} / {analytics.ia1MaxMarks}</span>
                            </div>
                            <ProgressBar value={analytics.ia1Average} max={analytics.ia1MaxMarks} />
                          </div>
                        )}
                        {analytics.ia2Average !== null && (
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-slate-300">IA-2 Average</span>
                              <span className="text-violet-400 font-semibold">{fmtNum(analytics.ia2Average, 1)} / {analytics.ia2MaxMarks}</span>
                            </div>
                            <ProgressBar value={analytics.ia2Average} max={analytics.ia2MaxMarks} />
                          </div>
                        )}
                        {analytics.ia1Average === null && analytics.ia2Average === null && (
                          <p className="text-xs text-slate-600">No internal marks uploaded yet.</p>
                        )}
                      </div>
                    </div>

                    {/* Semester results */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Semester Exam Results</h4>
                      {analytics.passPercentage !== null ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <p className="text-3xl font-bold text-emerald-400">{fmtNum(analytics.passPercentage, 1)}%</p>
                              <p className="text-xs text-slate-500">Pass Rate</p>
                            </div>
                            <div className="flex-1 space-y-2">
                              <div>
                                <div className="flex justify-between text-xs mb-0.5">
                                  <span className="text-emerald-400">Passed: {analytics.totalPassed}</span>
                                  <span className="text-red-400">Failed: {analytics.totalFailed}</span>
                                </div>
                                <ProgressBar value={analytics.totalPassed} max={analytics.totalPassed + analytics.totalFailed} />
                              </div>
                            </div>
                          </div>
                          <p className="text-xs text-slate-500">Class Average: <span className="text-slate-300 font-semibold">{fmtNum(analytics.semesterAverage, 1)} / {analytics.semesterMaxMarks}</span></p>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-600">No semester marks uploaded yet.</p>
                      )}
                    </div>

                    {/* Grade distribution */}
                    {analytics.gradeDistribution && analytics.gradeDistribution.length > 0 && (
                      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Grade Distribution</h4>
                        <div className="grid grid-cols-4 gap-2">
                          {analytics.gradeDistribution.map((g) => {
                            const gradeColor = { O: 'text-emerald-300', 'A+': 'text-emerald-400', A: 'text-teal-300', 'B+': 'text-blue-300', B: 'text-blue-400', C: 'text-yellow-300', P: 'text-yellow-400', F: 'text-red-400' }
                            return (
                              <div key={g.grade} className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-3 text-center">
                                <p className={`text-xl font-bold ${gradeColor[g.grade] || 'text-slate-400'}`}>{g.grade}</p>
                                <p className="text-sm text-slate-300 font-semibold mt-1">{g.count}</p>
                                <p className="text-xs text-slate-600">students</p>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ===== QUESTION PAPERS TAB ===== */}
          {activeTab === 'questionPapers' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-1">📄 Question Papers</h2>
                <p className="text-sm text-slate-500">Upload previous-year question papers for admin approval. Once approved, students can find them in the repository.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Upload form */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-slate-300">Upload New Question Paper</h3>

                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Select Course / Section *</label>
                    <select
                      value={qpSelectedSectionId}
                      onChange={(e) => {
                        setQpSelectedSectionId(e.target.value)
                        const sec = sections.find((s) => s.sectionId === parseInt(e.target.value))
                        if (sec) setQpSemNum(sec.semesterNumber)
                      }}
                      className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-violet-500"
                    >
                      <option value="">— Choose a course —</option>
                      {sections.map((s) => (
                        <option key={s.sectionId} value={s.sectionId}>
                          {s.courseName} ({s.courseCode}) · Sem {s.semesterNumber}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Exam Type</label>
                      <select
                        value={qpExamType}
                        onChange={(e) => setQpExamType(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-violet-500"
                      >
                        <option value="MID_TERM">Mid Term</option>
                        <option value="END_TERM">End Term</option>
                        <option value="SUPPLEMENTARY">Supplementary</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Year</label>
                      <input
                        type="number"
                        value={qpYear}
                        onChange={(e) => setQpYear(e.target.value)}
                        min="2000"
                        max="2100"
                        className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-violet-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">File Name (optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. CS101_EndTerm_2024.pdf"
                      value={qpFileName}
                      onChange={(e) => setQpFileName(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-violet-500"
                    />
                  </div>

                  <button
                    onClick={handleUploadQP}
                    disabled={loading || !qpSelectedSectionId}
                    className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 px-5 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 shadow-lg shadow-violet-500/20"
                  >
                    {loading ? 'Uploading...' : 'Upload Question Paper (Pending Approval)'}
                  </button>
                  <p className="text-xs text-slate-600">Uploaded papers go into a pending queue. An admin must approve before students can access them.</p>
                </div>

                {/* My uploads */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-400 mb-3">My Uploaded Papers ({myQuestionPapers.length})</h3>
                  {myQuestionPapers.length === 0 ? (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center text-slate-600 text-sm">
                      No question papers uploaded yet.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {myQuestionPapers.map((qp) => (
                        <div key={qp.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex-1">
                              <h4 className="font-medium text-slate-200">{qp.courseName}</h4>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {qp.courseCode} · {qp.examType?.replace('_', ' ')} · {qp.year} · Sem {qp.semesterNumber}
                              </p>
                              {qp.fileName && <p className="text-xs text-slate-600 font-mono mt-0.5">{qp.fileName}</p>}
                            </div>
                            <span className={`shrink-0 text-xs px-2 py-1 rounded-md border ${
                              qp.status === 'APPROVED' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                              qp.status === 'REJECTED' ? 'text-red-400 bg-red-500/10 border-red-500/20' :
                              'text-amber-400 bg-amber-500/10 border-amber-500/20'
                            }`}>
                              {qp.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ===== NOTICES TAB ===== */}
          {activeTab === 'notices' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-1">📢 Draft & Send Notices</h2>
                <p className="text-sm text-slate-500">Broadcast announcements to students. You can target a specific department or send to all students.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Draft form */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-slate-300">Compose Notice</h3>

                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Title *</label>
                    <input
                      type="text"
                      placeholder="Notice title"
                      value={noticeTitle}
                      onChange={(e) => setNoticeTitle(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-violet-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Message *</label>
                    <textarea
                      placeholder="Write the notice content here..."
                      value={noticeMessage}
                      onChange={(e) => setNoticeMessage(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-violet-500 h-32 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Type</label>
                      <select
                        value={noticeType}
                        onChange={(e) => setNoticeType(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-violet-500"
                      >
                        <option value="GENERAL">General</option>
                        <option value="ACADEMIC">Academic</option>
                        <option value="PLACEMENT">Placement</option>
                        <option value="FEE">Fee</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Department (optional)</label>
                      <select
                        value={noticeDeptId}
                        onChange={(e) => setNoticeDeptId(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-violet-500"
                      >
                        <option value="">All Students</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={handleDraftNotice}
                    disabled={loading || !noticeTitle || !noticeMessage}
                    className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 px-5 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 shadow-lg shadow-violet-500/20"
                  >
                    {loading ? 'Sending...' : '📢 Send Notice'}
                  </button>
                  <p className="text-xs text-slate-500 flex items-center gap-2">
                    ✨ Use the <button onClick={() => setActiveTab('ai-notice-gen')} className="text-violet-400 hover:underline font-medium">🤖 AI Notice Generator</button> to draft notices with AI!
                  </p>
                </div>

                {/* Sent notices history */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-400 mb-3">Sent This Session ({sentNotices.length})</h3>
                  {sentNotices.length === 0 ? (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center text-slate-600 text-sm">
                      No notices sent in this session yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sentNotices.map((n, i) => (
                        <div key={i} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <h4 className="font-medium text-slate-200">{n.title}</h4>
                              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{n.message}</p>
                            </div>
                            <div className="shrink-0 text-right">
                              <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded-md border border-slate-700">{n.type}</span>
                              <p className="text-xs text-emerald-400 mt-1">✓ {n.recipientCount} sent</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ===== AI NOTICE GENERATOR (Phase 9 Feature 9) ===== */}
          {activeTab === 'ai-notice-gen' && !selectedSection && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-white">🤖 AI Notice Generator</h2>
                <span className="text-xs bg-violet-500/15 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded-full">Phase 9</span>
              </div>
              <p className="text-slate-400 text-sm">Describe your notice in plain language, and the AI will generate a professionally formatted notice for you. Review and send it via the Notices tab.</p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Input Panel */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-4">
                  <h3 className="font-semibold text-slate-200">✍️ Your Prompt</h3>

                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Describe the notice in plain language</label>
                    <textarea
                      value={aiPrompt}
                      onChange={e => setAiPrompt(e.target.value)}
                      placeholder="e.g. Remind students that the internal exam IA-2 is scheduled for next Monday at 10 AM in Room 204. Attendance is mandatory."
                      rows={4}
                      className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-violet-500 placeholder-slate-600 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Audience</label>
                      <select
                        value={aiAudience}
                        onChange={e => setAiAudience(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-violet-500"
                      >
                        <option value="students">Students</option>
                        <option value="faculty">Faculty</option>
                        <option value="all">All</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Notice Type</label>
                      <select
                        value={aiNoticeType}
                        onChange={e => setAiNoticeType(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-violet-500"
                      >
                        <option value="GENERAL">General</option>
                        <option value="ACADEMIC">Academic</option>
                        <option value="PLACEMENT">Placement</option>
                        <option value="FEE">Fee</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={handleAiGenerateNotice}
                    disabled={aiLoading || !aiPrompt.trim()}
                    className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 px-5 py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-50 shadow-lg shadow-violet-500/20"
                  >
                    {aiLoading ? '🤖 Generating...' : '✨ Generate with AI'}
                  </button>

                  {/* Example prompts */}
                  <div>
                    <p className="text-xs text-slate-500 mb-2">Example prompts:</p>
                    <div className="space-y-1.5">
                      {[
                        'IA-2 exam scheduled next Monday 10 AM Room 204, attendance mandatory',
                        'Assignment submission deadline extended to next Friday for all students',
                        'Guest lecture on AI/ML this Thursday by industry expert from Google'
                      ].map(p => (
                        <button key={p} onClick={() => setAiPrompt(p)}
                          className="w-full text-left text-xs bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 text-slate-500 hover:text-slate-300 px-3 py-2 rounded-lg transition-colors">
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Output Panel */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-4">
                  <h3 className="font-semibold text-slate-200">📋 AI Generated Notice</h3>

                  {aiLoading && (
                    <div className="flex items-center justify-center h-48">
                      <div className="text-center">
                        <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-sm text-slate-400">AI is drafting your notice...</p>
                      </div>
                    </div>
                  )}

                  {!aiResult && !aiLoading && (
                    <div className="flex items-center justify-center h-48 border-2 border-dashed border-slate-700 rounded-xl">
                      <p className="text-slate-600 text-sm">Generated notice will appear here</p>
                    </div>
                  )}

                  {aiResult && !aiLoading && (
                    <div className="space-y-4">
                      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                        <p className="text-xs text-slate-500 mb-1">Title</p>
                        <p className="text-slate-200 font-semibold">{aiResult.title}</p>
                      </div>
                      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                        <p className="text-xs text-slate-500 mb-1">Notice Body</p>
                        <p className="text-slate-300 text-sm whitespace-pre-wrap">{aiResult.body}</p>
                      </div>
                      {aiResult.summary && (
                        <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg p-3">
                          <p className="text-xs text-violet-400 font-semibold mb-1">Summary</p>
                          <p className="text-sm text-violet-300">{aiResult.summary}</p>
                        </div>
                      )}
                      <button
                        onClick={useAiNotice}
                        className="w-full bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                      >
                        ✓ Use This Notice → Send to Students
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}

export default FacultyDashboard
