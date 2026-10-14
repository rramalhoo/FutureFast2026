"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { Camera, CheckCircle2, ImageUp, Plus, RefreshCw, ScanText, ShieldAlert, Trash2, TriangleAlert } from "lucide-react";
import { saveConfirmedOcrAction } from "@/server/actions/patient";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Input, Textarea } from "@/components/ui/input";
import { ProgressBar } from "@/components/ui/progress";
import { TimesEditor } from "@/components/shared/times-editor";
import { todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";

type OcrWord = { text: string; confidence: number };
type OcrLine = { words: OcrWord[]; text: string; confidence: number };
type Item = { key: string; name: string; dosage: string; frequency: string; instructions: string; times: string[] };

const LOW_CONFIDENCE = 70;
const steps = ["Capturar", "Ler", "Revisar", "Organizar"] as const;

export function OcrReader() {
  const [step, setStep] = React.useState(0);
  const [image, setImage] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState(0);
  const [status, setStatus] = React.useState("");
  const [lines, setLines] = React.useState<OcrLine[]>([]);
  const [text, setText] = React.useState("");
  const [items, setItems] = React.useState<Item[]>([]);
  const [confirmed, setConfirmed] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [cameraOn, setCameraOn] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  const stopCamera = React.useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);
  React.useEffect(() => stopCamera, [stopCamera]);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1920 } } });
      streamRef.current = stream;
      setCameraOn(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch {
      toast.error("Não foi possível acessar a câmera. Envie uma foto da receita.");
    }
  }

  function capture() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    setImage(canvas.toDataURL("image/jpeg", 0.92));
    stopCamera();
  }

  function onFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Envie uma imagem (JPG, PNG ou WEBP).");
    if (file.size > 15 * 1024 * 1024) return toast.error("Imagem muito grande (máx. 15 MB).");
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function runOcr() {
    if (!image) return;
    setStep(1);
    setProgress(0);
    setStatus("Preparando leitura…");
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("por", 1, {
        logger: (m: { status: string; progress: number }) => {
          setStatus(m.status === "recognizing text" ? "Reconhecendo texto…" : "Carregando modelo de leitura…");
          setProgress(Math.round((m.progress ?? 0) * 100));
        },
      });
      const { data } = await worker.recognize(image, {}, { blocks: true, text: true });
      await worker.terminate();
      const parsed: OcrLine[] = [];
      for (const block of data.blocks ?? []) {
        for (const para of block.paragraphs) {
          for (const line of para.lines) {
            const words = line.words.map((w) => ({ text: w.text, confidence: w.confidence }));
            if (words.some((w) => w.text.trim())) parsed.push({ words, text: line.text.trim(), confidence: line.confidence });
          }
        }
      }
      setLines(parsed);
      setText(data.text.trim());
      setStep(2);
    } catch {
      toast.error("A leitura falhou. Verifique sua conexão (o modelo de leitura é baixado na primeira vez) e tente novamente.");
      setStep(0);
    }
  }

  const uncertainCount = lines.reduce((acc, l) => acc + l.words.filter((w) => w.confidence < LOW_CONFIDENCE).length, 0);

  function addItem(name = "") {
    setItems((prev) => [...prev, { key: crypto.randomUUID(), name, dosage: "", frequency: "", instructions: "", times: [] }]);
  }
  const update = (key: string, patch: Partial<Item>) => setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  async function save() {
    setSaving(true);
    const r = await saveConfirmedOcrAction({
      items: items.map((i) => ({ name: i.name, dosage: i.dosage || undefined, frequency: i.frequency || undefined, instructions: i.instructions || undefined, scheduleTimes: i.times })),
      startDate: todayISO(),
      confirmed: confirmed as true,
    });
    setSaving(false);
    if (r.ok) {
      toast.success(r.message);
      setDone(true);
    } else toast.error(r.error);
  }

  function reset() {
    setStep(0);
    setImage(null);
    setLines([]);
    setText("");
    setItems([]);
    setConfirmed(false);
    setDone(false);
  }

  if (done) {
    return (
      <div className="surface-card flex flex-col items-center gap-3 p-10 text-center">
        <CheckCircle2 className="size-12 text-success" aria-hidden />
        <h2 className="text-h2 font-semibold">Itens organizados</h2>
        <p className="max-w-md text-muted-foreground">Os medicamentos foram adicionados como registro pessoal. Eles não substituem a receita original nem autorizam a compra de medicamentos.</p>
        <div className="mt-2 flex gap-2">
          <Button asChild><Link href="/paciente/medicamentos">Ver medicamentos</Link></Button>
          <Button variant="secondary" onClick={reset}>Ler outra receita</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ol className="grid grid-cols-4 gap-2" aria-label="Etapas">
        {steps.map((s, i) => (
          <li key={s} aria-current={step === i ? "step" : undefined} className="space-y-1.5">
            <div className={cn("h-1.5 rounded-full transition-colors", i <= step ? "bg-primary" : "bg-surface-sunken")} />
            <p className={cn("text-caption font-medium", i <= step ? "text-foreground-strong" : "text-muted-foreground")}>{i + 1}. {s}</p>
          </li>
        ))}
      </ol>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
          {step === 0 ? (
            <div className="surface-card space-y-5 p-5 sm:p-6">
              {cameraOn ? (
                <div className="space-y-3">
                  <video ref={videoRef} className="aspect-[3/4] w-full rounded-2xl bg-black object-cover sm:aspect-video" playsInline muted aria-label="Pré-visualização da câmera" />
                  <div className="flex justify-center gap-2">
                    <Button size="lg" onClick={capture}><Camera /> Capturar</Button>
                    <Button size="lg" variant="secondary" onClick={stopCamera}>Cancelar</Button>
                  </div>
                </div>
              ) : image ? (
                <div className="space-y-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image} alt="Receita capturada" className="max-h-[420px] w-full rounded-2xl border border-border object-contain" />
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button size="lg" onClick={runOcr}><ScanText /> Ler texto</Button>
                    <Button size="lg" variant="secondary" onClick={() => setImage(null)}><RefreshCw /> Trocar imagem</Button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <button onClick={startCamera} className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border-strong p-8 transition-colors hover:border-primary hover:bg-primary-soft/40">
                    <Camera className="size-8 text-primary" aria-hidden />
                    <span className="font-semibold text-foreground-strong">Usar a câmera</span>
                    <span className="text-caption text-muted-foreground">Fotografe a receita em um local bem iluminado</span>
                  </button>
                  <label className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border-strong p-8 transition-colors hover:border-primary hover:bg-primary-soft/40">
                    <ImageUp className="size-8 text-primary" aria-hidden />
                    <span className="font-semibold text-foreground-strong">Enviar uma foto</span>
                    <span className="text-caption text-muted-foreground">JPG, PNG ou WEBP</span>
                    <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
                  </label>
                </div>
              )}
              <p className="text-center text-caption text-muted-foreground">A imagem é processada no seu próprio dispositivo e não é enviada aos servidores do Genvity.</p>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="surface-card space-y-4 p-8 text-center" role="status">
              <ScanText className="mx-auto size-10 animate-pulse text-primary" aria-hidden />
              <p className="font-semibold text-foreground-strong">{status}</p>
              <ProgressBar value={progress} label="Progresso da leitura" className="mx-auto max-w-sm" />
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              {uncertainCount > 0 ? (
                <Alert tone="warning" icon={TriangleAlert} title={`${uncertainCount} trecho(s) com leitura incerta`}>
                  Palavras destacadas podem estar erradas. Confira com a receita original e corrija o texto abaixo.
                </Alert>
              ) : (
                <Alert tone="info">Mesmo sem alertas, confira cada informação com a receita original.</Alert>
              )}
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="surface-card p-5">
                  <h3 className="mb-3 font-semibold">Texto identificado</h3>
                  {lines.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum texto reconhecido. Tente outra foto com mais luz e foco.</p>
                  ) : (
                    <ul className="scrollbar-thin max-h-[420px] space-y-2 overflow-y-auto">
                      {lines.map((l, i) => (
                        <li key={i} className="flex items-start justify-between gap-3 rounded-xl px-2 py-1.5 hover:bg-surface-muted">
                          <p className="text-sm leading-relaxed">
                            {l.words.map((w, j) => (
                              <span key={j} className={cn(w.confidence < LOW_CONFIDENCE && "rounded bg-warning-soft px-0.5 text-warning-foreground underline decoration-warning decoration-wavy")} title={w.confidence < LOW_CONFIDENCE ? `Leitura incerta (${Math.round(w.confidence)}%)` : undefined}>
                                {w.text}{" "}
                              </span>
                            ))}
                          </p>
                          <Button variant="ghost" size="icon-sm" aria-label="Usar esta linha como item" onClick={() => { addItem(l.text.slice(0, 200)); setStep(3); }}>
                            <Plus />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="surface-card p-5">
                  <label htmlFor="ocr-text" className="mb-3 block font-semibold">Texto editável</label>
                  <Textarea id="ocr-text" value={text} onChange={(e) => setText(e.target.value)} rows={14} />
                </div>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <Button variant="secondary" onClick={reset}><RefreshCw /> Recomeçar</Button>
                <Button onClick={() => { if (items.length === 0) addItem(); setStep(3); }}>Organizar medicamentos</Button>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <Alert tone="danger" icon={ShieldAlert} title="Importante">
                Esta leitura é apenas um auxílio de organização. Ela não gera prescrição válida, não recomenda doses e não autoriza
                dispensação. Copie as informações exatamente como estão na receita do seu médico.
              </Alert>
              {items.map((item, idx) => (
                <div key={item.key} className="surface-card space-y-4 p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Item {idx + 1}</h3>
                    <Button variant="ghost" size="icon-sm" aria-label={`Remover item ${idx + 1}`} onClick={() => setItems((prev) => prev.filter((i) => i.key !== item.key))}><Trash2 /></Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="space-y-1.5 text-sm font-medium">Medicamento<Input value={item.name} onChange={(e) => update(item.key, { name: e.target.value })} /></label>
                    <label className="space-y-1.5 text-sm font-medium">Dose (como na receita)<Input value={item.dosage} onChange={(e) => update(item.key, { dosage: e.target.value })} /></label>
                    <label className="space-y-1.5 text-sm font-medium">Frequência (como na receita)<Input value={item.frequency} onChange={(e) => update(item.key, { frequency: e.target.value })} /></label>
                  </div>
                  <TimesEditor value={item.times} onChange={(times) => update(item.key, { times })} label="Horários dos lembretes" />
                  <label className="block space-y-1.5 text-sm font-medium">Orientações<Input value={item.instructions} onChange={(e) => update(item.key, { instructions: e.target.value })} /></label>
                </div>
              ))}
              <Button variant="soft" onClick={() => addItem()}><Plus /> Adicionar item</Button>
              <label className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 text-sm">
                <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 size-4 accent-[var(--primary)]" />
                <span>Conferi todos os itens com a receita original e entendo que este é um registro pessoal, que não substitui a prescrição médica.</span>
              </label>
              <div className="flex flex-wrap justify-between gap-2">
                <Button variant="secondary" onClick={() => setStep(2)}>Voltar ao texto</Button>
                <Button onClick={save} loading={saving} disabled={!confirmed || items.length === 0 || items.some((i) => i.name.trim().length < 2)}>Salvar itens confirmados</Button>
              </div>
            </div>
          ) : null}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
