"use client";

import Link from "next/link";

export default function PaymentFailedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
      <div className="text-center max-w-sm px-4 space-y-6 animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto">
          <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900">Payment Cancelled</h1>
          <p className="text-sm text-gray-500 mt-2">
            You cancelled the payment. Your cart has been preserved — you can try again.
          </p>
        </div>
        <div className="space-y-2">
          <Link
            href="/menu"
            className="inline-block w-full py-3 rounded-xl bg-[#dc2626] text-white font-bold text-sm hover:bg-red-700 transition-colors"
          >
            Back to Menu
          </Link>
          <Link
            href="/"
            className="inline-block w-full py-3 rounded-xl bg-gray-100 text-gray-600 font-bold text-sm hover:bg-gray-200 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
