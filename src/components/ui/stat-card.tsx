import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  href,
  tone = "brand",
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  href?: string;
  tone?: "brand" | "success" | "warning" | "info" | "danger";
  className?: string;
}) {
  const tones = {
    brand: "bg-primary-soft text-primary-soft-foreground",
    success: "bg-success-soft text-success-foreground",
    warning: "bg-warning-soft text-warning-foreground",
    info: "bg-info-soft text-info-foreground",
    danger: "bg-danger-soft text-danger-foreground",
  };
  const body = (
    <>
      <div className="flex items-center justify-between">
        <span className={cn("flex size-10 items-center justify-center rounded-xl", tones[tone])}>
          <Icon className="size-5" aria-hidden />
        </span>
      </div>
      <div className="mt-4 text-metric font-semibold text-foreground-strong tabular">{value}</div>
      <div className="mt-1.5 text-sm font-medium text-foreground">{label}</div>
      {hint ? <div className="mt-0.5 text-caption text-muted-foreground">{hint}</div> : null}
    </>
  );
  const cls = cn(
    "surface-card block p-5 transition-[transform,box-shadow,border-color] duration-200",
    href && "hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md",
    className,
  );
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
