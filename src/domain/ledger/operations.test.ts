import { describe, expect, it } from 'vitest'
import { computeBalances, summarizeTransactions, totalsFromTransactions } from './aggregate'
import { OperationError, buildTransactionDraft } from './operations'
import { accounts, catId, categories, makeIndex, tx } from '../../test/fixtures'
import type { Transaction } from '../types'

const index = makeIndex()
const range = { start: '2026-09-11', end: '2026-10-10' }

function state(txs: Transaction[]) {
  const balances = computeBalances(totalsFromTransactions(txs), index)
  const summary = summarizeTransactions(txs, index, range)
  return { balances, summary }
}

const base = state([])

describe('Reglas contables — partida doble', () => {
  it('toda operación queda balanceada (Σ líneas = 0)', () => {
    const t = tx({
      kind: 'income',
      date: '2026-09-20',
      description: 'Jornada Rappi',
      categoryId: catId('Rappi'),
      accountId: 'acc-rappi',
      amount: 150_000,
      commission: 20_000,
      tip: 10_000,
      isMoto: true,
    })
    expect(t.postings.reduce((a, p) => a + p.amount, 0)).toBe(0)
  })

  it('Caso B — compra con tarjeta: gasto +100.000, deuda +100.000, efectivo intacto', () => {
    const t = tx({
      kind: 'expense',
      date: '2026-09-20',
      description: 'Compra con tarjeta',
      categoryId: catId('Compras personales'),
      amount: 100_000,
      payment: { method: 'debt', debtId: 'debt-card' },
    })
    const s = state([t])
    expect(s.summary.expense).toBe(100_000)
    expect(s.balances.debtBalance.get('debt-card')).toBe(100_000)
    expect(s.balances.available).toBe(base.balances.available)
    expect(s.summary.cashFlow).toBe(0)
    expect(t.debtId).toBe('debt-card')
  })

  it('Caso C — pago de tarjeta: banco −100.000, deuda −100.000, sin gasto nuevo', () => {
    const purchase = tx({
      kind: 'expense',
      date: '2026-09-20',
      description: 'Compra con tarjeta',
      categoryId: catId('Compras personales'),
      amount: 100_000,
      payment: { method: 'debt', debtId: 'debt-card' },
    })
    const payment = tx({
      kind: 'debt_payment',
      date: '2026-10-05',
      description: 'Pago tarjeta',
      debtId: 'debt-card',
      accountId: 'acc-bank',
      principal: 100_000,
    })
    const s = state([purchase, payment])
    expect(s.summary.expense).toBe(100_000) // no se duplica
    expect(s.balances.debtBalance.get('debt-card')).toBe(0)
    expect(s.balances.accountBalance.get('acc-bank')).toBe(1_000_000 - 100_000)
    expect(s.summary.cashFlow).toBe(-100_000)
  })

  it('Caso D — préstamo a un familiar: disponible −200.000, por cobrar +200.000, sin gasto', () => {
    const t = tx({
      kind: 'loan_given',
      date: '2026-09-15',
      description: 'Préstamo',
      loanId: 'loan-ana',
      accountId: 'acc-cash',
      amount: 200_000,
    })
    const s = state([t])
    expect(s.balances.available).toBe(base.balances.available - 200_000)
    expect(s.balances.loansPending).toBe(200_000)
    expect(s.summary.expense).toBe(0)
    expect(s.balances.netWorth).toBe(base.balances.netWorth)
  })

  it('Caso E — devolución parcial: por cobrar 125.000, efectivo +75.000, sin ingreso', () => {
    const lend = tx({ kind: 'loan_given', date: '2026-09-15', description: 'Préstamo', loanId: 'loan-ana', accountId: 'acc-cash', amount: 200_000 })
    const back = tx({ kind: 'loan_repayment', date: '2026-09-25', description: 'Abono', loanId: 'loan-ana', accountId: 'acc-cash', principal: 75_000 })
    const before = state([lend])
    const after = state([lend, back])
    expect(after.balances.loanPending.get('loan-ana')).toBe(125_000)
    expect(after.balances.accountBalance.get('acc-cash')).toBe((before.balances.accountBalance.get('acc-cash') ?? 0) + 75_000)
    expect(after.summary.income).toBe(0)
  })

  it('Caso E bis — intereses pactados del préstamo sí son ingreso financiero', () => {
    const lend = tx({ kind: 'loan_given', date: '2026-09-15', description: 'Préstamo', loanId: 'loan-ana', accountId: 'acc-cash', amount: 200_000 })
    const back = tx({ kind: 'loan_repayment', date: '2026-09-25', description: 'Pago total', loanId: 'loan-ana', accountId: 'acc-cash', principal: 200_000, interest: 10_000 })
    const s = state([lend, back])
    expect(s.summary.income).toBe(10_000)
    expect(s.balances.loanPending.get('loan-ana')).toBe(0)
  })

  it('Caso F — crédito de libre inversión: desembolso sin ingreso; cuota separa capital e intereses', () => {
    const disb = tx({ kind: 'debt_disbursement', date: '2026-09-12', description: 'Desembolso', debtId: 'debt-loan', accountId: 'acc-bank', amount: 1_000_000 })
    const s1 = state([disb])
    expect(s1.balances.accountBalance.get('acc-bank')).toBe(2_000_000)
    expect(s1.balances.debtBalance.get('debt-loan')).toBe(1_000_000)
    expect(s1.summary.income).toBe(0)
    expect(s1.balances.netWorth).toBe(base.balances.netWorth)

    const cuota = tx({ kind: 'debt_payment', date: '2026-10-05', description: 'Cuota 1', debtId: 'debt-loan', accountId: 'acc-bank', principal: 90_000, interest: 30_000 })
    const s2 = state([disb, cuota])
    expect(s2.balances.debtBalance.get('debt-loan')).toBe(910_000)
    expect(s2.summary.expense).toBe(30_000)
    expect(s2.summary.financialCosts).toBe(30_000)
    expect(s2.balances.accountBalance.get('acc-bank')).toBe(2_000_000 - 120_000)
  })

  it('Caso G — transferencia interna: origen −50.000, destino +50.000, sin ingreso/gasto ni cambio patrimonial', () => {
    const t = tx({ kind: 'transfer', date: '2026-09-20', description: 'Retiro', fromAccountId: 'acc-bank', toAccountId: 'acc-cash', amount: 50_000 })
    const s = state([t])
    expect(s.balances.accountBalance.get('acc-bank')).toBe(950_000)
    expect(s.balances.accountBalance.get('acc-cash')).toBe(350_000)
    expect(s.summary.income).toBe(0)
    expect(s.summary.expense).toBe(0)
    expect(s.summary.cashFlow).toBe(0)
    expect(s.balances.netWorth).toBe(base.balances.netWorth)
  })

  it('intereses cobrados en la tarjeta son gasto una sola vez, aunque luego se paguen', () => {
    const charge = tx({ kind: 'debt_charge', date: '2026-09-26', description: 'Intereses', debtId: 'debt-card', amount: 15_000, chargeType: 'interest' })
    const pay = tx({ kind: 'debt_payment', date: '2026-10-05', description: 'Pago', debtId: 'debt-card', accountId: 'acc-bank', principal: 15_000 })
    const s = state([charge, pay])
    expect(s.summary.expense).toBe(15_000)
    expect(s.balances.debtBalance.get('debt-card')).toBe(0)
  })

  it('plataforma: ingreso bruto, comisión como gasto y dinero por cobrar no disponible', () => {
    const earn = tx({
      kind: 'income',
      date: '2026-09-20',
      description: 'Semana Rappi',
      categoryId: catId('Rappi'),
      accountId: 'acc-rappi',
      amount: 300_000,
      commission: 30_000,
      tip: 20_000,
      isMoto: true,
    })
    const s1 = state([earn])
    expect(s1.summary.income).toBe(320_000)
    expect(s1.summary.expense).toBe(30_000)
    expect(s1.balances.platformReceivable).toBe(290_000)
    expect(s1.balances.available).toBe(base.balances.available)
    expect(s1.summary.moto).toMatchObject({ income: 320_000, commissions: 30_000, tips: 20_000, net: 290_000 })

    const payout = tx({ kind: 'transfer', date: '2026-09-22', description: 'Retiro Rappi', fromAccountId: 'acc-rappi', toAccountId: 'acc-bank', amount: 290_000 })
    const s2 = state([earn, payout])
    expect(s2.summary.income).toBe(320_000) // el retiro no es un nuevo ingreso
    expect(s2.balances.available).toBe(base.balances.available + 290_000)
    expect(s2.summary.cashFlow).toBe(290_000)
  })

  it('ajustes justificados cambian el saldo sin crear ingresos ni gastos', () => {
    const adj = tx({ kind: 'adjustment', date: '2026-09-20', description: 'Corrección saldo inicial', target: { type: 'debt', id: 'debt-card' }, delta: 40_000 })
    const s = state([adj])
    expect(s.balances.debtBalance.get('debt-card')).toBe(40_000)
    expect(s.summary.income).toBe(0)
    expect(s.summary.expense).toBe(0)
  })

  it('préstamo previo (sin salida de cuenta) no reduce el disponible', () => {
    const t = tx({ kind: 'loan_given', date: '2026-09-15', description: 'Préstamo antiguo', loanId: 'loan-ana', accountId: null, amount: 80_000 })
    const s = state([t])
    expect(s.balances.available).toBe(base.balances.available)
    expect(s.balances.loansPending).toBe(80_000)
  })

  it('rechaza importes inválidos y operaciones incoherentes', () => {
    const ctx = { categories }
    expect(() =>
      buildTransactionDraft(
        { kind: 'expense', date: '2026-09-20', description: 'x', categoryId: catId('Gasolina'), amount: 0, payment: { method: 'account', accountId: 'acc-cash' } },
        ctx,
      ),
    ).toThrow(OperationError)
    expect(() =>
      buildTransactionDraft(
        { kind: 'expense', date: '2026-09-20', description: 'x', categoryId: catId('Gasolina'), amount: 10.5, payment: { method: 'account', accountId: 'acc-cash' } },
        ctx,
      ),
    ).toThrow(OperationError)
    expect(() =>
      buildTransactionDraft({ kind: 'transfer', date: '2026-09-20', description: 'x', fromAccountId: 'acc-cash', toAccountId: 'acc-cash', amount: 1 }, ctx),
    ).toThrow(/distintas/)
    expect(() =>
      buildTransactionDraft({ kind: 'income', date: '2026-02-30', description: 'x', categoryId: catId('Rappi'), accountId: 'acc-cash', amount: 1 }, ctx),
    ).toThrow(/fecha/)
  })

  it('saldo inicial de cuentas se respeta', () => {
    expect(base.balances.available).toBe(accounts[0].openingBalance + accounts[1].openingBalance)
  })
})
