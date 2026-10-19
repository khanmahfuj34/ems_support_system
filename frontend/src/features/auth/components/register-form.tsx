"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  BookOpen,
  Circle,
  CircleAlert,
  CircleCheck,
  CircleX,
  Eye,
  EyeOff,
  Lock,
  Mail,
  RotateCcwKey,
  User,
  X,
} from "lucide-react";

import { registerSchema, type RegisterValues } from "@/features/auth/schemas/auth.schema";
import { getApiErrorMessage, registerAccount } from "@/features/auth/services/auth.service";

type RegisterStatus = "default" | "error" | "loading";

const STATE_BUTTON_CLASS =
  "px-2 py-0.5 rounded text-xs font-medium transition-colors duration-150";
const STATE_BUTTON_ACTIVE_CLASS = `${STATE_BUTTON_CLASS} bg-white text-[#070235] shadow-xs border border-[#c8c5d0]/30`;
const STATE_BUTTON_IDLE_CLASS = `${STATE_BUTTON_CLASS} text-[#47464f] hover:text-[#070235]`;

const FIELD_ERROR_CLASS =
  "ring-1 ring-[#ba1a1a] border-[#ba1a1a] focus:ring-[#ba1a1a] focus:border-[#ba1a1a]";

type PasswordRules = {
  hasLength: boolean;
  hasNumSym: boolean;
  hasCase: boolean;
};

