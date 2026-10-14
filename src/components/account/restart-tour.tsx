"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updatePreferencesAction } from "@/server/actions/account";

export function RestartTourButton() {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant="secondary"
      loading={pending}
      onClick={() =>
        start(async () => {
          await updatePreferencesAction({ tourDone: false });
          router.refresh();
        })
      }
    >
      <Sparkles /> Rever tour inicial
    </Button>
  );
}
