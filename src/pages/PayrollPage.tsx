import React, { useState } from 'react'
import {
  Calendar,
  Clock,
  Coins,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  DollarSign,
  TrendingUp,
  ArrowRight,
} from 'lucide-react'
import { useForja } from '../context/ForjaContext'
import { PixelSprite } from '../components/common/PixelSprite'
import { sound } from '../services/sound'
import { triggerButtonSparks } from '../components/common/PixelSparks'
import {
  calculateDailyAvailableBudget,
  getExpectedIncomesInPeriod,
  getPaydayProjection,
} from '../domain/payroll'
import type { IncomeSchedule } from '../domain/types'
import { formatCOP } from '../domain/money'

export const PayrollPage: React.FC = () => {
  const {
    preferences,
    balances,
    period,
    transactions,
    accounts,
    addIncomeSchedule,
    deleteIncomeSchedule,
    openQuickModal,
  } = useForja()

  const schedules = preferences.incomeSchedules || []
  const activeSchedules = schedules.filter((s) => s.isActive)
  const primarySchedule = activeSchedules[0] || null

  // Estado para creación/edición de cronograma
  const [isAdding, setIsAdding] = useState(false)
  const [name, setName] = useState('')
  const [expectedAmount, setExpectedAmount] = useState<number>(1800000)
  const [targetAccountId, setTargetAccountId] = useState(accounts[0]?.id || '')
  const [day1, setDay1] = useState(15)
  const [day2, setDay2] = useState(30)
  const [scheduleType, setScheduleType] = useState<'biweekly' | 'monthly'>('biweekly')

  // Proyecciones
  const projection = primarySchedule ? getPaydayProjection(primarySchedule) : null
  const dailyBudget = projection
    ? calculateDailyAvailableBudget(balances.available, projection.daysRemaining, 0)
    : null

  // Ingresos del periodo
  const expectedItems = getExpectedIncomesInPeriod(schedules, period, transactions)

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    sound.playConfirm()
    const payDays = scheduleType === 'biweekly' ? [day1, day2] : [day1]
    await addIncomeSchedule({
      name: name.trim(),
      expectedAmount: Number(expectedAmount) || 0,
      targetAccountId: targetAccountId || null,
      incomeCategoryId: null,
      scheduleType,
      payDays,
      isActive: true,
      notes: null,
    })

    setName('')
    setIsAdding(false)
  }

  const handleCollectPayday = (sched: IncomeSchedule, dateStr: string) => {
    sound.playClick()
    openQuickModal('income', null, {
      amount: sched.expectedAmount,
      toAccountId: sched.targetAccountId || undefined,
      description: `Salario recibido (${sched.name}) - ${dateStr}`,
    })
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Cabecera del Módulo de Nómina */}
      <div className="forge-machine-panel rivet-corners p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded bg-[#101d18] border border-emerald-800/80 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
            <PixelSprite name="sack" size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="led-pilot led-pilot-online" />
              <h1 className="font-stencil text-lg sm:text-xl font-bold text-emerald-400 tracking-wider">
                NÓMINA, QUINCENAS Y DISPONIBLE
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Control de fechas de cobro, presupuesto diario disponible y registro de salarios
            </p>
          </div>
        </div>

        {primarySchedule && (
          <button
            onClick={() => handleCollectPayday(primarySchedule, projection?.nextPaydayDate || '')}
            className="btn-game btn-game-primary py-2 px-4 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg"
          >
            <Coins size={15} />
            <span>+ REGISTRAR PAGO RECIBIDO</span>
          </button>
        )}
      </div>

      {/* Grid de Proyecciones Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Tarjeta 1: Próxima Quincena */}
        <div className="forge-panel bg-[#111815] border-2 border-[#263e34] p-5 rounded-sm rivet-corners shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#21372e] pb-2 mb-3">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-stencil uppercase tracking-wider">
                <Clock size={15} />
                <span>Próximo Cobro Programado</span>
              </div>
              {projection?.isDueToday && (
                <span className="badge-pixel bg-emerald-950 text-emerald-300 border-emerald-600 text-[10px]">
                  ¡HOY COBRAS!
                </span>
              )}
            </div>

            {primarySchedule && projection ? (
              <div>
                <span className="text-xs text-slate-400 block font-pixel">
                  {primarySchedule.name}
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-stencil text-3xl font-bold text-slate-100">
                    {projection.daysRemaining}
                  </span>
                  <span className="text-xs text-amber-300 font-stencil uppercase tracking-wider">
                    {projection.daysRemaining === 1 ? 'día restante' : 'días restantes'}
                  </span>
                </div>
                <div className="mt-2 text-xs text-slate-300 flex items-center gap-1.5 font-mono">
                  <Calendar size={13} className="text-slate-400" />
                  <span>Fecha: {projection.nextPaydayDate}</span>
                </div>
                <div className="mt-1 text-sm font-bold text-emerald-400 font-pixel">
                  Esperado: {formatCOP(projection.expectedAmount)}
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-slate-400 text-xs">
                <p>No tienes ningún cronograma de nómina activo.</p>
                <button
                  onClick={() => setIsAdding(true)}
                  className="mt-3 text-emerald-400 hover:text-emerald-300 underline font-bold"
                >
                  Configurar tu primer salario
                </button>
              </div>
            )}
          </div>

          {primarySchedule && projection && (
            <div className="mt-4 pt-3 border-t border-[#1b2b24]">
              <button
                onClick={() => handleCollectPayday(primarySchedule, projection.nextPaydayDate)}
                className="w-full btn-game btn-game-secondary text-xs py-2 text-emerald-400 font-bold flex items-center justify-center gap-1.5"
              >
                <span>Asentar ingreso en cuenta</span>
                <ArrowRight size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Tarjeta 2: Dinero Disponible Diario */}
        <div className="forge-panel bg-[#111815] border-2 border-[#263e34] p-5 rounded-sm rivet-corners shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#21372e] pb-2 mb-3">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-stencil uppercase tracking-wider">
                <DollarSign size={15} />
                <span>Disponible Diario Sugerido</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">HASTA EL PAGO</span>
            </div>

            {dailyBudget ? (
              <div>
                <span className="text-xs text-slate-400 block font-pixel">
                  Gasto diario recomendado
                </span>
                <div className="font-stencil text-2xl sm:text-3xl font-bold text-emerald-400 mt-1">
                  {formatCOP(dailyBudget.dailyBudget)}
                  <span className="text-xs text-slate-400 font-mono font-normal ml-1">/ día</span>
                </div>
                <div className="mt-3 text-xs text-slate-300 space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Saldo líquido actual:</span>
                    <span className="text-slate-100 font-bold">{formatCOP(balances.available)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Días para distribuir:</span>
                    <span className="text-amber-300 font-bold">{dailyBudget.daysCount} días</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-slate-400 text-xs">
                Configura tu nómina para calcular tu disponible diario.
              </div>
            )}
          </div>

          <div className="mt-4 pt-2 text-[10px] text-slate-500 font-pixel">
            * Se recalcula en tiempo real con cada gasto registrado en tus cuentas.
          </div>
        </div>

        {/* Tarjeta 3: Resumen del Periodo */}
        <div className="forge-panel bg-[#111815] border-2 border-[#263e34] p-5 rounded-sm rivet-corners shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#21372e] pb-2 mb-3">
              <div className="flex items-center gap-2 text-sky-400 text-xs font-stencil uppercase tracking-wider">
                <TrendingUp size={15} />
                <span>Periodo Financiero</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">{period.shortLabel}</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2 rounded bg-[#0b1210] border border-[#1e342c]">
                <span className="text-slate-400">Rango del corte:</span>
                <span className="text-slate-200 font-bold font-mono">{period.label}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-[#0b1210] border border-[#1e342c]">
                <span className="text-slate-400">Ingresos recibidos:</span>
                <span className="text-emerald-400 font-bold font-mono">
                  {formatCOP(
                    expectedItems
                      .filter((i) => i.isReceived)
                      .reduce((acc, cur) => acc + cur.expectedAmount, 0)
                  )}
                </span>
              </div>
              <div className="flex justify-between p-2 rounded bg-[#0b1210] border border-[#1e342c]">
                <span className="text-slate-400">Ingresos pendientes:</span>
                <span className="text-amber-400 font-bold font-mono">
                  {formatCOP(
                    expectedItems
                      .filter((i) => !i.isReceived)
                      .reduce((acc, cur) => acc + cur.expectedAmount, 0)
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-2 text-[10px] text-slate-500 font-pixel text-center">
            Los ingresos previstos no alteran tus balances hasta ser recibidos.
          </div>
        </div>
      </div>

      {/* Sección: Seguimiento de Pagos del Periodo */}
      <div className="forge-machine-panel rivet-corners p-5">
        <h2 className="font-stencil text-sm font-bold text-slate-200 uppercase tracking-wider border-b border-[#213731] pb-2.5 mb-4 flex items-center justify-between">
          <span>PAGOS PREVISTOS EN ESTE PERIODO ({period.shortLabel})</span>
          <span className="text-xs text-slate-400 font-mono">{expectedItems.length} registros</span>
        </h2>

        {expectedItems.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs">
            No hay pagos programados para el rango de fechas de este corte ({period.start} a {period.end}).
          </div>
        ) : (
          <div className="space-y-2.5">
            {expectedItems.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-sm bg-[#0a100e] border border-[#1e342c] gap-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      item.isReceived
                        ? 'bg-emerald-950 border border-emerald-600 text-emerald-400'
                        : 'bg-amber-950 border border-amber-600 text-amber-400'
                    }`}
                  >
                    {item.isReceived ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  </div>
                  <div>
                    <span className="font-pixel font-bold text-slate-100 block text-sm">
                      {item.scheduleName}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">Fecha: {item.date}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3">
                  <div className="text-right">
                    <span className="font-stencil text-base font-bold text-slate-100 block">
                      {formatCOP(item.expectedAmount)}
                    </span>
                    <span
                      className={`text-[10px] font-pixel font-bold ${
                        item.isReceived ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {item.isReceived ? 'ASENTADO EN LIBRO ✓' : 'PENDIENTE DE PAGO ⏳'}
                    </span>
                  </div>

                  {!item.isReceived && (
                    <button
                      onClick={() => {
                        const s = schedules.find((x) => x.id === item.scheduleId)
                        if (s) handleCollectPayday(s, item.date)
                      }}
                      className="btn-game btn-game-primary text-xs py-1 px-3 font-bold cursor-pointer shrink-0"
                    >
                      RECIBIDO
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sección: Configuración de Cronogramas Salariales */}
      <div className="forge-machine-panel rivet-corners p-5">
        <div className="flex items-center justify-between border-b border-[#213731] pb-2.5 mb-4">
          <h2 className="font-stencil text-sm font-bold text-slate-200 uppercase tracking-wider">
            MIS FUENTES DE NÓMINA Y SUELDOS
          </h2>
          <button
            onClick={(e) => {
              sound.playClick()
              triggerButtonSparks(e, 'emerald', 8)
              setIsAdding(!isAdding)
            }}
            className="btn-game btn-game-secondary text-xs py-1.5 px-3 font-bold text-emerald-400 flex items-center gap-1.5"
          >
            <Plus size={14} />
            <span>{isAdding ? 'CANCELAR' : 'NUEVO SALARIO'}</span>
          </button>
        </div>

        {/* Formulario de creación */}
        {isAdding && (
          <form
            onSubmit={handleCreateSchedule}
            className="mb-5 p-4 rounded-sm bg-[#0e1714] border border-[#2b4c3e] space-y-3"
          >
            <h3 className="font-stencil text-xs text-amber-300 uppercase font-bold">
              PROGRAMAR NUEVO PAGO SALARIAL
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="field-label">Nombre del concepto / Empleo</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Salario Empresa, Quincena, Asesoría"
                  className="field"
                  required
                />
              </div>

              <div>
                <label className="field-label">Importe esperado (COP)</label>
                <input
                  type="number"
                  value={expectedAmount}
                  onChange={(e) => setExpectedAmount(Number(e.target.value))}
                  className="field"
                  required
                />
              </div>

              <div>
                <label className="field-label">Frecuencia</label>
                <select
                  value={scheduleType}
                  onChange={(e) => setScheduleType(e.target.value as 'biweekly' | 'monthly')}
                  className="field"
                >
                  <option value="biweekly">Quincenal (Dos pagos al mes)</option>
                  <option value="monthly">Mensual (Un solo pago al mes)</option>
                </select>
              </div>

              <div>
                <label className="field-label">Cuenta donde lo recibes</label>
                <select
                  value={targetAccountId}
                  onChange={(e) => setTargetAccountId(e.target.value)}
                  className="field"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.kind})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="field-label">Día del primer pago habitual</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={day1}
                  onChange={(e) => setDay1(Number(e.target.value))}
                  className="field"
                />
              </div>

              {scheduleType === 'biweekly' && (
                <div>
                  <label className="field-label">Día del segundo pago habitual</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={day2}
                    onChange={(e) => setDay2(Number(e.target.value))}
                    className="field"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="btn-game btn-game-secondary text-xs py-1.5 px-3"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-game btn-game-primary text-xs py-1.5 px-4 font-bold"
              >
                GUARDAR PROGRAMACIÓN
              </button>
            </div>
          </form>
        )}

        {/* Lista de fuentes configuradas */}
        {schedules.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs">
            No tienes fuentes de salario registradas. Haz clic en «NUEVO SALARIO» para configurar tus fechas.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {schedules.map((s) => (
              <div
                key={s.id}
                className="p-3.5 rounded-sm bg-[#0a100e] border border-[#1e342c] flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-pixel font-bold text-slate-100 text-sm">{s.name}</span>
                    <span className="badge-pixel text-[9px] bg-[#1a2c24] text-emerald-300">
                      Días: {s.payDays.join(' y ')}
                    </span>
                  </div>
                  <span className="font-stencil text-emerald-400 font-bold block text-sm mt-0.5">
                    {formatCOP(s.expectedAmount)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Cuenta: {accounts.find((a) => a.id === s.targetAccountId)?.name || 'Sin asignar'}
                  </span>
                </div>

                <button
                  onClick={async () => {
                    sound.playClick()
                    if (window.confirm(`¿Eliminar la programación salarial «${s.name}»?`)) {
                      await deleteIncomeSchedule(s.id)
                    }
                  }}
                  className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                  title="Eliminar programación"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
