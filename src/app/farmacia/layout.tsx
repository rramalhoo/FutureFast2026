import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth";

export default async function PharmacyLayout({ children }: LayoutProps<"/farmacia">) {
  const session = await requireRole("pharmacy");
  return <AppShell session={session}>{children}</AppShell>;
}
