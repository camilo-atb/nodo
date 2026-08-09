import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
}

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  const base = 'px-4 py-2 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-[#12c7e5] text-[#001a20] hover:bg-[#0fb8d4]',
    secondary: 'border border-gray-200 dark:border-[#20262d] bg-white dark:bg-[#101317] text-[#111318] dark:text-[#f4f6f8] hover:bg-gray-50 dark:hover:bg-[#15191e]',
    ghost: 'text-gray-500 dark:text-[#9da6b1] hover:text-[#111318] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5',
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
