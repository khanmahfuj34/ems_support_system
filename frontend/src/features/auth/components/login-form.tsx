"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  BookOpen,
  CircleAlert,
  CircleCheck,
  CircleX,
  Eye,
  EyeOff,
  Lock,
  Mail,
} from "lucide-react";

import { loginSchema, type LoginValues } from "@/features/auth/schemas/auth.schema";
import { getApiErrorMessage } from "@/features/auth/services/auth.service";
import { USER_ROLE } from "@/features/auth/types/auth.types";
import { dashboardForRole } from "@/features/auth/utils/role-redirect";
import { useAuth } from "@/providers/auth-provider";

type AuthStatus = "default" | "error" | "loading";

const STATE_BUTTON_CLASS =
  "px-2 py-0.5 rounded text-xs font-medium transition-colors duration-150";
const STATE_BUTTON_ACTIVE_CLASS = `${STATE_BUTTON_CLASS} bg-white text-[#070235] shadow-xs border border-[#c8c5d0]/30`;
const STATE_BUTTON_IDLE_CLASS = `${STATE_BUTTON_CLASS} text-[#47464f] hover:text-[#070235]`;

const FIELD_ERROR_CLASS =
  "border-[#ba1a1a] focus:ring-[#ba1a1a] focus:border-[#ba1a1a]";

