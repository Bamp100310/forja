import React, { useState, useEffect } from 'react'
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
  Edit3,
  Power,
  Check,
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
    categories,
    addIncomeSchedule,
    updateIncomeSchedule,
    deleteIncomeSchedule,
    openQuickModal,
  } = useForja()

  const schedules = preferences.incomeSchedules || []
  const activeSchedules = schedules.filter((s) => s.isActive)
  const primarySchedule = activeSchedules[0] || null

  // Categorías de ingresos para asociar
  const incomeCategories = categories.filter((c) => c.kind === 'income' && !c.isArchived)
  const defaultIncomeCategory =
    incomeCategories.find(
      (c) => c.name.toLowerCase().includes('salario') || c.name.toLowerCase().includes('nómina')
    ) || incomeCategories[0]

  // Estado para creación/edición de cronograma
  const [isAdding, setIsAdding] = useState(false)
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [expectedAmount, setExpectedAmount] = useState<number>(1800000)
  const [targetAccountId, setTargetAccountId] = useState('')
  const [incomeCategoryId, setIncomeCategoryId] = useState('')
  const [day1, setDay1] = useState(15)
  const [day2, setDay2] = useState(30)
  const [scheduleType, setScheduleType] = useState<'biweekly' | 'monthly'>('biweekly')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Asegurar que targetAccountId e incomeCategoryId tengan valores por defecto al cargar cuentas
  useEffect(() => {
    if (!targetAccountId && accounts.length > 0) {
      const liquid = accounts.find((a) => ['bank', 'savings', 'wallet', 'cash'].includes(a.kind))
      setTargetAccountId(liquid?.id || accounts[0].id)
    }
  }, [accounts, targetAccountId])

  useEffect(() => {
    if (!incomeCategoryId && defaultIncomeCategory) {
      setIncomeCategoryId(defaultIncomeCategory.id)
    }
  }, [defaultIncomeCategory, incomeCategoryId])

  // Proyecciones
  const projection = primarySchedule ? getPaydayProjection(primarySchedule) : null
  const dailyBudget = projection
    ? calculateDailyAvailableBudget(balances.available, projection.daysRemaining, 0)
    : null

  // Ingresos del periodo
  const expectedItems = getExpectedIncomesInPeriod(schedules, period, transactions)

  const handleStartNew = () => {
    sound.playClick()
    setEditingScheduleId(null)
    setName('')
    setExpectedAmount(1800000)
    setDay1(15)
    setDay2(30)
    setScheduleType('biweekly')
    setErrorMessage(null)
    setIsAdding(true)
  }

  const handleStartEdit = (sched: IncomeSchedule) => {
    sound.playClick()
    setEditingScheduleId(sched.id)
    setName(sched.name)
    setExpectedAmount(sched.expectedAmount)
    setTargetAccountId(sched.targetAccountId || accounts[0]?.id || '')
    setIncomeCategoryId(sched.incomeCategoryId || defaultIncomeCategory?.id || '')
    setScheduleType(sched.scheduleType === 'monthly' ? 'monthly' : 'biweekly')
    setDay1(sched.payDays[0] ?? 15)
    setDay2(sched.payDays[1] ?? 30)
    setErrorMessage(null)
    setIsAdding(true)
  }

  const handleCancelForm = () => {
    sound.playClick()
    setIsAdding(false)
    setEditingScheduleId(null)
    setErrorMessage(null)
  }

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    const trimmed = name.trim()
    if (!trimmed) {
      setErrorMessage('Ingresa un nombre para la nómina o empleo.')
      return
    }
    if (expectedAmount <= 0) {
      setErrorMessage('El valor esperado del salario debe ser mayor que cero.')
      return
    }
    if (day1 < 1 || day1 > 31) {
      setErrorMessage('El día de pago debe ser un número válido entre 1 y 31.')
      return
    }
    if (scheduleType === 'biweekly' && (day2 < 1 || day2 > 31)) {
      setErrorMessage('El segundo día de pago debe ser un número válido entre 1 y 31.')
      return
    }

    setIsSaving(true)
    try {
      const payDays = scheduleType === 'biweekly' ? [day1, day2] : [day1]

      if (editingScheduleId) {
        await updateIncomeSchedule(editingScheduleId, {
          name: trimmed,
          expectedAmount: Math.round(expectedAmount),
          targetAccountId: targetAccountId || null,
          incomeCategoryId: incomeCategoryId || null,
          scheduleType,
          payDays,
        })
        sound.playConfirm()
      } else {
        await addIncomeSchedule({
          name: trimmed,
          expectedAmount: Math.round(expectedAmount),
          targetAccountId: targetAccountId || null,
          incomeCategoryId: incomeCategoryId || null,
          scheduleType,
          payDays,
          isActive: true,
          notes: null,
        })
        sound.playConfirm()
      }

      setIsAdding(false)
      setEditingScheduleId(null)
      setName('')
    } catch (err) {
      console.error('Error guardando nómina:', err)
      sound.playError()
      setErrorMessage((err as Error).message || 'No se pudo guardar la programación salarial.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleActive = async (sched: IncomeSchedule) => {
    sound.playClick()
    try {
      await updateIncomeSchedule(sched.id, { isActive: !sched.isActive })
    } catch (err) {
      console.error('Error alternando estado de nómina:', err)
      sound.playError()
    }
  }

  const handleCollectPayday = (sched: IncomeSchedule, dateStr: string) => {
    sound.playClick()
    openQuickModal('income', null, {
      amount: sched.expectedAmount,
      toAccountId: sched.targetAccountId || undefined,
      categoryId: sched.incomeCategoryId || defaultIncomeCategory?.id || undefined,
      description: `Salario recibido (${sched.name}) - ${dateStr}`,
      date: dateStr,
      payrollScheduleId: sched.id,
      expectedPaydayDate: dateStr,
      isMoto: false,
    })
  }

  return (
    <div className="space-y-6 w-full">
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
                  <span className="num text-3xl font-bold text-slate-100">
                    {projection.daysRemaining}
                  </span>
                  <span className="text-xs text-amber-300 font-stencil uppercase tracking-wider">
                    {projection.daysRemaining === 1 ? 'día restante' : 'días restantes'}
                  </span>
                </div>
                <div className="mt-2 text-xs text-slate-300 flex items-center gap-1.5 font-mono">
                  <Calendar size={13} className="text-slate-400" />
                  <span className="num">Fecha: {projection.nextPaydayDate}</span>
                </div>
                <div className="mt-1 text-sm font-bold text-emerald-400 num">
                  Esperado: {formatCOP(projection.expectedAmount)}
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-slate-400 text-xs">
                <p>No tienes ningún cronograma de nómina activo.</p>
                <button
                  onClick={handleStartNew}
                  className="mt-3 text-emerald-400 hover:text-emerald-300 underline font-bold cursor-pointer"
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
                className="w-full btn-game btn-game-secondary text-xs py-2 text-emerald-400 font-bold flex items-center justify-center gap-1.5 cursor-pointer"
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
                <div className="num text-2xl sm:text-3xl font-bold text-emerald-400 mt-1">
                  {formatCOP(dailyBudget.dailyBudget)}
                  <span className="text-xs text-slate-400 font-mono font-normal ml-1">/ día</span>
                </div>
                <div className="mt-3 text-xs text-slate-300 space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Saldo líquido actual:</span>
                    <span className="text-slate-100 font-bold num">{formatCOP(balances.available)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Días para distribuir:</span>
                    <span className="text-amber-300 font-bold num">{dailyBudget.daysCount} días</span>
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
                <span className="text-slate-200 font-bold font-mono num">{period.label}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-[#0b1210] border border-[#1e342c]">
                <span className="text-slate-400">Ingresos recibidos:</span>
                <span className="text-emerald-400 font-bold num">
                  {formatCOP(
                    expectedItems
                      .filter((i) => i.isReceived)
                      .reduce((acc, cur) => acc + cur.expectedAmount, 0)
                  )}
                </span>
              </div>
              <div className="flex justify-between p-2 rounded bg-[#0b1210] border border-[#1e342c]">
                <span className="text-slate-400">Ingresos pendientes:</span>
                <span className="text-amber-400 font-bold num">
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
          <span className="text-xs text-slate-400 font-mono num">{expectedItems.length} registros</span>
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
                    <span className="text-xs text-slate-400 font-mono num">Fecha: {item.date}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3">
                  <div className="text-right">
                    <span className="num text-base font-bold text-slate-100 block">
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

                  {item.isReceived ? (
                    <span className="badge-pixel bg-emerald-950 text-emerald-300 border-emerald-700 text-xs py-1 px-2.5 flex items-center gap-1 shrink-0">
                      <Check size={12} />
                      <span>COBRADO</span>
                    </span>
                  ) : (
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
          {!isAdding && (
            <button
              onClick={(e) => {
                sound.playClick()
                triggerButtonSparks(e, 'emerald', 8)
                handleStartNew()
              }}
              className="btn-game btn-game-secondary text-xs py-1.5 px-3 font-bold text-emerald-400 flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} />
              <span>NUEVO SALARIO</span>
            </button>
          )}
        </div>

        {/* Mensaje de error visible */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Formulario de creación / edición */}
        {isAdding && (
          <form
            onSubmit={handleSaveSchedule}
            className="mb-5 p-4 rounded-sm bg-[#0e1714] border border-[#2b4c3e] space-y-3"
          >
            <div className="flex items-center justify-between border-b border-[#1f372d] pb-2">
              <h3 className="font-stencil text-xs text-amber-300 uppercase font-bold">
                {editingScheduleId ? 'MODIFICAR PROGRAMACIÓN SALARIAL' : 'PROGRAMAR NUEVO PAGO SALARIAL'}
              </h3>
              <span className="text-[10px] text-slate-400 font-pixel">
                {editingScheduleId ? 'Edita los importes y días de pago' : 'Configura tus fechas habituales'}
              </span>
            </div>

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
                  value={expectedAmount || ''}
                  onChange={(e) => setExpectedAmount(Number(e.target.value))}
                  placeholder="1800000"
                  className="field field-number"
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
                <label className="field-label">Bóveda de depósito</label>
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
                <label className="field-label">Categoría contable</label>
                <select
                  value={incomeCategoryId}
                  onChange={(e) => setIncomeCategoryId(e.target.value)}
                  className="field"
                >
                  {incomeCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="field-label">Día del primer pago habitual (1 a 31)</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={day1}
                  onChange={(e) => setDay1(Number(e.target.value))}
                  className="field field-number"
                  required
                />
              </div>

              {scheduleType === 'biweekly' && (
                <div>
                  <label className="field-label">Día del segundo pago habitual (1 a 31)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={day2}
                    onChange={(e) => setDay2(Number(e.target.value))}
                    className="field field-number"
                    required
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#1a2d24]">
              <button
                type="button"
                onClick={handleCancelForm}
                className="btn-game btn-game-secondary text-xs py-1.5 px-3 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="btn-game btn-game-primary text-xs py-1.5 px-4 font-bold cursor-pointer flex items-center gap-1.5"
              >
                <span>{isSaving ? 'GUARDANDO...' : editingScheduleId ? 'ACTUALIZAR SALARIO' : 'GUARDAR PROGRAMACIÓN'}</span>
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
                className={`p-3.5 rounded-sm border transition-all flex items-center justify-between ${
                  s.isActive
                    ? 'bg-[#0a100e] border-[#1e342c]'
                    : 'bg-[#060a08] border-[#15241e] opacity-60'
                }`}
              >
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-pixel font-bold text-slate-100 text-sm truncate">
                      {s.name}
                    </span>
                    <span className="badge-pixel text-[9px] bg-[#1a2c24] text-emerald-300">
                      Días: {s.payDays.join(' y ')}
                    </span>
                    {!s.isActive && (
                      <span className="badge-pixel text-[9px] bg-slate-900 text-slate-400 border border-slate-700">
                        PAUSADO
                      </span>
                    )}
                  </div>
                  <span className="num text-emerald-400 font-bold block text-sm mt-0.5">
                    {formatCOP(s.expectedAmount)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono block">
                    Bóveda: {accounts.find((a) => a.id === s.targetAccountId)?.name || 'Sin asignar'}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleToggleActive(s)}
                    className={`p-1.5 rounded transition-colors cursor-pointer ${
                      s.isActive
                        ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/50'
                        : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'
                    }`}
                    title={s.isActive ? 'Pausar cobros automáticos' : 'Activar cobros'}
                  >
                    <Power size={15} />
                  </button>

                  <button
                    onClick={() => handleStartEdit(s)}
                    className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-[#1a2c24] rounded transition-colors cursor-pointer"
                    title="Editar programación"
                  >
                    <Edit3 size={15} />
                  </button>

                  <button
                    onClick={async () => {
                      sound.playClick()
                      if (window.confirm(`¿Eliminar la programación salarial «${s.name}»?`)) {
                        await deleteIncomeSchedule(s.id)
                      }
                    }}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                    title="Eliminar programación"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
