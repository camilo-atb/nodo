interface BadgeProps {
  children: React.ReactNode;
  color?: 'green' | 'amber' | 'red' | 'violet' | 'muted';
  className?: string;
}

export function Badge({ children, color = 'muted', className = '' }: BadgeProps) {
  const colors = {
    green: 'text-green bg-green/10 border-green/20',
    amber: 'text-amber bg-amber/10 border-amber/20',
    red: 'text-red bg-red/10 border-red/20',
    violet: 'text-violet bg-violet/10 border-violet/20',
    muted: 'text-muted bg-white/5 border-border',
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide border rounded-md ${colors[color]} ${className}`}>
      {children}
    </span>
  );
}
