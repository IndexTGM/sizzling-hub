"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface ChatMessage {
  id: string;
  order_id: string;
  sender_id: string;
  sender_role: "customer" | "admin";
  message: string | null;
  image_url: string | null;
  created_at: string;
}

interface ChatPanelProps {
  orderId: string;
  isAdmin?: boolean;
  className?: string;
  branchName?: string;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const am = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m} ${am}`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

export default function ChatPanel({ orderId, isAdmin = false, className, branchName }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = useCallback(async (silent = false) => {
    if (!orderId) return;
    if (!silent) setLoading(true);
    const sb = createClient();
    const { data } = await sb
      .from("order_messages")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data as ChatMessage[]);
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(() => fetchMessages(true), 2000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    const sb = createClient();
    const { data: { session } } = await sb.auth.getSession();
    if (!session?.user) { setSending(false); return; }
    const { error } = await sb.from("order_messages").insert({
      order_id: orderId,
      sender_id: session.user.id,
      sender_role: isAdmin ? "admin" : "customer",
      message: trimmed,
    });
    if (!error) {
      setText("");
      await fetchMessages(true);
    }
    setSending(false);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const sb = createClient();
    const { data: { session } } = await sb.auth.getSession();
    if (!session?.user) { setUploading(false); return; }
    const ext = file.name.split(".").pop() || "png";
    const path = `chat/${orderId}/${Date.now()}.${ext}`;
    const { data: uploadData, error: uploadErr } = await sb.storage
      .from("images")
      .upload(path, file, { upsert: true });
    if (uploadErr) {
      setUploading(false);
      return;
    }
    const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/images/${path}`;
    const { error: msgErr } = await sb.from("order_messages").insert({
      order_id: orderId,
      sender_id: session.user.id,
      sender_role: isAdmin ? "admin" : "customer",
      image_url: imageUrl,
    });
    if (!msgErr) await fetchMessages(true);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      await handleSend();
    }
  }

  return (
    <div className={`flex flex-col h-full ${className ?? ""}`}>
      {/* Branch name header for customers */}
      {!isAdmin && branchName && (
        <div className="px-4 py-2 bg-[#f9fafb] border-b border-[#e5e7eb] text-xs text-gray-500 flex items-center gap-1.5">
          <span>🏢</span> Chatting with <span className="font-semibold text-gray-700">{branchName}</span>
        </div>
      )}
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-5 h-5 border-2 border-[#e5e7eb] rounded-full animate-spin" style={{ borderTopColor: "#dc2626" }} />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <p className="text-4xl mb-2">💬</p>
              <p className="text-xs text-gray-400">No messages yet.</p>
              <p className="text-xs text-gray-300 mt-1">
                {isAdmin
                  ? "Send a message to the customer here."
                  : "Send your GCash payment proof or ask a question."}
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMine = msg.sender_role === (isAdmin ? "admin" : "customer");
            const showDate = i === 0 || fmtDate(msg.created_at) !== fmtDate(messages[i - 1].created_at);
            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="flex items-center justify-center my-3">
                    <span className="px-3 py-0.5 rounded-full bg-gray-100 text-[10px] font-semibold text-gray-400">
                      {fmtDate(msg.created_at)}
                    </span>
                  </div>
                )}
                <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] ${isMine ? "order-1" : "order-2"}`}>
                    {!isMine && (
                      <p className="text-[10px] font-bold text-gray-400 mb-0.5 ml-1">
                        {msg.sender_role === "admin" ? "Staff" : "Customer"}
                      </p>
                    )}
                    {msg.message && (
                      <div
                        className={`px-3 py-2 rounded-2xl text-sm font-medium break-words ${
                          isMine
                            ? "bg-[#dc2626] text-white rounded-br-md"
                            : "bg-[#f3f4f6] text-[#1f2937] rounded-bl-md"
                        }`}
                      >
                        {msg.message}
                      </div>
                    )}
                    {msg.image_url && (
                      <a href={msg.image_url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={msg.image_url}
                          alt="Attached image"
                          className="mt-1 rounded-xl max-w-[200px] max-h-[200px] object-cover border border-[#e5e7eb] cursor-pointer hover:opacity-90 transition-opacity"
                        />
                      </a>
                    )}
                    <p className={`text-[10px] text-gray-400 mt-0.5 ${isMine ? "text-right mr-1" : "ml-1"}`}>
                      {fmtTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-[#e5e7eb] px-3 py-3 flex items-end gap-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex-shrink-0 p-2 rounded-lg bg-[#f3f4f6] text-gray-500 hover:bg-[#e5e7eb] transition-colors disabled:opacity-50"
          title="Attach image"
        >
          {uploading ? (
            <div className="w-4 h-4 border-2 border-gray-300 rounded-full animate-spin" style={{ borderTopColor: "#dc2626" }} />
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isAdmin ? "Reply to customer…" : "Send a message or GCash proof…"}
          className="flex-1 min-w-0 px-4 py-2 rounded-xl border border-[#e5e7eb] text-sm text-[#0a0a0a] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#dc2626]/30 focus:border-[#dc2626] transition-all"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="flex-shrink-0 px-4 py-2 rounded-xl font-bold text-sm text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
          style={{ backgroundColor: "#dc2626" }}
        >
          {sending ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}