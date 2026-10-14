"use client";

import * as React from "react";
import { Switch as S, Checkbox as C } from "radix-ui";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Switch({ className, ...props }: React.ComponentProps<typeof S.Root>) {
  return (
    <S.Root
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-border-strong transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary",
        className,
      )}
      {...props}
    >
      <S.Thumb className="pointer-events-none block size-5 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] data-[state=checked]:translate-x-[1.3rem]" />
    </S.Root>
  );
}

export function Checkbox({ className, ...props }: React.ComponentProps<typeof C.Root>) {
  return (
    <C.Root
      className={cn(
        "peer flex size-5 shrink-0 items-center justify-center rounded-md border border-border-strong bg-surface transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
        className,
      )}
      {...props}
    >
      <C.Indicator>
        <Check className="size-3.5" strokeWidth={3} />
      </C.Indicator>
    </C.Root>
  );
}
