import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/authService'
import api from '../services/api'

function FacultyDashboard() {
  const navigate = useNavigate()
  const email = authService.getEmail()

  const [sections, setSections] = useState([])
  const [selectedSection, setSelectedSection] = useState(null)
  const [activeTab, setActiveTab] = useState('sections')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })

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

  // Question Paper state
  const [qpCourseId, setQpCourseId] = useState('')
  const [qpDeptId, setQpDeptId] = useState('')
  const [qpExamType, setQpExamType] = useState('END_TERM')
  const [qpYear, setQpYear] = useState(new Date().getFullYear())
  const [qpSemNum, setQpSemNum] = useState(1)
  const [qpFileName, setQpFileName] = useState('')
  const [myQuestionPapers, setMyQuestionPapers] = useState([])

  // Analytics state
  const [analytics, setAnalytics] = useState(null)

  useEffect(() => { fetchSections() }, [])

  const fetchSections = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/faculty/sections')
      setSections(res.data)
    } catch (err) {
      showMessage('Failed to load sections', 'error')
    } finally {
      setLoading(false)
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

  const selectSection = (section) => {
    setSelectedSection(section)
    setActiveTab('attendance')
    loadEnrolledStudents(section.sectionId)
  }

  const loadEnrolledStudents = async (sectionId) => {
    try {
      const res = await api.get(`/api/faculty/attendance/${sectionId}`)
      const students = res.data
      setSectionAttendance(students)
      setAttendanceRecords(students.map(s => ({
        studentId: s.studentId,
        studentName: s.studentName,
        enrollmentNumber: s.enrollmentNumber,
        status: 'PRESENT'
      })))
      setMarksEntries(students.map(s => ({
        studentId: s.studentId,
        studentName: s.studentName,
        enrollmentNumber: s.enrollmentNumber,
        obtainedMarks: ''
      })))
      setSemMarksEntries(students.map(s => ({
        studentId: s.studentId,
        studentName: s.studentName,
        enrollmentNumber: s.enrollmentNumber,
        obtainedMarks: ''
      })))
    } catch (err) {
      showMessage('Failed to load student data', 'error')
    }
  }

  // ========== ATTENDANCE ==========
  const handleMarkAttendance = async () => {
    try {
      setLoading(true)
      const res = await api.post('/api/faculty/attendance', {
        sectionId: selectedSection.sectionId,
        date: attendanceDate,
        records: attendanceRecords.map(r => ({ studentId: r.studentId, status: r.status }))
      })
      showMessage(`Attendance marked: ${res.data.markedPresent} present, ${res.data.markedAbsent} absent`)
      loadEnrolledStudents(selectedSection.sectionId)
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to mark attendance', 'error')
    } finally {
      setLoading(false)
    }
  }

  const toggleAttendance = (idx) => {
    setAttendanceRecords(prev => prev.map((r, i) =>
      i === idx ? { ...r, status: r.status === 'PRESENT' ? 'ABSENT' : 'PRESENT' } : r
    ))
  }

  // ========== INTERNAL MARKS ==========
  const handleUploadInternalMarks = async () => {
    try {
      setLoading(true)
      const entries = marksEntries
        .filter(e => e.obtainedMarks !== '' && e.obtainedMarks !== null)
        .map(e => ({ studentId: e.studentId, obtainedMarks: parseFloat(e.obtainedMarks) }))
      if (entries.length === 0) { showMessage('Enter marks for at least one student', 'error'); return }
      const res = await api.post('/api/faculty/marks/internal', {
        sectionId: selectedSection.sectionId,
        examName,
        maxMarks: parseFloat(maxMarks),
        entries
      })
      showMessage(`Internal marks uploaded: ${res.data.created} created, ${res.data.updated} updated`)
      loadSectionMarks()
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to upload marks', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadSectionMarks = async () => {
    try {
      const res = await api.get(`/api/faculty/marks/internal/${selectedSection.sectionId}`)
      setSectionMarks(res.data)
    } catch (err) {
      showMessage('Failed to load marks', 'error')
    }
  }

  // ========== SEMESTER MARKS ==========
  const handleUploadSemesterMarks = async () => {
    try {
      setLoading(true)
      const entries = semMarksEntries
        .filter(e => e.obtainedMarks !== '' && e.obtainedMarks !== null)
        .map(e => ({ studentId: e.studentId, obtainedMarks: parseFloat(e.obtainedMarks) }))
      if (entries.length === 0) { showMessage('Enter marks for at least one student', 'error'); return }
      const res = await api.post('/api/faculty/marks/semester', {
        sectionId: selectedSection.sectionId,
        maxMarks: parseFloat(semMaxMarks),
        entries
      })
      showMessage(`Semester marks uploaded: ${res.data.created} created, ${res.data.updated} updated`)
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to upload semester marks', 'error')
    } finally {
      setLoading(false)
    }
  }

  // ========== ASSIGNMENTS ==========
  const handleCreateAssignment = async () => {
    try {
      setLoading(true)
      await api.post('/api/faculty/assignments', {
        sectionId: selectedSection.sectionId,
        title: assignmentTitle,
        description: assignmentDesc,
        dueDate: assignmentDueDate || null,
        fileName: null
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
      const res = await api.get(`/api/faculty/assignments/${selectedSection.sectionId}`)
      setSectionAssignments(res.data)
    } catch (err) {
      showMessage('Failed to load assignments', 'error')
    }
  }

  // ========== COURSE MATERIALS ==========
  const handleCreateMaterial = async () => {
    try {
      setLoading(true)
      await api.post('/api/faculty/materials', {
        sectionId: selectedSection.sectionId,
        title: materialTitle,
        description: materialDesc,
        materialType,
        fileName: null
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
      const res = await api.get(`/api/faculty/materials/${selectedSection.sectionId}`)
      setSectionMaterials(res.data)
    } catch (err) {
      showMessage('Failed to load materials', 'error')
    }
  }

  // ========== QUESTION PAPERS ==========
  const handleUploadQP = async () => {
    try {
      setLoading(true)
      await api.post('/api/faculty/question-papers', {
        courseId: parseInt(qpCourseId),
        departmentId: parseInt(qpDeptId),
        examType: qpExamType,
        year: parseInt(qpYear),
        semesterNumber: parseInt(qpSemNum),
        fileName: qpFileName || 'question_paper.pdf'
      })
      showMessage('Question paper uploaded (pending admin approval)')
      setQpFileName('')
      loadMyQPs()
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to upload question paper', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadMyQPs = async () => {
    try {
      const res = await api.get('/api/faculty/question-papers')
      setMyQuestionPapers(res.data)
    } catch (err) {
      showMessage('Failed to load question papers', 'error')
    }
  }

  // ========== NOTICES ==========
  const handleDraftNotice = async () => {
    try {
      setLoading(true)
      const res = await api.post('/api/faculty/notices', {
        title: noticeTitle,
        message: noticeMessage,
        type: noticeType,
        departmentId: null
      })
      showMessage(`Notice sent to ${res.data.recipientCount} students`)
      setNoticeTitle(''); setNoticeMessage('')
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to send notice', 'error')
    } finally {
      setLoading(false)
    }
  }

  // ========== ANALYTICS ==========
  const loadAnalytics = async () => {
    try {
      setLoading(true)
      const res = await api.get(`/api/faculty/analytics/${selectedSection.sectionId}`)
      setAnalytics(res.data)
    } catch (err) {
      showMessage('Failed to load analytics', 'error')
    } finally {
      setLoading(false)
    }
  }

  const tabs = selectedSection ? [
    { id: 'attendance', label: '📋 Attendance' },
    { id: 'internalMarks', label: '📝 Internal Marks' },
    { id: 'semesterMarks', label: '🎓 Semester Marks' },
    { id: 'assignments', label: '📚 Assignments' },
    { id: 'materials', label: '📂 Materials' },
    { id: 'analytics', label: '📊 Analytics' },
  ] : []

  const globalTabs = [
    { id: 'questionPapers', label: '📄 Question Papers' },
    { id: 'notices', label: '📢 Notices' },
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Nav */}
      <nav className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-lg flex items-center justify-center font-bold text-sm">C</div>
          <h1 className="text-lg font-semibold tracking-tight">Collego <span className="text-slate-500 font-normal">Faculty</span></h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-400">{email}</span>
          <button onClick={handleLogout} className="text-sm bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg transition-colors border border-slate-700">Logout</button>
        </div>
      </nav>

      {/* Message toast */}
      {message.text && (
        <div className={`fixed top-20 right-6 z-50 px-5 py-3 rounded-lg text-sm font-medium shadow-2xl transition-all ${
          message.type === 'error' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
        }`}>
          {message.text}
        </div>
      )}

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-72 min-h-[calc(100vh-65px)] bg-slate-900/50 border-r border-slate-800 p-4 flex flex-col gap-2">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">My Sections</h2>
          {loading && sections.length === 0 && <p className="text-sm text-slate-500 px-2">Loading...</p>}
          {sections.map(sec => (
            <button
              key={sec.sectionId}
              onClick={() => selectSection(sec)}
              className={`text-left px-3 py-3 rounded-lg text-sm transition-all ${
                selectedSection?.sectionId === sec.sectionId
                  ? 'bg-violet-500/15 text-violet-300 border border-violet-500/30'
                  : 'hover:bg-slate-800 text-slate-300 border border-transparent'
              }`}
            >
              <div className="font-medium">{sec.courseName}</div>
              <div className="text-xs text-slate-500 mt-0.5">{sec.courseCode} · Sec {sec.sectionName} · {sec.enrolledStudents} students</div>
            </button>
          ))}

          <div className="mt-6">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">Global Actions</h2>
            {globalTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); if (tab.id === 'questionPapers') loadMyQPs() }}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all ${
                  activeTab === tab.id
                    ? 'bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/30'
                    : 'hover:bg-slate-800 text-slate-300 border border-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {!selectedSection && activeTab !== 'questionPapers' && activeTab !== 'notices' && (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="text-6xl mb-4">📚</div>
                <h2 className="text-xl font-semibold text-slate-300 mb-2">Select a Section</h2>
                <p className="text-slate-500 text-sm">Choose a section from the sidebar to manage attendance, marks, and more.</p>
              </div>
            </div>
          )}

          {/* Section Tabs */}
          {selectedSection && activeTab !== 'questionPapers' && activeTab !== 'notices' && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-1">{selectedSection.courseName} <span className="text-slate-500 text-sm font-normal">({selectedSection.courseCode})</span></h2>
              <p className="text-xs text-slate-500 mb-4">Section {selectedSection.sectionName} · Sem {selectedSection.semesterNumber} · {selectedSection.enrolledStudents} students</p>
              <div className="flex gap-1 bg-slate-900/50 rounded-lg p-1 border border-slate-800">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id)
                      if (tab.id === 'assignments') loadAssignments()
                      if (tab.id === 'materials') loadMaterials()
                      if (tab.id === 'analytics') loadAnalytics()
                      if (tab.id === 'internalMarks') loadSectionMarks()
                    }}
                    className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all ${
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
            <div className="space-y-4">
              <div className="flex items-center gap-4 mb-4">
                <input type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-violet-500" />
                <button onClick={() => setAttendanceRecords(prev => prev.map(r => ({ ...r, status: 'PRESENT' })))}
                  className="text-xs bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-3 py-2 rounded-lg hover:bg-emerald-500/25 transition-colors">All Present</button>
                <button onClick={() => setAttendanceRecords(prev => prev.map(r => ({ ...r, status: 'ABSENT' })))}
                  className="text-xs bg-red-500/15 text-red-300 border border-red-500/30 px-3 py-2 rounded-lg hover:bg-red-500/25 transition-colors">All Absent</button>
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
                        <td className="px-4 py-3">{r.studentName}</td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => toggleAttendance(i)}
                            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                              r.status === 'PRESENT' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
                            }`}>
                            {r.status}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button onClick={handleMarkAttendance} disabled={loading}
                className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 px-6 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 shadow-lg shadow-violet-500/20">
                {loading ? 'Saving...' : 'Submit Attendance'}
              </button>

              {/* Existing attendance summary */}
              {sectionAttendance.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-slate-400 mb-3">Attendance Summary</h3>
                  <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-900">
                        <tr className="text-slate-400 text-xs uppercase">
                          <th className="px-4 py-3 text-left">Student</th>
                          <th className="px-4 py-3 text-center">Total</th>
                          <th className="px-4 py-3 text-center">Present</th>
                          <th className="px-4 py-3 text-center">Absent</th>
                          <th className="px-4 py-3 text-center">%</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {sectionAttendance.map(s => (
                          <tr key={s.studentId} className="hover:bg-slate-800/50">
                            <td className="px-4 py-3">{s.studentName}</td>
                            <td className="px-4 py-3 text-center text-slate-400">{s.totalClasses}</td>
                            <td className="px-4 py-3 text-center text-emerald-400">{s.present}</td>
                            <td className="px-4 py-3 text-center text-red-400">{s.absent}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`font-semibold ${s.percentage >= 75 ? 'text-emerald-400' : 'text-amber-400'}`}>{s.percentage}%</span>
                            </td>
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
            <div className="space-y-4">
              <div className="flex items-center gap-4 mb-4">
                <select value={examName} onChange={e => setExamName(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-violet-500">
                  <option value="IA-1">IA-1</option>
                  <option value="IA-2">IA-2</option>
                  <option value="IA-3">IA-3</option>
                </select>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-400">Max:</label>
                  <input type="number" value={maxMarks} onChange={e => setMaxMarks(e.target.value)}
                    className="w-20 bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-violet-500" />
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
                        <td className="px-4 py-3">{e.studentName}</td>
                        <td className="px-4 py-3 text-center">
                          <input type="number" min="0" max={maxMarks} value={e.obtainedMarks}
                            onChange={ev => setMarksEntries(prev => prev.map((m, j) => j === i ? { ...m, obtainedMarks: ev.target.value } : m))}
                            className="w-24 bg-slate-800 border border-slate-600 text-white px-3 py-1.5 rounded-lg text-sm text-center focus:outline-none focus:border-violet-500" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button onClick={handleUploadInternalMarks} disabled={loading}
                className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 px-6 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 shadow-lg shadow-violet-500/20">
                {loading ? 'Uploading...' : `Upload ${examName} Marks`}
              </button>

              {sectionMarks.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-slate-400 mb-3">Existing Marks</h3>
                  <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-sm">
                    <pre className="text-slate-300 whitespace-pre-wrap">{JSON.stringify(sectionMarks, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== SEMESTER MARKS TAB ===== */}
          {activeTab === 'semesterMarks' && selectedSection && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-400">Max Marks:</label>
                  <input type="number" value={semMaxMarks} onChange={e => setSemMaxMarks(e.target.value)}
                    className="w-24 bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-violet-500" />
                </div>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-900">
                    <tr className="text-slate-400 text-xs uppercase">
                      <th className="px-4 py-3 text-left">#</th>
                      <th className="px-4 py-3 text-left">Enrollment</th>
                      <th className="px-4 py-3 text-left">Student Name</th>
                      <th className="px-4 py-3 text-center">Marks (/{semMaxMarks})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {semMarksEntries.map((e, i) => (
                      <tr key={e.studentId} className="hover:bg-slate-800/50">
                        <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-400">{e.enrollmentNumber}</td>
                        <td className="px-4 py-3">{e.studentName}</td>
                        <td className="px-4 py-3 text-center">
                          <input type="number" min="0" max={semMaxMarks} value={e.obtainedMarks}
                            onChange={ev => setSemMarksEntries(prev => prev.map((m, j) => j === i ? { ...m, obtainedMarks: ev.target.value } : m))}
                            className="w-24 bg-slate-800 border border-slate-600 text-white px-3 py-1.5 rounded-lg text-sm text-center focus:outline-none focus:border-violet-500" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-slate-500">Grades and grade points will be auto-calculated based on marks percentage.</p>

              <button onClick={handleUploadSemesterMarks} disabled={loading}
                className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 px-6 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 shadow-lg shadow-violet-500/20">
                {loading ? 'Uploading...' : 'Upload Semester Marks'}
              </button>
            </div>
          )}

          {/* ===== ASSIGNMENTS TAB ===== */}
          {activeTab === 'assignments' && selectedSection && (
            <div className="space-y-6">
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-semibold text-slate-300 mb-2">New Assignment</h3>
                <input type="text" placeholder="Assignment title" value={assignmentTitle} onChange={e => setAssignmentTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-violet-500" />
                <textarea placeholder="Description (optional)" value={assignmentDesc} onChange={e => setAssignmentDesc(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-violet-500 h-24 resize-none" />
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-400">Due Date:</label>
                    <input type="date" value={assignmentDueDate} onChange={e => setAssignmentDueDate(e.target.value)}
                      className="bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-violet-500" />
                  </div>
                  <button onClick={handleCreateAssignment} disabled={loading || !assignmentTitle}
                    className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 px-5 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50">
                    Create
                  </button>
                </div>
              </div>

              {sectionAssignments.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-400 mb-3">Existing Assignments</h3>
                  <div className="space-y-2">
                    {sectionAssignments.map(a => (
                      <div key={a.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-slate-200">{a.title}</h4>
                            {a.description && <p className="text-xs text-slate-500 mt-1">{a.description}</p>}
                          </div>
                          {a.dueDate && <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20">Due: {a.dueDate}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== MATERIALS TAB ===== */}
          {activeTab === 'materials' && selectedSection && (
            <div className="space-y-6">
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-semibold text-slate-300 mb-2">Add Course Material</h3>
                <input type="text" placeholder="Title" value={materialTitle} onChange={e => setMaterialTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-violet-500" />
                <textarea placeholder="Description (optional)" value={materialDesc} onChange={e => setMaterialDesc(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-violet-500 h-20 resize-none" />
                <div className="flex items-center gap-4">
                  <select value={materialType} onChange={e => setMaterialType(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-violet-500">
                    <option value="SYLLABUS">Syllabus</option>
                    <option value="NOTES">Notes</option>
                    <option value="REFERENCE">Reference</option>
                    <option value="OTHER">Other</option>
                  </select>
                  <button onClick={handleCreateMaterial} disabled={loading || !materialTitle}
                    className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 px-5 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50">
                    Add Material
                  </button>
                </div>
              </div>

              {sectionMaterials.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-400 mb-3">Existing Materials</h3>
                  <div className="space-y-2">
                    {sectionMaterials.map(m => (
                      <div key={m.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex justify-between items-center">
                        <div>
                          <h4 className="font-medium text-slate-200">{m.title}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">{m.materialType} {m.description && `· ${m.description}`}</p>
                        </div>
                        <span className="text-xs text-slate-500">{new Date(m.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== ANALYTICS TAB ===== */}
          {activeTab === 'analytics' && selectedSection && analytics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Overview Card */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 col-span-full">
                <h3 className="text-sm font-semibold text-slate-300 mb-1">{analytics.courseName} ({analytics.courseCode})</h3>
                <p className="text-xs text-slate-500">{analytics.totalStudents} enrolled students</p>
              </div>

              {/* Attendance */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Attendance</h4>
                <div className="text-3xl font-bold text-violet-400 mb-2">{analytics.averageAttendancePercentage}%</div>
                <div className="flex gap-4 text-xs">
                  <span className="text-emerald-400">≥75%: {analytics.studentsAbove75Attendance}</span>
                  <span className="text-amber-400">&lt;75%: {analytics.studentsBelow75Attendance}</span>
                </div>
              </div>

              {/* Internal Marks */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Internal Marks</h4>
                {analytics.ia1Average !== null && <div className="text-sm text-slate-300 mb-1">IA-1 Avg: <span className="text-violet-400 font-semibold">{analytics.ia1Average}</span>/{analytics.ia1MaxMarks}</div>}
                {analytics.ia2Average !== null && <div className="text-sm text-slate-300">IA-2 Avg: <span className="text-violet-400 font-semibold">{analytics.ia2Average}</span>/{analytics.ia2MaxMarks}</div>}
                {analytics.ia1Average === null && analytics.ia2Average === null && <p className="text-xs text-slate-600">No data yet</p>}
              </div>

              {/* Semester Results */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Semester Results</h4>
                {analytics.passPercentage !== null ? (
                  <>
                    <div className="text-3xl font-bold text-emerald-400 mb-2">{analytics.passPercentage}%</div>
                    <div className="text-xs text-slate-400">Pass Rate · Avg: {analytics.semesterAverage}/{analytics.semesterMaxMarks}</div>
                    <div className="flex gap-4 text-xs mt-1">
                      <span className="text-emerald-400">Passed: {analytics.totalPassed}</span>
                      <span className="text-red-400">Failed: {analytics.totalFailed}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-600">No data yet</p>
                )}
              </div>

              {/* Grade Distribution */}
              {analytics.gradeDistribution && analytics.gradeDistribution.length > 0 && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 col-span-full">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Grade Distribution</h4>
                  <div className="flex gap-3 flex-wrap">
                    {analytics.gradeDistribution.map(g => (
                      <div key={g.grade} className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-center min-w-[60px]">
                        <div className="text-lg font-bold text-violet-400">{g.count}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{g.grade}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {activeTab === 'analytics' && selectedSection && !analytics && (
            <div className="flex items-center justify-center h-48 text-slate-500 text-sm">Loading analytics...</div>
          )}

          {/* ===== QUESTION PAPERS TAB ===== */}
          {activeTab === 'questionPapers' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">📄 Upload Question Paper</h2>
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-3 max-w-xl">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Course ID</label>
                    <input type="number" value={qpCourseId} onChange={e => setQpCourseId(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-violet-500" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Department ID</label>
                    <input type="number" value={qpDeptId} onChange={e => setQpDeptId(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-violet-500" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Exam Type</label>
                    <select value={qpExamType} onChange={e => setQpExamType(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-violet-500">
                      <option value="MID_TERM">Mid Term</option>
                      <option value="END_TERM">End Term</option>
                      <option value="SUPPLEMENTARY">Supplementary</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Year</label>
                    <input type="number" value={qpYear} onChange={e => setQpYear(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-violet-500" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Semester #</label>
                    <input type="number" value={qpSemNum} onChange={e => setQpSemNum(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-violet-500" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">File Name</label>
                    <input type="text" placeholder="paper.pdf" value={qpFileName} onChange={e => setQpFileName(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-violet-500" />
                  </div>
                </div>
                <button onClick={handleUploadQP} disabled={loading || !qpCourseId || !qpDeptId}
                  className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 px-5 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50">
                  Upload
                </button>
              </div>

              {myQuestionPapers.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-400 mb-3">My Uploads</h3>
                  <div className="space-y-2">
                    {myQuestionPapers.map(qp => (
                      <div key={qp.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex justify-between items-center">
                        <div>
                          <h4 className="font-medium text-slate-200">{qp.courseName} ({qp.courseCode})</h4>
                          <p className="text-xs text-slate-500 mt-0.5">{qp.examType} · {qp.year} · Sem {qp.semesterNumber}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-md border ${
                          qp.status === 'APPROVED' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                          qp.status === 'REJECTED' ? 'text-red-400 bg-red-500/10 border-red-500/20' :
                          'text-amber-400 bg-amber-500/10 border-amber-500/20'
                        }`}>{qp.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== NOTICES TAB ===== */}
          {activeTab === 'notices' && (
            <div className="space-y-6 max-w-xl">
              <h2 className="text-lg font-semibold">📢 Draft Notice</h2>
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-3">
                <input type="text" placeholder="Notice title" value={noticeTitle} onChange={e => setNoticeTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-violet-500" />
                <textarea placeholder="Notice content..." value={noticeMessage} onChange={e => setNoticeMessage(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-violet-500 h-32 resize-none" />
                <div className="flex items-center gap-4">
                  <select value={noticeType} onChange={e => setNoticeType(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-violet-500">
                    <option value="GENERAL">General</option>
                    <option value="ACADEMIC">Academic</option>
                    <option value="PLACEMENT">Placement</option>
                    <option value="FEE">Fee</option>
                  </select>
                  <button onClick={handleDraftNotice} disabled={loading || !noticeTitle || !noticeMessage}
                    className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 px-5 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50">
                    Send Notice
                  </button>
                </div>
                <p className="text-xs text-slate-500">Sends to all students. AI-generated notices coming in Phase 9.</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default FacultyDashboard
