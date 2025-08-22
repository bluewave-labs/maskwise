import * as React from "react"
import { cn } from "@/lib/utils"

export interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "blue" | "red" | "green" | "orange" | "purple" | "default"
}

const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
  ({ className, variant, ...props }, ref) => {
    const variants = {
      blue: "border-l-4 border-l-blue-500 bg-blue-50/50 hover:bg-blue-50/70",
      red: "border-l-4 border-l-red-500 bg-red-50/50 hover:bg-red-50/70",
      green: "border-l-4 border-l-green-500 bg-green-50/50 hover:bg-green-50/70",
      orange: "border-l-4 border-l-orange-500 bg-orange-50/50 hover:bg-orange-50/70",
      purple: "border-l-4 border-l-purple-500 bg-purple-50/50 hover:bg-purple-50/70",
      default: "border-l-4 border-l-gray-500 bg-gray-50/50 hover:bg-gray-50/70"
    }

    return (
      <div
        ref={ref}
        className={cn(
          "rounded border bg-card text-card-foreground shadow-sm transition-colors",
          variant && variants[variant],
          "metric-card-enhanced",
          className
        )}
        {...props}
      />
    )
  }
)
MetricCard.displayName = "MetricCard"

const MetricCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6", className)} {...props} />
))
MetricCardContent.displayName = "MetricCardContent"

export { MetricCard, MetricCardContent }