import * as React from 'react'

import { cn } from '../lib/utils'

interface InputProps extends React.ComponentProps<'input'> {
  accentColor?: 'default' | 'blue' | 'emerald' | 'purple' | 'orange';
}

const accentStyles = {
  default: 'focus:border-gray-300 focus:ring-gray-200/50',
  blue: 'focus:border-blue-400 focus:ring-blue-500/20',
  emerald: 'focus:border-emerald-400 focus:ring-emerald-500/20',
  purple: 'focus:border-purple-400 focus:ring-purple-500/20',
  orange: 'focus:border-orange-400 focus:ring-orange-500/20',
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, accentColor = 'default', ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-12 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-base text-gray-900 transition-all shadow-sm',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
          'placeholder:text-gray-400',
          'outline-none',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50',
          'focus:outline-none focus:ring-2',
          accentStyles[accentColor],
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
