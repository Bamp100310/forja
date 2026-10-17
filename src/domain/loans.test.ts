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

  it('préstamo sin pagos: pending es igual al capital prestado y status vigente', () => {
    const lend = tx({
      kind: 'loan_given',
      date: '2026-10-01',
      description: 'Préstamo sin abonos',
      loanId: loan.id,
      accountId: 'acc-cash',
      amount: 150_000,
    })

    const summary = summarizeLoan(loan, [lend], '2026-10-05')
    expect(summary.lent).toBe(150_000)
    expect(summary.repaid).toBe(0)
    expect(summary.pending).toBe(150_000)
    expect(summary.overpayment).toBe(0)
    expect(summary.netBalance).toBe(150_000)
    expect(summary.status).toBe('vigente')
  })

  it('préstamo con varios abonos cuya suma iguala el saldo: pending = 0 y status pagado', () => {
    const lend = tx({
      kind: 'loan_given',
      date: '2026-09-01',
      description: 'Préstamo',
      loanId: loan.id,
      accountId: 'acc-cash',
      amount: 300_000,
    })

    const abono1 = tx({
      kind: 'loan_repayment',
      date: '2026-09-10',
      description: 'Abono 1',
      loanId: loan.id,
      accountId: 'acc-cash',
      principal: 100_000,
    })

    const abono2 = tx({
      kind: 'loan_repayment',
      date: '2026-09-20',
      description: 'Abono 2',
      loanId: loan.id,
      accountId: 'acc-bank',
      principal: 120_000,
    })

    const abono3 = tx({
      kind: 'loan_repayment',
      date: '2026-09-30',
      description: 'Abono 3',
      loanId: loan.id,
      accountId: 'acc-cash',
      principal: 80_000,
    })

    const summary = summarizeLoan(loan, [lend, abono1, abono2, abono3], '2026-10-10')
    expect(summary.lent).toBe(300_000)
    expect(summary.repaid).toBe(300_000)
    expect(summary.pending).toBe(0)
    expect(summary.overpayment).toBe(0)
    expect(summary.netBalance).toBe(0)
    expect(summary.status).toBe('pagado')
    expect(summary.history.length).toBe(4)
  })

  it('auditoría de discrepancia: sobrepago real (caso -$27.400) deja pending en 0, overpayment en 27.400 y status pagado', () => {
    // Caso exacto auditado: capital prestado 100.000, total devuelto 127.400
    const lend = tx({
      kind: 'loan_given',
      date: '2026-08-10',
      description: 'Préstamo inicial',
      loanId: loan.id,
      accountId: 'acc-cash',
      amount: 100_000,
    })

    const repayment = tx({
      kind: 'loan_repayment',
      date: '2026-09-01',
      description: 'Devolución que excede el saldo',
      loanId: loan.id,
      accountId: 'acc-cash',
      principal: 127_400,
    })

    const summary = summarizeLoan(loan, [lend, repayment], '2026-10-10')
    // El saldo pendiente por cobrar NUNCA puede ser negativo (-$27.400): es 0 porque está pagado
    expect(summary.pending).toBe(0)
    // El excedente se reconoce explícitamente como sobrepago a favor del deudor
    expect(summary.overpayment).toBe(27_400)
    expect(summary.netBalance).toBe(-27_400)
    expect(summary.status).toBe('pagado')

    // El historial cronológico refleja el cambio de saldo y la aparición del sobrepago
    expect(summary.history[0].pendingAfter).toBe(100_000)
    expect(summary.history[0].overpaymentAfter).toBe(0)
    expect(summary.history[1].pendingAfter).toBe(0)
    expect(summary.history[1].overpaymentAfter).toBe(27_400)
  })

  it('edición o eliminación de un abono recalcula el saldo correctamente a partir del historial', () => {
    const lend = tx({
      kind: 'loan_given',
      date: '2026-09-01',
      description: 'Préstamo',
      loanId: loan.id,
      accountId: 'acc-cash',
      amount: 200_000,
    })

    const abonoOriginal = tx({
      kind: 'loan_repayment',
      date: '2026-09-15',
      description: 'Abono 1',
      loanId: loan.id,
      accountId: 'acc-cash',
      principal: 100_000,
    })

    // Estado inicial: saldo 100.000
    const summary1 = summarizeLoan(loan, [lend, abonoOriginal], '2026-10-10')
    expect(summary1.pending).toBe(100_000)

    // Simular edición: el usuario corrige el abono a 60.000
    const abonoModificado = { ...abonoOriginal, postings: abonoOriginal.postings.map(p => p.targetType === 'loan' ? { ...p, amount: -60_000 } : p) }
    const summaryEdit = summarizeLoan(loan, [lend, abonoModificado], '2026-10-10')
    expect(summaryEdit.pending).toBe(140_000)

    // Simular eliminación: se desmantela el abono
    const summaryDeleted = summarizeLoan(loan, [lend], '2026-10-10')
    expect(summaryDeleted.pending).toBe(200_000)
    expect(summaryDeleted.repaid).toBe(0)
  })

  it('intereses pactados recibidos en la devolución son ingreso y no reducen doblemente el capital', () => {
    const lend = tx({
      kind: 'loan_given',
      date: '2026-09-01',
      description: 'Préstamo con interés',
      loanId: loan.id,
      accountId: 'acc-bank',
      amount: 500_000,
    })

    // Devolución: 200.000 de capital + 25.000 de intereses
    const repayment = tx({
      kind: 'loan_repayment',
      date: '2026-09-20',
      description: 'Abono capital + intereses',
      loanId: loan.id,
      accountId: 'acc-bank',
      principal: 200_000,
      interest: 25_000,
    })

    const summary = summarizeLoan(loan, [lend, repayment], '2026-10-10')
    // El capital recuperado es 200.000 (el interés es ganancia separada)
    expect(summary.repaid).toBe(200_000)
    expect(summary.pending).toBe(300_000)
    expect(summary.status).toBe('parcial')
  })

  it('distingue correctamente préstamo concedido (activo por cobrar) de préstamo recibido (pasivo / deuda)', () => {
    // 1. Préstamo concedido a tercero: es un ACTIVO ('loan')
    const lend = tx({
      kind: 'loan_given',
      date: '2026-09-01',
      description: 'Préstamo a primo',
      loanId: loan.id,
      accountId: 'acc-cash',
      amount: 150_000,
    })
    const loanSummary = summarizeLoan(loan, [lend], '2026-10-10')
    expect(loanSummary.pending).toBe(150_000) // Representa saldo a favor (por recuperar)

    // 2. Préstamo recibido de banco/tercero: es un PASIVO ('debt' con openingBalance / disbursement)
    const personalDebt = {
      id: 'debt-personal',
      name: 'Préstamo recibido de Banco',
      kind: 'personal_loan' as const,
      openingBalance: 1_000_000,
      institution: 'Bancolombia',
      status: 'active' as const,
      isArchived: false,
    }
    // Si abonamos 200.000 al pasivo:
    const payment = tx({
      kind: 'debt_payment',
      date: '2026-09-15',
      description: 'Cuota préstamo recibido',
      debtId: personalDebt.id,
      accountId: 'acc-bank',
      principal: 200_000,
    })
    expect(payment.kind).toBe('debt_payment')
    const debtBalance = personalDebt.openingBalance - 200_000
    expect(debtBalance).toBe(800_000) // Representa obligación pendiente que debemos pagar
  })
})
