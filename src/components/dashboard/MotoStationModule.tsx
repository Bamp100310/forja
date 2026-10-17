import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wrench, AlertTriangle, Plus } from 'lucide-react'
import { useForja } from '../../context/ForjaContext'
import { formatCOP } from '../../domain/money'
import { isDateInPeriod } from '../../domain/period'
import { latestOdometer } from '../../domain/moto'
import { PixelSprite } from '../common/PixelSprite'
import { sound } from '../../services/sound'
import { triggerButtonSparks } from '../common/PixelSparks'
import motoLargeImg from '../../assets/forja/sprites/moto_large.png'

export const MotoStationModule: React.FC = () => {
  const {
    profile,
    period,
    summary,
    motoLogs,
    motoMaintenance,
    openQuickModal,
  } = useForja()
  const navigate = useNavigate()

  const motoStats = useMemo(() => {
    const cutLogs = motoLogs.filter((l) => isDateInPeriod(l.date, period))
    const totalKm = cutLogs.reduce((acc, l) => acc + (l.km ?? 0), 0)
    const totalHours = cutLogs.reduce((acc, l) => acc + (l.hours ?? 0), 0)
    const totalTrips = cutLogs.reduce((acc, l) => acc + (l.tripsCount ?? 0), 0)

    const currentOdometer =
      latestOdometer(motoLogs, motoMaintenance, profile?.motoInitialOdometer ?? 0) ?? 0

    const netMotoProfit = summary.moto.net

    return {
      totalKm,
      totalHours,
      totalTrips,
      currentOdometer,
      netMotoProfit,
      logsCount: cutLogs.length,
    }
  }, [motoLogs, motoMaintenance, period, profile, summary.moto.net])

  const maintenanceBars = useMemo(() => {
    return motoMaintenance.slice(0, 4).map((m) => {
      const last = m.odometer ?? motoStats.currentOdometer
      const nextDue = m.nextDueOdometer ?? last + 3000
      const interval = Math.max(500, nextDue - last)
      const kmRemaining = Math.max(0, nextDue - motoStats.currentOdometer)
      const healthPct = Math.max(
        0,
        Math.min(100, Math.round((kmRemaining / interval) * 100)),
      )

      return {
        id: m.id,
        name: m.title,
        healthPct,
        kmRemaining,
        nextDue,
        status: healthPct > 40 ? 'OK' : healthPct > 15 ? 'PRONTO' : 'URGENTE',
      }
    })
  }, [motoMaintenance, motoStats.currentOdometer])

  return (
    <section
      aria-label="Bahía mecánica de motocicleta y telemetría operativa"
      className="h-full forge-machine-panel rivet-corners p-4 sm:p-5 flex flex-col justify-between space-y-4"
    >
      {/* Cabecera de Estación Mecánica */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#213731]">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xs bg-[#181209] border border-amber-700/60">
            <PixelSprite name="moto" size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="led-pilot led-pilot-amber" />
              <h2 className="font-stencil text-xs sm:text-sm font-bold text-amber-300 tracking-wider uppercase">
                ESTACIÓN MECÁNICA: {profile?.motoName || 'UNIDAD DE REPARTO'}
              </h2>
            </div>
            <p className="text-[11px] text-slate-400 font-pixel mt-0.5">
              Telemetría de odómetro, rendimiento neto del vehículo y desgaste de componentes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              sound.playClick()
              triggerButtonSparks(e, 'rust', 12)
              openQuickModal('expense', null, {
                isMoto: true,
                description: 'Tanqueo / Mantenimiento Moto',
              })
            }}
            className="btn-game btn-game-secondary text-[10px] py-1 px-2.5 flex items-center gap-1 text-amber-300 cursor-pointer"
          >
            <Plus size={12} />
            <span className="font-pixel">+ GASTO MOTO</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playClick()
              navigate('/taller-moto')
            }}
            className="btn-game btn-game-orange text-[10px] py-1 px-2.5 flex items-center gap-1 cursor-pointer font-pixel font-bold"
          >
            <Wrench size={12} />
            <span>ABRIR TALLER</span>
          </button>
        </div>
      </div>

      {/* Bahía Visual de Unidad + Telemetría Operativa */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Render Pixel-Art de la Motocicleta en Plataforma de Inspección */}
        <div className="md:col-span-5 bg-[#080e0c] border-2 border-[#233b32] rounded-xs p-3 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-2 left-2 flex items-center gap-1.5">
            <span className="badge-pixel bg-[#14261f] text-emerald-300 border-emerald-700/70 text-[8px]">
              EN SERVICIO
            </span>
          </div>
          <div className="absolute top-2 right-2">
            <span className="text-[10px] font-bold num text-amber-300 bg-[#191209] border border-amber-700/60 px-1.5 py-0.5 rounded-xs">
              {motoStats.currentOdometer.toLocaleString('es-CO')} KM
            </span>
          </div>

          <img
            src={motoLargeImg}
            alt={profile?.motoName || 'Motocicleta de trabajo'}
            className="w-36 h-28 object-contain pixel-art my-3 drop-shadow-[0_6px_12px_rgba(0,0,0,0.9)]"
          />

          <div className="w-full pt-2 border-t border-[#1b2f27] flex items-center justify-between text-[10px] font-pixel">
            <span className="text-slate-400">Jornadas en el corte:</span>
            <span className="text-emerald-400 font-bold num">
              {motoStats.logsCount} REGISTROS
            </span>
          </div>
        </div>

        {/* Telemetría de Rendimiento de la Motocicleta */}
        <div className="md:col-span-7 grid grid-cols-2 gap-2.5">
          <div className="bg-[#0b1311] border border-[#1e342c] p-3 rounded-xs">
            <span className="text-[10px] text-slate-400 font-stencil uppercase block">
              INGRESO BRUTO MOTO
            </span>
            <div className="text-base sm:text-lg font-bold num text-emerald-400 mt-1">
              +{formatCOP(summary.moto.income)}
            </div>
            <span className="text-[10px] text-slate-500 font-pixel">
              Producción en el corte
            </span>
          </div>

          <div className="bg-[#0b1311] border border-[#1e342c] p-3 rounded-xs">
            <span className="text-[10px] text-slate-400 font-stencil uppercase block">
              GASTO OPERATIVO MOTO
            </span>
            <div className="text-base sm:text-lg font-bold num text-rose-400 mt-1">
              −{formatCOP(summary.moto.expense)}
            </div>
            <span className="text-[10px] text-slate-500 font-pixel">
              Gasolina, aceite y taller
            </span>
          </div>

          <div className="bg-[#0b1311] border border-[#1e342c] p-3 rounded-xs">
            <span className="text-[10px] text-slate-400 font-stencil uppercase block">
              RECORRIDO EN EL CORTE
            </span>
            <div className="text-base sm:text-lg font-bold num text-amber-300 mt-1">
              {motoStats.totalKm.toLocaleString('es-CO')} KM
            </div>
            <span className="text-[10px] text-slate-500 font-pixel num">
              Viajes: {motoStats.totalTrips} • Horas: {motoStats.totalHours}h
            </span>
          </div>

          <div className="bg-[#0e1915] border border-emerald-800/60 p-3 rounded-xs">
            <span className="text-[10px] text-emerald-300 font-stencil uppercase block">
              UTILIDAD NETA MOTO
            </span>
            <div
              className={`text-base sm:text-lg font-bold num mt-1 ${
                motoStats.netMotoProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {motoStats.netMotoProfit >= 0 ? '+' : ''}
              {formatCOP(motoStats.netMotoProfit)}
            </div>
            <span className="text-[10px] text-slate-400 font-pixel">
              Libre tras costos
            </span>
          </div>
        </div>
      </div>

      {/* Barras de Integridad de Piezas y Mantenimiento Preventivo */}
      <div className="pt-2 border-t border-[#1e342c] space-y-2.5">
        <div className="flex items-center justify-between text-[10px] font-stencil text-slate-400 uppercase tracking-wider">
          <span>INTEGRIDAD DE COMPONENTES Y MANTENIMIENTO PREVENTIVO</span>
          <span className="text-emerald-400 num">
            {maintenanceBars.length} SISTEMAS MONITOREADOS
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {maintenanceBars.map((item) => {
            const barColor =
              item.healthPct > 40
                ? 'bg-emerald-500'
                : item.healthPct > 15
                  ? 'bg-amber-400'
                  : 'bg-rose-500'

            return (
              <div
                key={item.id}
                className="bg-[#09100e] border border-[#1c3028] p-2.5 rounded-xs space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-pixel font-bold text-slate-200 truncate flex items-center gap-1">
                    {item.status === 'URGENTE' && (
                      <AlertTriangle size={12} className="text-rose-400 shrink-0" />
                    )}
                    <span>{item.name}</span>
                  </span>
                  <span
                    className={`badge-pixel text-[8px] px-1.5 py-0.5 ${
                      item.status === 'OK'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        : item.status === 'PRONTO'
                          ? 'bg-amber-950 text-amber-300 border-amber-700'
                          : 'bg-rose-950 text-rose-300 border-rose-700'
                    }`}
                  >
                    {item.status} • {item.healthPct}%
                  </span>
                </div>

                <div className="w-full h-2 bg-[#050807] rounded-xs overflow-hidden border border-[#1d3129]">
                  <div
                    className={`h-full ${barColor} transition-all duration-500`}
                    style={{ width: `${item.healthPct}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 font-pixel num">
                  <span>Restan: {item.kmRemaining.toLocaleString('es-CO')} km</span>
                  <span>Cambio a los {item.nextDue.toLocaleString('es-CO')} km</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
