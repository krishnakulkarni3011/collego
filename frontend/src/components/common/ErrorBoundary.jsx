import { Component } from 'react'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
          <div className="max-w-lg w-full rounded-3xl bg-white border border-white/70 shadow-xl p-8 text-center">
            <h2 className="text-lg font-bold text-slate-900">Something went wrong</h2>
            <p className="text-sm text-slate-500 mt-2">This page could not be displayed. Please reload or go back to the login page.</p>
            <pre className="mt-4 p-3 rounded-xl bg-slate-50 text-left text-[11px] text-red-500 overflow-auto max-h-40">
              {String(this.state.error?.message || this.state.error)}
            </pre>
            <div className="mt-5 flex justify-center gap-3">
              <button onClick={() => window.location.reload()} className="px-5 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">
                Reload page
              </button>
              <button onClick={() => window.location.href = '/login'} className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
                Back to login
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
