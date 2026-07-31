export const PHASE_TONE: Record<string, string> = {
  decide: 'text-amber-300 bg-amber-300/10',
  reposition: 'text-sky-300 bg-sky-300/10',
  build: 'text-accent bg-accent/10',
  market: 'text-fuchsia-300 bg-fuchsia-300/10',
}

export function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Monday-anchored start of the current week, as YYYY-MM-DD. */
export function weekStart(): string {
  const d = new Date()
  const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day)
  return d.toISOString().slice(0, 10)
}

export function weeksBetween(from: string, to: string): number {
  const ms = new Date(to).getTime() - new Date(from).getTime()
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24 * 7)))
}

export function fmtHours(minutes: number): string {
  const h = minutes / 60
  return h >= 10 || Number.isInteger(h) ? `${h.toFixed(0)}h` : `${h.toFixed(1)}h`
}

export function relativeDay(iso: string): string {
  const diff = Math.round(
    (new Date(today()).getTime() - new Date(iso).getTime()) / 86400000,
  )
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return `${diff} days ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
