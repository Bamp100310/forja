import { DEFAULT_CATEGORIES } from '../domain/defaults'
import { buildTransactionDraft } from '../domain/ledger/operations'
import type {
  Account,
  Budget,
  Category,
  Debt,
  Goal,
  Loan,
  MotoLog,
  MotoMaintenance,
  Profile,
  RecurringExpense,
  RecurringOccurrence,
  Transaction,
} from '../domain/types'

export const DEMO_PROFILE: Profile = {
  id: 'demo-user-id',
  displayName: 'Piloto Independiente',
  motoName: 'Gixxer 150 FI',
  motoInitialOdometer: 14200,
}

export const DEMO_CATEGORIES: Category[] = DEFAULT_CATEGORIES.map((c, i) => ({
  id: `demo-cat-${i + 1}`,
  kind: c.kind,
  name: c.name,
  icon: c.icon,
  color: c.color,
  isMoto: c.isMoto,
  systemKey: c.systemKey,
  isArchived: false,
  sortOrder: i + 1,
}))

const getCatId = (name: string): string => {
  const cat = DEMO_CATEGORIES.find((c) => c.name === name)
  if (!cat) throw new Error(`Categoría demo no encontrada: ${name}`)
  return cat.id
}

export const DEMO_ACCOUNTS: Account[] = [
  {
    id: 'demo-acc-efectivo',
    name: 'Efectivo',
    kind: 'cash',
    openingBalance: 150_000,
    openingDate: '2026-09-01',
    color: '#34d399',
    isArchived: false,
    notes: 'Bolsillo y base para vueltas',
    sortOrder: 1,
  },
  {
    id: 'demo-acc-nequi',
    name: 'Nequi / Billetera',
    kind: 'wallet',
    openingBalance: 320_000,
    openingDate: '2026-09-01',
    color: '#a78bfa',
    isArchived: false,
    notes: 'Recepción de pagos y transferencias',
    sortOrder: 2,
  },
  {
    id: 'demo-acc-banco',
    name: 'Cuenta de Ahorros Bancolombia',
    kind: 'bank',
    openingBalance: 980_000,
    openingDate: '2026-09-01',
    color: '#fbbf24',
    isArchived: false,
    notes: 'Cuenta principal para pagos de deudas',
    sortOrder: 3,
  },
  {
    id: 'demo-acc-rappi',
    name: 'Rappi (Por cobrar)',
    kind: 'platform_receivable',
    openingBalance: 0,
    openingDate: '2026-09-01',
    color: '#ff7a59',
    isArchived: false,
    notes: 'Saldo generado en la app pendiente de dispersión semanal',
    sortOrder: 4,
  },
]

export const DEMO_DEBTS: Debt[] = [
  {
    id: 'demo-debt-visa',
    name: 'Tarjeta Visa Clásica',
    kind: 'credit_card',
    institution: 'Bancolombia',
    openingBalance: 320_000,
    openingDate: '2026-09-01',
    creditLimit: 2_500_000,
    interestRate: 26.5,
    cutDay: 25,
    dueDay: 10,
    expectedInstallment: 90_000,
    totalInstallments: null,
    status: 'active',
    notes: 'Compras y suscripciones a 1 cuota cuando es posible',
  },
  {
    id: 'demo-debt-libre',
    name: 'Crédito Libre Inversión',
    kind: 'personal_loan',
    institution: 'Banco Caja Social',
    openingBalance: 2_400_000,
    openingDate: '2026-06-01',
    creditLimit: null,
    interestRate: 21.0,
    cutDay: null,
    dueDay: 5,
    expectedInstallment: 185_000,
    totalInstallments: 18,
    status: 'active',
    notes: 'Financiación de la motocicleta',
  },
]

export const DEMO_LOANS: Loan[] = [
  {
    id: 'demo-loan-primo',
    personName: 'Carlos (Primo)',
    startDate: '2026-09-15',
    dueDate: '2026-10-15',
    interestNote: 'Sin interés, compromiso a fin de mes',
    isArchived: false,
    notes: 'Préstamo para trámite de licencia',
  },
]

export const DEMO_RECURRING: RecurringExpense[] = [
  {
    id: 'demo-rec-gamepass',
    name: 'Xbox Game Pass Ultimate',
    amount: 39_900,
    categoryId: getCatId('Suscripciones'),
    frequency: 'monthly',
    anchorDate: '2026-08-18',
    endDate: null,
    paymentAccountId: 'demo-acc-nequi',
    paymentDebtId: null,
    status: 'active',
    notes: 'Cobro recurrente mensual',
  },
  {
    id: 'demo-rec-celular',
    name: 'Plan Móvil y Datos (Tigo)',
    amount: 45_000,
    categoryId: getCatId('Celular y datos'),
    frequency: 'monthly',
    anchorDate: '2026-08-28',
    endDate: null,
    paymentAccountId: 'demo-acc-nequi',
    paymentDebtId: null,
    status: 'active',
    notes: 'Indispensable para trabajar con las apps',
  },
  {
    id: 'demo-rec-internet',
    name: 'Internet Hogar',
    amount: 75_000,
    categoryId: getCatId('Internet hogar'),
    frequency: 'monthly',
    anchorDate: '2026-09-02',
    endDate: null,
    paymentAccountId: 'demo-acc-banco',
    paymentDebtId: null,
    status: 'active',
    notes: 'Fibra óptica hogar',
  },
]

