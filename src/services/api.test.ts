import { describe, it, expect, beforeEach } from 'vitest'
import { forjaApi } from './api'
import { type OperationInput, buildTransactionDraft } from '../domain/ledger/operations'

describe('forjaApi LocalStore CRUD y persistencia', () => {
  beforeEach(() => {
    localStorage.clear()
    forjaApi.setDemoMode(true)
    forjaApi.resetToDefaults()
  })

  it('permite crear y recuperar transacciones', async () => {
    const categories = await forjaApi.getCategories()
    const accounts = await forjaApi.getAccounts()
    const incCat = categories.find((c) => c.kind === 'income')!
    const acc = accounts[0]

    const op: OperationInput = {
      kind: 'income',
      date: '2026-10-11',
      description: 'Prueba de ingreso unitaria',
      categoryId: incCat.id,
      accountId: acc.id,
      amount: 1234567,
    }

    const draft = buildTransactionDraft(op, { categories })
    const res = await forjaApi.saveTransaction(draft)
    expect(res.id).toBeTruthy()

    const txs = await forjaApi.getTransactions()
    const found = txs.find((t) => t.id === res.id)
    expect(found).toBeDefined()
    expect(found?.description).toBe('Prueba de ingreso unitaria')
    expect(found?.postings.some((p) => p.amount === 1234567)).toBe(true)

    // Eliminar transacción
    await forjaApi.deleteTransaction(res.id)
    const afterDelete = await forjaApi.getTransactions()
    expect(afterDelete.some((t) => t.id === res.id)).toBe(false)

    // Intentar eliminarla de nuevo debe lanzar error controlado
    await expect(forjaApi.deleteTransaction(res.id)).rejects.toThrow(
      /no existe o ya fue eliminado/,
    )
  })

  it('desvincula ocurrencias de gastos recurrentes al eliminar su transacción de pago', async () => {
    const categories = await forjaApi.getCategories()
    const accounts = await forjaApi.getAccounts()
    const expCat = categories.find((c) => c.kind === 'expense')!

    const draft = buildTransactionDraft(
      {
        kind: 'expense',
        date: '2026-10-11',
        description: 'Pago recurrente internet',
        categoryId: expCat.id,
        amount: 80000,
        payment: { method: 'account', accountId: accounts[0].id },
      },
      { categories },
    )
    const txRes = await forjaApi.saveTransaction(draft)

    // Marcar ocurrencia vinculada
    await forjaApi.markOccurrence({
      recurringId: 'demo-rec-celular',
      dueDate: '2026-10-15',
      status: 'paid',
      transactionId: txRes.id,
    })

    const occBefore = await forjaApi.getOccurrences()
    expect(occBefore.some((o) => o.transactionId === txRes.id)).toBe(true)

    // Eliminar la transacción debe limpiar la ocurrencia para no dejarla falsamente pagada
    await forjaApi.deleteTransaction(txRes.id)
    const occAfter = await forjaApi.getOccurrences()
    expect(occAfter.some((o) => o.transactionId === txRes.id)).toBe(false)
  })

  it('desvincula jornadas de moto asociadas al eliminar la transacción', async () => {
    const categories = await forjaApi.getCategories()
    const accounts = await forjaApi.getAccounts()
    const incCat = categories.find((c) => c.kind === 'income')!

    const draft = buildTransactionDraft(
      {
        kind: 'income',
        date: '2026-10-11',
        description: 'Jornada moto domingo',
        categoryId: incCat.id,
        accountId: accounts[0].id,
        amount: 120000,
      },
      { categories },
    )
    const txRes = await forjaApi.saveTransaction(draft)

    const logId = await forjaApi.saveMotoLog({
      date: '2026-10-11',
      kind: 'shift',
      categoryId: incCat.id,
      hours: 6,
      tripsCount: 10,
      km: 50,
      odometerStart: 15100,
      odometerEnd: 15150,
      notes: null,
      transactionId: txRes.id,
    })

    const logsBefore = await forjaApi.getMotoLogs()
    expect(logsBefore.find((l) => l.id === logId)?.transactionId).toBe(txRes.id)

    await forjaApi.deleteTransaction(txRes.id)
    const logsAfter = await forjaApi.getMotoLogs()
    expect(logsAfter.find((l) => l.id === logId)?.transactionId).toBeNull()
  })

  it('impide eliminar una cuenta con movimientos asociados por partida doble', async () => {
    const accounts = await forjaApi.getAccounts()
    const accWithTx = accounts.find((a) => a.id === 'demo-acc-efectivo')!

    await expect(forjaApi.deleteAccount(accWithTx.id)).rejects.toThrow(
      /No se puede eliminar la bóveda porque tiene movimientos contables/,
    )
  })

  it('permite crear y eliminar una cuenta libre de movimientos', async () => {
    const accId = await forjaApi.saveAccount({
      name: 'Caja Fuerte Temporal',
      kind: 'cash',
      openingBalance: 0,
      openingDate: '2026-10-11',
      color: '#34d399',
      isArchived: false,
      notes: null,
      sortOrder: 99,
    })

    const accounts = await forjaApi.getAccounts()
    expect(accounts.some((a) => a.id === accId)).toBe(true)

    await forjaApi.deleteAccount(accId)
    const afterDelete = await forjaApi.getAccounts()
    expect(afterDelete.some((a) => a.id === accId)).toBe(false)
  })

  it('permite crear y eliminar registros de moto', async () => {
    const logId = await forjaApi.saveMotoLog({
      date: '2026-10-11',
      kind: 'shift',
      categoryId: null,
      hours: 5,
      tripsCount: 8,
      km: 45,
      odometerStart: 15000,
      odometerEnd: 15045,
      notes: 'Turno de prueba',
      transactionId: null,
    })

    const logs = await forjaApi.getMotoLogs()
    expect(logs.some((l) => l.id === logId)).toBe(true)

    await forjaApi.deleteMotoLog(logId)
    const afterDelete = await forjaApi.getMotoLogs()
    expect(afterDelete.some((l) => l.id === logId)).toBe(false)
  })

  it('persiste los cambios en localStorage', async () => {
    const newGoalId = await forjaApi.saveGoal({
      name: 'Ahorro para repuestos',
      kind: 'save',
      targetAmount: 500000,
      targetDate: '2026-12-31',
      accountId: 'demo-acc-efectivo',
      debtId: null,
      baselineAmount: 0,
      status: 'active',
      notes: null,
    })

    const raw = localStorage.getItem('forja_persistence_v2')
    expect(raw).toBeTruthy()
    expect(raw).toContain('Ahorro para repuestos')

    await forjaApi.deleteGoal(newGoalId)
    const rawAfter = localStorage.getItem('forja_persistence_v2')
    expect(rawAfter).not.toContain('Ahorro para repuestos')
  })

  it('deduplica estrictamente las categorías para prevenir duplicados históricos', async () => {
    const catsBefore = await forjaApi.getCategories()
    const pizzaCat = catsBefore.find((c) => c.name.toLowerCase().includes('pizza'))!

    await forjaApi.saveCategory({
      kind: pizzaCat.kind,
      name: 'Pizza y Domicilios',
      icon: 'pizza',
      color: '#fb923c',
      isMoto: false,
      systemKey: null,
      isArchived: false,
      sortOrder: 99,
    })

    const catsAfter = await forjaApi.getCategories()
    const pizzaCount = catsAfter.filter(
      (c) => c.kind === 'expense' && c.name.toLowerCase().trim() === 'pizza y domicilios'
    ).length
    expect(pizzaCount).toBe(1)
  })
})
