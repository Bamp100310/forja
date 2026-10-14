import React, { useState } from 'react'
import { Plus, X, Calendar, Trash2, Pencil, AlertCircle } from 'lucide-react'
import { useForja } from '../context/ForjaContext'
import { formatCOP } from '../domain/money'
import { formatShortDate } from '../domain/dates'
import { summarizeDebt } from '../domain/debts'
import { DEBT_KIND_LABELS, type Debt, type DebtKind } from '../domain/types'
import { MoneyInput } from '../components/forms/MoneyInput'
import { PixelSprite } from '../components/common/PixelSprite'
import { sound } from '../services/sound'
import { triggerPixelSparks, triggerButtonSparks } from '../components/common/PixelSparks'

export const DebtsPage: React.FC = () => {
  const { debts, balances, transactions, today, saveDebt, deleteDebt, openQuickModal } = useForja()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null)
  const [name, setName] = useState('')
  const [kind, setKind] = useState<DebtKind>('credit_card')
  const [institution, setInstitution] = useState('')
  const [openingBalance, setOpeningBalance] = useState<number>(0)
  const [creditLimit, setCreditLimit] = useState<number>(0)
  const [cutDay, setCutDay] = useState<number>(25)
  const [dueDay, setDueDay] = useState<number>(10)
  const [expectedInstallment, setExpectedInstallment] = useState<number>(0)
  const [status, setStatus] = useState<Debt['status']>('active')
  const [notes, setNotes] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleOpenCreate = (e?: React.MouseEvent<HTMLElement>) => {
    sound.playClick()
    if (e) triggerButtonSparks(e, 'forge', 18)
    setEditingDebt(null)
    setName('')
    setKind('credit_card')
    setInstitution('')
    setOpeningBalance(0)
    setCreditLimit(0)
    setCutDay(25)
    setDueDay(10)
    setExpectedInstallment(0)
    setStatus('active')
    setNotes('')
    setErrorMessage(null)
    setModalOpen(true)
  }

  const handleOpenEdit = (debt: Debt) => {
    sound.playClick()
    setEditingDebt(debt)
    setName(debt.name)
    setKind(debt.kind)
    setInstitution(debt.institution || '')
    setOpeningBalance(debt.openingBalance)
    setCreditLimit(debt.creditLimit || 0)
    setCutDay(debt.cutDay || 25)
    setDueDay(debt.dueDay || 10)
    setExpectedInstallment(debt.expectedInstallment || 0)
    setStatus(debt.status)
    setNotes(debt.notes || '')
    setErrorMessage(null)
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    if (isSubmitting) return
    sound.playClick()
    setModalOpen(false)
    setEditingDebt(null)
    setErrorMessage(null)
  }

  const handleSubmitDebt = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setErrorMessage('El nombre de la obligación es requerido.')
      return
    }
    setIsSubmitting(true)
    setErrorMessage(null)
    try {
      await saveDebt({
        ...(editingDebt ? { id: editingDebt.id } : {}),
        name: name.trim(),
        kind,
        institution: institution.trim() || null,
        openingBalance: editingDebt ? editingDebt.openingBalance : openingBalance,
        openingDate: editingDebt ? editingDebt.openingDate : today,
        creditLimit: creditLimit > 0 ? creditLimit : null,
        interestRate: editingDebt ? editingDebt.interestRate : null,
        cutDay: cutDay > 0 ? cutDay : null,
        dueDay: dueDay > 0 ? dueDay : null,
        expectedInstallment: expectedInstallment > 0 ? expectedInstallment : null,
        totalInstallments: editingDebt ? editingDebt.totalInstallments : null,
        status: editingDebt ? status : 'active',
        notes: notes.trim() || null,
      })
      sound.playConfirm()
      triggerPixelSparks(window.innerWidth / 2, window.innerHeight * 0.45, 'amber', 14)
      setModalOpen(false)
      setEditingDebt(null)
    } catch (err) {
      sound.playError()
      setErrorMessage((err as Error).message || 'Error al persistir la obligación')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteDebt = async (id: string, debtName: string) => {
    sound.playClick()
    if (window.confirm(`¿Confirmas eliminar la obligación «${debtName}»?`)) {
      try {
        await deleteDebt(id)
        sound.playConfirm()
      } catch (err) {
        sound.playError()
        alert((err as Error).message)
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabecera del Centro de Obligaciones y Cadenas */}
      <div className="forge-machine-panel rivet-corners p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-[#3a2820] bg-[#140e0c]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xs bg-[#1f100a] border border-amber-800/80 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
            <PixelSprite name="chain" size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="led-pilot led-pilot-orange" />
              <h2 className="font-stencil text-lg sm:text-xl font-bold text-amber-400 tracking-wider">
                LIBRO DE OBLIGACIONES Y PASIVOS (CADENAS)
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Pasivos totales pendientes:{' '}
              <span className="font-mono text-rose-400 font-bold text-sm">
                {formatCOP(balances.totalDebt)}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={(e) => {
              sound.playClick()
              triggerButtonSparks(e, 'amber', 14)
              openQuickModal('debt_payment')
            }}
            className="btn-game btn-game-secondary btn-forge-heat text-xs py-2 px-3 flex items-center gap-2 cursor-pointer font-pixel"
          >
            <PixelSprite name="coins" size={14} />
            <span>REGISTRAR ABONO</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="btn-game btn-game-primary btn-forge-heat text-xs py-2 px-3.5 flex items-center gap-2 cursor-pointer font-pixel font-bold"
          >
            <Plus size={15} />
            <span>NUEVA OBLIGACIÓN</span>
          </button>
        </div>
      </div>

      {/* Grid de obligaciones o Estado Libre de Deudas */}
      {debts.length === 0 ? (
        <div className="forge-machine-panel rivet-corners p-10 text-center border-2 border-emerald-800/80 bg-[#0d1612]">
          <div className="w-16 h-16 mx-auto mb-3.5 p-3 rounded-xs bg-[#102019] border-2 border-emerald-600/70 flex items-center justify-center shadow-lg">
            <PixelSprite name="chain_broken" size={48} />
          </div>
          <h3 className="font-stencil text-base text-emerald-400 font-black tracking-wider uppercase">
            ¡CADENAS ROTAS! TALLER LIBRE DE DEUDAS
          </h3>
          <p className="text-xs text-slate-300 mt-1.5 max-w-md mx-auto font-pixel leading-relaxed">
            No tienes obligaciones financieras activas en este momento. Tu capacidad productiva y flujo de caja están completamente limpios de pasivos.
          </p>
          <button
            onClick={handleOpenCreate}
            className="btn-game btn-game-secondary text-xs py-2 px-4 mt-4 font-pixel cursor-pointer"
          >
            + REGISTRAR UNA OBLIGACIÓN SI EXISTE
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {debts.map((debt) => {
            const summary = summarizeDebt(debt, transactions, today)
            const isCreditCard = debt.kind === 'credit_card'
            const limit = debt.creditLimit || 0
            const usedPercent = limit > 0 ? Math.min(100, Math.round((summary.balance / limit) * 100)) : 0

            return (
              <div
                key={debt.id}
                className="forge-machine-panel rivet-corners border-[#3a2820] bg-[#120d0b] p-4 flex flex-col justify-between shadow-lg"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3 pb-2.5 border-b border-[#261812]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xs bg-[#1c0f0a] border border-amber-800/60 flex items-center justify-center shrink-0">
                        <PixelSprite name={summary.isPaidOff ? 'chain_broken' : 'chain'} size={20} />
                      </div>
                      <div>
                        <h3 className="font-stencil font-bold text-slate-100 text-sm">{debt.name}</h3>
                        <span className="text-[10px] text-slate-400 font-pixel uppercase tracking-wider">
                          {debt.institution ? `${debt.institution} • ` : ''}
                          {DEBT_KIND_LABELS[debt.kind]}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`badge-pixel text-[9px] px-2 py-0.5 ${
                          summary.isPaidOff
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                            : 'bg-rose-950/80 text-rose-300 border-rose-800'
                        }`}
                      >
                        {summary.isPaidOff ? 'CADENA ROTA (LIQUIDADA)' : 'ACTIVA'}
                      </span>
                      <button
                        onClick={() => handleOpenEdit(debt)}
                        className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-[#2b170f] transition-colors cursor-pointer"
                        title="Modificar obligación"
                        aria-label="Modificar obligación"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteDebt(debt.id, debt.name)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Eliminar obligación"
                        aria-label="Eliminar obligación"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Saldo actual adeudado */}
                  <div className="bg-[#0a0706] p-3 rounded-xs border border-[#261711] shadow-inner mb-3">
                    <span className="text-[10px] text-slate-400 font-stencil uppercase tracking-wider block">
                      SALDO PENDIENTE POR AMORTIZAR
                    </span>
                    <div className="font-mono text-2xl font-black text-amber-300 tracking-tight mt-0.5">
                      {formatCOP(summary.balance)}
                    </div>

                    {/* Barra de uso de cupo si es tarjeta de crédito */}
                    {isCreditCard && limit > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-[#1c120d]">
                        <div className="flex items-center justify-between text-[10px] font-stencil text-slate-400 mb-1">
                          <span>USO DE CUPO: {usedPercent}%</span>
                          <span className="text-cyan-300">DISPONIBLE: {formatCOP(summary.available ?? 0)}</span>
                        </div>
                        <div className="w-full bg-[#160d09] h-2 border border-[#2b160f] overflow-hidden flex">
                          <div
                            className={`h-full transition-all duration-300 ${
                              usedPercent > 80
                                ? 'bg-rose-600'
                                : usedPercent > 50
                                ? 'bg-amber-600'
                                : 'bg-emerald-600'
                            }`}
                            style={{ width: `${usedPercent}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Métricas de capital amortizado y fechas clave */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-[#0f0a08] p-2.5 rounded-xs border border-[#22140e]">
                    <div>
                      <span className="text-[10px] text-slate-400 font-pixel">Capital Amortizado</span>
                      <p className="font-mono text-emerald-400 font-bold mt-0.5">
                        {formatCOP(summary.principalPaid)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-pixel">Intereses / Cobros</span>
                      <p className="font-mono text-rose-400 font-bold mt-0.5">
                        {formatCOP(summary.interestAndFees)}
                      </p>
                    </div>

                    {summary.nextDueDate && (
                      <div className="col-span-2 flex items-center justify-between border-t border-[#1e130d] pt-1.5 mt-1 text-[11px] font-pixel">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Calendar size={12} className="text-amber-400" />
                          Próximo pago:
                        </span>
                        <span className="font-bold text-amber-300 font-mono">
                          {formatShortDate(summary.nextDueDate, true)} (en {summary.daysToDue} días)
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Historial de la deuda */}
                <div className="mt-4 pt-3 border-t border-[#261711]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-stencil uppercase text-slate-400 tracking-wider">
                      HISTORIAL DE ABONOS ({summary.history.length})
                    </span>
                    <button
                      onClick={() => openQuickModal('debt_payment')}
                      className="btn-game btn-game-primary text-[10px] py-1 px-2.5 font-stencil font-bold cursor-pointer"
                    >
                      + ABONAR
                    </button>
                  </div>

                  {summary.history.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic font-pixel">Sin pagos registrados en este ciclo</p>
                  ) : (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {summary.history.slice(-4).map((h) => (
                        <div
                          key={h.transactionId}
                          className="flex items-center justify-between text-[11px] bg-[#0c0806] px-2 py-1 rounded-xs border border-[#1e120c]"
                        >
                          <span className="text-slate-300 truncate max-w-[170px] font-pixel">{h.description}</span>
                          <span
                            className={`font-mono font-bold ${
                              h.change < 0 ? 'text-emerald-400' : 'text-amber-400'
                            }`}
                          >
                            {h.change < 0 ? '−' : '+'}
                            {formatCOP(Math.abs(h.change))}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL NUEVA / EDITAR OBLIGACIÓN */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="forge-modal-box rivet-corners max-w-md w-full p-5 border-2 border-amber-800/80 shadow-2xl">
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b-2 border-[#331c12]">
              <div className="flex items-center gap-2">
                <PixelSprite name="chain" size={20} />
                <h3 className="font-stencil text-base text-amber-400 font-bold tracking-wide">
                  {editingDebt ? 'MODIFICAR OBLIGACIÓN FINANCIERA' : 'REGISTRAR NUEVA OBLIGACIÓN FINANCIERA'}
                </h3>
              </div>
              <button
                onClick={handleCloseModal}
                disabled={isSubmitting}
                className="p-1 rounded-xs text-slate-400 hover:text-slate-100 hover:bg-[#2b170f] border border-transparent hover:border-[#4d2818] transition-colors cursor-pointer"
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

            <form onSubmit={handleSubmitDebt} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                  NOMBRE DE LA OBLIGACIÓN
                </label>
                <input
                  type="text"
                  placeholder="Ej. Tarjeta Bancolombia / Crédito Libre Inversión"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-[#080504] border border-[#331c12] rounded-xs p-2 text-slate-200 text-xs font-pixel focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                    TIPO DE OBLIGACIÓN
                  </label>
                  <select
                    value={kind}
                    onChange={(e) => setKind(e.target.value as DebtKind)}
                    className="w-full bg-[#080504] border border-[#331c12] rounded-xs p-2 text-slate-200 text-xs font-pixel focus:outline-none focus:border-amber-400"
                  >
                    <option value="credit_card">Tarjeta de crédito</option>
                    <option value="personal_loan">Crédito de libre inversión</option>
                    <option value="other">Otra obligación comercial</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                    ENTIDAD ACREEDORA
                  </label>
                  <input
                    type="text"
                    placeholder="Banco, fintech o particular"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    className="w-full bg-[#080504] border border-[#331c12] rounded-xs p-2 text-slate-200 text-xs font-pixel focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {editingDebt ? (
                <div>
                  <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                    SALDO INICIAL DE ORIGEN (FIJO)
                  </label>
                  <div className="bg-[#080504] border border-[#331c12] rounded-xs p-2 text-slate-400 font-mono text-xs">
                    {formatCOP(openingBalance)}
                  </div>
                  <p className="text-[10px] text-amber-400/90 font-pixel mt-1">
                    El saldo inicial está fijado en la partida doble histórica. Usa las operaciones de abono o cargos para modificar el saldo pendiente.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                    SALDO ACTUAL ADEUDADO (COP)
                  </label>
                  <MoneyInput value={openingBalance} onChange={setOpeningBalance} placeholder="0" />
                </div>
              )}

              {kind === 'credit_card' && (
                <div>
                  <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                    CUPO TOTAL DEL CRÉDITO
                  </label>
                  <MoneyInput value={creditLimit} onChange={setCreditLimit} placeholder="0" />
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                    DÍA CORTE
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={cutDay}
                    onChange={(e) => setCutDay(Number(e.target.value))}
                    className="w-full bg-[#080504] border border-[#331c12] rounded-xs p-2 text-slate-200 font-pixel text-xs focus:outline-none focus:border-amber-400 num"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                    DÍA PAGO
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={dueDay}
                    onChange={(e) => setDueDay(Number(e.target.value))}
                    className="w-full bg-[#080504] border border-[#331c12] rounded-xs p-2 text-slate-200 font-pixel text-xs focus:outline-none focus:border-amber-400 num"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                    CUOTA SUGERIDA
                  </label>
                  <MoneyInput value={expectedInstallment} onChange={setExpectedInstallment} placeholder="0" />
                </div>
              </div>

              {editingDebt && (
                <div>
                  <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                    ESTADO DE LA OBLIGACIÓN
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as Debt['status'])}
                    className="w-full bg-[#080504] border border-[#331c12] rounded-xs p-2 text-slate-200 text-xs font-pixel focus:outline-none focus:border-amber-400"
                  >
                    <option value="active">Activa (en amortización)</option>
                    <option value="paid_off">Liquidada / Cadena rota</option>
                    <option value="frozen">Congelada / En disputa</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                  NOTAS OPERATIVAS (OPCIONAL)
                </label>
                <input
                  type="text"
                  placeholder="Detalles sobre seguro, condiciones, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-[#080504] border border-[#331c12] rounded-xs p-2 text-slate-200 text-xs font-pixel focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3.5 border-t-2 border-[#331c12]">
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
                  <span>{isSubmitting ? 'GUARDANDO...' : (editingDebt ? 'GUARDAR MODIFICACIONES' : 'GUARDAR OBLIGACIÓN')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
