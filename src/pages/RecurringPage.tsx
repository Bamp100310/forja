import React, { useState } from 'react'
import { Plus, Check, X, Trash2 } from 'lucide-react'
import { useForja } from '../context/ForjaContext'
import { formatCOP } from '../domain/money'
import { formatShortDate } from '../domain/dates'
import { buildRecurringSchedule, OCCURRENCE_STATE_LABELS } from '../domain/recurring'
import { buildTransactionDraft } from '../domain/ledger/operations'
import { MoneyInput } from '../components/forms/MoneyInput'
import { FREQUENCY_LABELS, type RecurringFrequency } from '../domain/types'
import { PixelSprite } from '../components/common/PixelSprite'
import { EmptyState } from '../components/common/EmptyState'
import { sound } from '../services/sound'
import { triggerPixelSparks } from '../components/common/PixelSparks'

export const RecurringPage: React.FC = () => {
  const {
    recurring,
    occurrences,
    categories,
    accounts,
    today,
    saveRecurring,
    deleteRecurring,
    saveTransaction,
    markOccurrence,
  } = useForja()

  const [modalOpen, setModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [amount, setAmount] = useState<number>(0)
  const [categoryId, setCategoryId] = useState('')
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly')
  const [anchorDate, setAnchorDate] = useState(today)
  const [accountId, setAccountId] = useState('')

  const handleCreateRecurring = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await saveRecurring({
        name: name.trim(),
        amount,
        categoryId: categoryId || categories.find((c) => c.kind === 'expense')?.id || '',
        frequency,
        anchorDate,
        endDate: null,
        paymentAccountId: accountId || accounts[0]?.id || null,
        paymentDebtId: null,
        status: 'active',
        notes: null,
      })
      sound.playConfirm()
      triggerPixelSparks(window.innerWidth / 2, window.innerHeight * 0.45, 'amber', 14)
      setModalOpen(false)
      setName('')
      setAmount(0)
    } catch (err) {
      sound.playError()
      alert((err as Error).message)
    }
  }

  const handleDeleteRecurring = async (id: string, recName: string) => {
    sound.playClick()
    if (window.confirm(`¿Confirmas eliminar el gasto fijo «${recName}»?`)) {
      try {
        await deleteRecurring(id)
        sound.playConfirm()
      } catch (err) {
        sound.playError()
        alert((err as Error).message)
      }
    }
  }

  const handleConfirmPayment = async (recId: string, dueDate: string) => {
    const rec = recurring.find((r) => r.id === recId)
    if (!rec) return

    try {
      // 1. Crear la transacción contable real
      const draft = buildTransactionDraft(
        {
          kind: 'expense',
          date: today,
          description: `Pago recurrente: ${rec.name}`,
          categoryId: rec.categoryId,
          amount: rec.amount,
          payment: {
            method: 'account',
            accountId: rec.paymentAccountId || accounts[0]?.id || '',
          },
        },
        { categories },
      )

      const saved = await saveTransaction(draft)

      // 2. Marcar la ocurrencia como pagada vinculada a la transacción
      await markOccurrence({
        recurringId: rec.id,
        dueDate,
        status: 'paid',
        transactionId: saved.id,
      })

      sound.playExpense()
      triggerPixelSparks(window.innerWidth / 2, window.innerHeight * 0.45, 'rust', 16)
    } catch (err) {
      sound.playError()
      alert((err as Error).message)
    }
  }

  const handleSkip = async (recId: string, dueDate: string) => {
    await markOccurrence({
      recurringId: recId,
      dueDate,
      status: 'skipped',
      transactionId: null,
    })
  }

  return (
    <div className="space-y-5">
      {/* Cabecera del Centro de Programación y Mantenimientos */}
      <div className="forge-machine-panel rivet-corners p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-[#101d18] border border-sky-800/80 flex items-center justify-center text-sky-400 shrink-0 shadow-inner">
            <PixelSprite name="calendar" size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="led-pilot led-pilot-online"></span>
              <h2 className="font-stencil text-lg sm:text-xl font-bold text-sky-400 tracking-wider">
                GASTOS FIJOS Y CALENDARIO DE OBLIGACIONES
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Compromisos fijos del taller • Se computan en el corte contable real al confirmar el pago
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (categories.length > 0) {
                const exp = categories.find((c) => c.kind === 'expense')
                if (exp) setCategoryId(exp.id)
              }
              if (accounts.length > 0) setAccountId(accounts[0].id)
              setModalOpen(true)
            }}
            className="btn-game btn-game-primary text-xs py-2 px-3.5 flex items-center gap-2 cursor-pointer font-pixel font-bold"
          >
            <Plus size={15} />
            <span>NUEVO GASTO FIJO</span>
          </button>
        </div>
      </div>

      {recurring.length === 0 ? (
        <EmptyState
          sprite="calendar"
          title="Sin gastos fijos programados"
          description="Programa cuentas fijas mensuales como seguros, plan de celular, SOAT o arriendo del taller."
          actionLabel="+ PROGRAMAR PRIMER GASTO FIJO"
          onAction={() => {
            if (categories.length > 0) {
              const exp = categories.find((c) => c.kind === 'expense')
              if (exp) setCategoryId(exp.id)
            }
            if (accounts.length > 0) setAccountId(accounts[0].id)
            setModalOpen(true)
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recurring.map((rec) => {
            const sched = buildRecurringSchedule(rec, occurrences, today)
            const cat = categories.find((c) => c.id === rec.categoryId)
            const acc = accounts.find((a) => a.id === rec.paymentAccountId)

            return (
              <div key={rec.id} className="forge-machine-panel rivet-corners p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded bg-[#101d18] border border-sky-900/60 flex items-center justify-center text-sky-400 shrink-0">
                        <PixelSprite name="conveyor" size={18} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-100 text-sm">{rec.name}</h3>
                        <span className="text-[10px] text-slate-400 font-pixel tracking-wider">
                          {cat?.name || 'Gasto'} • {FREQUENCY_LABELS[rec.frequency]}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="badge-pixel text-[9px] bg-sky-950/80 text-sky-300 border-sky-800 px-2 py-0.5">
                        {rec.status.toUpperCase()}
                      </span>
                      <button
                        onClick={() => handleDeleteRecurring(rec.id, rec.name)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Eliminar gasto fijo"
                        aria-label="Eliminar gasto fijo"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#0b1311] border border-[#1e342c] p-3 rounded">
                    <span className="text-[10px] text-slate-400 font-pixel uppercase tracking-wider block">
                      CUOTA CÍCLICA PREVISTA
                    </span>
                    <div className="font-pixel font-bold num text-2xl text-sky-300 tracking-tight mt-0.5">
                      {formatCOP(rec.amount)}
                    </div>
                    {acc && (
                      <p className="text-[10px] text-slate-500 mt-1 font-mono">
                        Bóveda asignada: {acc.name}
                      </p>
                    )}
                  </div>

                  {/* Próximo vencimiento */}
                  <div className="mt-3 bg-[#0d1614] p-2.5 rounded border border-[#1a2d26]">
                    {sched.next ? (
                      <div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-pixel text-[11px]">PRÓXIMO COBRO:</span>
                          <span
                            className={`font-mono text-xs font-bold ${
                              sched.next.state === 'overdue'
                                ? 'text-rose-400'
                                : sched.next.state === 'due_soon'
                                ? 'text-amber-400'
                                : 'text-slate-200'
                            }`}
                          >
                            {formatShortDate(sched.next.dueDate, true)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5 pt-1.5 border-t border-[#162520]">
                          <span className="font-mono">{OCCURRENCE_STATE_LABELS[sched.next.state]}</span>
                          <span className="font-mono">
                            {sched.next.daysToDue < 0
                              ? `Venció hace ${Math.abs(sched.next.daysToDue)}d`
                              : `En ${sched.next.daysToDue} días`}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">Al día o sin vencimientos pendientes</p>
                    )}
                  </div>
                </div>

                {/* Acciones de ocurrencia */}
                <div className="mt-4 pt-3 border-t border-[#182622] flex items-center justify-between gap-2">
                  {sched.next && (
                    <>
                      <button
                        onClick={() => handleSkip(rec.id, sched.next!.dueDate)}
                        className="text-[11px] text-slate-400 hover:text-slate-200 font-pixel px-2 py-1"
                      >
                        OMITIR
                      </button>
                      <button
                        onClick={() => handleConfirmPayment(rec.id, sched.next!.dueDate)}
                        className="btn-game btn-game-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                      >
                        <Check size={13} />
                        <span className="font-pixel font-bold">CONFIRMAR PAGO</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL NUEVA RECURRENCIA */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="forge-modal-box rivet-corners max-w-md w-full p-5 border-2 border-sky-800/80 shadow-2xl">
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b-2 border-[#1c2d33]">
              <div className="flex items-center gap-2">
                <PixelSprite name="conveyor" size={20} />
                <h3 className="font-stencil text-base text-sky-400 font-bold tracking-wide">
                  PROGRAMAR CICLO RECURRENTE
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-xs text-slate-400 hover:text-slate-100 hover:bg-[#15252b] border border-transparent hover:border-[#25424d] transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateRecurring} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                  NOMBRE DE LA OBLIGACIÓN
                </label>
                <input
                  type="text"
                  placeholder="Ej. Internet fibra / Plan de datos / SOAT ahorro"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-[#080d0c] border border-[#213731] rounded-xs p-2 text-slate-200 text-xs font-pixel focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                  CUOTA PREVISTA (COP)
                </label>
                <MoneyInput value={amount} onChange={setAmount} required placeholder="0" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                    CATEGORÍA
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    required
                    className="w-full bg-[#080d0c] border border-[#213731] rounded-xs p-2 text-slate-200 text-xs font-pixel focus:outline-none focus:border-amber-400"
                  >
                    {categories
                      .filter((c) => c.kind === 'expense')
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                    PERIODICIDAD
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
                    className="w-full bg-[#080d0c] border border-[#213731] rounded-xs p-2 text-slate-200 text-xs font-pixel focus:outline-none focus:border-amber-400"
                  >
                    <option value="monthly">Mensual</option>
                    <option value="weekly">Semanal</option>
                    <option value="biweekly">Quincenal (cada 2 sem)</option>
                    <option value="bimonthly">Bimestral</option>
                    <option value="yearly">Anual</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                    PRIMER VENCIMIENTO
                  </label>
                  <input
                    type="date"
                    value={anchorDate}
                    onChange={(e) => setAnchorDate(e.target.value)}
                    required
                    className="w-full bg-[#080d0c] border border-[#213731] rounded-xs p-2 text-slate-200 text-xs font-pixel focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                    BÓVEDA DE PAGO
                  </label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full bg-[#080d0c] border border-[#213731] rounded-xs p-2 text-slate-200 text-xs font-pixel focus:outline-none focus:border-amber-400"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3.5 border-t-2 border-[#1c2d33]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-game btn-game-secondary text-xs py-2 px-3.5 font-pixel"
                >
                  CANCELAR
                </button>
                <button type="submit" className="btn-game btn-game-primary text-xs py-2 px-4.5 font-pixel font-bold">
                  GUARDAR RECURRENCIA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

