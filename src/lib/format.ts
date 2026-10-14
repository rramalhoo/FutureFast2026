import { formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";

export const APP_TIME_ZONE = "America/Sao_Paulo";

const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: APP_TIME_ZONE });
const dateLongFmt = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: APP_TIME_ZONE });
const dateShortFmt = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", timeZone: APP_TIME_ZONE });
const weekdayFmt = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: APP_TIME_ZONE });
const timeFmt = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: APP_TIME_ZONE });
const dateTimeFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: APP_TIME_ZONE,
});
const currencyFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type DateInput = string | Date | null | undefined;

function toDate(value: DateInput) {
  if (!value) return null;
  // Datas puras (YYYY-MM-DD) são interpretadas ao meio-dia para não "voltar" um dia por fuso.
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T12:00:00-03:00`);
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export const fmt = {
  date: (v: DateInput) => (toDate(v) ? dateFmt.format(toDate(v)!) : "—"),
  dateLong: (v: DateInput) => (toDate(v) ? dateLongFmt.format(toDate(v)!) : "—"),
  dateShort: (v: DateInput) => (toDate(v) ? dateShortFmt.format(toDate(v)!) : "—"),
  weekday: (v: DateInput) => (toDate(v) ? weekdayFmt.format(toDate(v)!) : "—"),
  time: (v: DateInput) => (toDate(v) ? timeFmt.format(toDate(v)!) : "—"),
  dateTime: (v: DateInput) => (toDate(v) ? dateTimeFmt.format(toDate(v)!) : "—"),
  relative: (v: DateInput) =>
    toDate(v) ? formatDistanceToNowStrict(toDate(v)!, { addSuffix: true, locale: ptBR }) : "—",
  currency: (cents: number | null | undefined) => (cents == null ? "—" : currencyFmt.format(cents / 100)),
  /** "08:00:00" → "08:00" */
  clock: (t: string | null | undefined) => (t ? t.slice(0, 5) : "—"),
  cpf: (v: string | null | undefined) =>
    v && v.length === 11 ? `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9)}` : (v ?? "—"),
  cnpj: (v: string | null | undefined) =>
    v && v.length === 14 ? `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(8, 12)}-${v.slice(12)}` : (v ?? "—"),
  age: (birth: string | null | undefined) => {
    const d = toDate(birth);
    if (!d) return null;
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
    return age;
  },
};

/** Data (YYYY-MM-DD) de hoje no fuso da aplicação. */
export function todayISO(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIME_ZONE }).format(now);
}

/** Converte data local (YYYY-MM-DD) + hora (HH:MM) do fuso da aplicação em Date UTC. */
export function zonedDateTime(dateISO: string, time: string) {
  // America/Sao_Paulo não tem horário de verão desde 2019: UTC-3 fixo.
  return new Date(`${dateISO}T${time.slice(0, 5)}:00-03:00`);
}

export function addDaysISO(dateISO: string, days: number) {
  const d = new Date(`${dateISO}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
