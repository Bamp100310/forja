import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useForja } from '../../context/ForjaContext'
import { formatCOP, formatCOPCompact } from '../../domain/money'
import { computeMotoStats, latestOdometer, maintenanceReminders } from '../../domain/moto'
import { PixelSprite } from '../common/PixelSprite'
import motoLargeImg from '../../assets/forja/sprites/moto_large.png'
import { ArrowRight, Wrench, Fuel, AlertTriangle } from 'lucide-react'

export const MotoStationModule: React.FC = () => {
  const {
    profile,
    period,
    transactions,
    motoLogs,
    motoMaintenance,
    index,
    today,
  } = useForja()

  const stats = useMemo(() => {
    return computeMotoStats(transactions, motoLogs, index, { start: period.start, end: period.end })
  }, [transactions, motoLogs, index, period.start, period.end])

  const currentOdo = useMemo(() => {
    return latestOdometer(motoLogs, motoMaintenance, profile?.motoInitialOdometer ?? null)
  }, [motoLogs, motoMaintenance, profile?.motoInitialOdometer])

  const reminders = useMemo(() => {
    return maintenanceReminders(motoMaintenance, currentOdo, today)
  }, [motoMaintenance, currentOdo, today])

  const urgentReminder = reminders.find((r) => r.overdue) || reminders[0]
  const marginPercent = stats.gross > 0 ? Math.round((stats.net / stats.gross) * 100) : null

  const gasExpense = useMemo(() => {
    let total = 0
    for (const c of stats.costBreakdown) {
      const cat = index.categories.get(c.categoryId)
      if (cat && (cat.name.toLowerCase().includes('gasolina') || cat.name.toLowerCase().includes('combustible'))) {
        total += c.amount
      }
    }
    return total
  }, [stats.costBreakdown, index.categories])

  const maintExpense = useMemo(() => {
    let total = 0
    for (const c of stats.costBreakdown) {
      const cat = index.categories.get(c.categoryId)
      if (
        cat &&
        (cat.name.toLowerCase().includes('mantenimiento') ||
          cat.name.toLowerCase().includes('repuesto') ||
          cat.name.toLowerCase().includes('taller') ||
          cat.name.toLowerCase().includes('aceite'))
      ) {
        total += c.amount
      }
    }
    return total
  }, [stats.costBreakdown, index.categories])

  return (
    <div className="forge-panel p-4 sm:p-5 rivet-corners border-[#28443b] relative overflow-hidden bg-[#121c19]">
      {/* Encabezado del módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-[#213730]">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-sm bg-[#162721] border border-emerald-700/50 shadow-inner">
            <PixelSprite name="moto" size={24} />
          </div>
          <div>
            <h3 className="font-stencil text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-wide">
              ESTACIÓN DE MOTO — UNIDAD PRODUCTIVA
            </h3>
            <p className="text-[11px] text-slate-400 font-pixel">
              Rendimiento operativo, odómetro, combustible y estado de mantenimiento
            </p>
          </div>
        </div>

        <Link
          to="/taller-moto"
          className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold transition-colors font-pixel"
        >
          <span>Abrir Taller Completo</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      {/* Contenido en 2 columnas: Bahía mecánica con Pixel Art auténtico e Indicadores de Rendimiento */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Columna Izquierda: Bahía de mantenimiento y odómetro con moto_large.png */}
        <div className="lg:col-span-5 relative rounded-sm border-2 border-[#2b473d] bg-[#0c1513] shadow-lg flex flex-col justify-between overflow-hidden">
          {/* Fondo de bahía mecánica con cuadrícula sutil y plataforma */}
          <div className="p-4 sm:p-5 flex flex-col items-center justify-center relative min-h-[160px] bg-gradient-to-b from-[#111c18] via-[#0d1613] to-[#09100e]">
            {/* Luz de foco cenital sobre la moto */}
            <div className="absolute top-0 w-36 h-20 bg-amber-400/8 rounded-full blur-xl pointer-events-none" />

            {/* Ilustración de la motocicleta pixel art a escala nítida */}
            <img
              src={motoLargeImg}
              alt="Motocicleta de reparto FORJA"
              className="w-48 sm:w-56 h-auto object-contain pixel-art relative z-10 transition-transform duration-200 hover:scale-105 select-none"
              style={{ imageRendering: 'pixelated' }}
            />

            {/* Plataforma elevadora mecánica bajo las ruedas */}
            <div className="w-52 h-2.5 bg-[#1b2b25] border-t-2 border-[#335347] border-x border-[#243a31] shadow-md flex items-center justify-around px-2 mt-1">
              <span className="w-2 h-1 bg-[#406859]" />
              <span className="w-2 h-1 bg-[#406859]" />
              <span className="w-2 h-1 bg-[#406859]" />
              <span className="w-2 h-1 bg-[#406859]" />
            </div>
          </div>

          {/* Placa inferior de telemetría de odómetro y modelo */}
          <div className="p-2.5 bg-[#0e1715] border-t border-[#233c33] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PixelSprite name="gauge" size={20} />
              <div>
                <span className="text-[9px] uppercase font-stencil text-slate-400 block leading-tight">
                  ODÓMETRO REGISTRADO
                </span>
                <span className="font-pixel text-sm font-bold text-slate-100">
                  {currentOdo !== null ? `${currentOdo.toLocaleString('es-CO')} km` : 'Sin lecturas'}
                </span>
              </div>
            </div>

            <span className="badge-pixel bg-[#12261a] text-emerald-300 border-[#234b31] text-[9px]">
              {profile?.motoName || 'MOTO 125CC'}
            </span>
          </div>
        </div>

        {/* Columna Derecha: Indicadores operativos de la máquina */}
        <div className="lg:col-span-7 space-y-3">
          {/* Matriz de 3 métricas clave */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-[#101b18] border border-[#233a33] p-2.5 rounded-sm text-center">
              <span className="text-[10px] uppercase font-stencil text-slate-400 block mb-0.5">
                PRODUCCIÓN BRUTA
              </span>
              <span className="font-pixel text-sm sm:text-base font-black text-emerald-300 block">
                {formatCOPCompact(stats.gross)}
              </span>
              <span className="text-[10px] text-slate-400 font-pixel">Reparto y viajes</span>
            </div>

            <div className="bg-[#101b18] border border-[#233a33] p-2.5 rounded-sm text-center">
              <span className="text-[10px] uppercase font-stencil text-slate-400 block mb-0.5">
                COSTES DIRECTOS
              </span>
              <span className="font-pixel text-sm sm:text-base font-black text-rose-300 block">
                {formatCOPCompact(stats.costs)}
              </span>
              <span className="text-[10px] text-slate-400 font-pixel">Gasolina + repuestos</span>
            </div>

            <div className="bg-[#14261f] border-2 border-emerald-600/70 p-2.5 rounded-sm text-center">
              <span className="text-[10px] uppercase font-stencil text-emerald-400 block mb-0.5">
                MARGEN LIMPIO
              </span>
              <span className="font-pixel text-sm sm:text-base font-black text-emerald-200 block">
                {formatCOPCompact(stats.net)}
              </span>
              <span className="text-[10px] text-emerald-400 font-bold font-stencil">
                {marginPercent !== null ? `${marginPercent}% MARGEN` : 'N/D'}
              </span>
            </div>
          </div>

          {/* Desglose de insumos de moto: Combustible vs Mantenimiento */}
          <div className="bg-[#0e1815] border border-[#213730] rounded-sm p-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-pixel">
              <div className="flex items-center gap-2">
                <Fuel size={14} className="text-amber-400" />
                <span className="text-slate-300">Gasto en Combustible:</span>
              </div>
              <span className="font-bold text-slate-100">
                {formatCOP(gasExpense)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs font-pixel">
              <div className="flex items-center gap-2">
                <Wrench size={14} className="text-cyan-400" />
                <span className="text-slate-300">Taller y Mantenimiento:</span>
              </div>
              <span className="font-bold text-slate-100">
                {formatCOP(maintExpense)}
              </span>
            </div>

            {stats.costPerKm !== null && (
              <div className="pt-2 border-t border-[#1c2e28] flex items-center justify-between text-xs font-pixel">
                <span className="text-slate-400">Costo real verificado por km:</span>
                <span className="text-amber-300 font-bold">
                  {formatCOP(stats.costPerKm)} / km
                </span>
              </div>
            )}
          </div>

          {/* Alerta de mantenimiento activo */}
          {urgentReminder ? (
            <div
              className={`p-2.5 rounded-sm border flex items-center justify-between text-xs ${
                urgentReminder.overdue
                  ? 'bg-rose-950/60 border-rose-800 text-rose-200'
                  : 'bg-[#12221d] border-emerald-800/60 text-emerald-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle
                  size={15}
                  className={urgentReminder.overdue ? 'text-rose-400 shrink-0' : 'text-emerald-400 shrink-0'}
                />
                <div>
                  <span className="font-bold block leading-tight font-pixel">{urgentReminder.maintenance.title}</span>
                  <span className="text-[10px] text-slate-300 font-pixel">
                    {urgentReminder.reason === 'odometer'
                      ? `Próximo cambio por km (${urgentReminder.kmLeft !== null ? `${urgentReminder.kmLeft} km restantes` : 'Límite alcanzado'})`
                      : `Próximo cambio por fecha (${urgentReminder.daysLeft !== null ? `${urgentReminder.daysLeft} días restantes` : 'Límite alcanzado'})`}
                  </span>
                </div>
              </div>
              <span className="badge-pixel text-[9px] uppercase">
                {urgentReminder.overdue ? 'VENCIDO' : 'AL DÍA'}
              </span>
            </div>
          ) : (
            <div className="p-2.5 rounded-sm border border-[#213730] bg-[#0e1715] flex items-center gap-2 text-xs text-slate-400 font-pixel">
              <Wrench size={14} className="text-emerald-400" />
              <span>Sin alertas pendientes de mantenimiento en este momento.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
