import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Plus } from 'lucide-react'
import { useForja } from '../../context/ForjaContext'
import { formatCOP } from '../../domain/money'
import { formatShortDate } from '../../domain/dates'
import { describeTransaction } from '../../domain/ledger/aggregate'
import { PixelSprite } from '../common/PixelSprite'
import { CategoryIcon, resolveCategoryColor } from '../common/CategoryIcon'
import { sound } from '../../services/sound'
import { triggerButtonSparks } from '../common/PixelSparks'

type LogFilter = 'all' | 'income' | 'expense' | 'transfer'

export const OperationalLogbook: React.FC = () => {
  const { transactions, index, openQuickModal, openTransactionDetail } = useForja()
  const navigate = useNavigate()
  const [activeFilter, setActiveFilter] = useState<LogFilter>('all')

  const recentTransactions = useMemo(() => {
    const filtered =
      activeFilter === 'all'
        ? transactions
        : transactions.filter((tx) => tx.kind === activeFilter)
    return filtered.slice(0, 7)
  }, [transactions, activeFilter])

  const getKindTag = (kind: string) => {
    switch (kind) {
      case 'income':
        return {
          label: 'INGRESO',
          classes: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/70',
        }
      case 'expense':
        return {
          label: 'GASTO',
          classes: 'bg-rose-950/80 text-rose-300 border-rose-700/70',
        }
      case 'transfer':
        return {
          label: 'TRASLADO',
          classes: 'bg-cyan-950/80 text-cyan-300 border-cyan-700/70',
        }
      case 'debt_payment':
        return {
          label: 'ABONO DEUDA',
          classes: 'bg-amber-950/80 text-amber-300 border-amber-700/70',
        }
      case 'loan_given':
        return {
          label: 'PRÉSTAMO',
          classes: 'bg-purple-950/80 text-purple-300 border-purple-700/70',
        }
      case 'loan_repayment':
        return {
          label: 'COBRO',
          classes: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/70',
        }
      default:
        return {
          label: 'ASIENTO',
          classes: 'bg-slate-900 text-slate-300 border-slate-700',
        }
    }
  }

  return (
    <section
      aria-label="Bitácora reciente de operaciones asentadas"
      className="h-full forge-machine-panel rivet-corners p-4 sm:p-5 flex flex-col justify-between space-y-4"
    >
      {/* Cabecera de Bitácora con Pestañas de Filtrado Táctil */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#213731]">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xs bg-[#11201b] border border-emerald-800/70">
            <PixelSprite name="ledger" size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="led-pilot led-pilot-online" />
              <h2 className="font-stencil text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-wider">
                BITÁCORA OPERATIVA DE ASIENTOS RECIENTES
              </h2>
            </div>
            <p className="text-[11px] text-slate-400 font-pixel mt-0.5">
              Últimos movimientos registrados en partida doble (pulsa una fila para auditar sus asientos)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'all', label: 'TODOS' },
              { id: 'income', label: 'INGRESOS' },
              { id: 'expense', label: 'GASTOS' },
              { id: 'transfer', label: 'TRASLADOS' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                sound.playClick()
                setActiveFilter(tab.id)
              }}
              className={`px-2.5 py-1 rounded-xs text-[10px] font-stencil transition-colors cursor-pointer border ${
                activeFilter === tab.id
                  ? 'bg-[#23180c] text-amber-300 border-amber-500 font-bold'
                  : 'bg-[#09100e] text-slate-400 border-[#1d3129] hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}

          <button
            type="button"
            onClick={() => {
              sound.playClick()
              navigate('/movimientos')
            }}
            className="ml-1 btn-game btn-game-secondary text-[10px] py-1 px-2.5 font-pixel text-emerald-300 flex items-center gap-1 cursor-pointer"
          >
            <span>HISTORIAL</span>
            <ArrowRight size={11} />
          </button>
        </div>
      </div>

      {/* Lista de Movimientos en Placas Industriales */}
      {recentTransactions.length === 0 ? (
        <div className="p-6 rounded-xs bg-[#09100e] border border-[#1d3129] text-center space-y-2.5">
          <PixelSprite name="empty_bench" size={28} className="mx-auto" />
          <p className="text-xs font-pixel font-bold text-slate-200">
            NO HAY ASIENTOS REGISTRADOS EN ESTA VISTA
          </p>
          <p className="text-[11px] font-pixel text-slate-400 max-w-md mx-auto">
            Usa el botón «Forjar Movimiento» para asentar un nuevo ingreso, gasto o transferencia en tu libro contable.
          </p>
          <button
            type="button"
            onClick={(e) => {
              sound.playClick()
              triggerButtonSparks(e, 'forge', 16)
              openQuickModal()
            }}
            className="btn-game btn-game-primary text-xs py-1.5 px-3.5 font-pixel font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} />
            <span>FORJAR PRIMER MOVIMIENTO</span>
          </button>
        </div>
      ) : (
        <div className="divide-y divide-[#1a2d26] bg-[#09100d] border border-[#1f342c] rounded-xs overflow-hidden">
          {recentTransactions.map((tx) => {
            const desc = describeTransaction(tx, index)
            const cat = desc.categoryId ? index.categories.get(desc.categoryId) : null
            const itemColor =
              cat?.color ||
              resolveCategoryColor(
                cat?.icon,
                cat?.name || tx.description,
                tx.kind,
                tx.isMoto,
              )
            const tag = getKindTag(tx.kind)

            return (
              <div
                key={tx.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  sound.playClick()
                  openTransactionDetail(tx)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    sound.playClick()
                    openTransactionDetail(tx)
                  }
                }}
                className="p-3 hover:bg-[#11201a] transition-colors flex items-center justify-between gap-3 cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-xs border flex items-center justify-center shrink-0"
                    style={{
                      borderColor: `${itemColor}55`,
                      backgroundColor: `${itemColor}15`,
                    }}
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

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-pixel text-xs font-bold text-slate-100 group-hover:text-amber-300 truncate transition-colors">
                        {tx.description}
                      </span>
                      <span className={`badge-pixel text-[8px] px-1.5 py-0.5 ${tag.classes}`}>
                        {tag.label}
                      </span>
                      {tx.isMoto && (
                        <span className="badge-pixel text-[8px] px-1.5 py-0.5 bg-amber-950/80 text-amber-300 border-amber-700/70">
                          MOTO
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-pixel flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="font-mono num text-slate-400">
                        {formatShortDate(tx.date, true)}
                      </span>
                      {desc.sourceLabel && (
                        <>
                          <span>•</span>
                          <span className="text-slate-300 truncate">{desc.sourceLabel}</span>
                        </>
                      )}
                      {cat && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-400/90 truncate">{cat.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`text-sm sm:text-base font-bold num tracking-tight ${
                      desc.tone === 'income'
                        ? 'text-emerald-400'
                        : desc.tone === 'expense'
                          ? 'text-rose-400'
                          : desc.tone === 'debt'
                            ? 'text-amber-300'
                            : 'text-cyan-300'
                    }`}
                  >
                    {desc.tone === 'income' ? '+' : desc.tone === 'expense' ? '−' : ''}
                    {formatCOP(desc.amount)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
