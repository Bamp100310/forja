import React, { useState, useMemo } from 'react'
import { Plus, X, Trash2, Pencil, AlertCircle, ArrowLeft, Search, ArrowUpRight, ArrowDownLeft, ArrowRightLeft, Eye } from 'lucide-react'
import { useForja } from '../context/ForjaContext'
import { formatCOP } from '../domain/money'
import { formatShortDate } from '../domain/dates'
import {
  ACCOUNT_KIND_LABELS,
  LIQUID_ACCOUNT_KINDS,
  TRANSACTION_KIND_LABELS,
  type Account,
  type AccountKind,
  type Transaction,
} from '../domain/types'
import { MoneyInput } from '../components/forms/MoneyInput'
import { PixelSprite } from '../components/common/PixelSprite'
import { CategoryIcon } from '../components/common/CategoryIcon'
import { EmptyState } from '../components/common/EmptyState'
import { sound } from '../services/sound'
import { triggerPixelSparks, triggerButtonSparks } from '../components/common/PixelSparks'

type VaultFlowFilter = 'all' | 'in' | 'out'
type VaultSortOrder = 'desc' | 'asc'

interface VaultLedgerRow {
  tx: Transaction
  delta: number
  balanceBefore: number
  balanceAfter: number
  counterpartyLabel: string
  categoryName: string | null
  categoryIcon: string | null
  categoryColor: string | null
}