export const DEMO_OCCURRENCES: RecurringOccurrence[] = [
  {
    id: 'demo-occ-1',
    recurringId: 'demo-rec-internet',
    dueDate: '2026-09-02',
    status: 'paid',
    transactionId: 'demo-tx-internet-sep',
  },
  {
    id: 'demo-occ-2',
    recurringId: 'demo-rec-celular',
    dueDate: '2026-09-28',
    status: 'paid',
    transactionId: 'demo-tx-celular-sep',
  },
]

export const DEMO_BUDGETS: Budget[] = [
  {
    id: 'demo-b-gasolina',
    categoryId: getCatId('Gasolina'),
    amount: 220_000,
    basis: 'cut',
  },
  {
    id: 'demo-b-alimentos',
    categoryId: getCatId('Alimentación'),
    amount: 300_000,
    basis: 'calendar_month',
  },
]

export const DEMO_GOALS: Goal[] = [
  {
    id: 'demo-g-mantenimiento',
    name: 'Fondo para Llantas y Kit de Arrastre',
    kind: 'maintenance_fund',
    targetAmount: 450_000,
    targetDate: '2026-11-30',
    accountId: 'demo-acc-banco',
    debtId: null,
    baselineAmount: null,
    status: 'active',
    notes: 'Cambio de llanta trasera y kit de arrastre próximo',
  },
  {
    id: 'demo-g-reducir-deuda',
    name: 'Reducir Crédito de Libre Inversión a $ 2.000.000',
    kind: 'reduce_debt',
    targetAmount: 400_000,
    targetDate: '2026-12-31',
    accountId: null,
    debtId: 'demo-debt-libre',
    baselineAmount: 2_400_000,
    status: 'active',
    notes: 'Abonar a capital con ingresos extraordinarios',
  },
]

export const DEMO_MOTO_LOGS: MotoLog[] = [
  {
    id: 'demo-log-1',
    date: '2026-09-12',
    kind: 'shift',
    categoryId: getCatId('Rappi'),
    hours: 7.5,
    tripsCount: 14,
    km: 68,
    odometerStart: 14200,
    odometerEnd: 14268,
    notes: 'Jornada viernes tarde-noche',
    transactionId: null,
  },
  {
    id: 'demo-log-2',
    date: '2026-09-19',
    kind: 'shift',
    categoryId: getCatId('DiDi Food'),
    hours: 6.0,
    tripsCount: 11,
    km: 54,
    odometerStart: 14350,
    odometerEnd: 14404,
    notes: 'Sábado zona norte',
    transactionId: null,
  },
  {
    id: 'demo-log-3',
    date: '2026-10-02',
    kind: 'shift',
    categoryId: getCatId('Clicoh'),
    hours: 8.0,
    tripsCount: 16,
    km: 72,
    odometerStart: 14510,
    odometerEnd: 14582,
    notes: 'Entregas de paquetería e-commerce',
    transactionId: null,
  },
]

export const DEMO_MOTO_MAINTENANCE: MotoMaintenance[] = [
  {
    id: 'demo-maint-1',
    date: '2026-09-10',
    kind: 'preventive',
    title: 'Cambio de aceite y filtro (Motul 5100)',
    odometer: 14150,
    nextDueDate: '2026-11-10',
    nextDueOdometer: 17150,
    notes: 'Cada 3.000 km religiosamente',
    transactionId: null,
  },
  {
    id: 'demo-maint-2',
    date: '2026-09-28',
    kind: 'preventive',
    title: 'Tensión y lubricación de cadena',
    odometer: 14480,
    nextDueDate: '2026-10-18',
    nextDueOdometer: 15000,
    notes: 'Revisar desgaste de piñones',
    transactionId: null,
  },
]

// Crear transacciones demo balanceadas en el corte actual (11 sep - 10 oct 2026)
function makeDemoTx(
  id: string,
  op: Parameters<typeof buildTransactionDraft>[0],
): Transaction {
  const draft = buildTransactionDraft(op, { categories: DEMO_CATEGORIES })
  return {
    id,
    date: draft.date,
    kind: draft.kind,
    description: draft.description,
    notes: draft.notes,
    tags: draft.tags,
    isMoto: draft.isMoto,
    debtId: draft.debtId,
    loanId: draft.loanId,
    meta: draft.meta as unknown as Record<string, unknown>,
    clientRequestId: `demo-req-${id}`,
    createdAt: `${draft.date}T12:00:00Z`,
    postings: draft.postings,
  }
}

