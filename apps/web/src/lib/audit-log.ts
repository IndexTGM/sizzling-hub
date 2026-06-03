import { createClient } from "@/lib/supabase/client";

export type AuditSource = "admin" | "customer";

export interface AuditEntry {
  source?: AuditSource; // defaults to "admin"
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: Record<string, unknown>;
}

/**
 * Logs an action to the audit_logs table.
 * - source = "admin" for admin panel actions
 * - source = "customer" for customer-facing events (order placed, profile updated, etc.)
 *
 * Best-effort: silently catches and ignores errors so auditing never breaks UX.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    const sb = createClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    await sb.from("audit_logs").insert({
      actor_id: user?.id ?? null,
      actor_email: user?.email ?? null,
      source: entry.source ?? "admin",
      action: entry.action,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id ?? null,
      details: entry.details ?? {},
    });
  } catch {
    /* audit is best-effort */
  }
}
