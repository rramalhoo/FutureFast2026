import type { Metadata } from "next";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PharmacySearch, type PharmacyResult } from "@/components/patient/pharmacy-search";
import { CancelRequestButton } from "@/components/patient/cancel-request-button";
import { PHARMACY_REQUEST_STATUS } from "@/lib/labels";
import { fmt, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Farmácias" };

export default async function PharmaciesPage({ searchParams }: PageProps<"/paciente/farmacias">) {
  const session = await requireRole("patient");
  const p = await searchParams;
  const tab = p.tab === "solicitacoes" ? "solicitacoes" : "buscar";
  const query = typeof p.q === "string" ? p.q.slice(0, 80) : "";
  const lat = Number(p.lat);
  const lng = Number(p.lng);
  const center = Number.isFinite(lat) && Number.isFinite(lng) && p.lat && p.lng ? { lat, lng } : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Farmácias" description="Encontre farmácias verificadas e acompanhe suas solicitações." />
      <nav className="flex w-fit gap-1 rounded-2xl border border-border bg-surface-muted p-1" aria-label="Seções">
        {[
          { v: "buscar", l: "Buscar farmácias" },
          { v: "solicitacoes", l: "Minhas solicitações" },
        ].map((t) => (
          <Link key={t.v} href={`/paciente/farmacias?tab=${t.v}`} aria-current={tab === t.v ? "page" : undefined} className={cn("rounded-xl px-3.5 py-2 text-sm font-medium", tab === t.v ? "bg-surface text-foreground-strong shadow-sm" : "text-muted-foreground")}>
            {t.l}
          </Link>
        ))}
      </nav>
      {tab === "buscar" ? <SearchSection query={query} center={center} userId={session.userId} preselected={typeof p.receita === "string" ? p.receita : undefined} /> : <RequestsSection />}
    </div>
  );
}

async function SearchSection({ query, center, userId, preselected }: { query: string; center: { lat: number; lng: number } | null; userId: string; preselected?: string }) {
  const supabase = await getServerSupabase();
  const [{ data }, { data: favs }, { data: rxs }] = await Promise.all([
    supabase.rpc("search_pharmacies", { p_query: query || undefined, p_lat: center?.lat, p_lng: center?.lng, p_radius_km: 30 }),
    supabase.from("favorites").select("target_id").eq("user_id", userId).eq("target_type", "pharmacy"),
    supabase.from("prescriptions").select("id, issued_at, prescription_items(medication_name)").eq("status", "issued").gte("valid_until", todayISO()),
  ]);
  const favorites = (favs ?? []).map((f) => f.target_id);
  const results = ((data ?? []) as unknown as PharmacyResult[]).sort((a, b) => Number(favorites.includes(b.id)) - Number(favorites.includes(a.id)));
  return (
    <PharmacySearch
      results={results}
      query={query}
      center={center}
      favorites={favorites}
      preselectedPrescription={preselected}
      validPrescriptions={(rxs ?? []).map((r) => ({ id: r.id, label: `${(r.prescription_items as { medication_name: string }[]).map((i) => i.medication_name).join(", ")} — ${fmt.date(r.issued_at)}` }))}
    />
  );
}

async function RequestsSection() {
  const supabase = await getServerSupabase();
  const { data } = await supabase
    .from("pharmacy_requests")
    .select("*, pharmacy:pharmacies(trade_name, phone, address_line, city), pharmacy_request_events(status, note, created_at)")
    .order("created_at", { ascending: false });
  if (!data?.length) return <Card><EmptyState icon={Inbox} title="Nenhuma solicitação" description="Envie uma solicitação a uma farmácia para acompanhar a separação dos medicamentos." /></Card>;
  return (
    <div className="space-y-4">
      {data.map((r) => {
        const ph = r.pharmacy as unknown as { trade_name: string; phone: string | null; address_line: string; city: string } | null;
        const events = [...((r.pharmacy_request_events ?? []) as { status: keyof typeof PHARMACY_REQUEST_STATUS; note: string | null; created_at: string }[])].sort((a, b) => a.created_at.localeCompare(b.created_at));
        return (
          <Card key={r.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-foreground-strong">{ph?.trade_name}</p>
                <p className="text-caption text-muted-foreground">{ph?.address_line}, {ph?.city} · enviada {fmt.relative(r.created_at)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={PHARMACY_REQUEST_STATUS[r.status].tone} dot>{PHARMACY_REQUEST_STATUS[r.status].label}</Badge>
                {!["completed", "cancelled"].includes(r.status) ? <CancelRequestButton id={r.id} /> : null}
              </div>
            </div>
            {r.items_description ? <p className="mt-3 text-sm">{r.items_description}</p> : null}
            {r.prescription_id ? <Link href={`/paciente/receitas/${r.prescription_id}`} className="mt-1 inline-block text-sm font-medium text-primary">Receita anexada</Link> : null}
            {r.pharmacy_note ? <p className="mt-3 rounded-xl bg-primary-soft/50 p-3 text-sm"><span className="font-medium">Farmácia:</span> {r.pharmacy_note}</p> : null}
            <ol className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-border pt-3">
              {events.map((e, i) => (
                <li key={i} className="flex items-center gap-2 text-caption text-muted-foreground">
                  <span className="size-2 rounded-full bg-primary" aria-hidden /> {PHARMACY_REQUEST_STATUS[e.status].label} · {fmt.dateTime(e.created_at)}
                </li>
              ))}
            </ol>
          </Card>
        );
      })}
    </div>
  );
}
