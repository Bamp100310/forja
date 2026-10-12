import { describe, it, expect } from 'vitest'
import {
  formatPlainNumber,
  formatCOP,
  parseCOPInput,
  isMoney,
  assertMoney,
  MAX_AMOUNT,
} from './money'

describe('Dominio Monetario y Manejo de Importes COP', () => {
  it('1234: genera importe numérico 1234 y formato localizado «1.234»', () => {
    const parsed = parseCOPInput('1234')
    expect(parsed).toBe(1234)
    expect(formatPlainNumber(parsed!)).toBe('1.234')
  })

  it('1.234 en el campo formateado de COP: interpreta correctamente 1234', () => {
    const parsed = parseCOPInput('1.234')
    expect(parsed).toBe(1234)
    expect(formatPlainNumber(parsed!)).toBe('1.234')
  })

  it('1.234.567: interpreta correctamente 1234567 con separadores múltiples', () => {
    const parsed = parseCOPInput('1.234.567')
    expect(parsed).toBe(1234567)
    expect(formatPlainNumber(parsed!)).toBe('1.234.567')
  })

  it('1000000: visualización «1.000.000» e importe numérico 1000000', () => {
    const parsed = parseCOPInput('1000000')
    expect(parsed).toBe(1000000)
    expect(formatPlainNumber(parsed!)).toBe('1.000.000')
  })

  it('Campo vacío: devuelve null y no genera un importe válido accidentalmente', () => {
    expect(parseCOPInput('')).toBeNull()
    expect(parseCOPInput('   ')).toBeNull()
    expect(parseCOPInput(null)).toBeNull()
    expect(parseCOPInput(undefined)).toBeNull()
  })

  it('Caracteres inválidos: normaliza y extrae sólo dígitos o devuelve null si no hay ninguno', () => {
    expect(parseCOPInput('abc')).toBeNull()
    expect(parseCOPInput('$ ')).toBeNull()
    expect(parseCOPInput('$ 1.234.567 COP')).toBe(1234567)
    expect(parseCOPInput('  $ 50.000  ')).toBe(50000)
  })

  it('Cantidad superior al límite admitido (10 billones): rechaza el valor', () => {
    const overLimit = String(MAX_AMOUNT + 1)
    expect(parseCOPInput(overLimit)).toBeNull()
    expect(isMoney(MAX_AMOUNT + 1)).toBe(false)
    expect(() => assertMoney(MAX_AMOUNT + 1)).toThrow()
  })

  it('Manejo de decimales con coma en COP: redondea al entero más cercano', () => {
    expect(parseCOPInput('1.234,50')).toBe(1235)
    expect(parseCOPInput('1.234,49')).toBe(1234)
    expect(parseCOPInput('1000,00')).toBe(1000)
    expect(parseCOPInput('1234.50')).toBe(1235)
    expect(parseCOPInput('1,234.50')).toBe(1235)
    expect(parseCOPInput('1.234.567,00')).toBe(1234567)
  })

  it('Separadores de miles con punto y coma: 15.000, 250.000, 1.234.567, 15,000, 250,000, 1,234,567', () => {
    expect(parseCOPInput('15.000')).toBe(15000)
    expect(parseCOPInput('250.000')).toBe(250000)
    expect(parseCOPInput('1.234.567')).toBe(1234567)
    expect(parseCOPInput('15,000')).toBe(15000)
    expect(parseCOPInput('250,000')).toBe(250000)
    expect(parseCOPInput('1,234,567')).toBe(1234567)
    expect(parseCOPInput('1,234')).toBe(1234)
    expect(parseCOPInput(1234567)).toBe(1234567)
    expect(parseCOPInput(250000)).toBe(250000)
  })

  it('Valores cero y límites exactos', () => {
    expect(parseCOPInput('0')).toBe(0)
    expect(parseCOPInput(0)).toBe(0)
    expect(isMoney(0)).toBe(true)
    expect(isMoney(MAX_AMOUNT)).toBe(true)
  })

  it('formatCOP formatea con signo y moneda correctamente', () => {
    expect(formatCOP(125000)).toBe('$ 125.000')
    expect(formatCOP(-50000)).toBe('−$ 50.000')
    expect(formatCOP(50000, { signed: true })).toBe('+$ 50.000')
  })
})
