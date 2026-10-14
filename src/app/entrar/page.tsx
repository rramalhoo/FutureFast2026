import { redirect } from "next/navigation";
import { getSession, ROLE_HOME } from "@/lib/auth";

/** Roteia o usuário autenticado para o ambiente do seu papel. */
export default async function EnterPage({ searchParams }: PageProps<"/entrar">) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { profile } = session;
  if (profile.role !== "admin" && !profile.onboarding_completed) redirect("/onboarding");
  const params = await searchParams;
  redirect(params.senha === "alterada" ? `${ROLE_HOME[profile.role]}?senha=alterada` : ROLE_HOME[profile.role]);
}
