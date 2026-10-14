import { describe, expect, it } from 'vitest'
import { summarizeLoan } from './loans'
import { loans, tx } from '../test/fixtures'

const loan = loans[0] // Familiar de prueba

describe('Módulo de Préstamos — Cuentas por Cobrar y Devoluciones', () => {
  it('registra entregas y devoluciones parciales actualizando el saldo pendiente', () => {
    const lend = tx({
      kind: 'loan_given',
      date: '2026-09-15',
      description: 'Préstamo inicial',
      loanId: loan.id,
      accountId: 'acc-cash',
      amount: 200_000,
    })

    const return1 = tx({
      kind: 'loan_repayment',
      date: '2026-09-25',
      description: 'Devolución inicial',
      loanId: loan.id,
      accountId: 'acc-cash',
      principal: 50_000,
    })

    const summary = summarizeLoan(loan, [lend, return1], '2026-10-10')
    expect(summary.lent).toBe(200_000)
    expect(summary.repaid).toBe(50_000)
    expect(summary.pending).toBe(150_000)
    expect(summary.status).toBe('parcial')
  })

  it('cambia a pagado cuando el saldo llega a 0', () => {
    const lend = tx({
      kind: 'loan_given',
      date: '2026-09-15',
      description: 'Préstamo',
      loanId: loan.id,
      accountId: 'acc-cash',
      amount: 100_000,
    })

    const returnAll = tx({
      kind: 'loan_repayment',
      date: '2026-09-30',
      description: 'Pago total',
      loanId: loan.id,
      accountId: 'acc-cash',
      principal: 100_000,
    })

    const summary = summarizeLoan(loan, [lend, returnAll], '2026-10-10')
    expect(summary.pending).toBe(0)
    expect(summary.status).toBe('pagado')
  })

  it('alerta cuando la fecha límite está próxima o vencida', () => {
    const lend = tx({
      kind: 'loan_given',
      date: '2026-09-01',
      description: 'Préstamo',
      loanId: loan.id,
      accountId: 'acc-cash',
      amount: 100_000,
    })

    // loan.dueDate = '2026-10-15', hoy = '2026-10-10' (5 días restantes -> dueSoon)
    const summarySoon = summarizeLoan(loan, [lend], '2026-10-10')
    expect(summarySoon.dueSoon).toBe(true)
    expect(summarySoon.status).toBe('vigente')

    // Si hoy fuera 2026-10-20 (pasó la fecha -> vencido)
    const summaryOverdue = summarizeLoan(loan, [lend], '2026-10-20')
    expect(summaryOverdue.status).toBe('vencido')
  })

  it('generateUUID genera UUIDs válidos RFC 4122 v4', async () => {
    const { generateUUID, isValidUUID } = await import('./uuid')
    const id1 = generateUUID()
    const id2 = generateUUID()
    expect(isValidUUID(id1)).toBe(true)
    expect(isValidUUID(id2)).toBe(true)
    expect(id1).not.toBe(id2)
  })

  it('buildTransactionDraft rechaza loan_given sin loanId válido', async () => {
    const { buildTransactionDraft, OperationError } = await import('./ledger/operations')
    const { categories } = await import('../test/fixtures')
    expect(() =>
      buildTransactionDraft(
        {
          kind: 'loan_given',
          date: '2026-10-13',
          description: 'Préstamo inválido',
          loanId: '',
          accountId: 'acc-cash',
          amount: 50_000,
        },
        { categories }
      )
    ).toThrow(OperationError)
  })
})
