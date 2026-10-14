import Link from "next/link";
import { BadgeCheck, Clock, ShieldAlert } from "lucide-react";
import { Sidebar } from "./sidebar";
import { BottomNav, MobileMenu } from "./mobile-nav";
import { CommandPalette } from "./command-palette";
import { NotificationsBell } from "./notifications-bell";
import { UserMenu } from "./user-menu";
import { A11yHydrator } from "./a11y-hydrator";
import { WelcomeTour } from "@/components/shared/welcome-tour";
import { LogoMark } from "@/components/shared/logo";
import type { SessionContext } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/labels";
import { getServerSupabase } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/types";

function VerificationChip({ status, role }: { status: Enums<"verification_status">; role: "doctor" | "pharmacy" }) {
  if (status === "approved") {
    return (
      <div className="flex items-center gap-2.5 rounded-2xl border border-success/20 bg-success-soft px-3 py-2.5 text-sm text-success-foreground">
        <BadgeCheck className="size-4 shrink-0" aria-hidden />
        <span className="font-medium">{role === "doctor" ? "CRM verificado" : "Farmácia verificada"}</span>
      </div>
    );
  }
  const rejected = status === "rejected";
  return (
    <Link
      href={rejected ? "/onboarding" : "/conta"}
      className="flex items-start gap-2.5 rounded-2xl border border-warning/25 bg-warning-soft px-3 py-2.5 text-sm text-warning-foreground hover:brightness-[0.98]"
    >
      {rejected ? <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> : <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />}
      <span>
        <span className="block font-medium">{rejected ? "Verificação recusada" : "Verificação em análise"}</span>
        <span className="block text-caption opacity-90">{rejected ? "Revise e reenvie seus dados" : "Recursos restritos até a aprovação"}</span>
      </span>
    </Link>
  );
}

export async function AppShell({ session, children }: { session: SessionContext; children: React.ReactNode }) {
  const { profile } = session;
  const role = profile.role;
  const supabase = await getServerSupabase();

  let statusSlot: React.ReactNode = null;
  if (role === "doctor") {
    const { data } = await supabase.from("doctors").select("verification_status").eq("id", session.userId).maybeSingle();
    statusSlot = <VerificationChip role="doctor" status={data?.verification_status ?? "not_submitted"} />;
  } else if (role === "pharmacy") {
    const { data } = await supabase.from("pharmacies").select("verification_status").eq("owner_id", session.userId).maybeSingle();
    statusSlot = <VerificationChip role="pharmacy" status={data?.verification_status ?? "not_submitted"} />;
  }

  const { data: announcement } = await supabase.from("platform_settings").select("value").eq("key", "public.announcement").maybeSingle();
  const announcementText = typeof announcement?.value === "string" ? announcement.value : null;
  const prefs = (profile.preferences ?? {}) as { fontScale?: "md" | "lg" | "xl"; highContrast?: boolean; reduceMotion?: boolean; tourDone?: boolean };

  return (
    <div className="flex min-h-dvh">
      <A11yHydrator prefs={{ fontScale: prefs.fontScale, highContrast: prefs.highContrast, reduceMotion: prefs.reduceMotion }} />
      {profile.onboarding_completed && !prefs.tourDone ? <WelcomeTour role={role} show /> : null}
      <Sidebar role={role} statusSlot={statusSlot} />
      <div className="flex min-w-0 flex-1 flex-col">
        {announcementText ? (
          <div className="bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground">{announcementText}</div>
        ) : null}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl sm:px-6">
          <MobileMenu role={role} />
          <LogoMark className="size-8 lg:hidden" />
          <div className="flex flex-1 justify-center lg:justify-start">
            <CommandPalette role={role} />
          </div>
          <NotificationsBell userId={session.userId} />
          <UserMenu name={profile.full_name} email={session.email} roleLabel={ROLE_LABEL[role]} />
        </header>
        {statusSlot ? <div className="px-4 pt-4 sm:px-6 lg:hidden">{statusSlot}</div> : null}
        <main id="conteudo" className="mx-auto w-full max-w-[1320px] flex-1 px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pt-8 lg:pb-12">
          {children}
        </main>
      </div>
      <BottomNav role={role} />
    </div>
  );
}
