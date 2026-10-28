const TRACK_COLOR = "#e1e0d9";
const GAP = 2;

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  title: string;
  segments: DonutSegment[];
  centerValue: string;
  centerLabel: string;
  size?: number;
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function DonutChart({ title, segments, centerValue, centerLabel, size = 120 }: DonutChartProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const radius = size / 2;
  const stroke = size * 0.22;
  const innerRadius = radius - stroke / 2;
  const circumference = 2 * Math.PI * innerRadius;

  let cumulative = 0;
  const arcs = segments.map((seg) => {
    const fraction = total > 0 ? seg.value / total : 0;
    const rawLength = circumference * fraction;
    const length = Math.max(rawLength - GAP, 0);
    const dashoffset = -cumulative;
    cumulative += rawLength;
    return { ...seg, length, dashoffset };
  });

  return (
    <div className="donut-card">
      <div className="donut-title">{title}</div>
      <div className="donut-body">
        <div className="donut-svg-wrap" style={{ width: size, height: size }}>
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            style={{ transform: "rotate(-90deg)" }}
          >
            <circle
              cx={radius}
              cy={radius}
              r={innerRadius}
              fill="none"
              stroke={TRACK_COLOR}
              strokeWidth={stroke}
            />
            {total > 0 &&
              arcs.map((arc) => (
                <circle
                  key={arc.label}
                  cx={radius}
                  cy={radius}
                  r={innerRadius}
                  fill="none"
                  stroke={arc.color}
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  strokeDasharray={`${arc.length} ${circumference - arc.length}`}
                  strokeDashoffset={arc.dashoffset}
                >
                  <title>
                    {arc.label}: {formatNumber(arc.value)}
                  </title>
                </circle>
              ))}
          </svg>
          <div className="donut-center">
            <div className="donut-center-value">{centerValue}</div>
            <div className="donut-center-label">{centerLabel}</div>
          </div>
        </div>
        <div className="donut-legend">
          {segments.map((seg) => (
            <div className="donut-legend-item" key={seg.label}>
              <span className="donut-legend-dot" style={{ background: seg.color }} />
              <span className="donut-legend-label">{seg.label}</span>
              <span className="donut-legend-value">{formatNumber(seg.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DonutChart;
