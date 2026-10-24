"use client";

import { Circle, CircleCheck } from "lucide-react";

type PasswordRules = {
  hasLength: boolean;
  hasNumSym: boolean;
  hasCase: boolean;
};

export function evaluatePassword(value: string): PasswordRules {
  return {
    hasLength: value.length >= 8,
    hasNumSym: /[0-9!@#$%^&*(),.?":{}|<>]/.test(value),
    hasCase: /[a-z]/.test(value) && /[A-Z]/.test(value),
  };
}

const STRENGTH_LEVELS = {
  empty: { count: 0, barColor: "bg-[#c8c5d0]", label: "Empty", labelColor: "text-[#787680]" },
  weak: { count: 1, barColor: "bg-[#ba1a1a]", label: "Weak", labelColor: "text-[#ba1a1a]" },
  fair: { count: 2, barColor: "bg-amber-500", label: "Fair", labelColor: "text-amber-600" },
  good: { count: 3, barColor: "bg-sky-500", label: "Good", labelColor: "text-sky-700" },
  strong: { count: 4, barColor: "bg-emerald-500", label: "Strong", labelColor: "text-emerald-700" },
} as const;

function getStrengthLevel(rules: PasswordRules, rawLength: number) {
  const score =
    (rules.hasLength ? 1 : 0) +
    (rules.hasNumSym ? 1 : 0) +
    (rules.hasCase ? 1 : 0) +
    (rawLength >= 12 ? 1 : 0);

  if (rawLength === 0) return STRENGTH_LEVELS.empty;
  if (score <= 1) return STRENGTH_LEVELS.weak;
  if (score === 2) return STRENGTH_LEVELS.fair;
  if (score === 3) return STRENGTH_LEVELS.good;
  return STRENGTH_LEVELS.strong;
}

const REQUIRED_STYLES = {
  met: {
    text: "text-emerald-600",
    icon: <CircleCheck className="size-3.5" strokeWidth={2} />,
  },
  unmet: {
    text: "text-[#47464f]/70",
    icon: <Circle className="size-3.5" strokeWidth={2} />,
  },
} as const;

function RequirementItem({ met, label }: { met: boolean; label: string }) {
  const styles = met ? REQUIRED_STYLES.met : REQUIRED_STYLES.unmet;
  return (
    <div className={`flex items-center gap-1 transition-colors ${styles.text}`}>
      {styles.icon}
      <span>{label}</span>
    </div>
  );
}

/** Password strength meter with the compact requirement checklist. */
export function PasswordStrengthMeter({ password }: { password: string }) {
  const rules = evaluatePassword(password);
  const strength = getStrengthLevel(rules, password.length);

  return (
    <div className="mt-2.5 space-y-2">
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5 flex-1">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                index < strength.count ? strength.barColor : "bg-[#c8c5d0]"
              }`}
            />
          ))}
        </div>
        <span
          className={`text-[11px] font-semibold uppercase tracking-wider pl-2 ${strength.labelColor}`}
        >
          {strength.label}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1.5 text-[11px] pt-1">
        <RequirementItem met={rules.hasLength} label="8+ characters" />
        <RequirementItem met={rules.hasNumSym} label="Num &amp; symbol" />
        <RequirementItem met={rules.hasCase} label="Mixed case" />
      </div>
    </div>
  );
}
