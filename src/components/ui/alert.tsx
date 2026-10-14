import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const tones = {
  info: { icon: Info, cls: "border-info/25 bg-info-soft text-info-foreground" },
  success: { icon: CircleCheck, cls: "border-success/25 bg-success-soft text-success-foreground" },
  warning: { icon: TriangleAlert, cls: "border-warning/30 bg-warning-soft text-warning-foreground" },
  danger: { icon: CircleAlert, cls: "border-danger/25 bg-danger-soft text-danger-foreground" },
  brand: { icon: Info, cls: "border-primary/20 bg-primary-soft text-primary-soft-foreground" },
} satisfies Record<string, { icon: LucideIcon; cls: string }>;

export function Alert({
  tone = "info",
  title,
  children,
  icon,
  className,
  action,
}: {
  tone?: keyof typeof tones;
  title?: React.ReactNode;
  children?: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
  action?: React.ReactNode;
}) {
  const Icon = icon ?? tones[tone].icon;
  return (
    <div role="note" className={cn("flex gap-3 rounded-2xl border px-4 py-3.5 text-sm", tones[tone].cls, className)}>
      <Icon className="mt-0.5 size-[1.15rem] shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 space-y-0.5">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="leading-relaxed opacity-90">{children}</div> : null}
      </div>
      {action ? <div className="shrink-0 self-center">{action}</div> : null}
    </div>
  );
}
