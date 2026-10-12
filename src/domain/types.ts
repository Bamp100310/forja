/**
 * Tipos de dominio de FORJA.
 *
 * Modelo contable de partida doble: cada transacción tiene líneas (postings)
 * cuyo importe suma cero. Convención de signo: DÉBITO positivo, CRÉDITO negativo.
 *
 *  - Cuenta (activo): + aumenta el saldo, − lo reduce.
 *  - Préstamo realizado (activo por cobrar): + aumenta lo que me deben.
 *  - Deuda (pasivo): − aumenta lo que debo, + lo reduce.
 *  - Categoría de gasto: + reconoce un gasto.
 *  - Categoría de ingreso: − reconoce un ingreso.
 *  - Patrimonio: contrapartida de ajustes y saldos previos.
 */
import type { ISODate } from './dates'

export type AccountKind = 'cash' | 'bank' | 'wallet' | 'savings' | 'platform_receivable' | 'other'

/** Cuentas cuyo saldo es dinero disponible (no incluye por cobrar de plataformas). */
export const LIQUID_ACCOUNT_KINDS: readonly AccountKind[] = ['cash', 'bank', 'wallet', 'savings']

export const ACCOUNT_KIND_LABELS: Record<AccountKind, string> = {
  cash: 'Efectivo',
  bank: 'Cuenta bancaria',
  wallet: 'Billetera digital',
  savings: 'Ahorro / bolsillo',
  platform_receivable: 'Por cobrar a plataforma',
  other: 'Otra (no disponible)',
}

export interface Account {
  id: string
  name: string
  kind: AccountKind
  openingBalance: number
  openingDate: ISODate
  color: string | null
  isArchived: boolean
  notes: string | null
  sortOrder: number
}

export type CategoryKind = 'income' | 'expense'

export type SystemCategoryKey =
  | 'financial_interest'
  | 'financial_fees'
  | 'platform_commission'
  | 'tips'
  | 'interest_income'

export interface Category {
  id: string
  kind: CategoryKind
  name: string
  icon: string | null
  color: string | null
  isMoto: boolean
  systemKey: SystemCategoryKey | null
  isArchived: boolean
  sortOrder: number
}

export type DebtKind = 'credit_card' | 'personal_loan' | 'other'
export type DebtStatus = 'active' | 'closed'

export const DEBT_KIND_LABELS: Record<DebtKind, string> = {
  credit_card: 'Tarjeta de crédito',
  personal_loan: 'Crédito de libre inversión',
  other: 'Otra obligación',
}

export interface Debt {
  id: string
  name: string
  kind: DebtKind
  institution: string | null
  openingBalance: number
  openingDate: ISODate
  creditLimit: number | null
  /** Tasa efectiva anual en %, si se conoce. */
  interestRate: number | null
  cutDay: number | null
  dueDay: number | null
  expectedInstallment: number | null
  totalInstallments: number | null
  status: DebtStatus
  notes: string | null
}

export interface Loan {
  id: string
  personName: string
  startDate: ISODate
  dueDate: ISODate | null
  /** Interés pactado informativo (texto o %), no genera cobros automáticos. */
  interestNote: string | null
  isArchived: boolean
  notes: string | null
}

export type TransactionKind =
  | 'income'
  | 'expense'
  | 'transfer'
  | 'debt_payment'
  | 'debt_charge'
  | 'debt_disbursement'
  | 'loan_given'
  | 'loan_repayment'
  | 'adjustment'

export const TRANSACTION_KIND_LABELS: Record<TransactionKind, string> = {
  income: 'Ingreso',
  expense: 'Gasto',
  transfer: 'Transferencia',
  debt_payment: 'Pago de deuda',
  debt_charge: 'Interés / cargo',
  debt_disbursement: 'Desembolso de crédito',
  loan_given: 'Préstamo realizado',
  loan_repayment: 'Cobro de préstamo',
  adjustment: 'Ajuste',
}

export type TargetType = 'account' | 'debt' | 'loan' | 'category' | 'equity'

export type PostingRole =
  | 'gross'
  | 'commission'
  | 'tip'
  | 'net'
  | 'principal'
  | 'interest'
  | 'fee'
  | 'payment'
  | 'transfer'
  | 'disbursement'
  | 'adjustment'

export interface Posting {
  targetType: TargetType
  /** `null` solo para `equity`. */
  targetId: string | null
  amount: number
  role: PostingRole | null
}

export interface Transaction {
  id: string
  date: ISODate
  kind: TransactionKind
  description: string
  notes: string | null
  tags: string[]
  isMoto: boolean
  debtId: string | null
  loanId: string | null
  /** Datos del formulario que originó la transacción (para edición). */
  meta: Record<string, unknown>
  clientRequestId: string
  createdAt: string
  postings: Posting[]
}

/** Saldo agregado por destino (vista `ledger_target_totals`). */
export interface TargetTotal {
  targetType: TargetType
  targetId: string | null
  total: number
  count: number
}

export type RecurringFrequency =
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'bimonthly'
  | 'quarterly'
  | 'semiannual'
  | 'yearly'

export const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  weekly: 'Semanal',
  biweekly: 'Cada 2 semanas',
  monthly: 'Mensual',
  bimonthly: 'Bimestral',
  quarterly: 'Trimestral',
  semiannual: 'Semestral',
  yearly: 'Anual',
}

export type RecurringStatus = 'active' | 'paused' | 'ended'

export interface RecurringExpense {
  id: string
  name: string
  amount: number
  categoryId: string
  frequency: RecurringFrequency
  /** Primera fecha de vencimiento de la serie. */
  anchorDate: ISODate
  endDate: ISODate | null
  paymentAccountId: string | null
  paymentDebtId: string | null
  status: RecurringStatus
  notes: string | null
}

export type OccurrenceStatus = 'paid' | 'skipped'

export interface RecurringOccurrence {
  id: string
  recurringId: string
  dueDate: ISODate
  status: OccurrenceStatus
  transactionId: string | null
}

export type MotoLogKind = 'shift' | 'trip'

export interface MotoLog {
  id: string
  date: ISODate
  kind: MotoLogKind
  categoryId: string | null
  hours: number | null
  tripsCount: number | null
  km: number | null
  odometerStart: number | null
  odometerEnd: number | null
  notes: string | null
  transactionId: string | null
}

export type MaintenanceKind = 'preventive' | 'corrective'

export interface MotoMaintenance {
  id: string
  date: ISODate
  kind: MaintenanceKind
  title: string
  odometer: number | null
  nextDueDate: ISODate | null
  nextDueOdometer: number | null
  notes: string | null
  transactionId: string | null
}

export type BudgetBasis = 'calendar_month' | 'cut'

export interface Budget {
  id: string
  categoryId: string
  amount: number
  basis: BudgetBasis
}

export type GoalKind = 'save' | 'reduce_debt' | 'maintenance_fund' | 'reserve'
export type GoalStatus = 'active' | 'archived'

export const GOAL_KIND_LABELS: Record<GoalKind, string> = {
  save: 'Ahorrar',
  reduce_debt: 'Reducir una deuda',
  maintenance_fund: 'Fondo de mantenimiento',
  reserve: 'Reserva para gasto futuro',
}

export interface Goal {
  id: string
  name: string
  kind: GoalKind
  targetAmount: number
  targetDate: ISODate | null
  accountId: string | null
  debtId: string | null
  /** Saldo de la deuda al crear el objetivo (para medir la reducción). */
  baselineAmount: number | null
  status: GoalStatus
  notes: string | null
}

export interface Profile {
  id: string
  displayName: string | null
  motoName: string | null
  motoInitialOdometer: number | null
}
