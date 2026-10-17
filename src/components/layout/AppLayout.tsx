import React, { useState, useEffect, useMemo } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Menu,
  X,
  LogOut,
  ShieldCheck,
  Volume2,
  VolumeX,
  AlertTriangle,
  RefreshCw,
  Sliders,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useForja } from '../../context/ForjaContext'
import type { ModuleId } from '../../domain/modules'
import { QuickTransactionModal } from '../forms/QuickTransactionModal'
import { TransactionDetailModal } from '../forms/TransactionDetailModal'
import { OnboardingModal } from '../common/OnboardingModal'
import { ForjaLogo } from '../common/ForjaLogo'
import { PixelSprite, type PixelSpriteName } from '../common/PixelSprite'
import { sound } from '../../services/sound'
import { triggerButtonSparks } from '../common/PixelSparks'

interface NavStationItem {
  to: string
  label: string
  shortLabel: string
  sprite: PixelSpriteName
  moduleId?: ModuleId
  group: 'core' | 'operations' | 'obligations' | 'system'
}

const ALL_STATIONS: NavStationItem[] = [
  { to: '/', label: 'Estación Central', shortLabel: 'Taller', sprite: 'anvil', group: 'core' },
  { to: '/movimientos', label: 'Libro de Movimientos', shortLabel: 'Libro', sprite: 'conveyor', group: 'core' },
  { to: '/cuentas', label: 'Bóvedas y Liquidez', shortLabel: 'Bóvedas', sprite: 'vault', group: 'core' },
  { to: '/nomina', label: 'Nómina y Quincenas', shortLabel: 'Nómina', sprite: 'sack', moduleId: 'payroll', group: 'operations' },
  { to: '/taller-moto', label: 'Bahía de Motocicleta', shortLabel: 'Moto', sprite: 'moto', moduleId: 'moto', group: 'operations' },
  { to: '/deudas', label: 'Pasivos y Deudas', shortLabel: 'Deudas', sprite: 'chain', moduleId: 'debts_loans', group: 'obligations' },
  { to: '/prestamos', label: 'Cuentas por Cobrar', shortLabel: 'Cobros', sprite: 'ingot', moduleId: 'debts_loans', group: 'obligations' },
  { to: '/recurrentes', label: 'Compromisos Fijos', shortLabel: 'Fijos', sprite: 'calendar', moduleId: 'recurring', group: 'obligations' },
  { to: '/presupuestos', label: 'Presupuestos y Metas', shortLabel: 'Metas', sprite: 'blueprint', moduleId: 'budgets', group: 'obligations' },
  { to: '/informes', label: 'Telemetría e Informes', shortLabel: 'Informes', sprite: 'gauge', moduleId: 'reports', group: 'system' },
  { to: '/configuracion', label: 'Módulos y Ajustes', shortLabel: 'Ajustes', sprite: 'wrench', group: 'system' },
]

const GROUP_TITLES: Record<NavStationItem['group'], string> = {
  core: 'NÚCLEO FORJA CORE',
  operations: 'OPERACIÓN Y FLUJO',
  obligations: 'PASIVOS Y METAS',
  system: 'TELEMETRÍA Y SISTEMA',
}

