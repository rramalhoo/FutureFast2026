"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { updatePreferencesAction } from "@/server/actions/account";
import { allowTourAgain } from "@/components/shared/welcome-tour";

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
          allowTourAgain();
          toast.success("O tour será exibido na página inicial.");
          router.push("/entrar");
        })
      }
    >
      <Sparkles /> Rever tour inicial
    </Button>
  );
}
