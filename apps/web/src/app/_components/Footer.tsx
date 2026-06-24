"use client";

import Link from "next/link";
import { useBranch } from "@/lib/branch-context";

const PRIMARY = "#dc2626";

export default function Footer() {
  const { branch } = useBranch();

  return (
    <footer className="bg-[#1f2937] text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <h3 className="text-lg font-black tracking-tight" style={{ color: PRIMARY }}>
              SIZZLING HUB
            </h3>
            <p className="text-sm text-[#9ca3af] leading-relaxed">
              Serving comfort, one sizzling plate at a time. Since 2003.
            </p>
            {/* Mobile App QR */}
            <div className="pt-2">
              <p className="text-xs font-semibold text-white tracking-wide uppercase mb-2">
                Download our App
              </p>
              <img
                src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://expo.dev/accounts/notdevlime/projects/mobile/builds/d6285395-d337-4060-9a25-f48bf6163239"
                alt="Scan to download the Sizzling Hub mobile app"
                width={100}
                height={100}
                className="rounded-lg bg-white p-1"
              />
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white tracking-wide uppercase">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-sm text-[#9ca3af] hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/menu" className="text-sm text-[#9ca3af] hover:text-white transition-colors">
                  Menu
                </Link>
              </li>
              <li>
                <Link href="/orders" className="text-sm text-[#9ca3af] hover:text-white transition-colors">
                  Orders
                </Link>
              </li>
            </ul>
          </div>

          {/* Hours */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white tracking-wide uppercase">Hours</h4>
            <ul className="space-y-2 text-sm text-[#9ca3af]">
              <li>Monday - Saturday</li>
              <li className="text-white font-medium">11:00 AM - 11:00 PM</li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white tracking-wide uppercase">Contact</h4>
            <ul className="space-y-2 text-sm text-[#9ca3af]">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {branch?.address || "Muntinlupa, Metro Manila, Philippines"}
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {branch?.phone || "-"}
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {branch?.email || "-"}
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
<div className="border-t border-[#374151] mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#6b7280]">
            &copy; {new Date().getFullYear()} Sizzling Hub. All rights reserved.
            <span className="ml-3 text-[10px] text-[#6b7280] font-mono">v1.2.0</span>
          </p>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="text-xs text-[#6b7280] hover:text-white transition-colors">
              Terms of Service
            </Link>
            <Link href="/privacy" className="text-xs text-[#6b7280] hover:text-white transition-colors">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}