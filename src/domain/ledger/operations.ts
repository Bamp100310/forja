/**
 * Constructor de operaciones contables.
 *
 * Única implementación de las reglas que convierten una operación de usuario
 * (ingreso, gasto, pago de tarjeta, préstamo, etc.) en líneas de partida doble.
 * Los formularios generan un `OperationInput`; este módulo produce el borrador
 * de transacción que se persiste de forma atómica en la base de datos.
 */
import { type ISODate, isValidISODate } from '../dates'
import { MAX_AMOUNT } from '../money'
import type {
  Category,
  Posting,
  PostingRole,
  SystemCategoryKey,
  TargetType,
  TransactionKind,
} from '../types'

interface BaseOp {
  date: ISODate
  description: string
  notes?: string | null
  tags?: string[]
  isMoto?: boolean
}

export interface IncomeOp extends BaseOp {
  kind: 'income'
  categoryId: string
  /** Cuenta donde queda el dinero (puede ser «por cobrar» de una plataforma). */
  accountId: string
  /** Ingreso bruto generado (sin propinas). */
  amount: number
  /** Comisión descontada por la plataforma (se reconoce como gasto). */
  commission?: number
  /** Propinas recibidas (ingreso aparte). */
  tip?: number
}

export type PaymentSource = { method: 'account'; accountId: string } | { method: 'debt'; debtId: string }

export interface ExpenseOp extends BaseOp {
  kind: 'expense'
  categoryId: string
  amount: number
  payment: PaymentSource
}

export interface TransferOp extends BaseOp {
  kind: 'transfer'
  fromAccountId: string
  toAccountId: string
  amount: number
  /** Costo de la transferencia, cobrado en la cuenta de origen. */
  fee?: number
}

export interface DebtPaymentOp extends BaseOp {
  kind: 'debt_payment'
  debtId: string
  accountId: string
  /** Abono a capital / saldo de la deuda. */
  principal: number
  /** Intereses incluidos en este pago (gasto financiero). */
  interest?: number
  /** Seguros, cuota de manejo u otros cargos incluidos en este pago. */
  fees?: number
}

export interface DebtChargeOp extends BaseOp {
  kind: 'debt_charge'
  debtId: string
  amount: number
  chargeType: 'interest' | 'fee'
}

export interface DebtDisbursementOp extends BaseOp {
  kind: 'debt_disbursement'
  debtId: string
  accountId: string
  /** Valor total del crédito (aumenta la deuda). */
  amount: number
  /** Costos descontados del desembolso (estudio, seguro anticipado...). */
  upfrontFees?: number
}

export interface NewLoanInput {
  id: string
  personName: string
  dueDate: ISODate | null
  interestNote: string | null
  notes: string | null
}

export interface LoanGivenOp extends BaseOp {
  kind: 'loan_given'
  loanId: string
  /** `null` cuando se registra un préstamo previo que no sale de ninguna cuenta. */
  accountId: string | null
  amount: number
  newLoan?: NewLoanInput
}

export interface LoanRepaymentOp extends BaseOp {
  kind: 'loan_repayment'
  loanId: string
  accountId: string
  /** Capital devuelto (reduce lo que me deben, NO es ingreso). */
  principal: number
  /** Intereses pactados recibidos (ingreso financiero). */
  interest?: number
}

export interface AdjustmentOp extends BaseOp {
  kind: 'adjustment'
  target: { type: 'account' | 'debt' | 'loan'; id: string }
  /**
   * Variación del saldo desde la perspectiva del usuario:
   * cuenta/préstamo: + aumenta el saldo; deuda: + aumenta lo que debo.
   */
  delta: number
}

export type OperationInput =
  | IncomeOp
  | ExpenseOp
  | TransferOp
  | DebtPaymentOp
  | DebtChargeOp
  | DebtDisbursementOp
  | LoanGivenOp
  | LoanRepaymentOp
  | AdjustmentOp

export interface TransactionDraft {
  date: ISODate
  kind: TransactionKind
  description: string
  notes: string | null
  tags: string[]
  isMoto: boolean
  debtId: string | null
  loanId: string | null
  meta: OperationInput
  postings: Posting[]
  newLoan: NewLoanInput | null
}

