"use client";

import * as React from "react";
import { DropdownMenu as M } from "radix-ui";
import { cn } from "@/lib/utils";

export const DropdownMenu = M.Root;
export const DropdownMenuTrigger = M.Trigger;
export const DropdownMenuGroup = M.Group;

export function DropdownMenuContent({ className, sideOffset = 8, ...props }: React.ComponentProps<typeof M.Content>) {
  return (
    <M.Portal>
      <M.Content
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-52 overflow-hidden rounded-2xl border border-border bg-surface p-1.5 shadow-lg",
          "origin-[var(--radix-dropdown-menu-content-transform-origin)] data-[state=open]:[animation:gv-pop_160ms_cubic-bezier(0.22,1,0.36,1)]",
          className,
        )}
        {...props}
      />
    </M.Portal>
  );
}

export function DropdownMenuItem({
  className,
  tone,
  ...props
}: React.ComponentProps<typeof M.Item> & { tone?: "danger" }) {
  return (
    <M.Item
      className={cn(
        "flex cursor-pointer select-none items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-foreground outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-surface-sunken data-[highlighted]:text-foreground-strong [&_svg]:size-4 [&_svg]:text-subtle-foreground",
        tone === "danger" && "text-danger-foreground data-[highlighted]:bg-danger-soft [&_svg]:text-danger",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuLabel({ className, ...props }: React.ComponentProps<typeof M.Label>) {
  return <M.Label className={cn("px-3 pt-2 pb-1 text-caption font-medium text-subtle-foreground", className)} {...props} />;
}

export function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof M.Separator>) {
  return <M.Separator className={cn("my-1.5 h-px bg-border", className)} {...props} />;
}
