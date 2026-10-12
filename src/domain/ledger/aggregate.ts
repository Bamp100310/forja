/**
 * Agregados contables: saldos y resúmenes por periodo.
 *
 * Todas las cifras del dashboard, informes y módulos salen de aquí, a partir de
 * las líneas contables persistidas (única fuente de verdad):
 *  - Ingresos reconocidos  = −Σ líneas sobre categorías de ingreso.
 *  - Gastos reconocidos    =  Σ líneas sobre categorías de gasto.
 *  - Flujo de efectivo     =  Σ líneas sobre cuentas disponibles (líquidas).
 *  - Saldo de cuenta       =  saldo inicial + Σ líneas de la cuenta.
 *  - Saldo de deuda        =  saldo inicial − Σ líneas de la deuda.
 *  - Por cobrar (préstamo) =  Σ líneas del préstamo.
 */
import type { ISODate } from '../dates'
import { isWithin } from '../dates'
import type { CutPeriod } from '../period'
import {
  type Account,
  type Category,
  type Debt,
  LIQUID_ACCOUNT_KINDS,
  type Loan,
  type TargetTotal,
  type TargetType,
  type Transaction,
} from '../types'

export interface LedgerIndex {
  accounts: Map<string, Account>
  categories: Map<string, Category>
  debts: Map<string, Debt>
  loans: Map<string, Loan>
}

export function buildLedgerIndex(data: {
  accounts: readonly Account[]
  categories: readonly Category[]
  debts: readonly Debt[]
  loans: readonly Loan[]
}): LedgerIndex {
  return {
    accounts: new Map(data.accounts.map((a) => [a.id, a])),
    categories: new Map(data.categories.map((c) => [c.id, c])),
    debts: new Map(data.debts.map((d) => [d.id, d])),
    loans: new Map(data.loans.map((l) => [l.id, l])),
  }
}

export function isLiquidAccount(account: Account | undefined): boolean {
  return account !== undefined && LIQUID_ACCOUNT_KINDS.includes(account.kind)
}

/** Equivalente en memoria de la vista SQL `ledger_target_totals`. */
export function totalsFromTransactions(transactions: readonly Transaction[]): TargetTotal[] {
  const map = new Map<string, TargetTotal>()
  for (const tx of transactions) {
    for (const p of tx.postings) {
      const key = `${p.targetType}:${p.targetId ?? ''}`
      const current = map.get(key)
      if (current) {
        current.total += p.amount
        current.count += 1
      } else {
        map.set(key, { targetType: p.targetType, targetId: p.targetId, total: p.amount, count: 1 })
      }
    }
  }
  return [...map.values()]
}

export interface Balances {
  accountBalance: Map<string, number>
  debtBalance: Map<string, number>
  loanPending: Map<string, number>
  /** Dinero disponible: efectivo, bancos, billeteras y ahorros. */
  available: number
  /** Ganado pero aún no recibido (cuentas por cobrar de plataformas). */
  platformReceivable: number
  /** Otras cuentas no disponibles. */
  otherAssets: number
  totalDebt: number
  loansPending: number
  /** Activos − pasivos. No es lo mismo que el dinero disponible. */
  netWorth: number
}

function totalFor(totals: readonly TargetTotal[], type: TargetType): Map<string, number> {
  const map = new Map<string, number>()
  for (const t of totals) {
    if (t.targetType === type && t.targetId) map.set(t.targetId, (map.get(t.targetId) ?? 0) + t.total)
  }
  return map
}

export function computeBalances(totals: readonly TargetTotal[], index: LedgerIndex): Balances {
  const accountSums = totalFor(totals, 'account')
  const debtSums = totalFor(totals, 'debt')
  const loanSums = totalFor(totals, 'loan')

  const accountBalance = new Map<string, number>()
  let available = 0
  let platformReceivable = 0
  let otherAssets = 0
  for (const account of index.accounts.values()) {
    const balance = account.openingBalance + (accountSums.get(account.id) ?? 0)
    accountBalance.set(account.id, balance)
    if (isLiquidAccount(account)) available += balance
    else if (account.kind === 'platform_receivable') platformReceivable += balance
    else otherAssets += balance
  }

  const debtBalance = new Map<string, number>()
  let totalDebt = 0
  for (const debt of index.debts.values()) {
    const balance = debt.openingBalance - (debtSums.get(debt.id) ?? 0)
    debtBalance.set(debt.id, balance)
    totalDebt += balance
  }

  const loanPending = new Map<string, number>()
  let loansPending = 0
  for (const loan of index.loans.values()) {
    const pending = loanSums.get(loan.id) ?? 0
    loanPending.set(loan.id, pending)
    loansPending += pending
  }

  return {
    accountBalance,
    debtBalance,
    loanPending,
    available,
    platformReceivable,
    otherAssets,
    totalDebt,
    loansPending,
    netWorth: available + platformReceivable + otherAssets + loansPending - totalDebt,
  }
}

