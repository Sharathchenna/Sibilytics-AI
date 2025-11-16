import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Button variant
   * - primary: Solid emerald background (main actions)
   * - secondary: Outlined with border (secondary actions)
   * - ghost: Text only with hover background (tertiary actions)
   */
  variant?: 'primary' | 'secondary' | 'ghost';

  /**
   * Button size
   * - sm: Small (px-3 py-1.5, text-sm)
   * - md: Medium (px-4 py-2, text-base) - default
   * - lg: Large (px-6 py-3, text-lg)
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Full width button
   */
  fullWidth?: boolean;

  /**
   * Loading state with spinner
   */
  loading?: boolean;

  /**
   * Icon to display before children
   */
  leftIcon?: React.ReactNode;

  /**
   * Icon to display after children
   */
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      leftIcon,
      rightIcon,
      className = '',
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    // Base styles
    const baseStyles = `
      inline-flex items-center justify-center gap-2
      font-medium rounded-lg
      transition-all duration-200
      focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
    `;

    // Variant styles
    const variantStyles = {
      primary: `
        bg-emerald-600 text-white
        hover:bg-emerald-700 active:bg-emerald-800
        shadow-sm hover:shadow-md
      `,
      secondary: `
        bg-transparent text-slate-700 border-2 border-slate-300
        hover:border-slate-400 hover:bg-slate-50 active:bg-slate-100
      `,
      ghost: `
        bg-transparent text-slate-700
        hover:bg-slate-100 active:bg-slate-200
      `,
    };

    // Size styles
    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    // Width style
    const widthStyle = fullWidth ? 'w-full' : '';

    // Loading state disables the button
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`
          ${baseStyles}
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${widthStyle}
          ${className}
        `.replace(/\s+/g, ' ').trim()}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {!loading && leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
        {children}
        {!loading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
