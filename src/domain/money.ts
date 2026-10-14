/**
 * Dinero en pesos colombianos.
 *
 * Estrategia de precisión: todos los importes se manejan como ENTEROS de pesos
 * (el COP no usa centavos en la práctica). En PostgreSQL se guardan como
 * `bigint`. La suma de enteros dentro de Number.MAX_SAFE_INTEGER es exacta, por
 * lo que no hay errores de punto flotante.
 */
export const CURRENCY = 'COP'

/** Límite operativo por importe individual: 10 billones de pesos. */
export const MAX_AMOUNT = 10_000_000_000_000

const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: CURRENCY,
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const compactFormatter = new Intl.NumberFormat('es-CO', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

const plainFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })

export function isMoney(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && Math.abs(value) <= MAX_AMOUNT
}

export function assertMoney(value: number, label = 'importe'): number {
  if (!isMoney(value)) throw new Error(`El ${label} debe ser un número entero de pesos válido`)
  return value
}

/** «$ 125.000» (usa espacio normal en lugar del espacio duro de Intl). */
export function formatCOP(amount: number, opts: { signed?: boolean } = {}): string {
  const text = copFormatter.format(Math.abs(amount)).replace(/\u00a0/g, ' ')
  if (amount < 0) return `−${text}`
  if (opts.signed && amount > 0) return `+${text}`
  return text
}

/** «$ 1,2 M» para ejes de gráficas. */
export function formatCOPCompact(amount: number): string {
  const sign = amount < 0 ? '−' : ''
  return `${sign}$ ${compactFormatter.format(Math.abs(amount)).replace(/\u00a0/g, ' ')}`
}

/** Número con separador de miles sin símbolo: «125.000». */
export function formatPlainNumber(value: number): string {
  return plainFormatter.format(value)
}

/**
 * Interpreta lo que escribe el usuario en un campo monetario o valores numéricos existentes.
 * Maneja separadores de miles (tanto puntos como comas en importes bancarios/internacionales).
 * Ignora símbolos de moneda ($ y COP) y espacios.
 * Si incluye decimales de centavos (ej. «1.234,50» o «1,234.50»), los redondea al entero más cercano.
 * Devuelve `null` si está vacío o es inválido.
 */
