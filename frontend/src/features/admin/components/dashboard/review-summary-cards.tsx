"use client";

import {
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  type LucideIcon,
} from "lucide-react";

type StatTone = "blue" | "amber" | "green" | "gray";

const STAT_TONES: Record<
  StatTone,
  { border: string; iconBg: string; iconColor: string }
> = {
  blue: {
    border: "border-blue-200/70",
    iconBg: "bg-[#DBEAFE]",
    iconColor: "text-[#2563EB]",
  },
  amber: {
    border: "border-amber-200/70",
    iconBg: "bg-[#FEF3C7]",
    iconColor: "text-amber-600",
  },
  green: {
    border: "border-emerald-200/70",
    iconBg: "bg-[#DCFCE7]",
    iconColor: "text-emerald-600",
  },
  gray: {
    border: "border-gray-200",
    iconBg: "bg-gray-100",
    iconColor: "text-gray-500",
  },
};

function StatCard({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number | null;
  tone: StatTone;
  icon: LucideIcon;
}) {
  const classes = STAT_TONES[tone];
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border bg-white px-4 sm:px-5 py-4 shadow-xs transition-shadow hover:shadow-sm ${
        classes.border
      }`}
    >
      <div
        className={`size-10 sm:size-11 shrink-0 rounded-lg flex items-center justify-center ${classes.iconBg}`}
      >
        <Icon className={`size-5 ${classes.iconColor}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs sm:text-sm font-medium text-gray-700 truncate">
          {label}
        </p>
        <p className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
          {value === null ? "—" : value}
        </p>
      </div>
      <ChevronRight className="ml-auto size-4 text-gray-400 shrink-0" />
    </div>
  );
}

export function ReviewSummaryCards({
  pendingCount,
  inProgress,
  resolved,
  total,
}: {
  pendingCount: number;
  inProgress: number | null;
  resolved: number | null;
  total: number | null;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
      <StatCard label="Pending Review" value={pendingCount} tone="blue" icon={FileText} />
      <StatCard label="In Progress" value={inProgress} tone="amber" icon={Clock3} />
      <StatCard label="Resolved" value={resolved} tone="green" icon={CheckCircle2} />
      <StatCard label="Total Tickets" value={total} tone="gray" icon={BarChart3} />
    </div>
  );
}
