import React from 'react'
import { Plus, Calendar, Trash2 } from 'lucide-react'
import { useForja } from '../context/ForjaContext'
import { formatCOP } from '../domain/money'
import { formatShortDate } from '../domain/dates'
import { summarizeLoan, LOAN_STATUS_LABELS } from '../domain/loans'
import { PixelSprite } from '../components/common/PixelSprite'
import { EmptyState } from '../components/common/EmptyState'
import { sound } from '../services/sound'
import { triggerButtonSparks } from '../components/common/PixelSparks'

export const LoansPage: React.FC = () => {
  const { loans, transactions, balances, today, deleteLoan, openQuickModal } = useForja()

  const handleDeleteLoan = async (id: string, personName: string) => {
    sound.playClick()
    if (window.confirm(`¿Confirmas eliminar el registro del préstamo a «${personName}»?`)) {
      try {
        await deleteLoan(id)
        sound.playConfirm()
      } catch (err) {
        sound.playError()
        alert((err as Error).message)
      }
    }
  }

  return (
    <div className="space-y-5">
      {/* Cabecera del Centro de Créditos y Cuentas por Cobrar */}
      <div className="forge-machine-panel rivet-corners p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-[#101d18] border border-purple-800/80 flex items-center justify-center text-purple-400 shrink-0 shadow-inner">
            <PixelSprite name="sack" size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="led-pilot led-pilot-online"></span>
              <h2 className="font-stencil text-lg sm:text-xl font-bold text-purple-400 tracking-wider">
                DINERO PRESTADO Y CUENTAS POR COBRAR
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Capital total por recuperar:{' '}
              <span className="font-mono font-bold text-purple-300">
                {formatCOP(balances.loansPending)}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={(e) => {
              sound.playClick()
              triggerButtonSparks(e, 'emerald', 14)
              openQuickModal('loan_repayment')
            }}
            className="btn-game btn-game-secondary btn-forge-heat text-xs py-2 px-3 flex items-center gap-2 cursor-pointer font-pixel"
          >
            <PixelSprite name="coins" size={14} />
            <span>REGISTRAR DEVOLUCIÓN</span>
          </button>
          <button
            onClick={(e) => {
              sound.playClick()
              triggerButtonSparks(e, 'forge', 18)
              openQuickModal('loan_given')
            }}
            className="btn-game btn-game-primary btn-forge-heat text-xs py-2 px-3.5 flex items-center gap-2 cursor-pointer font-pixel font-bold"
          >
            <Plus size={15} />
            <span>NUEVO PRÉSTAMO</span>
          </button>
        </div>
      </div>

      {loans.length === 0 ? (
        <EmptyState
          sprite="sack"
          title="Sin préstamos activos"
          description="No tienes dinero prestado a terceros registrado en este momento. Mantén la bitácora al día cuando prestes dinero a colegas o familiares."
          actionLabel="+ REGISTRAR PRÉSTAMO OTORGADO"
          onAction={() => openQuickModal('loan_given')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loans.map((loan) => {
            const summary = summarizeLoan(loan, transactions, today)

            return (
              <div key={loan.id} className="forge-machine-panel rivet-corners p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded bg-[#101d18] border border-purple-900/60 flex items-center justify-center shrink-0 text-purple-400">
                        <PixelSprite name="handshake" size={18} />
                      </div>
                      <div>
                        <h3 className="font-pixel font-bold text-slate-100 text-sm">{loan.personName}</h3>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Pactado: {formatShortDate(loan.startDate, true)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`badge-pixel text-[9px] px-2 py-0.5 ${
                          summary.status === 'pagado'
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                            : summary.status === 'vencido'
                            ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                            : summary.dueSoon
                            ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                            : 'bg-purple-950/80 text-purple-300 border-purple-800'
                        }`}
                      >
                        {LOAN_STATUS_LABELS[summary.status]}
                      </span>
                      <button
                        onClick={() => handleDeleteLoan(loan.id, loan.personName)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Eliminar préstamo"
                        aria-label="Eliminar préstamo"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Saldo pendiente */}
                  <div className="bg-[#0b1311] border border-[#1e342c] p-3 rounded">
                    <span className="text-[10px] text-slate-400 font-pixel uppercase tracking-wider block">
                      SALDO PENDIENTE POR COBRAR
                    </span>
                    <div className="font-pixel font-bold num text-2xl text-purple-300 tracking-tight mt-0.5">
                      {formatCOP(summary.pending)}
                    </div>
                  </div>

                  {/* Detalles */}
                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs bg-[#0d1614] p-2.5 rounded border border-[#1a2d26]">
                    <div>
                      <span className="text-[10px] text-slate-400 font-pixel uppercase tracking-wider">CAPITAL PRESTADO</span>
                      <p className="font-pixel font-bold num text-slate-200 mt-0.5">{formatCOP(summary.lent)}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-pixel uppercase tracking-wider">TOTAL RECUPERADO</span>
                      <p className="font-pixel font-bold num text-emerald-400 mt-0.5">
                        {formatCOP(summary.repaid)}
                      </p>
                    </div>

                    {loan.dueDate && (
                      <div className="col-span-2 flex items-center justify-between border-t border-[#1a2d26] pt-1.5 mt-1 text-[11px]">
                        <span className="text-slate-400 flex items-center gap-1 font-mono">
                          <Calendar size={12} className="text-purple-400" />
                          Plazo:
                        </span>
                        <span
                          className={`font-mono text-xs ${
                            summary.status === 'vencido' ? 'text-rose-400 font-bold' : 'text-slate-200'
                          }`}
                        >
                          {formatShortDate(loan.dueDate, true)}{' '}
                          {summary.daysToDue !== null
                            ? summary.daysToDue < 0
                              ? `(vencido hace ${Math.abs(summary.daysToDue)}d)`
                              : `(en ${summary.daysToDue}d)`
                            : ''}
                        </span>
                      </div>
                    )}
                  </div>

                  {loan.interestNote && (
                    <p className="text-[11px] text-slate-400 italic mt-2 bg-[#080d0c] px-2 py-1 rounded border border-[#15231e]">
                      Condición: {loan.interestNote}
                    </p>
                  )}
                </div>

                {/* Acciones */}
                <div className="mt-4 pt-3 border-t border-[#182622] flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-mono">
                    {summary.history.length} operaciones
                  </span>
                  {summary.pending > 0 && (
                    <button
                      onClick={() => openQuickModal('loan_repayment')}
                      className="btn-game btn-game-primary text-xs py-1.5 px-3 font-pixel flex items-center gap-1 shadow-xs"
                    >
                      <span>+ REGISTRAR ABONO</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

