import React, { useState, useMemo } from 'react'
import { Plus, Download, Trash2, Search, Eye } from 'lucide-react'
import { useForja } from '../context/ForjaContext'
import { formatCOP } from '../domain/money'
import { formatShortDate } from '../domain/dates'
import { describeTransaction } from '../domain/ledger/aggregate'
import { isDateInPeriod } from '../domain/period'
import { exportTransactionsToCSV, downloadFile } from '../services/exportImport'
import { PixelSprite } from '../components/common/PixelSprite'
import { CategoryIcon, resolveCategoryColor } from '../components/common/CategoryIcon'
import { EmptyState } from '../components/common/EmptyState'
import { sound } from '../services/sound'
import { triggerButtonSparks, triggerPixelSparks } from '../components/common/PixelSparks'

export const TransactionsPage: React.FC = () => {
  const {
    transactions,
    period,
    index,
    deleteTransaction,
    openQuickModal,
    openTransactionDetail,
  } = useForja()

  const [searchTerm, setSearchTerm] = useState('')
  const [filterCutOnly, setFilterCutOnly] = useState(true)
  const [filterKind, setFilterKind] = useState<string>('all')
  const [filterMotoOnly, setFilterMotoOnly] = useState(false)

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (filterCutOnly && !isDateInPeriod(tx.date, period)) return false
      if (filterKind !== 'all' && tx.kind !== filterKind) return false
      if (filterMotoOnly && !tx.isMoto) return false
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase()
        const matchesDesc = tx.description.toLowerCase().includes(term)
        const matchesNotes = tx.notes ? tx.notes.toLowerCase().includes(term) : false
        if (!matchesDesc && !matchesNotes) return false
      }
      return true
    })
  }, [transactions, period, filterCutOnly, filterKind, filterMotoOnly, searchTerm])

  const handleExportCSV = (e: React.MouseEvent<HTMLButtonElement>) => {
    sound.playConfirm()
    triggerButtonSparks(e, 'cyan', 14)
    const csv = exportTransactionsToCSV(filteredTransactions, index)
    downloadFile(csv, `movimientos-forja-${period.id}.csv`, 'text/csv;charset=utf-8')
  }

  const [pendingDelete, setPendingDelete] = useState<{ id: string; description: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleOpenDelete = (id: string, description: string) => {
    sound.playClick()
    setDeleteError(null)
    setPendingDelete({ id, description })
  }

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await deleteTransaction(pendingDelete.id)
      sound.playExpense()
      triggerPixelSparks(window.innerWidth / 2, window.innerHeight * 0.5, 'rust', 24)
      setPendingDelete(null)
    } catch (err) {
      sound.playError()
      setDeleteError((err as Error).message || 'Error al desmantelar el movimiento')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Barra de cabecera de la terminal */}
      <div className="forge-machine-panel rivet-corners p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-[#101d18] border border-emerald-800/80 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
            <PixelSprite name="conveyor" size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="led-pilot led-pilot-online"></span>
              <h2 className="font-pixel text-lg sm:text-xl font-bold text-emerald-400 tracking-wider">
                REGISTRO OPERATIVO DE MOVIMIENTOS
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {filterCutOnly ? `Bitácora activa del corte ${period.label}` : 'Historial contable completo del taller'}
              {' • '}
              <span className="text-emerald-400 font-mono font-medium">{filteredTransactions.length}</span> registros filtrados
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="btn-game btn-game-secondary text-xs py-2 px-3 flex items-center gap-2 cursor-pointer"
            title="Exportar a CSV"
          >
            <Download size={14} />
            <span className="font-pixel">EXPORTAR CSV</span>
          </button>
          <button
            onClick={(e) => {
              sound.playClick()
              triggerButtonSparks(e, 'forge', 18)
              openQuickModal()
            }}
            className="btn-game btn-game-primary btn-forge-heat text-xs py-2 px-3.5 flex items-center gap-2 cursor-pointer"
          >
            <Plus size={15} />
            <span className="font-pixel font-bold">NUEVO MOVIMIENTO</span>
          </button>
        </div>
      </div>

      {/* Controles de filtro y búsqueda */}
      <div className="forge-machine-panel p-3.5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por descripción o notas operativas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0d1614] border border-[#213731] rounded pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Filtro tipo */}
          <select
            value={filterKind}
            onChange={(e) => setFilterKind(e.target.value)}
            className="bg-[#0d1614] border border-[#213731] rounded px-3 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
          >
            <option value="all">TODOS LOS TIPOS</option>
            <option value="income">INGRESOS DE PRODUCCIÓN</option>
            <option value="expense">GASTOS OPERATIVOS</option>
            <option value="transfer">TRANSFERENCIAS INTERNAS</option>
            <option value="debt_payment">PAGOS DE PASIVOS</option>
            <option value="loan_given">PRÉSTAMOS OTORGADOS</option>
            <option value="loan_repayment">COBROS DE PRÉSTAMOS</option>
          </select>

          {/* Toggle Solo corte activo */}
          <button
            onClick={() => {
              sound.playClick()
              setFilterCutOnly(!filterCutOnly)
            }}
            className={`btn-game text-xs py-1.5 px-3 font-pixel tracking-wider cursor-pointer ${
              filterCutOnly
                ? 'btn-game-primary'
                : 'btn-game-secondary'
            }`}
          >
            {filterCutOnly ? `CORTE: ${period.id}` : 'HISTORIAL COMPLETO'}
          </button>

          {/* Toggle Solo moto */}
          <button
            onClick={() => {
              sound.playClick()
              setFilterMotoOnly(!filterMotoOnly)
            }}
            className={`btn-game text-xs py-1.5 px-3 flex items-center gap-1.5 font-pixel tracking-wider cursor-pointer ${
              filterMotoOnly
                ? 'btn-game-orange'
                : 'btn-game-secondary'
            }`}
          >
            <PixelSprite name="moto" size={14} />
            <span>SOLO MOTO</span>
          </button>
        </div>
      </div>

      {/* Tabla de movimientos */}
      <div className="forge-machine-panel rivet-corners overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="p-4">
            <EmptyState
              sprite="empty_bench"
              title="Sin movimientos registrados con estos filtros"
              description="No hay operaciones asentadas que coincidan con los criterios de búsqueda o corte seleccionados."
              actionLabel="+ ASENTAR MOVIMIENTO"
              onAction={() => openQuickModal()}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0b1311] text-slate-400 uppercase tracking-wider text-[10px] border-b border-[#213731]">
                <tr>
                  <th className="py-2.5 px-3 font-pixel">FECHA</th>
                  <th className="py-2.5 px-3 font-pixel">OPERACIÓN</th>
                  <th className="py-2.5 px-3 font-pixel">CATEGORÍA</th>
                  <th className="py-2.5 px-3 font-pixel">CUENTA / BÓVEDA</th>
                  <th className="py-2.5 px-3 text-right font-pixel">IMPORTE</th>
                  <th className="py-2.5 px-3 text-center font-pixel">ACCIÓN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#182622]">
                {filteredTransactions.map((tx) => {
                  const desc = describeTransaction(tx, index)
                  const cat = desc.categoryId ? index.categories.get(desc.categoryId) : null

                  return (
                    <tr
                      key={tx.id}
                      onClick={() => openTransactionDetail(tx)}
                      className="hover:bg-[#132420] transition-colors cursor-pointer group"
                    >
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono text-slate-400 text-xs">
                        {formatShortDate(tx.date, true)}
                      </td>
                      <td className="py-2.5 px-3">
                        {(() => {
                          const itemColor = cat?.color || resolveCategoryColor(cat?.icon, cat?.name || tx.description, tx.kind, tx.isMoto)
                          return (
                            <div className="flex items-center gap-2">
                              <div
                                className="p-1 rounded bg-[#0d1614] border shrink-0 group-hover:border-emerald-600/50 flex items-center justify-center w-7 h-7"
                                style={{ borderColor: `${itemColor}50`, backgroundColor: `${itemColor}15` }}
                              >
                                <CategoryIcon
                                  icon={cat?.icon}
                                  categoryName={cat?.name || tx.description}
                                  kind={tx.kind}
                                  isMoto={tx.isMoto}
                                  size={16}
                                  color={itemColor}
                                />
                              </div>
                              <div>
                                <span className="font-medium text-slate-100 text-xs group-hover:text-emerald-300 transition-colors">{tx.description}</span>
                                {tx.notes && (
                                  <p className="text-[11px] text-slate-500 italic mt-0.5">{tx.notes}</p>
                                )}
                              </div>
                            </div>
                          )
                        })()}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-300 text-xs">
                        {cat ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px]"
                            style={{
                              borderColor: `${cat.color}50`,
                              backgroundColor: `${cat.color}15`,
                              color: cat.color || '#6ee7b7',
                            }}
                          >
                            <CategoryIcon icon={cat.icon} categoryName={cat.name} size={12} color={cat.color} />
                            {cat.name}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-400 text-xs">
                        {desc.sourceLabel ? (
                          <span className="font-mono text-slate-300">{desc.sourceLabel}</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <span
                          className={`font-pixel font-bold num text-sm tracking-tight ${
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
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              openTransactionDetail(tx)
                            }}
                            className="p-1.5 rounded text-slate-400 hover:text-emerald-300 hover:bg-[#152e25] transition-colors cursor-pointer"
                            title="Ver detalle y asientos"
                            aria-label="Ver detalle"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenDelete(tx.id, tx.description)
                            }}
                            className="p-1.5 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Eliminar movimiento"
                            aria-label="Eliminar"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal industrial de confirmación de desmantelamiento de movimiento */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="forge-modal-box rivet-corners p-5 max-w-md w-full shadow-2xl border-2 border-rose-900/80 bg-[#120d0b]">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#3b1a14]">
              <div className="p-1.5 rounded bg-rose-950/60 border border-rose-700/60 text-rose-400">
                <PixelSprite name="tools" size={18} />
              </div>
              <div>
                <h3 className="font-stencil text-sm font-bold text-rose-300 uppercase tracking-wide">
                  DESMANTELAR MOVIMIENTO CONTABLE
                </h3>
                <span className="text-[10px] text-slate-400 font-pixel">ID: {pendingDelete.id}</span>
              </div>
            </div>

            <div className="py-4 space-y-3">
              <p className="text-xs text-slate-200 font-pixel leading-relaxed">
                ¿Confirmas la eliminación permanente del registro <span className="font-bold text-amber-300">«{pendingDelete.description}»</span>?
              </p>
              <div className="p-3 bg-[#1e0f0b] border border-rose-900/60 rounded-xs text-[11px] text-slate-300 font-mono space-y-1">
                <p className="text-rose-400 font-bold font-pixel">EFECTO DE LA OPERACIÓN:</p>
                <p>• Los asientos contables asociados se revertirán en los saldos.</p>
                <p>• Se actualizarán automáticamente las métricas del corte.</p>
                <p>• Si estaba vinculado a un gasto fijo o jornada, se desvinculará.</p>
              </div>

              {deleteError && (
                <div className="p-2.5 bg-rose-950 border border-rose-600 rounded-xs text-rose-300 text-xs font-pixel">
                  {deleteError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-[#3b1a14]">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  sound.playClick()
                  setPendingDelete(null)
                  setDeleteError(null)
                }}
                className="btn-game btn-game-secondary text-xs py-2 px-3.5 font-pixel cursor-pointer"
              >
                CANCELAR
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="btn-game btn-game-danger text-xs py-2 px-4.5 font-pixel font-bold flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <Trash2 size={13} />
                <span>{isDeleting ? 'DESMANTELANDO...' : 'CONFIRMAR ELIMINACIÓN'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

