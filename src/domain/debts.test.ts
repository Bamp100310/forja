import { describe, expect, it } from 'vitest'
import { nextDayOfMonth, summarizeDebt } from './debts'
import { debts, tx } from '../test/fixtures'

const debt = debts[0] // Tarjeta Visa

describe('Módulo de Deudas — Resumen, Amortización e Historial', () => {
  it('calcula el próximo día de pago considerando el día de corte y el fin de mes', () => {
    // Si hoy es 2026-10-05 y el pago es el 10 -> 2026-10-10
    expect(nextDayOfMonth(10, '2026-10-05')).toBe('2026-10-10')
    // Si hoy es 2026-10-15 y el pago es el 10 -> 2026-11-10
    expect(nextDayOfMonth(10, '2026-10-15')).toBe('2026-11-10')
    // Fin de mes en febrero (día 31 ajustado a 28)
    expect(nextDayOfMonth(31, '2027-02-15')).toBe('2027-02-28')
  })

  it('calcula la evolución de la deuda: compras, cargos e intereses, y abonos a capital', () => {
    const buy = tx({
      kind: 'expense',
      date: '2026-09-15',
      description: 'Supermercado',
      categoryId: 'cat-alimentacion',
      amount: 150_000,
      payment: { method: 'debt', debtId: debt.id },
    })

    const fee = tx({
      kind: 'debt_charge',
      date: '2026-09-25',
      description: 'Cuota de manejo',
      debtId: debt.id,
      amount: 20_000,
      chargeType: 'fee',
    })

    const pay = tx({
      kind: 'debt_payment',
      date: '2026-10-05',
      description: 'Pago parcial',
      debtId: debt.id,
      accountId: 'acc-bank',
      principal: 100_000,
      interest: 5_000,
    })

    const summary = summarizeDebt(debt, [buy, fee, pay], '2026-10-10')
    // Saldo: 0 + 150k + 20k - 100k capital = 70.000
    expect(summary.balance).toBe(70_000)
    expect(summary.principalPaid).toBe(100_000)
    expect(summary.interestAndFees).toBe(25_000) // 20k cargo + 5k pagado en cuota
    expect(summary.isPaidOff).toBe(false)
    expect(summary.available).toBe(2_000_000 - 70_000)
    expect(summary.history.length).toBe(3)
  })
})
