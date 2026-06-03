"use client";

import { useState, useCallback, createContext, useContext, type ReactNode } from "react";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const typeStyles: Record<ToastType, { bg: string; icon: string; border: string }> = {
    success: {
      bg: "bg-emerald-50",
      icon: "✅",
      border: "border-emerald-200",
    },
    error: {
      bg: "bg-red-50",
      icon: "❌",
      border: "border-red-200",
    },
    info: {
      bg: "bg-blue-50",
      icon: "ℹ️",
      border: "border-blue-200",
    },
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-24 right-6 z-[100] flex flex-col-reverse gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => {
          const s = typeStyles[t.type];
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg animate-slide-in-right ${s.bg} ${s.border}`}
            >
              <span className="text-lg flex-shrink-0 mt-0.5">{s.icon}</span>
              <p className="text-sm font-semibold text-gray-800 flex-1 leading-snug">
                {t.message}
              </p>
              <button
                onClick={() => dismiss(t.id)}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}