import {
  HelpCircle, Mail, Phone, MapPin, KeyRound, BookOpen, ShieldCheck, LifeBuoy,
} from 'lucide-react'
import { PageTitle } from './PortalUI'
import { Badge } from '../ui/badge'

const FAQS = [
  {
    q: 'How can I check my examination results?',
    a: 'Navigate to the Documents tab and download the transcript.',
  },
  {
    q: 'How can I apply for revaluation or challenge valuation?',
    a: 'Contact the examination section and follow the official application procedure within the prescribed deadline.',
  },
  {
    q: 'How can I check my internal assessment marks?',
    a: 'Navigate to Academics → Internal Assessment to view your subject-wise marks.',
  },
  {
    q: 'What should I do if there is an error in my attendance?',
    a: 'Contact the concerned subject faculty and report the discrepancy for correction.',
  },
  {
    q: 'What documents are required for college admission?',
    a: 'Typically, SSLC and PUC marks cards, transfer certificate, study certificates and other applicable documents are required.',
  },
]

function FacebookIcon({ size = 16, className = '' }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className} aria-hidden="true">
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
    </svg>
  )
}

function InstagramIcon({ size = 16, className = '' }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
    </svg>
  )
}

function LinkedinIcon({ size = 16, className = '' }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
    </svg>
  )
}

function XIcon({ size = 16, className = '' }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

const SOCIAL_LINKS = [
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/BEC1963',
    icon: FacebookIcon,
    className: 'hover:bg-[#1877F2] hover:border-[#1877F2]',
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/becbgk_official/',
    icon: InstagramIcon,
    className: 'hover:bg-gradient-to-br hover:from-[#833AB4] hover:via-[#FD1D1D] hover:to-[#FCB045] hover:border-transparent',
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/basaveshwar-engineering-college-bagalkote-karnataka-india-957a34206/',
    icon: LinkedinIcon,
    className: 'hover:bg-[#0A66C2] hover:border-[#0A66C2]',
  },
  {
    label: 'X',
    href: 'https://x.com/1963Bec',
    icon: XIcon,
    className: 'hover:bg-slate-900 hover:border-slate-900',
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
              <li className="flex items-start gap-2">
                <Mail size={15} className="text-slate-400 mt-0.5 shrink-0" />
                <a href="mailto:becprincipal@yahoo.com" className="hover:text-blue-600 break-all">
                  becprincipal@yahoo.com
                </a>
              </li>
              <li className="flex items-start gap-2">
                <Phone size={15} className="text-slate-400 mt-0.5 shrink-0" />
                <a href="tel:+917618781963" className="hover:text-blue-600">
                  +91 76187 81963
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin size={15} className="text-slate-400 mt-0.5 shrink-0" />
                <span>S. Nijalingappa Vidyanagar, Bagalkote - 587102, Karnataka, India</span>
              </li>
            </ul>

            <div className="mt-5 pt-4 border-t border-white/60">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Follow us
              </p>
              <div className="flex items-center gap-2">
                {SOCIAL_LINKS.map(({ label, href, icon: Icon, className }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    title={label}
                    className={`w-9 h-9 rounded-xl border border-white/70 bg-white/70 text-slate-500 flex items-center justify-center transition-all hover:text-white hover:shadow-md ${className}`}
                  >
                    <Icon size={16} />
                  </a>
                ))}
              </div>
            </div>
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
