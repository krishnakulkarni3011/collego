import { useEffect, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { Button } from '../ui/button'

let activeHandler = null

/**
 * Website-owned confirmation prompt. Call anywhere:
 *   const ok = await confirmAction({ title, message, confirmLabel })
 * No browser window.confirm is used.
 */
export function confirmAction({ title = 'Are you sure?', message = '', confirmLabel = 'Confirm', tone = 'danger' }) {
  return new Promise(resolve => {
    if (!activeHandler) {
      resolve(true)
      return
    }
    activeHandler({ title, message, confirmLabel, tone, resolve })
  })
}

export function ConfirmHost() {
  const [dialog, setDialog] = useState(null)

  useEffect(() => {
    activeHandler = (options) => setDialog(options)
    return () => { activeHandler = null }
  }, [])

  if (!dialog) return null

  const close = (result) => {
    dialog.resolve(result)
    setDialog(null)
  }

  const danger = dialog.tone === 'danger'

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => close(false)} />
      <div className="relative w-full max-w-md rounded-3xl bg-white border border-white/70 shadow-2xl p-6">
        <button onClick={() => close(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <X size={18} />
        </button>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${danger ? 'bg-red-50 text-red-500' : 'bg-indigo-50 text-indigo-500'}`}>
          <AlertTriangle size={22} />
        </div>
        <h3 className="text-lg font-bold text-slate-900">{dialog.title}</h3>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">{dialog.message}</p>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" size="sm" onClick={() => close(false)}>Cancel</Button>
          <Button variant={danger ? 'destructive' : 'gradient'} size="sm" onClick={() => close(true)}>
            {dialog.confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
