/** Lógica de deudas (tarjetas de crédito y créditos). */
import { type ISODate, addMonthsClamped, daysBetween, daysInMonth, parseISODate, toISODate } from './dates'
import type { Debt, Transaction, TransactionKind } from './types'

export interface DebtHistoryEntry {
  transactionId: string
  date: ISODate
  kind: TransactionKind
  description: string
  /** Variación de lo que debo (+ aumenta la deuda, − la reduce). */
  change: number
  principalPaid: number
  chargesAdded: number
  /** Intereses y cargos pagados dentro de un pago (gasto financiero). */
  interestPaid: number
  balanceAfter: number
}

export interface DebtSummary {
  balance: number
  principalPaid: number
  /** Intereses y cargos: cobrados en la tarjeta + pagados dentro de cuotas. */
  interestAndFees: number
  purchasesAndDisbursements: number
  history: DebtHistoryEntry[]
  utilization: number | null
  available: number | null
  isPaidOff: boolean
  nextDueDate: ISODate | null
  daysToDue: number | null
}

/** Próxima fecha con el día de pago indicado (ajustado a fin de mes). */
export function nextDayOfMonth(day: number, today: ISODate): ISODate {
  const { year, month, day: todayDay } = parseISODate(today)
  const thisMonth = toISODate({ year, month, day: Math.min(day, daysInMonth(year, month)) })
  if (todayDay <= Math.min(day, daysInMonth(year, month))) return thisMonth
  return addMonthsClamped(toISODate({ year, month, day: 1 }), 1, day)
}

export function summarizeDebt(debt: Debt, transactions: readonly Transaction[], today: ISODate): DebtSummary {
  const related = transactions
    .filter((tx) => tx.debtId === debt.id || tx.postings.some((p) => p.targetType === 'debt' && p.targetId === debt.id))
    .slice()
    .sort((a, b) => (a.date === b.date ? a.createdAt.localeCompare(b.createdAt) : a.date < b.date ? -1 : 1))

  let balance = debt.openingBalance
  let principalPaid = 0
  let interestAndFees = 0
  let purchases = 0
  const history: DebtHistoryEntry[] = []

  for (const tx of related) {
    let change = 0
    let paid = 0
    let added = 0
    let interestPaid = 0
    for (const p of tx.postings) {
      if (p.targetType === 'debt' && p.targetId === debt.id) {
        change += -p.amount
        if (p.amount > 0) paid += p.amount
        else added += -p.amount
      } else if (p.targetType === 'category' && (p.role === 'interest' || p.role === 'fee') && p.amount > 0) {
        if (tx.kind === 'debt_payment' || tx.kind === 'debt_disbursement') interestPaid += p.amount
      }
    }
    balance += change
    if (tx.kind === 'debt_charge') interestAndFees += added
    else if (tx.kind !== 'adjustment') purchases += added
    if (tx.kind !== 'adjustment') principalPaid += paid
    interestAndFees += interestPaid
    history.push({
      transactionId: tx.id,
      date: tx.date,
      kind: tx.kind,
      description: tx.description,
      change,
      principalPaid: paid,
      chargesAdded: added,
      interestPaid,
      balanceAfter: balance,
    })
  }

  const nextDueDate = debt.dueDay && debt.status === 'active' && balance > 0 ? nextDayOfMonth(debt.dueDay, today) : null
  return {
    balance,
    principalPaid,
    interestAndFees,
    purchasesAndDisbursements: purchases,
    history,
    utilization: debt.creditLimit ? balance / debt.creditLimit : null,
    available: debt.creditLimit !== null ? debt.creditLimit - balance : null,
    isPaidOff: balance <= 0 && (history.length > 0 || debt.openingBalance > 0),
    nextDueDate,
    daysToDue: nextDueDate ? daysBetween(today, nextDueDate) : null,
  }
}

/** Serie de saldo por fecha para graficar la evolución de una deuda. */
export function debtBalanceSeries(debt: Debt, summary: DebtSummary): { date: ISODate; balance: number }[] {
  const points: { date: ISODate; balance: number }[] = [{ date: debt.openingDate, balance: debt.openingBalance }]
  for (const entry of summary.history) {
    const last = points[points.length - 1]
    if (last && last.date === entry.date) last.balance = entry.balanceAfter
    else points.push({ date: entry.date, balance: entry.balanceAfter })
  }
  return points
}
