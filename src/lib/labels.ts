import type { BadgeTone } from "@/components/ui/badge";
import type { Enums } from "@/lib/supabase/types";

type LabelMap<T extends string> = Record<T, { label: string; tone: BadgeTone }>;

export const ROLE_LABEL: Record<Enums<"user_role">, string> = {
  patient: "Paciente",
  doctor: "Médico(a)",
  pharmacy: "Farmácia",
  admin: "Administrador(a)",
};

export const VERIFICATION: LabelMap<Enums<"verification_status">> = {
  not_submitted: { label: "Não enviado", tone: "neutral" },
  under_review: { label: "Em análise", tone: "warning" },
  approved: { label: "Verificado", tone: "success" },
  rejected: { label: "Recusado", tone: "danger" },
};

export const PRESCRIPTION_STATUS: LabelMap<Enums<"prescription_status">> = {
  draft: { label: "Rascunho", tone: "neutral" },
  pending_signature: { label: "Aguardando assinatura", tone: "warning" },
  issued: { label: "Emitida", tone: "success" },
  dispensed: { label: "Dispensada", tone: "info" },
  cancelled: { label: "Cancelada", tone: "danger" },
  expired: { label: "Expirada", tone: "outline" },
};

export const PRESCRIPTION_KIND: Record<Enums<"prescription_kind">, { label: string; requirement: string }> = {
  simple: {
    label: "Receita simples",
    requirement: "Apresentação da receita válida. Verifique identificação do paciente e do prescritor.",
  },
  antimicrobial: {
    label: "Antimicrobiano",
    requirement:
      "Receita com validade reduzida e retenção/escrituração conforme norma sanitária vigente. Requer conferência farmacêutica.",
  },
  special_control: {
    label: "Controle especial",
    requirement:
      "Sujeita a regras específicas de receituário e escrituração (controle especial). Requer conferência farmacêutica presencial.",
  },
};

export const APPOINTMENT_STATUS: LabelMap<Enums<"appointment_status">> = {
  requested: { label: "Solicitada", tone: "warning" },
  confirmed: { label: "Confirmada", tone: "success" },
  completed: { label: "Realizada", tone: "info" },
  cancelled: { label: "Cancelada", tone: "neutral" },
  no_show: { label: "Não compareceu", tone: "danger" },
};

export const MODALITY: Record<Enums<"appointment_modality">, string> = {
  in_person: "Presencial",
  telehealth: "Teleconsulta",
};

export const MEDICATION_STATUS: LabelMap<Enums<"medication_status">> = {
  active: { label: "Em uso", tone: "success" },
  paused: { label: "Pausado", tone: "warning" },
  completed: { label: "Concluído", tone: "neutral" },
  discontinued: { label: "Descontinuado", tone: "danger" },
};

export const PHARMACY_REQUEST_STATUS: LabelMap<Enums<"pharmacy_request_status">> = {
  received: { label: "Recebida", tone: "info" },
  reviewing: { label: "Em conferência", tone: "warning" },
  awaiting_stock: { label: "Aguardando estoque", tone: "warning" },
  preparing: { label: "Em separação", tone: "brand" },
  ready: { label: "Pronta para retirada", tone: "success" },
  completed: { label: "Concluída", tone: "neutral" },
  cancelled: { label: "Cancelada", tone: "danger" },
};

export const STOCK_STATUS: LabelMap<Enums<"stock_status">> = {
  available: { label: "Disponível", tone: "success" },
  low: { label: "Estoque baixo", tone: "warning" },
  unavailable: { label: "Indisponível", tone: "danger" },
};

export const SUBSCRIPTION_STATUS: LabelMap<Enums<"subscription_status">> = {
  pending: { label: "Aguardando pagamento", tone: "warning" },
  trialing: { label: "Período de teste", tone: "info" },
  active: { label: "Ativa", tone: "success" },
  past_due: { label: "Em atraso", tone: "danger" },
  canceled: { label: "Cancelada", tone: "neutral" },
};

export const TICKET_STATUS: LabelMap<Enums<"ticket_status">> = {
  open: { label: "Aberto", tone: "warning" },
  in_progress: { label: "Em andamento", tone: "info" },
  resolved: { label: "Resolvido", tone: "success" },
  closed: { label: "Encerrado", tone: "neutral" },
};

export const DSR_KIND: Record<Enums<"dsr_kind">, string> = {
  export: "Portabilidade/cópia dos dados",
  deletion: "Exclusão de conta e dados",
  correction: "Correção de dados",
  access_report: "Relatório de acessos",
};

export const DSR_STATUS: LabelMap<Enums<"dsr_status">> = {
  open: { label: "Aberta", tone: "warning" },
  in_progress: { label: "Em andamento", tone: "info" },
  completed: { label: "Concluída", tone: "success" },
  rejected: { label: "Recusada", tone: "danger" },
};

export const BR_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB",
  "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export const SPECIALTIES = [
  "Clínica médica", "Medicina de família e comunidade", "Cardiologia", "Dermatologia", "Endocrinologia",
  "Gastroenterologia", "Geriatria", "Ginecologia e obstetrícia", "Neurologia", "Oftalmologia",
  "Ortopedia e traumatologia", "Otorrinolaringologia", "Pediatria", "Pneumologia", "Psiquiatria",
  "Reumatologia", "Urologia", "Infectologia", "Nefrologia", "Oncologia clínica",
] as const;

export const AUDIT_ACTION_LABEL: Record<string, string> = {
  "prescription.created": "Prescrição criada",
  "prescription.status_changed": "Status de prescrição alterado",
  "prescription.issued": "Prescrição emitida",
  "prescription.viewed_by_pharmacy": "Receita consultada por farmácia",
  "prescription.dispensed": "Dispensação registrada",
  "prescription.shared_with_pharmacy": "Receita enviada a farmácia",
  "prescription.lookup_not_found": "Consulta de receita sem resultado",
  "prescription.lookup_invalid": "Código de receita inválido",
  "patient_record.viewed": "Prontuário acessado por médico",
  "care.created": "Vínculo de acompanhamento criado",
  "care.updated": "Vínculo/consentimento atualizado",
  "care.invited": "Convite de acompanhamento enviado",
  "document.uploaded": "Documento enviado",
  "document.deleted": "Documento removido",
  "appointment.status_changed": "Status de consulta alterado",
  "privacy.export": "Exportação de dados (LGPD)",
  "onboarding.completed": "Cadastro concluído",
  "verification.submitted": "Verificação enviada",
  "verification.approved": "Verificação aprovada",
  "verification.rejected": "Verificação recusada",
  "subscription.chosen": "Plano escolhido",
  "subscription.canceled": "Assinatura cancelada",
};
