"use client";

import * as React from "react";
import { Tooltip as T } from "radix-ui";

export const TooltipProvider = T.Provider;

export function Tooltip({ content, children, side = "top" }: { content: React.ReactNode; children: React.ReactNode; side?: "top" | "bottom" | "left" | "right" }) {
  return (
    <T.Root delayDuration={250}>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content
          side={side}
          sideOffset={6}
          className="z-50 max-w-xs rounded-lg bg-foreground-strong px-2.5 py-1.5 text-xs font-medium text-background shadow-md data-[state=delayed-open]:[animation:gv-fade_120ms_ease-out]"
        >
          {content}
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}
