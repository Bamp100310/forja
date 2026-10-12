import React, { useState, useMemo } from 'react'
import { X, Trash2 } from 'lucide-react'
import { useForja } from '../context/ForjaContext'
import { formatCOP, formatCOPCompact } from '../domain/money'
import { formatShortDate } from '../domain/dates'
import { computeMotoStats, latestOdometer, maintenanceReminders } from '../domain/moto'
import { MetricCard } from '../components/common/MetricCard'
import { PixelSprite } from '../components/common/PixelSprite'
import { EmptyState } from '../components/common/EmptyState'
import { sound } from '../services/sound'
import { triggerPixelSparks, triggerButtonSparks } from '../components/common/PixelSparks'
import motoLargeImg from '../assets/forja/sprites/moto_large.png'
import type { MaintenanceKind, MotoLogKind } from '../domain/types'

export const MotoPage: React.FC = () => {
  const {
    profile,
    period,
    transactions,
    motoLogs,
    motoMaintenance,
    index,
    today,
    saveMotoLog,
    deleteMotoLog,
    saveMotoMaintenance,
    deleteMotoMaintenance,
  } = useForja()

  const [activeTab, setActiveTab] = useState<'stats' | 'logs' | 'maintenance'>('stats')
  const [logModalOpen, setLogModalOpen] = useState(false)
  const [maintModalOpen, setMaintModalOpen] = useState(false)

  // Cálculos estadísticos
  const stats = useMemo(() => {
    return computeMotoStats(transactions, motoLogs, index, { start: period.start, end: period.end })
  }, [transactions, motoLogs, index, period.start, period.end])

  const currentOdometer = useMemo(() => {
    return latestOdometer(motoLogs, motoMaintenance, profile?.motoInitialOdometer ?? null)
  }, [motoLogs, motoMaintenance, profile?.motoInitialOdometer])

  const reminders = useMemo(() => {
    return maintenanceReminders(motoMaintenance, currentOdometer, today)
  }, [motoMaintenance, currentOdometer, today])

  // Formulario de nueva jornada
  const [logDate, setLogDate] = useState(today)
  const [logKind, setLogKind] = useState<MotoLogKind>('shift')
  const [logHours, setLogHours] = useState<number>(6)
  const [logTrips, setLogTrips] = useState<number>(10)
  const [logOdoStart, setLogOdoStart] = useState<number>(currentOdometer || 0)
  const [logOdoEnd, setLogOdoEnd] = useState<number>((currentOdometer || 0) + 50)
  const [logNotes, setLogNotes] = useState('')

  // Formulario de nuevo mantenimiento
  const [maintDate, setMaintDate] = useState(today)
  const [maintKind, setMaintKind] = useState<MaintenanceKind>('preventive')
  const [maintTitle, setMaintTitle] = useState('')
  const [maintOdo, setMaintOdo] = useState<number>(currentOdometer || 0)
  const [maintNextDate, setMaintNextDate] = useState('')
  const [maintNextOdo, setMaintNextOdo] = useState<number>((currentOdometer || 0) + 3000)
  const [maintNotes, setMaintNotes] = useState('')

  const handleSaveLog = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const km = logOdoEnd >= logOdoStart ? logOdoEnd - logOdoStart : null
      await saveMotoLog({
        date: logDate,
        kind: logKind,
        categoryId: null,
        hours: logHours,
        tripsCount: logTrips,
        km,
        odometerStart: logOdoStart,
        odometerEnd: logOdoEnd,
        notes: logNotes.trim() || null,
        transactionId: null,
      })
      sound.playConfirm()
      triggerPixelSparks(window.innerWidth / 2, window.innerHeight / 2, 'cyan')
      setLogModalOpen(false)
    } catch (err) {
      sound.playError()
      alert((err as Error).message)
    }
  }

  const handleDeleteLog = async (id: string, date: string) => {
    sound.playClick()
    if (window.confirm(`¿Confirmas eliminar la jornada del ${formatShortDate(date, true)}?`)) {
      try {
        await deleteMotoLog(id)
        sound.playConfirm()
      } catch (err) {
        sound.playError()
        alert((err as Error).message)
      }
    }
  }

  const handleSaveMaintenance = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await saveMotoMaintenance({
        date: maintDate,
        kind: maintKind,
        title: maintTitle.trim(),
        odometer: maintOdo,
        nextDueDate: maintNextDate || null,
        nextDueOdometer: maintNextOdo || null,
        notes: maintNotes.trim() || null,
        transactionId: null,
      })
      sound.playConfirm()
      triggerPixelSparks(window.innerWidth / 2, window.innerHeight / 2, 'amber')
      setMaintModalOpen(false)
    } catch (err) {
      sound.playError()
      alert((err as Error).message)
    }
  }

  const handleDeleteMaintenance = async (id: string, title: string) => {
    sound.playClick()
    if (window.confirm(`¿Confirmas eliminar el registro de mantenimiento «${title}»?`)) {
      try {
        await deleteMotoMaintenance(id)
        sound.playConfirm()
      } catch (err) {
        sound.playError()
        alert((err as Error).message)
      }
    }
  }

  // Desglosar odómetro en dígitos mecánicos
  const odoDigits = (currentOdometer || 0).toString().padStart(6, '0').split('')

  return (
    <div className="space-y-6">
      {/* 1. BAHÍA PRINCIPAL DE INSPECCIÓN MECÁNICA */}
      <div className="forge-machine-panel rivet-corners overflow-hidden border-[#314a3e] bg-[#0e1614] shadow-2xl">
        {/* Cabecera superior de telemetría de máquina */}
        <div className="px-4 py-2.5 flex items-center justify-between border-b border-[#233a32] bg-[#0a110f] text-xs">
          <div className="flex items-center gap-2.5">
            <span className="led-pilot led-pilot-online animate-pulse" />
            <span className="font-stencil text-[11px] text-amber-400 font-bold tracking-wider">
              BAHÍA MECÁNICA • UNIDAD PRODUCTIVA CENTRAL
            </span>
            <span className="badge-pixel bg-[#16231c] text-emerald-300 border-[#2b4c3b] text-[9px]">
              CHASIS ACTIVO
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-300 text-[11px]">
            <span className="hidden sm:inline text-slate-400 font-pixel">CALIBRACIÓN:</span>
            <span className="font-pixel text-amber-300 font-bold bg-[#14231e] px-2.5 py-0.5 rounded-sm border border-[#233c33]">
              {profile?.motoName || 'GIXXER 150 FI'}
            </span>
          </div>
        </div>

        {/* Zona central de inspección */}
        <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Ilustración de la Moto sobre la Plataforma de Servicio */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="relative w-full max-w-[320px] sm:max-w-[360px] flex flex-col items-center">
              {/* Luces y ambiente de taller mecánico */}
              <div className="absolute inset-0 bg-radial from-amber-500/15 via-transparent to-transparent pointer-events-none rounded-full blur-xl" />

              {/* Moto en gran detalle */}
              <div className="relative z-10 py-2">
                <img
                  src={motoLargeImg}
                  alt="Unidad de Trabajo: Motocicleta de Reparto"
                  className="w-full max-h-[190px] sm:max-h-[220px] object-contain pixel-art drop-shadow-2xl select-none transition-transform hover:scale-105 duration-300 filter contrast-110"
                />
              </div>

              {/* Plataforma elevadora hidráulica con marcas de peligro industrial */}
              <div className="w-full relative z-0 -mt-2">
                <div className="h-3.5 w-full hazard-stripes-amber border-t-2 border-b-2 border-[#2f4f40] flex items-center justify-center shadow-inner">
                  <div className="w-4/5 h-1 bg-[#1b2b25]/90 rounded-xs" />
                </div>
                {/* Patas hidráulicas y suelo marcado */}
                <div className="flex justify-between px-6 pt-1">
                  <div className="w-3.5 h-3.5 bg-[#111c18] border border-[#274035]" />
                  <div className="w-3.5 h-3.5 bg-[#111c18] border border-[#274035]" />
                </div>
              </div>
            </div>
          </div>

          {/* Bloque central y derecho: Odómetro mecánico y Controles de servicio */}
          <div className="lg:col-span-7 flex flex-col justify-between h-full space-y-4">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div>
                  <h2 className="font-pixel text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
                    {profile?.motoName ? `Unidad ${profile.motoName}` : 'Gixxer 150 FI • Unidad de Producción'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Generador principal de ingresos. Monitoreo de desgaste, odómetro, combustible y mantenimiento preventivo.
                  </p>
                </div>
              </div>

              {/* Display de Odómetro Mecánico retro (rolling mechanical counter) */}
              <div className="mt-3.5 bg-[#09100e] border-2 border-[#253e34] p-3 rounded-sm rivet-corners">
                <div className="flex items-center justify-between text-[10px] font-stencil uppercase tracking-wider text-slate-400 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <PixelSprite name="gauge" size={14} />
                    <span>ODÓMETRO TOTAL ACUMULADO</span>
                  </span>
                  <span className="text-emerald-400 font-bold">SENSORES ACTIVOS</span>
                </div>

                <div className="flex items-center gap-1">
                  <div className="flex items-center bg-[#050807] border-2 border-[#1c2e27] p-1.5 rounded-xs shadow-inner">
                    {odoDigits.map((d, i) => (
                      <span
                        key={i}
                        className={`inline-flex items-center justify-center w-7 h-9 font-pixel text-xl font-bold border-r border-[#15231e] last:border-r-0 ${
                          i === odoDigits.length - 1
                            ? 'bg-rose-950/80 text-rose-300'
                            : 'bg-[#0d1613] text-amber-300'
                        }`}
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                  <span className="font-stencil text-xs text-amber-400 font-bold ml-2">KM</span>
                  <div className="ml-auto flex items-center gap-3 text-xs">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 font-stencil block">EN ESTE CORTE</span>
                      <span className="font-mono font-bold text-emerald-400 text-sm">
                        {stats.km ? `+${stats.km.toLocaleString('es-CO')} km` : '0 km'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pulsadores de acción de la bahía con calor y chispas */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-[#1b2f28]">
              <button
                onClick={(e) => {
                  sound.playClick()
                  triggerButtonSparks(e, 'cyan', 14)
                  setLogModalOpen(true)
                }}
                className="btn-game btn-game-secondary btn-forge-heat text-xs py-2.5 px-3.5 flex items-center gap-2 font-pixel cursor-pointer shadow-md"
              >
                <PixelSprite name="gauge" size={16} />
                <span>REGISTRAR JORNADA / KM</span>
              </button>

              <button
                onClick={(e) => {
                  sound.playClick()
                  triggerButtonSparks(e, 'forge', 18)
                  setMaintModalOpen(true)
                }}
                className="btn-game btn-game-primary btn-forge-heat text-xs py-2.5 px-4 flex items-center gap-2 font-pixel font-bold cursor-pointer shadow-md"
              >
                <PixelSprite name="tools" size={16} />
                <span>REGISTRAR MANTENIMIENTO</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. ALERTAS DE MANTENIMIENTO INDUSTRIAL */}
      {reminders.length > 0 && (
        <div className="space-y-2.5">
          {reminders.map((r, idx) => (
            <div
              key={idx}
              className={`forge-machine-panel rivet-corners p-3.5 flex items-center justify-between gap-3 text-xs border-2 ${
                r.overdue
                  ? 'bg-[#210c0c] border-rose-800 text-rose-200'
                  : 'bg-[#1e150a] border-amber-800 text-amber-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-1.5 border ${
                    r.overdue
                      ? 'bg-rose-950 border-rose-700 text-rose-400'
                      : 'bg-amber-950 border-amber-700 text-amber-400'
                  }`}
                >
                  <PixelSprite name="tools" size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-stencil font-bold tracking-wide uppercase">
                      {r.maintenance.title}
                    </span>
                    <span
                      className={`badge-pixel text-[9px] px-1.5 py-0.5 ${
                        r.overdue
                          ? 'bg-rose-900 text-rose-200 border-rose-600'
                          : 'bg-amber-900 text-amber-200 border-amber-600'
                      }`}
                    >
                      {r.overdue ? '¡VENCIDO!' : 'PROGRAMADO'}
                    </span>
                  </div>
                  <p className="text-[11px] opacity-90 mt-0.5 font-pixel">
                    {r.overdue
                      ? 'Atención inmediata requerida en taller para prevenir desgaste mayor.'
                      : `Próximo mantenimiento sugerido en ${
                          r.daysLeft !== null ? `${r.daysLeft} días` : ''
                        } ${r.kmLeft !== null ? `(${r.kmLeft} km restantes)` : ''}.`}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setMaintTitle(r.maintenance.title)
                  setMaintModalOpen(true)
                }}
                className="btn-game btn-game-secondary text-xs py-1.5 px-3 shrink-0 cursor-pointer"
              >
                COMPLETAR
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 3. PESTAÑAS DE CONTROL DE TALLER */}
      <div className="flex border-b-2 border-[#20362f] gap-2 text-xs">
        <button
          onClick={() => setActiveTab('stats')}
          className={`py-2 px-3.5 font-stencil tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'stats'
              ? 'bg-[#182923] text-emerald-300 border-t-2 border-emerald-400 font-bold border-x border-[#2b4c3e]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#121f1b]'
          }`}
        >
          <PixelSprite name="coins" size={16} />
          <span>RENDIMIENTO DEL CORTE</span>
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`py-2 px-3.5 font-stencil tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'logs'
              ? 'bg-[#182923] text-emerald-300 border-t-2 border-emerald-400 font-bold border-x border-[#2b4c3e]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#121f1b]'
          }`}
        >
          <PixelSprite name="gauge" size={16} />
          <span>JORNADAS Y KILÓMETROS ({motoLogs.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('maintenance')}
          className={`py-2 px-3.5 font-stencil tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'maintenance'
              ? 'bg-[#182923] text-emerald-300 border-t-2 border-emerald-400 font-bold border-x border-[#2b4c3e]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#121f1b]'
          }`}
        >
          <PixelSprite name="tools" size={16} />
          <span>HISTORIAL DE MANTENIMIENTO ({motoMaintenance.length})</span>
        </button>
      </div>

      {/* PESTAÑA 1: RENDIMIENTO DEL CORTE */}
      {activeTab === 'stats' && (
        <div className="space-y-5">
          {/* Tarjetas de Métricas de Moto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <MetricCard
              title="Producción Bruta Moto"
              amount={stats.gross}
              subtitle={`Comisiones descontadas: ${formatCOPCompact(stats.commissions)}`}
              sprite="coins"
              colorScheme="mint"
              badge="PRODUCCIÓN"
            />
            <MetricCard
              title="Costos Directos Moto"
              amount={stats.costs}
              subtitle="Gasolina, repuestos, comisiones"
              sprite="jerrycan"
              colorScheme="rose"
              badge="COSTOS"
            />
            <MetricCard
              title="Margen Neto Moto"
              amount={stats.net}
              subtitle="Bruto menos insumos y mantenimiento"
              sprite="moto"
              colorScheme={stats.net >= 0 ? 'mint' : 'rose'}
              badge={stats.net >= 0 ? 'SUPERÁVIT' : 'DÉFICIT'}
            />
            <MetricCard
              title="Promedio Día Operado"
              amount={stats.netPerWorkedDay ?? 0}
              subtitle={`${stats.workedDays} jornadas con cobros`}
              sprite="gauge"
              colorScheme="cyan"
              badge="RENDIMIENTO"
            />
          </div>

          {/* Telemetría por Kilómetro (Datos Reales) */}
          <div className="forge-machine-panel rivet-corners p-4 border-[#2b443a]">
            <div className="flex items-center justify-between mb-3 border-b border-[#213731] pb-2">
              <div className="flex items-center gap-2">
                <PixelSprite name="gauge" size={16} />
                <h3 className="text-xs font-stencil uppercase tracking-wider text-slate-300 font-bold">
                  TELEMETRÍA POR KILÓMETRO RECORRIDO (DATOS AUDITADOS)
                </h3>
              </div>
              <span className="led-pilot led-pilot-online" />
            </div>

            {stats.km !== null && stats.km > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="bg-[#0b1411] p-3.5 border border-[#213a30] rounded-xs shadow-inner">
                  <span className="text-[10px] text-slate-400 font-stencil uppercase tracking-wider block">
                    TOTAL KILÓMETROS REGISTRADOS
                  </span>
                  <p className="font-mono text-2xl font-black text-emerald-400 mt-1">
                    {stats.km.toLocaleString('es-CO')} <span className="text-sm font-stencil">km</span>
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1 font-pixel">Acumulado en corte {period.label}</p>
                </div>
                <div className="bg-[#0b1411] p-3.5 border border-[#213a30] rounded-xs shadow-inner">
                  <span className="text-[10px] text-slate-400 font-stencil uppercase tracking-wider block">
                    INGRESO BRUTO POR KILÓMETRO
                  </span>
                  <p className="font-mono text-2xl font-black text-emerald-400 mt-1">
                    {stats.incomePerKm ? formatCOP(stats.incomePerKm) : '—'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1 font-pixel">Jornadas y cobros sincronizados</p>
                </div>
                <div className="bg-[#0b1411] p-3.5 border border-[#213a30] rounded-xs shadow-inner">
                  <span className="text-[10px] text-slate-400 font-stencil uppercase tracking-wider block">
                    COSTO OPERATIVO POR KILÓMETRO
                  </span>
                  <p className="font-mono text-2xl font-black text-amber-400 mt-1">
                    {stats.costPerKm ? formatCOP(stats.costPerKm) : '—'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1 font-pixel">Gasolina + mantenimiento / km real</p>
                </div>
              </div>
            ) : (
              <EmptyState
                sprite="gauge"
                title="Sin lecturas de odómetro registradas en este corte"
                description="La aplicación no inventa ni extrapola distancias. Registra el odómetro inicial y final de tus jornadas para calcular tu ingreso real y costo por kilómetro."
                actionLabel="+ REGISTRAR JORNADA CON KM"
                onAction={() => setLogModalOpen(true)}
              />
            )}
          </div>

          {/* Desglose por Plataforma y Costos de Operación */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="forge-machine-panel rivet-corners p-4 border-[#2b443a]">
              <div className="flex items-center justify-between mb-3 border-b border-[#213731] pb-2">
                <div className="flex items-center gap-2">
                  <PixelSprite name="parcel" size={16} />
                  <h3 className="text-xs font-stencil uppercase tracking-wider text-slate-300 font-bold">
                    PRODUCCIÓN POR PLATAFORMA / ORIGEN
                  </h3>
                </div>
              </div>
              {stats.byPlatform.length === 0 ? (
                <EmptyState
                  sprite="empty_crate"
                  title="Sin ingresos de reparto"
                  description="No se han asentado cobros de Rappi, DiDi u otros servicios en este ciclo."
                />
              ) : (
                <div className="space-y-2 mt-2">
                  {stats.byPlatform.map((item) => (
                    <div
                      key={item.categoryId}
                      className="flex justify-between items-center text-xs p-2 bg-[#0b1411] border border-[#1d332a] rounded-xs"
                    >
                      <span className="text-slate-200 font-pixel">
                        {index.categories.get(item.categoryId)?.name || 'Plataforma'}
                      </span>
                      <span className="font-mono font-bold text-emerald-400">
                        {formatCOP(item.amount)}
                      </span>
                    </div>
                  ))}
                  {stats.tips > 0 && (
                    <div className="flex justify-between items-center text-xs p-2 bg-[#0b1411] border border-amber-900/60 rounded-xs">
                      <span className="text-amber-300 font-pixel">Propinas directas</span>
                      <span className="font-mono font-bold text-amber-300">
                        {formatCOP(stats.tips)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="forge-machine-panel rivet-corners p-4 border-[#2b443a]">
              <div className="flex items-center justify-between mb-3 border-b border-[#213731] pb-2">
                <div className="flex items-center gap-2">
                  <PixelSprite name="jerrycan" size={16} />
                  <h3 className="text-xs font-stencil uppercase tracking-wider text-slate-300 font-bold">
                    CONSUMO Y GASTOS DIRECTOS DE MOTO
                  </h3>
                </div>
              </div>
              {stats.costBreakdown.length === 0 ? (
                <EmptyState
                  sprite="empty_bench"
                  title="Sin gastos de moto"
                  description="No se registran gastos de combustible ni reparaciones en el corte activo."
                />
              ) : (
                <div className="space-y-2 mt-2">
                  {stats.costBreakdown.map((item) => (
                    <div
                      key={item.categoryId}
                      className="flex justify-between items-center text-xs p-2 bg-[#0b1411] border border-[#1d332a] rounded-xs"
                    >
                      <span className="text-slate-200 font-pixel">
                        {index.categories.get(item.categoryId)?.name || 'Costo'}
                      </span>
                      <span className="font-mono font-bold text-rose-400">
                        {formatCOP(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 2: JORNADAS */}
      {activeTab === 'logs' && (
        <div className="forge-machine-panel rivet-corners overflow-hidden border-[#2b443a]">
          {motoLogs.length === 0 ? (
            <div className="p-4">
              <EmptyState
                sprite="empty_bench"
                title="Sin jornadas registradas"
                description="Lleva el registro de cada turno de reparto con horas, número de entregas y kilometraje inicial y final."
                actionLabel="+ REGISTRAR PRIMERA JORNADA"
                onAction={() => setLogModalOpen(true)}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0b1411] text-slate-400 uppercase tracking-wider text-[10px] border-b border-[#213731]">
                  <tr>
                    <th className="py-2.5 px-3 font-stencil">FECHA</th>
                    <th className="py-2.5 px-3 font-stencil">HORAS</th>
                    <th className="py-2.5 px-3 font-stencil">ENTREGAS</th>
                    <th className="py-2.5 px-3 font-stencil">ODO INICIO</th>
                    <th className="py-2.5 px-3 font-stencil">ODO FIN</th>
                    <th className="py-2.5 px-3 text-right font-stencil">DISTANCIA</th>
                    <th className="py-2.5 px-3 text-center font-stencil">ACCIÓN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#182722]">
                  {motoLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#12201b] transition-colors">
                      <td className="py-2.5 px-3 font-mono text-slate-300">
                        {formatShortDate(log.date, true)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-200">{log.hours ? `${log.hours} h` : '—'}</td>
                      <td className="py-2.5 px-3 text-slate-200">{log.tripsCount ? `${log.tripsCount} entregas` : '—'}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-400">
                        {log.odometerStart ? `${log.odometerStart.toLocaleString('es-CO')} km` : '—'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-400">
                        {log.odometerEnd ? `${log.odometerEnd.toLocaleString('es-CO')} km` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                        {log.km ? `+${log.km} km` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => handleDeleteLog(log.id, log.date)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Eliminar jornada"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 3: MANTENIMIENTO */}
      {activeTab === 'maintenance' && (
        <div className="forge-machine-panel rivet-corners overflow-hidden border-[#2b443a]">
          {motoMaintenance.length === 0 ? (
            <div className="p-4">
              <EmptyState
                sprite="tools"
                title="Bitácora de mantenimiento limpia"
                description="Registra cambios de aceite, tensión de cadena, pastillas de freno y llantas para recibir recordatorios preventivos automáticos."
                actionLabel="+ REGISTRAR MANTENIMIENTO"
                onAction={() => setMaintModalOpen(true)}
              />
            </div>
          ) : (
            <div className="divide-y divide-[#182722]">
              {motoMaintenance.map((m) => (
                <div key={m.id} className="p-4 flex items-start justify-between gap-3 text-xs hover:bg-[#12201b] transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-[#0b1411] border border-[#213731] shrink-0 mt-0.5">
                      <PixelSprite name="tools" size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-stencil font-bold text-slate-100 text-sm">{m.title}</span>
                        <span
                          className={`badge-pixel text-[9px] px-2 py-0.5 ${
                            m.kind === 'preventive'
                              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                              : 'bg-amber-950/80 text-amber-300 border-amber-800'
                          }`}
                        >
                          {m.kind === 'preventive' ? 'PREVENTIVO' : 'CORRECTIVO'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mt-1.5 font-pixel">
                        <span>EJECUTADO: {formatShortDate(m.date, true)}</span>
                        {m.odometer && <span>• ODÓMETRO: {m.odometer.toLocaleString('es-CO')} km</span>}
                        {m.nextDueDate && <span>• PRÓXIMO CORTE: {formatShortDate(m.nextDueDate, true)}</span>}
                        {m.nextDueOdometer && (
                          <span className="text-amber-300">• PRÓXIMO KM: {m.nextDueOdometer.toLocaleString('es-CO')} km</span>
                        )}
                      </div>
                      {m.notes && <p className="text-[11px] text-slate-400 italic mt-1 font-sans">{m.notes}</p>}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteMaintenance(m.id, m.title)}
                    className="p-1.5 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors shrink-0 cursor-pointer"
                    title="Eliminar mantenimiento"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL REGISTRO DE JORNADA */}
      {logModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="forge-modal-box rivet-corners max-w-md w-full p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-3 border-b-2 border-[#233c33] bg-[#070d0b] -mx-5 -mt-5 p-3 px-5 rounded-t-sm">
              <div className="flex items-center gap-2">
                <PixelSprite name="gauge" size={18} />
                <h3 className="font-stencil text-base text-emerald-400 font-bold">
                  REGISTRAR JORNADA Y ODÓMETRO
                </h3>
              </div>
              <button
                onClick={() => setLogModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveLog} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 font-pixel text-[11px] uppercase tracking-wider font-bold">FECHA</label>
                  <input
                    type="date"
                    value={logDate}
                    onChange={(e) => setLogDate(e.target.value)}
                    required
                    className="w-full bg-[#070c0a] border border-[#273e34] focus:border-[#d97706] focus:outline-none p-2 text-slate-100 font-pixel rounded-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-pixel text-[11px] uppercase tracking-wider font-bold">MODALIDAD</label>
                  <select
                    value={logKind}
                    onChange={(e) => setLogKind(e.target.value as MotoLogKind)}
                    className="w-full bg-[#070c0a] border border-[#273e34] focus:border-[#d97706] focus:outline-none p-2 text-slate-100 font-pixel rounded-xs"
                  >
                    <option value="shift">Jornada completa</option>
                    <option value="trip">Viaje / Ruta individual</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 font-pixel text-[11px] uppercase tracking-wider font-bold">HORAS EN CALLE</label>
                  <input
                    type="number"
                    step="0.5"
                    value={logHours}
                    onChange={(e) => setLogHours(Number(e.target.value))}
                    className="w-full bg-[#070c0a] border border-[#273e34] focus:border-[#d97706] focus:outline-none p-2 text-slate-100 font-pixel rounded-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-pixel text-[11px] uppercase tracking-wider font-bold">PEDIDOS / VIAJES</label>
                  <input
                    type="number"
                    value={logTrips}
                    onChange={(e) => setLogTrips(Number(e.target.value))}
                    className="w-full bg-[#070c0a] border border-[#273e34] focus:border-[#d97706] focus:outline-none p-2 text-slate-100 font-pixel rounded-xs font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 font-pixel text-[11px] uppercase tracking-wider font-bold">ODÓMETRO INICIAL (KM)</label>
                  <input
                    type="number"
                    value={logOdoStart}
                    onChange={(e) => setLogOdoStart(Number(e.target.value))}
                    className="w-full bg-[#070c0a] border border-[#273e34] focus:border-[#d97706] focus:outline-none p-2 text-slate-100 font-pixel rounded-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-pixel text-[11px] uppercase tracking-wider font-bold">ODÓMETRO FINAL (KM)</label>
                  <input
                    type="number"
                    value={logOdoEnd}
                    onChange={(e) => setLogOdoEnd(Number(e.target.value))}
                    className="w-full bg-[#070c0a] border border-[#273e34] focus:border-[#d97706] focus:outline-none p-2 text-slate-100 font-pixel rounded-xs font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-300 mb-1 font-pixel text-[11px] uppercase tracking-wider font-bold">NOTAS OPERATIVAS</label>
                <input
                  type="text"
                  placeholder="Zona de reparto, lluvia, condiciones viales..."
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                  className="w-full bg-[#070c0a] border border-[#273e34] focus:border-[#d97706] focus:outline-none p-2 text-slate-100 font-pixel rounded-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-[#1e322a]">
                <button
                  type="button"
                  onClick={() => setLogModalOpen(false)}
                  className="btn-game btn-game-secondary text-xs py-2 px-3.5 font-pixel"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className="btn-game btn-game-primary text-xs py-2 px-4 font-pixel font-bold"
                >
                  GUARDAR JORNADA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REGISTRO DE MANTENIMIENTO */}
      {maintModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="forge-modal-box rivet-corners max-w-md w-full p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-3 border-b-2 border-[#233c33] bg-[#070d0b] -mx-5 -mt-5 p-3 px-5 rounded-t-sm">
              <div className="flex items-center gap-2">
                <PixelSprite name="tools" size={18} />
                <h3 className="font-stencil text-base text-amber-400 font-bold">
                  REGISTRAR MANTENIMIENTO EN TALLER
                </h3>
              </div>
              <button
                onClick={() => setMaintModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveMaintenance} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-pixel text-[11px] uppercase tracking-wider font-bold">LABOR REALIZADA</label>
                <input
                  type="text"
                  placeholder="Ej. Cambio de aceite Motul 5100 / Tensión cadena"
                  value={maintTitle}
                  onChange={(e) => setMaintTitle(e.target.value)}
                  required
                  className="w-full bg-[#070c0a] border border-[#273e34] focus:border-[#d97706] focus:outline-none p-2 text-slate-100 font-pixel rounded-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 font-pixel text-[11px] uppercase tracking-wider font-bold">TIPO DE SERVICIO</label>
                  <select
                    value={maintKind}
                    onChange={(e) => setMaintKind(e.target.value as MaintenanceKind)}
                    className="w-full bg-[#070c0a] border border-[#273e34] focus:border-[#d97706] focus:outline-none p-2 text-slate-100 font-pixel rounded-xs"
                  >
                    <option value="preventive">Preventivo (periódico)</option>
                    <option value="corrective">Correctivo (falla o daño)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-pixel text-[11px] uppercase tracking-wider font-bold">FECHA</label>
                  <input
                    type="date"
                    value={maintDate}
                    onChange={(e) => setMaintDate(e.target.value)}
                    required
                    className="w-full bg-[#070c0a] border border-[#273e34] focus:border-[#d97706] focus:outline-none p-2 text-slate-100 font-pixel rounded-xs font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 font-pixel text-[11px] uppercase tracking-wider font-bold">ODÓMETRO ACTUAL (KM)</label>
                  <input
                    type="number"
                    value={maintOdo}
                    onChange={(e) => setMaintOdo(Number(e.target.value))}
                    className="w-full bg-[#070c0a] border border-[#273e34] focus:border-[#d97706] focus:outline-none p-2 text-slate-100 font-pixel rounded-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-pixel text-[11px] uppercase tracking-wider font-bold">PRÓXIMO ODÓMETRO (KM)</label>
                  <input
                    type="number"
                    value={maintNextOdo}
                    onChange={(e) => setMaintNextOdo(Number(e.target.value))}
                    className="w-full bg-[#070c0a] border border-[#273e34] focus:border-[#d97706] focus:outline-none p-2 text-slate-100 font-pixel rounded-xs font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-300 mb-1 font-pixel text-[11px] uppercase tracking-wider font-bold">PRÓXIMA FECHA SUGERIDA</label>
                <input
                  type="date"
                  value={maintNextDate}
                  onChange={(e) => setMaintNextDate(e.target.value)}
                  className="w-full bg-[#070c0a] border border-[#273e34] focus:border-[#d97706] focus:outline-none p-2 text-slate-100 font-pixel rounded-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1 font-pixel text-[11px] uppercase tracking-wider font-bold">NOTAS / TALLER / REPUESTOS</label>
                <input
                  type="text"
                  placeholder="Ej. Taller La 33, filtro original, repuesto garantizado"
                  value={maintNotes}
                  onChange={(e) => setMaintNotes(e.target.value)}
                  className="w-full bg-[#070c0a] border border-[#273e34] focus:border-[#d97706] focus:outline-none p-2 text-slate-100 font-pixel rounded-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-[#1e322a]">
                <button
                  type="button"
                  onClick={() => setMaintModalOpen(false)}
                  className="btn-game btn-game-secondary text-xs py-2 px-3.5 font-pixel"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className="btn-game btn-game-primary text-xs py-2 px-4 font-pixel font-bold"
                >
                  GUARDAR MANTENIMIENTO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
