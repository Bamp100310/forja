import { describeTransaction, type LedgerIndex } from '../domain/ledger/aggregate'
import { formatCOP } from '../domain/money'
import type {
  Account,
  Budget,
  Category,
  Debt,
  Goal,
  Loan,
  MotoLog,
  MotoMaintenance,
  Profile,
  RecurringExpense,
  RecurringOccurrence,
  Transaction,
} from '../domain/types'

export interface ForjaBackup {
  version: 1
  exportedAt: string
  profile: Profile
  accounts: Account[]
  categories: Category[]
  debts: Debt[]
  loans: Loan[]
  transactions: Transaction[]
  recurring: RecurringExpense[]
  occurrences: RecurringOccurrence[]
  motoLogs: MotoLog[]
  motoMaintenance: MotoMaintenance[]
  budgets: Budget[]
  goals: Goal[]
}

export function exportTransactionsToCSV(transactions: readonly Transaction[], index: LedgerIndex): string {
  const headers = ['Fecha', 'Tipo', 'Descripción', 'Categoría', 'Cuenta / Medio', 'Valor COP', 'Moto', 'Notas', 'Etiquetas']
  const escape = (val: string | null | undefined) => {
    if (val === null || val === undefined) return '""'
    const s = String(val).replace(/"/g, '""')
    return `"${s}"`
  }

  const rows = transactions.map((tx) => {
    const desc = describeTransaction(tx, index)
    const categoryName = desc.categoryId ? (index.categories.get(desc.categoryId)?.name ?? '') : ''
    return [
      escape(tx.date),
      escape(tx.kind),
      escape(tx.description),
      escape(categoryName),
      escape(desc.sourceLabel),
      escape(formatCOP(desc.amount)),
      escape(tx.isMoto ? 'Sí' : 'No'),
      escape(tx.notes ?? ''),
      escape(tx.tags.join(', ')),
    ].join(';')
  })

  // BOM UTF-8 para compatibilidad directa con Excel en español
  return '\uFEFF' + [headers.join(';'), ...rows].join('\r\n')
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
