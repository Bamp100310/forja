import { isSupabaseConfigured, supabase } from './supabase'
import {
  DEMO_ACCOUNTS,
  DEMO_BUDGETS,
  DEMO_CATEGORIES,
  DEMO_DEBTS,
  DEMO_GOALS,
  DEMO_LOANS,
  DEMO_MOTO_LOGS,
  DEMO_MOTO_MAINTENANCE,
  DEMO_PROFILE,
  DEMO_RECURRING,
  DEMO_OCCURRENCES,
  DEMO_TRANSACTIONS,
} from './demoData'
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
import type { TransactionDraft } from '../domain/ledger/operations'

const LOCAL_STORAGE_KEY = 'forja_persistence_v2'

interface StoreState {
  profile: Profile
  accounts: Account[]
  categories: Category[]
  debts: Debt[]
  loans: Loan[]
  transactions: Transaction[]
  recurring: RecurringExpense[]
  occurrences: RecurringOccurrence[]
  motoLogs: MotoLog[]
  motoMaintenance: MotoMaintenance[]
  budgets: Budget[]
  goals: Goal[]
}

// Almacén reactivo local con persistencia en localStorage para desarrollo/offline/demo
class LocalStore {
  profile: Profile
  accounts: Account[]
  categories: Category[]
  debts: Debt[]
  loans: Loan[]
  transactions: Transaction[]
  recurring: RecurringExpense[]
  occurrences: RecurringOccurrence[]
  motoLogs: MotoLog[]
  motoMaintenance: MotoMaintenance[]
  budgets: Budget[]
  goals: Goal[]

  constructor() {
    const initial = this.loadFromStorage()
    this.profile = initial.profile
    this.accounts = initial.accounts
    this.categories = initial.categories
    this.debts = initial.debts
    this.loans = initial.loans
    this.transactions = initial.transactions
    this.recurring = initial.recurring
    this.occurrences = initial.occurrences
    this.motoLogs = initial.motoLogs
    this.motoMaintenance = initial.motoMaintenance
    this.budgets = initial.budgets
    this.goals = initial.goals
  }

  private loadFromStorage(): StoreState {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<StoreState>
          return {
            profile: parsed.profile ?? { ...DEMO_PROFILE },
            accounts: parsed.accounts ?? [...DEMO_ACCOUNTS],
            categories: parsed.categories ?? [...DEMO_CATEGORIES],
            debts: parsed.debts ?? [...DEMO_DEBTS],
            loans: parsed.loans ?? [...DEMO_LOANS],
            transactions: parsed.transactions ?? [...DEMO_TRANSACTIONS],
            recurring: parsed.recurring ?? [...DEMO_RECURRING],
            occurrences: parsed.occurrences ?? [...DEMO_OCCURRENCES],
            motoLogs: parsed.motoLogs ?? [...DEMO_MOTO_LOGS],
            motoMaintenance: parsed.motoMaintenance ?? [...DEMO_MOTO_MAINTENANCE],
            budgets: parsed.budgets ?? [...DEMO_BUDGETS],
            goals: parsed.goals ?? [...DEMO_GOALS],
          }
        }
      } catch (err) {
        console.warn('Error leyendo localStorage de FORJA, usando datos base:', err)
      }
    }
    return {
      profile: { ...DEMO_PROFILE },
      accounts: [...DEMO_ACCOUNTS],
      categories: [...DEMO_CATEGORIES],
      debts: [...DEMO_DEBTS],
      loans: [...DEMO_LOANS],
      transactions: [...DEMO_TRANSACTIONS],
      recurring: [...DEMO_RECURRING],
      occurrences: [...DEMO_OCCURRENCES],
      motoLogs: [...DEMO_MOTO_LOGS],
      motoMaintenance: [...DEMO_MOTO_MAINTENANCE],
      budgets: [...DEMO_BUDGETS],
      goals: [...DEMO_GOALS],
    }
  }

  reload() {
    const fresh = this.loadFromStorage()
    this.profile = fresh.profile
    this.accounts = fresh.accounts
    this.categories = fresh.categories
    this.debts = fresh.debts
    this.loans = fresh.loans
    this.transactions = fresh.transactions
    this.recurring = fresh.recurring
    this.occurrences = fresh.occurrences
    this.motoLogs = fresh.motoLogs
    this.motoMaintenance = fresh.motoMaintenance
    this.budgets = fresh.budgets
    this.goals = fresh.goals
  }

  persist() {
    if (typeof window !== 'undefined') {
      try {
        const payload: StoreState = {
          profile: this.profile,
          accounts: this.accounts,
          categories: this.categories,
          debts: this.debts,
          loans: this.loans,
          transactions: this.transactions,
          recurring: this.recurring,
          occurrences: this.occurrences,
          motoLogs: this.motoLogs,
          motoMaintenance: this.motoMaintenance,
          budgets: this.budgets,
          goals: this.goals,
        }
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload))
      } catch (err) {
        console.error('Error guardando en localStorage de FORJA:', err)
      }
    }
  }

  resetToDefaults() {
    this.profile = { ...DEMO_PROFILE }
    this.accounts = [...DEMO_ACCOUNTS]
    this.categories = [...DEMO_CATEGORIES]
    this.debts = [...DEMO_DEBTS]
    this.loans = [...DEMO_LOANS]
    this.transactions = [...DEMO_TRANSACTIONS]
    this.recurring = [...DEMO_RECURRING]
    this.occurrences = [...DEMO_OCCURRENCES]
    this.motoLogs = [...DEMO_MOTO_LOGS]
    this.motoMaintenance = [...DEMO_MOTO_MAINTENANCE]
    this.budgets = [...DEMO_BUDGETS]
    this.goals = [...DEMO_GOALS]
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LOCAL_STORAGE_KEY)
    }
    this.persist()
  }
}

