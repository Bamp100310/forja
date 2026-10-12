import React, { useState } from 'react'
import { Plus, X, Trash2 } from 'lucide-react'
import { useForja } from '../context/ForjaContext'
import { formatCOP } from '../domain/money'
import { formatShortDate } from '../domain/dates'
import { ACCOUNT_KIND_LABELS, LIQUID_ACCOUNT_KINDS, type AccountKind } from '../domain/types'
import { MoneyInput } from '../components/forms/MoneyInput'
import { PixelSprite } from '../components/common/PixelSprite'
import { EmptyState } from '../components/common/EmptyState'
import { sound } from '../services/sound'
import { triggerPixelSparks, triggerButtonSparks } from '../components/common/PixelSparks'

export const AccountsPage: React.FC = () => {
  const { accounts, balances, transactions, saveAccount, deleteAccount, today, openQuickModal } = useForja()
  const [modalOpen, setModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [kind, setKind] = useState<AccountKind>('bank')
  const [openingBalance, setOpeningBalance] = useState<number>(0)
  const [notes, setNotes] = useState('')

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await saveAccount({
        name: name.trim(),
        kind,
        openingBalance,
        openingDate: today,
        color: null,
        isArchived: false,
        notes: notes.trim() || null,
        sortOrder: accounts.length + 1,
      })
      sound.playConfirm()
      triggerPixelSparks(window.innerWidth / 2, window.innerHeight * 0.45, 'cyan', 14)
      setModalOpen(false)
      setName('')
      setOpeningBalance(0)
      setNotes('')
    } catch (err) {
      sound.playError()
      alert((err as Error).message)
    }
  }

  const handleDeleteAccount = async (id: string, accName: string) => {
    sound.playClick()
    if (window.confirm(`¿Confirmas eliminar la bóveda «${accName}»?`)) {
      try {
        await deleteAccount(id)
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
            <p className="text-xs text-slate-400 mt-0.5">
              Disponible real:{' '}
              <span className="font-pixel font-bold num text-emerald-400">
                {formatCOP(balances.available)}
              </span>{' '}
              • Por liquidar en plataformas:{' '}
              <span className="font-pixel font-bold num text-amber-400">
                {formatCOP(balances.platformReceivable)}
              </span>
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
            onClick={(e) => {
              sound.playClick()
              triggerButtonSparks(e, 'forge', 18)
              setModalOpen(true)
            }}
            className="btn-game btn-game-primary btn-forge-heat text-xs py-2 px-3.5 flex items-center gap-2 cursor-pointer font-pixel font-bold"
          >
            <Plus size={15} />
            <span>NUEVA BÓVEDA</span>
          </button>
        </div>
      </div>

      {/* Grid de Bóvedas / Cuentas o Estado Vacío */}
      {accounts.length === 0 ? (
        <EmptyState
          sprite="empty_crate"
          title="Sin bóvedas o cuentas instaladas"
          description="Crea tu primera caja de efectivo, cuenta de ahorros o billetera virtual para gestionar tus flujos."
          actionLabel="+ INSTALAR PRIMERA BÓVEDA"
          onAction={() => setModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc) => {
            const balance = balances.accountBalance.get(acc.id) ?? acc.openingBalance
            const isLiquid = LIQUID_ACCOUNT_KINDS.includes(acc.kind)

          // Últimos 3 movimientos en esta cuenta
          const recent = transactions
            .filter((t) => t.postings.some((p) => p.targetType === 'account' && p.targetId === acc.id))
            .slice(0, 3)

          return (
            <div key={acc.id} className="forge-machine-panel rivet-corners p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded bg-[#101d18] border border-[#213731] flex items-center justify-center shrink-0">
                      {getAccountSprite(acc.kind)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-100 text-sm">{acc.name}</h3>
                      <span className="text-[10px] text-slate-400 font-pixel tracking-wider uppercase">
                        {ACCOUNT_KIND_LABELS[acc.kind]}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`badge-pixel text-[9px] px-2 py-0.5 ${
                        isLiquid
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                          : 'bg-amber-950/80 text-amber-300 border-amber-800'
                      }`}
                    >
                      {isLiquid ? 'LÍQUIDO DISPONIBLE' : 'POR COBRAR'}
                    </span>
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

                <div className="bg-[#0b1311] border border-[#1e342c] p-3 rounded">
                  <span className="text-[10px] text-slate-400 font-pixel uppercase tracking-wider block">
                    SALDO DISPONIBLE EN BÓVEDA
                  </span>
                  <div
                    className={`font-pixel font-bold num text-2xl tracking-tight mt-0.5 ${
                      balance >= 0 ? 'text-slate-100' : 'text-rose-400'
                    }`}
                  >
                    {formatCOP(balance)}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 font-mono">
                    Apertura: {formatCOP(acc.openingBalance)} ({formatShortDate(acc.openingDate, true)})
                  </p>
                </div>
              </div>

              {/* Movimientos recientes de la cuenta */}
              <div className="mt-4 pt-3 border-t border-[#182622]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-pixel text-slate-400 uppercase tracking-wider">
                    ÚLTIMAS ENTRADAS / SALIDAS
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
                        <div key={tx.id} className="flex items-center justify-between text-[11px] bg-[#0d1614] px-2 py-1 rounded border border-[#1a2d26]">
                          <span className="text-slate-300 truncate max-w-[150px]">{tx.description}</span>
                          <span
                            className={`font-pixel font-bold num text-xs tracking-tight ${
                              isPositive ? 'text-emerald-400' : 'text-slate-300'
                            }`}
                          >
                            {isPositive ? '+' : '−'}
                            {formatCOP(Math.abs(posting?.amount ?? 0))}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      )}

      {/* MODAL NUEVA CUENTA */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="forge-modal-box rivet-corners max-w-md w-full p-5 border-2 border-emerald-800/80 shadow-2xl">
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b-2 border-[#1c3029]">
              <div className="flex items-center gap-2">
                <PixelSprite name="vault" size={20} />
                <h3 className="font-stencil text-base text-emerald-400 font-bold tracking-wide">
                  INSTALAR NUEVA BÓVEDA O CUENTA
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-xs text-slate-400 hover:text-slate-100 hover:bg-[#1a2d25] border border-transparent hover:border-[#2f5243] transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateAccount} className="space-y-3.5 text-xs">
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

              <div>
                <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                  SALDO INICIAL (COP)
                </label>
                <MoneyInput value={openingBalance} onChange={setOpeningBalance} placeholder="0" />
              </div>

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

              <div className="flex justify-end gap-2.5 pt-3.5 border-t-2 border-[#1c3029]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-game btn-game-secondary text-xs py-2 px-3.5 font-pixel"
                >
                  CANCELAR
                </button>
                <button type="submit" className="btn-game btn-game-primary text-xs py-2 px-4.5 font-pixel font-bold">
                  GUARDAR BÓVEDA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

