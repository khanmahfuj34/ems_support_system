"use client";

import {
  BarChart3,
  CheckCircle2,
  Clock3,
  FileText,
  XCircle,
} from "lucide-react";

import type { QueueCounts } from "@/features/admin/hooks/use-admin-queue";

function StatCard({
  label,
  value,
  sublabel,
  icon,
  iconBg,
  iconColor,
}: {
  label: string;
  value: number | null;
  sublabel: string;
  icon: typeof BarChart3;
  iconBg: string;
  iconColor: string;
}) {
  const Icon = icon;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200/80 bg-white px-4 sm:px-5 py-4 shadow-xs">
      <div
        className={`size-10 sm:size-11 shrink-0 rounded-lg flex items-center justify-center ${iconBg}`}
      >
        <Icon className={`size-5 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs sm:text-sm font-medium text-gray-700 truncate">
          {label}
        </p>
        <span className="block text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
          {value === null ? "—" : value}
        </span>
        <p className="text-[10px] sm:text-[11px] text-gray-400 truncate">
          {sublabel}
        </p>
      </div>
    </div>
  );
}

export function TicketSummaryCards({ counts }: { counts: QueueCounts }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
      <StatCard
        label="Total Tickets"
        value={counts.total}
        sublabel="All time"
        icon={BarChart3}
        iconBg="bg-gray-100"
        iconColor="text-gray-500"
      />
      <StatCard
        label="Pending Review"
        value={counts.pending}
        sublabel="Awaiting action"
        icon={FileText}
        iconBg="bg-[#DBEAFE]"
        iconColor="text-[#2563EB]"
      />
      <StatCard
        label="In Progress"
        value={counts.inProgress}
        sublabel="Being handled"
        icon={Clock3}
        iconBg="bg-[#FEF3C7]"
        iconColor="text-amber-600"
      />
      <StatCard
        label="Resolved"
        value={counts.resolved}
        sublabel="Completed"
        icon={CheckCircle2}
        iconBg="bg-[#DCFCE7]"
        iconColor="text-emerald-600"
      />
      <StatCard
        label="Rejected"
        value={counts.rejected}
        sublabel="Not approved"
        icon={XCircle}
        iconBg="bg-[#FEE2E2]"
        iconColor="text-red-500"
      />
    </div>
  );
}