export const AccountsPage: React.FC = () => {
  const {
    accounts,
    balances,
    transactions,
    index,
    saveAccount,
    deleteAccount,
    today,
    openQuickModal,
    openTransactionDetail,
  } = useForja()

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [vaultSearch, setVaultSearch] = useState('')
  const [vaultFlowFilter, setVaultFlowFilter] = useState<VaultFlowFilter>('all')
  const [vaultSortOrder, setVaultSortOrder] = useState<VaultSortOrder>('desc')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [name, setName] = useState('')
  const [kind, setKind] = useState<AccountKind>('bank')
  const [openingBalance, setOpeningBalance] = useState<number>(0)
  const [notes, setNotes] = useState('')
  const [isArchived, setIsArchived] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const selectedAccount = useMemo(
    () => (selectedAccountId ? accounts.find((a) => a.id === selectedAccountId) ?? null : null),
    [accounts, selectedAccountId]
  )

  const handleSelectVault = (accId: string | null) => {
    sound.playClick()
    setSelectedAccountId(accId)
    setVaultSearch('')
    setVaultFlowFilter('all')
  }

  // Cálculo del libro Kardex con saldo corrido para la bóveda seleccionada
  const selectedVaultLedger = useMemo(() => {
    if (!selectedAccount) {
      return {
        rows: [] as VaultLedgerRow[],
        totalIn: 0,
        totalOut: 0,
        inCount: 0,
        outCount: 0,
        finalBalance: 0,
      }
    }

    // Filtrar transacciones que tocan esta cuenta y ordenarlas cronológicamente (antiguas -> recientes)
    const txTouchingAccount = transactions
      .filter((t) => t.postings.some((p) => p.targetType === 'account' && p.targetId === selectedAccount.id))
      .slice()
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date)
        return a.createdAt.localeCompare(b.createdAt)
      })

    let running = selectedAccount.openingBalance
    let totalIn = 0
    let totalOut = 0
    let inCount = 0
    let outCount = 0

    const chronologicalRows: VaultLedgerRow[] = txTouchingAccount.map((tx) => {
      const delta = tx.postings
        .filter((p) => p.targetType === 'account' && p.targetId === selectedAccount.id)
        .reduce((sum, p) => sum + p.amount, 0)

      const balanceBefore = running
      const balanceAfter = running + delta
      running = balanceAfter

      if (delta >= 0) {
        totalIn += delta
        inCount += 1
      } else {
        totalOut += Math.abs(delta)
        outCount += 1
      }

      // Identificar contrapartida para mostrar contexto claro al usuario
      let counterpartyLabel = TRANSACTION_KIND_LABELS[tx.kind] || tx.kind
      let categoryName: string | null = null
      let categoryIcon: string | null = null
      let categoryColor: string | null = null

      const catPosting = tx.postings.find((p) => p.targetType === 'category' && p.targetId)
      if (catPosting?.targetId) {
        const cat = index.categories.get(catPosting.targetId)
        if (cat) {
          categoryName = cat.name
          categoryIcon = cat.icon
          categoryColor = cat.color
          counterpartyLabel = `Categoría: ${cat.name}`
        }
      }

      if (tx.kind === 'transfer') {
        const otherAccPosting = tx.postings.find(
          (p) => p.targetType === 'account' && p.targetId && p.targetId !== selectedAccount.id
        )
        const otherAccName = otherAccPosting?.targetId
          ? index.accounts.get(otherAccPosting.targetId)?.name ?? 'Otra bóveda'
          : 'Otra bóveda'
        counterpartyLabel = delta >= 0 ? `Recibido desde: ${otherAccName}` : `Enviado hacia: ${otherAccName}`
      } else if (tx.kind === 'debt_payment' || tx.kind === 'debt_disbursement') {
        const debtPosting = tx.postings.find((p) => p.targetType === 'debt' && p.targetId)
        const debtId = debtPosting?.targetId || tx.debtId
        const debtName = debtId ? index.debts.get(debtId)?.name ?? 'Deuda' : 'Deuda'
        counterpartyLabel =
          tx.kind === 'debt_payment' ? `Abono a obligación: ${debtName}` : `Desembolso de: ${debtName}`
      } else if (tx.kind === 'loan_given' || tx.kind === 'loan_repayment') {
        const loanPosting = tx.postings.find((p) => p.targetType === 'loan' && p.targetId)
        const loanId = loanPosting?.targetId || tx.loanId
        const loanName = loanId ? index.loans.get(loanId)?.personName ?? 'Préstamo' : 'Préstamo'
        counterpartyLabel =
          tx.kind === 'loan_given' ? `Préstamo entregado a: ${loanName}` : `Reembolso recibido de: ${loanName}`
      } else if (tx.kind === 'adjustment') {
        counterpartyLabel = 'Ajuste de cuadre contable'
      }

      return {
        tx,
        delta,
        balanceBefore,
        balanceAfter,
        counterpartyLabel,
        categoryName,
        categoryIcon,
        categoryColor,
      }
    })

    return {
      rows: chronologicalRows,
      totalIn,
      totalOut,
      inCount,
      outCount,
      finalBalance: running,
    }
  }, [selectedAccount, transactions, index])

  const filteredVaultRows = useMemo(() => {
    const q = vaultSearch.trim().toLowerCase()
    const filtered = selectedVaultLedger.rows.filter((row) => {
      if (vaultFlowFilter === 'in' && row.delta < 0) return false
      if (vaultFlowFilter === 'out' && row.delta >= 0) return false
      if (!q) return true
      return (
        row.tx.description.toLowerCase().includes(q) ||
        (row.tx.notes && row.tx.notes.toLowerCase().includes(q)) ||
        row.counterpartyLabel.toLowerCase().includes(q) ||
        row.tx.date.includes(q)
      )
    })

    return vaultSortOrder === 'desc' ? [...filtered].reverse() : filtered
  }, [selectedVaultLedger.rows, vaultSearch, vaultFlowFilter, vaultSortOrder])

  const handleOpenCreate = (e?: React.MouseEvent<HTMLElement>) => {
    sound.playClick()
    if (e) triggerButtonSparks(e, 'forge', 18)
    setEditingAccount(null)
    setName('')
    setKind('bank')
    setOpeningBalance(0)
    setNotes('')
    setIsArchived(false)
    setErrorMessage(null)
    setModalOpen(true)
  }

  const handleOpenEdit = (acc: Account) => {
    sound.playClick()
    setEditingAccount(acc)
    setName(acc.name)
    setKind(acc.kind)
    setOpeningBalance(acc.openingBalance)
    setNotes(acc.notes || '')
    setIsArchived(Boolean(acc.isArchived))
    setErrorMessage(null)
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    if (isSubmitting) return
    sound.playClick()
    setModalOpen(false)
    setEditingAccount(null)
    setErrorMessage(null)
  }

  const handleSubmitAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setErrorMessage('El nombre de la bóveda es obligatorio.')
      return
    }
    setIsSubmitting(true)
    setErrorMessage(null)
    try {
      await saveAccount({
        ...(editingAccount ? { id: editingAccount.id } : {}),
        name: name.trim(),
        kind,
        openingBalance: editingAccount ? editingAccount.openingBalance : openingBalance,
        openingDate: editingAccount ? editingAccount.openingDate : today,
        color: editingAccount ? editingAccount.color : null,
        isArchived,
        notes: notes.trim() || null,
        sortOrder: editingAccount ? editingAccount.sortOrder : accounts.length + 1,
      })
      sound.playConfirm()
      triggerPixelSparks(window.innerWidth / 2, window.innerHeight * 0.45, 'cyan', 14)
      setModalOpen(false)
      setEditingAccount(null)
      setName('')
      setOpeningBalance(0)
      setNotes('')
    } catch (err) {
      sound.playError()
      setErrorMessage((err as Error).message || 'Error al persistir la bóveda')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteAccount = async (id: string, accName: string) => {
    sound.playClick()
    if (window.confirm(`¿Confirmas eliminar la bóveda «${accName}»?`)) {
      try {
        await deleteAccount(id)
        if (selectedAccountId === id) setSelectedAccountId(null)
        sound.playConfirm()
      } catch (err) {
        sound.playError()
        alert((err as Error).message)
      }
    }
  }

  const getAccountSprite = (accKind: AccountKind) => {
    switch (accKind) {
      case 'cash':
        return <PixelSprite name="coins" size={18} />
      case 'wallet':
        return <PixelSprite name="creditCard" size={18} />
      case 'bank':
        return <PixelSprite name="vault" size={18} />
      case 'savings':
        return <PixelSprite name="ingot" size={18} />
      case 'platform_receivable':
        return <PixelSprite name="conveyor" size={18} />
      default:
        return <PixelSprite name="vault" size={18} />
    }
  }

  const getKindBadgeStyle = (txKind: string) => {
    switch (txKind) {
      case 'income':
        return 'bg-emerald-950/90 text-emerald-300 border-emerald-700/80'
      case 'expense':
        return 'bg-rose-950/90 text-rose-300 border-rose-700/80'
      case 'transfer':
        return 'bg-cyan-950/90 text-cyan-300 border-cyan-700/80'
      case 'debt_payment':
      case 'debt_disbursement':
        return 'bg-amber-950/90 text-amber-300 border-amber-700/80'
      case 'loan_given':
      case 'loan_repayment':
        return 'bg-purple-950/90 text-purple-300 border-purple-700/80'
      default:
        return 'bg-slate-900 text-slate-300 border-slate-700'
    }
  }

  return (
    <div className="space-y-5">
      {/* Cabecera del Centro de Tesorería */}
      <div className="forge-machine-panel rivet-corners p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-[#101d18] border border-cyan-800/80 flex items-center justify-center text-cyan-400 shrink-0 shadow-inner">
            <PixelSprite name="vault" size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="led-pilot led-pilot-cyan"></span>
              <h2 className="font-pixel text-lg sm:text-xl font-bold text-cyan-400 tracking-wider">
                BÓVEDAS Y DISPONIBILIDAD LÍQUIDA
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center flex-wrap gap-2">
              <span>
                Disponible real:{' '}
                <span className="font-pixel font-bold num text-emerald-400">
                  {formatCOP(balances.available)}
                </span>
              </span>
              <span>•</span>
              <span>
                Por liquidar en plataformas:{' '}
                <span className="font-pixel font-bold num text-amber-400">
                  {formatCOP(balances.platformReceivable)}
                </span>
              </span>
              {balances.platformReceivable > 0 && (
                <button
                  onClick={(e) => {
                    sound.playClick()
                    triggerButtonSparks(e, 'amber', 14)
                    openQuickModal('loan_repayment', null, {
                      collectionSource: 'platform',
                    })
                  }}
                  className="badge-pixel bg-amber-950/80 text-amber-300 border-amber-600 hover:bg-amber-900/90 text-[9px] px-2 py-0.5 cursor-pointer font-pixel transition-colors"
                  title="Cobrar pedidos en efectivo o liquidar saldo de aplicaciones"
                >
                  ⚡ COBRAR SALDO DE APPS
                </button>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={(e) => {
              sound.playClick()
              triggerButtonSparks(e, 'cyan', 14)
              openQuickModal('transfer')
            }}
            className="btn-game btn-game-secondary btn-forge-heat text-xs py-2 px-3 flex items-center gap-2 cursor-pointer font-pixel"
          >
            <PixelSprite name="conveyor" size={14} />
            <span>TRANSFERIR</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="btn-game btn-game-primary btn-forge-heat text-xs py-2 px-3.5 flex items-center gap-2 cursor-pointer font-pixel font-bold"
          >
            <Plus size={15} />
            <span>NUEVA BÓVEDA</span>
          </button>
        </div>
      </div>

      {/* Selector Rápido de Bóvedas (Pestañas de Estación) */}
      {accounts.length > 0 && (
        <div className="forge-subpanel p-2.5 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => handleSelectVault(null)}
            className={`px-3 py-2 rounded-xs font-pixel text-xs flex items-center gap-2 shrink-0 cursor-pointer border-2 transition-all ${
              selectedAccount === null
                ? 'bg-[#26170a] border-amber-500 text-amber-300 font-bold shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                : 'bg-[#09110e] border-[#1c3029] text-slate-400 hover:text-slate-200 hover:border-slate-600'
            }`}
          >
            <PixelSprite name="vault" size={15} />
            <span>TODAS LAS BÓVEDAS ({accounts.length})</span>
          </button>

          {accounts.map((acc) => {
            const bal = balances.accountBalance.get(acc.id) ?? acc.openingBalance
            const isSelected = selectedAccount?.id === acc.id
            const txCount = transactions.filter((t) =>
              t.postings.some((p) => p.targetType === 'account' && p.targetId === acc.id)
            ).length

            return (
              <button
                key={acc.id}
                type="button"
                onClick={() => handleSelectVault(acc.id)}
                className={`px-3 py-2 rounded-xs font-pixel text-xs flex items-center gap-2.5 shrink-0 cursor-pointer border-2 transition-all ${
                  isSelected
                    ? 'bg-[#10241d] border-emerald-500 text-emerald-300 font-bold shadow-[0_0_14px_rgba(16,185,129,0.25)]'
                    : 'bg-[#09110e] border-[#1c3029] text-slate-300 hover:border-emerald-700/70 hover:bg-[#0e1a16]'
                }`}
              >
                {getAccountSprite(acc.kind)}
                <span className="truncate max-w-[140px]">{acc.name}</span>
                <span
                  className={`font-mono text-[11px] px-1.5 py-0.5 rounded-xs border ${
                    bal >= 0
                      ? 'bg-[#07120e] text-emerald-400 border-emerald-900/80'
                      : 'bg-rose-950/60 text-rose-300 border-rose-800/80'
                  }`}
                >
                  {formatCOP(bal)}
                </span>
                <span className="text-[10px] text-slate-500">({txCount})</span>
              </button>
            )
          })}
        </div>
      )}

      {/* VISTA INDIVIDUAL DE BÓVEDA (EXTRACTO Y KARDEX COMPLETO) */}
      {selectedAccount ? (
        <div className="space-y-4">
          {/* Panel Superior de Telemetría y Control de la Bóveda */}
          <div className="forge-machine-panel rivet-corners p-4 sm:p-5 space-y-4 border-2 border-emerald-800/70">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#1c3029]">
              <div className="flex items-start sm:items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleSelectVault(null)}
                  className="btn-game btn-game-secondary px-2.5 py-2 text-xs font-pixel flex items-center gap-1.5 cursor-pointer shrink-0"
                  title="Volver a la cuadrícula de todas las bóvedas"
                >
                  <ArrowLeft size={15} />
                  <span className="hidden sm:inline">VOLVER</span>
                </button>

                <div className="w-11 h-11 rounded bg-[#101d18] border-2 border-emerald-700/70 flex items-center justify-center shrink-0">
                  {getAccountSprite(selectedAccount.kind)}
                </div>

                <div>
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="led-pilot led-pilot-online" />
                    <h3 className="font-stencil text-base sm:text-lg font-bold text-slate-100 tracking-wide uppercase">
                      EXTRACTO DE BÓVEDA: {selectedAccount.name}
                    </h3>
                    <span
                      className={`badge-pixel text-[9px] px-2 py-0.5 ${
                        LIQUID_ACCOUNT_KINDS.includes(selectedAccount.kind)
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                          : 'bg-amber-950/80 text-amber-300 border-amber-800'
                      }`}
                    >
                      {ACCOUNT_KIND_LABELS[selectedAccount.kind]}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-pixel mt-0.5">
                    {selectedAccount.notes
                      ? selectedAccount.notes
                      : 'Libro Kardex cronológico con saldo corrido paso a paso desde la apertura de la bóveda'}
                  </p>
                </div>
              </div>

              {/* Acciones directas sobre esta bóveda */}
              <div className="flex flex-wrap items-center gap-2">
                {selectedAccount.kind === 'platform_receivable' ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      sound.playClick()
                      triggerButtonSparks(e, 'amber', 14)
                      openQuickModal('loan_repayment', null, {
                        collectionSource: 'platform',
                        fromAccountId: selectedAccount.id,
                        description: `Cobro en efectivo pedido ${selectedAccount.name}`,
                        isMoto: true,
                      })
                    }}
                    className="btn-game btn-game-primary text-xs py-2 px-3 font-pixel flex items-center gap-1.5 cursor-pointer"
                  >
                    <PixelSprite name="ledger_check" size={14} />
                    <span>+ COBRAR A EFECTIVO / BANCO</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        sound.playClick()
                        triggerButtonSparks(e, 'emerald', 12)
                        openQuickModal('income', null, { accountId: selectedAccount.id })
                      }}
                      className="btn-game btn-game-secondary text-xs py-1.5 px-2.5 font-pixel flex items-center gap-1.5 cursor-pointer text-emerald-300 border-emerald-800/80 hover:border-emerald-500"
                    >
                      <ArrowDownLeft size={14} />
                      <span>+ ENTRADA AQUÍ</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        sound.playClick()
                        triggerButtonSparks(e, 'amber', 12)
                        openQuickModal('expense', null, { accountId: selectedAccount.id })
                      }}
                      className="btn-game btn-game-secondary text-xs py-1.5 px-2.5 font-pixel flex items-center gap-1.5 cursor-pointer text-rose-300 border-rose-800/80 hover:border-rose-500"
                    >
                      <ArrowUpRight size={14} />
                      <span>− SALIDA AQUÍ</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    sound.playClick()
                    triggerButtonSparks(e, 'cyan', 12)
                    openQuickModal('transfer', null, { fromAccountId: selectedAccount.id })
                  }}
                  className="btn-game btn-game-secondary text-xs py-1.5 px-2.5 font-pixel flex items-center gap-1.5 cursor-pointer text-cyan-300 border-cyan-800/80 hover:border-cyan-500"
                >
                  <ArrowRightLeft size={14} />
                  <span>TRANSFERIR</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenEdit(selectedAccount)}
                  className="btn-game btn-game-secondary text-xs py-1.5 px-2.5 font-pixel flex items-center gap-1.5 cursor-pointer text-slate-300"
                  title="Modificar configuración de la bóveda"
                >
                  <Pencil size={13} />
                  <span>EDITAR</span>
                </button>
              </div>
            </div>

            {/* 4 Indicadores de Conciliación de la Bóveda */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-[#09110e] border border-[#1d3129] p-3 rounded-xs">
                <span className="text-[10px] font-pixel text-slate-400 uppercase tracking-wider block">
                  1. SALDO INICIAL DE APERTURA
                </span>
                <div className="font-pixel font-bold num text-lg sm:text-xl text-slate-200 mt-0.5">
                  {formatCOP(selectedAccount.openingBalance)}
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  Fecha base: {formatShortDate(selectedAccount.openingDate, true)}
                </span>
              </div>

              <div className="bg-[#081510] border border-emerald-900/70 p-3 rounded-xs">
                <span className="text-[10px] font-pixel text-emerald-400/90 uppercase tracking-wider block">
                  2. TOTAL ENTRADAS A BÓVEDA (+)
                </span>
                <div className="font-pixel font-bold num text-lg sm:text-xl text-emerald-400 mt-0.5">
                  +{formatCOP(selectedVaultLedger.totalIn)}
                </div>
                <span className="text-[10px] text-emerald-500/80 font-mono">
                  {selectedVaultLedger.inCount} {selectedVaultLedger.inCount === 1 ? 'abono registrado' : 'abonos registrados'}
                </span>
              </div>

              <div className="bg-[#160b0e] border border-rose-900/70 p-3 rounded-xs">
                <span className="text-[10px] font-pixel text-rose-400/90 uppercase tracking-wider block">
                  3. TOTAL SALIDAS DE BÓVEDA (−)
                </span>
                <div className="font-pixel font-bold num text-lg sm:text-xl text-rose-400 mt-0.5">
                  −{formatCOP(selectedVaultLedger.totalOut)}
                </div>
                <span className="text-[10px] text-rose-400/80 font-mono">
                  {selectedVaultLedger.outCount} {selectedVaultLedger.outCount === 1 ? 'retiro o pago' : 'retiros o pagos'}
                </span>
              </div>

              <div className="bg-[#0c1a15] border-2 border-amber-600/80 p-3 rounded-xs shadow-inner">
                <span className="text-[10px] font-pixel text-amber-300 uppercase tracking-wider block font-bold">
                  4. SALDO ACTUAL EN BÓVEDA (=)
                </span>
                <div
                  className={`font-pixel font-bold num text-xl sm:text-2xl mt-0.5 ${
                    selectedVaultLedger.finalBalance >= 0 ? 'text-amber-300' : 'text-rose-400'
                  }`}
                >
                  {formatCOP(selectedVaultLedger.finalBalance)}
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {selectedVaultLedger.rows.length} movimientos en total
                </span>
              </div>
            </div>
          </div>

          {/* Barra de Búsqueda y Filtros del Libro de la Bóveda */}
          <div className="forge-machine-panel rivet-corners p-4 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#1c3029]">
              <div className="relative flex-1 max-w-md">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={vaultSearch}
                  onChange={(e) => setVaultSearch(e.target.value)}
                  placeholder={`Buscar movimiento en ${selectedAccount.name}...`}
                  className="w-full bg-[#080d0c] border border-[#213731] rounded-xs pl-9 pr-3 py-2 text-xs text-slate-200 font-pixel focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick()
                    setVaultFlowFilter('all')
                  }}
                  className={`px-2.5 py-1.5 rounded-xs text-[11px] font-pixel border cursor-pointer transition-colors ${
                    vaultFlowFilter === 'all'
                      ? 'bg-[#26170a] text-amber-300 border-amber-500 font-bold'
                      : 'bg-[#09110e] text-slate-400 border-[#1d3129] hover:text-slate-200'
                  }`}
                >
                  TODOS ({selectedVaultLedger.rows.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick()
                    setVaultFlowFilter('in')
                  }}
                  className={`px-2.5 py-1.5 rounded-xs text-[11px] font-pixel border cursor-pointer transition-colors ${
                    vaultFlowFilter === 'in'
                      ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500 font-bold'
                      : 'bg-[#09110e] text-slate-400 border-[#1d3129] hover:text-emerald-300'
                  }`}
                >
                  ENTRADAS + ({selectedVaultLedger.inCount})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick()
                    setVaultFlowFilter('out')
                  }}
                  className={`px-2.5 py-1.5 rounded-xs text-[11px] font-pixel border cursor-pointer transition-colors ${
                    vaultFlowFilter === 'out'
                      ? 'bg-rose-950/90 text-rose-300 border-rose-500 font-bold'
                      : 'bg-[#09110e] text-slate-400 border-[#1d3129] hover:text-rose-300'
                  }`}
                >
                  SALIDAS − ({selectedVaultLedger.outCount})
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sound.playClick()
                    setVaultSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))
                  }}
                  className="px-2.5 py-1.5 rounded-xs text-[11px] font-pixel border bg-[#0c1613] text-cyan-300 border-cyan-800/70 hover:border-cyan-500 cursor-pointer transition-colors"
                  title="Cambiar orden cronológico"
                >
                  {vaultSortOrder === 'desc' ? 'ORDEN: MÁS RECIENTES ↓' : 'ORDEN: DESDE APERTURA ↑'}
                </button>
              </div>
            </div>

            {/* Listado Kardex de Movimientos de la Bóveda */}
            {filteredVaultRows.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <p className="font-pixel text-sm text-slate-300">
                  No hay movimientos en «{selectedAccount.name}» que coincidan con el filtro actual.
                </p>
                <p className="text-xs text-slate-500 font-pixel">
                  Saldo de apertura ({formatShortDate(selectedAccount.openingDate, true)}):{' '}
                  {formatCOP(selectedAccount.openingBalance)}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {vaultSortOrder === 'asc' && (
                  <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xs bg-[#091310] border border-dashed border-emerald-800/70 text-xs font-pixel">
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="led-pilot led-pilot-cyan" />
                      <span className="font-bold text-cyan-300">🏁 APERTURA DE BÓVEDA</span>
                      <span className="text-slate-500">•</span>
                      <span className="font-mono text-slate-400">
                        {formatShortDate(selectedAccount.openingDate, true)}
                      </span>
                    </div>
                    <div className="font-mono font-bold text-slate-200">
                      Saldo base: {formatCOP(selectedAccount.openingBalance)}
                    </div>
                  </div>
                )}

                {filteredVaultRows.map((row) => {
                  const isPositive = row.delta >= 0
                  return (
                    <div
                      key={row.tx.id}
                      onClick={() => {
                        sound.playClick()
                        openTransactionDetail(row.tx)
                      }}
                      className="group bg-[#0a1310] hover:bg-[#101f1a] border border-[#1b2f28] hover:border-amber-500/70 rounded-xs p-3 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Icono de Categoría o Flujo */}
                        <div className="mt-0.5 shrink-0">
                          {row.categoryIcon ? (
                            <CategoryIcon
                              icon={row.categoryIcon}
                              categoryName={row.categoryName || row.tx.description}
                              kind={row.delta >= 0 ? 'income' : 'expense'}
                              isMoto={row.tx.isMoto}
                              color={row.categoryColor}
                              size={18}
                            />
                          ) : (
                            <div
                              className={`w-9 h-9 rounded-xs border flex items-center justify-center ${
                                isPositive
                                  ? 'bg-emerald-950/60 border-emerald-700/70 text-emerald-400'
                                  : 'bg-rose-950/60 border-rose-700/70 text-rose-400'
                              }`}
                            >
                              {row.tx.kind === 'transfer' ? (
                                <ArrowRightLeft size={16} />
                              ) : isPositive ? (
                                <ArrowDownLeft size={16} />
                              ) : (
                                <ArrowUpRight size={16} />
                              )}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center flex-wrap gap-1.5">
                            <span className="font-mono text-[11px] text-slate-400">
                              {formatShortDate(row.tx.date, true)}
                            </span>
                            <span
                              className={`badge-pixel text-[9px] px-1.5 py-0.5 border ${getKindBadgeStyle(
                                row.tx.kind
                              )}`}
                            >
                              {TRANSACTION_KIND_LABELS[row.tx.kind] || row.tx.kind}
                            </span>
                            {row.tx.isMoto && (
                              <span className="badge-pixel text-[9px] px-1.5 py-0.5 bg-amber-950/80 text-amber-300 border-amber-700/70">
                                🏍️ MOTO
                              </span>
                            )}
                          </div>

                          <div className="font-bold text-slate-100 text-sm mt-1 truncate group-hover:text-amber-300 transition-colors">
                            {row.tx.description}
                          </div>

                          <div className="text-[11px] text-slate-400 font-pixel mt-0.5 flex items-center flex-wrap gap-2">
                            <span>{row.counterpartyLabel}</span>
                            {row.tx.notes && (
                              <>
                                <span>•</span>
                                <span className="text-slate-500 italic truncate max-w-xs">
                                  “{row.tx.notes}”
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Columna Derecha: Variación en la Bóveda + Saldo Acumulado (Running Balance) */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#162620] shrink-0">
                        <div className="text-left sm:text-right">
                          <div
                            className={`font-pixel font-bold num text-base sm:text-lg tracking-tight ${
                              isPositive ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {isPositive ? '+' : '−'}
                            {formatCOP(Math.abs(row.delta))}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400">
                            Saldo:{' '}
                            <span
                              className={`font-bold ${
                                row.balanceAfter >= 0 ? 'text-slate-200' : 'text-rose-400'
                              }`}
                            >
                              {formatCOP(row.balanceAfter)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              sound.playClick()
                              openQuickModal(row.tx.kind, row.tx)
                            }}
                            className="p-1.5 rounded-xs bg-[#101d18] hover:bg-[#192e26] text-slate-400 hover:text-amber-300 border border-[#213731] transition-colors cursor-pointer"
                            title="Editar este movimiento"
                            aria-label="Editar este movimiento"
                          >
                            <Pencil size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {vaultSortOrder === 'desc' && (
                  <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xs bg-[#091310] border border-dashed border-emerald-800/70 text-xs font-pixel">
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="led-pilot led-pilot-cyan" />
                      <span className="font-bold text-cyan-300">🏁 APERTURA DE BÓVEDA</span>
                      <span className="text-slate-500">•</span>
                      <span className="font-mono text-slate-400">
                        {formatShortDate(selectedAccount.openingDate, true)}
                      </span>
                    </div>
                    <div className="font-mono font-bold text-slate-200">
                      Saldo base: {formatCOP(selectedAccount.openingBalance)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : accounts.length === 0 ? (
        <EmptyState
          sprite="empty_crate"
          title="Sin bóvedas o cuentas instaladas"
          description="Crea tu primera caja de efectivo, cuenta de ahorros o billetera virtual para gestionar tus flujos."
          actionLabel="+ INSTALAR PRIMERA BÓVEDA"
          onAction={handleOpenCreate}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc) => {
            const balance = balances.accountBalance.get(acc.id) ?? acc.openingBalance
            const isLiquid = LIQUID_ACCOUNT_KINDS.includes(acc.kind)

            const allAccTransactions = transactions.filter((t) =>
              t.postings.some((p) => p.targetType === 'account' && p.targetId === acc.id)
            )
            // Últimos 3 movimientos en esta cuenta
            const recent = allAccTransactions.slice(0, 3)

            return (
              <div
                key={acc.id}
                className="forge-machine-panel rivet-corners p-4 flex flex-col justify-between hover:border-emerald-700/80 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => handleSelectVault(acc.id)}
                      className="flex items-center gap-2.5 text-left group cursor-pointer"
                      title={`Abrir extracto de ${acc.name}`}
                    >
                      <div className="w-9 h-9 rounded bg-[#101d18] border border-[#213731] group-hover:border-amber-500/80 flex items-center justify-center shrink-0 transition-colors">
                        {getAccountSprite(acc.kind)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-slate-100 group-hover:text-amber-300 text-sm transition-colors">
                            {acc.name}
                          </h3>
                          {acc.isArchived && (
                            <span className="badge-pixel text-[8px] bg-slate-800 text-slate-400 border-slate-600 px-1">
                              ARCHIVADA
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-pixel tracking-wider uppercase">
                          {ACCOUNT_KIND_LABELS[acc.kind]}
                        </span>
                      </div>
                    </button>

                    <div className="flex items-center gap-1.5">
                      {acc.kind === 'platform_receivable' ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            sound.playClick()
                            triggerButtonSparks(e, 'amber', 14)
                            openQuickModal('loan_repayment', null, {
                              collectionSource: 'platform',
                              fromAccountId: acc.id,
                              description: `Cobro en efectivo pedido ${acc.name}`,
                              isMoto: true,
                            })
                          }}
                          className="badge-pixel text-[9px] px-2 py-0.5 bg-amber-950/90 text-amber-300 border-amber-600 hover:bg-amber-900 cursor-pointer transition-colors"
                          title="Haz clic para cobrar pedidos en efectivo o liquidar saldo"
                        >
                          POR COBRAR ⚡
                        </button>
                      ) : (
                        <span
                          className={`badge-pixel text-[9px] px-2 py-0.5 ${
                            isLiquid
                              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                              : 'bg-amber-950/80 text-amber-300 border-amber-800'
                          }`}
                        >
                          {isLiquid ? 'LÍQUIDO DISPONIBLE' : 'POR COBRAR'}
                        </span>
                      )}
                      <button
                        onClick={() => handleOpenEdit(acc)}
                        className="p-1 rounded text-slate-400 hover:text-emerald-400 hover:bg-[#132620] transition-colors cursor-pointer"
                        title="Modificar bóveda"
                        aria-label="Modificar bóveda"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteAccount(acc.id, acc.name)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Eliminar bóveda"
                        aria-label="Eliminar bóveda"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectVault(acc.id)}
                    className="w-full text-left bg-[#0b1311] hover:bg-[#0f1c18] border border-[#1e342c] hover:border-emerald-600/70 p-3 rounded transition-colors cursor-pointer group"
                    title={`Inspeccionar los ${allAccTransactions.length} movimientos de ${acc.name}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-pixel uppercase tracking-wider block">
                        {acc.kind === 'platform_receivable'
                          ? 'SALDO PENDIENTE POR COBRAR (APP)'
                          : 'SALDO DISPONIBLE EN BÓVEDA'}
                      </span>
                      <span className="text-[10px] font-pixel text-emerald-400 opacity-80 group-hover:opacity-100 flex items-center gap-1">
                        <Eye size={12} />
                        <span>VER EXTRACTO ({allAccTransactions.length})</span>
                      </span>
                    </div>
                    <div
                      className={`font-pixel font-bold num text-2xl tracking-tight mt-0.5 ${
                        acc.kind === 'platform_receivable'
                          ? 'text-amber-300'
                          : balance >= 0
                          ? 'text-slate-100'
                          : 'text-rose-400'
                      }`}
                    >
                      {formatCOP(balance)}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 font-mono">
                      {acc.kind === 'platform_receivable'
                        ? 'Saldo retenido: cobros de pedidos en efectivo o dispersión semanal'
                        : `Apertura: ${formatCOP(acc.openingBalance)} (${formatShortDate(acc.openingDate, true)})`}
                    </p>
                  </button>

                  {/* Botón directo de acción para cobrar o transferir */}
                  {acc.kind === 'platform_receivable' ? (
                    <button
                      onClick={(e) => {
                        sound.playClick()
                        triggerButtonSparks(e, 'amber', 14)
                        openQuickModal('loan_repayment', null, {
                          collectionSource: 'platform',
                          fromAccountId: acc.id,
                          description: `Cobro en efectivo pedido ${acc.name}`,
                          isMoto: true,
                        })
                      }}
                      className="w-full mt-2.5 btn-game btn-game-primary text-xs py-2 px-3 font-pixel flex items-center justify-center gap-1.5 cursor-pointer shadow-md border-2 border-amber-600 bg-gradient-to-r from-[#2c170a] to-[#1a1007] text-amber-300 hover:text-white"
                    >
                      <PixelSprite name="ledger_check" size={14} />
                      <span>+ COBRAR A EFECTIVO / BANCO</span>
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        sound.playClick()
                        triggerButtonSparks(e, 'cyan', 12)
                        openQuickModal('transfer', null, {
                          fromAccountId: acc.id,
                        })
                      }}
                      className="w-full mt-2.5 btn-game btn-game-secondary text-[11px] py-1.5 px-3 font-pixel flex items-center justify-center gap-1.5 cursor-pointer text-slate-300 hover:text-cyan-300"
                    >
                      <PixelSprite name="conveyor" size={13} />
                      <span>TRANSFERIR DESDE AQUÍ</span>
                    </button>
                  )}
                </div>

                {/* Movimientos recientes de la cuenta */}
                <div className="mt-4 pt-3 border-t border-[#182622]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-pixel text-slate-400 uppercase tracking-wider">
                      ÚLTIMAS ENTRADAS / SALIDAS ({allAccTransactions.length})
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80"></span>
                  </div>
                  {recent.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic">Sin movimientos recientes</p>
                  ) : (
                    <div className="space-y-1.5">
                      {recent.map((tx) => {
                        const posting = tx.postings.find((p) => p.targetType === 'account' && p.targetId === acc.id)
                        const isPositive = (posting?.amount ?? 0) > 0

                        return (
                          <button
                            key={tx.id}
                            type="button"
                            onClick={() => {
                              sound.playClick()
                              openTransactionDetail(tx)
                            }}
                            className="w-full flex items-center justify-between text-[11px] bg-[#0d1614] hover:bg-[#13241f] px-2 py-1 rounded border border-[#1a2d26] hover:border-amber-500/60 transition-colors cursor-pointer text-left"
                            title="Ver detalle del movimiento"
                          >
                            <div className="flex items-center gap-1.5 min-w-0 pr-2">
                              <span className="text-[10px] font-mono text-slate-500 shrink-0">
                                {formatShortDate(tx.date)}
                              </span>
                              <span className="text-slate-300 truncate">{tx.description}</span>
                            </div>
                            <span
                              className={`font-pixel font-bold num text-xs tracking-tight shrink-0 ${
                                isPositive ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {isPositive ? '+' : '−'}
                              {formatCOP(Math.abs(posting?.amount ?? 0))}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* Botón para entrar al Kardex completo de la bóveda */}
                  <button
                    type="button"
                    onClick={() => handleSelectVault(acc.id)}
                    className="w-full mt-2.5 py-1.5 px-2.5 rounded-xs bg-[#091310] hover:bg-[#11241e] border border-[#1e362d] hover:border-emerald-500/80 text-[11px] font-pixel text-emerald-300 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Eye size={13} />
                    <span>VER TODOS LOS MOVIMIENTOS ({allAccTransactions.length}) →</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL NUEVA / EDITAR CUENTA */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="forge-modal-box rivet-corners max-w-xl w-full p-5 sm:p-6 border-2 border-emerald-800/80 shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-3.5 border-b-2 border-[#1c3029]">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-xs bg-[#10201a] border border-emerald-700/60">
                  <PixelSprite name="vault" size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="led-pilot led-pilot-online" />
                    <h3 className="font-stencil text-base text-emerald-400 font-bold tracking-wide">
                      {editingAccount ? 'MODIFICAR BÓVEDA O CUENTA' : 'INSTALAR NUEVA BÓVEDA O CUENTA'}
                    </h3>
                  </div>
                  <p className="text-[10px] text-slate-400 font-pixel">
                    Estación de almacenamiento líquido y saldos de plataforma
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                disabled={isSubmitting}
                className="p-1.5 rounded-xs text-slate-400 hover:text-slate-100 bg-[#111c18] hover:bg-[#1a2d25] border border-[#264136] transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {errorMessage && (
              <div className="flex items-start gap-2 bg-rose-950/80 border border-rose-800 text-rose-300 p-2.5 rounded-xs text-xs font-pixel mb-3">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmitAccount} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                  NOMBRE DE LA CUENTA / BÓVEDA
                </label>
                <input
                  type="text"
                  placeholder="Ej. Billetera Nequi / Bancolombia / Rappi"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-[#080d0c] border border-[#213731] rounded-xs p-2 text-slate-200 text-xs font-pixel focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                  TIPO DE BÓVEDA
                </label>
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value as AccountKind)}
                  className="w-full bg-[#080d0c] border border-[#213731] rounded-xs p-2 text-slate-200 text-xs font-pixel focus:outline-none focus:border-amber-400"
                >
                  <option value="cash">Efectivo en caja</option>
                  <option value="bank">Cuenta bancaria comercial</option>
                  <option value="wallet">Billetera digital (Nequi, Daviplata)</option>
                  <option value="savings">Reserva de ahorro / bolsillo</option>
                  <option value="platform_receivable">Saldo en plataforma (Rappi, Didi, etc.)</option>
                  <option value="other">Otra cuenta</option>
                </select>
              </div>

              {editingAccount ? (
                <div>
                  <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                    SALDO INICIAL DE APERTURA (FIJO)
                  </label>
                  <div className="bg-[#080d0c] border border-[#213731] rounded-xs p-2 text-slate-400 text-xs font-mono">
                    {formatCOP(openingBalance)}
                  </div>
                  <p className="text-[10px] text-amber-400/90 font-pixel mt-1">
                    Para preservar la partida doble histórica, el saldo inicial no se altera directamente. Usa un movimiento de Ajuste si requieres cuadrar saldos.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                    SALDO INICIAL (COP)
                  </label>
                  <MoneyInput value={openingBalance} onChange={setOpeningBalance} placeholder="0" showQuickIngots={true} />
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                  NOTAS OPERATIVAS (OPCIONAL)
                </label>
                <input
                  type="text"
                  placeholder="Detalles sobre uso..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-[#080d0c] border border-[#213731] rounded-xs p-2 text-slate-200 text-xs font-pixel focus:outline-none focus:border-amber-400"
                />
              </div>

              {editingAccount && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="acc-archived"
                    checked={isArchived}
                    onChange={(e) => setIsArchived(e.target.checked)}
                    className="rounded-xs border border-[#213731] text-amber-500 bg-[#080d0c] cursor-pointer"
                  />
                  <label htmlFor="acc-archived" className="text-xs text-slate-300 font-pixel uppercase tracking-wider cursor-pointer font-bold select-none">
                    Archivar bóveda (oculta de listas activas sin alterar asientos)
                  </label>
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-3.5 border-t-2 border-[#1c3029]">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="btn-game btn-game-secondary text-xs py-2 px-3.5 font-pixel"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-game btn-game-primary text-xs py-2 px-4.5 font-pixel font-bold flex items-center gap-2"
                >
                  <span>{isSubmitting ? 'GUARDANDO...' : (editingAccount ? 'GUARDAR MODIFICACIONES' : 'GUARDAR BÓVEDA')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

