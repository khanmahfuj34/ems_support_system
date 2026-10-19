"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, School, X } from "lucide-react";
import { Inter } from "next/font/google";
import { useAuth } from "@/providers/auth-provider";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-navbar-inter",
});

const NAV_LINKS = [
  { label: "Home", href: "/", active: true },
  { label: "About", href: "#about", active: false },
  { label: "Features", href: "#features", active: false },
  { label: "Contact", href: "#contact", active: false },
  { label: "Support Desk", href: "/support-desk/new", active: false },
];

export function SiteNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, status, logout } = useAuth();

  const isAuthenticated = status !== "checking" && status !== "error" && user !== null;

  return (
    <header
      className={`${inter.variable} font-[family-name:var(--font-navbar-inter)] sticky top-0 w-full z-50 bg-white dark:bg-[#1e1b4b] border-b border-[#c8c5d0]/30 dark:border-[#787680]/20 shadow-sm dark:shadow-none`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between h-16">
        {/* Brand Crest / Logo */}
        <a
          className="flex items-center gap-3 group transition-all duration-200 ease-in-out active:scale-[0.98]"
          href="#home"
        >
          <div className="w-10 h-10 rounded-lg bg-[#1e1b4b] dark:bg-[#1e1b4b] text-white flex items-center justify-center border border-[#c8c5d0]/30 dark:border-[#787680]/30 shadow-sm">
            <School className="size-6" strokeWidth={2} />
          </div>
          <div className="flex flex-col">
            <span className="text-[18px] leading-6 font-bold tracking-tight text-[#070235] dark:text-[#f8f9ff]">
              EduLearn
            </span>
            <span className="text-[10px] leading-4 uppercase font-bold tracking-widest text-[#006591] -mt-1">
              Academic Platform
            </span>
          </div>
        </a>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-8" aria-label="Main navigation">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                link.active
                  ? "text-sm leading-5 font-semibold text-[#006591] dark:text-[#89ceff] border-b-2 border-[#006591] dark:border-[#89ceff] pb-1"
                  : "text-sm leading-5 font-medium text-[#47464f] dark:text-[#d5e3fc] hover:text-[#070235] dark:hover:text-[#f8f9ff] border-b-2 border-transparent pb-1 transition-colors"
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Trailing Action Buttons */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <button
              type="button"
              className="px-5 py-2 text-sm leading-5 font-medium text-white bg-[#1e1b4b] hover:bg-[#070235] dark:bg-[#1e1b4b] dark:hover:bg-[#2a265e] rounded-lg shadow-sm transition-all duration-150 hover:shadow-md cursor-pointer"
              onClick={() => logout()}
            >
              Logout
            </button>
          ) : status === "checking" ? null : (
            <>
              <Link
                className="px-4 py-2 text-sm leading-5 font-medium text-[#070235] hover:text-[#006591] border border-[#c8c5d0]/60 dark:border-[#787680]/40 rounded-lg bg-white dark:bg-transparent transition-colors duration-150"
                href="/login"
              >
                Sign In
              </Link>
              <Link
                className="px-5 py-2 text-sm leading-5 font-medium text-white bg-[#1e1b4b] hover:bg-[#070235] dark:bg-[#1e1b4b] dark:hover:bg-[#2a265e] rounded-lg shadow-sm transition-all duration-150 hover:shadow-md"
                href="/register"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          type="button"
          className="md:hidden w-10 h-10 rounded-lg flex items-center justify-center text-[#070235] border border-[#c8c5d0]/60"
          aria-expanded={isOpen}
          aria-controls="mobile-nav-menu"
          aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
          onClick={() => setIsOpen((open) => !open)}
        >
          {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile Navigation Panel */}
      {isOpen && (
        <div
          id="mobile-nav-menu"
          className="md:hidden border-t border-[#c8c5d0]/30 bg-white"
        >
          <nav className="px-4 py-3 flex flex-col gap-1" aria-label="Mobile navigation">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={
                  link.active
                    ? "px-3 py-2 rounded-md text-sm leading-5 font-semibold text-[#006591]"
                    : "px-3 py-2 rounded-md text-sm leading-5 font-medium text-[#47464f] hover:bg-[#eff4ff] hover:text-[#070235] transition-colors"
                }
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="px-4 pb-4 pt-1 flex items-center gap-3">
            {isAuthenticated ? (
              <button
                type="button"
                className="w-full px-4 py-2.5 text-center text-sm leading-5 font-medium text-white bg-[#1e1b4b] hover:bg-[#070235] rounded-lg shadow-sm transition-all duration-150 hover:shadow-md cursor-pointer"
                onClick={() => {
                  setIsOpen(false);
                  logout();
                }}
              >
                Logout
              </button>
            ) : status === "checking" ? null : (
              <>
                <Link
                  className="flex-1 px-4 py-2.5 text-center text-sm leading-5 font-medium text-[#070235] border border-[#c8c5d0]/60 rounded-lg bg-white transition-colors duration-150"
                  href="/login"
                >
                  Sign In
                </Link>
                <Link
                  className="flex-1 px-5 py-2.5 text-center text-sm leading-5 font-medium text-white bg-[#1e1b4b] hover:bg-[#070235] rounded-lg shadow-sm transition-all duration-150 hover:shadow-md"
                  href="/register"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
