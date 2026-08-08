import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
}

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  const base = 'px-4 py-2 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-accent text-white hover:bg-accent-2',
    secondary: 'border border-border bg-panel text-white hover:bg-panel-2',
    ghost: 'text-muted hover:text-white hover:bg-white/5',
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
