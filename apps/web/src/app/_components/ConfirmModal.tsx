"use client";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  confirmDanger = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-[100]" onClick={onCancel} />
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-xl w-full max-w-sm animate-fade-in-scale">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#f3f4f6]">
            <h3 className="font-black text-base text-[#0a0a0a]">{title}</h3>
            <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-[#f3f4f6] transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="#6b7280" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="px-5 py-4">
            <p className="text-sm text-[#4b5563] leading-relaxed">{message}</p>
          </div>
          <div className="border-t border-[#f3f4f6] px-5 py-4 flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-bold hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition-all duration-200 ${
                confirmDanger ? "bg-red-600 hover:bg-red-700" : ""
              }`}
              style={confirmDanger ? undefined : { backgroundColor: "#dc2626" }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}