export interface CategoryAmount {
  categoryId: string
  amount: number
}

export interface MotoMoney {
  /** Ingresos brutos atribuidos a la moto (incluye propinas). */
  income: number
  /** Costos atribuidos a la moto (incluye comisiones). */
  expense: number
  commissions: number
  tips: number
  net: number
}

export interface PeriodSummary {
  income: number
  expense: number
  /** Ingresos − gastos reconocidos. */
  result: number
  cashIn: number
  cashOut: number
  /** Variación neta de las cuentas disponibles. */
  cashFlow: number
  /** Intereses y cargos financieros reconocidos. */
  financialCosts: number
  incomeByCategory: CategoryAmount[]
  expenseByCategory: CategoryAmount[]
  moto: MotoMoney
  transactionCount: number
  /** Días distintos con algún ingreso. */
  incomeDays: number
}

export interface DateRange {
  start: ISODate
  end: ISODate
}

export function isMotoPosting(tx: Transaction, category: Category | undefined): boolean {
  return tx.isMoto || Boolean(category?.isMoto)
}

function sortedAmounts(map: Map<string, number>): CategoryAmount[] {
  return [...map.entries()]
    .filter(([, amount]) => amount !== 0)
    .map(([categoryId, amount]) => ({ categoryId, amount }))
    .sort((a, b) => b.amount - a.amount)
}

export function summarizeTransactions(
  transactions: readonly Transaction[],
  index: LedgerIndex,
  range?: DateRange,
): PeriodSummary {
  let income = 0
  let expense = 0
  let cashIn = 0
  let cashOut = 0
  let financialCosts = 0
  let count = 0
  const moto: MotoMoney = { income: 0, expense: 0, commissions: 0, tips: 0, net: 0 }
  const incomeBy = new Map<string, number>()
  const expenseBy = new Map<string, number>()
  const incomeDates = new Set<string>()

  for (const tx of transactions) {
    if (range && !isWithin(tx.date, range.start, range.end)) continue
    count += 1
    for (const p of tx.postings) {
      if (p.targetType === 'category' && p.targetId) {
        const category = index.categories.get(p.targetId)
        if (!category) continue
        const motoRelated = isMotoPosting(tx, category)
        if (category.kind === 'income') {
          const value = -p.amount
          income += value
          incomeBy.set(category.id, (incomeBy.get(category.id) ?? 0) + value)
          if (value > 0) incomeDates.add(tx.date)
          if (motoRelated) {
            moto.income += value
            if (category.systemKey === 'tips') moto.tips += value
          }
        } else {
          const value = p.amount
          expense += value
          expenseBy.set(category.id, (expenseBy.get(category.id) ?? 0) + value)
          if (category.systemKey === 'financial_interest' || category.systemKey === 'financial_fees') {
            financialCosts += value
          }
          if (motoRelated) {
            moto.expense += value
            if (category.systemKey === 'platform_commission') moto.commissions += value
          }
        }
      } else if (p.targetType === 'account' && p.targetId) {
        if (isLiquidAccount(index.accounts.get(p.targetId))) {
          if (p.amount > 0) cashIn += p.amount
          else cashOut += -p.amount
        }
      }
    }
  }
  moto.net = moto.income - moto.expense

  return {
    income,
    expense,
    result: income - expense,
    cashIn,
    cashOut,
    cashFlow: cashIn - cashOut,
    financialCosts,
    incomeByCategory: sortedAmounts(incomeBy),
    expenseByCategory: sortedAmounts(expenseBy),
    moto,
    transactionCount: count,
    incomeDays: incomeDates.size,
  }
}

export interface PeriodPoint {
  period: CutPeriod
  summary: PeriodSummary
}

export function summarizeByPeriods(
  transactions: readonly Transaction[],
  index: LedgerIndex,
  periods: readonly CutPeriod[],
): PeriodPoint[] {
  return periods.map((period) => ({ period, summary: summarizeTransactions(transactions, index, period) }))
}

export interface DailyPoint {
  date: ISODate
  income: number
  expense: number
  motoIncome: number
  motoExpense: number
}

