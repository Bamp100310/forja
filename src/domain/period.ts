/**
 * FORJA V2 — Motor de Periodos y Cortes Financieros Parametrizables.
 *
 * Soporta:
 *  1. Ciclo personalizado con corte día X a X-1 del mes siguiente (ej. 11 a 10 para Alejo).
 *  2. Ciclo de mes calendario natural (1 al último día de mes para asalariados/pareja).
 *  3. Ciclos quincenales / biweekly.
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
import type { FinancialCycleConfig } from './types'

export const CUT_START_DAY = 11
export const CUT_END_DAY = CUT_START_DAY - 1

export const DEFAULT_CYCLE_CONFIG: FinancialCycleConfig = {
  type: 'custom_cut',
  cutStartDay: 11,
}

export interface CutPeriod {
  /** Identificador estable: año y mes en que comienza el corte (`YYYY-MM`). */
  id: string
  start: ISODate
  end: ISODate
  /** Ej.: «11 sep – 10 oct 2026» o «Octubre 2026» */
  label: string
  /** Ej.: «Sep–Oct» o «Octubre» */
  shortLabel: string
}

const PERIOD_ID_RE = /^(\d{4})-(\d{2})$/

function monthName(year: number, month: number): string {
  return formatMonthShort(toISODate({ year, month, day: 1 }))
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export function buildPeriod(
  startYear: number,
  startMonth: number,
  cycleConfig: FinancialCycleConfig = DEFAULT_CYCLE_CONFIG
): CutPeriod {
  const isCalendarMonth =
    cycleConfig.type === 'calendar_month' || cycleConfig.cutStartDay === 1

  if (isCalendarMonth) {
    const start = toISODate({ year: startYear, month: startMonth, day: 1 })
    const lastDay = lastDayOfMonth(startYear, startMonth)
    const end = toISODate({ year: startYear, month: startMonth, day: lastDay })
    const mName = monthName(startYear, startMonth)
    return {
      id: `${startYear}-${String(startMonth).padStart(2, '0')}`,
      start,
      end,
      label: `1 – ${lastDay} ${mName} ${startYear}`,
      shortLabel: `${capitalize(mName)} ${startYear}`,
    }
  }

  // Corte personalizado (ej. 11 al 10)
  const cutStart = cycleConfig.cutStartDay || 11
  const cutEnd = cutStart - 1
  const start = toISODate({ year: startYear, month: startMonth, day: cutStart })
  const endDate = addMonthsClamped(start, 1, cutEnd)
  const { year: endYear, month: endMonth } = parseISODate(endDate)
  const startName = monthName(startYear, startMonth)
  const endName = monthName(endYear, endMonth)
  const label =
    startYear === endYear
      ? `${cutStart} ${startName} – ${cutEnd} ${endName} ${endYear}`
      : `${cutStart} ${startName} ${startYear} – ${cutEnd} ${endName} ${endYear}`

  return {
    id: `${startYear}-${String(startMonth).padStart(2, '0')}`,
    start,
    end: endDate,
    label,
    shortLabel: `${capitalize(startName)}–${capitalize(endName)}${
      startYear !== endYear ? ` ${String(endYear).slice(2)}` : ''
    }`,
  }
}

/** Corte al que pertenece una fecha local según la configuración del ciclo del usuario. */
export function getPeriodForDate(
  date: ISODate,
  cycleConfig: FinancialCycleConfig = DEFAULT_CYCLE_CONFIG
): CutPeriod {
  const { year, month, day } = parseISODate(date)
  const isCalendarMonth =
    cycleConfig.type === 'calendar_month' || cycleConfig.cutStartDay === 1

  if (isCalendarMonth) {
    return buildPeriod(year, month, cycleConfig)
  }

  const cutStart = cycleConfig.cutStartDay || 11
  if (day >= cutStart) return buildPeriod(year, month, cycleConfig)
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  return buildPeriod(prevYear, prevMonth, cycleConfig)
}

/** Corte actual según la fecha local de Bogotá y la configuración del ciclo del usuario. */
export function getCurrentPeriod(
  now: Date = new Date(),
  cycleConfig: FinancialCycleConfig = DEFAULT_CYCLE_CONFIG
): CutPeriod {
  return getPeriodForDate(todayInBogota(now), cycleConfig)
}

export function isValidPeriodId(id: string): boolean {
  const m = PERIOD_ID_RE.exec(id)
  if (!m) return false
  const month = Number(m[2])
  return month >= 1 && month <= 12
}

export function getPeriodById(
  id: string,
  cycleConfig: FinancialCycleConfig = DEFAULT_CYCLE_CONFIG
): CutPeriod {
  const m = PERIOD_ID_RE.exec(id)
  if (!m || !isValidPeriodId(id)) throw new Error(`Identificador de corte inválido: ${id}`)
  return buildPeriod(Number(m[1]), Number(m[2]), cycleConfig)
}

export function shiftPeriod(
  period: CutPeriod,
  offset: number,
  cycleConfig: FinancialCycleConfig = DEFAULT_CYCLE_CONFIG
): CutPeriod {
  const { year, month } = parseISODate(period.start)
  const total = year * 12 + (month - 1) + offset
  return buildPeriod(Math.floor(total / 12), (total % 12) + 1, cycleConfig)
}

export const getPreviousPeriod = (
  p: CutPeriod,
  cycleConfig: FinancialCycleConfig = DEFAULT_CYCLE_CONFIG
) => shiftPeriod(p, -1, cycleConfig)

export const getNextPeriod = (
  p: CutPeriod,
  cycleConfig: FinancialCycleConfig = DEFAULT_CYCLE_CONFIG
) => shiftPeriod(p, 1, cycleConfig)

/** Indica si un corte corresponde a un periodo posterior al corte activo actual. */
export function isFuturePeriod(
  period: CutPeriod,
  now: Date = new Date(),
  cycleConfig: FinancialCycleConfig = DEFAULT_CYCLE_CONFIG
): boolean {
  const current = getCurrentPeriod(now, cycleConfig)
  return period.id > current.id
}

/** Indica si un corte es exactamente el corte activo actual en Bogotá. */
export function isCurrentPeriod(
  period: CutPeriod,
  now: Date = new Date(),
  cycleConfig: FinancialCycleConfig = DEFAULT_CYCLE_CONFIG
): boolean {
  const current = getCurrentPeriod(now, cycleConfig)
  return period.id === current.id
}

/** Determina si es posible avanzar al siguiente corte (solo si no estamos ya en el actual). */
export function canNavigateToNextPeriod(
  period: CutPeriod,
  now: Date = new Date(),
  cycleConfig: FinancialCycleConfig = DEFAULT_CYCLE_CONFIG
): boolean {
  const current = getCurrentPeriod(now, cycleConfig)
  return period.id < current.id
}

export function isDateInPeriod(date: ISODate, period: CutPeriod): boolean {
  return isWithin(date, period.start, period.end)
}

/** Los últimos `count` cortes terminando en `period` (orden cronológico). */
export function getRecentPeriods(
  period: CutPeriod,
  count: number,
  cycleConfig: FinancialCycleConfig = DEFAULT_CYCLE_CONFIG
): CutPeriod[] {
  return Array.from({ length: count }, (_, i) =>
    shiftPeriod(period, i - (count - 1), cycleConfig)
  )
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
