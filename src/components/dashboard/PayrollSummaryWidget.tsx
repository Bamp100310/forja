import React from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Clock, DollarSign, ArrowRight, Coins, CheckCircle2 } from 'lucide-react'
import { useForja } from '../../context/ForjaContext'
import { formatCOP, formatCOPCompact } from '../../domain/money'
import {
  calculateDailyAvailableBudget,
  getExpectedIncomesInPeriod,
  getPaydayProjection,
} from '../../domain/payroll'
import { PixelSprite } from '../common/PixelSprite'
import { sound } from '../../services/sound'

export const PayrollSummaryWidget: React.FC = () => {
  const { preferences, balances, period, transactions, openQuickModal } = useForja()

  const schedules = preferences.incomeSchedules || []
  const activeSchedules = schedules.filter((s) => s.isActive)
  const primarySchedule = activeSchedules[0] || null

  const projection = primarySchedule ? getPaydayProjection(primarySchedule) : null
  const dailyBudget = projection
    ? calculateDailyAvailableBudget(balances.available, projection.daysRemaining, 0)
    : null

  const expectedInPeriod = getExpectedIncomesInPeriod(schedules, period, transactions)

  const handleCollect = () => {
    if (!primarySchedule) return
    sound.playClick()
    openQuickModal('income', null, {
      amount: primarySchedule.expectedAmount,
      toAccountId: primarySchedule.targetAccountId || undefined,
      categoryId: primarySchedule.incomeCategoryId || undefined,
      description: `Salario recibido (${primarySchedule.name}) - ${projection?.nextPaydayDate || ''}`,
      date: projection?.nextPaydayDate || undefined,
      payrollScheduleId: primarySchedule.id,
      expectedPaydayDate: projection?.nextPaydayDate || undefined,
      isMoto: false,
    })
  }

  return (
    <div className="forge-panel p-4 sm:p-5 rivet-corners border-[#28443b] bg-[#121c19] h-full flex flex-col justify-between shadow-xl">
      <div>
        {/* Cabecera del Widget de Quincenas */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#213730]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-sm bg-[#162721] border border-emerald-700/50 shadow-inner text-emerald-400">
              <PixelSprite name="sack" size={22} />
            </div>
            <div>
              <h3 className="font-stencil text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-wide">
                CONTROL DE NÓMINA & QUINCENAS
              </h3>
              <p className="text-[11px] text-slate-400 font-pixel">
                Planificación salarial y disponible diario sugerido
              </p>
            </div>
          </div>

          <Link
            to="/nomina"
            onClick={() => sound.playClick()}
            className="text-[11px] text-emerald-400 hover:text-emerald-300 font-pixel font-bold flex items-center gap-1"
          >
            <span>Ver todo</span>
            <ArrowRight size={12} />
          </Link>
        </div>

        {/* Métricas destacadas: Cuenta regresiva y presupuesto diario */}
        {primarySchedule && projection ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {/* Countdown al próximo pago */}
            <div className="p-3 bg-[#0a120f] border border-[#1e342c] rounded-sm">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-stencil mb-1">
                <span className="flex items-center gap-1.5 text-amber-300">
                  <Clock size={13} />
                  <span>PRÓXIMO COBRO</span>
                </span>
                {projection.isDueToday && (
                  <span className="badge-pixel bg-emerald-950 text-emerald-300 border-emerald-600 text-[9px]">
                    ¡HOY!
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="num text-2xl font-bold text-slate-100">
                  {projection.daysRemaining}
                </span>
                <span className="text-xs text-amber-400 font-stencil uppercase tracking-wider">
                  {projection.daysRemaining === 1 ? 'día restante' : 'días restantes'}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1 font-mono flex items-center gap-1">
                <Calendar size={11} />
                <span className="num">{projection.nextPaydayDate}</span>
                <span className="text-emerald-400 font-bold ml-auto num">
                  {formatCOPCompact(projection.expectedAmount)}
                </span>
              </div>
            </div>

            {/* Disponible diario */}
            <div className="p-3 bg-[#0a120f] border border-[#1e342c] rounded-sm">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-stencil mb-1">
                <span className="flex items-center gap-1.5 text-emerald-300">
                  <DollarSign size={13} />
                  <span>DISPONIBLE SUGERIDO</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">/ DÍA</span>
              </div>
              <div className="num text-2xl font-bold text-emerald-400">
                {dailyBudget ? formatCOP(dailyBudget.dailyBudget) : '$ 0'}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 font-mono">
                Para cubrir gastos cotidianos hasta tu siguiente quincena.
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 text-center bg-[#0a120f] border border-[#1e342c] rounded-sm mb-4">
            <p className="text-xs text-slate-400 font-pixel">
              No tienes un cronograma de salario activo.
            </p>
            <Link
              to="/nomina"
              className="mt-2 inline-block text-xs text-emerald-400 hover:text-emerald-300 underline font-bold"
            >
              Configurar tus fechas de pago quincenal
            </Link>
          </div>
        )}

        {/* Pagos del periodo */}
        {expectedInPeriod.length > 0 && (
          <div className="space-y-1.5 mb-3">
            <span className="text-[10px] font-stencil uppercase tracking-wider text-slate-400 block mb-1">
              PAGOS DEL PERIODO ({period.shortLabel}):
            </span>
            {expectedInPeriod.slice(0, 2).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 rounded-xs bg-[#0b1411] border border-[#1a2d25] text-xs"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    size={14}
                    className={item.isReceived ? 'text-emerald-400' : 'text-slate-600'}
                  />
                  <span className="font-pixel text-slate-200 font-bold">{item.scheduleName}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{item.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="num text-slate-100 font-bold">
                    {formatCOPCompact(item.expectedAmount)}
                  </span>
                  <span
                    className={`text-[9px] font-pixel px-1.5 py-0.5 rounded-xs ${
                      item.isReceived
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}
                  >
                    {item.isReceived ? 'RECIBIDO' : 'PENDIENTE'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Botón de Asentar Salario */}
      {primarySchedule && (
        <div className="pt-3 border-t border-[#1e342d] flex items-center justify-between">
          <span className="text-[10px] text-slate-500 font-pixel">
            * Los ingresos previstos no alteran tus balances hasta ser recibidos.
          </span>
          <button
            onClick={handleCollect}
            className="btn-game btn-game-primary text-xs py-1.5 px-3.5 font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Coins size={14} />
            <span>+ RECIBÍ MI PAGO</span>
          </button>
        </div>
      )}
    </div>
  )
}
