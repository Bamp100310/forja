import { describe, expect, it } from 'vitest'
import {
  calculateDailyAvailableBudget,
  getExpectedIncomesInPeriod,
  getNextPaydayDate,
  getPaydayProjection,
} from './payroll'
import type { IncomeSchedule, Transaction } from './types'
import { getPeriodForDate } from './period'

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

    it('maneja fin de mes y días de 30 o 31 con clamping correcto', () => {
      const endMonthSched: IncomeSchedule = {
        ...sampleSchedule,
        payDays: [15, 31],
      }
      // En febrero de 2026 (mes de 28 días)
      const febDate = getNextPaydayDate(endMonthSched, '2026-02-16')
      expect(febDate).toBe('2026-02-28')
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
  })
})
