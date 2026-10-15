import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react'
import { getCurrentPeriod, getPeriodById, type CutPeriod, getNextPeriod, getPreviousPeriod } from '../domain/period'
import { todayInBogota } from '../domain/dates'
import {
  buildLedgerIndex,
  computeBalances,
  summarizeTransactions,
  totalsFromTransactions,
  type Balances,
  type LedgerIndex,
  type PeriodSummary,
} from '../domain/ledger/aggregate'
import { forjaApi } from '../services/api'
import { isSupabaseConfigured, supabase } from '../services/supabase'
import { AuthContext } from './AuthContext'
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
  TransactionKind,
  UserPreferences,
  IncomeSchedule,
} from '../domain/types'
import {
  type ModuleId,
  isModuleEnabled,
  canDisableModule,
} from '../domain/modules'
import { DEFAULT_USER_PREFERENCES } from '../services/api'
import type { TransactionDraft } from '../domain/ledger/operations'

export interface QuickModalPrefill {
  collectionSource?: 'platform' | 'loan'
  fromAccountId?: string
  toAccountId?: string
  accountId?: string
  amount?: number
  description?: string
  categoryId?: string
  debtId?: string
  loanId?: string
  isMoto?: boolean
  notes?: string
  date?: string
  payrollScheduleId?: string
  expectedPaydayDate?: string
}

export interface ForjaContextType {
  // Estado del corte actual y navegación
  period: CutPeriod
  setPeriodId: (id: string) => void
  goToNextPeriod: () => void
  goToPreviousPeriod: () => void
  resetToCurrentPeriod: () => void
  today: string

  // Datos del libro y entidades
  profile: Profile | null
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

  // Agregados calculados
  index: LedgerIndex
  balances: Balances
  summary: PeriodSummary

  // Estado de carga y sincronización
  isLoading: boolean
  isSyncing: boolean
  error: string | null
  isDemoMode: boolean
  toggleDemoMode: () => void
  resetFactoryData: () => Promise<void>

  // Acciones / mutaciones CRUD completas
  refreshData: () => Promise<void>
  saveTransaction: (draft: TransactionDraft, existingId?: string, existingClientRequestId?: string) => Promise<{ id: string }>
  deleteTransaction: (id: string) => Promise<void>
  saveAccount: (account: Omit<Account, 'id'> & { id?: string }) => Promise<string>
  deleteAccount: (id: string) => Promise<void>
  saveDebt: (debt: Omit<Debt, 'id'> & { id?: string }) => Promise<string>
  deleteDebt: (id: string) => Promise<void>
  saveLoan: (loan: Omit<Loan, 'id'> & { id?: string }) => Promise<string>
  deleteLoan: (id: string) => Promise<void>
  saveCategory: (cat: Omit<Category, 'id'> & { id?: string }) => Promise<string>
  deleteCategory: (id: string) => Promise<void>
  saveRecurring: (rec: Omit<RecurringExpense, 'id'> & { id?: string }) => Promise<string>
  deleteRecurring: (id: string) => Promise<void>
  markOccurrence: (occurrence: Omit<RecurringOccurrence, 'id'>) => Promise<void>
  saveMotoLog: (log: Omit<MotoLog, 'id'> & { id?: string }) => Promise<string>
  deleteMotoLog: (id: string) => Promise<void>
  saveMotoMaintenance: (maint: Omit<MotoMaintenance, 'id'> & { id?: string }) => Promise<string>
  deleteMotoMaintenance: (id: string) => Promise<void>
  saveBudget: (budget: Omit<Budget, 'id'> & { id?: string }) => Promise<string>
  deleteBudget: (id: string) => Promise<void>
  saveGoal: (goal: Omit<Goal, 'id'> & { id?: string }) => Promise<string>
  deleteGoal: (id: string) => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>

  // Control del modal de registro y edición rápida
  quickModalOpen: boolean
  quickModalKind: TransactionKind
  editingTransaction: Transaction | null
  quickModalPrefill: QuickModalPrefill | null
  openQuickModal: (kind?: TransactionKind, editingTx?: Transaction | null, prefill?: QuickModalPrefill | null) => void
  closeQuickModal: () => void

