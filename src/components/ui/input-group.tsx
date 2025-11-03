import * as React from "react"
import { cn } from "@/lib/utils"
import { Button, ButtonProps } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

const InputGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "relative flex w-full flex-wrap items-start gap-2 rounded-xl border bg-background p-2 text-sm shadow-sm transition-colors focus-within:border-ring focus-within:ring-1 focus-within:ring-ring",
        className
      )}
      {...props}
    />
  )
})
InputGroup.displayName = "InputGroup"

const InputGroupTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
})
InputGroupTextarea.displayName = "InputGroupTextarea"

interface InputGroupAddonProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "block-start" | "block-end"
}

const InputGroupAddon = React.forwardRef<HTMLDivElement, InputGroupAddonProps>(
  ({ className, align = "block-end", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center gap-1",
          align === "block-start" && "self-start pt-2",
          align === "block-end" && "self-end",
          className
        )}
        {...props}
      />
    )
  }
)
InputGroupAddon.displayName = "InputGroupAddon"

interface InputGroupButtonProps extends ButtonProps {
  "aria-label"?: string
}

const InputGroupButton = React.forwardRef<
  HTMLButtonElement,
  InputGroupButtonProps
>(({ className, size, variant = "ghost", ...props }, ref) => {
  return (
    <Button
      ref={ref}
      variant={variant}
      size={size || "icon"}
      className={cn("shrink-0", className)}
      {...props}
    />
  )
})
InputGroupButton.displayName = "InputGroupButton"

export { InputGroup, InputGroupTextarea, InputGroupAddon, InputGroupButton }

