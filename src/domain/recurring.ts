/**
 * Gastos recurrentes.
 *
 * Las ocurrencias previstas se calculan de forma virtual a partir de la fecha
 * ancla y la periodicidad. Solo se materializan en la base de datos cuando el
 * usuario las paga (creando el movimiento real) o las omite. Por eso los gastos
 * previstos nunca suman en los gastos reales antes de confirmarse.
 */
import { type ISODate, addDays, addMonthsClamped, daysBetween, parseISODate } from './dates'
import type { RecurringExpense, RecurringFrequency, RecurringOccurrence } from './types'

const MONTH_STEPS: Partial<Record<RecurringFrequency, number>> = {
  monthly: 1,
  bimonthly: 2,
  quarterly: 3,
  semiannual: 6,
  yearly: 12,
}
const DAY_STEPS: Partial<Record<RecurringFrequency, number>> = { weekly: 7, biweekly: 14 }

export const DUE_SOON_DAYS = 5
const MAX_OCCURRENCES = 600

/** Fecha de la n-ésima ocurrencia (n = 0 es la fecha ancla). */
export function occurrenceDate(anchor: ISODate, frequency: RecurringFrequency, n: number): ISODate {
  const months = MONTH_STEPS[frequency]
  if (months !== undefined) return addMonthsClamped(anchor, months * n, parseISODate(anchor).day)
  return addDays(anchor, (DAY_STEPS[frequency] ?? 30) * n)
}

/** Fechas de vencimiento desde la ancla hasta `until` (inclusive). */
export function listOccurrenceDates(rec: Pick<RecurringExpense, 'anchorDate' | 'frequency' | 'endDate'>, until: ISODate): ISODate[] {
  const dates: ISODate[] = []
  const limit = rec.endDate && rec.endDate < until ? rec.endDate : until
  for (let n = 0; n < MAX_OCCURRENCES; n++) {
    const d = occurrenceDate(rec.anchorDate, rec.frequency, n)
    if (d > limit) break
    dates.push(d)
  }
  return dates
}

export type OccurrenceState = 'paid' | 'skipped' | 'overdue' | 'due_soon' | 'pending'

export const OCCURRENCE_STATE_LABELS: Record<OccurrenceState, string> = {
  paid: 'Pagado',
  skipped: 'Omitido',
  overdue: 'Vencido',
  due_soon: 'Próximo',
  pending: 'Pendiente',
}

export interface OccurrenceView {
  recurringId: string
  dueDate: ISODate
  state: OccurrenceState
  daysToDue: number
  occurrence: RecurringOccurrence | null
}

export interface RecurringSchedule {
  /** Primera ocurrencia sin pagar ni omitir (puede estar vencida). */
  next: OccurrenceView | null
  overdue: OccurrenceView[]
  timeline: OccurrenceView[]
  status: 'active' | 'paused' | 'ended'
}

export function occurrenceState(dueDate: ISODate, today: ISODate, occ: RecurringOccurrence | null): OccurrenceState {
  if (occ?.status === 'paid') return 'paid'
  if (occ?.status === 'skipped') return 'skipped'
  const days = daysBetween(today, dueDate)
  if (days < 0) return 'overdue'
  if (days <= DUE_SOON_DAYS) return 'due_soon'
  return 'pending'
}

export function buildRecurringSchedule(
  rec: RecurringExpense,
  occurrences: readonly RecurringOccurrence[],
  today: ISODate,
  horizonDays = 60,
): RecurringSchedule {
  const own = new Map(occurrences.filter((o) => o.recurringId === rec.id).map((o) => [o.dueDate, o]))
  const ended = rec.status === 'ended' || (rec.endDate !== null && rec.endDate < today && !hasUnpaidBefore(rec, own, rec.endDate))
  const until = addDays(today, horizonDays)
  const dates = listOccurrenceDates(rec, until)
  const timeline: OccurrenceView[] = dates.map((dueDate) => {
    const occurrence = own.get(dueDate) ?? null
    return {
      recurringId: rec.id,
      dueDate,
      occurrence,
      state: occurrenceState(dueDate, today, occurrence),
      daysToDue: daysBetween(today, dueDate),
    }
  })
  // Si el horizonte no alcanza la siguiente ocurrencia, añadimos la próxima futura.
  if (!timeline.some((t) => t.state !== 'paid' && t.state !== 'skipped') && rec.status === 'active' && !ended) {
    const nextDate = occurrenceDate(rec.anchorDate, rec.frequency, dates.length)
    if (!rec.endDate || nextDate <= rec.endDate) {
      timeline.push({
        recurringId: rec.id,
        dueDate: nextDate,
        occurrence: null,
        state: occurrenceState(nextDate, today, null),
        daysToDue: daysBetween(today, nextDate),
      })
    }
  }
  const status: RecurringSchedule['status'] = ended ? 'ended' : rec.status === 'paused' ? 'paused' : 'active'
  const open = status === 'active' ? timeline.filter((t) => t.state !== 'paid' && t.state !== 'skipped') : []
  return {
    next: open[0] ?? null,
    overdue: open.filter((t) => t.state === 'overdue'),
    timeline,
    status,
  }
}

function hasUnpaidBefore(
  rec: RecurringExpense,
  own: Map<ISODate, RecurringOccurrence>,
  endDate: ISODate,
): boolean {
  return listOccurrenceDates(rec, endDate).some((d) => !own.has(d))
}

/** Clave idempotente de una ocurrencia (recurrencia + fecha). */
export function occurrenceKey(recurringId: string, dueDate: ISODate): string {
  return `${recurringId}:${dueDate}`
}
