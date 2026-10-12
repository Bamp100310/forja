/** Presupuestos y objetivos financieros. */
import { type ISODate, type MonthRange, getCalendarMonth } from './dates'
import type { Balances } from './ledger/aggregate'
import { getPeriodForDate } from './period'
import type { Budget, Goal } from './types'

export interface BudgetWindow {
  start: ISODate
  end: ISODate
  label: string
}

/** Por defecto los presupuestos usan el mes calendario; opcionalmente el corte 11–10. */
export function budgetWindow(budget: Pick<Budget, 'basis'>, today: ISODate): BudgetWindow {
  if (budget.basis === 'cut') {
    const p = getPeriodForDate(today)
    return { start: p.start, end: p.end, label: `Corte ${p.label}` }
  }
  const m: MonthRange = getCalendarMonth(today)
  return { start: m.start, end: m.end, label: m.label }
}

export type BudgetLevel = 'ok' | 'warning' | 'exceeded'
export const BUDGET_WARNING_RATIO = 0.8

export interface BudgetProgress {
  spent: number
  limit: number
  remaining: number
  ratio: number
  level: BudgetLevel
}

export function budgetProgress(spent: number, limit: number): BudgetProgress {
  const ratio = limit > 0 ? spent / limit : 0
  return {
    spent,
    limit,
    remaining: limit - spent,
    ratio,
    level: ratio > 1 ? 'exceeded' : ratio >= BUDGET_WARNING_RATIO ? 'warning' : 'ok',
  }
}

export interface GoalProgress {
  /** null si el objetivo no está vinculado a una cuenta o deuda. */
  current: number | null
  ratio: number | null
  achieved: boolean
  remaining: number | null
}

export function goalProgress(goal: Goal, balances: Balances): GoalProgress {
  let current: number | null = null
  if (goal.kind === 'reduce_debt') {
    if (goal.debtId && goal.baselineAmount !== null) {
      const balance = balances.debtBalance.get(goal.debtId)
      if (balance !== undefined) current = Math.max(0, goal.baselineAmount - balance)
    }
  } else if (goal.accountId) {
    const balance = balances.accountBalance.get(goal.accountId)
    if (balance !== undefined) current = Math.max(0, balance)
  }
  if (current === null) return { current: null, ratio: null, achieved: false, remaining: null }
  const ratio = goal.targetAmount > 0 ? Math.min(1, current / goal.targetAmount) : 0
  return { current, ratio, achieved: current >= goal.targetAmount, remaining: Math.max(0, goal.targetAmount - current) }
}
