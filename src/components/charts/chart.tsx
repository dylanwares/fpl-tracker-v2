/**
 * Hand-rolled SVG charts.
 *
 * No library: every series here is at most 38 points, and anything off the
 * shelf would need restyling to the tokens anyway. These render on the server,
 * scale with `viewBox` rather than measuring the DOM, and cost no JavaScript.
 *
 * Colours come from CSS custom properties so the charts follow the theme like
 * everything else (design spec §2).
 */

interface Point {
  label: string | number;
  value: number;
}

function bounds(values: number[], includeZero: boolean) {
  const max = Math.max(...values, includeZero ? 0 : Number.NEGATIVE_INFINITY);
  const min = Math.min(...values, includeZero ? 0 : Number.POSITIVE_INFINITY);
  // A flat series would divide by zero; give it a nominal range instead.
  const span = max - min || 1;
  return { max, min, span };
}

/**
 * Line chart with an optional comparison series — used for points against the
 * game and league averages.
 */
export function LineChart({
  series,
  height = 160,
  label,
}: {
  series: { name: string; points: Point[]; colour: string; dashed?: boolean }[];
  height?: number;
  label: string;
}) {
  const all = series.flatMap((line) => line.points.map((point) => point.value));
  if (all.length === 0) return null;

  const { min, span } = bounds(all, false);
  const width = 320;
  const padding = { top: 8, right: 4, bottom: 18, left: 4 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const count = Math.max(...series.map((line) => line.points.length));

  const x = (index: number) =>
    padding.left + (count <= 1 ? plotWidth / 2 : (index / (count - 1)) * plotWidth);
  const y = (value: number) => padding.top + plotHeight - ((value - min) / span) * plotHeight;

  return (
    <figure className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={label}
        preserveAspectRatio="none"
      >
        {series.map((line) => (
          <g key={line.name}>
            <polyline
              points={line.points.map((point, index) => `${x(index)},${y(point.value)}`).join(" ")}
              fill="none"
              stroke={line.colour}
              strokeWidth={line.dashed ? 1.5 : 2}
              strokeDasharray={line.dashed ? "4 3" : undefined}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            {!line.dashed &&
              line.points.map((point, index) => (
                <circle
                  key={point.label}
                  cx={x(index)}
                  cy={y(point.value)}
                  r={2.5}
                  fill={line.colour}
                />
              ))}
          </g>
        ))}

        {series[0]?.points.map((point, index) => (
          <text
            key={point.label}
            x={x(index)}
            y={height - 4}
            textAnchor="middle"
            className="fill-[var(--text-3)] text-[9px]"
          >
            {point.label}
          </text>
        ))}
      </svg>

      <figcaption className="flex flex-wrap gap-3 text-[11px] text-text-2">
        {series.map((line) => (
          <span key={line.name} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="h-0.5 w-4 rounded-full"
              style={{ background: line.colour }}
            />
            {line.name}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

/** Bar chart for signed values — points above or below an average, per gameweek. */
export function BarChart({
  points,
  height = 140,
  label,
  positiveColour = "var(--good)",
  negativeColour = "var(--bad)",
}: {
  points: Point[];
  height?: number;
  label: string;
  positiveColour?: string;
  negativeColour?: string;
}) {
  if (points.length === 0) return null;

  const { max, span } = bounds(
    points.map((point) => point.value),
    true,
  );
  const width = 320;
  const padding = { top: 6, bottom: 18 };
  const plotHeight = height - padding.top - padding.bottom;
  const gap = 3;
  const barWidth = Math.max(2, (width - gap * (points.length - 1)) / points.length);
  const zeroY = padding.top + (max / span) * plotHeight;

  return (
    <figure className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={label}
        preserveAspectRatio="none"
      >
        <line
          x1={0}
          x2={width}
          y1={zeroY}
          y2={zeroY}
          stroke="var(--border-strong)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        {points.map((point, index) => {
          const barHeight = (Math.abs(point.value) / span) * plotHeight;
          const x = index * (barWidth + gap);
          return (
            <g key={point.label}>
              <rect
                x={x}
                y={point.value >= 0 ? zeroY - barHeight : zeroY}
                width={barWidth}
                height={Math.max(1, barHeight)}
                rx={1.5}
                fill={point.value >= 0 ? positiveColour : negativeColour}
              />
              <text
                x={x + barWidth / 2}
                y={height - 4}
                textAnchor="middle"
                className="fill-[var(--text-3)] text-[9px]"
              >
                {point.label}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
