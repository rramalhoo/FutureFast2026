import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth";

export default async function DoctorLayout({ children }: LayoutProps<"/medico">) {
  const session = await requireRole("doctor");
  return <AppShell session={session}>{children}</AppShell>;
}
