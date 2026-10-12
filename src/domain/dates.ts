/**
 * Utilidades de fechas de negocio.
 *
 * Todas las fechas de negocio se representan como cadenas ISO `YYYY-MM-DD`
 * (fechas locales sin hora). Así se evitan desplazamientos de un día por
 * conversiones UTC. La zona horaria de negocio es America/Bogota.
 */
export type ISODate = string

export const BUSINESS_TIME_ZONE = 'America/Bogota'
export const LOCALE = 'es-CO'

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/

const bogotaPartsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: BUSINESS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export interface DateParts {
  year: number
  month: number // 1-12
  day: number
}

/** Fecha local de Bogotá para un instante dado (por defecto, ahora). */
export function todayInBogota(now: Date = new Date()): ISODate {
  const parts = bogotaPartsFormatter.formatToParts(now)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  return toISODate({ year: get('year'), month: get('month'), day: get('day') })
}

export function isValidISODate(value: string): boolean {
  const m = ISO_RE.exec(value)
  if (!m) return false
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  if (month < 1 || month > 12 || day < 1) return false
  return day <= daysInMonth(year, month)
}

export function parseISODate(value: ISODate): DateParts {
  const m = ISO_RE.exec(value)
  if (!m || !isValidISODate(value)) {
    throw new Error(`Fecha inválida: ${value}`)
  }
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) }
}

export function toISODate({ year, month, day }: DateParts): ISODate {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/** Convierte a un `Date` en UTC a medianoche (solo para aritmética y formato). */
function toUTCDate(value: ISODate): Date {
  const { year, month, day } = parseISODate(value)
  return new Date(Date.UTC(year, month - 1, day))
}

function fromUTCDate(date: Date): ISODate {
  return toISODate({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  })
}

export function addDays(value: ISODate, days: number): ISODate {
  const d = toUTCDate(value)
  d.setUTCDate(d.getUTCDate() + days)
  return fromUTCDate(d)
}

/** Suma meses conservando el día cuando existe; si no, usa el último día del mes. */
export function addMonthsClamped(value: ISODate, months: number, preferredDay?: number): ISODate {
  const { year, month, day } = parseISODate(value)
  const total = year * 12 + (month - 1) + months
  const newYear = Math.floor(total / 12)
  const newMonth = (total % 12) + 1
  const targetDay = Math.min(preferredDay ?? day, daysInMonth(newYear, newMonth))
  return toISODate({ year: newYear, month: newMonth, day: targetDay })
}

export function compareISODate(a: ISODate, b: ISODate): number {
  return a < b ? -1 : a > b ? 1 : 0
}

export function isWithin(value: ISODate, start: ISODate, end: ISODate): boolean {
  return value >= start && value <= end
}

/** Días transcurridos de `from` a `to` (puede ser negativo). */
export function daysBetween(from: ISODate, to: ISODate): number {
  return Math.round((toUTCDate(to).getTime() - toUTCDate(from).getTime()) / 86_400_000)
}

const longDateFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: 'UTC',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const shortDateFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
})
const shortDateYearFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})
const monthYearFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: 'UTC',
  month: 'long',
  year: 'numeric',
})
const monthShortFormatter = new Intl.DateTimeFormat(LOCALE, { timeZone: 'UTC', month: 'short' })

const stripDot = (s: string) => s.replace(/\./g, '')

export function formatLongDate(value: ISODate): string {
  const s = longDateFormatter.format(toUTCDate(value))
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function formatShortDate(value: ISODate, withYear = false): string {
  return stripDot((withYear ? shortDateYearFormatter : shortDateFormatter).format(toUTCDate(value)))
}

export function formatMonthYear(value: ISODate): string {
  const s = monthYearFormatter.format(toUTCDate(value))
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function formatMonthShort(value: ISODate): string {
  return stripDot(monthShortFormatter.format(toUTCDate(value)))
}

/** Rango de mes calendario (usado por presupuestos). */
export interface MonthRange {
  id: string // YYYY-MM
  start: ISODate
  end: ISODate
  label: string
}

export function getCalendarMonth(value: ISODate): MonthRange {
  const { year, month } = parseISODate(value)
  const start = toISODate({ year, month, day: 1 })
  const end = toISODate({ year, month, day: daysInMonth(year, month) })
  return { id: start.slice(0, 7), start, end, label: formatMonthYear(start) }
}
