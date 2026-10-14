import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth";

export default async function PatientLayout({ children }: LayoutProps<"/paciente">) {
  const session = await requireRole("patient");
  return <AppShell session={session}>{children}</AppShell>;
}
