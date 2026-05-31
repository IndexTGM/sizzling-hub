import { Suspense } from "react";
import MenuContent from "./MenuContent";

export default function MenuPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
          <div className="w-10 h-10 border-4 border-[#e5e7eb] rounded-full animate-spin" style={{ borderTopColor: "#dc2626" }} />
        </div>
      }
    >
      <MenuContent />
    </Suspense>
  );
}