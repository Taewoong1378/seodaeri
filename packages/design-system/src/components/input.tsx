import * as React from 'react'

import { cn } from '../lib/utils'

interface InputProps extends React.ComponentProps<'input'> {
  accentColor?: 'default' | 'blue' | 'emerald' | 'purple' | 'orange';
}

const accentStyles = {
  default: 'focus:ring-primary/20 focus:border-primary',
  blue: 'focus:ring-blue-500/20 focus:border-blue-500',
  emerald: 'focus:ring-emerald-500/20 focus:border-emerald-500',
  purple: 'focus:ring-purple-500/20 focus:border-purple-500',
  orange: 'focus:ring-orange-500/20 focus:border-orange-500',
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, accentColor = 'default', ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-12 w-full rounded-xl border border-border bg-muted/50 px-4 py-2 text-base text-foreground transition-all',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
          'placeholder:text-muted-foreground',
          'outline-none ring-0',
          'focus:outline-none focus:ring-2',
          accentStyles[accentColor],
          'disabled:cursor-not-allowed disabled:opacity-50',
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
