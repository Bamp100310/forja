import React, { useState, useEffect, useMemo } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, AlertCircle, ArrowRightLeft, Handshake } from 'lucide-react'
import { PixelSprite } from '../common/PixelSprite'
import { CategoryIcon, resolveCategoryColor } from '../common/CategoryIcon'
import { useForja } from '../../context/ForjaContext'
import { MoneyInput } from './MoneyInput'
import { buildTransactionDraft, type OperationInput } from '../../domain/ledger/operations'
import { TRANSACTION_KIND_LABELS, ACCOUNT_KIND_LABELS, type TransactionKind } from '../../domain/types'
import { formatCOP, formatCOPCompact } from '../../domain/money'
import { generateUUID } from '../../domain/uuid'
import { sound } from '../../services/sound'
import { triggerPixelSparks } from '../common/PixelSparks'

interface TxMetaDetails {
  amount?: number
  commission?: number
  tip?: number
  fee?: number
  fees?: number
  principal?: number
  interest?: number
  categoryId?: string
  accountId?: string
  fromAccountId?: string
  toAccountId?: string
  debtId?: string
  loanId?: string
  fromLoanId?: string
  toDebtId?: string
  payment?: {
    method?: string
    accountId?: string
    debtId?: string
  }
  newLoan?: {
    personName?: string
    dueDate?: string
  }
}

