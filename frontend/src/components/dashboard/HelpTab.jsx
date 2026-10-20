import { HelpCircle, Mail, Phone, MapPin, KeyRound, BookOpen, ShieldCheck, LifeBuoy } from 'lucide-react'
import { PageTitle } from './PortalUI'
import { Badge } from '../ui/badge'

const FAQS = [
  {
    q: 'How do I reset my password?',
    a: 'On the sign-in screen choose "Forgot password", enter your registered email, and use the reset link or token sent to you. You can also change your password any time from Settings.',
  },
  {
    q: 'I selected the wrong role while signing in',
    a: 'The portal checks that the account matches the role you picked. Sign out and choose the role your account was registered under (Student, Faculty, or Admin).',
  },
  {
    q: 'My attendance or marks look wrong',
    a: 'Attendance and internal marks are entered by faculty. Contact the faculty member who teaches the subject; corrections are made in the faculty portal.',
  },
  {
    q: 'How do I download study material or submit an assignment?',
    a: 'Students can find both under Academics in the sidebar. Assignments show their due date and submission status; materials are grouped by course.',
  },
  {
    q: 'Who do I contact for document issues?',
    a: 'Marksheets, transcripts and other academic documents are issued by the college examination office. Raise the issue with the office along with your USN and the relevant semester.',
  },
]

export function HelpTab({ accent = 'blue' }) {
  return (
    <div className="space-y-6">
      <PageTitle
        icon={HelpCircle}
        title="Help & Support"
        subtitle="Answers to common questions and how to reach the college."
        accent={accent}
        actions={<Badge variant="success">Support</Badge>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card p-6 border border-white/60">
            <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <BookOpen size={15} className="text-blue-500" /> Frequently asked questions
            </h3>
            <div className="divide-y divide-white/50">
              {FAQS.map((item, i) => (
                <details key={i} className="group py-3" open={i === 0}>
                  <summary className="cursor-pointer list-none flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-slate-700">{item.q}</span>
                    <span className="text-slate-400 group-open:rotate-45 transition-transform text-lg leading-none">+</span>
                  </summary>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-card p-6 border border-white/60">
            <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <LifeBuoy size={15} className="text-emerald-500" /> Contact
            </h3>
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="flex items-start gap-2"><Mail size={15} className="text-slate-400 mt-0.5" /> support@collego.edu</li>
              <li className="flex items-start gap-2"><Phone size={15} className="text-slate-400 mt-0.5" /> +91 00000 00000</li>
              <li className="flex items-start gap-2"><MapPin size={15} className="text-slate-400 mt-0.5" /> CSE Department, College Campus</li>
            </ul>
            <p className="text-[10px] text-slate-400 mt-4">Office hours: Monday to Saturday, 9:00 AM – 5:00 PM.</p>
          </div>

          <div className="glass-card p-6 border border-white/60">
            <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <ShieldCheck size={15} className="text-violet-500" /> Account safety
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Never share your password. Use the Settings page to change it regularly. If you suspect
              unauthorised access, change your password immediately and inform the department office.
            </p>
            <p className="text-xs text-slate-500 mt-3 flex items-center gap-1.5">
              <KeyRound size={13} className="text-slate-400" /> Passwords must be at least 8 characters.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