export function parseCOPInput(text: string | number | null | undefined): number | null {
  if (text === null || text === undefined) return null
  if (typeof text === 'number') {
    if (isNaN(text) || !Number.isFinite(text)) return null
    const rounded = Math.round(text)
    return isMoney(rounded) ? rounded : null
  }
  if (typeof text !== 'string') return null
  const trimmed = text.trim()
  if (trimmed.length === 0) return null

  // Detectar signo negativo (acepta guion ASCII -, unicode minus − o paréntesis)
  const isNegative = /^[-−]/.test(trimmed) || /^\(/.test(trimmed) || /[-−]/.test(trimmed)

  // Limpiar prefijos de moneda, signos y espacios
  const clean = trimmed
    .replace(/^[-−()$\s\u00a0]+/, '')
    .replace(/[)$\s\u00a0]+(COP|cop)?$/, '')
    .replace(/^[$\s\u00a0]+/, '')
    .trim()
  if (clean.length === 0) return null

  const applySign = (val: number | null): number | null => {
    if (val === null) return null
    const finalVal = isNegative ? -val : val
    return isMoney(finalVal) ? finalVal : null
  }

  // Contar separadores
  const dotCount = (clean.match(/\./g) || []).length
  const commaCount = (clean.match(/,/g) || []).length

  // Caso 1: Tiene tanto puntos como comas
  if (dotCount > 0 && commaCount > 0) {
    const lastDot = clean.lastIndexOf('.')
    const lastComma = clean.lastIndexOf(',')
    if (lastComma > lastDot) {
      // Formato es-CO: «1.234.567,50» (puntos son miles, coma es decimal)
      const intPart = clean.slice(0, lastComma).replace(/[^\d]/g, '')
      if (intPart.length === 0) return null
      const base = Number(intPart)
      if (!Number.isSafeInteger(base)) return null
      const centsStr = clean.slice(lastComma + 1).replace(/[^\d]/g, '').slice(0, 2)
      const cents = centsStr.length > 0 ? Number(centsStr.padEnd(2, '0')) : 0
      const rounded = cents >= 50 ? base + 1 : base
      return applySign(rounded)
    } else {
      // Formato en-US: «1,234,567.50» (comas son miles, punto es decimal)
      const intPart = clean.slice(0, lastDot).replace(/[^\d]/g, '')
      if (intPart.length === 0) return null
      const base = Number(intPart)
      if (!Number.isSafeInteger(base)) return null
      const centsStr = clean.slice(lastDot + 1).replace(/[^\d]/g, '').slice(0, 2)
      const cents = centsStr.length > 0 ? Number(centsStr.padEnd(2, '0')) : 0
      const rounded = cents >= 50 ? base + 1 : base
      return applySign(rounded)
    }
  }

  // Caso 2: Solo comas
  if (commaCount > 0) {
    // Si hay más de una coma: «1,234,567» -> todas son separadores de miles
    if (commaCount > 1) {
      const digits = clean.replace(/[^\d]/g, '')
      if (digits.length === 0) return null
      const value = Number(digits)
      return applySign(Number.isSafeInteger(value) ? value : null)
    }
    // Una sola coma: distinguir «15,000» / «250,000» (miles) de «1234,50» (centavos)
    const parts = clean.split(',')
    const afterComma = parts[1]?.replace(/[^\d]/g, '') ?? ''
    // En importes COP, 3 dígitos tras la coma indican miles (ej. «15,000», «250,000», «1,234»)
    if (afterComma.length === 3) {
      const digits = clean.replace(/[^\d]/g, '')
      if (digits.length === 0) return null
      const value = Number(digits)
      return applySign(Number.isSafeInteger(value) ? value : null)
    }
    // 1 o 2 dígitos tras la coma representan centavos (ej. «1234,50», «1000,00», «50,5»)
    const intDigits = parts[0].replace(/[^\d]/g, '')
    if (intDigits.length === 0) return null
    const base = Number(intDigits)
    if (!Number.isSafeInteger(base)) return null
    const centsStr = afterComma.slice(0, 2)
    const cents = centsStr.length > 0 ? Number(centsStr.padEnd(2, '0')) : 0
    const rounded = cents >= 50 ? base + 1 : base
    return applySign(rounded)
  }

  // Caso 3: Solo puntos
  if (dotCount > 0) {
    // Si hay más de un punto: «1.234.567» -> todos son separadores de miles
    if (dotCount > 1) {
      const digits = clean.replace(/[^\d]/g, '')
      if (digits.length === 0) return null
      const value = Number(digits)
      return applySign(Number.isSafeInteger(value) ? value : null)
    }
    // Un solo punto: distinguir «1.234», «15.000», «250.000» (miles) de «1234.50» (centavos)
    const parts = clean.split('.')
    const afterDot = parts[1]?.replace(/[^\d]/g, '') ?? ''
    if (afterDot.length === 3) {
      const digits = clean.replace(/[^\d]/g, '')
      if (digits.length === 0) return null
      const value = Number(digits)
      return applySign(Number.isSafeInteger(value) ? value : null)
    }
    if (afterDot.length === 1 || afterDot.length === 2) {
      const intDigits = parts[0].replace(/[^\d]/g, '')
      if (intDigits.length === 0) return null
      const base = Number(intDigits)
      if (!Number.isSafeInteger(base)) return null
      const centsStr = afterDot.slice(0, 2)
      const cents = centsStr.length > 0 ? Number(centsStr.padEnd(2, '0')) : 0
      const rounded = cents >= 50 ? base + 1 : base
      return applySign(rounded)
    }
    const digits = clean.replace(/[^\d]/g, '')
    if (digits.length === 0) return null
    const value = Number(digits)
    return applySign(Number.isSafeInteger(value) ? value : null)
  }

  // Caso 4: Solo dígitos numéricos
  const digits = clean.replace(/[^\d]/g, '')
  if (digits.length === 0) return null
  const value = Number(digits)
  if (!Number.isSafeInteger(value)) return null
  return applySign(value)
}

export const parseCOP = parseCOPInput

export function sumMoney(values: Iterable<number>): number {
  let total = 0
  for (const v of values) total += v
  return total
}

/** Proporción segura (0 si el denominador es 0). */
export function ratio(part: number, whole: number): number {
  if (whole === 0) return 0
  return part / whole
}

/** División entera redondeada para promedios monetarios. */
export function divideMoney(amount: number, divisor: number): number | null {
  if (divisor <= 0) return null
  return Math.round(amount / divisor)
}

const percentFormatter = new Intl.NumberFormat('es-CO', {
  style: 'percent',
  maximumFractionDigits: 0,
})

export function formatPercent(value: number): string {
  return percentFormatter.format(value).replace(/\u00a0/g, ' ')
}