export const DEMO_TRANSACTIONS: Transaction[] = [
  // 1. Ingreso Rappi semana 1 (12 sep)
  makeDemoTx('demo-tx-rappi-1', {
    kind: 'income',
    date: '2026-09-12',
    description: 'Jornada Rappi viernes',
    categoryId: getCatId('Rappi'),
    accountId: 'demo-acc-rappi',
    amount: 145_000,
    commission: 18_000,
    tip: 12_000,
    isMoto: true,
  }),
  // 2. Tanqueada de gasolina (12 sep)
  makeDemoTx('demo-tx-gas-1', {
    kind: 'expense',
    date: '2026-09-12',
    description: 'Gasolina corriente Terpel',
    categoryId: getCatId('Gasolina'),
    amount: 28_000,
    payment: { method: 'account', accountId: 'demo-acc-efectivo' },
    isMoto: true,
  }),
  // 3. Préstamo realizado a primo Carlos (15 sep)
  makeDemoTx('demo-tx-loan-carlos', {
    kind: 'loan_given',
    date: '2026-09-15',
    description: 'Préstamo a Carlos para trámite',
    loanId: 'demo-loan-primo',
    accountId: 'demo-acc-efectivo',
    amount: 150_000,
  }),
  // 4. Dispersión Rappi -> Nequi (16 sep)
  makeDemoTx('demo-tx-transfer-rappi', {
    kind: 'transfer',
    date: '2026-09-16',
    description: 'Dispersión semanal Rappi a Nequi',
    fromAccountId: 'demo-acc-rappi',
    toAccountId: 'demo-acc-nequi',
    amount: 139_000, // 145k - 18k + 12k
  }),
  // 5. Compra con tarjeta de crédito (18 sep)
  makeDemoTx('demo-tx-card-purchase', {
    kind: 'expense',
    date: '2026-09-18',
    description: 'Repuesto maneta de freno y guaya',
    categoryId: getCatId('Repuestos, llantas y aceite'),
    amount: 65_000,
    payment: { method: 'debt', debtId: 'demo-debt-visa' },
    isMoto: true,
  }),
  // 6. Ingreso DiDi Food (19 sep)
  makeDemoTx('demo-tx-didi-1', {
    kind: 'income',
    date: '2026-09-19',
    description: 'Jornada DiDi fin de semana',
    categoryId: getCatId('DiDi Food'),
    accountId: 'demo-acc-nequi',
    amount: 110_000,
    commission: 12_000,
    tip: 6_000,
    isMoto: true,
  }),
  // 7. Viaje particular para familiar (23 sep)
  makeDemoTx('demo-tx-viaje-part', {
    kind: 'income',
    date: '2026-09-23',
    description: 'Encomienda particular familiar',
    categoryId: getCatId('Viajes particulares'),
    accountId: 'demo-acc-efectivo',
    amount: 45_000,
    isMoto: true,
  }),
  // 8. Pago recurrente celular (28 sep)
  makeDemoTx('demo-tx-celular-sep', {
    kind: 'expense',
    date: '2026-09-28',
    description: 'Plan móvil Tigo',
    categoryId: getCatId('Celular y datos'),
    amount: 45_000,
    payment: { method: 'account', accountId: 'demo-acc-nequi' },
  }),
  // 9. Devolución parcial préstamo Carlos (30 sep)
  makeDemoTx('demo-tx-loan-repay', {
    kind: 'loan_repayment',
    date: '2026-09-30',
    description: 'Abono parcial de Carlos',
    loanId: 'demo-loan-primo',
    accountId: 'demo-acc-nequi',
    principal: 50_000,
  }),
  // 10. Jornada Clicoh entregas (02 oct)
  makeDemoTx('demo-tx-clicoh-1', {
    kind: 'income',
    date: '2026-10-02',
    description: 'Ruta Clicoh 16 entregas',
    categoryId: getCatId('Clicoh'),
    accountId: 'demo-acc-banco',
    amount: 160_000,
    commission: 15_000,
    isMoto: true,
  }),
  // 11. Pago cuota crédito libre inversión (05 oct)
  makeDemoTx('demo-tx-cuota-credito', {
    kind: 'debt_payment',
    date: '2026-10-05',
    description: 'Cuota Crédito Libre Inversión',
    debtId: 'demo-debt-libre',
    accountId: 'demo-acc-banco',
    principal: 145_000,
    interest: 40_000,
  }),
  // 12. Pago tarjeta de crédito (08 oct)
  makeDemoTx('demo-tx-pago-tarjeta', {
    kind: 'debt_payment',
    date: '2026-10-08',
    description: 'Pago total Tarjeta Visa',
    debtId: 'demo-debt-visa',
    accountId: 'demo-acc-banco',
    principal: 65_000,
  }),
  // 13. Tanqueada de gasolina (09 oct)
  makeDemoTx('demo-tx-gas-2', {
    kind: 'expense',
    date: '2026-10-09',
    description: 'Gasolina corriente Primax',
    categoryId: getCatId('Gasolina'),
    amount: 30_000,
    payment: { method: 'account', accountId: 'demo-acc-efectivo' },
    isMoto: true,
  }),
]
