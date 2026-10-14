import Link from "next/link";
import { cn } from "@/lib/utils";

/** Marca Genvity: um "G" contínuo que termina em cápsula — cuidado + continuidade. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("size-9", className)} aria-hidden>
      <defs>
        <linearGradient id="gv-logo-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a35bcc" />
          <stop offset="100%" stopColor="#6e2b94" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill="url(#gv-logo-bg)" />
      <path
        d="M28.5 13.2A10 10 0 1 0 30 20h-8.6"
        fill="none"
        stroke="#fff"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
      <circle cx="21.4" cy="20" r="2.6" fill="#ead8f3" />
    </svg>
  );
}

export function Logo({ className, href = "/", tagline = false }: { className?: string; href?: string; tagline?: boolean }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2.5 rounded-xl", className)} aria-label="Genvity — início">
      <LogoMark className="transition-transform duration-300 group-hover:rotate-[-6deg]" />
      <span className="flex flex-col leading-none">
        <span className="text-[1.2rem] font-semibold tracking-[-0.03em] text-foreground-strong">Genvity</span>
        {tagline ? <span className="mt-1 text-[0.68rem] font-medium text-muted-foreground">Saúde conectada</span> : null}
      </span>
    </Link>
  );
}
