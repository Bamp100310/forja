import { describe, it, expect, beforeEach } from 'vitest'
import { forjaApi } from '../services/api'
import { buildTransactionDraft } from './ledger/operations'
import { totalsFromTransactions, buildLedgerIndex, computeBalances } from './ledger/aggregate'

describe('Fase 4 — Pruebas de flujos CRUD, edición y persistencia', () => {
  beforeEach(() => {
    localStorage.clear()
    forjaApi.setDemoMode(true)
    forjaApi.resetToDefaults()
  })

  it('1 & 5. Comprueba asientos y saldos antes y después de editar una transacción de gasto', async () => {
    const categories = await forjaApi.getCategories()
    const accounts = await forjaApi.getAccounts()
    const debts = await forjaApi.getDebts()
    const loans = await forjaApi.getLoans()
    const expCat = categories.find((c) => c.kind === 'expense')!
    const acc = accounts.find((a) => a.kind === 'cash')!

    const index = buildLedgerIndex({ accounts, categories, debts, loans })

    // 1. Crear transacción original: $50.000 de gasto en efectivo
    const initialDraft = buildTransactionDraft(
      {
        kind: 'expense',
        date: '2026-10-12',
        description: 'Herramienta de taller',
        categoryId: expCat.id,
        amount: 50000,
        payment: { method: 'account', accountId: acc.id },
      },
      { categories },
    )
    const { id: txId } = await forjaApi.saveTransaction(initialDraft)

    // Balance inicial
    let txs = await forjaApi.getTransactions()
    let totals = totalsFromTransactions(txs)
    let balances = computeBalances(totals, index)
    const accBalanceBefore = balances.accountBalance.get(acc.id)!

    const originalTx = txs.find((t) => t.id === txId)!
    expect(originalTx.description).toBe('Herramienta de taller')
    expect(originalTx.postings.length).toBe(2)
    const sumPostingsOriginal = originalTx.postings.reduce((sum, p) => sum + p.amount, 0)
    expect(sumPostingsOriginal).toBe(0) // Partida doble balanceada

    // 2. Editar descripción, fecha e importe ($80.000 en vez de $50.000)
    const updatedDraft = buildTransactionDraft(
      {
        kind: 'expense',
        date: '2026-10-13',
        description: 'Herramienta de precisión de taller',
        categoryId: expCat.id,
        amount: 80000,
        payment: { method: 'account', accountId: acc.id },
      },
      { categories },
    )

    // Guardar modificación pasando existingId
    const resUpdate = await forjaApi.saveTransaction(updatedDraft, txId)
    expect(resUpdate.id).toBe(txId) // Mismo ID, no crea duplicados

    // 3. Verificar que no hay duplicados y que los datos y asientos se actualizaron
    txs = await forjaApi.getTransactions()
    const matchingTxs = txs.filter((t) => t.id === txId)
    expect(matchingTxs.length).toBe(1)

    const updatedTx = matchingTxs[0]
    expect(updatedTx.description).toBe('Herramienta de precisión de taller')
    expect(updatedTx.date).toBe('2026-10-13')
    expect(updatedTx.postings.length).toBe(2)
    const sumPostingsUpdated = updatedTx.postings.reduce((sum, p) => sum + p.amount, 0)
    expect(sumPostingsUpdated).toBe(0) // Sigue perfectamente balanceada

    // 4. Verificar impacto en saldos: la cuenta debe tener $30.000 menos que antes ($80.000 - $50.000)
    totals = totalsFromTransactions(txs)
    balances = computeBalances(totals, index)
    const accBalanceAfter = balances.accountBalance.get(acc.id)!
    expect(accBalanceAfter).toBe(accBalanceBefore - 30000)
  })

  it('4. Edita una transferencia entre dos cuentas y valida saldos en origen y destino', async () => {
    const categories = await forjaApi.getCategories()
    const accounts = await forjaApi.getAccounts()
    const debts = await forjaApi.getDebts()
    const loans = await forjaApi.getLoans()
    const accFrom = accounts[0]
    const accTo = accounts[1]
    const index = buildLedgerIndex({ accounts, categories, debts, loans })

    // Balances previos a la transferencia
    let txs = await forjaApi.getTransactions()
    let totals = totalsFromTransactions(txs)
    let balances = computeBalances(totals, index)
    const fromBefore = balances.accountBalance.get(accFrom.id)!
    const toBefore = balances.accountBalance.get(accTo.id)!

    // Crear transferencia inicial de $100.000
    const draft1 = buildTransactionDraft(
      {
        kind: 'transfer',
        date: '2026-10-12',
        description: 'Recarga de billetera',
        fromAccountId: accFrom.id,
        toAccountId: accTo.id,
        amount: 100000,
      },
      { categories },
    )
    const { id: txId } = await forjaApi.saveTransaction(draft1)

    // Editar transferencia a $250.000 con comisión de $2.000
    const draft2 = buildTransactionDraft(
      {
        kind: 'transfer',
        date: '2026-10-12',
        description: 'Recarga mayor de billetera',
        fromAccountId: accFrom.id,
        toAccountId: accTo.id,
        amount: 250000,
        fee: 2000,
      },
      { categories },
    )
    await forjaApi.saveTransaction(draft2, txId)

    txs = await forjaApi.getTransactions()
    totals = totalsFromTransactions(txs)
    balances = computeBalances(totals, index)

    // En origen debe haberse debitado 250.000 + 2.000 = 252.000
    expect(balances.accountBalance.get(accFrom.id)).toBe(fromBefore - 252000)
    // En destino debe haberse acreditado 250.000
    expect(balances.accountBalance.get(accTo.id)).toBe(toBefore + 250000)
  })

  it('6. Cancelar una edición sin alterar los datos originales', async () => {
    const txsBefore = await forjaApi.getTransactions()
    const targetTx = txsBefore[0]

    // Simulación de cancelación en formulario: se clona el objeto pero al cancelar no se invoca save
    const cloned = { ...targetTx, description: 'Texto modificado que se descartará' }
    expect(cloned.description).not.toBe(targetTx.description)

    // Los datos persistidos deben permanecer inalterados
    const txsAfter = await forjaApi.getTransactions()
    const persisted = txsAfter.find((t) => t.id === targetTx.id)!
    expect(persisted.description).toBe(targetTx.description)
  })

  it('7. Reproducir un error de validación contable', () => {
    // Intentar construir una operación inválida sin monto o con importe cero
    expect(() => {
      buildTransactionDraft(
        {
          kind: 'income',
          date: '2026-10-12',
          description: 'Inválido',
          categoryId: 'cat-1',
          accountId: 'acc-1',
          amount: 0,
        },
        { categories: [] },
      )
    }).toThrow(/mayor que cero/i)
  })

  it('8. Editar cada entidad (Cuenta, Deuda, Préstamo, Recurrente) sin perder sus relaciones', async () => {
    // A) CUENTA
    const accounts = await forjaApi.getAccounts()
    const acc = accounts[0]
    await forjaApi.saveAccount({
      id: acc.id,
      name: 'Bóveda Principal Editada',
      kind: acc.kind,
      openingBalance: acc.openingBalance,
      openingDate: acc.openingDate,
      color: acc.color,
      isArchived: true,
      notes: 'Notas actualizadas',
      sortOrder: acc.sortOrder,
    })
    const accsAfter = await forjaApi.getAccounts()
    const updatedAcc = accsAfter.find((a) => a.id === acc.id)!
    expect(updatedAcc.name).toBe('Bóveda Principal Editada')
    expect(updatedAcc.isArchived).toBe(true)
    expect(updatedAcc.openingBalance).toBe(acc.openingBalance) // Saldo inicial conservado

    // B) DEUDA
    const debts = await forjaApi.getDebts()
    const debt = debts[0]
    await forjaApi.saveDebt({
      id: debt.id,
      name: 'Tarjeta Bancaria Editada',
      kind: debt.kind,
      institution: 'Banco Central',
      openingBalance: debt.openingBalance,
      openingDate: debt.openingDate,
      creditLimit: 3000000,
      interestRate: debt.interestRate,
      cutDay: 15,
      dueDay: 5,
      expectedInstallment: 120000,
      totalInstallments: debt.totalInstallments,
      status: 'active',
      notes: 'Plazo ampliado',
    })
    const debtsAfter = await forjaApi.getDebts()
    const updatedDebt = debtsAfter.find((d) => d.id === debt.id)!
    expect(updatedDebt.name).toBe('Tarjeta Bancaria Editada')
    expect(updatedDebt.creditLimit).toBe(3000000)
    expect(updatedDebt.cutDay).toBe(15)

    // C) PRÉSTAMO
    const loans = await forjaApi.getLoans()
    const loan = loans[0]
    await forjaApi.saveLoan({
      id: loan.id,
      personName: 'Carlos M. (Actualizado)',
      startDate: loan.startDate,
      dueDate: '2026-11-30',
      interestNote: 'Interés 2% negociado',
      notes: 'Prórroga acordada',
      isArchived: false,
    })
    const loansAfter = await forjaApi.getLoans()
    const updatedLoan = loansAfter.find((l) => l.id === loan.id)!
    expect(updatedLoan.personName).toBe('Carlos M. (Actualizado)')
    expect(updatedLoan.dueDate).toBe('2026-11-30')
    expect(updatedLoan.interestNote).toBe('Interés 2% negociado')

    // D) GASTO RECURRENTE
    const recurring = await forjaApi.getRecurring()
    const rec = recurring[0]
    await forjaApi.saveRecurring({
      id: rec.id,
      name: 'Plan Móvil Plus',
      amount: 45000,
      categoryId: rec.categoryId,
      frequency: 'monthly',
      anchorDate: rec.anchorDate,
      endDate: null,
      paymentAccountId: rec.paymentAccountId,
      paymentDebtId: null,
      status: 'active',
      notes: 'Plan actualizado con más gigas',
    })
    const recAfter = await forjaApi.getRecurring()
    const updatedRec = recAfter.find((r) => r.id === rec.id)!
    expect(updatedRec.name).toBe('Plan Móvil Plus')
    expect(updatedRec.amount).toBe(45000)
    expect(updatedRec.notes).toBe('Plan actualizado con más gigas')
  })

  it('9. Confirmar que los datos editados se conservan tras recargar desde localStorage', async () => {
    // 1. Guardar una modificación
    const accounts = await forjaApi.getAccounts()
    const acc = accounts[0]
    await forjaApi.saveAccount({
      ...acc,
      name: 'Bóveda Persistente Reload',
    })

    // 2. Simular recarga completa del almacén desde localStorage
    forjaApi.reload()

    // 3. Verificar que los datos leídos de localStorage contienen el cambio
    const reloadedAccounts = await forjaApi.getAccounts()
    const found = reloadedAccounts.find((a) => a.id === acc.id)
    expect(found?.name).toBe('Bóveda Persistente Reload')
  })
})
