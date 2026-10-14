"use server";

import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";

export type SearchHit = { group: string; title: string; subtitle?: string; href: string };

const querySchema = z.string().trim().min(2).max(80);

/** Busca global respeitando RLS: só retorna o que o usuário já pode ver. */
export async function globalSearch(input: string): Promise<SearchHit[]> {
  const parsed = querySchema.safeParse(input);
  if (!parsed.success) return [];
  const q = parsed.data.replace(/[%_,()]/g, " ");
  const session = await getSession();
  if (!session) return [];
  const supabase = await getServerSupabase();
  const hits: SearchHit[] = [];

  switch (session.profile.role) {
    case "patient": {
      const [{ data: meds }, { data: items }, { data: doctors }] = await Promise.all([
        supabase.from("patient_medications").select("id, name, dosage").ilike("name", `%${q}%`).limit(5),
        supabase
          .from("prescription_items")
          .select("medication_name, prescription_id, prescriptions!inner(status, patient_id)")
          .eq("prescriptions.patient_id", session.userId)
          .ilike("medication_name", `%${q}%`)
          .limit(5),
        supabase.rpc("search_doctors", { p_query: q }).limit(5),
      ]);
      meds?.forEach((m) => hits.push({ group: "Medicamentos", title: m.name, subtitle: m.dosage ?? undefined, href: "/paciente/medicamentos" }));
      items?.forEach((i) => hits.push({ group: "Receitas", title: i.medication_name, href: `/paciente/receitas/${i.prescription_id}` }));
      doctors?.forEach((d) => hits.push({ group: "Médicos", title: d.full_name, subtitle: d.specialty, href: `/paciente/medicos/${d.id}` }));
      break;
    }
    case "doctor": {
      const [{ data: care }, { data: rx }] = await Promise.all([
        supabase
          .from("care_relationships")
          .select("patient_id, status, profiles:patient_id!inner(full_name)")
          .eq("doctor_id", session.userId)
          .neq("status", "revoked")
          .ilike("profiles.full_name", `%${q}%`)
          .limit(6),
        supabase
          .from("prescription_items")
          .select("medication_name, prescription_id, prescriptions!inner(doctor_id)")
          .eq("prescriptions.doctor_id", session.userId)
          .ilike("medication_name", `%${q}%`)
          .limit(5),
      ]);
      care?.forEach((c) => {
        const profile = c.profiles as unknown as { full_name: string } | null;
        hits.push({ group: "Pacientes", title: profile?.full_name ?? "Paciente", href: `/medico/pacientes/${c.patient_id}` });
      });
      rx?.forEach((r) => hits.push({ group: "Prescrições", title: r.medication_name, href: `/medico/prescricoes/${r.prescription_id}` }));
      break;
    }
    case "pharmacy": {
      const { data: inv } = await supabase.from("pharmacy_inventory").select("id, product_name, presentation").ilike("product_name", `%${q}%`).limit(8);
      inv?.forEach((i) => hits.push({ group: "Estoque", title: i.product_name, subtitle: i.presentation ?? undefined, href: `/farmacia/estoque?q=${encodeURIComponent(i.product_name)}` }));
      break;
    }
    case "admin": {
      const { data: users } = await supabase.from("profiles").select("id, full_name, role").ilike("full_name", `%${q}%`).limit(8);
      users?.forEach((u) => hits.push({ group: "Usuários", title: u.full_name || "Sem nome", subtitle: u.role, href: `/admin/usuarios?q=${encodeURIComponent(u.full_name)}` }));
      break;
    }
  }
  return hits;
}
