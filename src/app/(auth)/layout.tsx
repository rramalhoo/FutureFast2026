import { ShieldCheck, Pill, QrCode, CalendarDays } from "lucide-react";
import { Logo } from "@/components/shared/logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,560px)] xl:grid-cols-[1fr_640px]">
      <main id="conteudo" className="flex flex-col px-5 py-6 sm:px-10">
        <Logo />
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[420px]">{children}</div>
        </div>
        <p className="text-center text-caption text-muted-foreground">
          O Genvity não é um serviço de emergência. Em caso de urgência, ligue 192 (SAMU).
        </p>
      </main>
      <aside className="relative hidden overflow-hidden lg:sticky lg:top-0 lg:h-dvh bg-[radial-gradient(120%_90%_at_0%_0%,#a35bcc_0%,#7d35a5_45%,#3d1656_100%)] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="bg-grid absolute inset-0 opacity-[0.08]" aria-hidden />
        <div className="absolute -top-24 -right-24 size-96 rounded-full bg-white/10 blur-3xl" aria-hidden />
        <div className="relative">
          <p className="text-sm font-medium text-white/70">Genvity</p>
          <h2 className="mt-3 max-w-md text-[2.25rem] leading-[1.1] font-semibold tracking-[-0.03em] text-white">
            Médicos, pacientes e farmácias no mesmo fluxo de cuidado.
          </h2>
        </div>
        <ul className="relative grid gap-3">
          {[
            { icon: QrCode, title: "Receitas verificáveis", text: "QR Code seguro que só farmácias autorizadas conseguem consultar." },
            { icon: Pill, title: "Tratamento organizado", text: "Lembretes e registro de doses sem alterar a prescrição." },
            { icon: CalendarDays, title: "Agenda integrada", text: "Consultas, retornos e medicamentos em um só calendário." },
            { icon: ShieldCheck, title: "Privacidade por padrão", text: "Você decide quem acessa seu histórico. Cada acesso é registrado." },
          ].map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-sm">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                <Icon className="size-5" aria-hidden />
              </span>
              <span>
                <span className="block font-medium">{title}</span>
                <span className="mt-0.5 block text-sm text-white/75">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
