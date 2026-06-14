"use client";

import { useState, useRef, useEffect } from "react";
import { useBranch } from "@/lib/branch-context";

export default function BranchSwitcher() {
  const { branch, allBranches, branchSlug, setBranchSlug, loading, refreshBranches } = useBranch();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Re-fetch branches each time dropdown opens so newly created branches appear
  useEffect(() => {
    if (open) refreshBranches();
  }, [open, refreshBranches]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loading && !branch) return null;
  if (allBranches.length <= 1) return null;

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold transition-all duration-200 border border-gray-200"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="max-w-[120px] truncate">{branch?.name ?? "Select Branch"}</span>
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-xl shadow-xl border border-gray-200 py-1 z-50 animate-fade-in-scale overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Select Branch</p>
          </div>
          {allBranches.map((b) => {
            const isActive = b.slug === branchSlug;
            return (
              <button
                key={b.id}
                onClick={() => {
                  setBranchSlug(b.slug);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 flex items-center gap-3 text-sm transition-colors ${
                  isActive
                    ? "bg-red-50 text-red-600 font-bold"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? "bg-red-500" : "bg-gray-300"}`} />
                <div className="flex-1 min-w-0">
                  <p className="truncate">{b.name}</p>
                  {b.address && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{b.address}</p>
                  )}
                </div>
                {isActive && (
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}