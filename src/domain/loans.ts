/** Dinero prestado a terceros (cuentas por cobrar). */
import { type ISODate, daysBetween } from './dates'
import type { Loan, Transaction } from './types'

export type LoanStatus = 'vigente' | 'parcial' | 'pagado' | 'vencido'

export const LOAN_STATUS_LABELS: Record<LoanStatus, string> = {
  vigente: 'Vigente',
  parcial: 'Parcialmente devuelto',
  pagado: 'Pagado',
  vencido: 'Vencido',
}

export interface LoanHistoryEntry {
  transactionId: string
  date: ISODate
  description: string
  lent: number
  repaid: number
  interest: number
  pendingAfter: number
}

export interface LoanSummary {
  lent: number
  repaid: number
  pending: number
  interestReceived: number
  status: LoanStatus
  daysToDue: number | null
  /** Vence en 7 días o menos y aún hay saldo. */
  dueSoon: boolean
  history: LoanHistoryEntry[]
}

export const LOAN_DUE_SOON_DAYS = 7

export function summarizeLoan(loan: Loan, transactions: readonly Transaction[], today: ISODate): LoanSummary {
  const related = transactions
    .filter((tx) => tx.loanId === loan.id || tx.postings.some((p) => p.targetType === 'loan' && p.targetId === loan.id))
    .slice()
    .sort((a, b) => (a.date === b.date ? a.createdAt.localeCompare(b.createdAt) : a.date < b.date ? -1 : 1))

  let lent = 0
  let repaid = 0
  let interestReceived = 0
  let pending = 0
  const history: LoanHistoryEntry[] = []
  for (const tx of related) {
    let txLent = 0
    let txRepaid = 0
    let txInterest = 0
    for (const p of tx.postings) {
      if (p.targetType === 'loan' && p.targetId === loan.id) {
        if (p.amount > 0) txLent += p.amount
        else txRepaid += -p.amount
      } else if (p.targetType === 'category' && p.role === 'interest' && p.amount < 0) {
        txInterest += -p.amount
      }
    }
    lent += txLent
    repaid += txRepaid
    interestReceived += txInterest
    pending += txLent - txRepaid
    history.push({
      transactionId: tx.id,
      date: tx.date,
      description: tx.description,
      lent: txLent,
      repaid: txRepaid,
      interest: txInterest,
      pendingAfter: pending,
    })
  }

  const daysToDue = loan.dueDate ? daysBetween(today, loan.dueDate) : null
  let status: LoanStatus
  if (lent > 0 && pending <= 0) status = 'pagado'
  else if (daysToDue !== null && daysToDue < 0) status = 'vencido'
  else if (repaid > 0) status = 'parcial'
  else status = 'vigente'

  return {
    lent,
    repaid,
    pending,
    interestReceived,
    status,
    daysToDue,
    dueSoon: pending > 0 && daysToDue !== null && daysToDue >= 0 && daysToDue <= LOAN_DUE_SOON_DAYS,
    history,
  }
}
