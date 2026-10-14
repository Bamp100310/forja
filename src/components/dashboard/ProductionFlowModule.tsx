import React from 'react'
import { useForja } from '../../context/ForjaContext'
import { formatCOP, formatCOPCompact } from '../../domain/money'
import { PixelSprite } from '../common/PixelSprite'
import { ChevronRight } from 'lucide-react'

export const ProductionFlowModule: React.FC = () => {
  const { summary, period, isModuleActive, preferences } = useForja()

  const hasMoto = isModuleActive('moto')
  const hasPlatforms = isModuleActive('platforms')
  const hasPayroll = isModuleActive('payroll')

  // Proporción de costes sobre ingresos
  const expenseRatio = summary.income > 0 ? Math.min(100, Math.round((summary.expense / summary.income) * 100)) : 0
  const netRetentionRatio = summary.income > 0 ? Math.max(0, Math.round((summary.result / summary.income) * 100)) : 0

  return (
    <div className="forge-panel p-4 sm:p-5 rivet-corners border-[#28443b] bg-[#121c19]">
      {/* Título de la línea de producción industrial */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-[#213730]">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-sm bg-[#162721] border border-emerald-700/50 shadow-inner">
            <PixelSprite name="conveyor" size={24} />
          </div>
          <div>
            <h3 className="font-stencil text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-wide">
              {hasMoto ? 'LÍNEA DE PRODUCCIÓN FINANCIERA DEL TALLER' : 'FLUJO DE RECURSOS FINANCIEROS'}
            </h3>
            <p className="text-[11px] text-slate-400 font-pixel">
              Esquema de transformación de recursos: Entradas brutas → Costos y consumo → Resultado neto forjado
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="badge-pixel bg-[#14231f] text-emerald-400 border-[#2b4c40] text-[10px]">
            EFICIENCIA NETA: {netRetentionRatio}%
          </span>
        </div>
      </div>

      {/* Diagrama de flujo tipo Satisfactory con conectores */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative items-stretch">
        {/* ETAPA 1: FUENTES / PLATAFORMAS / NÓMINA */}
        <div className="bg-[#101917] border border-[#233a33] p-3.5 flex flex-col justify-between relative shadow-sm">
          <div>
            <div className="flex items-center justify-between text-[11px] mb-2 font-stencil">
              <span className="text-slate-400 tracking-wider">ETAPA 01: ORIGEN</span>
              <span className="led-pilot led-pilot-cyan" />
            </div>
            <div className="flex items-center gap-2.5 mb-2">
              <PixelSprite
                name={hasPlatforms ? 'parcel' : hasPayroll ? 'sack' : 'vault'}
                size={24}
              />
              <span className="font-pixel font-bold text-slate-200 text-xs sm:text-sm">
                {hasPlatforms
                  ? 'Plataformas & Envíos'
                  : hasPayroll
                  ? 'Nómina & Quincenas'
                  : 'Fuentes de Ingreso'}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-snug">
              {hasPlatforms
                ? `Rappi, DiDi, Clicoh y viajes particulares en ${summary.incomeDays} días activos.`
                : hasPayroll
                ? `Sueldos habituales (${preferences.incomeSchedules?.length || 0} programados) y pagos recibidos.`
                : `Entradas de dinero y transferencias recibidas en ${summary.incomeDays} días.`}
            </p>
          </div>

          <div className="mt-3 pt-2.5 border-t border-[#1c2e28] flex items-baseline justify-between text-xs font-pixel">
            <span className="text-[10px] text-slate-400">
              {hasMoto ? 'Aporte Moto:' : hasPayroll ? 'Sueldos:' : 'Registros:'}
            </span>
            <span className="text-emerald-400 font-bold">
              {hasMoto
                ? formatCOPCompact(summary.moto.income)
                : formatCOPCompact(summary.income)}
            </span>
          </div>
        </div>

        {/* ETAPA 2: INGRESOS DEVENGADOS */}
        <div className="bg-[#12221e] border-2 border-emerald-600/70 p-3.5 flex flex-col justify-between relative shadow-md">
          <div className="hidden md:flex absolute -left-2.5 top-1/2 -translate-y-1/2 z-10 w-5 h-5 bg-[#172b25] border border-emerald-600 items-center justify-center text-emerald-400 shadow">
            <ChevronRight size={13} />
          </div>

          <div>
            <div className="flex items-center justify-between text-[11px] mb-2 font-stencil">
              <span className="text-emerald-400 tracking-wider">ETAPA 02: INGRESO BRUTO</span>
              <span className="led-pilot led-pilot-online" />
            </div>
            <div className="flex items-center gap-2.5 mb-2">
              <PixelSprite name="coins" size={24} />
              <span className="num font-pixel text-lg sm:text-xl font-black text-emerald-300">
                {formatCOP(summary.income)}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-snug">
              Total devengado contablemente en el periodo ({period.label}).
            </p>
          </div>

          <div className="mt-3 pt-2.5 border-t border-[#233d34] flex items-baseline justify-between text-xs font-pixel">
            <span className="text-[10px] text-slate-400 font-stencil">PRODUCCIÓN:</span>
            <span className="text-emerald-300 font-bold">100% BASE</span>
          </div>
        </div>

        {/* ETAPA 3: CONSUMO Y COSTOS */}
        <div className="bg-[#181313] border border-rose-900/60 p-3.5 flex flex-col justify-between relative shadow-sm">
          <div className="hidden md:flex absolute -left-2.5 top-1/2 -translate-y-1/2 z-10 w-5 h-5 bg-[#261717] border border-rose-700 items-center justify-center text-rose-400 shadow">
            <ChevronRight size={13} />
          </div>

          <div>
            <div className="flex items-center justify-between text-[11px] mb-2 font-stencil">
              <span className="text-rose-400 tracking-wider">ETAPA 03: COSTES & GASTO</span>
              <span className="led-pilot led-pilot-alert" />
            </div>
            <div className="flex items-center gap-2.5 mb-2">
              <PixelSprite name="jerrycan" size={24} />
              <span className="num font-pixel text-lg sm:text-xl font-black text-rose-300">
                − {formatCOP(summary.expense)}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-snug">
              {hasMoto
                ? 'Combustible, repuestos, comisiones bancarias y consumo personal.'
                : 'Alimentación, mercado, vivienda, servicios y gastos personales.'}
            </p>
          </div>

          <div className="mt-3 pt-2.5 border-t border-[#2a1a1a] flex items-baseline justify-between text-xs font-pixel">
            <span className="text-[10px] text-slate-400 font-stencil">ABSORCIÓN:</span>
            <span className="text-rose-400 font-bold">{expenseRatio}% DEL INGRESO</span>
          </div>
        </div>

        {/* ETAPA 4: RESULTADO NETO FORJADO */}
        <div
          className={`p-3.5 flex flex-col justify-between relative shadow-lg border-2 ${
            summary.result >= 0
              ? 'bg-[#10241d] border-emerald-500/80'
              : 'bg-[#221010] border-rose-600/80'
          }`}
        >
          <div className="hidden md:flex absolute -left-2.5 top-1/2 -translate-y-1/2 z-10 w-5 h-5 bg-[#172b25] border border-emerald-500 items-center justify-center text-emerald-300 shadow">
            <ChevronRight size={13} />
          </div>

          <div>
            <div className="flex items-center justify-between text-[11px] mb-2 font-stencil">
              <span
                className={`tracking-wider font-bold ${
                  summary.result >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                ETAPA 04: BENEFICIO NETO
              </span>
              <span className={summary.result >= 0 ? 'led-pilot led-pilot-online' : 'led-pilot led-pilot-alert'} />
            </div>
            <div className="flex items-center gap-2.5 mb-2">
              <PixelSprite name="cog" size={24} />
              <span
                className={`num font-pixel text-xl sm:text-2xl font-black ${
                  summary.result >= 0 ? 'text-emerald-300' : 'text-rose-300'
                }`}
              >
                {formatCOP(summary.result)}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-snug">
              {summary.result >= 0
                ? 'Superávit limpio forjado en el ciclo actual.'
                : 'Déficit operativo: los gastos superaron los ingresos devengados.'}
            </p>
          </div>

          <div className="mt-3 pt-2.5 border-t border-[#1e3b30] flex items-baseline justify-between text-xs font-pixel">
            <span className="text-[10px] text-slate-400 font-stencil">FLUJO CAJA REAL:</span>
            <span className="text-cyan-300 font-bold font-mono">{formatCOP(summary.cashFlow)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
