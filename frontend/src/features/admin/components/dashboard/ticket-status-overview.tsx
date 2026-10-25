export interface StatusSegment {
  label: string;
  count: number;
  ringClass: string;
  dotClass: string;
}

/** Status breakdown rows; `null` until live status data is connected. */
export type StatusOverviewData = StatusSegment[] | null;

const RING_RADIUS = 62;
const RING_STROKE = 24;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/** Planned legend rows shown as `—` until live data replaces them. */
const AWAITING_LEGEND_LABELS = [
  "Pending Review",
  "In Progress",
  "Resolved",
];

function formatPercent(ratio: number) {
  return `${(ratio * 100).toFixed(1)}%`;
}

/**
 * Donut of ticket statuses with its legend, mirroring the reference layout.
 * With no data yet it renders a neutral ring and `—` legend values.
 */
export function TicketStatusOverview({
  data,
}: {
  data: StatusOverviewData;
}) {
  const hasData = data !== null && data.length > 0;
  const total = hasData
    ? data.reduce((sum, segment) => sum + segment.count, 0)
    : 0;

  let cumulative = 0;
  const segments = hasData
    ? data.map((segment) => {
        const length = (segment.count / total) * RING_CIRCUMFERENCE;
        const offset = cumulative;
        cumulative += length;
        return {
          label: segment.label,
          ringClass: segment.ringClass,
          dash: `${length} ${RING_CIRCUMFERENCE - length}`,
          offset: -offset,
        };
      })
    : [];

  const legend = hasData
    ? data.map((segment) => ({
        label: segment.label,
        dotClass: segment.dotClass,
        count: segment.count,
        ratio: total > 0 ? segment.count / total : null,
      }))
    : AWAITING_LEGEND_LABELS.map((label) => ({
        label,
        dotClass: "bg-gray-200",
        count: null as number | null,
        ratio: null as number | null,
      }));

  return (
    <div className="rounded-xl border border-gray-200/80 bg-white p-4 sm:p-6 shadow-xs">
      <h2 className="text-base sm:text-lg font-bold tracking-tight text-gray-900">
        Ticket Status Overview
      </h2>

      <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row sm:justify-center sm:gap-10">
        <svg
          viewBox="0 0 176 176"
          role="img"
          aria-label={
            hasData
              ? `Ticket status distribution across ${total.toLocaleString()} tickets`
              : "Ticket status distribution (no data yet)"
          }
          className="size-44 shrink-0"
        >
          <circle
            cx="88"
            cy="88"
            r={RING_RADIUS}
            fill="none"
            strokeWidth={RING_STROKE}
            transform="rotate(-90 88 88)"
            className="stroke-gray-200/70"
          />
          {segments.map((segment) => (
            <circle
              key={segment.label}
              cx="88"
              cy="88"
              r={RING_RADIUS}
              fill="none"
              strokeWidth={RING_STROKE}
              strokeDasharray={segment.dash}
              strokeDashoffset={segment.offset}
              transform="rotate(-90 88 88)"
              className={segment.ringClass}
            />
          ))}
          <text
            x="88"
            y="82"
            textAnchor="middle"
            className="fill-gray-900 text-[26px] font-bold"
          >
            {hasData && total > 0 ? total.toLocaleString() : "\u2014"}
          </text>
          <text
            x="88"
            y="102"
            textAnchor="middle"
            className="fill-gray-500 text-[11px]"
          >
            {hasData && total > 0 ? "Tickets" : "No data yet"}
          </text>
        </svg>

        <ul className="w-full max-w-xs space-y-3">
          {legend.map((row) => (
            <li
              key={row.label}
              className="flex items-center gap-2.5 text-[13px]"
            >
              <span
                aria-hidden="true"
                className={`size-2.5 shrink-0 rounded-sm ${row.dotClass}`}
              />
              <span className="flex-1 truncate text-gray-600">
                {row.label}
              </span>
              <span className="w-10 text-right font-semibold text-gray-900 tabular-nums">
                {row.count === null ? "\u2014" : row.count.toLocaleString()}
              </span>
              <span className="w-14 text-right text-xs text-gray-500 tabular-nums">
                {row.ratio === null ? "\u2014" : formatPercent(row.ratio)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
