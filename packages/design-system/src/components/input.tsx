import * as React from 'react'

import { cn } from '../lib/utils'

interface InputProps extends React.ComponentProps<'input'> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-11 w-full rounded-lg border border-border bg-background px-4 py-2 text-base text-foreground transition-all shadow-sm',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
          'placeholder:text-muted-foreground',
          'outline-none focus:outline-none focus-visible:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted',
          'focus:border-primary focus:border-2',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }
