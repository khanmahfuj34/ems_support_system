"use client";

import { CircleX } from "lucide-react";

export function FieldErrorMessage({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1 text-xs leading-4 text-[#ba1a1a] mt-1.5">
      <CircleX className="size-3.5 shrink-0" strokeWidth={2} />
      {message}
    </p>
  );
}

export type StateBarButton = {
  label: string;
  pressed: boolean;
  active: boolean;
  onClick: () => void;
};

const STATE_BUTTON_BASE_CLASS =
  "px-2 py-0.5 rounded text-xs font-medium transition-colors duration-150";
const STATE_BUTTON_ACTIVE_CLASS = `${STATE_BUTTON_BASE_CLASS} bg-white text-[#070235] shadow-xs border border-[#c8c5d0]/30`;
const STATE_BUTTON_IDLE_CLASS = `${STATE_BUTTON_BASE_CLASS} text-[#47464f] hover:text-[#070235]`;

/** The interactive "STATE:" inspector bar shared by the auth forms. */
export function AuthStateBar({ buttons }: { buttons: StateBarButton[] }) {
  return (
    <div className="flex items-center gap-1 bg-[#eff4ff] p-1 rounded-lg border border-[#c8c5d0]/40 text-xs">
      <span className="text-[11px] font-semibold text-[#47464f] px-1.5 hidden sm:inline">
        STATE:
      </span>
      {buttons.map((button) => (
        <button
          key={button.label}
          type="button"
          aria-pressed={button.pressed}
          className={button.active ? STATE_BUTTON_ACTIVE_CLASS : STATE_BUTTON_IDLE_CLASS}
          onClick={button.onClick}
        >
          {button.label}
        </button>
      ))}
    </div>
  );
}
