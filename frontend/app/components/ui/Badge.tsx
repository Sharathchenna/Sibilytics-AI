import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /**
   * Badge variant (color scheme)
   * - default: Slate gray
   * - primary: Emerald green
   * - success: Green
   * - warning: Orange/Yellow
   * - error: Red
   * - info: Blue
   */
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';

  /**
   * Badge size
   * - sm: Small (text-xs, px-2 py-0.5)
   * - md: Medium (text-sm, px-2.5 py-0.5) - default
   */
  size?: 'sm' | 'md';

  /**
   * Pill shape (fully rounded)
   */
  pill?: boolean;

  /**
   * Icon to display before children
   */
  icon?: React.ReactNode;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      variant = 'default',
      size = 'md',
      pill = false,
      icon,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    // Base styles
    const baseStyles = `
      inline-flex items-center gap-1.5
      font-medium whitespace-nowrap
      transition-colors duration-200
    `;

    // Variant styles
    const variantStyles = {
      default: 'bg-slate-100 text-slate-700 border border-slate-200',
      primary: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
      success: 'bg-green-100 text-green-700 border border-green-200',
      warning: 'bg-amber-100 text-amber-700 border border-amber-200',
      error: 'bg-red-100 text-red-700 border border-red-200',
      info: 'bg-blue-100 text-blue-700 border border-blue-200',
    };

    // Size styles
    const sizeStyles = {
      sm: 'text-xs px-2 py-0.5',
      md: 'text-sm px-2.5 py-0.5',
    };

    // Shape styles
    const shapeStyles = pill ? 'rounded-full' : 'rounded-md';

    // Icon size based on badge size
    const iconClassName = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

    return (
      <span
        ref={ref}
        className={`
          ${baseStyles}
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${shapeStyles}
          ${className}
        `.replace(/\s+/g, ' ').trim()}
        {...props}
      >
        {icon && <span className={iconClassName}>{icon}</span>}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

/**
 * Dot Badge - Small colored indicator
 */
export interface DotBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
  pulse?: boolean;
}

export const DotBadge = React.forwardRef<HTMLSpanElement, DotBadgeProps>(
  (
    {
      variant = 'default',
      pulse = false,
      className = '',
      ...props
    },
    ref
  ) => {
    const variantStyles = {
      default: 'bg-slate-400',
      primary: 'bg-emerald-500',
      success: 'bg-green-500',
      warning: 'bg-amber-500',
      error: 'bg-red-500',
      info: 'bg-blue-500',
    };

    const pulseStyles = pulse ? 'animate-pulse' : '';

    return (
      <span
        ref={ref}
        className={`
          inline-block w-2 h-2 rounded-full
          ${variantStyles[variant]}
          ${pulseStyles}
          ${className}
        `.replace(/\s+/g, ' ').trim()}
        {...props}
      />
    );
  }
);

DotBadge.displayName = 'DotBadge';

export default Badge;