export const QuickTransactionModal: React.FC = () => {
  const {
    quickModalOpen,
    quickModalKind,
    editingTransaction,
    quickModalPrefill,
    closeQuickModal,
    saveTransaction,
    saveLoan,
    saveAccount,
    today,
    categories,
    accounts,
    debts,
    loans,
    balances,
    isModuleActive,
  } = useForja()

  const hasMoto = isModuleActive('moto')
  const incomeCategories = useMemo(() => {
    const filtered = categories.filter((c) => c.kind === 'income' && !c.isArchived && (hasMoto || !c.isMoto))
    const list = filtered.length > 0 ? filtered : categories.filter((c) => c.kind === 'income' && !c.isArchived)
    const seen = new Set<string>()
    const deduplicated = list.filter((c) => {
      const k = c.name.toLowerCase().trim()
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
    return deduplicated.sort((a, b) => {
      if (Boolean(a.isMoto) !== Boolean(b.isMoto)) {
        return a.isMoto ? 1 : -1
      }
      return a.sortOrder - b.sortOrder
    })
  }, [categories, hasMoto])

  const expenseCategories = useMemo(() => {
    const filtered = categories.filter((c) => c.kind === 'expense' && !c.isArchived && (hasMoto || !c.isMoto))
    const list = filtered.length > 0 ? filtered : categories.filter((c) => c.kind === 'expense' && !c.isArchived)
    const seen = new Set<string>()
    const deduplicated = list.filter((c) => {
      const k = c.name.toLowerCase().trim()
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
    return deduplicated.sort((a, b) => {
      if (Boolean(a.isMoto) !== Boolean(b.isMoto)) {
        return a.isMoto ? 1 : -1
      }
      return a.sortOrder - b.sortOrder
    })
  }, [categories, hasMoto])

  const defaultExpenseCategory = useMemo(() => {
    if (expenseCategories.length === 0) return null
    const foodCat = expenseCategories.find((c) => {
      const n = c.name.toLowerCase()
      return !c.isMoto && (n.includes('aliment') || n.includes('comida') || n.includes('pizza') || n.includes('mercado'))
    })
    if (foodCat) return foodCat
    const nonMoto = expenseCategories.find((c) => !c.isMoto)
    return nonMoto || expenseCategories[0]
  }, [expenseCategories])

  const defaultIncomeCategory = useMemo(() => {
    if (incomeCategories.length === 0) return null
    const salaryCat = incomeCategories.find((c) => {
      const n = c.name.toLowerCase()
      return n.includes('salario') || n.includes('nómina') || n.includes('sueldo')
    })
    if (salaryCat) return salaryCat
    const nonMoto = incomeCategories.find((c) => !c.isMoto)
    return nonMoto || incomeCategories[0]
  }, [incomeCategories])

  const [kind, setKind] = useState<TransactionKind>(quickModalKind)
  const [date, setDate] = useState<string>(today)
  const [description, setDescription] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [isMoto, setIsMoto] = useState<boolean>(false)

  // Campos específicos
  const [amount, setAmount] = useState<number>(0)
  const [commission, setCommission] = useState<number>(0)
  const [tip, setTip] = useState<number>(0)
  const [categoryId, setCategoryId] = useState<string>('')
  const [accountId, setAccountId] = useState<string>('')
  const [toAccountId, setToAccountId] = useState<string>('')
  const [fee, setFee] = useState<number>(0)

  // Deudas y Cruce con Préstamos
  const [debtId, setDebtId] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<'account' | 'debt'>('account')
  const [debtFundingSource, setDebtFundingSource] = useState<'account' | 'loan'>('account')
  const [fromLoanId, setFromLoanId] = useState<string>('')
  const [principal, setPrincipal] = useState<number>(0)
  const [interest, setInterest] = useState<number>(0)
  const [debtFees, setDebtFees] = useState<number>(0)

  // Préstamos y Cobros de plataforma
  const [collectionSource, setCollectionSource] = useState<'platform' | 'loan'>('platform')
  const [loanRepaymentDest, setLoanRepaymentDest] = useState<'account' | 'debt'>('account')
  const [toDebtId, setToDebtId] = useState<string>('')
  const [platformAccountId, setPlatformAccountId] = useState<string>('')
  const [loanId, setLoanId] = useState<string>('')
  const [loanPersonName, setLoanPersonName] = useState<string>('')
  const [loanDueDate, setLoanDueDate] = useState<string>('')

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Listas derivadas
  const platformAccounts = useMemo(
    () => accounts.filter((a) => a.kind === 'platform_receivable'),
    [accounts]
  )
  const liquidAccounts = useMemo(
    () => accounts.filter((a) => ['cash', 'wallet', 'bank', 'savings', 'other'].includes(a.kind)),
    [accounts]
  )
  const currentPlatformBalance = useMemo(
    () => (platformAccountId ? balances.accountBalance.get(platformAccountId) ?? 0 : 0),
    [platformAccountId, balances.accountBalance]
  )
  const selectedCat = useMemo(
    () => categories.find((c) => c.id === categoryId),
    [categories, categoryId]
  )
  const selectedCatColor = useMemo(() => {
    if (!selectedCat) return undefined
    const isDark =
      selectedCat.color &&
      (selectedCat.color === '#000000' ||
        selectedCat.color === '#000' ||
        selectedCat.color === '#111111' ||
        selectedCat.color.toLowerCase() === 'black')
    if (selectedCat.color && !isDark) return selectedCat.color
    return resolveCategoryColor(selectedCat.icon, selectedCat.name, kind, selectedCat.isMoto)
  }, [selectedCat, kind])

  const isNewLoan =
    kind === 'loan_given' &&
    (loanId === '__new__' || loans.length === 0 || !loans.some((l) => l.id === loanId))

  const cashAccount = useMemo(() => accounts.find((a) => a.kind === 'cash'), [accounts])
  const bankAccounts = useMemo(
    () => accounts.filter((a) => a.kind === 'bank' || a.kind === 'wallet' || a.kind === 'savings'),
    [accounts]
  )
  const fromAccount = useMemo(() => accounts.find((a) => a.id === accountId), [accounts, accountId])
  const toAccount = useMemo(() => accounts.find((a) => a.id === toAccountId), [accounts, toAccountId])
  const fromBalance = useMemo(
    () => (fromAccount ? balances.accountBalance.get(fromAccount.id) ?? 0 : 0),
    [fromAccount, balances.accountBalance]
  )
  const toBalance = useMemo(
    () => (toAccount ? balances.accountBalance.get(toAccount.id) ?? 0 : 0),
    [toAccount, balances.accountBalance]
  )
  const projectedFromBalance = fromBalance - amount - fee
  const projectedToBalance = toBalance + amount
  const selectedRepaymentLoan = useMemo(() => loans.find((l) => l.id === loanId), [loans, loanId])

  const [isCreatingCashVault, setIsCreatingCashVault] = useState(false)
  const handleCreateCashVault = async () => {
    setIsCreatingCashVault(true)
    try {
      const newAccId = await saveAccount({
        name: 'Efectivo',
        kind: 'cash',
        openingBalance: 0,
        openingDate: today,
        color: null,
        notes: 'Bóveda de efectivo para gastos diarios y retiros',
        isArchived: false,
        sortOrder: 1,
      })
      sound.playConfirm()
      triggerPixelSparks(window.innerWidth / 2, window.innerHeight * 0.5, 'cyan', 16)
      setToAccountId(newAccId)
    } catch (err) {
      sound.playError()
      setErrorMessage((err as Error).message || 'Error al crear la bóveda de efectivo')
    } finally {
      setIsCreatingCashVault(false)
    }
  }

  const handleSwapTransferVaults = () => {
    sound.playClick()
    const temp = accountId
    setAccountId(toAccountId)
    setToAccountId(temp)
  }

  const handlePresetWithdrawal = () => {
    sound.playClick()
    const bank = bankAccounts[0] || accounts.find((a) => a.kind !== 'cash') || accounts[0]
    const cash = cashAccount || accounts.find((a) => a.kind === 'cash')
    if (bank) setAccountId(bank.id)
    if (cash) {
      setToAccountId(cash.id)
      setDescription('Retiro de efectivo')
    }
  }

  const handlePresetDeposit = () => {
    sound.playClick()
    const bank = bankAccounts[0] || accounts.find((a) => a.kind !== 'cash') || accounts[0]
    const cash = cashAccount || accounts.find((a) => a.kind === 'cash')
    if (cash) setAccountId(cash.id)
    if (bank) {
      setToAccountId(bank.id)
      setDescription('Consignación de efectivo')
    }
  }

  useEffect(() => {
    if (quickModalOpen) {
      setErrorMessage(null)

      if (editingTransaction) {
        // Pre-cargar valores de la transacción en edición
        setKind(editingTransaction.kind)
        setDate(editingTransaction.date)
        setDescription(editingTransaction.description)
        setNotes(editingTransaction.notes || '')
        setIsMoto(Boolean(editingTransaction.isMoto))

        const meta = (editingTransaction.meta || {}) as TxMetaDetails

        if (editingTransaction.kind === 'income') {
          const catPosting = editingTransaction.postings.find((p) => p.targetType === 'category' && p.role === 'gross')
          const accPosting = editingTransaction.postings.find((p) => p.targetType === 'account')
          const commPosting = editingTransaction.postings.find((p) => p.role === 'commission')
          const tipPosting = editingTransaction.postings.find((p) => p.role === 'tip')

          setAmount(Number(meta.amount ?? (catPosting ? Math.abs(catPosting.amount) : 0)))
          setCommission(Number(meta.commission ?? (commPosting ? commPosting.amount : 0)))
          setTip(Number(meta.tip ?? (tipPosting ? Math.abs(tipPosting.amount) : 0)))
          setCategoryId(meta.categoryId || catPosting?.targetId || categories.find((c) => c.kind === 'income')?.id || '')
          setAccountId(meta.accountId || accPosting?.targetId || accounts[0]?.id || '')
        } else if (editingTransaction.kind === 'expense') {
          const catPosting = editingTransaction.postings.find((p) => p.targetType === 'category')
          const accPosting = editingTransaction.postings.find((p) => p.targetType === 'account')
          const debtPosting = editingTransaction.postings.find((p) => p.targetType === 'debt')

          setAmount(Number(meta.amount ?? (catPosting ? Math.abs(catPosting.amount) : 0)))
          setCategoryId(meta.categoryId || catPosting?.targetId || categories.find((c) => c.kind === 'expense')?.id || '')
          if (meta.payment?.method === 'debt' || debtPosting || editingTransaction.debtId) {
            setPaymentMethod('debt')
            setDebtId(meta.payment?.debtId || debtPosting?.targetId || editingTransaction.debtId || debts[0]?.id || '')
            if (accPosting) setAccountId(accPosting.targetId || '')
            else if (accounts.length > 0) setAccountId(accounts[0].id)
          } else {
            setPaymentMethod('account')
            setAccountId(meta.payment?.accountId || accPosting?.targetId || accounts[0]?.id || '')
            if (debts.length > 0) setDebtId(debts[0].id)
          }
        } else if (editingTransaction.kind === 'transfer') {
          const srcPosting = editingTransaction.postings.find((p) => p.targetType === 'account' && p.amount < 0)
          const dstPosting = editingTransaction.postings.find((p) => p.targetType === 'account' && p.amount > 0)
          const feePosting = editingTransaction.postings.find((p) => p.role === 'fee')

          setAmount(Number(meta.amount ?? (dstPosting ? dstPosting.amount : 0)))
          setFee(Number(meta.fee ?? (feePosting ? feePosting.amount : 0)))
          setAccountId(meta.fromAccountId || srcPosting?.targetId || accounts[0]?.id || '')
          setToAccountId(meta.toAccountId || dstPosting?.targetId || accounts[1]?.id || '')
        } else if (editingTransaction.kind === 'debt_payment') {
          const accPosting = editingTransaction.postings.find((p) => p.targetType === 'account')
          const loanPosting = editingTransaction.postings.find((p) => p.targetType === 'loan' && p.amount < 0)
          const debtPosting = editingTransaction.postings.find((p) => p.targetType === 'debt')
          const intPosting = editingTransaction.postings.find((p) => p.role === 'interest')
          const feePosting = editingTransaction.postings.find((p) => p.role === 'fee')

          if (loanPosting || meta.fromLoanId) {
            setDebtFundingSource('loan')
            setFromLoanId(meta.fromLoanId || loanPosting?.targetId || loans[0]?.id || '')
          } else {
            setDebtFundingSource('account')
            setAccountId(meta.accountId || accPosting?.targetId || accounts[0]?.id || '')
          }

          setPrincipal(Number(meta.principal ?? (debtPosting ? debtPosting.amount : 0)))
          setInterest(Number(meta.interest ?? (intPosting ? intPosting.amount : 0)))
          setDebtFees(Number(meta.fees ?? (feePosting ? feePosting.amount : 0)))
          setDebtId(meta.debtId || debtPosting?.targetId || editingTransaction.debtId || debts[0]?.id || '')
        } else if (editingTransaction.kind === 'loan_given') {
          const loanPosting = editingTransaction.postings.find((p) => p.targetType === 'loan')
          const accPosting = editingTransaction.postings.find((p) => p.targetType === 'account')
          const targetLoan = loans.find((l) => l.id === (meta.loanId || editingTransaction.loanId || loanPosting?.targetId))

          setAmount(Number(meta.amount ?? (loanPosting ? loanPosting.amount : 0)))
          setLoanId(targetLoan ? targetLoan.id : (meta.loanId || editingTransaction.loanId || '__new__'))
          setAccountId(meta.accountId || accPosting?.targetId || accounts[0]?.id || '')
          setLoanPersonName(targetLoan?.personName || meta.newLoan?.personName || '')
          setLoanDueDate(targetLoan?.dueDate || meta.newLoan?.dueDate || '')
        } else if (editingTransaction.kind === 'loan_repayment') {
          const accPosting = editingTransaction.postings.find((p) => p.targetType === 'account')
          const debtPosting = editingTransaction.postings.find((p) => p.targetType === 'debt' && p.amount > 0)
          const loanPosting = editingTransaction.postings.find((p) => p.targetType === 'loan')
          const intPosting = editingTransaction.postings.find((p) => p.role === 'interest')

          setCollectionSource('loan')
          if (debtPosting || meta.toDebtId) {
            setLoanRepaymentDest('debt')
            setToDebtId(meta.toDebtId || debtPosting?.targetId || debts[0]?.id || '')
          } else {
            setLoanRepaymentDest('account')
            setAccountId(meta.accountId || accPosting?.targetId || accounts[0]?.id || '')
          }

          setPrincipal(Number(meta.principal ?? (loanPosting ? Math.abs(loanPosting.amount) : 0)))
          setInterest(Number(meta.interest ?? (intPosting ? Math.abs(intPosting.amount) : 0)))
          setLoanId(meta.loanId || loanPosting?.targetId || editingTransaction.loanId || (loans[0]?.id ?? ''))
        }
      } else {
        // Inicialización habitual para nuevo movimiento
        setKind(quickModalKind)
        setDate(quickModalPrefill?.date || today)
        setDebtFundingSource('account')
        setFromLoanId(loans.length > 0 ? loans[0].id : '')
        setLoanRepaymentDest('account')
        setToDebtId(debts.length > 0 ? debts[0].id : '')
        setNotes(quickModalPrefill?.notes || '')
        setCommission(0)
        setTip(0)
        setFee(0)
        setPrincipal(0)
        setInterest(0)
        setDebtFees(0)
        setLoanPersonName('')
        setLoanDueDate('')

        // Determinar si en 'loan_repayment' (COBRAR) iniciamos en Plataforma o en Préstamo
        const hasPlatforms = platformAccounts.length > 0
        const hasLoans = loans.length > 0
        const initialCollectionSource: 'platform' | 'loan' =
          quickModalPrefill?.collectionSource ??
          (quickModalPrefill?.fromAccountId &&
          platformAccounts.some((p) => p.id === quickModalPrefill.fromAccountId)
            ? 'platform'
            : !hasLoans && hasPlatforms
            ? 'platform'
            : hasLoans && !hasPlatforms
            ? 'loan'
            : 'platform')
        setCollectionSource(initialCollectionSource)

        // Plataforma por defecto
        const defaultPlatform =
          platformAccounts.find((p) => p.id === quickModalPrefill?.fromAccountId) ||
          platformAccounts[0]
        if (defaultPlatform) {
          setPlatformAccountId(defaultPlatform.id)
        } else if (accounts.length > 0) {
          setPlatformAccountId(accounts[0].id)
        }

        // Bóveda de destino (por defecto efectivo para repartos de rappi)
        const cashAcc = accounts.find((a) => a.kind === 'cash')
        const defaultDest =
          accounts.find((a) => a.id === quickModalPrefill?.toAccountId) ||
          cashAcc ||
          liquidAccounts[0] ||
          accounts[0]
        if (defaultDest) {
          setToAccountId(defaultDest.id)
        }

        // Monto
        if (quickModalPrefill?.amount) {
          setAmount(quickModalPrefill.amount)
        } else {
          setAmount(0)
        }

        // Descripción
        if (quickModalPrefill?.description) {
          setDescription(quickModalPrefill.description)
        } else if (quickModalKind === 'loan_repayment' && initialCollectionSource === 'platform') {
          setDescription(
            defaultPlatform
              ? defaultDest?.kind === 'cash'
                ? `Cobro en efectivo pedido ${defaultPlatform.name}`
                : `Liquidación saldo ${defaultPlatform.name}`
              : 'Cobro en efectivo plataforma'
          )
        } else {
          setDescription('')
        }

        // isMoto
        if (quickModalPrefill?.isMoto !== undefined) {
          setIsMoto(quickModalPrefill.isMoto)
        } else if (quickModalKind === 'loan_repayment' && initialCollectionSource === 'platform') {
          setIsMoto(true)
        } else {
          setIsMoto(false)
        }

        // Seleccionar valores por defecto de categorías
        const incCats = incomeCategories
        const expCats = expenseCategories
        if (quickModalKind === 'income' && incCats.length > 0) {
          const targetCat = quickModalPrefill?.categoryId
            ? incCats.find((c) => c.id === quickModalPrefill.categoryId) || defaultIncomeCategory || incCats[0]
            : defaultIncomeCategory || incCats[0]

          setCategoryId(targetCat.id)
          if (quickModalPrefill?.isMoto !== undefined) {
            setIsMoto(quickModalPrefill.isMoto)
          } else {
            setIsMoto(Boolean(targetCat.isMoto))
          }
        } else if (quickModalKind === 'expense' && expCats.length > 0) {
          const targetCat = quickModalPrefill?.categoryId
            ? expCats.find((c) => c.id === quickModalPrefill.categoryId) || defaultExpenseCategory || expCats[0]
            : defaultExpenseCategory || expCats[0]
          setCategoryId(targetCat.id)
          setIsMoto(Boolean(targetCat.isMoto))
        }

        if (accounts.length > 0) {
          if (quickModalKind === 'transfer') {
            const bank = accounts.find((a) => a.kind === 'bank' || a.kind === 'wallet' || a.kind === 'savings')
            const cash = accounts.find((a) => a.kind === 'cash')
            const src = quickModalPrefill?.fromAccountId || (bank ? bank.id : accounts[0].id)
            let dst = quickModalPrefill?.toAccountId || (cash ? cash.id : (accounts[1]?.id || accounts[0].id))
            if (src === dst && accounts.length > 1) {
              const alt = accounts.find((a) => a.id !== src)
              if (alt) dst = alt.id
            }
            setAccountId(src)
            setToAccountId(dst)
          } else {
            const preferredAccount =
              quickModalKind === 'income'
                ? quickModalPrefill?.toAccountId || quickModalPrefill?.accountId || accounts[0].id
                : quickModalPrefill?.accountId || quickModalPrefill?.fromAccountId || accounts[0].id
            setAccountId(preferredAccount)
            if (accounts.length > 1 && !quickModalPrefill?.toAccountId) {
              setToAccountId(accounts[1].id)
            }
          }
        }
        if (debts.length > 0) setDebtId(quickModalPrefill?.debtId || debts[0].id)
        else setDebtId('')

        if (quickModalKind === 'loan_given') {
          setLoanId(quickModalPrefill?.loanId || (loans.length > 0 ? loans[0].id : '__new__'))
        } else if (quickModalKind === 'loan_repayment') {
          setLoanId(quickModalPrefill?.loanId || (loans.length > 0 ? loans[0].id : ''))
        } else {
          setLoanId(loans.length > 0 ? loans[0].id : '__new__')
        }
      }
    }
  }, [
    quickModalOpen,
    quickModalKind,
    editingTransaction,
    quickModalPrefill,
    today,
    categories,
    incomeCategories,
    expenseCategories,
    defaultIncomeCategory,
    defaultExpenseCategory,
    accounts,
    debts,
    loans,
    platformAccounts,
    liquidAccounts,
  ])

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    setCategoryId(val)
    const cat = categories.find((c) => c.id === val)
    if (cat) setIsMoto(Boolean(cat.isMoto))
  }

  const handleKindChange = (nextKind: TransactionKind) => {
    sound.playClick()
    triggerPixelSparks(
      window.innerWidth / 2,
      window.innerHeight * 0.3,
      nextKind === 'income' ? 'forge' : nextKind === 'expense' ? 'rust' : 'cyan',
      8
    )
    setKind(nextKind)
    if (nextKind === 'income') {
      const inc = defaultIncomeCategory || incomeCategories[0]
      if (inc) {
        setCategoryId(inc.id)
        setIsMoto(Boolean(inc.isMoto))
      }
    } else if (nextKind === 'expense') {
      const exp = defaultExpenseCategory || expenseCategories[0]
      if (exp) {
        setCategoryId(exp.id)
        setIsMoto(Boolean(exp.isMoto))
      }
    } else if (nextKind === 'loan_given') {
      if (!loanId || (loanId !== '__new__' && !loans.some((l) => l.id === loanId))) {
        setLoanId(loans.length > 0 ? loans[0].id : '__new__')
      }
    } else if (nextKind === 'loan_repayment') {
      if (!loanId || loanId === '__new__' || !loans.some((l) => l.id === loanId)) {
        setLoanId(loans.length > 0 ? loans[0].id : '')
      }
    } else if (nextKind === 'debt_payment') {
      if (!debtId && debts.length > 0) {
        setDebtId(debts[0].id)
      }
    } else if (nextKind === 'transfer') {
      const bank = bankAccounts[0] || accounts.find((a) => a.kind !== 'cash') || accounts[0]
      const cash = cashAccount || accounts.find((a) => a.kind === 'cash')
      const src = bank ? bank.id : accounts[0]?.id || ''
      let dst = cash ? cash.id : (accounts[1]?.id || accounts[0]?.id || '')
      if (src === dst && accounts.length > 1) {
        const alt = accounts.find((a) => a.id !== src)
        if (alt) dst = alt.id
      }
      setAccountId(src)
      setToAccountId(dst)
      setIsMoto(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)
    sound.playClick()
    triggerPixelSparks(window.innerWidth / 2, window.innerHeight * 0.5, 'forge', 14)

    try {
      let op: OperationInput

      if (kind === 'income') {
        if (amount <= 0) {
          throw new Error('El valor del ingreso debe ser mayor que cero.')
        }
        if (!categoryId) {
          throw new Error('Selecciona una categoría para el ingreso.')
        }
        if (!accountId) {
          throw new Error('Selecciona la bóveda donde recibes el dinero.')
        }
        op = {
          kind: 'income',
          date,
          description: description.trim() || 'Ingreso registrado',
          notes: notes.trim() || null,
          isMoto,
          categoryId,
          accountId,
          amount,
          commission: commission > 0 ? commission : undefined,
          tip: tip > 0 ? tip : undefined,
          payrollScheduleId: quickModalPrefill?.payrollScheduleId || null,
          expectedPaydayDate: quickModalPrefill?.expectedPaydayDate || null,
        }
      } else if (kind === 'expense') {
        if (amount <= 0) {
          throw new Error('El valor del gasto debe ser mayor que cero.')
        }
        if (!categoryId) {
          throw new Error('Selecciona una categoría para el gasto.')
        }
        if (paymentMethod === 'account' && !accountId) {
          throw new Error('Selecciona la bóveda desde la que pagas el gasto.')
        }
        if (paymentMethod === 'debt' && !debtId) {
          throw new Error('Selecciona la tarjeta o pasivo con el que pagas.')
        }
        op = {
          kind: 'expense',
          date,
          description: description.trim() || 'Gasto registrado',
          notes: notes.trim() || null,
          isMoto,
          categoryId,
          amount,
          payment:
            paymentMethod === 'debt'
              ? { method: 'debt', debtId }
              : { method: 'account', accountId },
        }
      } else if (kind === 'transfer') {
        if (amount <= 0) {
          throw new Error('El valor a transferir debe ser mayor que cero.')
        }
        if (!accountId || !toAccountId) {
          throw new Error('Selecciona las bóvedas de origen y destino.')
        }
        if (accountId === toAccountId) {
          throw new Error('La bóveda de origen y la de destino deben ser distintas.')
        }
        if (fee < 0) {
          throw new Error('El costo de la comisión bancaria no puede ser negativo.')
        }

        const srcAcc = accounts.find((a) => a.id === accountId)
        const dstAcc = accounts.find((a) => a.id === toAccountId)
        const autoDesc =
          srcAcc?.kind === 'bank' && dstAcc?.kind === 'cash'
            ? 'Retiro bancario a efectivo'
            : srcAcc?.kind === 'cash' && dstAcc?.kind === 'bank'
            ? 'Consignación de efectivo a banco'
            : `Traslado de ${srcAcc?.name || 'bóveda'} a ${dstAcc?.name || 'bóveda'}`

        op = {
          kind: 'transfer',
          date,
          description: description.trim() || autoDesc,
          notes: notes.trim() || null,
          fromAccountId: accountId,
          toAccountId,
          amount,
          fee: fee > 0 ? fee : undefined,
        }
      } else if (kind === 'debt_payment') {
        if (debts.length === 0) {
          throw new Error('No tienes deudas u obligaciones registradas para pagar.')
        }
        if (!debtId) {
          throw new Error('Selecciona la obligación o pasivo a pagar.')
        }

        if (debtFundingSource === 'loan') {
          let resolvedFromLoanId = fromLoanId
          if (!resolvedFromLoanId || resolvedFromLoanId === '__new__') {
            if (!loanPersonName.trim()) {
              throw new Error('Ingresa el nombre de la persona con quien cruzas la deuda (ej. Jhonatan).')
            }
            resolvedFromLoanId = await saveLoan({
              personName: loanPersonName.trim(),
              startDate: date,
              dueDate: loanDueDate || null,
              interestNote: null,
              isArchived: false,
              notes: `Creado para cruzar con deuda ${debts.find((x) => x.id === debtId)?.name || ''}`,
            })
          }
          if (principal <= 0) {
            throw new Error('Ingresa el monto del abono o compensación a cruzar con la deuda.')
          }
          const d = debts.find((x) => x.id === debtId)
          const l = loans.find((x) => x.id === resolvedFromLoanId) || { personName: loanPersonName }
          op = {
            kind: 'debt_payment',
            date,
            description:
              description.trim() ||
              `Cruce: Abono a ${d?.name || 'deuda'} con compensación de ${l?.personName || 'deudor'}`,
            notes: notes.trim() || null,
            debtId,
            accountId: null,
            fromLoanId: resolvedFromLoanId,
            principal,
            interest: interest > 0 ? interest : undefined,
            fees: debtFees > 0 ? debtFees : undefined,
          }
        } else {
          if (!accountId) {
            throw new Error('Selecciona la bóveda con la que realizas el pago.')
          }
          const totalPayment = principal + (interest || 0) + (debtFees || 0)
          if (totalPayment <= 0) {
            throw new Error('El pago de deuda debe ser mayor que cero (ingresa abono a capital, intereses o cargos).')
          }
          op = {
            kind: 'debt_payment',
            date,
            description: description.trim() || 'Pago de deuda',
            notes: notes.trim() || null,
            debtId,
            accountId,
            principal,
            interest: interest > 0 ? interest : undefined,
            fees: debtFees > 0 ? debtFees : undefined,
          }
        }
      } else if (kind === 'loan_given') {
        if (amount <= 0) {
          throw new Error('El monto prestado debe ser mayor que cero.')
        }
        if (!accountId) {
          throw new Error('Selecciona la bóveda desde la que entregas el dinero prestado.')
        }
        if (isNewLoan && !loanPersonName.trim()) {
          throw new Error('Ingresa el nombre del deudor o persona a quien prestas el dinero.')
        }

        const targetLoanId = isNewLoan ? generateUUID() : loanId
        if (!targetLoanId) {
          throw new Error('Identificador de préstamo no válido.')
        }

        const debtorName = isNewLoan
          ? loanPersonName.trim()
          : loans.find((l) => l.id === loanId)?.personName || 'familiar'

        op = {
          kind: 'loan_given',
          date,
          description: description.trim() || `Préstamo a ${debtorName}`,
          notes: notes.trim() || null,
          loanId: targetLoanId,
          accountId: accountId || null,
          amount,
          newLoan: isNewLoan
            ? {
                id: targetLoanId,
                personName: debtorName,
                dueDate: loanDueDate || null,
                interestNote: null,
                notes: notes.trim() || null,
              }
            : undefined,
        }
      } else if (kind === 'loan_repayment') {
        if (collectionSource === 'platform') {
          if (amount <= 0) {
            throw new Error('El valor a cobrar debe ser mayor que cero.')
          }
          if (!platformAccountId) {
            throw new Error('Selecciona la plataforma de origen (Rappi, etc.).')
          }
          if (!toAccountId) {
            throw new Error('Selecciona la bóveda donde recibes el dinero.')
          }
          if (platformAccountId === toAccountId) {
            throw new Error('La plataforma de origen y la bóveda de destino deben ser distintas.')
          }

          const platformAcc = accounts.find((a) => a.id === platformAccountId)
          const destAcc = accounts.find((a) => a.id === toAccountId)
          const fallbackDesc =
            destAcc?.kind === 'cash'
              ? `Cobro en efectivo pedido ${platformAcc?.name || 'Rappi'}`
              : `Liquidación saldo ${platformAcc?.name || 'plataforma'}`

          op = {
            kind: 'transfer',
            date,
            description: description.trim() || fallbackDesc,
            notes: notes.trim() || null,
            fromAccountId: platformAccountId,
            toAccountId,
            amount,
            fee: 0,
            isMoto,
          }
        } else {
          if (loans.length === 0) {
            throw new Error('No tienes préstamos registrados para cobrar.')
          }
          if (!loanId || loanId === '__new__' || !loans.some((l) => l.id === loanId)) {
            throw new Error('Selecciona el préstamo o deudor correspondiente.')
          }
          const debtorName = loans.find((l) => l.id === loanId)?.personName || 'deudor'

          if (loanRepaymentDest === 'debt') {
            if (!toDebtId) {
              throw new Error('Selecciona la deuda propia a la que abonas el valor del préstamo.')
            }
            if (principal <= 0) {
              throw new Error('Ingresa el capital a cruzar contra la deuda.')
            }
            const debtName = debts.find((d) => d.id === toDebtId)?.name || 'deuda'
            op = {
              kind: 'loan_repayment',
              date,
              description:
                description.trim() ||
                `Cruce: Cobro a ${debtorName} aplicado a ${debtName}`,
              notes: notes.trim() || null,
              loanId,
              accountId: null,
              toDebtId,
              principal,
              interest: interest > 0 ? interest : undefined,
            }
          } else {
            if (!accountId) {
              throw new Error('Selecciona la bóveda donde recibes el dinero.')
            }
            const total = principal + (interest || 0)
            if (total <= 0) {
              throw new Error('La devolución debe ser mayor que cero (ingresa capital o intereses).')
            }
            op = {
              kind: 'loan_repayment',
              date,
              description: description.trim() || `Devolución de préstamo de ${debtorName}`,
              notes: notes.trim() || null,
              loanId,
              accountId,
              principal,
              interest: interest > 0 ? interest : undefined,
            }
          }
        }
      } else {
        throw new Error('Tipo de operación no soportado en formulario rápido')
      }

      const draft = buildTransactionDraft(op, { categories })
      await saveTransaction(
        draft,
        editingTransaction ? editingTransaction.id : undefined,
        editingTransaction?.clientRequestId
      )

      // Feedback audiovisual confirmado tras persistencia exitosa
      if (kind === 'income' || kind === 'loan_repayment') {
        sound.playIncome()
        triggerPixelSparks(window.innerWidth / 2, window.innerHeight * 0.45, 'forge', 32)
      } else if (kind === 'expense' || kind === 'debt_payment') {
        sound.playExpense()
        triggerPixelSparks(window.innerWidth / 2, window.innerHeight * 0.45, 'rust', 32)
      } else {
        sound.playConfirm()
        triggerPixelSparks(window.innerWidth / 2, window.innerHeight * 0.45, 'cyan', 24)
      }

      closeQuickModal()
    } catch (err) {
      console.error('Error guardando transacción:', err)
      sound.playError()
      setErrorMessage((err as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog.Root open={quickModalOpen} onOpenChange={(open) => !open && closeQuickModal()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/85 backdrop-blur-xs z-[60]" />
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 pointer-events-none">
          <Dialog.Content className="pointer-events-auto w-full max-w-lg max-h-[90vh] overflow-y-auto forge-modal-box rivet-corners p-4 sm:p-5 shadow-2xl focus:outline-none">
          <div className="flex items-center justify-between pb-3 border-b-2 border-[#233a30]">
            <Dialog.Title className="font-stencil text-base text-emerald-400 font-bold flex items-center gap-2 tracking-wide">
              <PixelSprite name="tools" size={20} />
              <span>{editingTransaction ? 'MODIFICAR MOVIMIENTO' : 'FORJAR MOVIMIENTO'}</span>
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                className="p-1 rounded-xs text-slate-400 hover:text-slate-100 hover:bg-[#1a2d25] border border-transparent hover:border-[#2f5243] transition-colors cursor-pointer"
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          {editingTransaction && (
            <div className="mt-3 bg-amber-950/40 border border-amber-600/60 text-amber-300 px-3 py-1.5 rounded-xs text-[11px] font-pixel flex items-center justify-between">
              <span>MODO EDICIÓN: Ref. #{editingTransaction.id.slice(0, 8)}</span>
              <span className="font-stencil uppercase text-[10px] text-amber-400">{TRANSACTION_KIND_LABELS[editingTransaction.kind]}</span>
            </div>
          )}

          {/* Selector de pestañas por tipo de operación con PixelSprites auténticos */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 my-3.5 bg-[#070c0a] p-1.5 rounded-xs border-2 border-[#233a30]">
            <button
              type="button"
              onClick={() => handleKindChange('income')}
              className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xs text-[10px] font-stencil uppercase tracking-wider transition-all cursor-pointer ${
                kind === 'income'
                  ? 'bg-[#12261a] text-emerald-300 border-2 border-emerald-600 font-bold shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#101b17] border border-transparent'
              }`}
            >
              <PixelSprite name="coins" size={18} />
              <span>INGRESO</span>
            </button>
            <button
              type="button"
              onClick={() => handleKindChange('expense')}
              className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xs text-[10px] font-stencil uppercase tracking-wider transition-all cursor-pointer ${
                kind === 'expense'
                  ? 'bg-[#2b140e] text-rose-300 border-2 border-rose-600 font-bold shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#101b17] border border-transparent'
              }`}
            >
              <PixelSprite name="parcel" size={18} />
              <span>GASTO</span>
            </button>
            <button
              type="button"
              onClick={() => handleKindChange('transfer')}
              className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xs text-[10px] font-stencil uppercase tracking-wider transition-all cursor-pointer ${
                kind === 'transfer'
                  ? 'bg-[#0f2121] text-cyan-300 border-2 border-cyan-600 font-bold shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#101b17] border border-transparent'
              }`}
            >
              <PixelSprite name="conveyor" size={18} />
              <span>TRANSFERIR</span>
            </button>
            <button
              type="button"
              onClick={() => handleKindChange('debt_payment')}
              className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xs text-[10px] font-stencil uppercase tracking-wider transition-all cursor-pointer ${
                kind === 'debt_payment'
                  ? 'bg-[#2a1d0b] text-amber-300 border-2 border-amber-600 font-bold shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#101b17] border border-transparent'
              }`}
            >
              <PixelSprite name="chain" size={18} />
              <span>DEUDA</span>
            </button>
            <button
              type="button"
              onClick={() => handleKindChange('loan_given')}
              className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xs text-[10px] font-stencil uppercase tracking-wider transition-all cursor-pointer ${
                kind === 'loan_given'
                  ? 'bg-[#27150c] text-orange-300 border-2 border-orange-600 font-bold shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#101b17] border border-transparent'
              }`}
            >
              <PixelSprite name="sack" size={18} />
              <span>PRESTAR</span>
            </button>
            <button
              type="button"
              onClick={() => handleKindChange('loan_repayment')}
              className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xs text-[10px] font-stencil uppercase tracking-wider transition-all cursor-pointer ${
                kind === 'loan_repayment'
                  ? 'bg-[#12261a] text-emerald-300 border-2 border-emerald-600 font-bold shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#101b17] border border-transparent'
              }`}
            >
              <PixelSprite name="ledger_check" size={18} />
              <span>COBRAR</span>
            </button>
          </div>

          {errorMessage && (
            <div className="flex items-start gap-2 bg-rose-950/80 border-2 border-rose-800 text-rose-300 p-2.5 rounded-xs text-xs font-pixel my-3">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Fecha y Descripción */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                  FECHA
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full bg-[#070c0a] border border-[#273e34] rounded-xs p-2 text-xs font-pixel text-slate-200 focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                  DESCRIPCIÓN OPERATIVA
                </label>
                <input
                  type="text"
                  placeholder={
                    kind === 'expense'
                      ? isMoto
                        ? 'Ej. Gasolina Terpel / Repuestos moto'
                        : 'Ej. Pizza a domicilio / Mercado / Almuerzo'
                      : kind === 'income'
                      ? isMoto
                        ? 'Ej. Turno Rappi / DiDi'
                        : 'Ej. Quincena nómina fija / Honorarios'
                      : kind === 'transfer'
                      ? 'Ej. Traslado a efectivo o ahorros'
                      : kind === 'debt_payment'
                      ? 'Ej. Abono tarjeta / Pago cuota préstamo'
                      : kind === 'loan_given'
                      ? 'Ej. Préstamo a familiar o amigo'
                      : 'Ej. Cobro o abono recibido'
                  }
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#070c0a] border border-[#273e34] rounded-xs p-2 text-xs font-pixel text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* FORMULARIO DE INGRESO */}
            {kind === 'income' && (
              <>
                <div>
                  <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                    INGRESO BRUTO (COP)
                  </label>
                  <MoneyInput value={amount} onChange={setAmount} required placeholder="0" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                      COMISIÓN PLATAFORMA (DESCUENTO)
                    </label>
                    <MoneyInput value={commission} onChange={setCommission} placeholder="Opcional" />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                      PROPINAS RECIBIDAS
                    </label>
                    <MoneyInput value={tip} onChange={setTip} placeholder="Opcional" />
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                      CATEGORÍA / FUENTE
                    </label>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded bg-[#101d18] border border-[#273e34] flex items-center justify-center shrink-0"
                        style={selectedCatColor ? { borderColor: `${selectedCatColor}50`, backgroundColor: `${selectedCatColor}18` } : undefined}
                      >
                        <CategoryIcon
                          icon={selectedCat?.icon}
                          categoryName={selectedCat?.name}
                          kind="income"
                          size={18}
                          color={selectedCatColor}
                        />
                      </div>
                      <select
                        value={categoryId}
                        onChange={handleCategoryChange}
                        required
                        className="flex-1 bg-[#070c0a] border border-[#273e34] rounded-xs p-2 text-xs font-pixel text-slate-200 focus:outline-none focus:border-amber-400"
                      >
                        {incomeCategories.some((c) => !c.isMoto) && incomeCategories.some((c) => c.isMoto) ? (
                          <>
                            <optgroup label="── Personales y Nómina ──">
                              {incomeCategories.filter((c) => !c.isMoto).map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="── Plataformas y Domicilios ──">
                              {incomeCategories.filter((c) => c.isMoto).map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name} 🏍️
                                </option>
                              ))}
                            </optgroup>
                          </>
                        ) : (
                          incomeCategories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} {c.isMoto ? '🏍️' : ''}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                      BÓVEDA DE DESTINO
                    </label>
                    <select
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      required
                      className="w-full bg-[#070c0a] border border-[#273e34] rounded-xs p-2 text-xs font-pixel text-slate-200 focus:outline-none focus:border-amber-400"
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.kind === 'platform_receivable' ? 'Por cobrar' : 'Disponible'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* FORMULARIO DE GASTO */}
            {kind === 'expense' && (
              <>
                <div>
                  <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                    VALOR DEL GASTO (COP)
                  </label>
                  <MoneyInput value={amount} onChange={setAmount} required placeholder="0" />
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                      CATEGORÍA
                    </label>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded bg-[#101d18] border border-[#273e34] flex items-center justify-center shrink-0"
                        style={selectedCatColor ? { borderColor: `${selectedCatColor}50`, backgroundColor: `${selectedCatColor}18` } : undefined}
                      >
                        <CategoryIcon
                          icon={selectedCat?.icon}
                          categoryName={selectedCat?.name}
                          kind="expense"
                          size={18}
                          color={selectedCatColor}
                        />
                      </div>
                      <select
                        value={categoryId}
                        onChange={handleCategoryChange}
                        required
                        className="flex-1 bg-[#070c0a] border border-[#273e34] rounded-xs p-2 text-xs font-pixel text-slate-200 focus:outline-none focus:border-amber-400"
                      >
                        {expenseCategories.some((c) => !c.isMoto) && expenseCategories.some((c) => c.isMoto) ? (
                          <>
                            <optgroup label="── Cotidianos y Personales ──">
                              {expenseCategories.filter((c) => !c.isMoto).map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="── Taller y Operación Moto ──">
                              {expenseCategories.filter((c) => c.isMoto).map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name} 🏍️
                                </option>
                              ))}
                            </optgroup>
                          </>
                        ) : (
                          expenseCategories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} {c.isMoto ? '🏍️' : ''}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                      <label className="text-slate-300 font-pixel text-[11px] tracking-wider uppercase font-bold">
                        MEDIO DE PAGO
                      </label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('account')}
                          className={`text-[10px] font-pixel px-2 py-0.5 rounded-xs transition-colors cursor-pointer ${
                            paymentMethod === 'account'
                              ? 'bg-[#1b2f27] text-emerald-300 border border-emerald-600 font-bold'
                              : 'text-slate-400 hover:text-slate-200 border border-transparent hover:bg-[#121c18]'
                          }`}
                        >
                          Cuenta / Efectivo
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('debt')}
                          className={`text-[10px] font-pixel px-2 py-0.5 rounded-xs transition-colors cursor-pointer ${
                            paymentMethod === 'debt'
                              ? 'bg-[#2a1d0b] text-amber-300 border border-amber-600 font-bold'
                              : 'text-slate-400 hover:text-slate-200 border border-transparent hover:bg-[#121c18]'
                          }`}
                        >
                          Tarjeta Crédito
                        </button>
                      </div>
                    </div>

                    {paymentMethod === 'account' ? (
                      <select
                        value={accountId}
                        onChange={(e) => setAccountId(e.target.value)}
                        required
                        className="w-full bg-[#070c0a] border border-[#273e34] rounded-xs p-2 text-xs font-pixel text-slate-200 focus:outline-none focus:border-amber-400"
                      >
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({ACCOUNT_KIND_LABELS[a.kind] || 'Disponible'})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <select
                        value={debtId}
                        onChange={(e) => setDebtId(e.target.value)}
                        required
                        className="w-full bg-[#070c0a] border border-[#273e34] rounded-xs p-2 text-xs font-pixel text-slate-200 focus:outline-none focus:border-amber-400"
                      >
                        {debts
                          .filter((d) => d.kind === 'credit_card' || d.status === 'active')
                          .map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} ({d.institution || 'Tarjeta'})
                            </option>
                          ))}
                      </select>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* FORMULARIO DE TRANSFERENCIA ENTRE BÓVEDAS */}
            {kind === 'transfer' && (
              <>
                {/* Atajos Rápidos de Transferencia */}
                <div className="flex flex-wrap items-center gap-1.5 p-2 bg-[#09100d] border border-[#1b2f26] rounded-xs text-[11px] font-pixel">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mr-1">
                    Atajos rápidos:
                  </span>
                  <button
                    type="button"
                    onClick={handlePresetWithdrawal}
                    className="btn-game btn-game-secondary text-[10px] py-1 px-2 text-cyan-300 hover:text-cyan-200 cursor-pointer flex items-center gap-1"
                  >
                    <PixelSprite name="conveyor" size={13} />
                    <span>Retirar efectivo (Banco → Efectivo)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePresetDeposit}
                    className="btn-game btn-game-secondary text-[10px] py-1 px-2 text-emerald-300 hover:text-emerald-200 cursor-pointer flex items-center gap-1"
                  >
                    <PixelSprite name="vault" size={13} />
                    <span>Consignar efectivo (Efectivo → Banco)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSwapTransferVaults}
                    className="btn-game btn-game-secondary text-[10px] py-1 px-2 text-slate-300 hover:text-white cursor-pointer ml-auto flex items-center gap-1"
                    title="Invertir bóvedas de origen y destino"
                  >
                    <ArrowRightLeft size={12} />
                    <span>Invertir</span>
                  </button>
                </div>

                {!cashAccount && (
                  <div className="p-2.5 bg-cyan-950/40 border border-cyan-800/80 rounded-xs text-xs font-pixel flex items-center justify-between gap-3">
                    <div className="text-cyan-300">
                      <span className="font-bold block">¿No tienes bóveda de efectivo?</span>
                      <span className="text-[10px] text-slate-300">
                        Crea tu bóveda de efectivo con un clic para mover dinero entre el banco y tu bolsillo.
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={isCreatingCashVault}
                      onClick={handleCreateCashVault}
                      className="btn-game btn-game-primary text-xs py-1 px-2.5 font-bold shrink-0 cursor-pointer"
                    >
                      {isCreatingCashVault ? 'Creando...' : '+ CREAR EFECTIVO'}
                    </button>
                  </div>
                )}

                <div>
                  <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                    VALOR A TRANSFERIR (COP)
                  </label>
                  <MoneyInput value={amount} onChange={setAmount} required placeholder="0" />
                  {/* Botones rápidos de incremento */}
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-500 font-pixel">Sumar:</span>
                    {[20_000, 50_000, 100_000, 200_000, 500_000].map((inc) => (
                      <button
                        key={inc}
                        type="button"
                        onClick={() => setAmount((v) => v + inc)}
                        className="btn-game btn-game-secondary text-[10px] py-0.5 px-2 font-mono cursor-pointer"
                      >
                        +{formatCOPCompact(inc)}
                      </button>
                    ))}
                    {amount > 0 && (
                      <button
                        type="button"
                        onClick={() => setAmount(0)}
                        className="text-[10px] text-rose-400 hover:text-rose-300 font-pixel ml-auto cursor-pointer"
                      >
                        Limpiar
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                      BÓVEDA DE ORIGEN (SALE DINERO)
                    </label>
                    <select
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      required
                      className="w-full bg-[#070c0a] border border-[#273e34] rounded-xs p-2 text-xs font-pixel text-slate-200 focus:outline-none focus:border-cyan-400"
                    >
                      {accounts.map((a) => {
                        const bal = balances.accountBalance.get(a.id) ?? 0
                        return (
                          <option key={a.id} value={a.id}>
                            {a.name} ({ACCOUNT_KIND_LABELS[a.kind] || 'Bóveda'}) — {formatCOP(bal)}
                          </option>
                        )
                      })}
                    </select>
                    <div className="flex items-center justify-between text-[11px] font-pixel text-slate-400 mt-1 px-0.5">
                      <span>Saldo disponible:</span>
                      <span className="text-cyan-300 font-bold font-mono">{formatCOP(fromBalance)}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                      BÓVEDA DE DESTINO (ENTRA DINERO)
                    </label>
                    <select
                      value={toAccountId}
                      onChange={(e) => setToAccountId(e.target.value)}
                      required
                      className="w-full bg-[#070c0a] border border-[#273e34] rounded-xs p-2 text-xs font-pixel text-slate-200 focus:outline-none focus:border-cyan-400"
                    >
                      {accounts.map((a) => {
                        const bal = balances.accountBalance.get(a.id) ?? 0
                        return (
                          <option key={a.id} value={a.id}>
                            {a.name} ({ACCOUNT_KIND_LABELS[a.kind] || 'Bóveda'}) — {formatCOP(bal)}
                          </option>
                        )
                      })}
                    </select>
                    <div className="flex items-center justify-between text-[11px] font-pixel text-slate-400 mt-1 px-0.5">
                      <span>Saldo actual:</span>
                      <span className="text-emerald-300 font-bold font-mono">{formatCOP(toBalance)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                    COMISIÓN BANCARIA / COSTO TRASLADO (OPCIONAL)
                  </label>
                  <MoneyInput value={fee} onChange={setFee} placeholder="0 si es gratuita" />
                  <span className="text-[10px] text-slate-500 font-pixel block mt-0.5">
                    Se registrará como gasto financiero separado sin alterar el importe transferido.
                  </span>
                </div>

                {/* Resumen y Conciliación en Tiempo Real */}
                {amount > 0 && accountId && toAccountId && (
                  <div className="p-3 bg-[#08120e] border-2 border-cyan-800/70 rounded-xs space-y-2 text-xs font-pixel">
                    <div className="flex items-center justify-between border-b border-[#1b3127] pb-1">
                      <span className="font-stencil text-cyan-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <PixelSprite name="ledger_check" size={14} />
                        CONCILIACIÓN DEL TRASLADO EN TIEMPO REAL
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Partida Doble Balanceada
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="bg-[#050b08] p-2 rounded border border-[#162720]">
                        <span className="text-[10px] text-slate-400 uppercase block font-bold">
                          ORIGEN: {fromAccount?.name || 'Origen'}
                        </span>
                        <div className="mt-1 space-y-0.5 font-mono text-[11px]">
                          <div className="flex justify-between text-slate-400">
                            <span>Saldo actual:</span>
                            <span>{formatCOP(fromBalance)}</span>
                          </div>
                          <div className="flex justify-between text-rose-400">
                            <span>Transferencia:</span>
                            <span>−{formatCOP(amount)}</span>
                          </div>
                          {fee > 0 && (
                            <div className="flex justify-between text-amber-400">
                              <span>Comisión bancaria:</span>
                              <span>−{formatCOP(fee)}</span>
                            </div>
                          )}
                          <div className="flex justify-between pt-1 border-t border-[#1a2d25] font-bold text-slate-100">
                            <span>Saldo resultante:</span>
                            <span className={projectedFromBalance < 0 ? 'text-amber-400' : 'text-slate-100'}>
                              {formatCOP(projectedFromBalance)}
                            </span>
                          </div>
                          {projectedFromBalance < 0 && (
                            <p className="text-[10px] text-amber-400/90 italic pt-0.5">
                              ⚠️ Esta operación dejará la cuenta de origen con saldo negativo.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="bg-[#050b08] p-2 rounded border border-[#162720]">
                        <span className="text-[10px] text-slate-400 uppercase block font-bold">
                          DESTINO: {toAccount?.name || 'Destino'}
                        </span>
                        <div className="mt-1 space-y-0.5 font-mono text-[11px]">
                          <div className="flex justify-between text-slate-400">
                            <span>Saldo actual:</span>
                            <span>{formatCOP(toBalance)}</span>
                          </div>
                          <div className="flex justify-between text-emerald-400">
                            <span>Transferencia recibida:</span>
                            <span>+{formatCOP(amount)}</span>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-[#1a2d25] font-bold text-emerald-300">
                            <span>Saldo resultante:</span>
                            <span>{formatCOP(projectedToBalance)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-1.5 border-t border-[#182821] flex flex-wrap items-center justify-between text-[10px] text-slate-400">
                      <span>
                        Dinero total en ambas bóvedas:{' '}
                        <span className="text-slate-200 font-bold font-mono">
                          {formatCOP(fromBalance + toBalance)}
                        </span>{' '}
                        →{' '}
                        <span className="text-cyan-300 font-bold font-mono">
                          {formatCOP(projectedFromBalance + projectedToBalance)}
                        </span>{' '}
                        {fee === 0 ? '(Permanece intacto)' : `(Disminuye solo ${formatCOP(fee)} por comisión)`}
                      </span>
                      <span className="text-emerald-400 font-mono">
                        Ingresos: $0 • Gastos: {fee > 0 ? formatCOP(fee) : '$0'}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* FORMULARIO DE PAGO DE DEUDA */}
            {kind === 'debt_payment' && (
              <>
                {debts.length === 0 ? (
                  <div className="p-3 bg-amber-950/60 border border-amber-800 text-amber-300 rounded-xs text-xs font-pixel">
                    No tienes deudas ni tarjetas registradas para realizar abonos. Puedes crearlas desde el menú de Deudas.
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                          OBLIGACIÓN / PASIVO A ABONAR
                        </label>
                        <select
                          value={debtId}
                          onChange={(e) => setDebtId(e.target.value)}
                          required
                          className="w-full bg-[#070c0a] border border-[#273e34] rounded-xs p-2 text-xs font-pixel text-slate-200 focus:outline-none focus:border-amber-400"
                        >
                          {debts.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} ({d.institution || 'Entidad'}) — Saldo: {formatCOP(balances.debtBalance.get(d.id) || 0)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-slate-300 font-pixel text-[11px] tracking-wider uppercase font-bold">
                            FONDEAR PAGO CON
                          </label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setDebtFundingSource('account')}
                              className={`text-[10px] font-pixel px-1.5 py-0.5 rounded-xs transition-colors cursor-pointer ${
                                debtFundingSource === 'account'
                                  ? 'bg-[#1b2f27] text-emerald-300 border border-emerald-600'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              Bóveda
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDebtFundingSource('loan')
                                if (!fromLoanId && loans.length > 0) setFromLoanId(loans[0].id)
                                else if (!fromLoanId) setFromLoanId('__new__')
                              }}
                              className={`text-[10px] font-pixel px-1.5 py-0.5 rounded-xs transition-colors flex items-center gap-1 cursor-pointer ${
                                debtFundingSource === 'loan'
                                  ? 'bg-[#261730] text-purple-300 border border-purple-600 font-bold'
                                  : 'text-slate-400 hover:text-purple-300'
                              }`}
                              title="Compensar contra dinero o gastos pagados por esa persona"
                            >
                              <Handshake size={10} />
                              Cruzar compensación / persona {loans.length > 0 ? `(${loans.length})` : ''}
                            </button>
                          </div>
                        </div>

                        {debtFundingSource === 'account' ? (
                          <select
                            value={accountId}
                            onChange={(e) => setAccountId(e.target.value)}
                            required
                            className="w-full bg-[#070c0a] border border-[#273e34] rounded-xs p-2 text-xs font-pixel text-slate-200 focus:outline-none focus:border-amber-400"
                          >
                            {accounts.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="space-y-1.5">
                            <select
                              value={fromLoanId}
                              onChange={(e) => {
                                setFromLoanId(e.target.value)
                                if (e.target.value !== '__new__') {
                                  const l = loans.find((item) => item.id === e.target.value)
                                  if (l) setLoanPersonName(l.personName)
                                }
                              }}
                              required
                              className="w-full bg-[#0f0914] border border-purple-700 rounded-xs p-2 text-xs font-pixel text-purple-200 focus:outline-none focus:border-purple-400"
                            >
                              {loans.map((l) => (
                                <option key={l.id} value={l.id}>
                                  {l.personName} (Por cobrar: {formatCOP(balances.loanPending.get(l.id) || 0)})
                                </option>
                              ))}
                              <option value="__new__">+ Nueva persona / compensación (ej. Jhonatan)</option>
                            </select>
                            {(fromLoanId === '__new__' || loans.length === 0) && (
                              <input
                                type="text"
                                placeholder="Nombre de la persona (ej. Jhonatan)"
                                value={loanPersonName}
                                onChange={(e) => setLoanPersonName(e.target.value)}
                                required
                                className="w-full bg-[#0f0914] border border-purple-700 rounded-xs p-2 text-xs font-pixel text-purple-200 placeholder:text-purple-400/50 focus:outline-none focus:border-purple-400"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {debtFundingSource === 'loan' && (
                      <div className="p-2.5 bg-[#170e1c] border border-purple-700/60 rounded-xs text-[11px] text-purple-200 font-pixel flex items-start gap-2">
                        <Handshake size={15} className="shrink-0 mt-0.5 text-purple-400" />
                        <div className="space-y-0.5">
                          <span className="font-bold text-purple-300 block">COMPENSACIÓN DIRECTA DE SALDOS (CRUCE DE CUENTAS)</span>
                          <p className="text-slate-300 text-[10px] leading-tight">
                            Este movimiento amortiza tu deuda descontándola del préstamo por cobrar que le hiciste a esa persona. No se requiere mover dinero en efectivo ni bancario.
                          </p>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                        ABONO A CAPITAL (REDUCE DEUDA)
                      </label>
                      <MoneyInput value={principal} onChange={setPrincipal} placeholder="0" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                          INTERESES INCLUIDOS (GASTO FINANCIERO)
                        </label>
                        <MoneyInput value={interest} onChange={setInterest} placeholder="0" />
                      </div>
                      <div>
                        <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                          SEGUROS / CUOTA DE MANEJO
                        </label>
                        <MoneyInput value={debtFees} onChange={setDebtFees} placeholder="0" />
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {/* FORMULARIO DE PRÉSTAMO OTORGADO */}
            {kind === 'loan_given' && (
              <>
                <div>
                  <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                    MONTO PRESTADO (COP)
                  </label>
                  <MoneyInput value={amount} onChange={setAmount} required placeholder="0" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                      DEUDOR / PERSONA
                    </label>
                    <select
                      value={isNewLoan ? '__new__' : loanId}
                      onChange={(e) => {
                        setLoanId(e.target.value)
                        if (e.target.value !== '__new__') {
                          const l = loans.find((item) => item.id === e.target.value)
                          if (l) setLoanPersonName(l.personName)
                        }
                      }}
                      className="w-full bg-[#070c0a] border border-[#273e34] rounded-xs p-2 text-xs font-pixel text-slate-200 focus:outline-none focus:border-amber-400 mb-1.5"
                    >
                      <option value="__new__">+ Crear nuevo registro de deudor</option>
                      {loans.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.personName}
                        </option>
                      ))}
                    </select>

                    {isNewLoan && (
                      <input
                        type="text"
                        placeholder="Nombre de la persona o deudor"
                        value={loanPersonName}
                        onChange={(e) => setLoanPersonName(e.target.value)}
                        required
                        className="w-full bg-[#070c0a] border border-[#273e34] rounded-xs p-2 text-xs font-pixel text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                      BÓVEDA DESDE LA QUE ENTREGO EL DINERO
                    </label>
                    <select
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      required
                      className="w-full bg-[#070c0a] border border-[#273e34] rounded-xs p-2 text-xs font-pixel text-slate-200 focus:outline-none focus:border-amber-400"
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {isNewLoan && (
                  <div>
                    <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                      FECHA PACTADA DE DEVOLUCIÓN (OPCIONAL)
                    </label>
                    <input
                      type="date"
                      value={loanDueDate}
                      onChange={(e) => setLoanDueDate(e.target.value)}
                      className="w-full bg-[#070c0a] border border-[#273e34] rounded-xs p-2 text-xs font-pixel text-slate-200 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                )}
              </>
            )}

            {/* FORMULARIO DE COBRO (PLATAFORMA O PRÉSTAMO) */}
            {kind === 'loan_repayment' && (
              <>
                {/* Selector de sub-origen del cobro */}
                <div className="flex gap-2 p-1 bg-[#0b1411] border border-[#1d332a] rounded-xs mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setCollectionSource('platform')
                      const pAcc =
                        accounts.find((a) => a.id === platformAccountId) || platformAccounts[0]
                      const dest = accounts.find((a) => a.id === toAccountId)
                      if (pAcc) {
                        setDescription(
                          dest?.kind === 'cash'
                            ? `Cobro en efectivo pedido ${pAcc.name}`
                            : `Liquidación saldo ${pAcc.name}`
                        )
                      }
                      setIsMoto(true)
                    }}
                    className={`flex-1 py-1.5 px-2 text-xs font-pixel tracking-wider uppercase rounded-xs border transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                      collectionSource === 'platform'
                        ? 'btn-game btn-game-primary font-bold shadow-xs'
                        : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-[#13231e]'
                    }`}
                  >
                    <PixelSprite name="conveyor" size={14} />
                    <span>PLATAFORMA / EFECTIVO ({platformAccounts.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCollectionSource('loan')
                      setDescription('')
                      setIsMoto(false)
                    }}
                    className={`flex-1 py-1.5 px-2 text-xs font-pixel tracking-wider uppercase rounded-xs border transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                      collectionSource === 'loan'
                        ? 'btn-game btn-game-primary font-bold shadow-xs'
                        : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-[#13231e]'
                    }`}
                  >
                    <PixelSprite name="sack" size={14} />
                    <span>PRÉSTAMO A TERCEROS ({loans.length})</span>
                  </button>
                </div>

                {collectionSource === 'platform' ? (
                  <>
                    {platformAccounts.length === 0 ? (
                      <div className="p-3 bg-amber-950/60 border border-amber-800 text-amber-300 rounded-xs text-xs font-pixel">
                        No tienes bóvedas de tipo «Plataforma por cobrar» (Rappi, DiDi, etc.). Puedes crear una en la sección de Bóvedas.
                      </div>
                    ) : (
                      <>
                        <div className="p-2.5 bg-[#121c17] border border-amber-800/60 rounded-xs text-[11px] text-amber-300 font-pixel flex items-start gap-2.5 mb-2">
                          <PixelSprite name="moto" size={18} className="shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <span className="font-bold text-amber-200 block">
                              COBRO DE PEDIDOS EN EFECTIVO O DISPERSIÓN DE APP
                            </span>
                            <p className="text-slate-300 leading-snug">
                              Si cobraste un pedido en efectivo, ese dinero entra a tu bolsillo (Efectivo) y la app te descuenta el saldo por cobrar. Aquí registras ese cobro poco a poco.
                            </p>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-slate-300 font-pixel text-[11px] tracking-wider uppercase font-bold">
                              MONTO A COBRAR (COP)
                            </label>
                            {currentPlatformBalance > 0 && (
                              <button
                                type="button"
                                onClick={() => setAmount(Math.max(0, currentPlatformBalance))}
                                className="text-[10px] font-pixel text-amber-400 hover:text-amber-300 underline cursor-pointer"
                              >
                                Cobrar todo ({formatCOPCompact(currentPlatformBalance)})
                              </button>
                            )}
                          </div>
                          <MoneyInput value={amount} onChange={setAmount} required placeholder="0" />

                          {/* Botones rápidos de incremento */}
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <span className="text-[10px] text-slate-500 font-pixel">Sumar:</span>
                            {[10_000, 20_000, 50_000, 100_000].map((inc) => (
                              <button
                                key={inc}
                                type="button"
                                onClick={() => setAmount((v) => v + inc)}
                                className="btn-game btn-game-secondary text-[10px] py-0.5 px-2 font-mono cursor-pointer"
                              >
                                +{formatCOPCompact(inc)}
                              </button>
                            ))}
                            {amount > 0 && (
                              <button
                                type="button"
                                onClick={() => setAmount(0)}
                                className="text-[10px] text-rose-400 hover:text-rose-300 font-pixel ml-auto cursor-pointer"
                              >
                                Limpiar
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                              PLATAFORMA DE ORIGEN (REDUCE SALDO)
                            </label>
                            <select
                              value={platformAccountId}
                              onChange={(e) => {
                                const newId = e.target.value
                                setPlatformAccountId(newId)
                                const pAcc = accounts.find((a) => a.id === newId)
                                const dest = accounts.find((a) => a.id === toAccountId)
                                if (pAcc) {
                                  setDescription(
                                    dest?.kind === 'cash'
                                      ? `Cobro en efectivo pedido ${pAcc.name}`
                                      : `Liquidación saldo ${pAcc.name}`
                                  )
                                }
                              }}
                              required
                              className="w-full bg-[#070c0a] border border-[#273e34] rounded-xs p-2 text-xs font-pixel text-slate-200 focus:outline-none focus:border-amber-400"
                            >
                              {platformAccounts.map((a) => {
                                const bal = balances.accountBalance.get(a.id) ?? 0
                                return (
                                  <option key={a.id} value={a.id}>
                                    {a.name} — Saldo: {formatCOP(bal)}
                                  </option>
                                )
                              })}
                            </select>
                            <div className="flex items-center justify-between text-[11px] font-pixel text-slate-400 mt-1 px-0.5">
                              <span>Saldo en plataforma:</span>
                              <span className="text-amber-400 font-bold font-mono">
                                {formatCOP(currentPlatformBalance)}
                              </span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                              BÓVEDA DE DESTINO (ENTRA EL DINERO)
                            </label>
                            <select
                              value={toAccountId}
                              onChange={(e) => {
                                const newDestId = e.target.value
                                setToAccountId(newDestId)
                                const dest = accounts.find((a) => a.id === newDestId)
                                const pAcc = accounts.find((a) => a.id === platformAccountId)
                                if (dest?.kind === 'cash') {
                                  setDescription(
                                    `Cobro en efectivo pedido ${pAcc?.name || 'Rappi'}`
                                  )
                                } else {
                                  setDescription(
                                    `Liquidación ${pAcc?.name || 'Rappi'} a ${dest?.name || 'cuenta'}`
                                  )
                                }
                              }}
                              required
                              className="w-full bg-[#070c0a] border border-[#273e34] rounded-xs p-2 text-xs font-pixel text-slate-200 focus:outline-none focus:border-amber-400"
                            >
                              {liquidAccounts.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.name} ({ACCOUNT_KIND_LABELS[a.kind] || 'Disponible'})
                                </option>
                              ))}
                            </select>
                            <span className="text-[10px] text-slate-500 font-pixel mt-1 block">
                              Usa «Efectivo» si te pagaron en mano; o «Nequi/Banco» si fue retiro.
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    {loans.length === 0 ? (
                      <div className="p-3 bg-amber-950/60 border border-amber-800 text-amber-300 rounded-xs text-xs font-pixel">
                        No tienes préstamos a personas registrados pendientes de cobro. Primero forja un préstamo en la pestaña «PRESTAR».
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                              PRÉSTAMO / DEUDOR
                            </label>
                            <select
                              value={loanId}
                              onChange={(e) => setLoanId(e.target.value)}
                              required
                              className="w-full bg-[#070c0a] border border-[#273e34] rounded-xs p-2 text-xs font-pixel text-slate-200 focus:outline-none focus:border-amber-400"
                            >
                              <option value="" disabled>
                                Selecciona el deudor...
                              </option>
                              {loans.map((l) => (
                                <option key={l.id} value={l.id}>
                                  {l.personName} (Saldo por cobrar: {formatCOP(balances.loanPending.get(l.id) ?? 0)})
                                </option>
                              ))}
                            </select>
                            {selectedRepaymentLoan && (
                              <div className="flex items-center justify-between text-[11px] font-pixel text-slate-400 mt-1 px-0.5">
                                <span>Saldo pendiente:</span>
                                <span className="text-purple-300 font-bold font-mono">
                                  {formatCOP(balances.loanPending.get(selectedRepaymentLoan.id) ?? 0)}
                                </span>
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-slate-300 font-pixel text-[11px] tracking-wider uppercase font-bold">
                                DESTINO DEL COBRO
                              </label>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setLoanRepaymentDest('account')}
                                  className={`text-[10px] font-pixel px-1.5 py-0.5 rounded-xs transition-colors cursor-pointer ${
                                    loanRepaymentDest === 'account'
                                      ? 'bg-[#1b2f27] text-emerald-300 border border-emerald-600'
                                      : 'text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  Bóveda
                                </button>
                                {debts.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setLoanRepaymentDest('debt')
                                      if (!toDebtId && debts.length > 0) setToDebtId(debts[0].id)
                                    }}
                                    className={`text-[10px] font-pixel px-1.5 py-0.5 rounded-xs transition-colors flex items-center gap-1 cursor-pointer ${
                                      loanRepaymentDest === 'debt'
                                        ? 'bg-[#2a1d0b] text-amber-300 border border-amber-600 font-bold'
                                        : 'text-slate-400 hover:text-amber-300'
                                    }`}
                                    title="Cruzar para abonar a una deuda que tú tienes (compensación de deudas)"
                                  >
                                    <ArrowRightLeft size={10} />
                                    Abonar a mi deuda ({debts.length})
                                  </button>
                                )}
                              </div>
                            </div>

                            {loanRepaymentDest === 'account' ? (
                              <select
                                value={accountId}
                                onChange={(e) => setAccountId(e.target.value)}
                                required
                                className="w-full bg-[#070c0a] border border-[#273e34] rounded-xs p-2 text-xs font-pixel text-slate-200 focus:outline-none focus:border-amber-400"
                              >
                                {accounts.map((a) => (
                                  <option key={a.id} value={a.id}>
                                    {a.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <select
                                value={toDebtId}
                                onChange={(e) => setToDebtId(e.target.value)}
                                required
                                className="w-full bg-[#140e06] border border-amber-700 rounded-xs p-2 text-xs font-pixel text-amber-200 focus:outline-none focus:border-amber-400"
                              >
                                {debts.map((d) => (
                                  <option key={d.id} value={d.id}>
                                    {d.name} (Saldo adeudado: {formatCOP(balances.debtBalance.get(d.id) || 0)})
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        </div>

                        {loanRepaymentDest === 'debt' && (
                          <div className="p-2.5 bg-[#1a1208] border border-amber-700/60 rounded-xs text-[11px] text-amber-200 font-pixel flex items-start gap-2">
                            <ArrowRightLeft size={15} className="shrink-0 mt-0.5 text-amber-400" />
                            <div className="space-y-0.5">
                              <span className="font-bold text-amber-300 block">CRUCE DIRECTO CONTRA DEUDA PROPIA</span>
                              <p className="text-slate-300 text-[10px] leading-tight">
                                La devolución de este préstamo se aplica directamente como abono a tu deuda seleccionada, extinguiendo ambos saldos de manera cruzada sin movimientos bancarios.
                              </p>
                            </div>
                          </div>
                        )}

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-slate-300 font-pixel text-[11px] tracking-wider uppercase font-bold">
                              CAPITAL DEVUELTO (REDUCE SALDO)
                            </label>
                            {selectedRepaymentLoan && (balances.loanPending.get(selectedRepaymentLoan.id) ?? 0) > 0 && (
                              <button
                                type="button"
                                onClick={() => setPrincipal(balances.loanPending.get(selectedRepaymentLoan.id) ?? 0)}
                                className="text-[10px] font-pixel text-purple-300 hover:text-purple-200 underline cursor-pointer"
                              >
                                Liquidar saldo ({formatCOPCompact(balances.loanPending.get(selectedRepaymentLoan.id) ?? 0)})
                              </button>
                            )}
                          </div>
                          <MoneyInput value={principal} onChange={setPrincipal} required placeholder="0" />
                          {selectedRepaymentLoan && principal > (balances.loanPending.get(selectedRepaymentLoan.id) ?? 0) && (
                            <div className="p-2 bg-amber-950/40 border border-amber-800/60 rounded text-[10px] text-amber-300 font-mono mt-1">
                              ⚠️ Este abono supera el saldo pendiente (+{formatCOP(principal - (balances.loanPending.get(selectedRepaymentLoan.id) ?? 0))} excedente). El préstamo quedará en $0 y se registrará un sobrepago a favor del deudor.
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                            INTERESES PACTADOS RECIBIDOS (INGRESO)
                          </label>
                          <MoneyInput value={interest} onChange={setInterest} placeholder="0" />
                        </div>
                      </>
                    )}
                  </>
                )}
              </>
            )}

            {/* Checkbox de Motocicleta */}
            {(kind === 'income' ||
              kind === 'expense' ||
              (kind === 'loan_repayment' && collectionSource === 'platform')) && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="moto-check"
                  checked={isMoto}
                  onChange={(e) => setIsMoto(e.target.checked)}
                  className="rounded-xs border border-[#273e34] text-amber-500 focus:ring-amber-500 bg-[#070c0a] cursor-pointer"
                />
                <label
                  htmlFor="moto-check"
                  className="text-xs text-slate-300 font-pixel uppercase tracking-wider cursor-pointer select-none font-bold"
                >
                  Vincular a la Motocicleta (Taller de Moto)
                </label>
              </div>
            )}

            {/* Notas adicionales */}
            <div>
              <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                NOTAS ADICIONALES (OPCIONAL)
              </label>
              <textarea
                rows={2}
                placeholder="Detalles adicionales, recordatorio..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-[#070c0a] border border-[#273e34] rounded-xs p-2 text-xs font-pixel text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Botones de acción con calor de forja */}
            <div className="flex items-center justify-end gap-2.5 pt-3.5 border-t-2 border-[#233a30]">
              <button
                type="button"
                onClick={() => {
                  sound.playClick()
                  closeQuickModal()
                }}
                disabled={isSubmitting}
                className="btn-game btn-game-secondary text-xs py-2 px-3.5 font-pixel"
              >
                CANCELAR
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`btn-game btn-game-primary btn-forge-heat text-xs py-2 px-4.5 font-pixel font-bold flex items-center gap-2 shadow-xl transition-all ${
                  isSubmitting ? 'animate-forge-hot' : ''
                }`}
              >
                <PixelSprite name="tools" size={17} className={isSubmitting ? 'animate-spin' : ''} />
                <span>
                  {isSubmitting
                    ? '¡FORJANDO EN EL YUNQUE!'
                    : editingTransaction
                    ? 'GUARDAR MODIFICACIONES'
                    : 'FORJAR MOVIMIENTO'}
                </span>
              </button>
            </div>
          </form>
        </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
