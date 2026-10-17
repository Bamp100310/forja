import React, { useMemo } from 'react'
import { Plus, Flame, Wrench, ArrowLeftRight, Sliders, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useForja } from '../../context/ForjaContext'
import { formatCOP } from '../../domain/money'
import { daysBetween } from '../../domain/dates'
import { LIQUID_ACCOUNT_KINDS } from '../../domain/types'
import { PixelSprite } from '../common/PixelSprite'
import { sound } from '../../services/sound'
import { triggerButtonSparks } from '../common/PixelSparks'
import workshopHeroBg from '../../assets/forja/workshop_hero.webp'

export const WorkshopHero: React.FC = () => {
  const {
    period,
    profile,
    accounts,
    balances,
    summary,
    today,
    openQuickModal,
    isModuleActive,
  } = useForja()
  const navigate = useNavigate()

  const isWorkshopMode = isModuleActive('moto') || isModuleActive('platforms')
  const isPayrollActive = isModuleActive('payroll')

  // Progreso real de días transcurridos dentro del corte contable activo
  const cycleTelemetry = useMemo(() => {
    const totalDays = Math.max(1, daysBetween(period.start, period.end) + 1)
    const elapsedRaw = daysBetween(period.start, today) + 1
    const elapsedDays = Math.max(1, Math.min(totalDays, elapsedRaw))
    const remainingDays = Math.max(0, totalDays - elapsedDays)
    const pct = Math.min(100, Math.round((elapsedDays / totalDays) * 100))
    return { totalDays, elapsedDays, remainingDays, pct }
  }, [period.start, period.end, today])

  // Bóvedas líquidas activas con sus saldos reales
  const liquidVaults = useMemo(() => {
    return accounts
      .filter((a) => !a.isArchived && LIQUID_ACCOUNT_KINDS.includes(a.kind))
      .map((a) => ({
        id: a.id,
        name: a.name,
        kind: a.kind,
        balance: balances.accountBalance.get(a.id) ?? a.openingBalance,
      }))
      .slice(0, 8)
  }, [accounts, balances.accountBalance])

  return (
    <section
      aria-label="Puente de mando financiero FORJA III"
      className="h-full flex flex-col justify-between relative overflow-hidden rounded-sm border-2 border-[#385447] bg-[#0b1310] shadow-2xl rivet-corners"
    >
      {/* Escena ilustrada del taller con tratamiento atmosférico artesanal */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-28 pointer-events-none pixel-art"
        style={{ backgroundImage: `url(${workshopHeroBg})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#090e0c]/96 via-[#0c1411]/88 to-[#121a16]/94 pointer-events-none" />

      <div className="relative z-10 p-4 sm:p-5 lg:p-6 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* ===================================================================
            BAHÍA IZQUIERDA (7 COLS): ESTADO DEL OPERARIO, CICLO Y VÁLVULAS DE BÓVEDA
            =================================================================== */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
          <div className="space-y-2.5">
            {/* Insignias de estado de estación */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xs bg-[#182922] border border-emerald-600/60 text-emerald-300 text-[10px] font-stencil tracking-wider">
                <span className="led-pilot led-pilot-online" />
                <span>
                  {isWorkshopMode
                    ? 'ESTACIÓN INDUSTRIAL & OPERACIONES'
                    : 'ESTACIÓN DE FINANZAS PERSONALES'}
                </span>
              </span>

              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xs bg-[#24180b] border border-amber-600/60 text-amber-300 text-[10px] font-pixel font-bold num">
                <Flame size={11} className="text-amber-400" />
                <span>CORTE: {period.label}</span>
              </span>

              <button
                type="button"
                onClick={() => {
                  sound.playClick()
                  navigate('/configuracion')
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs bg-[#111b17] hover:bg-[#192822] border border-[#2a453a] text-slate-300 hover:text-amber-300 text-[10px] font-pixel transition-colors cursor-pointer"
                title="Personalizar módulos activos y fechas de corte"
              >
                <Sliders size={10} />
                <span>MÓDULOS</span>
              </button>
            </div>

            {/* Título de la Estación Central */}
            <div>
              <h1 className="font-stencil text-lg sm:text-2xl font-black tracking-wide text-slate-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                {isWorkshopMode
                  ? 'PUENTE DE MANDO Y PRODUCCIÓN'
                  : 'CENTRO DE TESORERÍA Y LIQUIDEZ'}
                {profile?.displayName ? (
                  <span className="text-amber-400"> • {profile.displayName.toUpperCase()}</span>
                ) : null}
              </h1>
              <p className="text-xs text-slate-300 font-pixel mt-1 leading-relaxed max-w-2xl">
                {isWorkshopMode
                  ? `Operación sincronizada${profile?.motoName ? ` con unidad ${profile.motoName}` : ''}. Supervisa liquidez real en bóvedas, flujo neto del corte y saldos pendientes de liquidación.`
                  : 'Control integral de dinero disponible, balance del periodo, distribución de gastos y compromisos próximos.'}
              </p>
            </div>
          </div>

          {/* Barra de Telemetría Temporal del Ciclo Contable */}
          <div className="bg-[#080d0b]/90 border border-[#21382f] rounded-xs p-3 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-pixel">
              <span className="text-slate-400 uppercase tracking-wider">
                AVANCE DEL CICLO CONTABLE ({period.id})
              </span>
              <span className="text-amber-300 font-bold num">
                DÍA {cycleTelemetry.elapsedDays} DE {cycleTelemetry.totalDays} •{' '}
                {cycleTelemetry.remainingDays === 0
                  ? 'CIERRE DE CORTE HOY'
                  : `${cycleTelemetry.remainingDays} DÍAS RESTANTES`}
              </span>
            </div>
            <div className="w-full h-2 bg-[#050807] border border-[#1d3129] rounded-xs overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 via-amber-500 to-amber-300 transition-all duration-500"
                style={{ width: `${cycleTelemetry.pct}%` }}
              />
            </div>
          </div>

          {/* Válvulas Rápidas de Bóvedas Líquidas */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-stencil text-slate-400 uppercase tracking-wider">
              <span>VÁLVULAS DE LIQUIDEZ INMEDIATA (BÓVEDAS ACTIVAS)</span>
              <button
                type="button"
                onClick={() => {
                  sound.playClick()
                  navigate('/cuentas')
                }}
                className="text-cyan-300 hover:text-cyan-200 font-pixel lowercase first-letter:uppercase cursor-pointer"
              >
                Ver todas las bóvedas &rarr;
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {liquidVaults.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    sound.playClick()
                    navigate('/cuentas')
                  }}
                  className="text-left p-2 rounded-xs bg-[#0c1512]/90 hover:bg-[#13221d] border border-[#233b31] hover:border-cyan-600/60 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-pixel text-slate-300 group-hover:text-cyan-200 truncate">
                      {v.name}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  </div>
                  <div
                    className={`text-xs sm:text-sm font-bold num mt-0.5 truncate ${
                      v.balance >= 0 ? 'text-slate-100' : 'text-rose-400'
                    }`}
                  >
                    {formatCOP(v.balance)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ===================================================================
            BAHÍA DERECHA (5 COLS): COLECTOR MAESTRO DE TESORERÍA Y MANDOS DE FORJA
            =================================================================== */}
        <div className="lg:col-span-5 flex flex-col justify-between bg-[#080d0b]/95 border-2 border-[#2d483d] rounded-xs p-4 shadow-inner space-y-3.5">
          {/* Lectura Primaria: Dinero Disponible Real */}
          <div className="p-3 rounded-xs bg-gradient-to-b from-[#11211b] to-[#0a1310] border border-emerald-700/60">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-stencil text-emerald-300 uppercase tracking-wider">
                DINERO LÍQUIDO DISPONIBLE HOY
              </span>
              <PixelSprite name="vault" size={16} />
            </div>
            <div className="text-2xl sm:text-3xl font-bold num text-emerald-400 tracking-tight mt-1">
              {formatCOP(balances.available)}
            </div>
            <div className="mt-1.5 pt-1.5 border-t border-[#1b3329] flex items-center justify-between text-[11px] font-pixel">
              <span className="text-slate-400">Patrimonio neto consolidado:</span>
              <span
                className={`font-bold num ${
                  balances.netWorth >= 0 ? 'text-cyan-300' : 'text-rose-400'
                }`}
              >
                {formatCOP(balances.netWorth)}
              </span>
            </div>
          </div>

          {/* Lectura Secundaria Adaptativa al Perfil */}
          <div className="grid grid-cols-2 gap-2.5">
            {isModuleActive('platforms') ? (
              <div className="p-2.5 rounded-xs bg-[#181209] border border-amber-700/60 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-stencil text-amber-300 uppercase">
                    POR LIQUIDAR (APPS)
                  </span>
                  <Zap size={12} className="text-amber-400" />
                </div>
                <div className="text-base sm:text-lg font-bold num text-amber-300 mt-1 truncate">
                  {formatCOP(balances.platformReceivable)}
                </div>
                {balances.platformReceivable > 0 ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      sound.playClick()
                      triggerButtonSparks(e, 'amber', 14)
                      openQuickModal('loan_repayment', null, {
                        collectionSource: 'platform',
                      })
                    }}
                    className="mt-1.5 w-full py-1 px-2 rounded-xs bg-amber-950 hover:bg-amber-900 border border-amber-500/80 text-[10px] font-pixel font-bold text-amber-200 cursor-pointer transition-colors"
                  >
                    ⚡ COBRAR APPS
                  </button>
                ) : (
                  <span className="text-[10px] font-pixel text-slate-500 mt-1">
                    Liquidado al día
                  </span>
                )}
              </div>
            ) : (
              <div className="p-2.5 rounded-xs bg-[#0e1714] border border-[#233b31] flex flex-col justify-between">
                <span className="text-[9px] font-stencil text-slate-400 uppercase">
                  INGRESOS DEL CORTE
                </span>
                <div className="text-base sm:text-lg font-bold num text-emerald-400 mt-1 truncate">
                  +{formatCOP(summary.income)}
                </div>
                <span className="text-[10px] font-pixel text-slate-400 mt-1">
                  Gastos: <span className="text-rose-400 num">−{formatCOP(summary.expense)}</span>
                </span>
              </div>
            )}

            <div className="p-2.5 rounded-xs bg-[#0e1714] border border-[#233b31] flex flex-col justify-between">
              <span className="text-[9px] font-stencil text-slate-400 uppercase">
                FLUJO NETO DEL CORTE
              </span>
              <div
                className={`text-base sm:text-lg font-bold num mt-1 truncate ${
                  summary.result >= 0 ? 'text-emerald-300' : 'text-rose-400'
                }`}
              >
                {summary.result >= 0 ? '+' : ''}
                {formatCOP(summary.result)}
              </div>
              <span className="text-[10px] font-pixel text-slate-400 mt-1">
                Ritmo diario:{' '}
                <span className="text-amber-300 num">
                  {formatCOP(
                    Math.round(summary.expense / Math.max(1, cycleTelemetry.elapsedDays)),
                  )}
                </span>
              </span>
            </div>
          </div>

          {/* Botonera Táctica Principal del Puente de Mando */}
          <div className="pt-1 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                sound.playClick()
                triggerButtonSparks(e, 'forge', 20)
                openQuickModal()
              }}
              className="flex-1 btn-game btn-game-primary btn-forge-heat py-2.5 px-3 text-xs font-pixel font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-lg"
            >
              <Plus size={15} />
              <span>FORJAR MOVIMIENTO</span>
            </button>

            {isModuleActive('moto') ? (
              <button
                type="button"
                onClick={(e) => {
                  sound.playClick()
                  triggerButtonSparks(e, 'amber', 14)
                  navigate('/taller-moto')
                }}
                className="btn-game btn-game-orange py-2.5 px-3 text-xs font-pixel font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Wrench size={14} />
                <span>BAHÍA MOTO</span>
              </button>
            ) : isPayrollActive ? (
              <button
                type="button"
                onClick={() => {
                  sound.playClick()
                  navigate('/nomina')
                }}
                className="btn-game btn-game-secondary py-2.5 px-3 text-xs font-pixel font-bold flex items-center justify-center gap-1.5 text-emerald-300 cursor-pointer"
              >
                <PixelSprite name="sack" size={14} />
                <span>QUINCENAS</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  sound.playClick()
                  triggerButtonSparks(e, 'cyan', 12)
                  openQuickModal('transfer')
                }}
                className="btn-game btn-game-secondary py-2.5 px-3 text-xs font-pixel font-bold flex items-center justify-center gap-1.5 text-cyan-300 cursor-pointer"
              >
                <ArrowLeftRight size={14} />
                <span>TRANSFERIR</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
