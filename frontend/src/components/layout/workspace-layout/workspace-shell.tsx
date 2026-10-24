"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GraduationCap,
  Home,
  LayoutDashboard,
  LifeBuoy,
  Ticket,
  Bell,
  User,
  UserRound,
  Headphones,
  ExternalLink,
  Search,
  CircleUser,
  BarChart3,
  Settings,
  ChevronDown,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { USER_ROLE } from "@/features/auth/types/auth.types";
import { dashboardForRole } from "@/features/auth/utils/role-redirect";

interface WorkspaceShellProps {
  children: React.ReactNode;
}

/**
 * Shared workspace chrome (sidebar + top bar) for authenticated users and
 * admins. Navigation is role-aware: admins see the admin console entries,
 * regular users see user-only pages.
 */
export function WorkspaceShell({ children }: WorkspaceShellProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const displayName = user?.name || "Mahfuj Khan";
  const userInitials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Role-aware navigation: regular users see user features; admins see the
  // admin console entries instead of user-only pages.
  const isAdmin = user?.roleId === USER_ROLE.ADMIN;
  const navItems = isAdmin
    ? [
        {
          label: "Admin Dashboard",
          href: "/admin/dashboard",
          icon: Home,
          isActive: pathname.startsWith("/admin"),
        },
        {
          label: "Support Desk",
          href: "/support-desk",
          icon: CircleUser,
          isActive: pathname.startsWith("/support-desk"),
        },
        // Admin console sections without routes yet are rendered as disabled
        // navigation affordances instead of dead links.
        {
          label: "Users",
          href: "",
          icon: UserRound,
          isActive: false,
          disabled: true,
        },
        {
          label: "Notifications",
          href: "",
          icon: Bell,
          isActive: false,
          disabled: true,
        },
        {
          label: "Reports",
          href: "",
          icon: BarChart3,
          isActive: false,
          disabled: true,
        },
        {
          label: "Settings",
          href: "",
          icon: Settings,
          isActive: false,
          disabled: true,
        },
      ]
    : [
        {
          label: "Dashboard",
          href: "/dashboard",
          icon: LayoutDashboard,
          isActive: pathname === "/dashboard",
        },
        {
          label: "Support Desk",
          href: "/support-desk/new",
          icon: LifeBuoy,
          isActive: pathname.startsWith("/support-desk"),
        },
        {
          label: "My Tickets",
          href: "/tickets",
          icon: Ticket,
          isActive: pathname === "/tickets",
        },
        {
          label: "Notifications",
          href: "/notifications",
          icon: Bell,
          isActive: pathname === "/notifications",
        },
        {
          label: "Profile",
          href: "/profile",
          icon: User,
          isActive: pathname === "/profile",
        },
      ];

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col md:flex-row antialiased font-sans">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <GraduationCap className="size-6 text-[#2563EB]" />
          <span className="font-bold text-base text-gray-900 tracking-tight">
            EMS Support
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {/* Sidebar for Desktop & Mobile drawer */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen w-64 bg-white border-r border-gray-200/90 flex flex-col justify-between transition-transform duration-300 ease-in-out shrink-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div>
          {/* Logo Brand */}
          <div className="h-16 flex items-center px-6 gap-2.5 border-b border-gray-100">
            <GraduationCap className="size-6 text-[#2563EB]" />
            <span className="font-bold text-lg text-gray-900 tracking-tight">
              EMS Support
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              if ("disabled" in item && item.disabled) {
                return (
                  <span
                    key={item.label}
                    title="Coming soon"
                    aria-disabled="true"
                    className="flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-gray-400 rounded-lg cursor-not-allowed select-none"
                  >
                    <Icon className="size-4.5 shrink-0 text-gray-300" />
                    <span>{item.label}</span>
                  </span>
                );
              }
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium transition-all ${
                    item.isActive
                      ? "bg-[#EFF6FF] text-[#2563EB] border-l-[3px] border-[#2563EB] font-semibold -ml-3 pl-[17px] rounded-r-lg"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg"
                  }`}
                >
                  <Icon
                    className={`size-4.5 shrink-0 ${
                      item.isActive ? "text-[#2563EB]" : "text-gray-500"
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Help Center Box */}
        <div className="p-4">
          <div className="rounded-2xl p-4 bg-[#F0F5FF] border border-blue-100/70">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="size-7 rounded-full bg-blue-100/80 flex items-center justify-center text-[#2563EB]">
                <Headphones className="size-4 text-[#2563EB]" />
              </div>
              <h4 className="font-semibold text-sm text-gray-900">
                Need Help?
              </h4>
            </div>
            <p className="text-xs text-gray-500 mb-3 leading-relaxed">
              Check our FAQ or contact support team.
            </p>
            <a
              href="#help"
              onClick={(e) => {
                e.preventDefault();
                alert("Redirecting to EMS Knowledge Base & FAQ Center.");
              }}
              className="w-full py-2 px-3 bg-white border border-blue-200/80 rounded-lg text-xs font-medium text-[#2563EB] hover:bg-blue-50/50 transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <span>View Help Center</span>
              <ExternalLink className="size-3.5" />
            </a>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-gray-200/80 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-30">
          {/* Search Box */}
          <div className="relative flex-1 max-w-[180px] min-w-0 sm:w-72 sm:max-w-none sm:flex-none xl:w-[420px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tickets, users, categories..."
              className="w-full bg-[#F3F4F6] border-none rounded-lg pl-9 pr-3 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
            />
          </div>

          {/* Right Section: Notification & User Profile */}
          <div className="flex items-center gap-4 sm:gap-5">
            {/* Notification Bell with Badge */}
            <button
              type="button"
              className="relative p-1.5 text-gray-500 hover:text-gray-800 transition-colors"
              title="Notifications"
            >
              <Bell className="size-5" />
              <span className="absolute top-1 right-1 size-2 rounded-full bg-[#EF4444] ring-2 ring-white" />
            </button>

            {/* User Profile Avatar & Name */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="size-8 rounded-full bg-[#2563EB] text-white font-semibold text-xs flex items-center justify-center shrink-0">
                  {userInitials}
                </div>
                <span className="hidden sm:inline font-medium text-xs text-gray-800">
                  {displayName}
                </span>
                <ChevronDown className="size-3.5 text-gray-400" />
              </button>

              {/* User Dropdown */}
              {userDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-40 animate-in fade-in-50 zoom-in-95">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-900 truncate">
                      {displayName}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">
                      {user?.email || "user@example.com"}
                    </p>
                  </div>
                  <Link
                    href={dashboardForRole(user?.roleId ?? USER_ROLE.USER)}
                    onClick={() => setUserDropdownOpen(false)}
                    className="block px-4 py-2 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    {isAdmin ? "Admin Dashboard" : "User Dashboard"}
                  </Link>
                  <Link
                    href="/profile"
                    onClick={() => setUserDropdownOpen(false)}
                    className="block px-4 py-2 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    My Profile
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      logout();
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-1.5"
                  >
                    <LogOut className="size-3.5" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
