import { Logo } from "@/components/shared/logo";

export default function OnboardingLayout({ children }: LayoutProps<"/onboarding">) {
  return (
    <div className="min-h-dvh bg-[radial-gradient(80%_50%_at_50%_0%,var(--primary-soft)_0%,transparent_70%)]">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-6">
        <Logo />
        <form action="/auth/signout" method="post">
          <button className="rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-surface-sunken hover:text-foreground">
            Sair
          </button>
        </form>
      </header>
      <main id="conteudo" className="mx-auto max-w-3xl px-5 pb-16">
        {children}
      </main>
    </div>
  );
}
