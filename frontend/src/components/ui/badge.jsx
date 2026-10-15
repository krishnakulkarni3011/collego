import * as React from "react"
import { cn } from "../../lib/utils"
import { cva } from "class-variance-authority"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-slate-700 bg-slate-800 text-slate-300",
        destructive: "border-transparent bg-red-500/20 text-red-300 border-red-500/30",
        outline: "text-slate-300 border-slate-700",
        success: "border-transparent bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
        warning: "border-transparent bg-amber-500/20 text-amber-300 border-amber-500/30",
        info: "border-transparent bg-blue-500/20 text-blue-300 border-blue-500/30",
        purple: "border-transparent bg-purple-500/20 text-purple-300 border-purple-500/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
