/**
 * FORJA V2 — Lógica de Dominio: Nómina, Quincenas e Ingresos Programados.
 *
 * Principio contable: Los ingresos previstos NO son dinero recibido y NO
 * alteran el saldo disponible real en libros.
 */

import {
  type ISODate,
  daysBetween,
  parseISODate,
  toISODate,
  todayInBogota,
} from './dates'
import type { IncomeSchedule, Transaction } from './types'
import type { CutPeriod } from './period'

export interface PaydayProjection {
  scheduleId: string
  scheduleName: string
  expectedAmount: number
  targetAccountId: string | null
  nextPaydayDate: ISODate
  daysRemaining: number
  isDueToday: boolean
  isPastDue: boolean
}

export interface ExpectedIncomeItem {
  id: string
  scheduleId: string
  scheduleName: string
  date: ISODate
  expectedAmount: number
  targetAccountId: string | null
  isReceived: boolean
  matchedTransactionId?: string | null
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

/**
 * Calcula la próxima fecha de pago de un cronograma salarial a partir de la fecha actual.
 */
export function getNextPaydayDate(
  schedule: IncomeSchedule,
  currentDate: ISODate = todayInBogota()
): ISODate {
  const { year, month, day } = parseISODate(currentDate)
  const sortedDays = [...schedule.payDays].sort((a, b) => a - b)

  if (sortedDays.length === 0) {
    // Si no hay días definidos, por defecto día 15
    sortedDays.push(15)
  }

  // 1. Buscar si hay una fecha posterior o igual a hoy en el mes corriente
  for (const pDay of sortedDays) {
    const maxDayThisMonth = lastDayOfMonth(year, month)
    const effectiveDay = Math.min(pDay, maxDayThisMonth)
    if (effectiveDay >= day) {
      return toISODate({ year, month, day: effectiveDay })
    }
  }

  // 2. Si ya pasaron todas las fechas del mes, pasa a la primera fecha del mes siguiente
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const firstDayNextMonth = sortedDays[0]
  const maxDayNextMonth = lastDayOfMonth(nextYear, nextMonth)
  const effectiveNextDay = Math.min(firstDayNextMonth, maxDayNextMonth)

  return toISODate({ year: nextYear, month: nextMonth, day: effectiveNextDay })
}

/**
 * Genera la proyección consolidada del próximo cobro para una nómina activa.
 */
export function getPaydayProjection(
  schedule: IncomeSchedule,
  currentDate: ISODate = todayInBogota()
): PaydayProjection {
  const nextPaydayDate = getNextPaydayDate(schedule, currentDate)
  const daysRemaining = Math.max(0, daysBetween(currentDate, nextPaydayDate))

  return {
    scheduleId: schedule.id,
    scheduleName: schedule.name,
    expectedAmount: schedule.expectedAmount,
    targetAccountId: schedule.targetAccountId,
    nextPaydayDate,
    daysRemaining,
    isDueToday: daysRemaining === 0,
    isPastDue: nextPaydayDate < currentDate,
  }
}

/**
 * Calcula el presupuesto diario sugerido hasta la próxima fecha de pago.
 */
export function calculateDailyAvailableBudget(
  liquidBalance: number,
  daysRemaining: number,
  upcomingReservedCommitments: number = 0
): {
  netAvailable: number
  dailyBudget: number
  daysCount: number
} {
  const netAvailable = Math.max(0, liquidBalance - upcomingReservedCommitments)
  const daysCount = Math.max(1, daysRemaining)
  const dailyBudget = Math.floor(netAvailable / daysCount)

  return {
    netAvailable,
    dailyBudget,
    daysCount,
  }
}

/**
 * Identifica las quincenas/pagos programados que caen dentro del periodo actual
 * y determina si ya han sido recibidos comparando con los movimientos reales.
 */
export function getExpectedIncomesInPeriod(
  schedules: IncomeSchedule[],
  period: CutPeriod,
  transactions: Transaction[]
): ExpectedIncomeItem[] {
  const items: ExpectedIncomeItem[] = []
  const activeSchedules = schedules.filter((s) => s.isActive)

  const { year: sYear, month: sMonth } = parseISODate(period.start)
  const { year: eYear, month: eMonth } = parseISODate(period.end)

  // Iterar por todos los meses que abarca el periodo
  const monthsToCheck: Array<{ year: number; month: number }> = []
  let curY = sYear
  let curM = sMonth
  while (curY < eYear || (curY === eYear && curM <= eMonth)) {
    monthsToCheck.push({ year: curY, month: curM })
    curM++
    if (curM > 12) {
      curM = 1
      curY++
    }
  }

  // Rastrear transacciones ya emparejadas para evitar doble contabilización
  const matchedTxIds = new Set<string>()

  for (const sched of activeSchedules) {
    for (const { year, month } of monthsToCheck) {
      const maxDay = lastDayOfMonth(year, month)
      for (const pDay of sched.payDays) {
        const effDay = Math.min(pDay, maxDay)
        const dateStr = toISODate({ year, month, day: effDay })

        if (dateStr >= period.start && dateStr <= period.end) {
          // Comprobar si ya existe una transacción de ingreso que coincida
          const matchedTx = transactions.find((tx) => {
            if (tx.kind !== 'income' || matchedTxIds.has(tx.id)) return false
            // 1. Coincidencia explícita por payrollScheduleId y fecha prevista o fecha real cercana
            if (tx.meta?.payrollScheduleId === sched.id) {
              if (tx.meta?.expectedPaydayDate === dateStr) return true
              if (tx.date === dateStr) return true
              if (Math.abs(daysBetween(tx.date, dateStr)) <= 5) return true
            }
            // 2. Coincidencia por cuenta y descripción de salario dentro de la ventana de pago
            if (
              sched.targetAccountId &&
              tx.postings.some(
                (p) => p.targetType === 'account' && p.targetId === sched.targetAccountId
              ) &&
              Math.abs(daysBetween(tx.date, dateStr)) <= 3 &&
              (tx.description.toLowerCase().includes('salario') ||
                tx.description.toLowerCase().includes('nómina') ||
                tx.description.toLowerCase().includes('quincena'))
            ) {
              return true
            }
            return false
          })

          if (matchedTx) {
            matchedTxIds.add(matchedTx.id)
          }

          items.push({
            id: `${sched.id}-${dateStr}`,
            scheduleId: sched.id,
            scheduleName: sched.name,
            date: dateStr,
            expectedAmount: sched.expectedAmount,
            targetAccountId: sched.targetAccountId,
            isReceived: Boolean(matchedTx),
            matchedTransactionId: matchedTx?.id ?? null,
          })
        }
      }
    }
  }

  return items.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}
