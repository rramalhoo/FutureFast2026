import "server-only";
import QRCode from "qrcode";
import { getServerSupabase } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";

export async function loadPrescription(id: string) {
  const supabase = await getServerSupabase();
  const { data } = await supabase
    .from("prescriptions")
    .select(
      "*, prescription_items(*), doctor:doctors!inner(crm, crm_state, specialty, rqe, profile:profiles!inner(full_name)), patient:patients(birth_date, profile:profiles!inner(full_name)), dispensations(id, dispensed_at, pharmacist_name, pharmacist_crf, signature_legally_valid, pharmacy:pharmacies(trade_name))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const items = [...(data.prescription_items ?? [])].sort((a, b) => a.position - b.position);
  // Farmácias não leem `patients`; o nome vem de `profiles` (autorizado pela solicitação).
  let patient = data.patient as unknown as { birth_date: string | null; profile: { full_name: string } } | null;
  if (!patient) {
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", data.patient_id).maybeSingle();
    patient = profile ? { birth_date: null, profile } : null;
  }
  return {
    ...data,
    prescription_items: items,
    doctor: data.doctor as unknown as { crm: string; crm_state: string; specialty: string; rqe: string | null; profile: { full_name: string } },
    patient,
    dispensations: (data.dispensations ?? []) as unknown as {
      id: string;
      dispensed_at: string;
      pharmacist_name: string;
      pharmacist_crf: string;
      signature_legally_valid: boolean;
      pharmacy: { trade_name: string } | null;
    }[],
  };
}

export type LoadedPrescription = NonNullable<Awaited<ReturnType<typeof loadPrescription>>>;

/** URL de verificação: exige login de farmácia verificada. Não contém dados médicos. */
export function verificationUrl(code: string) {
  return `${publicEnv.NEXT_PUBLIC_APP_URL}/verificar/${code}`;
}

export async function qrSvg(code: string) {
  return QRCode.toString(verificationUrl(code), { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#2f2a33", light: "#ffffff" } });
}

export function isEffectivelyValid(rx: { status: string; valid_until: string | null }, today: string) {
  return rx.status === "issued" && !!rx.valid_until && rx.valid_until >= today;
}
