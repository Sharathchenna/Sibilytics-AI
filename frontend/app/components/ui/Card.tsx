import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Elevation level (shadow intensity)
   * - 1: No shadow
   * - 2: shadow-sm
   * - 3: shadow-md (default)
   * - 4: shadow-lg
   */
  elevation?: 1 | 2 | 3 | 4;

  /**
   * Enable hover effect (elevates on hover)
   */
  hoverable?: boolean;

  /**
   * Padding size
   * - none: No padding
   * - sm: p-4
   * - md: p-6 (default)
   * - lg: p-8
   */
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      elevation = 3,
      hoverable = false,
      padding = 'md',
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    // Base styles
    const baseStyles = `
      bg-white border border-slate-200 rounded-xl
      transition-all duration-200
    `;

    // Elevation (shadow) styles
    const elevationStyles = {
      1: '',
      2: 'shadow-sm',
      3: 'shadow-md',
      4: 'shadow-lg',
    };

    // Hover effect
    const hoverStyles = hoverable
      ? 'hover:shadow-lg hover:-translate-y-0.5 cursor-pointer'
      : '';

    // Padding styles
    const paddingStyles = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    };

    return (
      <div
        ref={ref}
        className={`
          ${baseStyles}
          ${elevationStyles[elevation]}
          ${paddingStyles[padding]}
          ${hoverStyles}
          ${className}
        `.replace(/\s+/g, ' ').trim()}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

/**
 * Card Header Component
 */
export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Title text
   */
  title?: string;

  /**
   * Subtitle text
   */
  subtitle?: string;

  /**
   * Action component (e.g., button, icon)
   */
  action?: React.ReactNode;
}

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ title, subtitle, action, className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`flex items-start justify-between gap-4 ${className}`.trim()}
        {...props}
      >
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className="text-lg font-semibold text-slate-900 truncate">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-sm text-slate-600 mt-1">
              {subtitle}
            </p>
          )}
          {children}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

/**
 * Card Footer Component
 */
export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`pt-4 mt-4 border-t border-slate-200 ${className}`.trim()}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';

export default Card;
