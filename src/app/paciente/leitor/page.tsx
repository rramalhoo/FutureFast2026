import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { OcrReader } from "@/components/patient/ocr-reader";

export const metadata: Metadata = { title: "Leitor de receitas" };

export default async function OcrPage() {
  await requireRole("patient");
  return (
    <div className="space-y-6">
      <PageHeader
        title="Leitor auxiliar de receitas"
        description="Fotografe uma receita em papel, revise o texto identificado e organize seus medicamentos — sempre com a sua confirmação."
      />
      <OcrReader />
    </div>
  );
}
