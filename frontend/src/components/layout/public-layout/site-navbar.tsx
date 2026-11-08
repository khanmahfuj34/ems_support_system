"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, GraduationCap, Menu, X } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";

const NAV_LINKS = [
  { label: "Home", href: "/", active: true },
  { label: "About", href: "#about", active: false },
  { label: "Features", href: "#features", active: false },
  { label: "Contact", href: "#contact", active: false },
  { label: "Support Desk", href: "/support-desk/new", active: false },
];

const LOGO_BADGE_CLASSES =
  "w-10 h-10 md:w-11 md:h-11 rounded-xl bg-[#100d2b] flex items-center justify-center border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] shrink-0";

const BELL_CLASSES =
  "w-10 h-10 md:w-11 md:h-11 flex items-center justify-center rounded-xl border border-white/20 text-white hover:bg-white/10 transition-colors duration-150 shrink-0";

const SIGN_IN_CLASSES =
  "px-4 md:px-5 py-2.5 rounded-full border border-white/25 text-sm font-semibold text-white hover:bg-white/10 transition-colors duration-150 whitespace-nowrap";

const GET_STARTED_CLASSES =
  "px-5 md:px-6 py-2.5 rounded-full text-sm font-bold text-white bg-gradient-to-b from-[#7a5af8] to-[#5b3df0] hover:from-[#8b6dfa] hover:to-[#6a4cf5] shadow-[0_4px_16px_rgba(122,90,248,0.4)] transition-all duration-150 whitespace-nowrap";

const LOGOUT_CLASSES =
  "px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-[#3a2f7a]/80 hover:bg-[#4b3d9a] transition-colors duration-150 whitespace-nowrap";

export function SiteNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, status, logout } = useAuth();

  const isAuthenticated = status !== "checking" && status !== "error" && user !== null;

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full px-4 md:px-8 lg:px-12 pt-3 md:pt-4 pb-2 -mb-[84px] md:-mb-[96px]">
      <div className="max-w-[1400px] mx-auto">
        <div
          className={`flex items-center justify-between gap-3 h-16 md:h-[72px] pl-4 pr-3 md:pl-5 md:pr-4 rounded-full border border-white/15 bg-[#140f35]/60 backdrop-blur-xl backdrop-saturate-150 transition-all duration-300 ease-out ${
            isScrolled
              ? "shadow-[0_12px_40px_rgba(10,4,50,0.4)]"
              : "shadow-[0_6px_24px_rgba(10,4,50,0.25)]"
          }`}
        >
          {/* Brand Crest / Logo */}
          <div className="flex items-center gap-3 md:gap-5 min-w-0">
            <Link
              className="flex items-center gap-3 group transition-all duration-200 ease-in-out active:scale-[0.98]"
              href="/"
            >
              <span className={LOGO_BADGE_CLASSES}>
                <GraduationCap className="size-6 text-[#c9b8ff]" strokeWidth={1.8} />
              </span>
              <span className="flex flex-col leading-none min-w-0">
                <span className="text-lg md:text-[20px] font-bold tracking-tight text-white">
                  EduLearn
                </span>
                <span className="mt-1 text-[9px] md:text-[10px] font-bold uppercase tracking-[0.18em] text-[#b3a8e8]">
                  Academic Platform
                </span>
              </span>
            </Link>
            <span className="hidden lg:block h-9 w-px bg-white/15 shrink-0" aria-hidden="true" />
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1.5" aria-label="Main navigation">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={link.active ? "page" : undefined}
                className={
                  link.active
                    ? "px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-gradient-to-b from-[#7a5af8] to-[#5b3df0] shadow-[0_4px_14px_rgba(122,90,248,0.45)]"
                    : "px-4 xl:px-5 py-2.5 rounded-full text-sm font-semibold text-white/85 hover:text-white hover:bg-white/10 transition-colors duration-150"
                }
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Trailing Action Buttons */}
          <div className="hidden lg:flex items-center gap-2.5">
            <Link href="/notifications" aria-label="Notifications" className={BELL_CLASSES}>
              <Bell className="size-5" strokeWidth={1.8} />
            </Link>
            {isAuthenticated ? (
              <button type="button" className={LOGOUT_CLASSES} onClick={() => logout()}>
                Logout
              </button>
            ) : status === "checking" ? null : (
              <>
                <Link className={SIGN_IN_CLASSES} href="/login">
                  Sign In
                </Link>
                <Link className={GET_STARTED_CLASSES} href="/register">
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            className="lg:hidden w-10 h-10 rounded-xl flex items-center justify-center text-white border border-white/20 hover:bg-white/10 transition-colors"
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
            className="lg:hidden mt-2 rounded-3xl border border-white/15 bg-[#140f35]/80 backdrop-blur-xl backdrop-saturate-150 p-3 shadow-[0_20px_50px_rgba(10,4,50,0.4)]"
          >
            <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  aria-current={link.active ? "page" : undefined}
                  className={
                    link.active
                      ? "px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-b from-[#7a5af8] to-[#5b3df0] shadow-[0_4px_14px_rgba(122,90,248,0.4)]"
                      : "px-4 py-2.5 rounded-xl text-sm font-semibold text-white/85 hover:bg-white/10 hover:text-white transition-colors"
                  }
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="mt-2 pt-3 px-1 pb-1 flex items-center gap-3 border-t border-white/10">
              {isAuthenticated ? (
                <button
                  type="button"
                  className="w-full px-4 py-2.5 text-center text-sm font-semibold text-white bg-[#3a2f7a]/80 hover:bg-[#4b3d9a] rounded-full transition-colors duration-150 cursor-pointer"
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
                    className={`flex-1 text-center ${SIGN_IN_CLASSES}`}
                    href="/login"
                    onClick={() => setIsOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    className={`flex-1 text-center ${GET_STARTED_CLASSES}`}
                    href="/register"
                    onClick={() => setIsOpen(false)}
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
