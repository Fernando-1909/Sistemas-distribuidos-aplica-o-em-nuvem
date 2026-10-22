export type DueTone = 'overdue' | 'today' | 'tomorrow' | 'later';

const pad = (n: number) => String(n).padStart(2, '0');

export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = () => toISO(new Date());

const parse = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export function addDays(iso: string, n: number): string {
  const d = parse(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** Diferença em dias (a - b), ignorando fuso/horário de verão. */
export function diffDays(a: string, b: string): number {
  const [ya, ma, da] = a.split('-').map(Number);
  const [yb, mb, db] = b.split('-').map(Number);
  return Math.round((Date.UTC(ya, ma - 1, da) - Date.UTC(yb, mb - 1, db)) / 86400000);
}

const short = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' });
const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' });
const long = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

const clean = (s: string) => s.replace('.', '');

export function dueInfo(due: string, today = todayISO()): { label: string; tone: DueTone } {
  const d = diffDays(due, today);
  if (d < 0) return { label: clean(short.format(parse(due))), tone: 'overdue' };
  if (d === 0) return { label: 'Hoje', tone: 'today' };
  if (d === 1) return { label: 'Amanhã', tone: 'tomorrow' };
  if (d < 7) return { label: clean(weekday.format(parse(due))), tone: 'later' };
  return { label: clean(short.format(parse(due))), tone: 'later' };
}

export function longDay(iso: string): string {
  const s = long.format(parse(iso));
  return s.charAt(0).toUpperCase() + s.slice(1);
}
