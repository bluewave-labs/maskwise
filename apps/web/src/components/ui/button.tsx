import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded text-[13px] ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-[34px] font-normal",
  {
    variants: {
      variant: {
        default: "bg-blue-200 text-blue-900 hover:bg-blue-300",
        destructive:
          "bg-red-200 text-red-900 hover:bg-red-300",
        outline:
          "border border-blue-200 bg-background text-blue-900 hover:bg-blue-50 hover:text-blue-900",
        secondary:
          "bg-blue-100 text-blue-800 hover:bg-blue-200",
        ghost: "text-blue-900 hover:bg-blue-100 hover:text-blue-900",
        link: "text-blue-900 underline-offset-4 hover:underline",
      },
      size: {
        default: "px-4 py-2",
        sm: "rounded px-3",
        lg: "rounded px-8",
        icon: "w-[34px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }