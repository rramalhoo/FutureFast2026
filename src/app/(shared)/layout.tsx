import { AppShell } from "@/components/layout/app-shell";
import { requireSession } from "@/lib/auth";

export default async function SharedLayout({ children }: LayoutProps<"/">) {
  const session = await requireSession();
  return <AppShell session={session}>{children}</AppShell>;
}