export function dailySeries(transactions: readonly Transaction[], index: LedgerIndex, range: DateRange): DailyPoint[] {
  const byDate = new Map<string, DailyPoint>()
  for (const tx of transactions) {
    if (!isWithin(tx.date, range.start, range.end)) continue
    const point = byDate.get(tx.date) ?? { date: tx.date, income: 0, expense: 0, motoIncome: 0, motoExpense: 0 }
    for (const p of tx.postings) {
      if (p.targetType !== 'category' || !p.targetId) continue
      const category = index.categories.get(p.targetId)
      if (!category) continue
      const moto = isMotoPosting(tx, category)
      if (category.kind === 'income') {
        point.income += -p.amount
        if (moto) point.motoIncome += -p.amount
      } else {
        point.expense += p.amount
        if (moto) point.motoExpense += p.amount
      }
    }
    byDate.set(tx.date, point)
  }
  return [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1))
}

/** Importe con el que se muestra una transacción en listados (perspectiva del usuario). */
export interface TransactionDisplay {
  amount: number
  tone: 'income' | 'expense' | 'neutral' | 'debt' | 'loan'
  /** Cuenta, tarjeta o préstamo relacionado para mostrar «desde/hacia». */
  sourceLabel: string | null
  categoryId: string | null
}

export function describeTransaction(tx: Transaction, index: LedgerIndex): TransactionDisplay {
  const findCategory = (kind: 'income' | 'expense') =>
    tx.postings.find((p) => {
      if (p.targetType !== 'category' || !p.targetId) return false
      return index.categories.get(p.targetId)?.kind === kind
    })
  const accountNames = tx.postings
    .filter((p) => p.targetType === 'account' && p.targetId)
    .map((p) => index.accounts.get(p.targetId as string)?.name ?? 'Cuenta')
  const debtName = tx.debtId ? (index.debts.get(tx.debtId)?.name ?? 'Deuda') : null
  const loanName = tx.loanId ? (index.loans.get(tx.loanId)?.personName ?? 'Préstamo') : null
  const sum = (filter: (amount: number, type: TargetType) => boolean) =>
    tx.postings.reduce((acc, p) => (filter(p.amount, p.targetType) ? acc + Math.abs(p.amount) : acc), 0)

  switch (tx.kind) {
    case 'income': {
      const gross = sum((a, t) => t === 'category' && a < 0)
      return {
        amount: gross,
        tone: 'income',
        sourceLabel: accountNames[0] ?? null,
        categoryId: findCategory('income')?.targetId ?? null,
      }
    }
    case 'expense': {
      return {
        amount: sum((a, t) => t === 'category' && a > 0),
        tone: 'expense',
        sourceLabel: debtName ?? accountNames[0] ?? null,
        categoryId: findCategory('expense')?.targetId ?? null,
      }
    }
    case 'debt_charge':
      return {
        amount: sum((a, t) => t === 'category' && a > 0),
        tone: 'expense',
        sourceLabel: debtName,
        categoryId: findCategory('expense')?.targetId ?? null,
      }
    case 'transfer':
      return {
        amount: sum((a, t) => t === 'account' && a > 0),
        tone: 'neutral',
        sourceLabel: accountNames.join(' → ') || null,
        categoryId: null,
      }
    case 'debt_payment':
      return {
        amount: sum((a, t) => t === 'account' && a < 0),
        tone: 'debt',
        sourceLabel: [accountNames[0], debtName].filter(Boolean).join(' → ') || null,
        categoryId: null,
      }
    case 'debt_disbursement':
      return {
        amount: sum((a, t) => t === 'debt' && a < 0),
        tone: 'debt',
        sourceLabel: [debtName, accountNames[0]].filter(Boolean).join(' → ') || null,
        categoryId: null,
      }
    case 'loan_given':
      return {
        amount: sum((a, t) => t === 'loan' && a > 0),
        tone: 'loan',
        sourceLabel: [accountNames[0] ?? 'Saldo previo', loanName].filter(Boolean).join(' → '),
        categoryId: null,
      }
    case 'loan_repayment':
      return {
        amount: sum((a, t) => t === 'account' && a > 0),
        tone: 'loan',
        sourceLabel: [loanName, accountNames[0]].filter(Boolean).join(' → ') || null,
        categoryId: findCategory('income')?.targetId ?? null,
      }
    case 'adjustment': {
      const target = tx.postings.find((p) => p.targetType !== 'equity')
      const amount = target ? (target.targetType === 'debt' ? -target.amount : target.amount) : 0
      return {
        amount,
        tone: 'neutral',
        sourceLabel: debtName ?? loanName ?? accountNames[0] ?? null,
        categoryId: null,
      }
    }
  }
}
