import React, { useState, useMemo } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  RefreshCw,
  Menu,
  X,
  Database,
  CloudOff,
  LogOut,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useForja } from '../../context/ForjaContext'
import { PeriodNavigator } from '../common/PeriodNavigator'
import { QuickTransactionModal } from '../forms/QuickTransactionModal'
import { TransactionDetailModal } from '../forms/TransactionDetailModal'
import { OnboardingModal } from '../common/OnboardingModal'
import { PixelSprite, type PixelSpriteName } from '../common/PixelSprite'
import { ForjaLogo } from '../common/ForjaLogo'
import type { ModuleId } from '../../domain/modules'
import { sound } from '../../services/sound'
import { triggerButtonSparks } from '../common/PixelSparks'

interface NavItemConfig {
  to: string
  label: string
  sprite: PixelSpriteName
  moduleId?: ModuleId
}

const ALL_NAV_ITEMS: NavItemConfig[] = [
  { to: '/', label: 'Control', sprite: 'cog' },
  { to: '/movimientos', label: 'Movimientos', sprite: 'ledger' },
  { to: '/cuentas', label: 'Cuentas', sprite: 'vault' },
  { to: '/nomina', label: 'Quincenas', sprite: 'sack', moduleId: 'payroll' },
  { to: '/taller-moto', label: 'Taller Moto', sprite: 'moto', moduleId: 'moto' },
  { to: '/deudas', label: 'Deudas', sprite: 'chain', moduleId: 'debts_loans' },
  { to: '/prestamos', label: 'Préstamos', sprite: 'sack', moduleId: 'debts_loans' },
  { to: '/recurrentes', label: 'Gastos Fijos', sprite: 'calendar', moduleId: 'recurring' },
  { to: '/presupuestos', label: 'Metas', sprite: 'flag', moduleId: 'budgets' },
  { to: '/informes', label: 'Informes', sprite: 'blueprint', moduleId: 'reports' },
  { to: '/configuracion', label: 'Ajustes', sprite: 'lever' },
]

