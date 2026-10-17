import React, { useMemo } from 'react'
import { ArrowRight, ArrowUpRight, ArrowDownRight, Flame } from 'lucide-react'
import { useForja } from '../../context/ForjaContext'
import { formatCOP } from '../../domain/money'
import { PixelSprite } from '../common/PixelSprite'
import { sound } from '../../services/sound'
import { triggerButtonSparks } from '../common/PixelSparks'

export const ProductionFlowModule: React.FC = () => {
  const { period, summary, openQuickModal, isModuleActive } = useForja()

  const income = summary.income
  const expense = summary.expense
  const net = summary.result
  const motoIncome = summary.moto.income
  const motoExpense = summary.moto.expense
  const debtPaid = summary.financialCosts

  const isMotoActive = isModuleActive('moto')
  const isDebtsActive = isModuleActive('debts_loans')

  const flowMetrics = useMemo(() => {
    const totalVolume = Math.max(1, income, expense)
    const expenseRatio = income > 0 ? Math.min(100, Math.round((expense / income) * 100)) : expense > 0 ? 100 : 0
    const retentionRatio = income > 0 ? Math.max(0, 100 - expenseRatio) : 0
    const motoExpenseShare =
      income > 0 ? Math.min(expenseRatio, Math.round((motoExpense / income) * 100)) : 0
    const generalExpenseShare = Math.max(0, expenseRatio - motoExpenseShare)

    const statusLabel =
      income === 0 && expense === 0
        ? 'PLANTA EN REPOSO'
        : net > 0
          ? 'FLUJO SUPERAVITARIO'
          : net === 0
            ? 'FLUJO EN EQUILIBRIO'
            : 'SOBRECARGA DE GASTOS'

    return {
      totalVolume,
      expenseRatio,
      retentionRatio,
      motoExpenseShare,
      generalExpenseShare,
      statusLabel,
    }
  }, [income, expense, net, motoExpense])

  return (
    <section
      aria-label="Circuito industrial de flujo financiero del periodo"
      className="h-full forge-machine-panel rivet-corners p-4 sm:p-5 flex flex-col justify-between space-y-4"
    >
      {/* Cabecera de Línea de Flujo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#213731]">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xs bg-[#11201b] border border-amber-700/60">
            <PixelSprite name="conveyor" size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`led-pilot ${
                  net >= 0 ? 'led-pilot-online' : 'led-pilot-alert'
                }`}
              />
              <h2 className="font-stencil text-xs sm:text-sm font-bold text-slate-100 tracking-wider uppercase">
                LÍNEA DE PRODUCCIÓN Y FLUJO DE CAJA ({period.label})
              </h2>
            </div>
            <p className="text-[11px] text-slate-400 font-pixel mt-0.5">
              Circulación sistémica de recursos: Entradas &rarr; Cámara de Retención &rarr; Costos &rarr; Balance Neto
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`badge-pixel text-[10px] px-2.5 py-0.5 ${
              net > 0
                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700'
                : net === 0
                  ? 'bg-slate-900 text-slate-300 border-slate-700'
                  : 'bg-rose-950/90 text-rose-300 border-rose-700'
            }`}
          >
            {flowMetrics.statusLabel}
          </span>
        </div>
      </div>

      {/* Estaciones Conectadas de la Cinta Transportadora */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
        {/* ESTACIÓN 1 (4 COLS): TOLVA DE ENTRADAS / INGRESOS */}
        <div className="lg:col-span-4 bg-[#0a1310] border border-emerald-800/60 rounded-xs p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-stencil text-emerald-300 uppercase tracking-wider">
                1. ENTRADAS DEL PERIODO
              </span>
              <button
                type="button"
                onClick={(e) => {
                  sound.playClick()
                  triggerButtonSparks(e, 'emerald', 12)
                  openQuickModal('income')
                }}
                className="px-2 py-0.5 rounded-xs bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-600/70 text-[10px] font-pixel font-bold text-emerald-300 flex items-center gap-0.5 cursor-pointer transition-colors"
              >
                <ArrowUpRight size={11} />
                <span>+ INGRESO</span>
              </button>
            </div>

            <div className="text-xl sm:text-2xl font-bold num text-emerald-400 tracking-tight mt-1.5">
              +{formatCOP(income)}
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-[#182c24] space-y-1 text-[11px] font-pixel">
            {isMotoActive ? (
              <>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Operación Moto / Apps:</span>
                  <span className="font-bold num text-amber-300">{formatCOP(motoIncome)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Otros ingresos / Nómina:</span>
                  <span className="font-bold num text-emerald-300">
                    {formatCOP(Math.max(0, income - motoIncome))}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between text-slate-300">
                <span>Total captado en el corte:</span>
                <span className="font-bold num text-emerald-300">{formatCOP(income)}</span>
              </div>
            )}
          </div>
        </div>

        {/* CONECTOR Y CÁMARA DE FUNDICIÓN / EFICIENCIA (4 COLS) */}
        <div className="lg:col-span-4 bg-[#0d1613] border border-[#284439] rounded-xs p-3.5 flex flex-col justify-between relative">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-stencil text-amber-300 uppercase tracking-wider flex items-center gap-1">
                <Flame size={12} className="text-amber-400" />
                <span>2. CÁMARA DE RETENCIÓN</span>
              </span>
              <span className="text-xs font-bold num text-amber-300">
                {flowMetrics.retentionRatio}% RETENIDO
              </span>
            </div>

            {/* Cinta transportadora visual y barra de distribución */}
            <div className="mt-2.5 space-y-1.5">
              <div className="h-3 w-full bg-[#060a09] border border-[#223930] rounded-xs overflow-hidden flex p-0.5 gap-0.5">
                {income === 0 && expense === 0 ? (
                  <div className="h-full w-full conveyor-track opacity-50" />
                ) : (
                  <>
                    {flowMetrics.retentionRatio > 0 && (
                      <div
                        className="h-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${flowMetrics.retentionRatio}%` }}
                        title={`Retenido: ${flowMetrics.retentionRatio}%`}
                      />
                    )}
                    {isMotoActive && flowMetrics.motoExpenseShare > 0 && (
                      <div
                        className="h-full bg-amber-500 transition-all duration-500"
                        style={{ width: `${flowMetrics.motoExpenseShare}%` }}
                        title={`Costos Moto: ${flowMetrics.motoExpenseShare}%`}
                      />
                    )}
                    {flowMetrics.generalExpenseShare > 0 && (
                      <div
                        className="h-full bg-rose-500 transition-all duration-500"
                        style={{ width: `${flowMetrics.generalExpenseShare}%` }}
                        title={`Gastos Generales: ${flowMetrics.generalExpenseShare}%`}
                      />
                    )}
                  </>
                )}
              </div>

              <div className="flex items-center justify-between text-[10px] font-pixel text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 bg-emerald-500 inline-block" />
                  <span>Margen ({flowMetrics.retentionRatio}%)</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 bg-rose-500 inline-block" />
                  <span>Consumo ({flowMetrics.expenseRatio}%)</span>
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-[#1d332a] flex items-center justify-between text-[11px] font-pixel">
            <span className="text-slate-400">Salidas y costos totales:</span>
            <div className="flex items-center gap-1.5">
              <span className="font-bold num text-rose-400">−{formatCOP(expense)}</span>
              <button
                type="button"
                onClick={(e) => {
                  sound.playClick()
                  triggerButtonSparks(e, 'rust', 12)
                  openQuickModal('expense')
                }}
                className="px-1.5 py-0.5 rounded-xs bg-rose-950/90 hover:bg-rose-900 border border-rose-700/70 text-[9px] font-pixel font-bold text-rose-300 flex items-center cursor-pointer"
                title="Registrar nuevo gasto"
              >
                <ArrowDownRight size={10} />
                <span>+GASTO</span>
              </button>
            </div>
          </div>
        </div>

        {/* ESTACIÓN 3 (4 COLS): LINGOTE DE RESULTADO NETO FORJADO */}
        <div
          className={`lg:col-span-4 rounded-xs p-3.5 border flex flex-col justify-between ${
            net >= 0
              ? 'bg-gradient-to-b from-[#13221c] to-[#0a1310] border-amber-600/70'
              : 'bg-gradient-to-b from-[#241210] to-[#120908] border-rose-700/70'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-stencil text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <ArrowRight size={12} className="text-amber-400" />
                <span>3. RENDIMIENTO NETO FORJADO</span>
              </span>
              <PixelSprite name="ingot" size={16} />
            </div>

            <div
              className={`text-xl sm:text-2xl font-bold num tracking-tight mt-1.5 ${
                net >= 0 ? 'text-amber-300' : 'text-rose-400'
              }`}
            >
              {net >= 0 ? '+' : ''}
              {formatCOP(net)}
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-[#223930]/80 space-y-1 text-[11px] font-pixel">
            {isMotoActive && (
              <div className="flex items-center justify-between text-slate-300">
                <span>Costos operativos moto:</span>
                <span className="font-bold num text-rose-300">−{formatCOP(motoExpense)}</span>
              </div>
            )}
            {isDebtsActive && (
              <div className="flex items-center justify-between text-slate-400">
                <span>Abonos a pasivos en el corte:</span>
                <span className="font-bold num text-amber-300">{formatCOP(debtPaid)}</span>
              </div>
            )}
            {!isMotoActive && !isDebtsActive && (
              <div className="flex items-center justify-between text-slate-300">
                <span>Balance ingresos vs gastos:</span>
                <span className="font-bold num text-emerald-300">
                  {net >= 0 ? 'Positivo' : 'Déficit'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
