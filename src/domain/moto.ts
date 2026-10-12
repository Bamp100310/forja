/**
 * Taller de Moto: la motocicleta como unidad de negocio.
 *
 * El dinero sale SIEMPRE de las transacciones (no se duplica en los registros
 * de jornada). Los registros de jornada/viaje aportan datos operativos
 * (km, horas, número de viajes) y se vinculan opcionalmente a su transacción.
 */
import { type ISODate, addDays, daysBetween, isWithin } from './dates'
import { divideMoney } from './money'
import { type CategoryAmount, type DateRange, type LedgerIndex, isMotoPosting } from './ledger/aggregate'
import type { MotoLog, MotoMaintenance, Transaction } from './types'

export interface MotoStats {
  gross: number
  commissions: number
  tips: number
  /** Costos atribuidos a la moto (gasolina, mantenimiento, comisiones...). */
  costs: number
  net: number
  byPlatform: CategoryAmount[]
  costBreakdown: CategoryAmount[]
  workedDays: number
  /** Ingreso bruto promedio por día trabajado (null si no hay días). */
  grossPerWorkedDay: number | null
  netPerWorkedDay: number | null
  /** Km registrados en el rango (null si no hay ningún registro con km). */
  km: number | null
  /** Ingreso por km: solo con jornadas que tienen km Y movimiento vinculado. Real. */
  incomePerKm: number | null
  /** Costo por km: costos del periodo / km registrados. Estimación. */
  costPerKm: number | null
  /** Porción de los ingresos de moto cubierta por jornadas con km. */
  kmCoverage: number | null
  trips: number | null
  hours: number | null
}

function motoAmountsForTransaction(tx: Transaction, index: LedgerIndex) {
  let income = 0
  for (const p of tx.postings) {
    if (p.targetType !== 'category' || !p.targetId) continue
    const cat = index.categories.get(p.targetId)
    if (cat?.kind === 'income' && isMotoPosting(tx, cat)) income += -p.amount
  }
  return income
}

export function computeMotoStats(
  transactions: readonly Transaction[],
  logs: readonly MotoLog[],
  index: LedgerIndex,
  range: DateRange,
): MotoStats {
  let gross = 0
  let commissions = 0
  let tips = 0
  let costs = 0
  const platform = new Map<string, number>()
  const costMap = new Map<string, number>()
  const workedDates = new Set<string>()
  const txById = new Map<string, Transaction>()

  for (const tx of transactions) {
    if (!isWithin(tx.date, range.start, range.end)) continue
    txById.set(tx.id, tx)
    for (const p of tx.postings) {
      if (p.targetType !== 'category' || !p.targetId) continue
      const cat = index.categories.get(p.targetId)
      if (!cat || !isMotoPosting(tx, cat)) continue
      if (cat.kind === 'income') {
        const v = -p.amount
        gross += v
        if (cat.systemKey === 'tips') tips += v
        else platform.set(cat.id, (platform.get(cat.id) ?? 0) + v)
        if (v > 0) workedDates.add(tx.date)
      } else {
        costs += p.amount
        costMap.set(cat.id, (costMap.get(cat.id) ?? 0) + p.amount)
        if (cat.systemKey === 'platform_commission') commissions += p.amount
      }
    }
  }

  let km: number | null = null
  let kmWithIncome = 0
  let incomeWithKm = 0
  let trips: number | null = null
  let hours: number | null = null
  for (const log of logs) {
    if (!isWithin(log.date, range.start, range.end)) continue
    workedDates.add(log.date)
    if (log.tripsCount !== null) trips = (trips ?? 0) + log.tripsCount
    if (log.hours !== null) hours = (hours ?? 0) + log.hours
    if (log.km !== null && log.km > 0) {
      km = (km ?? 0) + log.km
      const linked = log.transactionId ? txById.get(log.transactionId) : undefined
      if (linked) {
        kmWithIncome += log.km
        incomeWithKm += motoAmountsForTransaction(linked, index)
      }
    }
  }

  const toSorted = (m: Map<string, number>) =>
    [...m.entries()].map(([categoryId, amount]) => ({ categoryId, amount })).sort((a, b) => b.amount - a.amount)

  const workedDays = workedDates.size
  return {
    gross,
    commissions,
    tips,
    costs,
    net: gross - costs,
    byPlatform: toSorted(platform),
    costBreakdown: toSorted(costMap),
    workedDays,
    grossPerWorkedDay: divideMoney(gross, workedDays),
    netPerWorkedDay: divideMoney(gross - costs, workedDays),
    km,
    incomePerKm: kmWithIncome > 0 ? Math.round(incomeWithKm / kmWithIncome) : null,
    costPerKm: km !== null && km > 0 ? Math.round(costs / km) : null,
    kmCoverage: gross > 0 && kmWithIncome > 0 ? Math.min(1, incomeWithKm / gross) : null,
    trips,
    hours,
  }
}

/** Kilómetros a partir del odómetro, si ambos valores existen y son coherentes. */
export function kmFromOdometer(start: number | null, end: number | null): number | null {
  if (start === null || end === null) return null
  if (end < start) return null
  return end - start
}

/** Última lectura conocida del odómetro. */
export function latestOdometer(
  logs: readonly MotoLog[],
  maintenance: readonly MotoMaintenance[],
  initial: number | null,
): number | null {
  let best = initial
  for (const l of logs) {
    const v = l.odometerEnd ?? l.odometerStart
    if (v !== null && (best === null || v > best)) best = v
  }
  for (const m of maintenance) {
    if (m.odometer !== null && (best === null || m.odometer > best)) best = m.odometer
  }
  return best
}

export interface MaintenanceReminder {
  maintenance: MotoMaintenance
  reason: 'date' | 'odometer'
  overdue: boolean
  daysLeft: number | null
  kmLeft: number | null
}

export const MAINTENANCE_DAYS_WARNING = 15
export const MAINTENANCE_KM_WARNING = 300

/** Recordatorios: solo para mantenimientos con próxima fecha u odómetro configurados. */
export function maintenanceReminders(
  maintenance: readonly MotoMaintenance[],
  currentOdometer: number | null,
  today: ISODate,
): MaintenanceReminder[] {
  // Solo el registro más reciente de cada título genera recordatorio.
  const latestByTitle = new Map<string, MotoMaintenance>()
  for (const m of maintenance) {
    const key = m.title.trim().toLowerCase()
    const prev = latestByTitle.get(key)
    if (!prev || prev.date < m.date) latestByTitle.set(key, m)
  }
  const reminders: MaintenanceReminder[] = []
  const warnDate = addDays(today, MAINTENANCE_DAYS_WARNING)
  for (const m of latestByTitle.values()) {
    const daysLeft = m.nextDueDate ? daysBetween(today, m.nextDueDate) : null
    const kmLeft = m.nextDueOdometer !== null && currentOdometer !== null ? m.nextDueOdometer - currentOdometer : null
    const dateHit = m.nextDueDate !== null && m.nextDueDate <= warnDate
    const kmHit = kmLeft !== null && kmLeft <= MAINTENANCE_KM_WARNING
    if (!dateHit && !kmHit) continue
    reminders.push({
      maintenance: m,
      reason: kmHit ? 'odometer' : 'date',
      overdue: (daysLeft !== null && daysLeft < 0) || (kmLeft !== null && kmLeft < 0),
      daysLeft,
      kmLeft,
    })
  }
  return reminders.sort((a, b) => Number(b.overdue) - Number(a.overdue))
}