export const AppLayout: React.FC = () => {
  const { user, signOut } = useAuth()
  const { isDemoMode, isSyncing, refreshData, openQuickModal, isModuleActive } = useForja()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const visibleNavItems = useMemo(
    () => ALL_NAV_ITEMS.filter((item) => !item.moduleId || isModuleActive(item.moduleId)),
    [isModuleActive]
  )

  return (
    <div className="min-h-screen bg-[#0e1210] text-slate-100 flex flex-col md:flex-row pb-20 md:pb-0 font-sans">
      {/* SIDEBAR DE ESCRITORIO (Panel de consola industrial) */}
      <aside className="hidden md:flex flex-col w-64 bg-[#111714] border-r border-[#263c34] shrink-0 sticky top-0 h-screen overflow-y-auto shadow-2xl z-30">
        {/* Encabezado e Identidad FORJA II con wordmark oficial */}
        <div className="p-3.5 border-b border-[#233a33] bg-[#141f1a] flex flex-col items-center justify-center">
          <ForjaLogo variant="compact" />

          {/* Placa de telemetría de sincronización */}
          <div className="mt-3 flex items-center justify-between bg-[#0b1210] border border-[#233a33] rounded-sm px-2.5 py-1.5 text-[11px]">
            <div className="flex items-center gap-2">
              <span className={isDemoMode ? 'led-pilot led-pilot-amber' : 'led-pilot led-pilot-online'} />
              {isDemoMode ? (
                <div className="flex items-center gap-1 text-amber-300 font-stencil text-[9px]">
                  <CloudOff size={11} />
                  <span>MODO SIMULACIÓN</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-emerald-300 font-stencil text-[9px]">
                  <Database size={11} />
                  <span>SUPABASE CONECTADO</span>
                </div>
              )}
            </div>
            <button
              onClick={(e) => {
                sound.playClick()
                triggerButtonSparks(e, 'cyan', 8)
                refreshData()
              }}
              disabled={isSyncing}
              title="Sincronizar telemetría"
              className="text-slate-400 hover:text-emerald-400 transition-colors p-0.5 cursor-pointer"
            >
              <RefreshCw size={12} className={isSyncing ? 'animate-spin text-emerald-400' : ''} />
            </button>
          </div>
        </div>

        {/* Pulsador Principal FORJAR MOVIMIENTO (Estilo arcade / botón de máquina con calor y chispas) */}
        <div className="p-3 bg-[#111714]">
          <button
            onClick={(e) => {
              sound.playClick()
              triggerButtonSparks(e, 'forge', 20)
              openQuickModal()
            }}
            className="w-full btn-game btn-game-primary btn-forge-heat py-3 text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg"
          >
            <PixelSprite name="tools" size={16} />
            <span>FORJAR MOVIMIENTO</span>
          </button>
        </div>

        {/* Enlaces de Navegación con luces piloto y sonidos mecánicos */}
        <nav className="flex-1 px-3 py-2 space-y-1">
          {visibleNavItems.map((item) => {
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => sound.playClick()}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-sm text-xs font-pixel transition-all ${
                    isActive
                      ? 'bg-[#182822] text-emerald-300 border-l-4 border-l-emerald-400 border border-[#27443a] shadow-inner font-bold'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-[#14201b] border border-transparent'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-2.5">
                      <PixelSprite name={item.sprite} size={18} />
                      <span className="font-pixel text-[13px] tracking-wide">{item.label}</span>
                    </div>
                    {isActive && <span className="led-pilot led-pilot-online" />}
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Identidad de usuario y control de cierre de sesión */}
        <div className="p-3 border-t border-[#233a33] bg-[#0c1412] text-[10px]">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="led-pilot led-pilot-online shrink-0" />
              <span className="truncate text-slate-300 font-mono text-[10px]" title={user?.email || 'Propietario'}>
                {user?.email || 'Propietario'}
              </span>
            </div>
            <button
              onClick={() => {
                sound.playClick()
                signOut()
              }}
              title="Cerrar taller / Salir"
              className="text-amber-400 hover:text-rose-400 p-1 cursor-pointer transition-colors flex items-center gap-1 shrink-0 font-pixel"
            >
              <LogOut size={12} />
              <span className="text-[9px]">SALIR</span>
            </button>
          </div>
          <div className="text-[9px] text-slate-500 font-stencil tracking-wider text-center">
            FORJA II • SISTEMA MODULAR
          </div>
        </div>
      </aside>

      {/* CABECERA MÓVIL (HUD compacto con nuevo logo FORJA II) */}
      <header className="md:hidden sticky top-0 z-40 bg-[#111714]/95 backdrop-blur-md border-b-2 border-[#233a33] px-3.5 py-2 flex items-center justify-between shadow-lg">
        <ForjaLogo variant="compact" />

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => refreshData()}
            disabled={isSyncing}
            className="p-1.5 text-slate-400 hover:text-emerald-400 cursor-pointer"
            title="Refrescar"
          >
            <RefreshCw size={15} className={isSyncing ? 'animate-spin text-emerald-400' : ''} />
          </button>
          <button
            onClick={() => {
              sound.playClick()
              signOut()
            }}
            className="p-1.5 text-amber-400/80 hover:text-rose-400 cursor-pointer"
            title="Cerrar taller"
          >
            <LogOut size={16} />
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-slate-300 hover:text-white cursor-pointer"
            aria-label="Abrir menú"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* MENÚ DESPLEGABLE MÓVIL */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[53px] bg-[#0e1210]/98 z-30 p-4 border-b-2 border-[#233a33] overflow-y-auto">
          <div className="mb-4">
            <button
              onClick={() => {
                setMobileMenuOpen(false)
                openQuickModal()
              }}
              className="w-full btn-game btn-game-primary py-3 text-xs font-bold"
            >
              <PixelSprite name="tools" size={16} />
              <span>+ FORJAR MOVIMIENTO</span>
            </button>
          </div>
          <nav className="space-y-1">
            {visibleNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-sm text-sm font-pixel transition-colors ${
                    isActive
                      ? 'bg-[#182822] text-emerald-300 border border-emerald-600/70 font-bold'
                      : 'text-slate-300 hover:bg-[#14201b]'
                  }`
                }
              >
                <PixelSprite name={item.sprite} size={20} />
                <span className="font-pixel text-sm">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Barra superior de telemetría de corte y atajos de forja */}
        <div className="bg-[#111714] border-b border-[#233a33] px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2">
            <PeriodNavigator />
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={(e) => {
                sound.playClick()
                triggerButtonSparks(e, 'emerald', 14)
                openQuickModal('income')
              }}
              className="btn-game btn-game-secondary btn-forge-heat text-xs py-1.5 px-3 text-emerald-400 hover:text-emerald-300 cursor-pointer font-pixel font-bold flex items-center gap-1.5"
            >
              <PixelSprite name="coins" size={15} />
              <span>+ INGRESO</span>
            </button>
            <button
              onClick={(e) => {
                sound.playClick()
                triggerButtonSparks(e, 'rust', 14)
                openQuickModal('expense')
              }}
              className="btn-game btn-game-secondary btn-forge-heat text-xs py-1.5 px-3 text-rose-400 hover:text-rose-300 cursor-pointer font-pixel font-bold flex items-center gap-1.5"
            >
              <PixelSprite name="jerrycan" size={15} />
              <span>+ GASTO</span>
            </button>
            {isModuleActive('debts_loans') && (
              <button
                onClick={(e) => {
                  sound.playClick()
                  triggerButtonSparks(e, 'amber', 14)
                  openQuickModal('debt_payment')
                }}
                className="btn-game btn-game-secondary btn-forge-heat text-xs py-1.5 px-3 text-amber-400 hover:text-amber-300 cursor-pointer font-pixel font-bold flex items-center gap-1.5"
              >
                <PixelSprite name="chain" size={15} />
                <span>PAGO DEUDA</span>
              </button>
            )}
          </div>
        </div>

        {/* Vista activa — Ancho amplio eficiente para pantallas de 1440px a 1700px */}
        <div className="flex-1 p-3.5 sm:p-5 lg:p-6 w-full max-w-[1720px] mx-auto">
          <Outlet />
        </div>
      </main>

      {/* BARRA DE NAVEGACIÓN INFERIOR (MÓVIL HUD ADAPTABLE) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#111714]/98 backdrop-blur-md border-t-2 border-[#233a33] z-40 px-2 py-1.5 flex items-center justify-around shadow-2xl">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex flex-col items-center py-1 px-2 text-[10px] ${
              isActive ? 'text-emerald-400 font-bold' : 'text-slate-400'
            }`
          }
        >
          <PixelSprite name="cog" size={18} />
          <span className="font-stencil mt-0.5">Control</span>
        </NavLink>
        <NavLink
          to="/movimientos"
          className={({ isActive }) =>
            `flex flex-col items-center py-1 px-2 text-[10px] ${
              isActive ? 'text-emerald-400 font-bold' : 'text-slate-400'
            }`
          }
        >
          <PixelSprite name="ledger" size={18} />
          <span className="font-stencil mt-0.5">Libro</span>
        </NavLink>
        {isModuleActive('payroll') ? (
          <NavLink
            to="/nomina"
            className={({ isActive }) =>
              `flex flex-col items-center py-1 px-2 text-[10px] ${
                isActive ? 'text-emerald-400 font-bold' : 'text-slate-400'
              }`
            }
          >
            <PixelSprite name="sack" size={18} />
            <span className="font-stencil mt-0.5">Quincena</span>
          </NavLink>
        ) : isModuleActive('moto') ? (
          <NavLink
            to="/taller-moto"
            className={({ isActive }) =>
              `flex flex-col items-center py-1 px-2 text-[10px] ${
                isActive ? 'text-emerald-400 font-bold' : 'text-slate-400'
              }`
            }
          >
            <PixelSprite name="moto" size={18} />
            <span className="font-stencil mt-0.5">Moto</span>
          </NavLink>
        ) : (
          <NavLink
            to="/cuentas"
            className={({ isActive }) =>
              `flex flex-col items-center py-1 px-2 text-[10px] ${
                isActive ? 'text-emerald-400 font-bold' : 'text-slate-400'
              }`
            }
          >
            <PixelSprite name="vault" size={18} />
            <span className="font-stencil mt-0.5">Cuentas</span>
          </NavLink>
        )}
        <NavLink
          to={isModuleActive('debts_loans') ? '/deudas' : '/cuentas'}
          className={({ isActive }) =>
            `flex flex-col items-center py-1 px-2 text-[10px] ${
              isActive ? 'text-emerald-400 font-bold' : 'text-slate-400'
            }`
          }
        >
          <PixelSprite name={isModuleActive('debts_loans') ? 'chain' : 'vault'} size={18} />
          <span className="font-stencil mt-0.5">{isModuleActive('debts_loans') ? 'Deudas' : 'Cuentas'}</span>
        </NavLink>
        <NavLink
          to="/configuracion"
          className={({ isActive }) =>
            `flex flex-col items-center py-1 px-2 text-[10px] ${
              isActive ? 'text-emerald-400 font-bold' : 'text-slate-400'
            }`
          }
        >
          <PixelSprite name="lever" size={18} />
          <span className="font-stencil mt-0.5">Ajustes</span>
        </NavLink>
      </div>

      {/* MODAL GLOBAL DE MOVIMIENTO & ONBOARDING V2 */}
      <QuickTransactionModal />
      <TransactionDetailModal />
      <OnboardingModal />
    </div>
  )
}
