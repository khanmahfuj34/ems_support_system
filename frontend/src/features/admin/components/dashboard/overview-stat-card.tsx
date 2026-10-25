import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";

export interface OverviewStatCardProps {
  label: string;
  icon: LucideIcon;
  iconClasses: string;
  /** Live value; `null` renders a neutral placeholder until data is wired. */
  value: number | null;
  /** While loading, the value renders as a pulse skeleton block. */
  loading?: boolean;
  /** Change pill content; rendered only when live comparison data exists. */
  trend?: { direction: "up" | "down"; text: string } | null;
}

/** One KPI tile of the admin overview (Total, Pending, In Progress, Resolved). */
export function OverviewStatCard({
  label,
  icon: Icon,
  iconClasses,
  value,
  loading = false,
  trend = null,
}: OverviewStatCardProps) {
  return (
    <div className="rounded-xl border border-gray-200/80 bg-white p-4 sm:p-5 shadow-xs">
      <div className="flex items-start gap-3 sm:gap-4">
        <span
          className={`flex size-11 sm:size-12 shrink-0 items-center justify-center rounded-xl ${iconClasses}`}
          aria-hidden="true"
        >
          <Icon className="size-5 sm:size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-gray-600">{label}</p>
          <div className="mt-0.5 flex flex-wrap items-end justify-between gap-2">
            {loading ? (
              <span
                aria-hidden="true"
                className="h-8 w-16 animate-pulse rounded-md bg-gray-100"
              />
            ) : (
              <p className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 tabular-nums">
                {value === null ? "\u2014" : value.toLocaleString()}
              </p>
            )}
            {trend ? (
              <span
                className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
                  trend.direction === "up"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-600"
                }`}
              >
                {trend.direction === "up" ? (
                  <TrendingUp className="size-3" aria-hidden="true" />
                ) : (
                  <TrendingDown className="size-3" aria-hidden="true" />
                )}
                {trend.text}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
