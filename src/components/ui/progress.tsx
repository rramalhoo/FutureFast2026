import { cn } from "@/lib/utils";

export function ProgressRing({
  value,
  size = 112,
  stroke = 10,
  label,
  className,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label}: ${Math.round(clamped)}%`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--surface-sunken)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#gv-ring)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
        <defs>
          <linearGradient id="gv-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7d35a5" />
            <stop offset="100%" stopColor="#c08ddb" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

export function ProgressBar({ value, className, label }: { value: number; className?: string; label: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-surface-sunken", className)}
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-[linear-gradient(90deg,#7d35a5,#a967cc)] transition-[width] duration-700 ease-out"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