export const AppLayout: React.FC = () => {
  const { user, signOut } = useAuth()
  const {
    period,
    openQuickModal,
    isModuleActive,
    isDemoMode,
    isLoading,
    error,
    refreshData,
  } = useForja()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isMuted, setIsMuted] = useState(() => sound.isMuted())
  const [isRetrying, setIsRetrying] = useState(false)
  const location = useLocation()

  useEffect(() => {
    return sound.subscribeMuteChange((muted) => {
      setIsMuted(muted)
    })
  }, [])

  // Cerrar el cajón móvil automáticamente al cambiar de ruta
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  const visibleStations = useMemo(
    () => ALL_STATIONS.filter((item) => !item.moduleId || isModuleActive(item.moduleId)),
    [isModuleActive],
  )

  const groupedStations = useMemo(() => {
    const groups: Array<{ key: NavStationItem['group']; title: string; items: NavStationItem[] }> = [
      { key: 'core', title: GROUP_TITLES.core, items: [] },
      { key: 'operations', title: GROUP_TITLES.operations, items: [] },
      { key: 'obligations', title: GROUP_TITLES.obligations, items: [] },
      { key: 'system', title: GROUP_TITLES.system, items: [] },
    ]
    for (const st of visibleStations) {
      const target = groups.find((g) => g.key === st.group)
      if (target) target.items.push(st)
    }
    return groups.filter((g) => g.items.length > 0)
  }, [visibleStations])

  const activeStation = useMemo(() => {
    return (
      visibleStations.find((item) =>
        item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to),
      ) || visibleStations[0]
    )
  }, [visibleStations, location.pathname])

  // Seleccionar el cuarto slot dinámico de la consola inferior móvil según los módulos activos del usuario
  const fourthMobileStation = useMemo(() => {
    if (isModuleActive('moto')) {
      return visibleStations.find((s) => s.to === '/taller-moto')!
    }
    if (isModuleActive('payroll')) {
      return visibleStations.find((s) => s.to === '/nomina')!
    }
    if (isModuleActive('budgets')) {
      return visibleStations.find((s) => s.to === '/presupuestos')!
    }
    if (isModuleActive('debts_loans')) {
      return visibleStations.find((s) => s.to === '/deudas')!
    }
    return visibleStations.find((s) => s.to === '/configuracion')!
  }, [isModuleActive, visibleStations])

  const isWorkshopMode = isModuleActive('moto') || isModuleActive('platforms')

  const handleToggleSound = () => {
    const next = sound.toggleMuted()
    if (!next) {
      sound.playClick()
    }
  }

  const handleRetryConnection = async () => {
    sound.playClick()
    setIsRetrying(true)
    try {
      await refreshData()
      sound.playConfirm()
    } catch {
      sound.playError()
    } finally {
      setIsRetrying(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#090d0b] text-slate-100">
      {/* Asistente de Configuración Inicial Modular */}
      <OnboardingModal />

      {/* =====================================================================
          TORRE DE CONTROL LATERAL FIJA (ESCRITORIO / 2K / ULTRA-WIDE)
          Permanece anclada al alto completo de la ventana al hacer scroll
          ===================================================================== */}
      <aside
        aria-label="Torre de navegación de estaciones FORJA III"
        className="hidden lg:flex lg:flex-col lg:w-72 2xl:w-80 lg:sticky lg:top-0 lg:h-screen lg:max-h-screen lg:overflow-hidden bg-[#0c1310] border-r-2 border-[#22382f] shrink-0 select-none shadow-2xl z-40"
      >
        {/* Bahía de Identidad FORJA III (Centrada y con Easter Egg Térmico) */}
        <div className="p-3.5 border-b-2 border-[#1f342c] bg-gradient-to-b from-[#15221d] to-[#0c1310] flex flex-col items-center justify-center">
          <ForjaLogo variant="compact" />
          <div className="mt-2 w-full flex items-center justify-between px-2 py-1 rounded-xs bg-[#080d0b] border border-[#1d322a] text-[10px]">
            <span className="inline-flex items-center gap-1.5 font-stencil text-slate-300">
              <span className={`led-pilot ${isWorkshopMode ? 'led-pilot-amber' : 'led-pilot-online'}`} />
              <span>{isWorkshopMode ? 'MODO TALLER' : 'MODO PERSONAL'}</span>
            </span>
            <span className="font-mono text-[10px] text-amber-300/90 font-semibold">
              III • ACTIVO
            </span>
          </div>
        </div>

        {/* Placa de Telemetría del Ciclo Contable */}
        <div className="px-3.5 py-2.5 bg-[#090f0d] border-b border-[#1d322a]">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-stencil uppercase tracking-wider">
            <span>CORTE CONTABLE</span>
            <span className="text-emerald-400 font-mono num">{period.id}</span>
          </div>
          <div className="text-xs font-pixel font-bold num text-amber-300 mt-0.5 truncate">
            {period.label}
          </div>
        </div>

        {/* Rieles de Estaciones Agrupadas */}
        <nav className="flex-1 px-2.5 py-3 space-y-4 overflow-y-auto">
          {groupedStations.map((group) => (
            <div key={group.key} className="space-y-1">
              <div className="px-2 flex items-center justify-between text-[9px] font-stencil text-slate-400 tracking-widest uppercase">
                <span>{group.title}</span>
                <span className="h-px flex-1 ml-2 bg-[#1c3028]" />
              </div>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => sound.playClick()}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2 rounded-xs text-xs transition-all border ${
                      isActive
                        ? 'bg-gradient-to-r from-[#24180b] via-[#192821] to-[#111c17] text-amber-300 border-amber-500/80 shadow-[inset_3px_0_0_#f59e0b,0_2px_6px_rgba(0,0,0,0.45)] font-bold'
                        : 'text-slate-300 hover:bg-[#13201b] hover:text-slate-100 border-transparent hover:border-[#243c32]'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-6 h-6 rounded-xs flex items-center justify-center shrink-0 border ${
                            isActive
                              ? 'bg-[#0b120f] border-amber-500/60'
                              : 'bg-[#090e0c] border-[#1d3028]'
                          }`}
                        >
                          <PixelSprite name={item.sprite} size={15} />
                        </div>
                        <span className="font-pixel tracking-wide truncate">{item.label}</span>
                      </div>
                      <span
                        className={`led-pilot ${
                          isActive ? 'led-pilot-amber' : 'bg-[#1a2923] opacity-40'
                        }`}
                      />
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Zócalo de Operario, Audio y Sesión */}
        <div className="p-3 border-t-2 border-[#1f342c] bg-[#080d0b] space-y-2.5">
          <div className="p-2.5 rounded-xs bg-[#0e1714] border border-[#21382f] space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-pixel font-bold min-w-0">
                <ShieldCheck size={13} className="shrink-0" />
                <span className="truncate">
                  {isDemoMode ? 'MODO SIMULACIÓN LOCAL' : user?.email || 'OPERARIO AUTENTICADO'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleToggleSound}
                aria-label={isMuted ? 'Activar efectos de sonido' : 'Silenciar efectos de sonido'}
                title={isMuted ? 'Sonido silenciado (clic para activar)' : 'Sonido activo (clic para silenciar)'}
                className={`p-1.5 rounded-xs border text-[10px] cursor-pointer transition-colors ${
                  isMuted
                    ? 'bg-[#1a1111] border-rose-900/70 text-rose-400 hover:text-rose-200'
                    : 'bg-[#14241e] border-emerald-800/70 text-amber-300 hover:text-amber-200'
                }`}
              >
                {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <NavLink
                to="/configuracion"
                onClick={() => sound.playClick()}
                className="flex-1 py-1 px-2 rounded-xs bg-[#13221c] hover:bg-[#1a2e26] border border-[#28453a] text-[10px] text-slate-200 font-pixel flex items-center justify-center gap-1 transition-colors"
              >
                <Sliders size={11} className="text-amber-400" />
                <span>MÓDULOS</span>
              </NavLink>
              <button
                type="button"
                onClick={() => {
                  sound.playClick()
                  signOut()
                }}
                className="flex-1 py-1 px-2 rounded-xs bg-[#1c1212] hover:bg-rose-950/70 border border-rose-900/60 text-[10px] text-rose-300 font-pixel flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <LogOut size={11} />
                <span>SALIR</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* =====================================================================
          CUERPO PRINCIPAL Y PUENTE DE MANDO
          ===================================================================== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Cabecera Superior de Telemetría y Forja Rápida */}
        <header className="sticky top-0 z-30 bg-[#0c1411]/95 backdrop-blur-md border-b-2 border-[#21372f] px-3 sm:px-5 py-2.5 flex items-center justify-between gap-2 shadow-lg">
          {/* Izquierda: Identidad en Móvil / Estación Activa en Escritorio */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="lg:hidden shrink-0">
              <ForjaLogo variant="compact" showSubtitle={false} />
            </div>

            <div className="hidden lg:flex items-center gap-2.5 min-w-0">
              <div className="px-2.5 py-1 rounded-xs bg-[#13211c] border border-[#29463b] flex items-center gap-2">
                <PixelSprite name={activeStation.sprite} size={16} />
                <span className="font-stencil text-xs text-amber-300 font-bold tracking-wider uppercase">
                  {activeStation.label}
                </span>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xs bg-[#090e0c] border border-[#1d3129] text-[10px] font-mono">
                <span
                  className={`led-pilot ${
                    error
                      ? 'led-pilot-alert'
                      : isLoading
                        ? 'led-pilot-amber anim-lamp'
                        : 'led-pilot-online'
                  }`}
                />
                <span className={error ? 'text-rose-300' : 'text-slate-300'}>
                  {error
                    ? 'ERROR DE ENLACE'
                    : isLoading
                      ? 'SINCRONIZANDO...'
                      : isDemoMode
                        ? 'OPERACIÓN LOCAL'
                        : 'SUPABASE EN LÍNEA'}
                </span>
              </div>
            </div>
          </div>

          {/* Derecha: Disparadores de Forja Rápida (Escritorio) + Controles Móviles */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Botones de Acción Rápida en Escritorio/Tablet */}
            <div className="hidden md:flex items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  sound.playClick()
                  triggerButtonSparks(e, 'emerald', 14)
                  openQuickModal('income')
                }}
                className="btn-game btn-game-secondary text-xs py-1.5 px-2.5 flex items-center gap-1 text-emerald-300 cursor-pointer"
              >
                <ArrowUpRight size={14} className="text-emerald-400" />
                <span className="font-pixel">+ INGRESO</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  sound.playClick()
                  triggerButtonSparks(e, 'rust', 14)
                  openQuickModal('expense')
                }}
                className="btn-game btn-game-secondary text-xs py-1.5 px-2.5 flex items-center gap-1 text-rose-300 cursor-pointer"
              >
                <ArrowDownRight size={14} className="text-rose-400" />
                <span className="font-pixel">+ GASTO</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  sound.playClick()
                  triggerButtonSparks(e, 'cyan', 12)
                  openQuickModal('transfer')
                }}
                className="btn-game btn-game-secondary text-xs py-1.5 px-2.5 flex items-center gap-1 text-cyan-300 cursor-pointer"
              >
                <ArrowLeftRight size={13} className="text-cyan-400" />
                <span className="font-pixel">TRANSFERIR</span>
              </button>

              {isModuleActive('debts_loans') && (
                <button
                  type="button"
                  onClick={(e) => {
                    sound.playClick()
                    triggerButtonSparks(e, 'amber', 12)
                    openQuickModal('debt_payment')
                  }}
                  className="btn-game btn-game-secondary text-xs py-1.5 px-2.5 hidden xl:flex items-center gap-1 text-amber-300 cursor-pointer"
                >
                  <PixelSprite name="chain" size={13} />
                  <span className="font-pixel">ABONAR DEUDA</span>
                </button>
              )}

              <button
                type="button"
                onClick={(e) => {
                  sound.playClick()
                  triggerButtonSparks(e, 'forge', 18)
                  openQuickModal()
                }}
                className="btn-game btn-game-primary btn-forge-heat text-xs py-1.5 px-3.5 flex items-center gap-1.5 cursor-pointer font-pixel font-bold"
              >
                <Plus size={15} />
                <span>FORJAR MOVIMIENTO</span>
              </button>
            </div>

            {/* Conmutador rápido de sonido (Siempre accesible en cabecera móvil y escritorio) */}
            <button
              type="button"
              onClick={handleToggleSound}
              aria-label={isMuted ? 'Activar efectos de sonido' : 'Silenciar efectos de sonido'}
              title={isMuted ? 'Sonido silenciado (pulsar para activar)' : 'Sonido activo (pulsar para silenciar)'}
              className={`p-2 rounded-xs border transition-colors cursor-pointer ${
                isMuted
                  ? 'bg-[#1b1111] border-rose-900/70 text-rose-400'
                  : 'bg-[#12201b] border-[#29473b] text-amber-300 hover:border-amber-500/60'
              }`}
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>

            {/* Botón de Cajón de Estaciones (Móvil / Tablet) */}
            <button
              type="button"
              onClick={() => {
                sound.playClick()
                setMobileMenuOpen(!mobileMenuOpen)
              }}
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Cerrar selector de estaciones' : 'Abrir selector de estaciones'}
              className="lg:hidden btn-game btn-game-secondary py-1.5 px-2.5 flex items-center gap-1.5 text-xs text-slate-200 cursor-pointer"
            >
              {mobileMenuOpen ? <X size={17} /> : <Menu size={17} />}
              <span className="font-stencil text-[10px] hidden xs:inline">ESTACIONES</span>
            </button>
          </div>
        </header>

        {/* ===================================================================
            CONSOLA TÁCTIL SUPERIOR DE ACCIONES RÁPIDAS (MOBILE-FIRST)
            Permite registrar ingresos, gastos y transferencias con el pulgar
            =================================================================== */}
        <div
          aria-label="Acciones rápidas de forja móvil"
          className="md:hidden bg-[#0a110e] border-b border-[#1f342c] px-2.5 py-2 flex items-center justify-between gap-1.5 overflow-x-auto"
        >
          <button
            type="button"
            onClick={(e) => {
              sound.playClick()
              triggerButtonSparks(e, 'emerald', 12)
              openQuickModal('income')
            }}
            className="flex-1 min-w-[78px] py-1.5 px-2 rounded-xs bg-[#11221b] active:bg-[#183127] border border-emerald-700/70 text-emerald-300 font-pixel font-bold text-[11px] flex items-center justify-center gap-1 shadow-sm cursor-pointer"
          >
            <ArrowUpRight size={13} className="text-emerald-400 shrink-0" />
            <span>+INGRESO</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              sound.playClick()
              triggerButtonSparks(e, 'rust', 12)
              openQuickModal('expense')
            }}
            className="flex-1 min-w-[74px] py-1.5 px-2 rounded-xs bg-[#241311] active:bg-[#331a17] border border-rose-800/70 text-rose-300 font-pixel font-bold text-[11px] flex items-center justify-center gap-1 shadow-sm cursor-pointer"
          >
            <ArrowDownRight size={13} className="text-rose-400 shrink-0" />
            <span>+GASTO</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              sound.playClick()
              triggerButtonSparks(e, 'cyan', 10)
              openQuickModal('transfer')
            }}
            className="flex-1 min-w-[82px] py-1.5 px-2 rounded-xs bg-[#102022] active:bg-[#162d30] border border-cyan-800/70 text-cyan-300 font-pixel font-bold text-[11px] flex items-center justify-center gap-1 shadow-sm cursor-pointer"
          >
            <ArrowLeftRight size={12} className="text-cyan-400 shrink-0" />
            <span>TRANSFERIR</span>
          </button>

          {isModuleActive('debts_loans') && (
            <button
              type="button"
              onClick={(e) => {
                sound.playClick()
                triggerButtonSparks(e, 'amber', 10)
                openQuickModal('debt_payment')
              }}
              className="flex-1 min-w-[74px] py-1.5 px-2 rounded-xs bg-[#23190c] active:bg-[#312310] border border-amber-700/70 text-amber-300 font-pixel font-bold text-[11px] flex items-center justify-center gap-1 shadow-sm cursor-pointer"
            >
              <PixelSprite name="chain" size={12} />
              <span>DEUDA</span>
            </button>
          )}
        </div>

        {/* ===================================================================
            CAJÓN DESPLEGABLE DE ESTACIONES Y SESIÓN (MÓVIL / TABLET)
            =================================================================== */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#0d1613] border-b-2 border-amber-600/60 px-3.5 py-4 space-y-4 z-30 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#1f352d]">
              <div>
                <span className="text-[10px] font-stencil text-amber-300 uppercase tracking-wider block">
                  SELECTOR DE ESTACIONES ACTIVAS
                </span>
                <span className="text-xs font-pixel text-slate-300">
                  Corte activo: <strong className="text-emerald-300">{period.label}</strong>
                </span>
              </div>
              <span className="badge-pixel bg-[#15251f] text-emerald-300 border-emerald-700/70">
                {isWorkshopMode ? 'MODO TALLER' : 'MODO PERSONAL'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {visibleStations.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => {
                    sound.playClick()
                    setMobileMenuOpen(false)
                  }}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2.5 rounded-xs text-xs border transition-all ${
                      isActive
                        ? 'bg-[#23180c] text-amber-300 border-amber-500 font-bold shadow-md'
                        : 'bg-[#090f0d] text-slate-300 border-[#1f342c] hover:border-[#325447]'
                    }`
                  }
                >
                  <PixelSprite name={item.sprite} size={16} />
                  <span className="font-pixel truncate">{item.label}</span>
                </NavLink>
              ))}
            </div>

            <div className="pt-2.5 border-t border-[#1f352d] flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-pixel truncate">
                <ShieldCheck size={14} className="shrink-0" />
                <span className="truncate">{isDemoMode ? 'Simulación local' : user?.email}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  sound.playClick()
                  setMobileMenuOpen(false)
                  signOut()
                }}
                className="btn-game btn-game-danger text-[11px] py-1.5 px-3 flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut size={12} />
                <span>CERRAR SESIÓN</span>
              </button>
            </div>
          </div>
        )}

        {/* ===================================================================
            AVISO REAL DE INTERRUPCIÓN DE RED O ERROR DE SUPABASE (Sección 6.6 / 13)
            =================================================================== */}
        {error && (
          <div
            role="alert"
            className="mx-3 sm:mx-6 mt-3 p-3 rounded-xs bg-[#261111] border-2 border-rose-700/80 text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg"
          >
            <div className="flex items-start gap-2.5 text-xs">
              <AlertTriangle size={17} className="text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-stencil text-[11px] font-bold text-rose-300 uppercase block">
                  INTERRUPCIÓN DE COMUNICACIÓN CON EL SERVIDOR
                </span>
                <p className="font-pixel text-xs text-rose-100 mt-0.5">{error}</p>
              </div>
            </div>
            <button
              type="button"
              disabled={isRetrying}
              onClick={handleRetryConnection}
              className="btn-game btn-game-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 self-end sm:self-center shrink-0 cursor-pointer"
            >
              <RefreshCw size={13} className={isRetrying ? 'animate-spin' : ''} />
              <span className="font-pixel">{isRetrying ? 'RECONECTANDO...' : 'REINTENTAR CONEXIÓN'}</span>
            </button>
          </div>
        )}

        {/* ===================================================================
            ÁREA OPERATIVA DE LA ESTACIÓN ACTIVA (FLUIDA 100% EN ESCRITORIO Y 2K)
            =================================================================== */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6 2xl:p-8 pb-console-safe lg:pb-10 w-full max-w-none">
          <Outlet />
        </main>

        {/* ===================================================================
            CONSOLA INFERIOR TÁCTICA MOBILE-FIRST (ZONA DEL PULGAR)
            4 estaciones clave + Botón Central Elevado "+ FORJAR"
            =================================================================== */}
        <nav
          aria-label="Consola táctil inferior de FORJA III"
          className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0b1310]/98 backdrop-blur-md border-t-2 border-[#2a453a] shadow-[0_-8px_24px_rgba(0,0,0,0.85)] pb-safe"
        >
          <div className="grid grid-cols-5 items-center px-1.5 pt-1">
            {/* Slot 1: Taller Central */}
            <NavLink
              to="/"
              end
              onClick={() => sound.playClick()}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1.5 px-1 rounded-xs transition-colors ${
                  isActive ? 'text-amber-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <PixelSprite name="anvil" size={18} />
                  <span className="text-[10px] font-pixel mt-0.5 leading-tight">Taller</span>
                  <span
                    className={`w-4 h-0.5 mt-0.5 rounded-full ${
                      isActive ? 'bg-amber-400' : 'bg-transparent'
                    }`}
                  />
                </>
              )}
            </NavLink>

            {/* Slot 2: Libro de Movimientos */}
            <NavLink
              to="/movimientos"
              onClick={() => sound.playClick()}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1.5 px-1 rounded-xs transition-colors ${
                  isActive ? 'text-amber-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <PixelSprite name="conveyor" size={18} />
                  <span className="text-[10px] font-pixel mt-0.5 leading-tight">Libro</span>
                  <span
                    className={`w-4 h-0.5 mt-0.5 rounded-full ${
                      isActive ? 'bg-amber-400' : 'bg-transparent'
                    }`}
                  />
                </>
              )}
            </NavLink>

            {/* Slot Central (3): Botón Primario de Yunque "+ FORJAR" */}
            <div className="flex flex-col items-center justify-center -mt-3.5">
              <button
                type="button"
                onClick={(e) => {
                  sound.playClick()
                  triggerButtonSparks(e, 'forge', 18)
                  openQuickModal()
                }}
                aria-label="Forjar nuevo movimiento financiero"
                className="btn-game btn-game-primary btn-forge-heat px-3 py-2 rounded-xs flex flex-col items-center justify-center gap-0.5 shadow-[0_4px_14px_rgba(245,158,11,0.45)] cursor-pointer min-w-[68px]"
              >
                <div className="flex items-center gap-1">
                  <Plus size={14} strokeWidth={3} />
                  <PixelSprite name="tools" size={14} />
                </div>
                <span className="font-stencil text-[9px] font-black tracking-wider leading-none">
                  FORJAR
                </span>
              </button>
            </div>

            {/* Slot 4: Bóvedas y Liquidez */}
            <NavLink
              to="/cuentas"
              onClick={() => sound.playClick()}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1.5 px-1 rounded-xs transition-colors ${
                  isActive ? 'text-amber-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <PixelSprite name="vault" size={18} />
                  <span className="text-[10px] font-pixel mt-0.5 leading-tight">Bóvedas</span>
                  <span
                    className={`w-4 h-0.5 mt-0.5 rounded-full ${
                      isActive ? 'bg-amber-400' : 'bg-transparent'
                    }`}
                  />
                </>
              )}
            </NavLink>

            {/* Slot 5: Estación Adaptativa al Perfil (Moto / Nómina / Metas / Ajustes) */}
            <NavLink
              to={fourthMobileStation.to}
              onClick={() => sound.playClick()}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1.5 px-1 rounded-xs transition-colors ${
                  isActive ? 'text-amber-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <PixelSprite name={fourthMobileStation.sprite} size={18} />
                  <span className="text-[10px] font-pixel mt-0.5 leading-tight truncate max-w-[60px]">
                    {fourthMobileStation.shortLabel}
                  </span>
                  <span
                    className={`w-4 h-0.5 mt-0.5 rounded-full ${
                      isActive ? 'bg-amber-400' : 'bg-transparent'
                    }`}
                  />
                </>
              )}
            </NavLink>
          </div>
        </nav>
      </div>

      {/* Modales Globales de Estación */}
      <QuickTransactionModal />
      <TransactionDetailModal />
    </div>
  )
}