  // Control del modal de detalle de movimiento
  detailModalTx: Transaction | null
  openTransactionDetail: (tx: Transaction) => void
  closeTransactionDetail: () => void

  // FORJA V2: Módulos opcionales, ciclos y nómina
  preferences: import('../domain/types').UserPreferences
  isModuleActive: (moduleId: import('../domain/modules').ModuleId) => boolean
  toggleModule: (moduleId: import('../domain/modules').ModuleId, enabled: boolean) => Promise<{ success: boolean; reason?: string }>
  updatePreferences: (updates: Partial<import('../domain/types').UserPreferences>) => Promise<void>
  addIncomeSchedule: (sched: Omit<import('../domain/types').IncomeSchedule, 'id'>) => Promise<import('../domain/types').IncomeSchedule>
  updateIncomeSchedule: (id: string, updates: Partial<import('../domain/types').IncomeSchedule>) => Promise<void>
  deleteIncomeSchedule: (id: string) => Promise<void>
}

const ForjaContext = createContext<ForjaContextType | null>(null)

export const ForjaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [period, setPeriod] = useState<CutPeriod>(() => getCurrentPeriod())
  const today = useMemo(() => todayInBogota(), [])

  const auth = useContext(AuthContext)
  const authUser = auth?.user

  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    if (auth?.user) {
      return auth.user.id === '00000000-0000-0000-0000-000000000000' || !isSupabaseConfigured
    }
    return forjaApi.isDemo()
  })

  useEffect(() => {
    if (authUser) {
      const isDemo = authUser.id === '00000000-0000-0000-0000-000000000000' || !isSupabaseConfigured
      forjaApi.setDemoMode(isDemo)
      setIsDemoMode(isDemo)
    }
  }, [authUser])

  const [profile, setProfile] = useState<Profile | null>(null)
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_USER_PREFERENCES)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [debts, setDebts] = useState<Debt[]>([])
  const [loans, setLoans] = useState<Loan[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [recurring, setRecurring] = useState<RecurringExpense[]>([])
  const [occurrences, setOccurrences] = useState<RecurringOccurrence[]>([])
  const [motoLogs, setMotoLogs] = useState<MotoLog[]>([])
  const [motoMaintenance, setMotoMaintenance] = useState<MotoMaintenance[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [goals, setGoals] = useState<Goal[]>([])

  // Modal de detalle de movimiento
  const [detailModalTx, setDetailModalTx] = useState<Transaction | null>(null)
  const openTransactionDetail = useCallback((tx: Transaction) => {
    setDetailModalTx(tx)
  }, [])
  const closeTransactionDetail = useCallback(() => {
    setDetailModalTx(null)
  }, [])

  // Modal rápido y de edición
  const [quickModalOpen, setQuickModalOpen] = useState(false)
  const [quickModalKind, setQuickModalKind] = useState<TransactionKind>('income')
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [quickModalPrefill, setQuickModalPrefill] = useState<QuickModalPrefill | null>(null)

  const openQuickModal = useCallback(
    (
      kind: TransactionKind = 'income',
      editingTx: Transaction | null = null,
      prefill: QuickModalPrefill | null = null
    ) => {
      setQuickModalKind(kind)
      setEditingTransaction(editingTx)
      setQuickModalPrefill(prefill ?? null)
      setQuickModalOpen(true)
    },
    []
  )

  const closeQuickModal = useCallback(() => {
    setQuickModalOpen(false)
    setEditingTransaction(null)
    setQuickModalPrefill(null)
  }, [])

  const refreshData = useCallback(async () => {
    try {
      setIsSyncing(true)
      setError(null)
      const [
        p,
        prefs,
        accs,
        cats,
        dbs,
        lns,
        txs,
        rec,
        occ,
        mlogs,
        mmaint,
        bgts,
        gls,
      ] = await Promise.all([
        forjaApi.getProfile(),
        forjaApi.getUserPreferences(),
        forjaApi.getAccounts(),
        forjaApi.getCategories(),
        forjaApi.getDebts(),
        forjaApi.getLoans(),
        forjaApi.getTransactions(),
        forjaApi.getRecurring(),
        forjaApi.getOccurrences(),
        forjaApi.getMotoLogs(),
        forjaApi.getMotoMaintenance(),
        forjaApi.getBudgets(),
        forjaApi.getGoals(),
      ])

      setProfile(p)
      setPreferences(prefs)
      if (prefs.cycleConfig) {
        setPeriod(getCurrentPeriod(new Date(), prefs.cycleConfig))
      }
      setAccounts(accs)
      const seenCats = new Set<string>()
      const cleanCats = cats.filter((c) => {
        const key = `${c.kind}:${c.name.toLowerCase().trim()}`
        if (seenCats.has(key)) return false
        seenCats.add(key)
        return true
      })
      setCategories(cleanCats)
      setDebts(dbs)
      setLoans(lns)
      setTransactions(txs)
      setRecurring(rec)
      setOccurrences(occ)
      setMotoLogs(mlogs)
      setMotoMaintenance(mmaint)
      setBudgets(bgts)
      setGoals(gls)
    } catch (err) {
      console.error('Error cargando datos de FORJA:', err)
      setError((err as Error).message || 'Error al sincronizar datos financieros')
    } finally {
      setIsLoading(false)
      setIsSyncing(false)
    }
  }, [])

  useEffect(() => {
    refreshData()
  }, [refreshData, isDemoMode])

  // Suscripción Realtime en Supabase si está configurado y autenticado
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || isDemoMode) return

    const channel = supabase
      .channel('forja-db-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        refreshData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'accounts' }, () => {
        refreshData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'debts' }, () => {
        refreshData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recurring_expenses' }, () => {
        refreshData()
      })
      .subscribe()

    return () => {
      supabase?.removeChannel(channel)
    }
  }, [isDemoMode, refreshData])

  // Sincronización entre pestañas del navegador en modo almacenamiento local
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'forja_persistence_v2') {
        forjaApi.reload()
        refreshData()
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [refreshData])

  const toggleDemoMode = useCallback(() => {
    const next = !isDemoMode
    forjaApi.setDemoMode(next)
    setIsDemoMode(next)
  }, [isDemoMode])

  const resetFactoryData = useCallback(async () => {
    forjaApi.resetToDefaults()
    await refreshData()
  }, [refreshData])

  const setPeriodId = useCallback((id: string) => {
    try {
      const current = getCurrentPeriod(new Date(), preferences.cycleConfig)
      if (id > current.id) {
        setPeriod(current)
        return
      }
      setPeriod(getPeriodById(id, preferences.cycleConfig))
    } catch {
      // Ignorar ID inválido
    }
  }, [preferences.cycleConfig])

  const goToNextPeriod = useCallback(() => {
    setPeriod((p) => {
      const current = getCurrentPeriod(new Date(), preferences.cycleConfig)
      if (p.id >= current.id) return p
      const next = getNextPeriod(p, preferences.cycleConfig)
      if (next.id > current.id) return current
      return next
    })
  }, [preferences.cycleConfig])

  const goToPreviousPeriod = useCallback(() => {
    setPeriod((p) => getPreviousPeriod(p, preferences.cycleConfig))
  }, [preferences.cycleConfig])

  const resetToCurrentPeriod = useCallback(() => {
    setPeriod(getCurrentPeriod(new Date(), preferences.cycleConfig))
  }, [preferences.cycleConfig])

  // Agregados
  const index = useMemo(
    () => buildLedgerIndex({ accounts, categories, debts, loans }),
    [accounts, categories, debts, loans],
  )

  const balances = useMemo(() => {
    const totals = totalsFromTransactions(transactions)
    return computeBalances(totals, index)
  }, [transactions, index])

  const summary = useMemo(
    () => summarizeTransactions(transactions, index, { start: period.start, end: period.end }),
    [transactions, index, period.start, period.end],
  )

  // Mutaciones CRUD
  const saveTransaction = useCallback(
    async (draft: TransactionDraft, existingId?: string, existingClientRequestId?: string) => {
      try {
        setIsSyncing(true)
        const res = await forjaApi.saveTransaction(draft, existingId, existingClientRequestId)
        await refreshData()
        return res
      } catch (err) {
        setError((err as Error).message)
        throw err
      } finally {
        setIsSyncing(false)
      }
    },
    [refreshData],
  )

  const deleteTransaction = useCallback(
    async (id: string) => {
      try {
        setIsSyncing(true)
        await forjaApi.deleteTransaction(id)
        await refreshData()
      } catch (err) {
        setError((err as Error).message)
        throw err
      } finally {
        setIsSyncing(false)
      }
    },
    [refreshData],
  )

  const saveAccount = useCallback(
    async (acc: Omit<Account, 'id'> & { id?: string }) => {
      const res = await forjaApi.saveAccount(acc)
      await refreshData()
      return res
    },
    [refreshData],
  )

  const deleteAccount = useCallback(
    async (id: string) => {
      await forjaApi.deleteAccount(id)
      await refreshData()
    },
    [refreshData],
  )

  const saveDebt = useCallback(
    async (d: Omit<Debt, 'id'> & { id?: string }) => {
      const res = await forjaApi.saveDebt(d)
      await refreshData()
      return res
    },
    [refreshData],
  )

  const deleteDebt = useCallback(
    async (id: string) => {
      await forjaApi.deleteDebt(id)
      await refreshData()
    },
    [refreshData],
  )

  const saveLoan = useCallback(
    async (l: Omit<Loan, 'id'> & { id?: string }) => {
      const res = await forjaApi.saveLoan(l)
      await refreshData()
      return res
    },
    [refreshData],
  )

  const deleteLoan = useCallback(
    async (id: string) => {
      await forjaApi.deleteLoan(id)
      await refreshData()
    },
    [refreshData],
  )

  const saveCategory = useCallback(
    async (c: Omit<Category, 'id'> & { id?: string }) => {
      const res = await forjaApi.saveCategory(c)
      await refreshData()
      return res
    },
    [refreshData],
  )

  const deleteCategory = useCallback(
    async (id: string) => {
      await forjaApi.deleteCategory(id)
      await refreshData()
    },
    [refreshData],
  )

  const saveRecurring = useCallback(
    async (r: Omit<RecurringExpense, 'id'> & { id?: string }) => {
      const res = await forjaApi.saveRecurring(r)
      await refreshData()
      return res
    },
    [refreshData],
  )

  const deleteRecurring = useCallback(
    async (id: string) => {
      await forjaApi.deleteRecurring(id)
      await refreshData()
    },
    [refreshData],
  )

  const markOccurrence = useCallback(
    async (occ: Omit<RecurringOccurrence, 'id'>) => {
      await forjaApi.markOccurrence(occ)
      await refreshData()
    },
    [refreshData],
  )

  const saveMotoLog = useCallback(
    async (ml: Omit<MotoLog, 'id'> & { id?: string }) => {
      const res = await forjaApi.saveMotoLog(ml)
      await refreshData()
      return res
    },
    [refreshData],
  )

  const deleteMotoLog = useCallback(
    async (id: string) => {
      await forjaApi.deleteMotoLog(id)
      await refreshData()
    },
    [refreshData],
  )

  const saveMotoMaintenance = useCallback(
    async (mm: Omit<MotoMaintenance, 'id'> & { id?: string }) => {
      const res = await forjaApi.saveMotoMaintenance(mm)
      await refreshData()
      return res
    },
    [refreshData],
  )

  const deleteMotoMaintenance = useCallback(
    async (id: string) => {
      await forjaApi.deleteMotoMaintenance(id)
      await refreshData()
    },
    [refreshData],
  )

  const saveBudget = useCallback(
    async (b: Omit<Budget, 'id'> & { id?: string }) => {
      const res = await forjaApi.saveBudget(b)
      await refreshData()
      return res
    },
    [refreshData],
  )

  const deleteBudget = useCallback(
    async (id: string) => {
      await forjaApi.deleteBudget(id)
      await refreshData()
    },
    [refreshData],
  )

  const saveGoal = useCallback(
    async (g: Omit<Goal, 'id'> & { id?: string }) => {
      const res = await forjaApi.saveGoal(g)
      await refreshData()
      return res
    },
    [refreshData],
  )

  const deleteGoal = useCallback(
    async (id: string) => {
      await forjaApi.deleteGoal(id)
      await refreshData()
    },
    [refreshData],
  )

  const updateProfile = useCallback(
    async (p: Partial<Profile>) => {
      await forjaApi.updateProfile(p)
      await refreshData()
    },
    [refreshData],
  )

  // FORJA V2: Métodos de Módulos, Preferencias y Nómina
  const isModuleActive = useCallback(
    (moduleId: ModuleId) => {
      return isModuleEnabled(preferences.enabledModules, moduleId)
    },
    [preferences.enabledModules]
  )

  const toggleModule = useCallback(
    async (moduleId: ModuleId, enabled: boolean) => {
      if (!enabled) {
        const check = canDisableModule(moduleId, preferences.enabledModules)
        if (!check.allowed) {
          return { success: false, reason: check.reason }
        }
      }
      const nextModules = enabled
        ? Array.from(new Set([...preferences.enabledModules, moduleId]))
        : preferences.enabledModules.filter((id) => id !== moduleId)

      const updated = await forjaApi.updateUserPreferences({ enabledModules: nextModules })
      setPreferences(updated)
      return { success: true }
    },
    [preferences.enabledModules]
  )

  const updatePreferences = useCallback(
    async (updates: Partial<UserPreferences>) => {
      const updated = await forjaApi.updateUserPreferences(updates)
      setPreferences(updated)
      if (updates.cycleConfig) {
        setPeriod(getCurrentPeriod(new Date(), updates.cycleConfig))
      }
    },
    []
  )

  const addIncomeSchedule = useCallback(
    async (sched: Omit<IncomeSchedule, 'id'>) => {
      const res = await forjaApi.addIncomeSchedule(sched)
      const fresh = await forjaApi.getUserPreferences()
      setPreferences(fresh)
      return res
    },
    []
  )

  const updateIncomeSchedule = useCallback(
    async (id: string, updates: Partial<IncomeSchedule>) => {
      await forjaApi.updateIncomeSchedule(id, updates)
      const fresh = await forjaApi.getUserPreferences()
      setPreferences(fresh)
    },
    []
  )

  const deleteIncomeSchedule = useCallback(
    async (id: string) => {
      await forjaApi.deleteIncomeSchedule(id)
      const fresh = await forjaApi.getUserPreferences()
      setPreferences(fresh)
    },
    []
  )

  return (
    <ForjaContext.Provider
      value={{
        period,
        setPeriodId,
        goToNextPeriod,
        goToPreviousPeriod,
        resetToCurrentPeriod,
        today,
        profile,
        preferences,
        isModuleActive,
        toggleModule,
        updatePreferences,
        addIncomeSchedule,
        updateIncomeSchedule,
        deleteIncomeSchedule,
        accounts,
        categories,
        debts,
        loans,
        transactions,
        recurring,
        occurrences,
        motoLogs,
        motoMaintenance,
        budgets,
        goals,
        index,
        balances,
        summary,
        isLoading,
        isSyncing,
        error,
        isDemoMode,
        toggleDemoMode,
        resetFactoryData,
        refreshData,
        saveTransaction,
        deleteTransaction,
        saveAccount,
        deleteAccount,
        saveDebt,
        deleteDebt,
        saveLoan,
        deleteLoan,
        saveCategory,
        deleteCategory,
        saveRecurring,
        deleteRecurring,
        markOccurrence,
        saveMotoLog,
        deleteMotoLog,
        saveMotoMaintenance,
        deleteMotoMaintenance,
        saveBudget,
        deleteBudget,
        saveGoal,
        deleteGoal,
        updateProfile,
        quickModalOpen,
        quickModalKind,
        editingTransaction,
        quickModalPrefill,
        openQuickModal,
        closeQuickModal,
        detailModalTx,
        openTransactionDetail,
        closeTransactionDetail,
      }}
    >
      {children}
    </ForjaContext.Provider>
  )
}

export const useForja = () => {
  const ctx = useContext(ForjaContext)
  if (!ctx) throw new Error('useForja debe usarse dentro de un ForjaProvider')
  return ctx
}
