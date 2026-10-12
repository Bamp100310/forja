import React, { useState } from 'react'
import { Plus, X, Trash2 } from 'lucide-react'
import { useForja } from '../context/ForjaContext'
import { formatCOP, formatPercent } from '../domain/money'
import { formatShortDate } from '../domain/dates'
import { budgetProgress, budgetWindow, goalProgress } from '../domain/planning'
import { GOAL_KIND_LABELS, type BudgetBasis, type GoalKind } from '../domain/types'
import { MoneyInput } from '../components/forms/MoneyInput'
import { PixelSprite } from '../components/common/PixelSprite'
import { EmptyState } from '../components/common/EmptyState'
import { sound } from '../services/sound'
import { triggerPixelSparks } from '../components/common/PixelSparks'

export const PlanningPage: React.FC = () => {
  const {
    budgets,
    goals,
    categories,
    accounts,
    debts,
    balances,
    summary,
    today,
    saveBudget,
    deleteBudget,
    saveGoal,
    deleteGoal,
  } = useForja()

  const [activeTab, setActiveTab] = useState<'budgets' | 'goals'>('budgets')
  const [budgetModalOpen, setBudgetModalOpen] = useState(false)
  const [goalModalOpen, setGoalModalOpen] = useState(false)

  // Presupuesto
  const [budgetCatId, setBudgetCatId] = useState('')
  const [budgetAmount, setBudgetAmount] = useState<number>(0)
  const [budgetBasis, setBudgetBasis] = useState<BudgetBasis>('calendar_month')

  // Objetivo
  const [goalName, setGoalName] = useState('')
  const [goalKind, setGoalKind] = useState<GoalKind>('save')
  const [goalTargetAmount, setGoalTargetAmount] = useState<number>(0)
  const [goalTargetDate, setGoalTargetDate] = useState('')
  const [goalAccountId, setGoalAccountId] = useState('')
  const [goalDebtId, setGoalDebtId] = useState('')

  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await saveBudget({
        categoryId: budgetCatId || categories.find((c) => c.kind === 'expense')?.id || '',
        amount: budgetAmount,
        basis: budgetBasis,
      })
      sound.playConfirm()
      triggerPixelSparks(window.innerWidth / 2, window.innerHeight * 0.45, 'amber', 14)
      setBudgetModalOpen(false)
      setBudgetAmount(0)
    } catch (err) {
      sound.playError()
      alert((err as Error).message)
    }
  }

  const handleDeleteBudget = async (id: string, catName: string) => {
    sound.playClick()
    if (window.confirm(`¿Confirmas eliminar la cuota de gasto para «${catName}»?`)) {
      try {
        await deleteBudget(id)
        sound.playConfirm()
      } catch (err) {
        sound.playError()
        alert((err as Error).message)
      }
    }
  }

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      let baselineAmount: number | null = null
      if (goalKind === 'reduce_debt' && goalDebtId) {
        baselineAmount = balances.debtBalance.get(goalDebtId) ?? 0
      }

      await saveGoal({
        name: goalName.trim(),
        kind: goalKind,
        targetAmount: goalTargetAmount,
        targetDate: goalTargetDate || null,
        accountId: goalAccountId || null,
        debtId: goalDebtId || null,
        baselineAmount,
        status: 'active',
        notes: null,
      })
      sound.playConfirm()
      triggerPixelSparks(window.innerWidth / 2, window.innerHeight * 0.45, 'emerald', 14)
      setGoalModalOpen(false)
      setGoalName('')
      setGoalTargetAmount(0)
    } catch (err) {
      sound.playError()
      alert((err as Error).message)
    }
  }

  const handleDeleteGoal = async (id: string, gName: string) => {
    sound.playClick()
    if (window.confirm(`¿Confirmas eliminar la meta de taller «${gName}»?`)) {
      try {
        await deleteGoal(id)
        sound.playConfirm()
      } catch (err) {
        sound.playError()
        alert((err as Error).message)
      }
    }
  }

  return (
    <div className="space-y-5">
      {/* Cabecera del Centro de Planificación */}
      <div className="forge-machine-panel rivet-corners p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-[#101d18] border border-emerald-800/80 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
            <PixelSprite name="gauge" size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="led-pilot led-pilot-online"></span>
              <h2 className="font-pixel text-lg sm:text-xl font-bold text-emerald-400 tracking-wider">
                CUOTAS INDUSTRIALES Y METAS DEL TALLER
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Límites operativos de gasto por categoría y metas de capital para escalar tu capacidad productiva
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'budgets' ? (
            <button
              onClick={() => {
                const exp = categories.find((c) => c.kind === 'expense')
                if (exp) setBudgetCatId(exp.id)
                setBudgetModalOpen(true)
              }}
              className="btn-game btn-game-primary text-xs py-2 px-3.5 flex items-center gap-2"
            >
              <Plus size={15} />
              <span className="font-pixel font-bold">NUEVA CUOTA DE GASTO</span>
            </button>
          ) : (
            <button
              onClick={() => {
                if (accounts.length > 0) setGoalAccountId(accounts[0].id)
                if (debts.length > 0) setGoalDebtId(debts[0].id)
                setGoalModalOpen(true)
              }}
              className="btn-game btn-game-primary text-xs py-2 px-3.5 flex items-center gap-2"
            >
              <Plus size={15} />
              <span className="font-pixel font-bold">NUEVA META DE TALLER</span>
            </button>
          )}
        </div>
      </div>

      {/* Selector de módulos / pestañas */}
      <div className="flex border-b border-[#213731] gap-3 text-xs">
        <button
          onClick={() => setActiveTab('budgets')}
          className={`pb-2.5 px-3 font-pixel tracking-wider text-xs border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'budgets'
              ? 'border-emerald-400 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <PixelSprite name="gauge" size={14} />
          <span>CUOTAS DE GASTO ({budgets.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('goals')}
          className={`pb-2.5 px-3 font-pixel tracking-wider text-xs border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'goals'
              ? 'border-emerald-400 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <PixelSprite name="ingot" size={14} />
          <span>METAS DE CAPITAL ({goals.length})</span>
        </button>
      </div>

      {/* PESTAÑA 1: PRESUPUESTOS (CUOTAS) */}
      {activeTab === 'budgets' && (
        <div className="space-y-4">
          {budgets.length === 0 ? (
            <EmptyState
              sprite="gauge"
              title="Sin cuotas de gasto configuradas"
              description="Define techos máximos de gasto para gasolina, alimentación, repuestos o servicios del taller."
              actionLabel="+ CONFIGURAR PRIMERA CUOTA"
              onAction={() => {
                const exp = categories.find((c) => c.kind === 'expense')
                if (exp) setBudgetCatId(exp.id)
                setBudgetModalOpen(true)
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {budgets.map((b) => {
                const cat = categories.find((c) => c.id === b.categoryId)
                const spent = summary.expenseByCategory.find((x) => x.categoryId === b.categoryId)?.amount || 0
                const prog = budgetProgress(spent, b.amount)
                const win = budgetWindow(b, today)

                return (
                  <div key={b.id} className="forge-machine-panel rivet-corners p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded bg-[#101d18] border border-[#213731] flex items-center justify-center shrink-0">
                            <PixelSprite name="gauge" size={18} />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-100 text-sm">
                              {cat?.name || 'Categoría'}
                            </h3>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Ventana: {win.label} ({b.basis === 'calendar_month' ? 'Mes calendario' : 'Corte 11-10'})
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span
                            className={`badge-pixel text-[9px] px-2 py-0.5 ${
                              prog.level === 'exceeded'
                                ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                                : prog.level === 'warning'
                                ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                                : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                            }`}
                          >
                            {prog.level === 'exceeded'
                              ? 'EXCEDIDO'
                              : prog.level === 'warning'
                              ? 'ALERTA 80%'
                              : 'EN CUOTA'}
                          </span>
                          <button
                            onClick={() => handleDeleteBudget(b.id, cat?.name || 'Categoría')}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Eliminar cuota"
                            aria-label="Eliminar cuota"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <div className="bg-[#0b1311] border border-[#1e342c] p-3 rounded">
                        <div className="flex items-baseline justify-between text-xs mb-1.5">
                          <span className="text-slate-400 font-pixel text-[10px]">CONSUMO ACTUAL:</span>
                          <span className="font-pixel font-bold num text-sm tracking-tight text-slate-100">
                            {formatCOP(prog.spent)}{' '}
                            <span className="text-slate-500 font-normal">/ {formatCOP(prog.limit)}</span>
                          </span>
                        </div>

                        {/* Barra de progreso de cuota */}
                        <div className="w-full bg-[#080d0c] rounded h-3 overflow-hidden border border-[#213731] p-0.5">
                          <div
                            className={`h-full rounded-sm transition-all duration-300 ${
                              prog.level === 'exceeded'
                                ? 'bg-rose-500'
                                : prog.level === 'warning'
                                ? 'bg-amber-400'
                                : 'bg-emerald-400'
                            }`}
                            style={{ width: `${Math.min(100, prog.ratio * 100)}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 font-mono">
                          <span>{formatPercent(prog.ratio)} consumido</span>
                          <span className={prog.remaining >= 0 ? 'text-emerald-400' : 'text-rose-400 font-bold'}>
                            {prog.remaining >= 0
                              ? `Margen: ${formatCOP(prog.remaining)}`
                              : `Excedido: ${formatCOP(Math.abs(prog.remaining))}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 2: OBJETIVOS */}
      {activeTab === 'goals' && (
        <div className="space-y-4">
          {goals.length === 0 ? (
            <EmptyState
              sprite="flag"
              title="Sin metas de taller activas"
              description="Crea una meta de capital como fondo de emergencias, mejoras para la moto o reducción de pasivos."
              actionLabel="+ ESTABLECER PRIMERA META"
              onAction={() => {
                if (accounts.length > 0) setGoalAccountId(accounts[0].id)
                if (debts.length > 0) setGoalDebtId(debts[0].id)
                setGoalModalOpen(true)
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {goals.map((goal) => {
                const prog = goalProgress(goal, balances)

                return (
                  <div key={goal.id} className="forge-machine-panel rivet-corners p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded bg-[#101d18] border border-[#213731] flex items-center justify-center shrink-0 text-emerald-400">
                            <PixelSprite name="ingot" size={18} />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-100 text-sm">{goal.name}</h3>
                            <span className="text-[10px] text-slate-400 font-pixel tracking-wider uppercase">
                              {GOAL_KIND_LABELS[goal.kind]}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span
                            className={`badge-pixel text-[9px] px-2 py-0.5 ${
                              prog.achieved
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                                : 'bg-slate-900 text-slate-300 border-slate-700'
                            }`}
                          >
                            {prog.achieved ? 'ALCANZADO' : 'EN MARCHA'}
                          </span>
                          <button
                            onClick={() => handleDeleteGoal(goal.id, goal.name)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Eliminar meta"
                            aria-label="Eliminar meta"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <div className="bg-[#0b1311] border border-[#1e342c] p-3 rounded">
                        <span className="text-[10px] text-slate-400 font-pixel uppercase tracking-wider block">
                          META OBJETIVO A FORJAR
                        </span>
                        <div className="font-pixel font-bold num text-2xl text-emerald-300 tracking-tight mt-0.5">
                          {formatCOP(goal.targetAmount)}
                        </div>

                        {prog.current !== null && (
                          <div className="mt-3">
                            <div className="w-full bg-[#080d0c] rounded h-3 overflow-hidden border border-[#213731] p-0.5">
                              <div
                                className="h-full rounded-sm bg-emerald-400 transition-all duration-300"
                                style={{ width: `${Math.min(100, (prog.ratio ?? 0) * 100)}%` }}
                              />
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-slate-300 mt-2 font-mono">
                              <span>Acumulado: {formatCOP(prog.current)}</span>
                              <span className="text-emerald-400 font-bold">{formatPercent(prog.ratio ?? 0)}</span>
                            </div>
                          </div>
                        )}

                        {goal.targetDate && (
                          <p className="text-[10px] text-slate-500 mt-2 font-mono border-t border-[#162520] pt-1.5">
                            Fecha límite programada: {formatShortDate(goal.targetDate, true)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL NUEVO PRESUPUESTO */}
      {budgetModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="forge-modal-box rivet-corners max-w-md w-full p-5 border-2 border-emerald-800/80 shadow-2xl">
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b-2 border-[#1c3029]">
              <div className="flex items-center gap-2">
                <PixelSprite name="gauge" size={20} />
                <h3 className="font-stencil text-base text-emerald-400 font-bold tracking-wide">
                  INSTALAR NUEVA CUOTA DE GASTO
                </h3>
              </div>
              <button
                onClick={() => setBudgetModalOpen(false)}
                className="p-1 rounded-xs text-slate-400 hover:text-slate-100 hover:bg-[#1a2d25] border border-transparent hover:border-[#2f5243] transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateBudget} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                  CATEGORÍA DE GASTO
                </label>
                <select
                  value={budgetCatId}
                  onChange={(e) => setBudgetCatId(e.target.value)}
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
                  LÍMITE MÁXIMO (COP)
                </label>
                <MoneyInput value={budgetAmount} onChange={setBudgetAmount} required placeholder="0" />
              </div>

              <div>
                <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                  BASE DEL PERIODO
                </label>
                <select
                  value={budgetBasis}
                  onChange={(e) => setBudgetBasis(e.target.value as BudgetBasis)}
                  className="w-full bg-[#080d0c] border border-[#213731] rounded-xs p-2 text-slate-200 text-xs font-pixel focus:outline-none focus:border-amber-400"
                >
                  <option value="calendar_month">Mes Calendario (Predeterminado)</option>
                  <option value="cut">Corte Financiero (11 al 10)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-3.5 border-t-2 border-[#1c3029]">
                <button
                  type="button"
                  onClick={() => setBudgetModalOpen(false)}
                  className="btn-game btn-game-secondary text-xs py-2 px-3.5 font-pixel"
                >
                  CANCELAR
                </button>
                <button type="submit" className="btn-game btn-game-primary text-xs py-2 px-4.5 font-pixel font-bold">
                  GUARDAR CUOTA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NUEVA META */}
      {goalModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="forge-modal-box rivet-corners max-w-md w-full p-5 border-2 border-emerald-800/80 shadow-2xl">
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b-2 border-[#1c3029]">
              <div className="flex items-center gap-2">
                <PixelSprite name="ingot" size={20} />
                <h3 className="font-stencil text-base text-emerald-400 font-bold tracking-wide">
                  CREAR META DE CAPITAL
                </h3>
              </div>
              <button
                onClick={() => setGoalModalOpen(false)}
                className="p-1 rounded-xs text-slate-400 hover:text-slate-100 hover:bg-[#1a2d25] border border-transparent hover:border-[#2f5243] transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateGoal} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                  NOMBRE DEL OBJETIVO
                </label>
                <input
                  type="text"
                  placeholder="Ej. Ahorro kit de arrastre / Reducir tarjeta"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  required
                  className="w-full bg-[#080d0c] border border-[#213731] rounded-xs p-2 text-slate-200 text-xs font-pixel focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                  TIPO DE META
                </label>
                <select
                  value={goalKind}
                  onChange={(e) => setGoalKind(e.target.value as GoalKind)}
                  className="w-full bg-[#080d0c] border border-[#213731] rounded-xs p-2 text-slate-200 text-xs font-pixel focus:outline-none focus:border-amber-400"
                >
                  <option value="save">Ahorrar una cantidad</option>
                  <option value="maintenance_fund">Fondo de mantenimiento moto</option>
                  <option value="reduce_debt">Reducir una deuda</option>
                  <option value="reserve">Reserva para gasto futuro</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                  META A ALCANZAR (COP)
                </label>
                <MoneyInput value={goalTargetAmount} onChange={setGoalTargetAmount} required placeholder="0" />
              </div>

              {goalKind === 'reduce_debt' ? (
                <div>
                  <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                    DEUDA A REDUCIR
                  </label>
                  <select
                    value={goalDebtId}
                    onChange={(e) => setGoalDebtId(e.target.value)}
                    className="w-full bg-[#080d0c] border border-[#213731] rounded-xs p-2 text-slate-200 text-xs font-pixel focus:outline-none focus:border-amber-400"
                  >
                    {debts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                    BÓVEDA DONDE SE ACUMULA
                  </label>
                  <select
                    value={goalAccountId}
                    onChange={(e) => setGoalAccountId(e.target.value)}
                    className="w-full bg-[#080d0c] border border-[#213731] rounded-xs p-2 text-slate-200 text-xs font-pixel focus:outline-none focus:border-amber-400"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                  FECHA LÍMITE (OPCIONAL)
                </label>
                <input
                  type="date"
                  value={goalTargetDate}
                  onChange={(e) => setGoalTargetDate(e.target.value)}
                  className="w-full bg-[#080d0c] border border-[#213731] rounded-xs p-2 text-slate-200 text-xs font-pixel focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3.5 border-t-2 border-[#1c3029]">
                <button
                  type="button"
                  onClick={() => setGoalModalOpen(false)}
                  className="btn-game btn-game-secondary text-xs py-2 px-3.5 font-pixel"
                >
                  CANCELAR
                </button>
                <button type="submit" className="btn-game btn-game-primary text-xs py-2 px-4.5 font-pixel font-bold">
                  GUARDAR OBJETIVO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