export class OperationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OperationError'
  }
}

export interface BuildContext {
  categories: readonly Category[]
}

function requireSystemCategory(ctx: BuildContext, key: SystemCategoryKey): string {
  const cat = ctx.categories.find((c) => c.systemKey === key)
  if (!cat) {
    throw new OperationError(
      `Falta la categoría del sistema «${key}». Abre Configuración para restaurar las categorías base.`,
    )
  }
  return cat.id
}

function positive(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value <= 0 || value > MAX_AMOUNT) {
    throw new OperationError(`${label} debe ser un valor entero mayor que cero.`)
  }
  return value
}

function nonNegative(value: number | undefined, label: string): number {
  const v = value ?? 0
  if (!Number.isSafeInteger(v) || v < 0 || v > MAX_AMOUNT) {
    throw new OperationError(`${label} no puede ser negativo.`)
  }
  return v
}

function line(targetType: TargetType, targetId: string | null, amount: number, role: PostingRole): Posting {
  return { targetType, targetId, amount, role }
}

/** Elimina líneas en cero y valida el equilibrio de la partida doble. */
export function finalizePostings(lines: Posting[]): Posting[] {
  const result = lines.filter((l) => l.amount !== 0)
  const sum = result.reduce((acc, l) => acc + l.amount, 0)
  if (sum !== 0) throw new OperationError('La operación no está balanceada (error interno).')
  if (result.length < 2) throw new OperationError('La operación no tiene movimientos suficientes.')
  for (const l of result) {
    if ((l.targetType === 'equity') !== (l.targetId === null)) {
      throw new OperationError('Línea contable con destino inválido (error interno).')
    }
  }
  return result
}

function buildPostings(op: OperationInput, ctx: BuildContext): Posting[] {
  switch (op.kind) {
    case 'income': {
      const gross = positive(op.amount, 'El ingreso')
      const commission = nonNegative(op.commission, 'La comisión')
      const tip = nonNegative(op.tip, 'La propina')
      const net = gross - commission + tip
      if (net < 0) throw new OperationError('La comisión no puede superar el ingreso más las propinas.')
      const lines = [line('category', op.categoryId, -gross, 'gross'), line('account', op.accountId, net, 'net')]
      if (commission > 0) {
        lines.push(line('category', requireSystemCategory(ctx, 'platform_commission'), commission, 'commission'))
      }
      if (tip > 0) lines.push(line('category', requireSystemCategory(ctx, 'tips'), -tip, 'tip'))
      return lines
    }
    case 'expense': {
      const amount = positive(op.amount, 'El gasto')
      const source =
        op.payment.method === 'account'
          ? line('account', op.payment.accountId, -amount, 'payment')
          : line('debt', op.payment.debtId, -amount, 'payment')
      return [line('category', op.categoryId, amount, 'payment'), source]
    }
    case 'transfer': {
      const amount = positive(op.amount, 'El valor transferido')
      const fee = nonNegative(op.fee, 'El costo de la transferencia')
      if (op.fromAccountId === op.toAccountId) {
        throw new OperationError('La cuenta de origen y la de destino deben ser distintas.')
      }
      const lines = [
        line('account', op.fromAccountId, -(amount + fee), 'transfer'),
        line('account', op.toAccountId, amount, 'transfer'),
      ]
      if (fee > 0) lines.push(line('category', requireSystemCategory(ctx, 'financial_fees'), fee, 'fee'))
      return lines
    }
    case 'debt_payment': {
      const principal = nonNegative(op.principal, 'El abono a capital')
      const interest = nonNegative(op.interest, 'Los intereses')
      const fees = nonNegative(op.fees, 'Los cargos')
      const total = principal + interest + fees
      if (total <= 0) throw new OperationError('El pago debe ser mayor que cero.')
      const lines = [line('account', op.accountId, -total, 'payment'), line('debt', op.debtId, principal, 'principal')]
      if (interest > 0) {
        lines.push(line('category', requireSystemCategory(ctx, 'financial_interest'), interest, 'interest'))
      }
      if (fees > 0) lines.push(line('category', requireSystemCategory(ctx, 'financial_fees'), fees, 'fee'))
      return lines
    }
    case 'debt_charge': {
      const amount = positive(op.amount, 'El cargo')
      const key: SystemCategoryKey = op.chargeType === 'interest' ? 'financial_interest' : 'financial_fees'
      return [
        line('category', requireSystemCategory(ctx, key), amount, op.chargeType === 'interest' ? 'interest' : 'fee'),
        line('debt', op.debtId, -amount, op.chargeType === 'interest' ? 'interest' : 'fee'),
      ]
    }
    case 'debt_disbursement': {
      const amount = positive(op.amount, 'El valor del crédito')
      const fees = nonNegative(op.upfrontFees, 'Los costos descontados')
      if (fees >= amount) throw new OperationError('Los costos descontados deben ser menores que el crédito.')
      const lines = [
        line('debt', op.debtId, -amount, 'disbursement'),
        line('account', op.accountId, amount - fees, 'disbursement'),
      ]
      if (fees > 0) lines.push(line('category', requireSystemCategory(ctx, 'financial_fees'), fees, 'fee'))
      return lines
    }
    case 'loan_given': {
      const amount = positive(op.amount, 'El valor prestado')
      return [
        line('loan', op.loanId, amount, 'principal'),
        op.accountId === null
          ? line('equity', null, -amount, 'adjustment')
          : line('account', op.accountId, -amount, 'principal'),
      ]
    }
    case 'loan_repayment': {
      const principal = nonNegative(op.principal, 'El capital devuelto')
      const interest = nonNegative(op.interest, 'Los intereses')
      if (principal + interest <= 0) throw new OperationError('La devolución debe ser mayor que cero.')
      const lines = [
        line('account', op.accountId, principal + interest, 'payment'),
        line('loan', op.loanId, -principal, 'principal'),
      ]
      if (interest > 0) {
        lines.push(line('category', requireSystemCategory(ctx, 'interest_income'), -interest, 'interest'))
      }
      return lines
    }
    case 'adjustment': {
      if (!Number.isSafeInteger(op.delta) || op.delta === 0) {
        throw new OperationError('El ajuste debe ser distinto de cero.')
      }
      if (op.description.trim().length < 3) {
        throw new OperationError('Explica el motivo del ajuste.')
      }
      // Deuda: aumentar lo que debo es un crédito (negativo).
      const targetAmount = op.target.type === 'debt' ? -op.delta : op.delta
      return [line(op.target.type, op.target.id, targetAmount, 'adjustment'), line('equity', null, -targetAmount, 'adjustment')]
    }
  }
}

