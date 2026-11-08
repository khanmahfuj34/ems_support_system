import Link from "next/link";
import { GraduationCap } from "lucide-react";

const QUICK_LINKS = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Features", href: "#features" },
  { label: "Contact", href: "#contact" },
];

const STUDENT_RESOURCES = [
  { label: "Support Desk", href: "/support-desk/new" },
  { label: "Sign In", href: "/login" },
  { label: "Academic Calendar", href: "#calendar" },
  { label: "Library Catalog", href: "#catalog" },
];

const LEGAL_LINKS = [
  { label: "Privacy Policy", href: "#privacy" },
  { label: "Terms of Service", href: "#terms" },
  { label: "Institutional Compliance", href: "#compliance" },
  { label: "Platform Status & Security", href: "#security" },
];

const LINK_CLASSES =
  "text-xs leading-4 text-[#47464f] dark:text-[#d5e3fc] hover:text-[#070235] dark:hover:text-[#f8f9ff] transition-colors";

const HEADING_CLASSES =
  "text-sm leading-5 font-bold text-[#140f35] dark:text-[#f8f9ff] mb-4";

export function SiteFooter() {
  return (
    <footer
      id="contact"
      className="w-full bg-[#f5f3ff] dark:bg-[#070235] border-t border-[#d6d1f5]/60 dark:border-[#787680]/30"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-16 py-8 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          {/* Brand Summary Column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-b from-[#7a5af8] to-[#5b3df0] text-white flex items-center justify-center">
                <GraduationCap className="size-5" strokeWidth={1.8} />
              </div>
              <span className="text-xl leading-7 font-bold text-[#140f35] dark:text-[#f8f9ff]">
                EduLearn
              </span>
            </div>
            <p className="text-xs text-[#47464f] dark:text-[#d5e3fc] max-w-sm leading-relaxed">
              Precision academic learning systems empowering university scholars, faculty
              researchers, and progressive educational institutions worldwide.
            </p>
          </div>

          {/* Quick Links Column */}
          <div>
            <h4 className={HEADING_CLASSES}>Quick Links</h4>
            <ul className="space-y-2.5">
              {QUICK_LINKS.map((link) => (
                <li key={link.label}>
                  <Link className={LINK_CLASSES} href={link.href}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Student Resources Column */}
          <div id="support">
            <h4 className={HEADING_CLASSES}>Student Resources</h4>
            <ul className="space-y-2.5">
              {STUDENT_RESOURCES.map((link) => (
                <li key={link.label}>
                  <Link className={LINK_CLASSES} href={link.href}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal & Governance Column */}
          <div>
            <h4 className={HEADING_CLASSES}>Legal &amp; Governance</h4>
            <ul className="space-y-2.5">
              {LEGAL_LINKS.map((link) => (
                <li key={link.label}>
                  <Link className={LINK_CLASSES} href={link.href}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-[#d6d1f5]/50 dark:border-[#787680]/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs leading-4 text-[#47464f] dark:text-[#d5e3fc]">
            © 2024 EduLearn Institution. All rights reserved. Precision academic learning
            systems.
          </p>
          <div className="flex items-center gap-6">
            <span className="inline-flex items-center gap-1.5 text-xs leading-4 text-[#5b3df0] dark:text-[#c4b5fd]">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              All Academic Systems Operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
