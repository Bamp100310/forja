import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Target, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react'
import { useForja } from '../../context/ForjaContext'
import { formatCOP } from '../../domain/money'
import { formatShortDate } from '../../domain/dates'
import { buildRecurringSchedule } from '../../domain/recurring'
import { goalProgress } from '../../domain/planning'
import { PixelSprite } from '../common/PixelSprite'
import { sound } from '../../services/sound'
import { triggerButtonSparks } from '../common/PixelSparks'

export const PersonalCommitmentsAndGoalsModule: React.FC = () => {
  const {
    recurring,
    occurrences,
    budgets,
    goals,
    categories,
    balances,
    summary,
    today,
    isModuleActive,
    openQuickModal,
  } = useForja()
  const navigate = useNavigate()

  const isRecurringActive = isModuleActive('recurring')
  const isBudgetsActive = isModuleActive('budgets')

  // Próximos compromisos recurrentes pendientes ordenados por fecha de vencimiento
  const pendingCommitments = useMemo(() => {
    if (!isRecurringActive) return []
    const items: Array<{
      occId: string
      recurringId: string
      name: string
      dueDate: string
      daysLeft: number
      amount: number
      categoryId: string
      accountId: string | null
    }> = []

    for (const template of recurring) {
      if (template.status !== 'active') continue
      const schedule = buildRecurringSchedule(template, occurrences, today)
      if (schedule.next) {
        items.push({
          occId: `${template.id}:${schedule.next.dueDate}`,
          recurringId: template.id,
          name: template.name,
          dueDate: schedule.next.dueDate,
          daysLeft: schedule.next.daysToDue,
          amount: template.amount,
          categoryId: template.categoryId,
          accountId: template.paymentAccountId,
        })
      }
    }

    return items.sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 4)
  }, [isRecurringActive, recurring, occurrences, today])

  // Ejecución de presupuestos del corte activo
  const budgetStatuses = useMemo(() => {
    if (!isBudgetsActive) return []
    const catMap = new Map(categories.map((c) => [c.id, c]))
    const spentMap = new Map(summary.expenseByCategory.map((e) => [e.categoryId, e.amount]))
    return budgets
      .map((b) => {
        const cat = catMap.get(b.categoryId)
        const spent = spentMap.get(b.categoryId) ?? 0
        const pct = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0
        return {
          id: b.id,
          categoryName: cat?.name || 'Categoría',
          limit: b.amount,
          spent,
          pct,
        }
      })
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 3)
  }, [isBudgetsActive, budgets, categories, summary.expenseByCategory])

  const activeGoals = useMemo(() => {
    if (!isBudgetsActive) return []
    return goals
      .filter((g) => g.status === 'active')
      .map((g) => {
        const progress = goalProgress(g, balances)
        const currentAmount = progress.current ?? 0
        const pct =
          g.targetAmount > 0 ? Math.min(100, Math.round((currentAmount / g.targetAmount) * 100)) : 0
        return {
          ...g,
          currentAmount,
          pct,
        }
      })
      .slice(0, 2)
  }, [isBudgetsActive, goals, balances])

  if (!isRecurringActive && !isBudgetsActive) {
    return null
  }

  return (
    <div
      className={`grid grid-cols-1 ${
        isRecurringActive && isBudgetsActive ? 'lg:grid-cols-2' : 'lg:grid-cols-1'
      } gap-4`}
    >
      {/* =====================================================================
          ESTACIÓN DE COMPROMISOS PRÓXIMOS Y VENCIMIENTOS (MÓDULO RECURRENTES)
          ===================================================================== */}
      {isRecurringActive && (
        <section
          aria-label="Estación de compromisos fijos y pagos próximos"
          className="forge-machine-panel rivet-corners p-4 sm:p-5 flex flex-col justify-between space-y-4"
        >
          <div className="flex items-center justify-between border-b border-[#213731] pb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xs bg-[#101e19] border border-amber-700/60 text-amber-400">
                <Calendar size={16} />
              </div>
              <div>
                <h2 className="font-stencil text-xs font-bold text-slate-100 uppercase tracking-wider">
                  COMPROMISOS Y VENCIMIENTOS PRÓXIMOS
                </h2>
                <p className="text-[10px] text-slate-400 font-pixel">
                  Obligaciones periódicas pendientes en el ciclo actual
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                sound.playClick()
                navigate('/recurrentes')
              }}
              className="text-[11px] font-pixel text-amber-300 hover:text-amber-200 flex items-center gap-1 cursor-pointer"
            >
              <span>Ver calendario</span>
              <ArrowRight size={12} />
            </button>
          </div>

          {pendingCommitments.length === 0 ? (
            <div className="p-4 rounded-xs bg-[#09110e] border border-[#1d322a] text-center space-y-1.5">
              <CheckCircle2 size={20} className="text-emerald-400 mx-auto" />
              <p className="text-xs font-pixel font-bold text-emerald-300">
                SIN COMPROMISOS PENDIENTES EN COLA
              </p>
              <p className="text-[11px] font-pixel text-slate-400">
                Todos tus gastos recurrentes programados están al día o aún no tienes plantillas activas.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingCommitments.map((item) => {
                const isOverdue = item.daysLeft < 0
                const isSoon = item.daysLeft >= 0 && item.daysLeft <= 5
                return (
                  <div
                    key={item.occId}
                    className={`p-3 rounded-xs border flex items-center justify-between gap-3 ${
                      isOverdue
                        ? 'bg-[#21100e] border-rose-700/70'
                        : isSoon
                          ? 'bg-[#1e150b] border-amber-600/70'
                          : 'bg-[#0b1310] border-[#1f342c]'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-pixel text-xs font-bold text-slate-100 truncate">
                          {item.name}
                        </span>
                        <span
                          className={`badge-pixel text-[8px] px-1.5 py-0.5 ${
                            isOverdue
                              ? 'bg-rose-950 text-rose-300 border-rose-700'
                              : isSoon
                                ? 'bg-amber-950 text-amber-300 border-amber-700'
                                : 'bg-[#12221c] text-emerald-300 border-emerald-800'
                          }`}
                        >
                          {isOverdue
                            ? `VENCIDO (${Math.abs(item.daysLeft)}D)`
                            : item.daysLeft === 0
                              ? 'VENCE HOY'
                              : `EN ${item.daysLeft} DÍAS`}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                        Fecha límite: {formatShortDate(item.dueDate, true)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-sm font-bold num text-amber-300">
                        {formatCOP(item.amount)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          sound.playClick()
                          triggerButtonSparks(e, 'amber', 12)
                          openQuickModal('expense', null, {
                            amount: item.amount,
                            description: `Pago ${item.name}`,
                            categoryId: item.categoryId || undefined,
                            fromAccountId: item.accountId || undefined,
                          })
                        }}
                        className="btn-game btn-game-secondary text-[10px] py-1 px-2.5 font-pixel font-bold text-emerald-300 cursor-pointer"
                      >
                        PAGAR
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* =====================================================================
          ESTACIÓN DE PRESUPUESTOS Y METAS DE AHORRO (MÓDULO BUDGETS)
          ===================================================================== */}
      {isBudgetsActive && (
        <section
          aria-label="Estación de presupuestos y metas financieras"
          className="forge-machine-panel rivet-corners p-4 sm:p-5 flex flex-col justify-between space-y-4"
        >
          <div className="flex items-center justify-between border-b border-[#213731] pb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xs bg-[#101e19] border border-cyan-700/60 text-cyan-400">
                <Target size={16} />
              </div>
              <div>
                <h2 className="font-stencil text-xs font-bold text-slate-100 uppercase tracking-wider">
                  CONTROL DE PRESUPUESTOS Y METAS
                </h2>
                <p className="text-[10px] text-slate-400 font-pixel">
                  Límites de gasto del corte y progreso de reservas
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                sound.playClick()
                navigate('/presupuestos')
              }}
              className="text-[11px] font-pixel text-cyan-300 hover:text-cyan-200 flex items-center gap-1 cursor-pointer"
            >
              <span>Gestionar metas</span>
              <ArrowRight size={12} />
            </button>
          </div>

          {budgetStatuses.length === 0 && activeGoals.length === 0 ? (
            <div className="p-4 rounded-xs bg-[#09110e] border border-[#1d322a] text-center space-y-2">
              <PixelSprite name="blueprint" size={22} className="mx-auto" />
              <p className="text-xs font-pixel font-bold text-slate-200">
                SIN TOPES O METAS CONFIGURADAS AÚN
              </p>
              <p className="text-[11px] font-pixel text-slate-400">
                Define presupuestos por categoría o metas de ahorro para supervisar su avance aquí.
              </p>
              <button
                type="button"
                onClick={() => {
                  sound.playClick()
                  navigate('/presupuestos')
                }}
                className="btn-game btn-game-secondary text-[10px] py-1 px-3 font-pixel text-cyan-300 cursor-pointer"
              >
                + CONFIGURAR PRESUPUESTO O META
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Topes presupuestales */}
              {budgetStatuses.map((b) => {
                const isOver = b.pct > 100
                const isWarning = b.pct >= 80 && b.pct <= 100
                return (
                  <div
                    key={b.id}
                    className="p-2.5 rounded-xs bg-[#0b1310] border border-[#1f342c] space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-pixel font-bold text-slate-200 flex items-center gap-1.5">
                        {isOver && <AlertTriangle size={12} className="text-rose-400" />}
                        <span>{b.categoryName}</span>
                      </span>
                      <span className="text-[11px] num font-bold text-slate-300">
                        <span className={isOver ? 'text-rose-400' : 'text-amber-300'}>
                          {formatCOP(b.spent)}
                        </span>{' '}
                        / {formatCOP(b.limit)} ({b.pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[#060a09] border border-[#1d3129] rounded-xs overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          isOver
                            ? 'bg-rose-500'
                            : isWarning
                              ? 'bg-amber-400'
                              : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, b.pct)}%` }}
                      />
                    </div>
                  </div>
                )
              })}

              {/* Metas de ahorro activas */}
              {activeGoals.map((g) => {
                return (
                  <div
                    key={g.id}
                    className="p-2.5 rounded-xs bg-[#0d1815] border border-cyan-900/60 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-pixel font-bold text-cyan-300 flex items-center gap-1.5">
                        <PixelSprite name="flag" size={13} />
                        <span>Meta: {g.name}</span>
                      </span>
                      <span className="text-[11px] num font-bold text-slate-200">
                        {formatCOP(g.currentAmount)} / {formatCOP(g.targetAmount)} ({g.pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[#060a09] border border-[#1d3129] rounded-xs overflow-hidden">
                      <div
                        className="h-full bg-cyan-400 transition-all duration-500"
                        style={{ width: `${g.pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
