import { describe, expect, it } from 'vitest'
import { computeMotoStats, kmFromOdometer, latestOdometer, maintenanceReminders } from './moto'
import { catId, makeIndex, tx } from '../test/fixtures'
import type { MotoLog, MotoMaintenance } from './types'

const index = makeIndex()
const range = { start: '2026-09-11', end: '2026-10-10' }

describe('Taller de Moto — Cálculos y consistencia', () => {
  it('calcula ingresos brutos, comisiones, propinas y costos de la moto sin duplicar', () => {
    const t1 = tx({
      kind: 'income',
      date: '2026-09-15',
      description: 'Día Rappi',
      categoryId: catId('Rappi'),
      accountId: 'acc-rappi',
      amount: 120_000,
      commission: 15_000,
      tip: 8_000,
      isMoto: true,
    })

    const t2 = tx({
      kind: 'expense',
      date: '2026-09-15',
      description: 'Gasolina',
      categoryId: catId('Gasolina'),
      amount: 25_000,
      payment: { method: 'account', accountId: 'acc-cash' },
      isMoto: true,
    })

    const stats = computeMotoStats([t1, t2], [], index, range)
    expect(stats.gross).toBe(128_000) // 120k + 8k propina
    expect(stats.commissions).toBe(15_000)
    expect(stats.tips).toBe(8_000)
    expect(stats.costs).toBe(40_000) // 25k gasolina + 15k comisión
    expect(stats.net).toBe(128_000 - 40_000)
    expect(stats.workedDays).toBe(1)
  })

  it('NO inventa métricas por kilómetro si no hay kilómetros registrados', () => {
    const t1 = tx({
      kind: 'income',
      date: '2026-09-15',
      description: 'Día DiDi',
      categoryId: catId('DiDi Food'),
      accountId: 'acc-bank',
      amount: 80_000,
      isMoto: true,
    })
    const stats = computeMotoStats([t1], [], index, range)
    expect(stats.km).toBeNull()
    expect(stats.incomePerKm).toBeNull()
    expect(stats.costPerKm).toBeNull()
  })

  it('calcula ingreso y costo por km cuando existen datos reales de odómetro y jornada vinculada', () => {
    const t1 = tx({
      kind: 'income',
      date: '2026-09-15',
      description: 'Día Rappi',
      categoryId: catId('Rappi'),
      accountId: 'acc-bank',
      amount: 100_000,
      isMoto: true,
    })

    const tExpense = tx({
      kind: 'expense',
      date: '2026-09-15',
      description: 'Gasolina',
      categoryId: catId('Gasolina'),
      amount: 20_000,
      payment: { method: 'account', accountId: 'acc-cash' },
      isMoto: true,
    })

    const log: MotoLog = {
      id: 'log-1',
      date: '2026-09-15',
      kind: 'shift',
      categoryId: catId('Rappi'),
      hours: 6,
      tripsCount: 12,
      km: 50,
      odometerStart: 12000,
      odometerEnd: 12050,
      notes: null,
      transactionId: t1.id,
    }

    const stats = computeMotoStats([t1, tExpense], [log], index, range)
    expect(stats.km).toBe(50)
    expect(stats.incomePerKm).toBe(2000) // 100.000 / 50 km
    expect(stats.costPerKm).toBe(400) // 20.000 / 50 km
  })

  it('valida km a partir del odómetro de forma segura', () => {
    expect(kmFromOdometer(10000, 10050)).toBe(50)
    expect(kmFromOdometer(10050, 10000)).toBeNull() // fin menor que inicio
    expect(kmFromOdometer(null, 10050)).toBeNull()
  })

  it('identifica el odómetro más reciente conocido', () => {
    const logs: MotoLog[] = [
      { id: '1', date: '2026-09-10', kind: 'shift', categoryId: null, hours: null, tripsCount: null, km: 30, odometerStart: 10000, odometerEnd: 10030, notes: null, transactionId: null },
      { id: '2', date: '2026-09-15', kind: 'shift', categoryId: null, hours: null, tripsCount: null, km: 40, odometerStart: 10030, odometerEnd: 10070, notes: null, transactionId: null },
    ]
    const maint: MotoMaintenance[] = [
      { id: 'm1', date: '2026-09-12', kind: 'preventive', title: 'Aceite', odometer: 10050, nextDueDate: '2026-10-12', nextDueOdometer: 12000, notes: null, transactionId: null },
    ]
    expect(latestOdometer(logs, maint, 9000)).toBe(10070)
  })

  it('genera recordatorios de mantenimiento oportunos cuando se acercan fecha u odómetro', () => {
    const maint: MotoMaintenance[] = [
      {
        id: 'm1',
        date: '2026-09-01',
        kind: 'preventive',
        title: 'Cambio de aceite',
        odometer: 10000,
        nextDueDate: '2026-10-15', // a 5 días de hoy (2026-10-10) -> advertencia
        nextDueOdometer: 12500, // 12500 - 12300 = 200 km restantes -> advertencia
        notes: null,
        transactionId: null,
      },
    ]

    const reminders = maintenanceReminders(maint, 12300, '2026-10-10')
    expect(reminders.length).toBe(1)
    expect(reminders[0].overdue).toBe(false)
    expect(reminders[0].kmLeft).toBe(200)
    expect(reminders[0].daysLeft).toBe(5)
  })
})
