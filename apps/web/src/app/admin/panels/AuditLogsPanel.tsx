"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import ConfirmModal from "@/app/_components/ConfirmModal";
import { LoadingSkeleton, EmptyState } from "./shared";

interface AuditLogEntry { id: string; actor_email: string | null; source: string; action: string; entity_type: string | null; entity_id: string | null; details: Record<string, unknown> | null; created_at: string; }

export default function AuditLogsPanel() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState<"all" | "admin" | "customer">("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [showDeletePanel, setShowDeletePanel] = useState(false);
  const [deleteFrom, setDeleteFrom] = useState("");
  const [deleteTo, setDeleteTo] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmRangeDelete, setConfirmRangeDelete] = useState(false);
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

  async function handleDeleteSingle(id: string) {
    const sb = createClient();
    await sb.from("audit_logs").delete().eq("id", id);
    setConfirmDeleteId(null);
    await fetchLogs();
    setLogs((prev) => prev.filter((l) => l.id !== id));
  }

  async function handleDeleteRange() {
    if (!deleteFrom || !deleteTo) return;
    setDeleting(true);
    const sb = createClient();
    // datetime-local values are "YYYY-MM-DDTHH:MM" — convert to full ISO for Supabase
    const fromISO = new Date(deleteFrom).toISOString();
    const toISO = new Date(deleteTo).toISOString();
    const { error } = await sb.from("audit_logs").delete().gte("created_at", fromISO).lte("created_at", toISO);
    if (error) { alert("Delete failed: " + error.message); setDeleting(false); return; }
    setDeleting(false);
    setConfirmRangeDelete(false);
    setShowDeletePanel(false);
    setDeleteFrom("");
    setDeleteTo("");
    hasLogsLoaded.current = false;
    await fetchLogs();
  }

  const sourceFiltered = sourceFilter === "all" ? logs : logs.filter((l) => l.source === sourceFilter);
  const actionTypes = [...new Set(sourceFiltered.map((l) => l.action))];
  const filtered = actionFilter === "all" ? sourceFiltered : sourceFiltered.filter((l) => l.action === actionFilter);
  const adminCount = logs.filter((l) => l.source === "admin").length;
  const customerCount = logs.filter((l) => l.source === "customer").length;
  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-black text-gray-900 tracking-tight">Audit Logs</h2><p className="text-sm text-gray-400 mt-0.5">Track admin and customer activity</p></div>
        <button onClick={() => setShowDeletePanel(!showDeletePanel)} className="px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 active:scale-95 transition-all duration-200">
          {showDeletePanel ? "Cancel Delete" : "Delete Logs"}
        </button>
      </div>

      {/* Date Range Delete Panel */}
      {showDeletePanel && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="font-bold text-sm text-gray-900">Delete Logs by Date Range</h3>
          <p className="text-xs text-gray-400">Select a date and time range. All audit logs within this range will be permanently deleted.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">From</label>
              <input
                type="datetime-local"
                value={deleteFrom}
                onChange={(e) => setDeleteFrom(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">To</label>
              <input
                type="datetime-local"
                value={deleteTo}
                onChange={(e) => setDeleteTo(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-300"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmRangeDelete(true)}
              disabled={!deleteFrom || !deleteTo}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-bold disabled:opacity-40 hover:bg-red-700 transition-colors"
            >
              Delete Range
            </button>
            <button onClick={() => { setShowDeletePanel(false); setDeleteFrom(""); setDeleteTo(""); }} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

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
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-400 tracking-wider"><tr><th className="px-4 py-3 font-semibold">Time</th><th className="px-4 py-3 font-semibold">Source</th><th className="px-4 py-3 font-semibold">Actor</th><th className="px-4 py-3 font-semibold">Action</th><th className="px-4 py-3 font-semibold hidden sm:table-cell">Entity</th><th className="px-4 py-3 font-semibold hidden md:table-cell">Details</th><th className="px-4 py-3 font-semibold w-16"></th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-400 font-mono">{new Date(log.created_at).toLocaleString()}</td>
                <td className="px-4 py-3"><span className={`inline-block px-2 py-0.5 rounded-full text-xs font-extrabold ${log.source === "admin" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}`}>{log.source === "admin" ? "Admin" : "Customer"}</span></td>
                <td className="px-4 py-3 font-semibold text-gray-600">{log.actor_email || "System"}</td>
                <td className="px-4 py-3"><span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-700">{log.action.replace(/_/g, " ")}</span></td>
                <td className="px-4 py-3 hidden sm:table-cell">{log.entity_type && <span className="text-gray-400 text-xs">{log.entity_type}{log.entity_id && <span className="text-gray-300 font-mono ml-1">{log.entity_id.slice(0, 8)}</span>}</span>}</td>
                <td className="px-4 py-3 hidden md:table-cell text-gray-400 text-xs font-mono max-w-[200px] truncate">{log.details ? JSON.stringify(log.details) : "—"}</td>
                <td className="px-4 py-3">
                  <button onClick={() => setConfirmDeleteId(log.id)} className="px-2 py-1 rounded text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors">×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div></div>
      )}

      {/* Confirm single delete */}
      <ConfirmModal
        open={confirmDeleteId !== null}
        title="Delete Audit Log"
        message="Are you sure you want to delete this audit log entry?"
        confirmLabel="Delete"
        confirmDanger
        onConfirm={() => confirmDeleteId && handleDeleteSingle(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />

      {/* Confirm range delete */}
      <ConfirmModal
        open={confirmRangeDelete}
        title="Delete Audit Logs"
        message={`Delete all audit logs from ${deleteFrom.replace("T", " ")} to ${deleteTo.replace("T", " ")}? This action cannot be undone.`}
        confirmLabel={deleting ? "Deleting…" : "Delete All"}
        confirmDanger
        onConfirm={handleDeleteRange}
        onCancel={() => setConfirmRangeDelete(false)}
      />
    </div>
  );
}