function FieldErrorMessage({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1 text-xs leading-4 text-[#ba1a1a] mt-1.5">
      <CircleX className="size-3.5 shrink-0" strokeWidth={2} />
      {message}
    </p>
  );
}

function sanitizeRedirectTarget(target: string | null): string {
  if (target && target.startsWith("/") && !target.startsWith("//") && !target.startsWith("/\\")) {
    return target;
  }
  return "/";
}

export function LoginForm({ adminOnly = false }: { adminOnly?: boolean }) {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<AuthStatus>("default");
  const [formError, setFormError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login, logout } = useAuth();
  const router = useRouter();

  const registrationSuccess = searchParams.get("registered") === "1";
  const redirectTarget = sanitizeRedirectTarget(searchParams.get("next"));
  const hasExplicitNext = Boolean(searchParams.get("next"));

  const {
    register,
    handleSubmit,
    clearErrors,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: true,
    },
  });

  const selectState = (next: AuthStatus) => {
    setStatus(next);
    if (next !== "error") {
      clearErrors();
      setFormError("");
    } else {
      setFormError("Please check your email and password and try again.");
    }
  };

  const onSubmit = handleSubmit(
    async ({ email, password }) => {
      // The public sign-in API is shared by all roles; the role stored in the
      // database decides where each account may go.
      setStatus("loading");
      setFormError("");
      try {
        const user = await login({ email, password });

        if (adminOnly && user.roleId !== USER_ROLE.ADMIN) {
          // Keep non-admin credentials out of any admin session.
          logout();
          setFormError("This account does not have administrator access.");
          setStatus("error");
          return;
        }

        const next = hasExplicitNext
          ? redirectTarget
          : dashboardForRole(user.roleId);
        router.replace(next);
      } catch (error) {
        setFormError(getApiErrorMessage(error, "Sign in failed. Please try again."));
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
    <div className="w-full lg:w-1/2 xl:w-[48%] flex flex-col justify-between bg-[#f8f9ff] min-h-screen lg:min-h-0 overflow-y-auto">
      {/* Top bar: mobile brand mark + desktop status label */}
      <div className="w-full px-6 lg:px-12 pt-6 pb-2 flex items-center justify-between border-b border-[#c8c5d0]/30 bg-white/50 backdrop-blur">
        {/* Mobile/tablet compact brand header */}
        <div className="flex lg:hidden items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-[#070235] text-white flex items-center justify-center">
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
            aria-pressed={status === "error"}
            className={status === "error" ? STATE_BUTTON_ACTIVE_CLASS : STATE_BUTTON_IDLE_CLASS}
            onClick={() => selectState("error")}
          >
            Error
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
          {/* Authentication header */}
          <div className="mb-8">
            <h2 className="text-2xl leading-8 font-bold text-[#070235] tracking-[-0.015em] font-[family-name:var(--font-auth-jakarta)]">
              {adminOnly ? "Administrator Sign In" : "Welcome Back"}
            </h2>
            <p className="text-sm leading-5 text-[#47464f] mt-1.5">
              {adminOnly
                ? "Sign in to review support tickets and respond to requests."
                : "Sign in to continue your scholarly inquiry and coursework."}
            </p>
          </div>

          {/* Live error notification banner */}
          {status === "error" && (
            <div className="mb-6 p-3.5 rounded-lg bg-[#ffdad6]/60 border border-[#ba1a1a]/30 text-[#ba1a1a] flex items-start gap-2.5 transition-all">
              <CircleAlert className="size-[18px] shrink-0 mt-0.5" strokeWidth={2} />
              <div className="text-sm leading-5">
                <span className="font-semibold block">Authentication Unsuccessful</span>
                <span className="text-xs leading-4 text-[#93000a]">
                  {formError}
                </span>
              </div>
            </div>
          )}

          {registrationSuccess && (
            <div
              role="status"
              className="mb-6 p-3.5 rounded-lg bg-emerald-50 border border-emerald-600/20 text-emerald-800 flex items-start gap-2.5"
            >
              <CircleCheck className="size-[18px] shrink-0 mt-0.5" strokeWidth={2} />
              <div className="text-sm leading-5">
                <span className="font-semibold block">Registration successful</span>
                <span className="text-xs leading-4">Your account is ready. Sign in to continue.</span>
              </div>
            </div>
          )}

          {/* Main sign-in form */}
          <form className="space-y-5" onSubmit={onSubmit} noValidate>
            {/* Email field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm leading-5 font-semibold text-[#0d1c2e] mb-1.5"
              >
                Institutional or Personal Email
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#787680]">
                  <Mail className="size-[19px]" strokeWidth={2} />
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@university.edu or scholar@email.com"
                  className={`w-full h-10 pl-10 pr-3.5 text-[#0d1c2e] text-sm leading-5 bg-white border border-[#c8c5d0] rounded-lg placeholder:text-[#787680]/70 focus:outline-none focus:ring-2 focus:ring-[#006591] focus:border-[#006591] transition-all ${
                    errors.email ? FIELD_ERROR_CLASS : ""
                  }`}
                  {...register("email")}
                />
              </div>
              <FieldErrorMessage message={errors.email?.message} />
            </div>

            {/* Password field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-sm leading-5 font-semibold text-[#0d1c2e]"
                >
                  Password
                </label>
                <a
                  className="text-xs leading-4 text-[#006591] hover:underline font-semibold transition-colors duration-150"
                  href="#"
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#787680]">
                  <Lock className="size-[19px]" strokeWidth={2} />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
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
              <FieldErrorMessage message={errors.password?.message} />
            </div>

            {/* Remember me workstation checkbox */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 rounded border-[#c8c5d0] accent-[#1e1b4b] cursor-pointer focus:ring-[#006591] focus:outline-none"
                  {...register("rememberMe")}
                />
                <label
                  htmlFor="remember-me"
                  className="ml-2 block text-sm leading-5 text-[#47464f] cursor-pointer select-none"
                >
                  Keep me signed in for this session
                </label>
              </div>
            </div>

            {/* Submit button (with loading state architecture) */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 flex items-center justify-center px-5 rounded-lg bg-[#070235] text-white text-sm leading-5 font-semibold hover:bg-[#1e1b4b] active:scale-[0.99] transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#006591] disabled:opacity-100 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="animate-spin h-5 w-5 text-white"
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
                    <span>Authenticating Identity...</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <span>Sign In</span>
                    <ArrowRight className="size-4" strokeWidth={2} />
                  </span>
                )}
              </button>
            </div>

            {/* Crisp divider: OR */}
            <div className="relative my-6">
              <div aria-hidden="true" className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#c8c5d0]/40" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-[#f8f9ff] text-[#787680] text-xs leading-4 uppercase tracking-wider font-semibold">
                  OR
                </span>
              </div>
            </div>

            {/* Social SSO auth: Google */}
            <div>
              <button
                type="button"
                className="w-full h-11 flex items-center justify-center gap-3 px-4 rounded-lg bg-white border border-[#c8c5d0] hover:bg-[#eff4ff] text-[#0d1c2e] text-sm leading-5 font-medium transition-all shadow-xs active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#006591]/40"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                <span>Continue with Google</span>
              </button>
            </div>

            {/* Registration footer prompt (public registration is USER-only) */}
            {!adminOnly && (
              <div className="text-center pt-4">
                <p className="text-sm leading-5 text-[#47464f]">
                  Don&apos;t have an account?{" "}
                  <Link
                    className="text-sm leading-5 font-semibold text-[#070235] hover:text-[#006591] underline underline-offset-4 decoration-[#070235]/40 hover:decoration-[#006591] transition-colors ml-1"
                    href="/register"
                  >
                    Create one
                  </Link>
                </p>
              </div>
            )}
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
