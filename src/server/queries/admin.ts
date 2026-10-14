import "server-only";
import { getAdminSupabase } from "@/lib/supabase/admin";

export type AdminMetrics = {
  users_by_role: Record<string, number>;
  users_total: number;
  doctors_approved: number;
  pharmacies_approved: number;
  pending_verifications: number;
  active_subscriptions: number;
  pending_subscriptions: number;
  mrr_cents: number;
  payments_paid_30d_cents: number;
  prescriptions_issued_30d: number;
  appointments_30d: number;
  dispensations_30d: number;
  open_tickets: number;
  open_dsr: number;
  signups_by_week: { week: string; count: number }[];
  prescriptions_by_week: { week: string; count: number }[];
};

/** E-mails e estado de acesso vêm do Auth (somente servidor, service_role). */
export async function loadAuthUsers() {
  const admin = getAdminSupabase();
  const map = new Map<string, { email: string; lastSignIn: string | null; bannedUntil: string | null; confirmed: boolean }>();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data) break;
    for (const u of data.users) {
      map.set(u.id, {
        email: u.email ?? "",
        lastSignIn: u.last_sign_in_at ?? null,
        bannedUntil: (u as { banned_until?: string | null }).banned_until ?? null,
        confirmed: Boolean(u.email_confirmed_at),
      });
    }
    if (data.users.length < 1000) break;
  }
  return map;
}