export const inMemoryStore = new LocalStore()

// Flag para forzar modo demo o usar Supabase si está disponible y autenticado
let forceDemoMode = !isSupabaseConfigured

export function isUsingDemoMode(): boolean {
  return forceDemoMode || !isSupabaseConfigured
}

export function setDemoMode(active: boolean) {
  forceDemoMode = active
}

// ----------------------------------------------------------------------------
// Repositorio central de datos con ciclo CRUD íntegro y sincronización
// ----------------------------------------------------------------------------
export const forjaApi = {
  isConfigured: () => isSupabaseConfigured,
  isDemo: () => isUsingDemoMode(),
  setDemoMode,
  resetToDefaults: () => inMemoryStore.resetToDefaults(),
  reload: () => inMemoryStore.reload(),

  async getProfile(): Promise<Profile> {
    if (isUsingDemoMode() || !supabase) return inMemoryStore.profile
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return inMemoryStore.profile
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (error || !data) return { id: user.id, displayName: user.email?.split('@')[0] ?? 'Usuario', motoName: null, motoInitialOdometer: null }
    return {
      id: data.id,
      displayName: data.display_name,
      motoName: data.moto_name,
      motoInitialOdometer: data.moto_initial_odometer ? Number(data.moto_initial_odometer) : null,
    }
  },

  async updateProfile(updates: Partial<Profile>): Promise<void> {
    if (isUsingDemoMode() || !supabase) {
      Object.assign(inMemoryStore.profile, updates)
      inMemoryStore.persist()
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      display_name: updates.displayName,
      moto_name: updates.motoName,
      moto_initial_odometer: updates.motoInitialOdometer,
      updated_at: new Date().toISOString(),
    })
    if (error) throw error
  },

  async getAccounts(): Promise<Account[]> {
    if (isUsingDemoMode() || !supabase) return [...inMemoryStore.accounts].sort((a, b) => a.sortOrder - b.sortOrder)
    const { data, error } = await supabase.from('accounts').select('*').order('sort_order', { ascending: true })
    if (error) throw error
    return data.map((d) => ({
      id: d.id,
      name: d.name,
      kind: d.kind,
      openingBalance: Number(d.opening_balance),
      openingDate: d.opening_date,
      color: d.color,
      isArchived: d.is_archived,
      notes: d.notes,
      sortOrder: d.sort_order,
    }))
  },

  async saveAccount(account: Omit<Account, 'id'> & { id?: string }): Promise<string> {
    if (isUsingDemoMode() || !supabase) {
      const id = account.id || `acc-${Date.now()}`
      const existingIdx = inMemoryStore.accounts.findIndex((a) => a.id === id)
      const item: Account = { ...account, id }
      if (existingIdx >= 0) inMemoryStore.accounts[existingIdx] = item
      else inMemoryStore.accounts.push(item)
      inMemoryStore.persist()
      return id
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')
    const payload = {
      ...(account.id ? { id: account.id } : {}),
      user_id: user.id,
      name: account.name,
      kind: account.kind,
      opening_balance: account.openingBalance,
      opening_date: account.openingDate,
      color: account.color,
      is_archived: account.isArchived,
      notes: account.notes,
      sort_order: account.sortOrder,
    }
    const { data, error } = await supabase.from('accounts').upsert(payload).select('id').single()
    if (error) throw error
    return data.id
  },

  async deleteAccount(id: string): Promise<void> {
    if (isUsingDemoMode() || !supabase) {
      const isUsed = inMemoryStore.transactions.some((t) =>
        t.postings.some((p) => p.targetType === 'account' && p.targetId === id)
      )
      if (isUsed) {
        throw new Error('No se puede eliminar la bóveda porque tiene movimientos contables registrados. Archívala para preservarla.')
      }
      inMemoryStore.accounts = inMemoryStore.accounts.filter((a) => a.id !== id)
      inMemoryStore.persist()
      return
    }
    const { error } = await supabase.from('accounts').delete().eq('id', id)
    if (error) throw error
  },

  async getCategories(): Promise<Category[]> {
    if (isUsingDemoMode() || !supabase) return [...inMemoryStore.categories].sort((a, b) => a.sortOrder - b.sortOrder)
    const { data, error } = await supabase.from('categories').select('*').order('sort_order', { ascending: true })
    if (error) throw error
    return data.map((d) => ({
      id: d.id,
      kind: d.kind,
      name: d.name,
      icon: d.icon,
      color: d.color,
      isMoto: d.is_moto,
      systemKey: d.system_key,
      isArchived: d.is_archived,
      sortOrder: d.sort_order,
    }))
  },

  async saveCategory(cat: Omit<Category, 'id'> & { id?: string }): Promise<string> {
    if (isUsingDemoMode() || !supabase) {
      const id = cat.id || `cat-${Date.now()}`
      const existingIdx = inMemoryStore.categories.findIndex((c) => c.id === id)
      const item: Category = { ...cat, id }
      if (existingIdx >= 0) inMemoryStore.categories[existingIdx] = item
      else inMemoryStore.categories.push(item)
      inMemoryStore.persist()
      return id
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')
    const payload = {
      ...(cat.id ? { id: cat.id } : {}),
      user_id: user.id,
      kind: cat.kind,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      is_moto: cat.isMoto,
      system_key: cat.systemKey,
      is_archived: cat.isArchived,
      sort_order: cat.sortOrder,
    }
    const { data, error } = await supabase.from('categories').upsert(payload).select('id').single()
    if (error) throw error
    return data.id
  },

  async deleteCategory(id: string): Promise<void> {
    if (isUsingDemoMode() || !supabase) {
      const cat = inMemoryStore.categories.find((c) => c.id === id)
      if (cat?.systemKey) {
        throw new Error('Las categorías del sistema no pueden eliminarse.')
      }
      const isUsed = inMemoryStore.transactions.some((t) =>
        t.postings.some((p) => p.targetType === 'category' && p.targetId === id)
      )
      if (isUsed) {
        throw new Error('No se puede eliminar la categoría porque está en uso en movimientos contables.')
      }
      inMemoryStore.categories = inMemoryStore.categories.filter((c) => c.id !== id)
      inMemoryStore.persist()
      return
    }
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) throw error
  },

  async getDebts(): Promise<Debt[]> {
    if (isUsingDemoMode() || !supabase) return [...inMemoryStore.debts]
    const { data, error } = await supabase.from('debts').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data.map((d) => ({
      id: d.id,
      name: d.name,
      kind: d.kind,
      institution: d.institution,
      openingBalance: Number(d.opening_balance),
      openingDate: d.opening_date,
      creditLimit: d.credit_limit ? Number(d.credit_limit) : null,
      interestRate: d.interest_rate ? Number(d.interest_rate) : null,
      cutDay: d.cut_day,
      dueDay: d.due_day,
      expectedInstallment: d.expected_installment ? Number(d.expected_installment) : null,
      totalInstallments: d.total_installments,
      status: d.status,
      notes: d.notes,
    }))
  },

  async saveDebt(debt: Omit<Debt, 'id'> & { id?: string }): Promise<string> {
    if (isUsingDemoMode() || !supabase) {
      const id = debt.id || `debt-${Date.now()}`
      const existingIdx = inMemoryStore.debts.findIndex((d) => d.id === id)
      const item: Debt = { ...debt, id }
      if (existingIdx >= 0) inMemoryStore.debts[existingIdx] = item
      else inMemoryStore.debts.push(item)
      inMemoryStore.persist()
      return id
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')
    const payload = {
      ...(debt.id ? { id: debt.id } : {}),
      user_id: user.id,
      name: debt.name,
      kind: debt.kind,
      institution: debt.institution,
      opening_balance: debt.openingBalance,
      opening_date: debt.openingDate,
      credit_limit: debt.creditLimit,
      interest_rate: debt.interestRate,
      cut_day: debt.cutDay,
      due_day: debt.dueDay,
      expected_installment: debt.expectedInstallment,
      total_installments: debt.totalInstallments,
      status: debt.status,
      notes: debt.notes,
    }
    const { data, error } = await supabase.from('debts').upsert(payload).select('id').single()
    if (error) throw error
    return data.id
  },

  async deleteDebt(id: string): Promise<void> {
    if (isUsingDemoMode() || !supabase) {
      const isUsed = inMemoryStore.transactions.some((t) =>
        t.debtId === id || t.postings.some((p) => p.targetType === 'debt' && p.targetId === id)
      )
      if (isUsed) {
        throw new Error('No se puede eliminar la obligación porque tiene abonos o transacciones registradas. Archívala o liquídala.')
      }
      inMemoryStore.debts = inMemoryStore.debts.filter((d) => d.id !== id)
      inMemoryStore.persist()
      return
    }
    const { error } = await supabase.from('debts').delete().eq('id', id)
    if (error) throw error
  },

  async getLoans(): Promise<Loan[]> {
    if (isUsingDemoMode() || !supabase) return [...inMemoryStore.loans]
    const { data, error } = await supabase.from('loans').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data.map((d) => ({
      id: d.id,
      personName: d.person_name,
      startDate: d.start_date,
      dueDate: d.due_date,
      interestNote: d.interest_note,
      isArchived: d.is_archived,
      notes: d.notes,
    }))
  },

  async saveLoan(loan: Omit<Loan, 'id'> & { id?: string }): Promise<string> {
    if (isUsingDemoMode() || !supabase) {
      const id = loan.id || `loan-${Date.now()}`
      const existingIdx = inMemoryStore.loans.findIndex((l) => l.id === id)
      const item: Loan = { ...loan, id }
      if (existingIdx >= 0) inMemoryStore.loans[existingIdx] = item
      else inMemoryStore.loans.push(item)
      inMemoryStore.persist()
      return id
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')
    const payload = {
      ...(loan.id ? { id: loan.id } : {}),
      user_id: user.id,
      person_name: loan.personName,
      start_date: loan.startDate,
      due_date: loan.dueDate,
      interest_note: loan.interestNote,
      is_archived: loan.isArchived,
      notes: loan.notes,
    }
    const { data, error } = await supabase.from('loans').upsert(payload).select('id').single()
    if (error) throw error
    return data.id
  },

  async deleteLoan(id: string): Promise<void> {
    if (isUsingDemoMode() || !supabase) {
      const isUsed = inMemoryStore.transactions.some((t) =>
        t.loanId === id || t.postings.some((p) => p.targetType === 'loan' && p.targetId === id)
      )
      if (isUsed) {
        throw new Error('No se puede eliminar el préstamo porque tiene cobros o movimientos contables asociados.')
      }
      inMemoryStore.loans = inMemoryStore.loans.filter((l) => l.id !== id)
      inMemoryStore.persist()
      return
    }
    const { error } = await supabase.from('loans').delete().eq('id', id)
    if (error) throw error
  },

  async getTransactions(): Promise<Transaction[]> {
    if (isUsingDemoMode() || !supabase) {
      return [...inMemoryStore.transactions].sort((a, b) =>
        a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)
      )
    }
    const { data, error } = await supabase
      .from('transactions')
      .select('*, postings(*)')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) throw error
    return data.map((d) => ({
      id: d.id,
      date: d.date,
      kind: d.kind,
      description: d.description,
      notes: d.notes,
      tags: d.tags ?? [],
      isMoto: d.is_moto,
      debtId: d.debt_id,
      loanId: d.loan_id,
      meta: (d.meta ?? {}) as Record<string, unknown>,
      clientRequestId: d.client_request_id,
      createdAt: d.created_at,
      postings: (d.postings ?? []).map((p: Record<string, unknown>) => ({
        targetType: p.target_type as Transaction['postings'][0]['targetType'],
        targetId: p.target_id as string | null,
        amount: Number(p.amount),
        role: (p.role as Transaction['postings'][0]['role']) ?? null,
      })),
    }))
  },

  async saveTransaction(draft: TransactionDraft, existingId?: string): Promise<{ id: string }> {
    const clientRequestId = `req-${draft.date}-${draft.kind}-${Date.now()}`

    if (isUsingDemoMode() || !supabase) {
      const id = existingId || `tx-${Date.now()}`
      if (draft.newLoan) {
        await this.saveLoan({
          id: draft.newLoan.id,
          personName: draft.newLoan.personName,
          startDate: draft.date,
          dueDate: draft.newLoan.dueDate,
          interestNote: draft.newLoan.interestNote,
          isArchived: false,
          notes: draft.newLoan.notes,
        })
      }
      const tx: Transaction = {
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
        clientRequestId,
        createdAt: new Date().toISOString(),
        postings: draft.postings,
      }
      const existingIdx = inMemoryStore.transactions.findIndex((t) => t.id === id)
      if (existingIdx >= 0) inMemoryStore.transactions[existingIdx] = tx
      else inMemoryStore.transactions.unshift(tx)
      inMemoryStore.persist()
      return { id }
    }

    const txPayload = {
      ...(existingId ? { id: existingId } : {}),
      date: draft.date,
      kind: draft.kind,
      description: draft.description,
      notes: draft.notes,
      tags: draft.tags,
      is_moto: draft.isMoto,
      debt_id: draft.debtId,
      loan_id: draft.loanId,
      meta: draft.meta,
      client_request_id: clientRequestId,
    }

    const postingsPayload = draft.postings.map((p) => ({
      target_type: p.targetType,
      target_id: p.targetId,
      amount: p.amount,
      role: p.role,
    }))

    const newLoanPayload = draft.newLoan
      ? {
          id: draft.newLoan.id,
          person_name: draft.newLoan.personName,
          start_date: draft.date,
          due_date: draft.newLoan.dueDate,
          interest_note: draft.newLoan.interestNote,
          notes: draft.newLoan.notes,
        }
      : null

    const { data, error } = await supabase.rpc('save_transaction_atomic', {
      p_tx: txPayload,
      p_postings: postingsPayload,
      p_new_loan: newLoanPayload,
    })
    if (error) throw error
    return { id: (data as { id: string }).id }
  },

  async deleteTransaction(id: string): Promise<void> {
    if (isUsingDemoMode() || !supabase) {
      const idx = inMemoryStore.transactions.findIndex((t) => t.id === id)
      if (idx === -1) {
        throw new Error(`El movimiento «${id}» no existe o ya fue eliminado.`)
      }
      const tx = inMemoryStore.transactions[idx]

      // 1. Limpiar/desvincular ocurrencias de gastos recurrentes vinculadas a esta transacción
      inMemoryStore.occurrences = inMemoryStore.occurrences.filter((o) => o.transactionId !== id)

      // 2. Desvincular jornadas de moto asociadas
      for (const log of inMemoryStore.motoLogs) {
        if (log.transactionId === id) {
          log.transactionId = null
        }
      }

      // 3. Desvincular mantenimientos de moto asociados
      for (const maint of inMemoryStore.motoMaintenance) {
        if (maint.transactionId === id) {
          maint.transactionId = null
        }
      }

      // 4. Si fue un préstamo originado con esta transacción sin otros movimientos registrados, removerlo
      if (tx.kind === 'loan_given' && tx.loanId) {
        const otherTxs = inMemoryStore.transactions.filter(
          (t) => t.id !== id && (t.loanId === tx.loanId || t.postings.some((p) => p.targetType === 'loan' && p.targetId === tx.loanId)),
        )
        if (otherTxs.length === 0) {
          inMemoryStore.loans = inMemoryStore.loans.filter((l) => l.id !== tx.loanId)
        }
      }

      // 5. Eliminar la transacción
      inMemoryStore.transactions.splice(idx, 1)
      inMemoryStore.persist()
      return
    }
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) throw error
  },

  async getRecurring(): Promise<RecurringExpense[]> {
    if (isUsingDemoMode() || !supabase) return [...inMemoryStore.recurring]
    const { data, error } = await supabase.from('recurring_expenses').select('*')
    if (error) throw error
    return data.map((d) => ({
      id: d.id,
      name: d.name,
      amount: Number(d.amount),
      categoryId: d.category_id,
      frequency: d.frequency,
      anchorDate: d.anchor_date,
      endDate: d.end_date,
      paymentAccountId: d.payment_account_id,
      paymentDebtId: d.payment_debt_id,
      status: d.status,
      notes: d.notes,
    }))
  },

  async saveRecurring(rec: Omit<RecurringExpense, 'id'> & { id?: string }): Promise<string> {
    if (isUsingDemoMode() || !supabase) {
      const id = rec.id || `rec-${Date.now()}`
      const existingIdx = inMemoryStore.recurring.findIndex((r) => r.id === id)
      const item: RecurringExpense = { ...rec, id }
      if (existingIdx >= 0) inMemoryStore.recurring[existingIdx] = item
      else inMemoryStore.recurring.push(item)
      inMemoryStore.persist()
      return id
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')
    const payload = {
      ...(rec.id ? { id: rec.id } : {}),
      user_id: user.id,
      name: rec.name,
      amount: rec.amount,
      category_id: rec.categoryId,
      frequency: rec.frequency,
      anchor_date: rec.anchorDate,
      end_date: rec.endDate,
      payment_account_id: rec.paymentAccountId,
      payment_debt_id: rec.paymentDebtId,
      status: rec.status,
      notes: rec.notes,
    }
    const { data, error } = await supabase.from('recurring_expenses').upsert(payload).select('id').single()
    if (error) throw error
    return data.id
  },

  async deleteRecurring(id: string): Promise<void> {
    if (isUsingDemoMode() || !supabase) {
      inMemoryStore.recurring = inMemoryStore.recurring.filter((r) => r.id !== id)
      inMemoryStore.occurrences = inMemoryStore.occurrences.filter((o) => o.recurringId !== id)
      inMemoryStore.persist()
      return
    }
    const { error } = await supabase.from('recurring_expenses').delete().eq('id', id)
    if (error) throw error
  },

  async getOccurrences(): Promise<RecurringOccurrence[]> {
    if (isUsingDemoMode() || !supabase) return [...inMemoryStore.occurrences]
    const { data, error } = await supabase.from('recurring_occurrences').select('*')
    if (error) throw error
    return data.map((d) => ({
      id: d.id,
      recurringId: d.recurring_id,
      dueDate: d.due_date,
      status: d.status,
      transactionId: d.transaction_id,
    }))
  },

  async markOccurrence(occurrence: Omit<RecurringOccurrence, 'id'>): Promise<void> {
    if (isUsingDemoMode() || !supabase) {
      const idx = inMemoryStore.occurrences.findIndex(
        (o) => o.recurringId === occurrence.recurringId && o.dueDate === occurrence.dueDate,
      )
      const item: RecurringOccurrence = { id: `occ-${Date.now()}`, ...occurrence }
      if (idx >= 0) inMemoryStore.occurrences[idx] = item
      else inMemoryStore.occurrences.push(item)
      inMemoryStore.persist()
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')
    const { error } = await supabase.from('recurring_occurrences').upsert({
      user_id: user.id,
      recurring_id: occurrence.recurringId,
      due_date: occurrence.dueDate,
      status: occurrence.status,
      transaction_id: occurrence.transactionId,
    })
    if (error) throw error
  },

  async getMotoLogs(): Promise<MotoLog[]> {
    if (isUsingDemoMode() || !supabase) return [...inMemoryStore.motoLogs]
    const { data, error } = await supabase.from('moto_logs').select('*').order('date', { ascending: false })
    if (error) throw error
    return data.map((d) => ({
      id: d.id,
      date: d.date,
      kind: d.kind,
      categoryId: d.category_id,
      hours: d.hours ? Number(d.hours) : null,
      tripsCount: d.trips_count,
      km: d.km ? Number(d.km) : null,
      odometerStart: d.odometer_start ? Number(d.odometer_start) : null,
      odometerEnd: d.odometer_end ? Number(d.odometer_end) : null,
      notes: d.notes,
      transactionId: d.transaction_id,
    }))
  },

  async saveMotoLog(log: Omit<MotoLog, 'id'> & { id?: string }): Promise<string> {
    if (isUsingDemoMode() || !supabase) {
      const id = log.id || `mlog-${Date.now()}`
      const existingIdx = inMemoryStore.motoLogs.findIndex((m) => m.id === id)
      const item: MotoLog = { ...log, id }
      if (existingIdx >= 0) inMemoryStore.motoLogs[existingIdx] = item
      else inMemoryStore.motoLogs.unshift(item)
      inMemoryStore.persist()
      return id
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')
    const payload = {
      ...(log.id ? { id: log.id } : {}),
      user_id: user.id,
      date: log.date,
      kind: log.kind,
      category_id: log.categoryId,
      hours: log.hours,
      trips_count: log.tripsCount,
      km: log.km,
      odometer_start: log.odometerStart,
      odometer_end: log.odometerEnd,
      notes: log.notes,
      transaction_id: log.transactionId,
    }
    const { data, error } = await supabase.from('moto_logs').upsert(payload).select('id').single()
    if (error) throw error
    return data.id
  },

  async deleteMotoLog(id: string): Promise<void> {
    if (isUsingDemoMode() || !supabase) {
      inMemoryStore.motoLogs = inMemoryStore.motoLogs.filter((m) => m.id !== id)
      inMemoryStore.persist()
      return
    }
    const { error } = await supabase.from('moto_logs').delete().eq('id', id)
    if (error) throw error
  },

  async getMotoMaintenance(): Promise<MotoMaintenance[]> {
    if (isUsingDemoMode() || !supabase) return [...inMemoryStore.motoMaintenance]
    const { data, error } = await supabase.from('moto_maintenance').select('*').order('date', { ascending: false })
    if (error) throw error
    return data.map((d) => ({
      id: d.id,
      date: d.date,
      kind: d.kind,
      title: d.title,
      odometer: d.odometer ? Number(d.odometer) : null,
      nextDueDate: d.next_due_date,
      nextDueOdometer: d.next_due_odometer ? Number(d.next_due_odometer) : null,
      notes: d.notes,
      transactionId: d.transaction_id,
    }))
  },

  async saveMotoMaintenance(maint: Omit<MotoMaintenance, 'id'> & { id?: string }): Promise<string> {
    if (isUsingDemoMode() || !supabase) {
      const id = maint.id || `mmaint-${Date.now()}`
      const existingIdx = inMemoryStore.motoMaintenance.findIndex((m) => m.id === id)
      const item: MotoMaintenance = { ...maint, id }
      if (existingIdx >= 0) inMemoryStore.motoMaintenance[existingIdx] = item
      else inMemoryStore.motoMaintenance.unshift(item)
      inMemoryStore.persist()
      return id
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')
    const payload = {
      ...(maint.id ? { id: maint.id } : {}),
      user_id: user.id,
      date: maint.date,
      kind: maint.kind,
      title: maint.title,
      odometer: maint.odometer,
      next_due_date: maint.nextDueDate,
      next_due_odometer: maint.nextDueOdometer,
      notes: maint.notes,
      transaction_id: maint.transactionId,
    }
    const { data, error } = await supabase.from('moto_maintenance').upsert(payload).select('id').single()
    if (error) throw error
    return data.id
  },

  async deleteMotoMaintenance(id: string): Promise<void> {
    if (isUsingDemoMode() || !supabase) {
      inMemoryStore.motoMaintenance = inMemoryStore.motoMaintenance.filter((m) => m.id !== id)
      inMemoryStore.persist()
      return
    }
    const { error } = await supabase.from('moto_maintenance').delete().eq('id', id)
    if (error) throw error
  },

  async getBudgets(): Promise<Budget[]> {
    if (isUsingDemoMode() || !supabase) return [...inMemoryStore.budgets]
    const { data, error } = await supabase.from('budgets').select('*')
    if (error) throw error
    return data.map((d) => ({
      id: d.id,
      categoryId: d.category_id,
      amount: Number(d.amount),
      basis: d.basis,
    }))
  },

  async saveBudget(budget: Omit<Budget, 'id'> & { id?: string }): Promise<string> {
    if (isUsingDemoMode() || !supabase) {
      const id = budget.id || `bgt-${Date.now()}`
      const existingIdx = inMemoryStore.budgets.findIndex((b) => b.categoryId === budget.categoryId && b.basis === budget.basis)
      const item: Budget = { ...budget, id }
      if (existingIdx >= 0) inMemoryStore.budgets[existingIdx] = item
      else inMemoryStore.budgets.push(item)
      inMemoryStore.persist()
      return id
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')
    const payload = {
      ...(budget.id ? { id: budget.id } : {}),
      user_id: user.id,
      category_id: budget.categoryId,
      amount: budget.amount,
      basis: budget.basis,
    }
    const { data, error } = await supabase.from('budgets').upsert(payload).select('id').single()
    if (error) throw error
    return data.id
  },

  async deleteBudget(id: string): Promise<void> {
    if (isUsingDemoMode() || !supabase) {
      inMemoryStore.budgets = inMemoryStore.budgets.filter((b) => b.id !== id)
      inMemoryStore.persist()
      return
    }
    const { error } = await supabase.from('budgets').delete().eq('id', id)
    if (error) throw error
  },

  async getGoals(): Promise<Goal[]> {
    if (isUsingDemoMode() || !supabase) return [...inMemoryStore.goals]
    const { data, error } = await supabase.from('goals').select('*')
    if (error) throw error
    return data.map((d) => ({
      id: d.id,
      name: d.name,
      kind: d.kind,
      targetAmount: Number(d.target_amount),
      targetDate: d.target_date,
      accountId: d.account_id,
      debtId: d.debt_id,
      baselineAmount: d.baseline_amount ? Number(d.baseline_amount) : null,
      status: d.status,
      notes: d.notes,
    }))
  },

  async saveGoal(goal: Omit<Goal, 'id'> & { id?: string }): Promise<string> {
    if (isUsingDemoMode() || !supabase) {
      const id = goal.id || `goal-${Date.now()}`
      const existingIdx = inMemoryStore.goals.findIndex((g) => g.id === id)
      const item: Goal = { ...goal, id }
      if (existingIdx >= 0) inMemoryStore.goals[existingIdx] = item
      else inMemoryStore.goals.push(item)
      inMemoryStore.persist()
      return id
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')
    const payload = {
      ...(goal.id ? { id: goal.id } : {}),
      user_id: user.id,
      name: goal.name,
      kind: goal.kind,
      target_amount: goal.targetAmount,
      target_date: goal.targetDate,
      account_id: goal.accountId,
      debt_id: goal.debtId,
      baseline_amount: goal.baselineAmount,
      status: goal.status,
      notes: goal.notes,
    }
    const { data, error } = await supabase.from('goals').upsert(payload).select('id').single()
    if (error) throw error
    return data.id
  },

  async deleteGoal(id: string): Promise<void> {
    if (isUsingDemoMode() || !supabase) {
      inMemoryStore.goals = inMemoryStore.goals.filter((g) => g.id !== id)
      inMemoryStore.persist()
      return
    }
    const { error } = await supabase.from('goals').delete().eq('id', id)
    if (error) throw error
  },
}
