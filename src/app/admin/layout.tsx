import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const session = await requireRole("admin");
  return <AppShell session={session}>{children}</AppShell>;
}
