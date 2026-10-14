import {
  Activity,
  BadgeCheck,
  Bot,
  Boxes,
  Building2,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileText,
  History,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  MessagesSquare,
  Pill,
  QrCode,
  ScanLine,
  ScrollText,
  Settings,
  Stethoscope,
  Users,
  ChartColumn,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/lib/supabase/types";

export type NavItem = { href: string; label: string; icon: LucideIcon; mobile?: boolean; exact?: boolean };
export type NavSection = { title?: string; items: NavItem[] };

export const NAV: Record<UserRole, NavSection[]> = {
  patient: [
    {
      items: [
        { href: "/paciente", label: "Início", icon: LayoutDashboard, mobile: true, exact: true },
        { href: "/paciente/medicamentos", label: "Medicamentos", icon: Pill, mobile: true },
        { href: "/paciente/calendario", label: "Calendário", icon: CalendarDays, mobile: true },
        { href: "/paciente/receitas", label: "Receitas", icon: FileText, mobile: true },
        { href: "/paciente/historico", label: "Histórico", icon: History },
      ],
    },
    {
      title: "Cuidado",
      items: [
        { href: "/paciente/medicos", label: "Médicos", icon: Stethoscope },
        { href: "/paciente/farmacias", label: "Farmácias", icon: Building2 },
        { href: "/paciente/mensagens", label: "Mensagens", icon: MessagesSquare, mobile: true },
        { href: "/paciente/leitor", label: "Leitor de receitas", icon: ScanLine },
      ],
    },
  ],
  doctor: [
    {
      items: [
        { href: "/medico", label: "Visão geral", icon: LayoutDashboard, mobile: true, exact: true },
        { href: "/medico/agenda", label: "Agenda", icon: CalendarDays, mobile: true },
        { href: "/medico/pacientes", label: "Pacientes", icon: Users, mobile: true },
        { href: "/medico/consultas", label: "Consultas", icon: ClipboardList },
        { href: "/medico/prescricoes", label: "Prescrições", icon: FileText, mobile: true },
      ],
    },
    {
      title: "Produtividade",
      items: [
        { href: "/medico/mensagens", label: "Mensagens", icon: MessagesSquare },
        { href: "/medico/assistente", label: "Assistente", icon: Bot },
        { href: "/medico/perfil", label: "Perfil profissional", icon: BadgeCheck },
      ],
    },
  ],
  pharmacy: [
    {
      items: [
        { href: "/farmacia", label: "Painel", icon: LayoutDashboard, mobile: true, exact: true },
        { href: "/farmacia/leitor", label: "Leitor QR Code", icon: QrCode, mobile: true },
        { href: "/farmacia/prescricoes", label: "Prescrições", icon: FileText, mobile: true },
        { href: "/farmacia/solicitacoes", label: "Solicitações", icon: Inbox, mobile: true },
        { href: "/farmacia/estoque", label: "Estoque", icon: Boxes },
        { href: "/farmacia/configuracoes", label: "Configurações", icon: Settings },
      ],
    },
  ],
  admin: [
    {
      items: [
        { href: "/admin", label: "Dashboard", icon: LayoutDashboard, mobile: true, exact: true },
        { href: "/admin/usuarios", label: "Usuários", icon: Users, mobile: true },
        { href: "/admin/verificacoes", label: "Verificações", icon: BadgeCheck, mobile: true },
        { href: "/admin/assinaturas", label: "Assinaturas", icon: CreditCard },
        { href: "/admin/relatorios", label: "Relatórios", icon: ChartColumn },
      ],
    },
    {
      title: "Operação",
      items: [
        { href: "/admin/suporte", label: "Suporte e LGPD", icon: LifeBuoy, mobile: true },
        { href: "/admin/auditoria", label: "Auditoria", icon: ScrollText },
        { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
      ],
    },
  ],
};

export const ROLE_ACCENT_ICON: Record<UserRole, LucideIcon> = {
  patient: Activity,
  doctor: Stethoscope,
  pharmacy: Building2,
  admin: Settings,
};

export function isActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}
