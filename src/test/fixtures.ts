/** Fixtures de prueba (no son datos reales del usuario). */
import { DEFAULT_CATEGORIES } from '../domain/defaults'
import { type LedgerIndex, buildLedgerIndex } from '../domain/ledger/aggregate'
import { type OperationInput, buildTransactionDraft } from '../domain/ledger/operations'
import type { Account, Category, Debt, Loan, Transaction } from '../domain/types'

export const categories: Category[] = DEFAULT_CATEGORIES.map((c, i) => ({
  id: `cat-${i}`,
  kind: c.kind,
  name: c.name,
  icon: c.icon,
  color: c.color,
  isMoto: c.isMoto,
  systemKey: c.systemKey,
  isArchived: false,
  sortOrder: i,
}))

export const catId = (name: string): string => {
  const c = categories.find((x) => x.name === name)
  if (!c) throw new Error(`Categoría de prueba inexistente: ${name}`)
  return c.id
}

export const accounts: Account[] = [
  { id: 'acc-cash', name: 'Efectivo', kind: 'cash', openingBalance: 300_000, openingDate: '2026-09-01', color: null, isArchived: false, notes: null, sortOrder: 0 },
  { id: 'acc-bank', name: 'Banco', kind: 'bank', openingBalance: 1_000_000, openingDate: '2026-09-01', color: null, isArchived: false, notes: null, sortOrder: 1 },
  { id: 'acc-rappi', name: 'Rappi por cobrar', kind: 'platform_receivable', openingBalance: 0, openingDate: '2026-09-01', color: null, isArchived: false, notes: null, sortOrder: 2 },
]

export const debts: Debt[] = [
  { id: 'debt-card', name: 'Tarjeta Visa', kind: 'credit_card', institution: 'Banco X', openingBalance: 0, openingDate: '2026-09-01', creditLimit: 2_000_000, interestRate: null, cutDay: 25, dueDay: 10, expectedInstallment: null, totalInstallments: null, status: 'active', notes: null },
  { id: 'debt-loan', name: 'Libre inversión', kind: 'personal_loan', institution: 'Banco Y', openingBalance: 0, openingDate: '2026-09-01', creditLimit: null, interestRate: null, cutDay: null, dueDay: 5, expectedInstallment: 120_000, totalInstallments: 12, status: 'active', notes: null },
]

export const loans: Loan[] = [
  { id: 'loan-ana', personName: 'Familiar de prueba', startDate: '2026-09-15', dueDate: '2026-10-15', interestNote: null, isArchived: false, notes: null },
]

export function makeIndex(): LedgerIndex {
  return buildLedgerIndex({ accounts, categories, debts, loans })
}

let seq = 0
export function tx(op: OperationInput): Transaction {
  const draft = buildTransactionDraft(op, { categories })
  seq += 1
  return {
    id: `tx-${seq}`,
    date: draft.date,
    kind: draft.kind,
    description: draft.description,
    notes: draft.notes,
    tags: draft.tags,
    isMoto: draft.isMoto,
    debtId: draft.debtId,
    loanId: draft.loanId,
    meta: draft.meta as unknown as Record<string, unknown>,
    clientRequestId: `req-${seq}`,
    createdAt: `2026-10-01T00:00:${String(seq % 60).padStart(2, '0')}Z`,
    postings: draft.postings,
  }
}
