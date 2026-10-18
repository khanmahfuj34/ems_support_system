"use client";

import React from "react";
import { Check } from "lucide-react";
import type { TicketPriority } from "../types/ticket.types";

interface PriorityOptionConfig {
  value: TicketPriority;
  title: string;
  description: string;
  dotColor: string;
  defaultBg: string;
  defaultBorder: string;
  selectedBg: string;
  selectedBorder: string;
  selectedRing: string;
  checkBg: string;
}

const PRIORITY_OPTIONS: PriorityOptionConfig[] = [
  {
    value: "LOW",
    title: "Low",
    description: "General question or minor issue",
    dotColor: "bg-[#22C55E]",
    defaultBg: "bg-[#F0FDF4]/70 hover:bg-[#DCFCE7]/60",
    defaultBorder: "border-[#DCFCE7] hover:border-[#86EFAC]",
    selectedBg: "bg-[#F0FDF4]",
    selectedBorder: "border-[#22C55E] ring-1 ring-[#22C55E]/30",
    selectedRing: "ring-[#22C55E]",
    checkBg: "bg-[#22C55E]",
  },
  {
    value: "MEDIUM",
    title: "Medium",
    description: "Affects my work but can wait",
    dotColor: "bg-[#2563EB]",
    defaultBg: "bg-[#F0F5FF]/70 hover:bg-[#DBEAFE]/60",
    defaultBorder: "border-[#DBEAFE] hover:border-[#93C5FD]",
    selectedBg: "bg-[#EFF6FF]",
    selectedBorder: "border-[#2563EB] ring-1 ring-[#2563EB]/30",
    selectedRing: "ring-[#2563EB]",
    checkBg: "bg-[#2563EB]",
  },
  {
    value: "HIGH",
    title: "High",
    description: "Significantly affects my work",
    dotColor: "bg-[#F97316]",
    defaultBg: "bg-[#FFFBEB]/70 hover:bg-[#FEF3C7]/60",
    defaultBorder: "border-[#FEF3C7] hover:border-[#FCD34D]",
    selectedBg: "bg-[#FFFBEB]",
    selectedBorder: "border-[#F97316] ring-1 ring-[#F97316]/30",
    selectedRing: "ring-[#F97316]",
    checkBg: "bg-[#F97316]",
  },
  {
    value: "CRITICAL",
    title: "Critical",
    description: "System down or urgent issue",
    dotColor: "bg-[#EF4444]",
    defaultBg: "bg-[#FEF2F2]/70 hover:bg-[#FEE2E2]/60",
    defaultBorder: "border-[#FEE2E2] hover:border-[#FCA5A5]",
    selectedBg: "bg-[#FEF2F2]",
    selectedBorder: "border-[#EF4444] ring-1 ring-[#EF4444]/30",
    selectedRing: "ring-[#EF4444]",
    checkBg: "bg-[#EF4444]",
  },
];

interface PrioritySelectorProps {
  value: TicketPriority;
  onChange: (value: TicketPriority) => void;
  disabled?: boolean;
}

export function PrioritySelector({
  value,
  onChange,
  disabled = false,
}: PrioritySelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {PRIORITY_OPTIONS.map((opt) => {
        const isSelected = value === opt.value;

        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={`relative flex flex-col justify-center text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer select-none outline-none ${
              isSelected
                ? `${opt.selectedBg} ${opt.selectedBorder} border-2 shadow-xs`
                : `${opt.defaultBg} ${opt.defaultBorder} border`
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {isSelected && (
              <div
                className={`absolute top-3 right-3 size-5 rounded-full ${opt.checkBg} text-white flex items-center justify-center shadow-xs animate-in zoom-in-75 duration-150`}
              >
                <Check className="size-3 stroke-[3]" />
              </div>
            )}

            <div className="flex items-center gap-2 mb-1.5">
              <span
                className={`size-2.5 rounded-full shrink-0 ${opt.dotColor}`}
                aria-hidden="true"
              />
              <span className="font-semibold text-sm text-gray-900 tracking-tight">
                {opt.title}
              </span>
            </div>

            <p className="text-xs text-gray-500 leading-snug pr-4">
              {opt.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}