function evaluatePassword(value: string): PasswordRules {
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

function FieldErrorMessage({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1 text-xs leading-4 text-[#ba1a1a] mt-1.5">
      <CircleX className="size-3.5 shrink-0" strokeWidth={2} />
      {message}
    </p>
  );
}

function RequirementItem({ met, label }: { met: boolean; label: string }) {
  const styles = met ? REQUIRED_STYLES.met : REQUIRED_STYLES.unmet;
  return (
    <div className={`flex items-center gap-1 transition-colors ${styles.text}`}>
      {styles.icon}
      <span>{label}</span>
    </div>
  );
}

export function RegisterForm() {
  const [status, setStatus] = useState<RegisterStatus>("default");
  const [formError, setFormError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    clearErrors,
    control,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      agreeToTerms: true,
    },
  });

  const passwordValue = useWatch({ control, name: "password" }) ?? "";
  const confirmPasswordValue = useWatch({ control, name: "confirmPassword" }) ?? "";

  const rules = evaluatePassword(passwordValue);
  const strength = getStrengthLevel(rules, passwordValue.length);
  const passwordsMatch = confirmPasswordValue.length > 0 && passwordValue === confirmPasswordValue;

  const selectState = (next: RegisterStatus) => {
    setStatus(next);
    if (next !== "error") {
      clearErrors();
      setFormError("");
    } else {
      setFormError("Registration failed. Please try again.");
    }
  };

  const onSubmit = handleSubmit(
    async ({ fullName, email, password }) => {
      setStatus("loading");
      setFormError("");

      try {
        await registerAccount({ fullName, email, password });
        const next = new URLSearchParams(window.location.search).get("next");
        router.replace(
          next && next.startsWith("/")
            ? `/login?registered=1&next=${encodeURIComponent(next)}`
            : "/login?registered=1",
        );
      } catch (error) {
        setFormError(getApiErrorMessage(error, "Registration failed. Please try again."));
        setStatus("error");
      }
    },
    () => {
      setFormError("Please correct the highlighted fields.");
      setStatus("error");
    },
  );

  const isLoading = status === "loading";

  return (
    <div className="w-full lg:w-1/2 xl:w-[48%] flex flex-col justify-between bg-white min-h-screen lg:min-h-0 overflow-y-auto">
      {/* Top bar: mobile brand mark + desktop status label */}
      <div className="w-full px-6 lg:px-12 pt-6 pb-2 flex items-center justify-between border-b border-[#c8c5d0]/30 bg-white/50 backdrop-blur">
        {/* Mobile/tablet compact brand header */}
        <div className="flex lg:hidden items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-[#1e1b4b] text-white flex items-center justify-center">
            <BookOpen className="size-4" strokeWidth={2} />
          </div>
          <span className="text-base font-bold text-[#070235] tracking-tight font-[family-name:var(--font-auth-jakarta)]">
            Aethel Academy
          </span>
        </div>
        <div className="hidden lg:flex items-center gap-1.5 text-xs font-medium text-[#47464f]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Institutional SSO Gateway v4.2</span>
        </div>
        {/* Interactive state inspector bar */}
        <div className="flex items-center gap-1 bg-[#eff4ff] p-1 rounded-lg border border-[#c8c5d0]/40 text-xs">
          <span className="text-[11px] font-semibold text-[#47464f] px-1.5 hidden sm:inline">
            STATE:
          </span>
          <button
            type="button"
            aria-pressed={status === "default"}
            className={status === "default" ? STATE_BUTTON_ACTIVE_CLASS : STATE_BUTTON_IDLE_CLASS}
            onClick={() => selectState("default")}
          >
            Default
          </button>
          <button
            type="button"
            aria-pressed={status === "default"}
            className={STATE_BUTTON_IDLE_CLASS}
            onClick={() => selectState("default")}
          >
            Password Met
          </button>
          <button
            type="button"
            aria-pressed={status === "error"}
            className={status === "error" ? STATE_BUTTON_ACTIVE_CLASS : STATE_BUTTON_IDLE_CLASS}
            onClick={() => selectState("error")}
          >
            Inline Error
          </button>
          <button
            type="button"
            aria-pressed={isLoading}
            className={isLoading ? STATE_BUTTON_ACTIVE_CLASS : STATE_BUTTON_IDLE_CLASS}
            onClick={() => selectState("loading")}
          >
            Loading
          </button>
        </div>
      </div>

      {/* Center form content area */}
      <div className="flex-1 flex items-center justify-center px-6 lg:px-12 py-10">
        <div className="w-full max-w-md mx-auto">
          {/* Form header */}
          <div className="mb-6">
            <h2 className="text-2xl leading-8 font-bold text-[#070235] tracking-[-0.015em] font-[family-name:var(--font-auth-jakarta)]">
              Create Your Account
            </h2>
            <p className="text-sm leading-5 text-[#47464f] mt-1">Join our learning community.</p>
          </div>

          {/* Live error banner */}
          {status === "error" && (
            <div className="mb-5 p-3 rounded-lg bg-[#ffdad6]/60 border border-[#ba1a1a]/30 text-[#ba1a1a] flex items-start gap-2.5">
              <CircleAlert className="size-5 shrink-0" strokeWidth={2} />
              <div className="text-sm leading-5">
                <span className="font-semibold block">Registration Issue Detected</span>
                <span className="text-xs leading-4 text-[#93000a]">
                  {formError}
                </span>
              </div>
            </div>
          )}

          {/* Registration form */}
          <form className="space-y-4" onSubmit={onSubmit} noValidate>
            {/* Full name field */}
            <div>
              <label
                htmlFor="fullname"
                className="block text-sm leading-5 font-medium text-[#070235] mb-1.5"
              >
                Full Name <span className="text-[#ba1a1a]">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#787680]">
                  <User className="size-[18px]" strokeWidth={2} />
                </div>
                <input
                  id="fullname"
                  type="text"
                  autoComplete="name"
                  placeholder="e.g. Dr. Elena Rostova"
                  className={`w-full h-10 pl-10 pr-3.5 text-[#0d1c2e] text-sm leading-5 bg-white border border-[#c8c5d0] rounded-lg placeholder:text-[#787680]/70 focus:outline-none focus:ring-2 focus:ring-[#006591] focus:border-[#006591] transition-all ${
                    errors.fullName ? FIELD_ERROR_CLASS : ""
                  }`}
                  {...register("fullName")}
                />
              </div>
              <FieldErrorMessage message={errors.fullName?.message} />
            </div>

            {/* Email field */}
            <div>
              <label
                htmlFor="register-email"
                className="block text-sm leading-5 font-medium text-[#070235] mb-1.5"
              >
                Academic or Personal Email <span className="text-[#ba1a1a]">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#787680]">
                  <Mail className="size-[18px]" strokeWidth={2} />
                </div>
                <input
                  id="register-email"
                  type="email"
                  autoComplete="email"
                  placeholder="scholar@institution.edu"
                  className={`w-full h-10 pl-10 pr-3.5 text-[#0d1c2e] text-sm leading-5 bg-white border border-[#c8c5d0] rounded-lg placeholder:text-[#787680]/70 focus:outline-none focus:ring-2 focus:ring-[#006591] focus:border-[#006591] transition-all ${
                    status === "error" || errors.email ? FIELD_ERROR_CLASS : ""
                  }`}
                  {...register("email")}
                />
              </div>
              <FieldErrorMessage message={errors.email?.message} />
            </div>

            {/* Password field */}
            <div>
              <label
                htmlFor="register-password"
                className="block text-sm leading-5 font-medium text-[#070235] mb-1.5"
              >
                Password <span className="text-[#ba1a1a]">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#787680]">
                  <Lock className="size-[18px]" strokeWidth={2} />
                </div>
                <input
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Create a strong password"
                  className={`w-full h-10 pl-10 pr-10 text-[#0d1c2e] text-sm leading-5 bg-white border border-[#c8c5d0] rounded-lg placeholder:text-[#787680]/70 focus:outline-none focus:ring-2 focus:ring-[#006591] focus:border-[#006591] transition-all ${
                    errors.password ? FIELD_ERROR_CLASS : ""
                  }`}
                  {...register("password")}
                />
                <button
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#787680] hover:text-[#070235] transition-colors focus:outline-none"
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? (
                    <EyeOff className="size-[18px]" strokeWidth={2} />
                  ) : (
                    <Eye className="size-[18px]" strokeWidth={2} />
                  )}
                </button>
              </div>

              {/* Password strength meter & compact requirements */}
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
              <FieldErrorMessage message={errors.password?.message} />
            </div>

            {/* Confirm password field */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label
                  htmlFor="register-confirm-password"
                  className="block text-sm leading-5 font-medium text-[#070235]"
                >
                  Confirm Password <span className="text-[#ba1a1a]">*</span>
                </label>
                {confirmPasswordValue.length > 0 && (
                  <span
                    className={`text-xs font-medium flex items-center gap-1 ${
                      passwordsMatch ? "text-emerald-600" : "text-[#ba1a1a]"
                    }`}
                  >
                    {passwordsMatch ? (
                      <CircleCheck className="size-3.5" strokeWidth={2} />
                    ) : (
                      <X className="size-3.5" strokeWidth={2} />
                    )}
                    {passwordsMatch ? "Passwords match" : "Passwords do not match"}
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#787680]">
                  <RotateCcwKey className="size-[18px]" strokeWidth={2} />
                </div>
                <input
                  id="register-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                  className={`w-full h-10 pl-10 pr-10 text-[#0d1c2e] text-sm leading-5 bg-white border border-[#c8c5d0] rounded-lg placeholder:text-[#787680]/70 focus:outline-none focus:ring-2 focus:ring-[#006591] focus:border-[#006591] transition-all ${
                    errors.confirmPassword ? FIELD_ERROR_CLASS : ""
                  }`}
                  {...register("confirmPassword")}
                />
                <button
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#787680] hover:text-[#070235] transition-colors focus:outline-none"
                  type="button"
                  onClick={() => setShowConfirmPassword((visible) => !visible)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="size-[18px]" strokeWidth={2} />
                  ) : (
                    <Eye className="size-[18px]" strokeWidth={2} />
                  )}
                </button>
              </div>
              <FieldErrorMessage message={errors.confirmPassword?.message} />
            </div>

            {/* Agreement checkbox */}
            <div className="pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="mt-1 h-4 w-4 rounded border-[#c8c5d0] accent-[#1e1b4b] cursor-pointer focus:ring-[#006591] focus:outline-none"
                  {...register("agreeToTerms")}
                />
                <span className="text-xs text-[#47464f] leading-snug">
                  I agree to the{" "}
                  <a className="text-[#006591] font-medium underline hover:text-[#070235]" href="#">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a className="text-[#006591] font-medium underline hover:text-[#070235]" href="#">
                    Privacy Policy
                  </a>
                  , and consent to academic honor codes.
                </span>
              </label>
              <FieldErrorMessage message={errors.agreeToTerms?.message} />
            </div>

            {/* Primary action button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-[#070235] hover:bg-[#312e81] text-white text-sm leading-5 font-semibold rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#006591] active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin h-[18px] w-[18px] text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        fill="currentColor"
                      />
                    </svg>
                    <span>Validating Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="size-[18px]" strokeWidth={2} />
                  </>
                )}
              </button>
            </div>

            {/* Subtle divider with OR */}
            <div className="relative py-2 flex items-center justify-center">
              <div aria-hidden="true" className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#c8c5d0]/70" />
              </div>
              <div className="relative bg-white px-3 text-xs leading-4 text-[#787680] uppercase tracking-wider">
                OR
              </div>
            </div>

            {/* Google social sign-up button */}
            <div>
              <button
                type="button"
                className="w-full h-10 bg-white border border-[#c8c5d0] hover:bg-[#eff4ff] text-[#0d1c2e] text-sm leading-5 font-medium rounded-lg flex items-center justify-center gap-3 transition-colors duration-150 active:scale-[0.98]"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.67v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.16z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    fill="#EA4335"
                  />
                </svg>
                <span>Sign up with Google</span>
              </button>
            </div>

            {/* Bottom prompt: link back to sign-in */}
            <div className="pt-3 text-center">
              <p className="text-sm leading-5 text-[#47464f]">
                Already have an account?{" "}
                <Link
                  className="font-semibold text-[#006591] hover:text-[#070235] transition-colors underline underline-offset-2 ml-1"
                  href="/login"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>

      {/* Bottom institutional compliance notice */}
      <footer className="w-full px-6 lg:px-12 py-5 border-t border-[#c8c5d0]/30 text-center lg:text-left bg-white/40">
        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-[#47464f] gap-2 max-w-md mx-auto lg:max-w-none">
          <p className="text-xs leading-4">© 2025 Aethel Academy. Scholarly Rigor, Modern Discovery.</p>
          <div className="flex items-center gap-4">
            <a className="hover:text-[#070235] transition-colors" href="#">
              Terms of Service
            </a>
            <span className="text-[#c8c5d0]">•</span>
            <a className="hover:text-[#070235] transition-colors" href="#">
              Privacy Policy
            </a>
            <span className="text-[#c8c5d0]">•</span>
            <a className="hover:text-[#070235] transition-colors" href="#">
              System Status
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
