"use client";

import * as React from "react";
import { toast } from "sonner";
import { Camera, CameraOff, KeyRound, Loader2, QrCode, SearchX } from "lucide-react";
import { verifyPrescriptionAction, type VerifiedPrescription } from "@/server/actions/pharmacy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { VerificationResult } from "./verification-result";

type State = { status: "idle" } | { status: "loading" } | { status: "notfound" } | { status: "found"; result: VerifiedPrescription; code: string };

function extractCode(raw: string) {
  const m = raw.match(/verificar\/([0-9a-fA-F]{32})/);
  return (m ? m[1]! : raw).replace(/[^0-9a-fA-F]/g, "").toLowerCase();
}

export function PrescriptionLookup({ withCamera = false, initialCode, requestId, defaultPharmacist }: { withCamera?: boolean; initialCode?: string; requestId?: string; defaultPharmacist?: { name: string; crf: string } }) {
  const [state, setState] = React.useState<State>(initialCode ? { status: "loading" } : { status: "idle" });
  const [manual, setManual] = React.useState("");
  const [cameraOn, setCameraOn] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const rafRef = React.useRef<number>(0);
  const lockRef = React.useRef(false);

  const lookup = React.useCallback(async (raw: string) => {
    const code = extractCode(raw);
    if (code.length !== 32) {
      toast.error("Código inválido. São 32 caracteres (0–9, a–f).");
      return;
    }
    setState({ status: "loading" });
    const r = await verifyPrescriptionAction(code);
    if (!r.ok) {
      toast.error(r.error);
      setState({ status: "idle" });
      return;
    }
    if (!r.data || !("found" in r.data) || !r.data.found) setState({ status: "notfound" });
    else setState({ status: "found", result: r.data, code });
  }, []);

  const stop = React.useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);
  React.useEffect(() => stop, [stop]);

  React.useEffect(() => {
    if (!initialCode) return;
    const code = extractCode(initialCode);
    void verifyPrescriptionAction(code).then((r) => {
      if (!r.ok) {
        toast.error(r.error);
        setState({ status: "idle" });
      } else if (!r.data || !("found" in r.data) || !r.data.found) setState({ status: "notfound" });
      else setState({ status: "found", result: r.data, code });
    });
  }, [initialCode]);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setCameraOn(true);
      lockRef.current = false;
      const jsQR = (await import("jsqr")).default;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      requestAnimationFrame(() => {
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        void video.play();
        const tick = () => {
          if (!streamRef.current) return;
          if (video.readyState === video.HAVE_ENOUGH_DATA && ctx && !lockRef.current) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const qr = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
            if (qr?.data) {
              lockRef.current = true;
              stop();
              void lookup(qr.data);
              return;
            }
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      });
    } catch {
      toast.error("Não foi possível acessar a câmera. Digite o código da receita.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        {withCamera ? (
          <div className="surface-card overflow-hidden p-4">
            {cameraOn ? (
              <div className="relative">
                <video ref={videoRef} playsInline muted className="aspect-square w-full rounded-2xl bg-black object-cover sm:aspect-video" aria-label="Câmera para leitura do QR Code" />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
                  <div className="size-52 rounded-3xl border-4 border-white/80 shadow-[0_0_0_9999px_rgb(0_0_0/0.35)]" />
                </div>
                <Button variant="secondary" className="absolute right-3 bottom-3" onClick={stop}><CameraOff /> Parar</Button>
              </div>
            ) : (
              <button onClick={start} className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border-strong transition-colors hover:border-primary hover:bg-primary-soft/40">
                <Camera className="size-10 text-primary" aria-hidden />
                <span className="font-semibold text-foreground-strong">Ler QR Code com a câmera</span>
                <span className="text-caption text-muted-foreground">Aponte para o QR da receita do paciente</span>
              </button>
            )}
          </div>
        ) : null}
        <form
          className="surface-card flex flex-col justify-center gap-3 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            void lookup(manual);
          }}
        >
          <label htmlFor="rx-code" className="flex items-center gap-2 font-semibold text-foreground-strong"><KeyRound className="size-5 text-primary" /> Digitar código da receita</label>
          <Input id="rx-code" value={manual} onChange={(e) => setManual(e.target.value)} placeholder="32 caracteres — ex.: 3f9a 1c0b …" autoComplete="off" spellCheck={false} className="font-mono" />
          <Button type="submit" disabled={state.status === "loading"}>{state.status === "loading" ? <Loader2 className="animate-spin" /> : <QrCode />} Consultar receita</Button>
          <p className="text-caption text-muted-foreground">Cada consulta é registrada em auditoria e informada ao paciente. Limite de 20 consultas por minuto.</p>
        </form>
      </div>
      {state.status === "loading" ? <div className="surface-card flex items-center justify-center gap-3 p-10 text-muted-foreground" role="status"><Loader2 className="animate-spin" /> Verificando receita…</div> : null}
      {state.status === "notfound" ? <div className="surface-card"><EmptyState icon={SearchX} title="Receita não encontrada" description="Confira o código. Receitas em rascunho, aguardando assinatura ou inexistentes não são exibidas." /></div> : null}
      {state.status === "found" ? <VerificationResult result={state.result} code={state.code} requestId={requestId} defaultPharmacist={defaultPharmacist} /> : null}
      {state.status === "idle" && !withCamera ? <Alert tone="info">Digite o código impresso abaixo do QR Code ou use o leitor.</Alert> : null}
    </div>
  );
}
