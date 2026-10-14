import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getSession } from "@/lib/auth";

export default async function PublicLayout({ children }: LayoutProps<"/">) {
  const session = await getSession();
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader authenticated={Boolean(session)} />
      <main id="conteudo" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
