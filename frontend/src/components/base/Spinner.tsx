interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-10 h-10',
};

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <div
      className={`${sizes[size]} border-2 border-muted/30 border-t-violet rounded-full animate-spin ${className}`}
      role="status"
      aria-label="Cargando"
    />
  );
}
