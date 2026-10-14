import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

/** Portabilidade (LGPD art. 18, V): exporta os dados do titular em JSON. */
export async function GET() {
  const supabase = await getServerSupabase();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { data, error } = await supabase.rpc("export_my_data");
  if (error) {
    const status = error.code === "P0429" ? 429 : 500;
    return NextResponse.json({ error: status === 429 ? error.message : "Não foi possível gerar a exportação." }, { status });
  }

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="genvity-meus-dados-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
