import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * Input label
   */
  label?: string;

  /**
   * Helper text below input
   */
  helperText?: string;

  /**
   * Error message (shows error state)
   */
  error?: string;

  /**
   * Success message (shows success state)
   */
  success?: string;

  /**
   * Icon to display before input
   */
  leftIcon?: React.ReactNode;

  /**
   * Icon to display after input
   */
  rightIcon?: React.ReactNode;

  /**
   * Full width input
   */
  fullWidth?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      success,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const hasError = Boolean(error);
    const hasSuccess = Boolean(success) && !hasError;

    // Input wrapper styles
    const wrapperStyles = `
      relative flex items-center
      bg-white border rounded-lg
      transition-all duration-200
      ${hasError ? 'border-red-500 focus-within:ring-2 focus-within:ring-red-500' : ''}
      ${hasSuccess ? 'border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500' : ''}
      ${!hasError && !hasSuccess ? 'border-slate-300 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600' : ''}
      ${disabled ? 'bg-slate-50 cursor-not-allowed' : ''}
    `;

    // Input styles
    const inputStyles = `
      flex-1 px-4 py-2 text-base text-slate-900
      bg-transparent outline-none
      placeholder:text-slate-400
      disabled:cursor-not-allowed disabled:text-slate-500
      ${leftIcon ? 'pl-2' : ''}
      ${rightIcon || hasError || hasSuccess ? 'pr-2' : ''}
    `;

    // Status icon
    const statusIcon = hasError ? (
      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
    ) : hasSuccess ? (
      <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
    ) : null;

    return (
      <div className={`${fullWidth ? 'w-full' : ''}`}>
        {/* Label */}
        {label && (
          <label className="block text-sm font-medium text-slate-700 mb-2">
            {label}
          </label>
        )}

        {/* Input wrapper */}
        <div className={wrapperStyles}>
          {/* Left icon */}
          {leftIcon && (
            <div className="pl-3 flex items-center text-slate-400">
              {leftIcon}
            </div>
          )}

          {/* Input */}
          <input
            ref={ref}
            disabled={disabled}
            className={`${inputStyles} ${className}`.trim()}
            {...props}
          />

          {/* Right icon or status icon */}
          <div className="pr-3 flex items-center text-slate-400">
            {statusIcon || rightIcon}
          </div>
        </div>

        {/* Helper text / Error / Success */}
        {(helperText || error || success) && (
          <p
            className={`mt-2 text-sm ${
              hasError
                ? 'text-red-600'
                : hasSuccess
                ? 'text-emerald-600'
                : 'text-slate-600'
            }`}
          >
            {error || success || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

/**
 * Textarea Component
 */
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
  success?: string;
  fullWidth?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      helperText,
      error,
      success,
      fullWidth = false,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const hasError = Boolean(error);
    const hasSuccess = Boolean(success) && !hasError;

    const textareaStyles = `
      w-full px-4 py-2 text-base text-slate-900
      bg-white border rounded-lg
      transition-all duration-200
      outline-none resize-y
      placeholder:text-slate-400
      disabled:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-500
      ${hasError ? 'border-red-500 focus:ring-2 focus:ring-red-500' : ''}
      ${hasSuccess ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-500' : ''}
      ${!hasError && !hasSuccess ? 'border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600' : ''}
    `;

    return (
      <div className={`${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label className="block text-sm font-medium text-slate-700 mb-2">
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          disabled={disabled}
          className={`${textareaStyles} ${className}`.trim()}
          {...props}
        />

        {(helperText || error || success) && (
          <p
            className={`mt-2 text-sm ${
              hasError
                ? 'text-red-600'
                : hasSuccess
                ? 'text-emerald-600'
                : 'text-slate-600'
            }`}
          >
            {error || success || helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Input;
