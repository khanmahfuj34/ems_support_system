"use client";

import Link from "next/link";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  Hash,
  KeyRound,
  Layers,
  Loader2,
  Lock,
  Mail,
  Pencil,
  Phone,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { getCurrentUser } from "@/features/auth/services/auth.service";
import { USER_ROLE } from "@/features/auth/types/auth.types";
import type { UserProfile } from "@/features/auth/types/auth.types";
import { useAuth } from "@/providers/auth-provider";
import { getApiErrorMessage } from "@/lib/api/api-errors";

/**
 * USER "My Profile" page (frontend UI only).
 *
 * Data comes from the authenticated `GET /auth/me` profile
 * (`id`, `name`, `email`, `roleId`, `isActive`, `createdAt`). The user model
 * has no phone field and no password-change timestamp, so Phone is omitted
 * and password last-changed shows "—" rather than inventing data. Edit
 * Profile / Change Password are visual affordances only — no functional
 * edit or password flow is implemented here.
 */
const EMPTY = "—";

function initialsFor(name: string) {
  const initials = name
    .split(/\s+/)
    .map((part) => part.replace(/[^a-zA-Z]/g, ""))
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return initials || "?";
}

function formatMemberSince(iso: string | null | undefined) {
  if (!iso) return EMPTY;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return EMPTY;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function roleLabel(roleId: number) {
  return roleId === USER_ROLE.ADMIN ? "Admin" : "User";
}

export function MyProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    controller.current?.abort();
    const abortController = new AbortController();
    controller.current = abortController;

    getCurrentUser()
      .then((data) => {
        if (abortController.signal.aborted) return;
        setProfile(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (abortController.signal.aborted) return;
        setProfile(null);
        setError(getApiErrorMessage(err, "Failed to load your profile."));
        setLoading(false);
      });

    return () => abortController.abort();
  }, [retryKey]);

  const retry = () => {
    setLoading(true);
    setError(null);
    setRetryKey((value) => value + 1);
  };

  // While loading or on error, still render the reference chrome with dashes.
  const name = profile?.name ?? user?.name ?? EMPTY;
  const email = profile?.email ?? user?.email ?? EMPTY;
  const roleId = profile?.roleId ?? user?.roleId ?? USER_ROLE.USER;
  const roleName = roleLabel(roleId);
  const initials = loading ? "…" : initialsFor(profile?.name ?? user?.name ?? "");
  const isActive = profile?.isActive ?? true;
  const createdAt = profile?.createdAt ?? null;
  const rawId = profile?.id ?? user?.id ?? null;
  const userIdLabel = rawId ? `#${rawId}` : EMPTY;
  const memberSince = formatMemberSince(createdAt);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1.5 text-xs text-gray-500"
      >
        <Link href="/dashboard" className="hover:text-gray-900">
          Home
        </Link>
        <ChevronRight className="size-3.5 text-gray-400" />
        <span className="font-medium text-gray-900">Profile</span>
      </nav>

      {/* Heading */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
          My Profile
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your personal information, account details, and security.
        </p>
      </div>

      {error ? (
        <div
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-500" />
          <div className="min-w-0 flex-1 text-xs">
            <p className="font-semibold text-red-900">
              Could not load your profile
            </p>
            <p className="mt-1">{error}</p>
            <button
              type="button"
              onClick={retry}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-[11px] font-medium text-red-700 hover:bg-red-100/50"
            >
              <RefreshCw className="size-3" /> Retry
            </button>
          </div>
        </div>
      ) : null}

      {/* 1. Profile Header */}
      <section className="relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-xs">
        {/* Decorative light-blue wash on the right half, clipped to the card */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 bg-gradient-to-br from-[#EFF6FF] via-[#DBEAFE]/80 to-[#BFDBFE]/60 sm:block [clip-path:ellipse(70%_120%_at_80%_50%)]"
        />
        <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex min-w-0 items-center gap-4 sm:gap-5">
            {loading ? (
              <div
                className="flex size-20 shrink-0 items-center justify-center rounded-full bg-gray-100 sm:size-24"
                role="status"
                aria-label="Loading profile"
              >
                <Loader2 className="size-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="relative shrink-0">
                <div className="flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-[#3B82F6] to-[#1D4ED8] text-2xl font-bold text-white shadow-sm sm:size-24 sm:text-3xl">
                  {initials}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 flex size-7 items-center justify-center rounded-full bg-white shadow ring-1 ring-gray-100">
                  <CircleUserRound className="size-4 text-[#2563EB]" />
                </span>
              </div>
            )}
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold tracking-tight text-gray-900 sm:text-xl">
                {loading ? "Loading…" : name}
              </h2>
              <p className="mt-1.5 flex min-w-0 items-center gap-1.5 text-sm text-gray-500">
                <Mail className="size-4 shrink-0 text-gray-400" />
                <span className="truncate">{loading ? EMPTY : email}</span>
              </p>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-[#F0F5FF] px-2.5 py-1 text-xs font-semibold text-[#2563EB]">
                <UserRound className="size-3.5" />
                {roleName}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-[#2563EB] shadow-2xs transition-colors hover:bg-blue-50/60"
          >
            <Pencil className="size-4" />
            Edit Profile
          </button>
        </div>
      </section>

      {/* 2 + 3 + 4. Two-column desktop grid, single column on mobile */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        {/* 2. Personal Information */}
        <section className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs sm:p-6">
          <header className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#EFF6FF]">
              <UserRound className="size-5 text-[#2563EB]" />
            </span>
            <div>
              <h3 className="text-base font-bold tracking-tight text-gray-900">
                Personal Information
              </h3>
              <p className="mt-0.5 text-xs text-gray-500">
                Your personal details and contact information.
              </p>
            </div>
          </header>

          <dl className="mt-6 divide-y divide-gray-100">
            <div className="flex items-center justify-between gap-4 py-3.5">
              <dt className="flex items-center gap-2.5 text-sm font-semibold text-gray-700">
                <UserRound className="size-4 shrink-0 text-gray-400" />
                Full Name
              </dt>
              <dd className="truncate text-sm text-gray-800">
                {loading ? "…" : name}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3.5">
              <dt className="flex items-center gap-2.5 text-sm font-semibold text-gray-700">
                <Mail className="size-4 shrink-0 text-gray-400" />
                Email Address
              </dt>
              <dd className="truncate text-sm text-gray-800">
                {loading ? "…" : email}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3.5">
              <dt className="flex items-center gap-2.5 text-sm font-semibold text-gray-700">
                <Phone className="size-4 shrink-0 text-gray-400" />
                Phone Number
              </dt>
              <dd className="text-sm text-gray-800">{EMPTY}</dd>
            </div>
          </dl>
        </section>

        {/* Right column: Account Information + Security stacked */}
        <div className="space-y-6">
          {/* 3. Account Information */}
          <section className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs sm:p-6">
            <header className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#EFF6FF]">
                <Layers className="size-5 text-[#2563EB]" />
              </span>
              <div>
                <h3 className="text-base font-bold tracking-tight text-gray-900">
                  Account Information
                </h3>
                <p className="mt-0.5 text-xs text-gray-500">
                  Your EMS support account details.
                </p>
              </div>
            </header>

            <dl className="mt-6 divide-y divide-gray-100">
              <div className="flex items-center justify-between gap-4 py-3.5">
                <dt className="flex items-center gap-2.5 text-sm font-semibold text-gray-700">
                  <Hash className="size-4 shrink-0 text-gray-400" />
                  User ID
                </dt>
                <dd className="shrink-0 text-sm text-gray-800">
                  {loading ? "…" : userIdLabel}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3.5">
                <dt className="flex items-center gap-2.5 text-sm font-semibold text-gray-700">
                  <UserRound className="size-4 shrink-0 text-gray-400" />
                  Account Role
                </dt>
                <dd>
                  <span className="inline-flex items-center rounded-full bg-[#F0F5FF] px-2.5 py-1 text-xs font-semibold text-[#2563EB]">
                    {roleName}
                  </span>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3.5">
                <dt className="flex items-center gap-2.5 text-sm font-semibold text-gray-700">
                  <CalendarDays className="size-4 shrink-0 text-gray-400" />
                  Member Since
                </dt>
                <dd className="shrink-0 text-sm text-gray-800">
                  {loading ? "…" : memberSince}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3.5">
                <dt className="flex items-center gap-2.5 text-sm font-semibold text-gray-700">
                  <CheckCircle2 className="size-4 shrink-0 text-gray-400" />
                  Account Status
                </dt>
                <dd>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      isActive
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    <CheckCircle2
                      className={`size-3.5 ${
                        isActive ? "text-emerald-600" : "text-gray-400"
                      }`}
                    />
                    {isActive ? "Active" : "Inactive"}
                  </span>
                </dd>
              </div>
            </dl>
          </section>

          {/* 4. Security */}
          <section className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs sm:p-6">
            <header className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#EFF6FF]">
                <ShieldCheck className="size-5 text-[#2563EB]" />
              </span>
              <div>
                <h3 className="text-base font-bold tracking-tight text-gray-900">
                  Security
                </h3>
                <p className="mt-0.5 text-xs text-gray-500">
                  Manage your password and keep your account secure.
                </p>
              </div>
            </header>

            <div className="mt-6 flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gray-50 ring-1 ring-gray-100">
                  <Lock className="size-4 text-gray-600" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Password</p>
                  <p className="text-xs text-gray-500">
                    Last changed {EMPTY}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-[#2563EB] shadow-2xs transition-colors hover:bg-blue-50/60"
              >
                <KeyRound className="size-4" />
                Change Password
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
