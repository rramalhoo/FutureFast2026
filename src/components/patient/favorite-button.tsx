"use client";

import * as React from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { toggleFavoriteAction } from "@/server/actions/patient";
import { cn } from "@/lib/utils";

export function FavoriteButton({ type, id, initial, label }: { type: "doctor" | "pharmacy"; id: string; initial: boolean; label: string }) {
  const [fav, setFav] = React.useState(initial);
  const [pending, start] = React.useTransition();
  return (
    <button
      type="button"
      aria-pressed={fav}
      aria-label={fav ? `Remover ${label} dos favoritos` : `Favoritar ${label}`}
      disabled={pending}
      onClick={() =>
        start(async () => {
          setFav(!fav);
          const r = await toggleFavoriteAction(type, id, !fav);
          if (!r.ok) {
            setFav(fav);
            toast.error(r.error);
          }
        })
      }
      className="rounded-xl p-2 text-subtle-foreground transition-colors hover:bg-warning-soft hover:text-warning"
    >
      <Star className={cn("size-5 transition-transform", fav && "scale-110 fill-warning text-warning")} />
    </button>
  );
}
