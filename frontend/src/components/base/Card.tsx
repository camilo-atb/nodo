import type { HTMLAttributes } from 'react';

export function Card({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`border border-border bg-gradient-to-br from-white/[0.045] to-white/[0.018] rounded-xl p-3 transition hover:border-violet/35 hover:bg-white/[0.055] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
