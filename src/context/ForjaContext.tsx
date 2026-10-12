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
} from '../domain/types'
import type { TransactionDraft } from '../domain/ledger/operations'

interface ForjaContextType {
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
  saveTransaction: (draft: TransactionDraft, existingId?: string) => Promise<{ id: string }>
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

  // Control del modal de registro rápido
  quickModalOpen: boolean
  quickModalKind: TransactionKind
  openQuickModal: (kind?: TransactionKind) => void
  closeQuickModal: () => void
}

const ForjaContext = createContext<ForjaContextType | null>(null)

export const ForjaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [period, setPeriod] = useState<CutPeriod>(() => getCurrentPeriod())
  const today = useMemo(() => todayInBogota(), [])

  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => forjaApi.isDemo())

  const [profile, setProfile] = useState<Profile | null>(null)
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

  // Modal rápido
  const [quickModalOpen, setQuickModalOpen] = useState(false)
  const [quickModalKind, setQuickModalKind] = useState<TransactionKind>('income')

  const openQuickModal = useCallback((kind: TransactionKind = 'income') => {
    setQuickModalKind(kind)
    setQuickModalOpen(true)
  }, [])

  const closeQuickModal = useCallback(() => {
    setQuickModalOpen(false)
  }, [])

  const refreshData = useCallback(async () => {
    try {
      setIsSyncing(true)
      setError(null)
      const [
        p,
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
      setAccounts(accs)
      setCategories(cats)
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
      const current = getCurrentPeriod()
      if (id > current.id) {
        setPeriod(current)
        return
      }
      setPeriod(getPeriodById(id))
    } catch {
      // Ignorar ID inválido
    }
  }, [])

  const goToNextPeriod = useCallback(() => {
    setPeriod((p) => {
      const current = getCurrentPeriod()
      if (p.id >= current.id) return p
      const next = getNextPeriod(p)
      if (next.id > current.id) return current
      return next
    })
  }, [])
  const goToPreviousPeriod = useCallback(() => setPeriod((p) => getPreviousPeriod(p)), [])
  const resetToCurrentPeriod = useCallback(() => setPeriod(getCurrentPeriod()), [])

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
    async (draft: TransactionDraft, existingId?: string) => {
      try {
        setIsSyncing(true)
        const res = await forjaApi.saveTransaction(draft, existingId)
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
        openQuickModal,
        closeQuickModal,
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
