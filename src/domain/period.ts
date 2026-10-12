/**
 * Corte financiero mensual del 11 al 10 (ambos inclusive).
 *
 * Regla de negocio: cada corte comienza el día 11 de un mes y termina el día 10
 * del mes siguiente. El día 10 pertenece al corte que termina y el 11 al que
 * comienza. Esta es la ÚNICA implementación de la regla en toda la aplicación.
 */
import {
  type ISODate,
  addMonthsClamped,
  daysBetween,
  formatMonthShort,
  isWithin,
  parseISODate,
  toISODate,
  todayInBogota,
} from './dates'

export const CUT_START_DAY = 11
export const CUT_END_DAY = CUT_START_DAY - 1

export interface CutPeriod {
  /** Identificador estable: año y mes en que comienza el corte (`YYYY-MM`). */
  id: string
  start: ISODate
  end: ISODate
  /** Ej.: «11 sep – 10 oct 2026» */
  label: string
  /** Ej.: «Sep–Oct» */
  shortLabel: string
}

const PERIOD_ID_RE = /^(\d{4})-(\d{2})$/

function monthName(year: number, month: number): string {
  return formatMonthShort(toISODate({ year, month, day: 1 }))
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function buildPeriod(startYear: number, startMonth: number): CutPeriod {
  const start = toISODate({ year: startYear, month: startMonth, day: CUT_START_DAY })
  const endDate = addMonthsClamped(start, 1, CUT_END_DAY)
  const { year: endYear, month: endMonth } = parseISODate(endDate)
  const startName = monthName(startYear, startMonth)
  const endName = monthName(endYear, endMonth)
  const label =
    startYear === endYear
      ? `${CUT_START_DAY} ${startName} – ${CUT_END_DAY} ${endName} ${endYear}`
      : `${CUT_START_DAY} ${startName} ${startYear} – ${CUT_END_DAY} ${endName} ${endYear}`
  return {
    id: `${startYear}-${String(startMonth).padStart(2, '0')}`,
    start,
    end: endDate,
    label,
    shortLabel: `${capitalize(startName)}–${capitalize(endName)}${startYear !== endYear ? ` ${String(endYear).slice(2)}` : ''}`,
  }
}

/** Corte al que pertenece una fecha local. */
export function getPeriodForDate(date: ISODate): CutPeriod {
  const { year, month, day } = parseISODate(date)
  if (day >= CUT_START_DAY) return buildPeriod(year, month)
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  return buildPeriod(prevYear, prevMonth)
}

/** Corte actual según la fecha local de Bogotá. */
export function getCurrentPeriod(now: Date = new Date()): CutPeriod {
  return getPeriodForDate(todayInBogota(now))
}

export function isValidPeriodId(id: string): boolean {
  const m = PERIOD_ID_RE.exec(id)
  if (!m) return false
  const month = Number(m[2])
  return month >= 1 && month <= 12
}

export function getPeriodById(id: string): CutPeriod {
  const m = PERIOD_ID_RE.exec(id)
  if (!m || !isValidPeriodId(id)) throw new Error(`Identificador de corte inválido: ${id}`)
  return buildPeriod(Number(m[1]), Number(m[2]))
}

export function shiftPeriod(period: CutPeriod, offset: number): CutPeriod {
  const { year, month } = parseISODate(period.start)
  const total = year * 12 + (month - 1) + offset
  return buildPeriod(Math.floor(total / 12), (total % 12) + 1)
}

export const getPreviousPeriod = (p: CutPeriod) => shiftPeriod(p, -1)
export const getNextPeriod = (p: CutPeriod) => shiftPeriod(p, 1)

/** Indica si un corte corresponde a un periodo posterior al corte activo actual. */
export function isFuturePeriod(period: CutPeriod, now: Date = new Date()): boolean {
  const current = getCurrentPeriod(now)
  return period.id > current.id
}

/** Indica si un corte es exactamente el corte activo actual en Bogotá. */
export function isCurrentPeriod(period: CutPeriod, now: Date = new Date()): boolean {
  const current = getCurrentPeriod(now)
  return period.id === current.id
}

/** Determina si es posible avanzar al siguiente corte (solo si no estamos ya en el actual). */
export function canNavigateToNextPeriod(period: CutPeriod, now: Date = new Date()): boolean {
  const current = getCurrentPeriod(now)
  return period.id < current.id
}

export function isDateInPeriod(date: ISODate, period: CutPeriod): boolean {
  return isWithin(date, period.start, period.end)
}

/** Los últimos `count` cortes terminando en `period` (orden cronológico). */
export function getRecentPeriods(period: CutPeriod, count: number): CutPeriod[] {
  return Array.from({ length: count }, (_, i) => shiftPeriod(period, i - (count - 1)))
}

export function periodLengthInDays(period: CutPeriod): number {
  return daysBetween(period.start, period.end) + 1
}

/**
 * Días del corte ya transcurridos (incluido hoy). Para cortes futuros devuelve 0
 * y para cortes pasados la duración completa.
 */
export function elapsedDaysInPeriod(period: CutPeriod, today: ISODate): number {
  if (today < period.start) return 0
  if (today > period.end) return periodLengthInDays(period)
  return daysBetween(period.start, today) + 1
}

export function comparePeriods(a: CutPeriod, b: CutPeriod): number {
  return a.start < b.start ? -1 : a.start > b.start ? 1 : 0
}
