export interface TrendPoint {
  label: string;
  value: number;
}

/** Daily ticket counts; `null` until live analytics data is connected. */
export type TrendSeries = TrendPoint[] | null;

const CHART_WIDTH = 560;
const CHART_HEIGHT = 250;
const PAD_LEFT = 34;
const PAD_RIGHT = 12;
const PAD_TOP = 12;
const PAD_BOTTOM = 30;

const LINE_COLOR = "#8B5CF6";

function computeYMax(points: TrendPoint[]) {
  const maxValue = Math.max(...points.map((point) => point.value));
  return Math.max(20, Math.ceil(maxValue / 20) * 20);
}

function TrendChart({ points }: { points: TrendPoint[] }) {
  const yMax = computeYMax(points);
  const plotWidth = CHART_WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;

  const xFor = (index: number) => PAD_LEFT + (index / (points.length - 1)) * plotWidth;
  const yFor = (value: number) =>
    CHART_HEIGHT - PAD_BOTTOM - (value / yMax) * plotHeight;

  const linePoints = points
    .map((point, index) => `${xFor(index)},${yFor(point.value)}`)
    .join(" ");
  const areaPath =
    `M ${xFor(0)},${CHART_HEIGHT - PAD_BOTTOM} ` +
    points
      .map((point, index) => `L ${xFor(index)},${yFor(point.value)}`)
      .join(" ") +
    ` L ${xFor(points.length - 1)},${CHART_HEIGHT - PAD_BOTTOM} Z`;

  const gridValues = [1, 2, 3, 4].map((step) => (yMax / 4) * step);

  return (
    <svg
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      role="img"
      aria-label="Tickets created per day"
      className="mt-2 w-full"
    >
      <defs>
        <linearGradient id="trend-area-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={LINE_COLOR} stopOpacity="0.22" />
          <stop offset="100%" stopColor={LINE_COLOR} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {gridValues.map((gridValue) => (
        <g key={gridValue}>
          <line
            x1={PAD_LEFT}
            x2={CHART_WIDTH - PAD_RIGHT}
            y1={yFor(gridValue)}
            y2={yFor(gridValue)}
            className="stroke-gray-100"
          />
          <text
            x={PAD_LEFT - 8}
            y={yFor(gridValue) + 3}
            textAnchor="end"
            className="fill-gray-400 text-[10px]"
          >
            {Math.round(gridValue)}
          </text>
        </g>
      ))}
      <line
        x1={PAD_LEFT}
        x2={CHART_WIDTH - PAD_RIGHT}
        y1={yFor(0)}
        y2={yFor(0)}
        className="stroke-gray-200"
      />
      <text
        x={PAD_LEFT - 8}
        y={yFor(0) + 3}
        textAnchor="end"
        className="fill-gray-400 text-[10px]"
      >
        0
      </text>

      <path d={areaPath} fill="url(#trend-area-fill)" />
      <polyline
        points={linePoints}
        fill="none"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        stroke={LINE_COLOR}
      />
      {points.map((point, index) => (
        <g key={`${point.label}-${index}`}>
          <circle
            cx={xFor(index)}
            cy={yFor(point.value)}
            r="3.5"
            strokeWidth="2"
            className="fill-white"
            stroke={LINE_COLOR}
          />
          <text
            x={xFor(index)}
            y={CHART_HEIGHT - 8}
            textAnchor="middle"
            className="fill-gray-500 text-[10px]"
          >
            {point.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

/**
 * Ticket Trend panel matching the reference layout. With no series yet it
 * renders a clear empty state; no values are fabricated.
 */
export function TicketTrendPanel({ series }: { series: TrendSeries }) {
  const hasSeries = series !== null && series.length > 1;

  return (
    <div className="rounded-xl border border-gray-200/80 bg-white p-4 sm:p-6 shadow-xs">
      <h2 className="text-base sm:text-lg font-bold tracking-tight text-gray-900">
        Ticket Trend
      </h2>

      {hasSeries ? (
        <TrendChart points={series} />
      ) : (
        <div className="mt-4 flex flex-col items-center rounded-lg border border-dashed border-gray-200 px-4 py-10 text-center">
          <svg
            viewBox="0 0 560 120"
            aria-hidden="true"
            className="h-14 w-full max-w-sm"
          >
            <polyline
              points="10,90 100,70 190,85 280,50 370,65 460,35 550,55"
              fill="none"
              strokeWidth="2"
              strokeDasharray="4 6"
              className="stroke-gray-200"
            />
          </svg>
          <p className="mt-2 text-sm font-medium text-gray-600">
            No trend data yet
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Daily ticket volume appears here once live analytics are connected.
          </p>
        </div>
      )}
    </div>
  );
}
