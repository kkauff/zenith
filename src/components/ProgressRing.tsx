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
    <div className="progress-ring">
      <svg width={size} height={size} aria-hidden>
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="var(--surface-2)"
          strokeWidth={stroke}
          fill="none"
        />
        {percent !== null && (
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke="var(--accent)"
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${center} ${center})`}
            style={{ transition: 'stroke-dashoffset 300ms ease-out' }}
          />
        )}
        <text
          x={center}
          y={center}
          textAnchor="middle"
          dominantBaseline="central"
          fill="var(--text)"
          fontSize="18"
          fontWeight="700"
        >
          {percent === null ? '—' : `${Math.round(percent)}%`}
        </text>
      </svg>
      <span className="progress-ring-label">{label}</span>
    </div>
  );
}
