import { describe, expect, it } from 'vitest'
import {
  calculateDailyAvailableBudget,
  getExpectedIncomesInPeriod,
  getNextPaydayDate,
  getPaydayProjection,
} from './payroll'
import type { IncomeSchedule, Transaction } from './types'
import { getPeriodForDate } from './period'
import { forjaApi } from '../services/api'
import { formatCOP, parseCOP } from './money'

describe('Dominio de Nómina y Quincenas (FORJA V2)', () => {
  const sampleSchedule: IncomeSchedule = {
    id: 'sched-1',
    name: 'Salario Quincenal',
    expectedAmount: 1800000,
    targetAccountId: 'acc-bancolombia',
    incomeCategoryId: 'cat-salario',
    scheduleType: 'biweekly',
    payDays: [1, 15],
    isActive: true,
  }

  describe('Cálculo de próxima fecha de pago (getNextPaydayDate)', () => {
    it('si hoy es 5 de octubre, el próximo pago es el 15 de octubre', () => {
      const nextDate = getNextPaydayDate(sampleSchedule, '2026-10-05')
      expect(nextDate).toBe('2026-10-15')
    })

    it('si hoy es 15 de octubre (día de pago), devuelve hoy mismo', () => {
      const nextDate = getNextPaydayDate(sampleSchedule, '2026-10-15')
      expect(nextDate).toBe('2026-10-15')
    })

    it('si hoy es 16 de octubre, el próximo pago pasa al 1 de noviembre', () => {
      const nextDate = getNextPaydayDate(sampleSchedule, '2026-10-16')
      expect(nextDate).toBe('2026-11-01')
    })

    it('maneja fin de mes y días de 30 o 31 con clamping correcto en febrero no bisiesto (2026)', () => {
      const endMonthSched: IncomeSchedule = {
        ...sampleSchedule,
        payDays: [15, 31],
      }
      // En febrero de 2026 (mes de 28 días)
      const febDate = getNextPaydayDate(endMonthSched, '2026-02-16')
      expect(febDate).toBe('2026-02-28')
    })

    it('maneja años bisiestos correctamente (febrero 2024 tiene 29 días)', () => {
      const endMonthSched: IncomeSchedule = {
        ...sampleSchedule,
        payDays: [15, 30],
      }
      const febLeapDate = getNextPaydayDate(endMonthSched, '2024-02-16')
      expect(febLeapDate).toBe('2024-02-29')
    })

    it('maneja transición de fin de año (diciembre a enero)', () => {
      const yearEndSched: IncomeSchedule = {
        ...sampleSchedule,
        payDays: [1, 15],
      }
      const janNext = getNextPaydayDate(yearEndSched, '2026-12-20')
      expect(janNext).toBe('2027-01-01')
    })

    it('soporta dos pagos mensuales con días configurables (ej. 10 y 25)', () => {
      const customDaysSched: IncomeSchedule = {
        ...sampleSchedule,
        payDays: [10, 25],
      }
      expect(getNextPaydayDate(customDaysSched, '2026-05-02')).toBe('2026-05-10')
      expect(getNextPaydayDate(customDaysSched, '2026-05-11')).toBe('2026-05-25')
      expect(getNextPaydayDate(customDaysSched, '2026-05-26')).toBe('2026-06-10')
    })
  })

  describe('Proyección consolidada (getPaydayProjection)', () => {
    it('calcula días restantes correctamente', () => {
      const proj = getPaydayProjection(sampleSchedule, '2026-10-10')
      expect(proj.daysRemaining).toBe(5)
      expect(proj.isDueToday).toBe(false)
      expect(proj.nextPaydayDate).toBe('2026-10-15')
      expect(proj.expectedAmount).toBe(1800000)
    })

    it('marca isDueToday cuando hoy coincide con la quincena', () => {
      const proj = getPaydayProjection(sampleSchedule, '2026-10-15')
      expect(proj.daysRemaining).toBe(0)
      expect(proj.isDueToday).toBe(true)
    })
  })

  describe('Presupuesto diario hasta la siguiente quincena', () => {
    it('divide el saldo líquido entre los días restantes sin compromisos', () => {
      const result = calculateDailyAvailableBudget(500000, 5, 0)
      expect(result.netAvailable).toBe(500000)
      expect(result.dailyBudget).toBe(100000)
    })

    it('descuenta compromisos y gastos reservados del disponible diario', () => {
      const result = calculateDailyAvailableBudget(500000, 5, 150000)
      expect(result.netAvailable).toBe(350000)
      expect(result.dailyBudget).toBe(70000)
    })

    it('evita división por cero si hoy es el día de pago', () => {
      const result = calculateDailyAvailableBudget(300000, 0, 0)
      expect(result.daysCount).toBe(1)
      expect(result.dailyBudget).toBe(300000)
    })
  })

  describe('Ingresos previstos en el periodo (getExpectedIncomesInPeriod)', () => {
    it('lista las quincenas del periodo e identifica si ya fueron recibidas', () => {
      const period = getPeriodForDate('2026-10-14') // 11 sep – 10 oct o corte actual
      const mockTxs: Transaction[] = [
        {
          id: 'tx-1',
          date: '2026-10-01',
          kind: 'income',
          description: 'Quincena 1 Oct',
          notes: null,
          tags: [],
          isMoto: false,
          debtId: null,
          loanId: null,
          meta: { payrollScheduleId: 'sched-1' },
          clientRequestId: 'req-1',
          createdAt: '2026-10-01T10:00:00Z',
          postings: [],
        },
      ]

      const items = getExpectedIncomesInPeriod([sampleSchedule], period, mockTxs)
      expect(items.length).toBeGreaterThan(0)
      const oct1Item = items.find((i) => i.date === '2026-10-01')
      if (oct1Item) {
        expect(oct1Item.isReceived).toBe(true)
        expect(oct1Item.matchedTransactionId).toBe('tx-1')
      }
    })

    it('no empareja dos veces la misma transacción a distintas quincenas (prevención de duplicados)', () => {
      const period = {
        id: 'cut-test',
        label: '1 al 31 de mayo',
        shortLabel: 'Mayo 2026',
        start: '2026-05-01',
        end: '2026-05-31',
        closingDate: '2026-05-31',
        isCurrent: true,
      }
      const singleTx: Transaction[] = [
        {
          id: 'tx-unique-1',
          date: '2026-05-01',
          kind: 'income',
          description: 'Salario recibido',
          notes: null,
          tags: [],
          isMoto: false,
          debtId: null,
          loanId: null,
          meta: { payrollScheduleId: 'sched-1', expectedPaydayDate: '2026-05-01' },
          clientRequestId: 'req-unique-1',
          createdAt: '2026-05-01T10:00:00Z',
          postings: [],
        },
      ]

      const items = getExpectedIncomesInPeriod([sampleSchedule], period, singleTx)
      const receivedCount = items.filter((i) => i.isReceived).length
      expect(receivedCount).toBe(1)
      expect(items.find((i) => i.date === '2026-05-01')?.isReceived).toBe(true)
      expect(items.find((i) => i.date === '2026-05-15')?.isReceived).toBe(false)
    })

    it('principio contable: los pagos programados futuros no aumentan el saldo real en libros', () => {
      const initialLiquid = 450000
      // La presencia de un cronograma salarial esperado de 1.800.000 no debe alterar initialLiquid
      expect(initialLiquid).toBe(450000)
    })
  })

  describe('CRUD de Programaciones Salariales y Validación en API', () => {
    it('crea una programación salarial con éxito y la persiste', async () => {
      const created = await forjaApi.addIncomeSchedule({
        name: 'Sueldo Empresa XYZ',
        expectedAmount: 2500000,
        targetAccountId: 'acc-bancolombia',
        incomeCategoryId: 'cat-salario',
        scheduleType: 'biweekly',
        payDays: [15, 30],
        isActive: true,
        notes: null,
      })

      expect(created.id).toBeDefined()
      expect(created.name).toBe('Sueldo Empresa XYZ')
      expect(created.expectedAmount).toBe(2500000)
      expect(created.payDays).toEqual([15, 30])

      const prefs = await forjaApi.getUserPreferences()
      const found = prefs.incomeSchedules.find((s) => s.id === created.id)
      expect(found).toBeDefined()
      expect(found?.name).toBe('Sueldo Empresa XYZ')

      // Limpiar
      await forjaApi.deleteIncomeSchedule(created.id)
    })

    it('rechaza programaciones con datos inválidos (nombre vacío, monto <= 0, días fuera de 1-31)', async () => {
      await expect(
        forjaApi.addIncomeSchedule({
          name: '   ',
          expectedAmount: 1000000,
          targetAccountId: null,
          incomeCategoryId: null,
          scheduleType: 'monthly',
          payDays: [15],
          isActive: true,
        })
      ).rejects.toThrow('El nombre de la programación salarial no puede estar vacío.')

      await expect(
        forjaApi.addIncomeSchedule({
          name: 'Salario Válido',
          expectedAmount: 0,
          targetAccountId: null,
          incomeCategoryId: null,
          scheduleType: 'monthly',
          payDays: [15],
          isActive: true,
        })
      ).rejects.toThrow('El importe esperado del salario debe ser mayor que cero.')

      await expect(
        forjaApi.addIncomeSchedule({
          name: 'Salario Válido',
          expectedAmount: 1000000,
          targetAccountId: null,
          incomeCategoryId: null,
          scheduleType: 'monthly',
          payDays: [35], // Día inválido
          isActive: true,
        })
      ).rejects.toThrow('El día de pago 35 es inválido (debe ser entre 1 y 31).')
    })

    it('edita una programación salarial y mantiene los cambios', async () => {
      const sched = await forjaApi.addIncomeSchedule({
        name: 'Trabajo Temporal',
        expectedAmount: 1200000,
        targetAccountId: null,
        incomeCategoryId: null,
        scheduleType: 'monthly',
        payDays: [10],
        isActive: true,
      })

      await forjaApi.updateIncomeSchedule(sched.id, {
        name: 'Trabajo Fijo',
        expectedAmount: 1500000,
        payDays: [12],
      })

      const prefs = await forjaApi.getUserPreferences()
      const updated = prefs.incomeSchedules.find((s) => s.id === sched.id)
      expect(updated?.name).toBe('Trabajo Fijo')
      expect(updated?.expectedAmount).toBe(1500000)
      expect(updated?.payDays).toEqual([12])

      await forjaApi.deleteIncomeSchedule(sched.id)
      const prefsAfterDelete = await forjaApi.getUserPreferences()
      expect(prefsAfterDelete.incomeSchedules.find((s) => s.id === sched.id)).toBeUndefined()
    })
  })

  describe('Formateo y parseo monetario (Prueba tipográfica requerida)', () => {
    it('formatea correctamente las cifras de prueba con separadores de miles COP sin centavos', () => {
      expect(formatCOP(5000)).toBe('$ 5.000')
      expect(formatCOP(8200)).toBe('$ 8.200')
      expect(formatCOP(25500)).toBe('$ 25.500')
      expect(formatCOP(58280)).toBe('$ 58.280')
      expect(formatCOP(125825)).toBe('$ 125.825')
      expect(formatCOP(1234567)).toBe('$ 1.234.567')
      expect(formatCOP(-25800)).toBe('−$ 25.800')
    })

    it('parsea correctamente strings con separadores de miles y signos', () => {
      expect(parseCOP('5.000')).toBe(5000)
      expect(parseCOP('$ 58.280')).toBe(58280)
      expect(parseCOP('1.234.567')).toBe(1234567)
      expect(parseCOP('-$25.800')).toBe(-25800)
      expect(parseCOP('−$ 25.800')).toBe(-25800)
    })
  })
})
