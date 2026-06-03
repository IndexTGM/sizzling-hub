"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { LoadingSkeleton, EmptyState } from "./shared";

interface AuditLogEntry { id: string; actor_email: string | null; source: string; action: string; entity_type: string | null; entity_id: string | null; details: Record<string, unknown> | null; created_at: string; }

export default function AuditLogsPanel() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState<"all" | "admin" | "customer">("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const hasLogsLoaded = React.useRef(false);
  const fetchLogs = useCallback(async (silent = false) => {
    if (!hasLogsLoaded.current) setLoading(true);
    const sb = createClient();
    const { data } = await sb.from("audit_logs").select("id, actor_email, source, action, entity_type, entity_id, details, created_at").order("created_at", { ascending: false }).limit(200);
    if (data) setLogs(data as AuditLogEntry[]);
    setLoading(false);
    hasLogsLoaded.current = true;
  }, []);
  useEffect(() => {
    fetchLogs();
    const interval = setInterval(() => fetchLogs(true), 5000);
    return () => clearInterval(interval);
  }, [fetchLogs]);
  const sourceFiltered = sourceFilter === "all" ? logs : logs.filter((l) => l.source === sourceFilter);
  const actionTypes = [...new Set(sourceFiltered.map((l) => l.action))];
  const filtered = actionFilter === "all" ? sourceFiltered : sourceFiltered.filter((l) => l.action === actionFilter);
  const adminCount = logs.filter((l) => l.source === "admin").length;
  const customerCount = logs.filter((l) => l.source === "customer").length;
  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-black text-gray-900 tracking-tight">Audit Logs</h2><p className="text-sm text-gray-400 mt-0.5">Track admin and customer activity</p></div>
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => { setSourceFilter("all"); setActionFilter("all"); }} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${sourceFilter === "all" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>All ({logs.length})</button>
        <button onClick={() => { setSourceFilter("admin"); setActionFilter("all"); }} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${sourceFilter === "admin" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>🛡️ Admin ({adminCount})</button>
        <button onClick={() => { setSourceFilter("customer"); setActionFilter("all"); }} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${sourceFilter === "customer" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>👤 Customers ({customerCount})</button>
      </div>
      <div className="flex gap-1 flex-wrap">
        <button onClick={() => setActionFilter("all")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${actionFilter === "all" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>All actions</button>
        {actionTypes.map((a) => (<button key={a} onClick={() => setActionFilter(a)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${actionFilter === a ? "bg-red-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>{a.replace(/_/g, " ")}</button>))}
      </div>
      {filtered.length === 0 ? <EmptyState message="No audit logs." /> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-400 tracking-wider"><tr><th className="px-4 py-3 font-semibold">Time</th><th className="px-4 py-3 font-semibold">Source</th><th className="px-4 py-3 font-semibold">Actor</th><th className="px-4 py-3 font-semibold">Action</th><th className="px-4 py-3 font-semibold hidden sm:table-cell">Entity</th><th className="px-4 py-3 font-semibold hidden md:table-cell">Details</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-400 font-mono">{new Date(log.created_at).toLocaleString()}</td>
                <td className="px-4 py-3"><span className={`inline-block px-2 py-0.5 rounded-full text-xs font-extrabold ${log.source === "admin" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}`}>{log.source === "admin" ? "Admin" : "Customer"}</span></td>
                <td className="px-4 py-3 font-semibold text-gray-600">{log.actor_email || "System"}</td>
                <td className="px-4 py-3"><span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-700">{log.action.replace(/_/g, " ")}</span></td>
                <td className="px-4 py-3 hidden sm:table-cell">{log.entity_type && <span className="text-gray-400 text-xs">{log.entity_type}{log.entity_id && <span className="text-gray-300 font-mono ml-1">{log.entity_id.slice(0, 8)}</span>}</span>}</td>
                <td className="px-4 py-3 hidden md:table-cell text-gray-400 text-xs font-mono max-w-[200px] truncate">{log.details ? JSON.stringify(log.details) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table></div></div>
      )}
    </div>
  );
}