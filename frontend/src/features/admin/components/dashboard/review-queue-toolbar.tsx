"use client";

import { Calendar, ChevronDown, Search } from "lucide-react";

import {
  DATE_RANGES,
  PRIORITY_FILTERS,
  type DateRangeValue,
} from "../../utils/admin-constants";

export function ReviewQueueToolbar({
  searchTerm,
  onSearchTermChange,
  priorityFilter,
  onPriorityFilterChange,
  dateCutoff,
  onDateCutoffChange,
}: {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  priorityFilter: string;
  onPriorityFilterChange: (value: string) => void;
  dateCutoff: DateRangeValue;
  onDateCutoffChange: (value: DateRangeValue) => void;
}) {
  return (
    <div className="p-4 sm:p-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative w-full lg:max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
          placeholder="Search tickets by ID, subject or category..."
          aria-label="Search tickets"
          className="w-full rounded-lg border border-gray-200 bg-white pl-10 pr-3 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Priority filter */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="priority-filter"
            className="text-xs font-medium text-gray-500 shrink-0"
          >
            Priority
          </label>
          <div className="relative w-full sm:w-40">
            <select
              id="priority-filter"
              value={priorityFilter}
              onChange={(event) => onPriorityFilterChange(event.target.value)}
              className="w-full appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-3 pr-8 text-xs font-medium text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors"
            >
              {PRIORITY_FILTERS.map((priority) => (
                <option key={priority} value={priority}>
                  {priority === "ALL" ? "All Priorities" : priority}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
              <ChevronDown className="size-3.5" />
            </div>
          </div>
        </div>

        {/* Date range filter */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="date-range-filter"
            className="text-xs font-medium text-gray-500 shrink-0"
          >
            Date Range
          </label>
          <div className="relative w-full sm:w-40">
            <Calendar className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
            <select
              id="date-range-filter"
              value={dateCutoff}
              onChange={(event) =>
                onDateCutoffChange(event.target.value as DateRangeValue)
              }
              className="w-full appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-8 pr-8 text-xs font-medium text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors"
            >
              {DATE_RANGES.map((range) => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
              <ChevronDown className="size-3.5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
