import { describe, expect, it } from 'vitest'
import {
  buildRecurringSchedule,
  listOccurrenceDates,
  occurrenceDate,
  occurrenceKey,
} from './recurring'
import type { RecurringExpense, RecurringOccurrence } from './types'

describe('Gastos Recurrentes — Programación e Idempotencia', () => {
  const gamePass: RecurringExpense = {
    id: 'rec-gamepass',
    name: 'Xbox Game Pass',
    amount: 39_900,
    categoryId: 'cat-subs',
    frequency: 'monthly',
    anchorDate: '2026-08-15',
    endDate: null,
    paymentAccountId: 'acc-bank',
    paymentDebtId: null,
    status: 'active',
    notes: null,
  }

  it('calcula las fechas de vencimiento virtuales sin materializar movimientos en la base de datos', () => {
    const dates = listOccurrenceDates(gamePass, '2026-11-20')
    expect(dates).toEqual(['2026-08-15', '2026-09-15', '2026-10-15', '2026-11-15'])
  })

  it('maneja frecuencias semanales y bimestrales', () => {
    expect(occurrenceDate('2026-09-01', 'weekly', 2)).toBe('2026-09-15')
    expect(occurrenceDate('2026-09-01', 'bimonthly', 2)).toBe('2027-01-01')
  })

  it('Caso H — identifica ocurrencias pagadas y previene duplicados mediante clave idempotente', () => {
    const occurrences: RecurringOccurrence[] = [
      { id: 'occ-1', recurringId: gamePass.id, dueDate: '2026-08-15', status: 'paid', transactionId: 'tx-1' },
      { id: 'occ-2', recurringId: gamePass.id, dueDate: '2026-09-15', status: 'paid', transactionId: 'tx-2' },
    ]

    const sched = buildRecurringSchedule(gamePass, occurrences, '2026-10-10')
    // El siguiente vencimiento pendiente debe ser el 2026-10-15
    expect(sched.next?.dueDate).toBe('2026-10-15')
    expect(sched.next?.state).toBe('due_soon') // 5 días antes de 2026-10-15

    // Clave idempotente unívoca
    const key = occurrenceKey(gamePass.id, '2026-10-15')
    expect(key).toBe('rec-gamepass:2026-10-15')
  })

  it('detecta vencimientos pasados no pagados como overdue', () => {
    const sched = buildRecurringSchedule(gamePass, [], '2026-10-10')
    // Al no tener ocurrencias pagadas en agosto ni septiembre, están vencidas
    expect(sched.overdue.length).toBeGreaterThan(0)
    expect(sched.overdue.map((o) => o.dueDate)).toContain('2026-08-15')
    expect(sched.overdue.map((o) => o.dueDate)).toContain('2026-09-15')
  })
})
