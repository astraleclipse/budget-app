interface ProgressBarProps {
  percent: number;
  className?: string;
}

export default function ProgressBar({ percent, className = '' }: ProgressBarProps) {
  const clamped = Math.min(Math.max(percent, 0), 100);
  const color = clamped < 75
    ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
    : clamped < 90
    ? 'bg-gradient-to-r from-amber-400 to-amber-500'
    : 'bg-gradient-to-r from-rose-400 to-rose-500';

  return (
    <div className={`w-full bg-slate-100 dark:bg-slate-700/60 rounded-full h-2 ${className}`}>
      <div
        className={`h-2 rounded-full transition-all duration-700 ease-out ${color}`}
        style={{ width: `${Math.min(clamped, 100)}%` }}
      />
    </div>
  );
}
