import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wider transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default: "bg-white/10 text-white",
        secondary: "bg-white/5 text-text-secondary",
        destructive: "bg-status-shaky/15 text-status-shaky",
        outline: "border border-white/10 text-text-primary",
        blue: "bg-section-quant/15 text-section-quant",
        orange: "bg-section-lrdi/15 text-section-lrdi",
        green: "bg-section-varc/15 text-section-varc",
        purple: "bg-round-r3/15 text-round-r3",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
