import React from 'react'
import { Link } from 'react-router-dom'
import { useForja } from '../../context/ForjaContext'
import { formatCOP } from '../../domain/money'
import { formatShortDate } from '../../domain/dates'
import { describeTransaction } from '../../domain/ledger/aggregate'
import { isDateInPeriod } from '../../domain/period'
import { PixelSprite, type PixelSpriteName } from '../common/PixelSprite'
import { EmptyState } from '../common/EmptyState'
import { ArrowRight, Bike } from 'lucide-react'
import type { TransactionKind } from '../../domain/types'

const KIND_SPRITES: Record<TransactionKind, PixelSpriteName> = {
  income: 'coins',
  expense: 'jerrycan',
  transfer: 'conveyor',
  debt_payment: 'chain',
  debt_charge: 'chain',
  debt_disbursement: 'vault',
  loan_given: 'sack',
  loan_repayment: 'sack',
  adjustment: 'tools',
}

const KIND_LABELS: Record<TransactionKind, { label: string; badgeClass: string; textClass: string }> = {
  income: {
    label: 'INGRESO',
    badgeClass: 'bg-[#12261a] text-emerald-300 border-[#234b31]',
    textClass: 'text-emerald-400 font-black',
  },
  expense: {
    label: 'GASTO',
    badgeClass: 'bg-[#2b140e] text-rose-300 border-[#5f2a1e]',
    textClass: 'text-rose-400 font-black',
  },
  transfer: {
    label: 'TRANSFERENCIA',
    badgeClass: 'bg-[#0f2121] text-cyan-300 border-[#204443]',
    textClass: 'text-cyan-300 font-bold',
  },
  debt_payment: {
    label: 'PAGO DEUDA',
    badgeClass: 'bg-[#2a1d0b] text-amber-300 border-[#5e4216]',
    textClass: 'text-amber-300 font-black',
  },
  debt_charge: {
    label: 'INTERÉS / CARGO',
    badgeClass: 'bg-[#2b140e] text-rose-300 border-[#5f2a1e]',
    textClass: 'text-rose-400 font-black',
  },
  debt_disbursement: {
    label: 'DESEMBOLSO CRÉDITO',
    badgeClass: 'bg-[#0f2121] text-cyan-300 border-[#204443]',
    textClass: 'text-cyan-300 font-black',
  },
  loan_given: {
    label: 'PRÉSTAMO',
    badgeClass: 'bg-[#27150c] text-orange-300 border-[#582f19]',
    textClass: 'text-orange-400 font-black',
  },
  loan_repayment: {
    label: 'COBRO PRÉSTAMO',
    badgeClass: 'bg-[#12261a] text-emerald-300 border-[#234b31]',
    textClass: 'text-emerald-300 font-black',
  },
  adjustment: {
    label: 'AJUSTE',
    badgeClass: 'bg-slate-900 text-slate-300 border-slate-700',
    textClass: 'text-slate-300 font-black',
  },
}

export const OperationalLogbook: React.FC = () => {
  const { transactions, period, index, openQuickModal, openTransactionDetail } = useForja()

  // Movimientos recientes del corte
  const periodTxs = transactions
    .filter((tx) => isDateInPeriod(tx.date, period))
    .slice(0, 6)

  return (
    <div className="forge-panel p-4 sm:p-5 rivet-corners border-[#28443b] bg-[#121c19]">
      {/* Encabezado */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#213730]">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-sm bg-[#162721] border border-emerald-700/50 shadow-inner">
            <PixelSprite name="ledger" size={22} />
          </div>
          <div>
            <h3 className="font-stencil text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-wide">
              BITÁCORA DE OPERACIONES DEL TALLER
            </h3>
            <p className="text-[11px] text-slate-400 font-pixel">
              Registro secuencial de movimientos con partida doble en el corte {period.label}
            </p>
          </div>
        </div>

        <Link
          to="/movimientos"
          className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold transition-colors font-pixel"
        >
          <span>Ver Libro Completo</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      {/* Lista de movimientos estilo registro de taller */}
      {periodTxs.length === 0 ? (
        <EmptyState
          sprite="empty_bench"
          title="Bitácora en Blanco para este Ciclo"
          description={`No hay movimientos asentados todavía para el corte ${period.label}. Registra tus primeros viajes, gasolina o compras de hoy.`}
          actionLabel="+ Forjar Primer Movimiento"
          onAction={() => openQuickModal()}
        />
      ) : (
        <div className="space-y-2">
          {periodTxs.map((tx) => {
            const desc = describeTransaction(tx, index)
            const meta = KIND_LABELS[tx.kind] || KIND_LABELS.expense
            const spriteName = KIND_SPRITES[tx.kind] || 'tools'

            return (
              <div
                key={tx.id}
                onClick={() => openTransactionDetail(tx)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openTransactionDetail(tx)
                  }
                }}
                role="button"
                tabIndex={0}
                title="Inspeccionar detalle y asientos contables"
                className="bg-[#0f1715] hover:bg-[#152722] border border-[#213730] hover:border-emerald-600/50 p-2.5 sm:p-3 transition-all flex items-center justify-between gap-3 shadow-xs cursor-pointer group rounded-xs"
              >
                {/* Lado izquierdo: Icono de tipo + Detalles */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-1.5 rounded-sm bg-[#0a110f] border border-[#1f352e] shrink-0 shadow-inner">
                    <PixelSprite name={spriteName} size={22} />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-200 text-xs sm:text-sm truncate font-pixel">
                        {tx.description}
                      </span>
                      {tx.isMoto && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-xs bg-[#2a1d0b] border border-[#5e4216] text-[9px] text-amber-300 font-stencil">
                          <Bike size={10} />
                          MOTO
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 font-pixel">
                      <span>{formatShortDate(tx.date)}</span>
                      <span>•</span>
                      <span className="truncate">{desc.sourceLabel || 'Operación de taller'}</span>
                    </div>
                  </div>
                </div>

                {/* Lado derecho: Importe y Badge */}
                <div className="text-right shrink-0">
                  <div className={`font-pixel text-sm sm:text-base ${meta.textClass}`}>
                    {tx.kind === 'income' || tx.kind === 'loan_repayment' ? '+' : '−'}{' '}
                    {formatCOP(desc.amount)}
                  </div>
                  <span className={`badge-pixel text-[9px] mt-0.5 ${meta.badgeClass}`}>
                    {meta.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
