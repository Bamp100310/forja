import React from 'react'
import { useForja } from '../../context/ForjaContext'
import { formatCOP } from '../../domain/money'
import { daysBetween } from '../../domain/dates'
import { PixelSprite } from '../common/PixelSprite'
import { sound } from '../../services/sound'
import { triggerButtonSparks } from '../common/PixelSparks'
import workshopHeroWebp from '../../assets/forja/workshop_hero.webp'

export const WorkshopHero: React.FC = () => {
  const { profile, period, summary, isDemoMode, today, openQuickModal, isModuleActive } = useForja()

  const hasMoto = isModuleActive('moto')

  // Días transcurridos vs total de días del corte
  const totalDays = Math.max(1, daysBetween(period.start, period.end) + 1)
  const elapsedDays = Math.min(totalDays, Math.max(1, daysBetween(period.start, today) + 1))
  const progressPercent = Math.min(100, Math.round((elapsedDays / totalDays) * 100))

  return (
    <div className="forge-machine-panel overflow-hidden rivet-corners relative shadow-2xl border-[#334b41] bg-[#101916]">
      {/* Marco superior de maquinaria: señalización e indicadores de telemetría */}
      <div className="px-3.5 py-2 sm:px-5 sm:py-2.5 flex items-center justify-between border-b border-[#263c34] bg-[#0c1412] text-xs">
        <div className="flex items-center gap-2.5">
          <span className="led-pilot led-pilot-online animate-pulse" />
          <span className="font-stencil text-[11px] text-emerald-400 font-bold tracking-wider">
            SISTEMA CENTRAL • {period.id}
          </span>
          {isDemoMode ? (
            <span className="badge-pixel bg-[#2a1d0b] text-amber-300 border-[#6e4612] text-[9px]">
              MODO SIMULACIÓN
            </span>
          ) : (
            <span className="badge-pixel bg-[#12261a] text-emerald-300 border-[#234b31] text-[9px]">
              LIBRO EN LÍNEA
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-slate-300 text-[11px]">
          <span className="hidden sm:inline text-slate-400 font-pixel">CICLO CONTABLE:</span>
          <span className="font-pixel text-emerald-300 font-bold bg-[#14231f] px-2.5 py-0.5 rounded-sm border border-[#233a33]">
            {period.label}
          </span>
        </div>
      </div>

      {/* Composición Hero: Ilustración Pixel Art y Paneles Operativos */}
      <div className="relative min-h-[220px] sm:min-h-[260px] lg:min-h-[300px] w-full flex flex-col justify-end">
        {/* Ilustración de fondo pixel art auténtica */}
        <img
          src={workshopHeroWebp}
          alt="Taller de Forja y Operaciones"
          className="absolute inset-0 w-full h-full object-cover object-center pixel-art opacity-92 select-none"
        />

        {/* Gradientes ambientales calculados para legibilidad sin oscurecer los detalles del arte */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e1513] via-[#0e1513]/70 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0e1513]/90 via-[#0e1513]/60 to-transparent pointer-events-none" />

        {/* Contenido interactivo del Hero */}
        <div className="relative z-10 p-4 sm:p-6 lg:p-7 flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          {/* Zona izquierda: Título, metáfora del taller y cronómetro de ciclo */}
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-1.5">
              <PixelSprite name="cog" size={18} />
              <span className="text-[11px] font-stencil uppercase tracking-widest text-amber-400 font-bold">
                {hasMoto
                  ? 'ESTACIÓN DE OPERACIONES & FORJA FINANCIERA'
                  : 'ESTACIÓN FINANCIERA & CONTROL DE PATRIMONIO'}
              </span>
            </div>

            <h1 className="font-pixel text-2xl sm:text-3xl lg:text-4xl font-black text-slate-100 tracking-tight leading-tight">
              {profile?.displayName
                ? hasMoto
                  ? `Taller de ${profile.displayName}`
                  : `Finanzas de ${profile.displayName}`
                : hasMoto
                ? 'Taller de Operaciones FORJA'
                : 'Consola Financiera FORJA'}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed max-w-xl">
              {hasMoto ? (
                <>
                  Transformando kilómetros, entregas y esfuerzo en patrimonio sólido. Monitoreo del periodo contable{' '}
                  <span className="text-emerald-400 font-semibold font-mono">{period.label}</span>.
                </>
              ) : (
                <>
                  Organizando salarios, quincenas y gastos cotidianos en un patrimonio ordenado y predecible.{' '}
                  <span className="text-emerald-400 font-semibold font-mono">{period.label}</span>.
                </>
              )}
            </p>

            {/* Cronómetro industrial de corte */}
            <div className="mt-4 bg-[#0d1614]/90 border border-[#233a33] p-2.5 max-w-md backdrop-blur-xs">
              <div className="flex items-center justify-between text-[11px] mb-1.5 font-pixel">
                <span className="text-slate-300">
                  CRONÓMETRO DE CICLO: <strong className="text-amber-300">Día {elapsedDays}</strong> de {totalDays}
                </span>
                <span className="text-emerald-400 font-bold">{progressPercent}% TRANSCURRIDO</span>
              </div>
              <div className="w-full bg-[#131d1a] h-2.5 overflow-hidden border border-[#233b32] flex">
                <div
                  className="h-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400 transition-all duration-500 shadow-sm"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Zona derecha: Telemetría devengada del ciclo y Pulsador de Forja */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            {/* Placa de Producción Devengada */}
            <div className="bg-[#121c19]/95 border-2 border-[#2b443c] p-3.5 flex items-center gap-3.5 shadow-xl backdrop-blur-xs">
              <div className="p-2 bg-[#0d1613] border border-[#223932] text-amber-400 shrink-0">
                <PixelSprite name="coins" size={28} />
              </div>
              <div>
                <span className="text-[10px] font-stencil uppercase tracking-wider text-slate-400 block">
                  {hasMoto ? 'PRODUCCIÓN DEVENGADA DEL CORTE' : 'INGRESOS DEL PERIODO'}
                </span>
                <span className="num font-bold text-xl sm:text-2xl text-emerald-300 block leading-tight">
                  {formatCOP(summary.income)}
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5 font-pixel">
                  {summary.incomeDays} {summary.incomeDays === 1 ? 'día con cobros' : 'días con cobros'} registrados
                </span>
              </div>
            </div>

            {/* Pulsador de Forja Principal con calor y chispas */}
            <button
              onClick={(e) => {
                sound.playClick()
                triggerButtonSparks(e, 'forge', 24)
                openQuickModal()
              }}
              className="btn-game btn-game-primary btn-forge-heat py-3 px-5 text-xs tracking-wider flex items-center justify-center gap-2 shadow-2xl font-bold cursor-pointer"
            >
              <PixelSprite name="tools" size={16} />
              <span>+ FORJAR MOVIMIENTO</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