function relatedDebt(op: OperationInput): string | null {
  switch (op.kind) {
    case 'expense':
      return op.payment.method === 'debt' ? op.payment.debtId : null
    case 'debt_payment':
    case 'debt_charge':
    case 'debt_disbursement':
      return op.debtId
    case 'adjustment':
      return op.target.type === 'debt' ? op.target.id : null
    default:
      return null
  }
}

function relatedLoan(op: OperationInput): string | null {
  switch (op.kind) {
    case 'loan_given':
    case 'loan_repayment':
      return op.loanId
    case 'adjustment':
      return op.target.type === 'loan' ? op.target.id : null
    default:
      return null
  }
}

/** Convierte una operación del usuario en un borrador listo para persistir. */
export function buildTransactionDraft(op: OperationInput, ctx: BuildContext): TransactionDraft {
  if (!isValidISODate(op.date)) throw new OperationError('La fecha no es válida.')
  const description = op.description.trim()
  if (description.length === 0) throw new OperationError('Escribe una descripción.')
  if (description.length > 140) throw new OperationError('La descripción es demasiado larga (máx. 140).')
  const postings = finalizePostings(buildPostings(op, ctx))
  const tags = Array.from(new Set((op.tags ?? []).map((t) => t.trim()).filter(Boolean)))
  return {
    date: op.date,
    kind: op.kind,
    description,
    notes: op.notes?.trim() ? op.notes.trim() : null,
    tags,
    isMoto: Boolean(op.isMoto),
    debtId: relatedDebt(op),
    loanId: relatedLoan(op),
    meta: { ...op, description, tags },
    postings,
    newLoan: op.kind === 'loan_given' ? (op.newLoan ?? null) : null,
  }
}
