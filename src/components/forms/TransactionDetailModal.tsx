import React, { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Calendar, Edit3, Trash2, ShieldCheck, Bike } from 'lucide-react'
import { CategoryIcon } from '../common/CategoryIcon'
import { useForja } from '../../context/ForjaContext'
import { formatCOP } from '../../domain/money'
import { formatShortDate } from '../../domain/dates'
import { describeTransaction } from '../../domain/ledger/aggregate'
import { sound } from '../../services/sound'
import { triggerPixelSparks } from '../common/PixelSparks'
import { TRANSACTION_KIND_LABELS } from '../../domain/types'

const ROLE_LABELS: Record<string, string> = {
  gross: 'Ingreso Bruto',
  commission: 'Comisión Plataforma',
  tip: 'Propina Recibida',
  net: 'Ingreso Neto',
  principal: 'Capital / Principal',
  interest: 'Intereses',
  fee: 'Cargos / Comisiones',
  payment: 'Pago / Salida',
  transfer: 'Transferencia',
  disbursement: 'Desembolso',
  adjustment: 'Ajuste',
}

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

export const TransactionDetailModal: React.FC = () => {
  const {
    detailModalTx,
    closeTransactionDetail,
    openQuickModal,
    deleteTransaction,
    index,
  } = useForja()

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  if (!detailModalTx) return null

  const tx = detailModalTx
  const desc = describeTransaction(tx, index)
  const meta = (tx.meta || {}) as TxMetaDetails

  const handleStartEdit = () => {
    sound.playClick()
    triggerPixelSparks(window.innerWidth / 2, window.innerHeight * 0.45, 'forge', 16)
    closeTransactionDetail()
    openQuickModal(tx.kind, tx)
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await deleteTransaction(tx.id)
      sound.playExpense()
      triggerPixelSparks(window.innerWidth / 2, window.innerHeight * 0.5, 'rust', 28)
      setConfirmDelete(false)
      closeTransactionDetail()
    } catch (err) {
      sound.playError()
      setDeleteError((err as Error).message || 'Error al eliminar el movimiento')
    } finally {
      setIsDeleting(false)
    }
  }

  // Resolver nombre de destino para cada asiento contable
  const resolveTargetName = (targetType: string, targetId: string | null): string => {
    if (!targetId) return 'Patrimonio / Ajuste'
    switch (targetType) {
      case 'account':
        return index.accounts.get(targetId)?.name || `Cuenta (${targetId.slice(0, 8)})`
      case 'category':
        return index.categories.get(targetId)?.name || `Categoría (${targetId.slice(0, 8)})`
      case 'debt':
        return index.debts.get(targetId)?.name || `Deuda (${targetId.slice(0, 8)})`
      case 'loan':
        return index.loans.get(targetId)?.personName || `Préstamo (${targetId.slice(0, 8)})`
      default:
        return targetId
    }
  }

  const debitsSum = tx.postings.filter((p) => p.amount > 0).reduce((acc, p) => acc + p.amount, 0)
  const creditsSum = tx.postings.filter((p) => p.amount < 0).reduce((acc, p) => acc + p.amount, 0)
  const isBalanced = debitsSum + creditsSum === 0

  return (
    <Dialog.Root open={Boolean(detailModalTx)} onOpenChange={(open) => !open && closeTransactionDetail()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/85 backdrop-blur-xs z-[60]" />
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 pointer-events-none">
          <Dialog.Content className="pointer-events-auto w-full max-w-2xl max-h-[92vh] overflow-y-auto forge-modal-box rivet-corners p-4 sm:p-6 shadow-2xl focus:outline-none bg-[#0b1310] border-2 border-[#2e4d40]">
            {/* Cabecera Industrial de Auditoría */}
            <div className="flex items-center justify-between pb-3 border-b-2 border-[#233a30]">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-xs bg-[#11201a] border border-emerald-700/60">
                  <CategoryIcon
                    icon={index.categories.get(desc.categoryId || '')?.icon}
                    categoryName={index.categories.get(desc.categoryId || '')?.name || tx.description}
                    kind={tx.kind}
                    isMoto={tx.isMoto}
                    size={20}
                    color={index.categories.get(desc.categoryId || '')?.color}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="led-pilot led-pilot-online" />
                    <Dialog.Title className="font-stencil text-sm sm:text-base text-emerald-300 font-bold tracking-wider uppercase">
                      AUDITORÍA DE ASIENTO CONTABLE
                    </Dialog.Title>
                  </div>
                  <p className="text-[10px] text-slate-400 font-pixel">
                    Inspección de partida doble • Ref. #{tx.id.slice(0, 8)}
                  </p>
                </div>
              </div>
              <Dialog.Close asChild>
                <button
                  onClick={() => sound.playClick()}
                  className="p-1.5 rounded-xs text-slate-400 hover:text-slate-100 bg-[#111c18] hover:bg-[#1a2d25] border border-[#264136] hover:border-amber-500/60 transition-colors cursor-pointer"
                  aria-label="Cerrar detalle"
                >
                  <X size={18} />
                </button>
              </Dialog.Close>
            </div>

            <div className="py-3.5 space-y-4">
              {/* Tarjeta principal con importe y descripción */}
              <div className="bg-[#070c0a] border-2 border-[#1c3028] p-3.5 rounded-xs space-y-2.5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-pixel">
                      <Calendar size={13} className="text-emerald-400" />
                      <span>{formatShortDate(tx.date, true)}</span>
                      {tx.isMoto && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs bg-[#2a1d0b] border border-[#5e4216] text-[10px] text-amber-300 font-stencil">
                          <Bike size={11} />
                          OPERACIÓN MOTO
                        </span>
                      )}
                    </div>
                    <h3 className="font-pixel font-bold text-slate-100 text-base sm:text-lg mt-1">
                      {tx.description}
                    </h3>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-stencil uppercase tracking-wider text-slate-400 block">
                      {TRANSACTION_KIND_LABELS[tx.kind]}
                    </span>
                    <div
                      className={`font-pixel font-bold num text-xl sm:text-2xl mt-0.5 ${
                        desc.tone === 'income'
                          ? 'text-emerald-400'
                          : desc.tone === 'expense'
                          ? 'text-rose-400'
                          : desc.tone === 'debt'
                          ? 'text-amber-400'
                          : desc.tone === 'loan'
                          ? 'text-purple-400'
                          : 'text-slate-200'
                      }`}
                    >
                      {desc.tone === 'income' ? '+' : desc.tone === 'expense' ? '−' : ''}
                      {formatCOP(desc.amount)}
                    </div>
                  </div>
                </div>

                {/* Etiquetas si existen */}
                {tx.tags && tx.tags.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-[#162721]">
                    {tx.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-xs bg-[#12221b] border border-[#233a30] text-[10px] font-pixel text-slate-300"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Desglose operativo según tipo de transacción */}
              <div className="bg-[#09100d] border border-[#1b2f26] p-3 rounded-xs text-xs space-y-2">
                <span className="text-[10px] font-stencil uppercase tracking-wider text-slate-400 block pb-1 border-b border-[#182a22]">
                  DESGLOSE OPERATIVO
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {desc.sourceLabel && (
                    <div>
                      <span className="text-[10px] text-slate-400 font-pixel block">Bóveda / Cuenta:</span>
                      <span className="font-pixel text-slate-200 font-bold">{desc.sourceLabel}</span>
                    </div>
                  )}

                  {desc.categoryId && (
                    <div>
                      <span className="text-[10px] text-slate-400 font-pixel block">Categoría Contable:</span>
                      <span className="font-pixel text-emerald-300 font-bold inline-flex items-center gap-1.5 mt-0.5">
                        <CategoryIcon
                          icon={index.categories.get(desc.categoryId)?.icon}
                          categoryName={index.categories.get(desc.categoryId)?.name}
                          size={13}
                          color={index.categories.get(desc.categoryId)?.color}
                        />
                        {index.categories.get(desc.categoryId)?.name || 'Categoría'}
                      </span>
                    </div>
                  )}

                  {/* Detalles específicos de ingreso */}
                  {tx.kind === 'income' && (
                    <>
                      {Number(meta.commission || 0) > 0 && (
                        <div>
                          <span className="text-[10px] text-slate-400 font-pixel block">Comisión descontada:</span>
                          <span className="font-pixel num text-rose-300 font-bold">−{formatCOP(Number(meta.commission))}</span>
                        </div>
                      )}
                      {Number(meta.tip || 0) > 0 && (
                        <div>
                          <span className="text-[10px] text-slate-400 font-pixel block">Propina recibida:</span>
                          <span className="font-pixel num text-emerald-300 font-bold">+{formatCOP(Number(meta.tip))}</span>
                        </div>
                      )}
                    </>
                  )}

                  {/* Detalles específicos de transferencia */}
                  {tx.kind === 'transfer' && Number(meta.fee || 0) > 0 && (
                    <div>
                      <span className="text-[10px] text-slate-400 font-pixel block">Costo de transferencia:</span>
                      <span className="font-pixel num text-amber-300 font-bold">{formatCOP(Number(meta.fee))}</span>
                    </div>
                  )}

                  {/* Detalles específicos de deuda */}
                  {tx.kind === 'debt_payment' && (
                    <>
                      {Number(meta.principal || 0) > 0 && (
                        <div>
                          <span className="text-[10px] text-slate-400 font-pixel block">Abono a capital:</span>
                          <span className="font-pixel num text-emerald-300 font-bold">{formatCOP(Number(meta.principal))}</span>
                        </div>
                      )}
                      {Number(meta.interest || 0) > 0 && (
                        <div>
                          <span className="text-[10px] text-slate-400 font-pixel block">Intereses financieros:</span>
                          <span className="font-pixel num text-rose-300 font-bold">{formatCOP(Number(meta.interest))}</span>
                        </div>
                      )}
                      {Number(meta.fees || 0) > 0 && (
                        <div>
                          <span className="text-[10px] text-slate-400 font-pixel block">Seguros / Cuota manejo:</span>
                          <span className="font-pixel num text-amber-300 font-bold">{formatCOP(Number(meta.fees))}</span>
                        </div>
                      )}
                    </>
                  )}

                  {/* Detalles específicos de préstamo */}
                  {(tx.kind === 'loan_given' || tx.kind === 'loan_repayment') && tx.loanId && (
                    <div>
                      <span className="text-[10px] text-slate-400 font-pixel block">Deudor / Persona:</span>
                      <span className="font-pixel text-purple-300 font-bold">
                        {index.loans.get(tx.loanId)?.personName || meta.newLoan?.personName || 'Familiar / Colega'}
                      </span>
                    </div>
                  )}
                  {tx.kind === 'loan_repayment' && Number(meta.interest || 0) > 0 && (
                    <div>
                      <span className="text-[10px] text-slate-400 font-pixel block">Intereses percibidos:</span>
                      <span className="font-pixel num text-emerald-300 font-bold">+{formatCOP(Number(meta.interest))}</span>
                    </div>
                  )}
                </div>

                {tx.notes && (
                  <div className="pt-2 border-t border-[#182a22]">
                    <span className="text-[10px] text-slate-400 font-pixel block mb-0.5">Notas y recordatorios:</span>
                    <p className="p-2 rounded-xs bg-[#060a08] border border-[#1b2f26] text-slate-300 font-pixel text-xs italic">
                      «{tx.notes}»
                    </p>
                  </div>
                )}
              </div>

              {/* Asientos Contables en Partida Doble */}
              <div className="bg-[#070c0a] border-2 border-[#1c3028] p-3 rounded-xs space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-[#1b2f26]">
                  <span className="text-[10px] font-stencil uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <ShieldCheck size={13} className="text-emerald-400" />
                    ASIENTOS CONTABLES EN PARTIDA DOBLE ({tx.postings.length})
                  </span>
                  <span
                    className={`text-[9px] font-pixel px-1.5 py-0.2 rounded-xs border ${
                      isBalanced
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                        : 'bg-rose-950/80 text-rose-300 border-rose-700'
                    }`}
                  >
                    {isBalanced ? 'BALANCE = 0 ✓' : 'DESBALANCE'}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-pixel">
                    <thead className="text-[10px] text-slate-400 uppercase tracking-wider bg-[#0a120f] border-b border-[#1b2f26]">
                      <tr>
                        <th className="py-1.5 px-2">DESTINO</th>
                        <th className="py-1.5 px-2">ROL</th>
                        <th className="py-1.5 px-2 text-right">DÉBITO (+)</th>
                        <th className="py-1.5 px-2 text-right">CRÉDITO (−)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#13221c]">
                      {tx.postings.map((p, idx) => {
                        const targetName = resolveTargetName(p.targetType, p.targetId)
                        const roleName = p.role ? ROLE_LABELS[p.role] || p.role : 'Línea'
                        const isDebit = p.amount > 0

                        return (
                          <tr key={idx} className="hover:bg-[#0e1a15]">
                            <td className="py-1.5 px-2">
                              <span className="text-slate-200 font-bold">{targetName}</span>
                              <span className="block text-[9px] text-slate-400 uppercase font-mono">
                                {p.targetType}
                              </span>
                            </td>
                            <td className="py-1.5 px-2 text-slate-300 text-[11px] whitespace-nowrap">
                              {roleName}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono font-bold whitespace-nowrap">
                              {isDebit ? (
                                <span className="text-emerald-400">+{formatCOP(p.amount)}</span>
                              ) : (
                                <span className="text-slate-600">—</span>
                              )}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono font-bold whitespace-nowrap">
                              {!isDebit ? (
                                <span className="text-rose-400">−{formatCOP(Math.abs(p.amount))}</span>
                              ) : (
                                <span className="text-slate-600">—</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot className="border-t-2 border-[#1c3028] bg-[#0a120f] text-[11px] font-mono">
                      <tr>
                        <td colSpan={2} className="py-1.5 px-2 text-slate-400 font-bold font-pixel">
                          TOTALES
                        </td>
                        <td className="py-1.5 px-2 text-right text-emerald-400 font-bold">
                          +{formatCOP(debitsSum)}
                        </td>
                        <td className="py-1.5 px-2 text-right text-rose-400 font-bold">
                          −{formatCOP(Math.abs(creditsSum))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Metadatos de auditoría */}
              <div className="bg-[#060a08] p-2.5 rounded-xs border border-[#162721] text-[10px] text-slate-400 font-mono space-y-0.5">
                <div className="flex justify-between">
                  <span>ID Registro:</span>
                  <span className="text-slate-300">{tx.id}</span>
                </div>
                {tx.clientRequestId && (
                  <div className="flex justify-between">
                    <span>Idempotencia (Client Req):</span>
                    <span className="text-slate-300 truncate max-w-[240px]">{tx.clientRequestId}</span>
                  </div>
                )}
                {tx.createdAt && (
                  <div className="flex justify-between">
                    <span>Asentado en sistema:</span>
                    <span className="text-slate-300">{new Date(tx.createdAt).toLocaleString('es-CO')}</span>
                  </div>
                )}
              </div>

              {/* Confirmación destructiva de desmantelamiento */}
              {confirmDelete && (
                <div className="p-3 bg-rose-950/80 border-2 border-rose-800 rounded-xs space-y-2">
                  <p className="text-xs text-rose-200 font-pixel">
                    ¿Confirmas desmantelar permanentemente este movimiento? Se revertirán todos los asientos en tus bóvedas y balances.
                  </p>
                  {deleteError && (
                    <p className="text-xs text-rose-400 font-pixel font-bold">{deleteError}</p>
                  )}
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => setConfirmDelete(false)}
                      className="btn-game btn-game-secondary text-xs py-1.5 px-3 font-pixel cursor-pointer"
                    >
                      CANCELAR
                    </button>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={handleDelete}
                      className="btn-game btn-game-danger text-xs py-1.5 px-3 font-pixel font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 size={13} />
                      <span>{isDeleting ? 'ELIMINANDO...' : 'SÍ, ELIMINAR'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Acciones principales */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t-2 border-[#233a30]">
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={confirmDelete || isDeleting}
                className="btn-game btn-game-secondary text-xs py-2 px-3 font-pixel flex items-center gap-1.5 text-rose-400 hover:text-rose-200 border-rose-900/60 cursor-pointer"
              >
                <Trash2 size={14} />
                <span className="hidden sm:inline">DESMANTELAR</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => closeTransactionDetail()}
                  className="btn-game btn-game-secondary text-xs py-2 px-3.5 font-pixel cursor-pointer"
                >
                  CERRAR
                </button>
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="btn-game btn-game-primary btn-forge-heat text-xs py-2 px-4 font-pixel font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 size={14} />
                  <span>EDITAR MOVIMIENTO</span>
                </button>
              </div>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
