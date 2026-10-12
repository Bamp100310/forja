import { describe, expect, it } from 'vitest'
import {
  canNavigateToNextPeriod,
  elapsedDaysInPeriod,
  getCurrentPeriod,
  getNextPeriod,
  getPeriodById,
  getPeriodForDate,
  getPreviousPeriod,
  getRecentPeriods,
  isCurrentPeriod,
  isDateInPeriod,
  isFuturePeriod,
  periodLengthInDays,
} from './period'
import { todayInBogota } from './dates'

describe('Caso A — corte financiero 11 → 10', () => {
  it('el día 10 cierra el corte que empezó el 11 del mes anterior', () => {
    const p = getPeriodForDate('2026-10-10')
    expect(p.start).toBe('2026-09-11')
    expect(p.end).toBe('2026-10-10')
    expect(p.id).toBe('2026-09')
  })

  it('el día 11 abre un corte nuevo', () => {
    const p = getPeriodForDate('2026-10-11')
    expect(p.start).toBe('2026-10-11')
    expect(p.end).toBe('2026-11-10')
    expect(p.id).toBe('2026-10')
  })

  it('días intermedios pertenecen al corte correcto', () => {
    expect(getPeriodForDate('2026-09-30').id).toBe('2026-09')
    expect(getPeriodForDate('2026-10-01').id).toBe('2026-09')
    expect(getPeriodForDate('2026-09-11').id).toBe('2026-09')
    expect(getPeriodForDate('2026-09-10').id).toBe('2026-08')
  })

  it('maneja el cambio de año (11 dic → 10 ene)', () => {
    const dec = getPeriodForDate('2026-12-20')
    expect(dec.start).toBe('2026-12-11')
    expect(dec.end).toBe('2027-01-10')
    const jan10 = getPeriodForDate('2027-01-10')
    expect(jan10.id).toBe('2026-12')
    const jan11 = getPeriodForDate('2027-01-11')
    expect(jan11.start).toBe('2027-01-11')
    expect(jan11.end).toBe('2027-02-10')
    const jan5 = getPeriodForDate('2027-01-05')
    expect(jan5.start).toBe('2026-12-11')
  })

  it('maneja enero y febrero (incluido año bisiesto)', () => {
    const p = getPeriodForDate('2028-02-29')
    expect(p.start).toBe('2028-02-11')
    expect(p.end).toBe('2028-03-10')
    expect(periodLengthInDays(p)).toBe(29)
    expect(periodLengthInDays(getPeriodForDate('2027-02-15'))).toBe(28)
  })

  it('navega a cortes anterior y siguiente, cruzando años', () => {
    const dec = getPeriodById('2026-12')
    expect(getNextPeriod(dec).id).toBe('2027-01')
    expect(getPreviousPeriod(getPeriodById('2027-01')).id).toBe('2026-12')
    expect(getPreviousPeriod(getPeriodById('2026-01')).start).toBe('2025-12-11')
  })

  it('isDateInPeriod usa límites inclusivos', () => {
    const p = getPeriodById('2026-09')
    expect(isDateInPeriod('2026-09-11', p)).toBe(true)
    expect(isDateInPeriod('2026-10-10', p)).toBe(true)
    expect(isDateInPeriod('2026-09-10', p)).toBe(false)
    expect(isDateInPeriod('2026-10-11', p)).toBe(false)
  })

  it('genera etiquetas legibles', () => {
    expect(getPeriodById('2026-09').label).toMatch(/^11 sept? – 10 oct 2026$/)
    expect(getPeriodById('2026-12').label).toMatch(/^11 dic 2026 – 10 ene 2027$/)
  })

  it('identificadores estables y cortes recientes en orden', () => {
    const recent = getRecentPeriods(getPeriodById('2026-02'), 4)
    expect(recent.map((p) => p.id)).toEqual(['2025-11', '2025-12', '2026-01', '2026-02'])
  })

  it('calcula el corte actual con la hora de Bogotá, no UTC', () => {
    // 2026-10-11 03:00 UTC = 2026-10-10 22:00 en Bogotá → aún es el corte que termina.
    const instant = new Date('2026-10-11T03:00:00Z')
    expect(todayInBogota(instant)).toBe('2026-10-10')
    expect(getCurrentPeriod(instant).id).toBe('2026-09')
    // 2026-10-11 05:00 UTC = 2026-10-11 00:00 en Bogotá → corte nuevo.
    expect(getCurrentPeriod(new Date('2026-10-11T05:00:00Z')).id).toBe('2026-10')
  })

  it('días transcurridos del corte', () => {
    const p = getPeriodById('2026-09')
    expect(elapsedDaysInPeriod(p, '2026-09-11')).toBe(1)
    expect(elapsedDaysInPeriod(p, '2026-10-10')).toBe(30)
    expect(elapsedDaysInPeriod(p, '2026-08-01')).toBe(0)
    expect(elapsedDaysInPeriod(p, '2027-01-01')).toBe(30)
  })

  it('impide clasificar o navegar a cortes futuros', () => {
    const fakeCurrentInstant = new Date('2026-10-15T12:00:00Z')
    const currentPeriod = getCurrentPeriod(fakeCurrentInstant)
    expect(currentPeriod.id).toBe('2026-10')

    const prev = getPeriodById('2026-09')
    const next = getPeriodById('2026-11')

    expect(isCurrentPeriod(currentPeriod, fakeCurrentInstant)).toBe(true)
    expect(isCurrentPeriod(prev, fakeCurrentInstant)).toBe(false)
    expect(isCurrentPeriod(next, fakeCurrentInstant)).toBe(false)

    expect(isFuturePeriod(next, fakeCurrentInstant)).toBe(true)
    expect(isFuturePeriod(prev, fakeCurrentInstant)).toBe(false)
    expect(isFuturePeriod(currentPeriod, fakeCurrentInstant)).toBe(false)

    expect(canNavigateToNextPeriod(prev, fakeCurrentInstant)).toBe(true)
    expect(canNavigateToNextPeriod(currentPeriod, fakeCurrentInstant)).toBe(false)
    expect(canNavigateToNextPeriod(next, fakeCurrentInstant)).toBe(false)
  })
})
