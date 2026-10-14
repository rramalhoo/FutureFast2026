import "server-only";
import { getServerSupabase } from "@/lib/supabase/server";
import { nameOf } from "./patient";

export async function loadLinkedPatients(doctorId: string) {
  const supabase = await getServerSupabase();
  const { data } = await supabase
    .from("care_relationships")
    .select("patient_id, patient:patients!inner(profile:profiles!inner(full_name))")
    .eq("doctor_id", doctorId)
    .eq("status", "active");
  return (data ?? []).map((c) => ({ id: c.patient_id, name: nameOf(c.patient) })).sort((a, b) => a.name.localeCompare(b.name));
}

export async function isVerified(doctorId: string) {
  const supabase = await getServerSupabase();
  const { data } = await supabase.from("doctors").select("verification_status").eq("id", doctorId).single();
  return data?.verification_status === "approved";
}
