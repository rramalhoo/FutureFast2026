import { cn, initials } from "@/lib/utils";

const tones = [
  "bg-brand-100 text-brand-700",
  "bg-[#e2edfb] text-[#1f5aa6]",
  "bg-[#e3f4e6] text-[#23703a]",
  "bg-[#fdf0dc] text-[#8a5208]",
  "bg-[#f3e4ef] text-[#8a2a6c]",
];

function toneFor(seed: string) {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return tones[hash % tones.length];
}

export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string | null | undefined;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const sizes = { sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-12 text-base", xl: "size-16 text-lg" };
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-tight dark:brightness-90",
        sizes[size],
        toneFor(name ?? "G"),
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
