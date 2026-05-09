type Props = {
  // null = "no schedule in this range" → ring is dim with a "—" inside.
  percent: number | null;
  label: string;
  size?: number;
};

export function ProgressRing({ percent, label, size = 84 }: Props) {
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped =
    percent === null ? 0 : Math.max(0, Math.min(100, percent));
  const offset = circumference - (clamped / 100) * circumference;
  const center = size / 2;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} aria-hidden>
        <defs>
          <filter id="ring-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.4" />
          </filter>
        </defs>
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="hsl(var(--surface-2))"
          strokeWidth={stroke}
          fill="none"
        />
        {percent !== null && (
          <>
            <circle
              cx={center}
              cy={center}
              r={radius}
              stroke="hsl(var(--primary))"
              strokeOpacity={0.45}
              strokeWidth={stroke}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${center} ${center})`}
              filter="url(#ring-glow)"
              style={{ transition: 'stroke-dashoffset 300ms ease-out' }}
            />
            <circle
              cx={center}
              cy={center}
              r={radius}
              stroke="hsl(var(--primary))"
              strokeWidth={stroke}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${center} ${center})`}
              style={{ transition: 'stroke-dashoffset 300ms ease-out' }}
            />
          </>
        )}
        <text
          x={center}
          y={center}
          textAnchor="middle"
          dominantBaseline="central"
          fill="hsl(var(--foreground))"
          fontSize="18"
          fontWeight="700"
        >
          {percent === null ? '—' : `${Math.round(percent)}%`}
        </text>
      </svg>
      <span className="text-[11px] uppercase tracking-[0.1em] font-semibold text-muted-foreground">
        {label}
      </span>
    </div>
  );
}
