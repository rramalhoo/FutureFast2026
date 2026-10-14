import "server-only";
import { getServerSupabase } from "@/lib/supabase/server";

export async function loadMyPharmacy(userId: string) {
  const supabase = await getServerSupabase();
  const { data: member } = await supabase.from("pharmacy_members").select("pharmacy_id, member_role").eq("profile_id", userId).limit(1).maybeSingle();
  if (!member) return null;
  const { data: pharmacy } = await supabase.from("pharmacies").select("*").eq("id", member.pharmacy_id).single();
  return pharmacy ? { ...pharmacy, member_role: member.member_role } : null;
}
