import React, { useState } from 'react'
import { User, Database, Download, Plus, Check, Volume2, VolumeX, Trash2, RefreshCw, LogOut, Sliders, Calendar } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useForja } from '../context/ForjaContext'
import { downloadFile, exportTransactionsToCSV } from '../services/exportImport'
import { isSupabaseConfigured } from '../services/supabase'
import type { CategoryKind, FinancialCycleType } from '../domain/types'
import {
  MODULE_REGISTRY,
  PERSONAL_PRESET_MODULES,
  WORKSHOP_PRESET_MODULES,
  canDisableModule,
  type ModuleId,
} from '../domain/modules'
import { PixelSprite, type PixelSpriteName } from '../components/common/PixelSprite'
import { sound } from '../services/sound'
import { triggerPixelSparks } from '../components/common/PixelSparks'

export const SettingsPage: React.FC = () => {
  const { user, signOut } = useAuth()
  const {
    preferences,
    updatePreferences,
    isModuleActive,
    toggleModule,
    period,
    profile,
    updateProfile,
    isDemoMode,
    toggleDemoMode,
    resetFactoryData,
    categories,
    saveCategory,
    deleteCategory,
    accounts,
    debts,
    loans,
    transactions,
    recurring,
    occurrences,
    motoLogs,
    motoMaintenance,
    budgets,
    goals,
    index,
  } = useForja()

  // Perfil
  const [displayName, setDisplayName] = useState(profile?.displayName || '')
  const [motoName, setMotoName] = useState(profile?.motoName || '')
  const [motoOdometer, setMotoOdometer] = useState(profile?.motoInitialOdometer || 0)
  const [profileSaved, setProfileSaved] = useState(false)

  // Configuración de ciclo financiero
  const [cycleType, setCycleType] = useState<FinancialCycleType>(
    preferences.cycleConfig?.type || 'custom_cut'
  )
  const [cutStartDay, setCutStartDay] = useState<number>(
    preferences.cycleConfig?.cutStartDay || 11
  )
  const [cycleSaved, setCycleSaved] = useState(false)

  // Audio settings
  const [isMuted, setIsMuted] = useState(() => sound.isMuted())
  const [volume, setVolume] = useState(() => Math.round(sound.getVolume() * 100))

  // Categoría nueva
  const [newCatName, setNewCatName] = useState('')
  const [newCatKind, setNewCatKind] = useState<CategoryKind>('expense')
  const [newCatMoto, setNewCatMoto] = useState(false)

  const handleToggleMute = () => {
    const nextMuted = !isMuted
    sound.setMuted(nextMuted)
    setIsMuted(nextMuted)
    if (!nextMuted) {
      sound.playClick()
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value)
    setVolume(val)
    sound.setVolume(val / 100)
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await updateProfile({
        displayName: displayName.trim(),
        motoName: motoName.trim() || null,
        motoInitialOdometer: motoOdometer > 0 ? motoOdometer : null,
      })
      sound.playConfirm()
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 2500)
    } catch (err) {
      sound.playError()
      alert((err as Error).message)
    }
  }

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCatName.trim()) return
    try {
      await saveCategory({
        name: newCatName.trim(),
        kind: newCatKind,
        icon: newCatMoto ? 'bike' : 'tag',
        color: '#34d399',
        isMoto: newCatMoto,
        systemKey: null,
        isArchived: false,
        sortOrder: categories.length + 1,
      })
      sound.playConfirm()
      setNewCatName('')
      setNewCatMoto(false)
    } catch (err) {
      sound.playError()
      alert((err as Error).message)
    }
  }

  const handleDeleteCategory = async (id: string, name: string) => {
    sound.playClick()
    if (window.confirm(`¿Confirmas eliminar la categoría «${name}»?`)) {
      try {
        await deleteCategory(id)
        sound.playConfirm()
      } catch (err) {
        sound.playError()
        alert((err as Error).message)
      }
    }
  }

  const handleResetFactory = async () => {
    sound.playClick()
    if (
      window.confirm(
        '¿Confirmas restablecer todos los datos del taller a los valores de fábrica? Se perderán las modificaciones locales no exportadas.',
      )
    ) {
      try {
        await resetFactoryData()
        sound.playConfirm()
        alert('Datos de fábrica restaurados con éxito.')
      } catch (err) {
        sound.playError()
        alert((err as Error).message)
      }
    }
  }

  const handleExportJSON = () => {
    sound.playClick()
    const backup = {
      version: 2,
      exportedAt: new Date().toISOString(),
      profile,
      accounts,
      categories,
      debts,
      loans,
      transactions,
      recurring,
      occurrences,
      motoLogs,
      motoMaintenance,
      budgets,
      goals,
    }
    const jsonStr = JSON.stringify(backup, null, 2)
    downloadFile(jsonStr, `forja-copia-seguridad-${new Date().toISOString().split('T')[0]}.json`, 'application/json')
  }

  const handleExportCSV = () => {
    sound.playClick()
    const csv = exportTransactionsToCSV(transactions, index)
    downloadFile(csv, `forja-todos-movimientos.csv`, 'text/csv;charset=utf-8')
  }

  const handleToggleModuleAction = async (modId: ModuleId) => {
    const active = isModuleActive(modId)
    if (active) {
      const check = canDisableModule(modId, preferences.enabledModules)
      if (!check.allowed) {
        sound.playError()
        alert(check.reason)
        return
      }
    }
    sound.playClick()
    await toggleModule(modId, !active)
  }

  const handleApplyPreset = async (preset: 'workshop' | 'personal') => {
    sound.playConfirm()
    if (preset === 'workshop') {
      await updatePreferences({
        enabledModules: [...WORKSHOP_PRESET_MODULES],
        cycleConfig: {
          type: 'custom_cut',
          cutStartDay: 11,
        },
      })
      setCycleType('custom_cut')
      setCutStartDay(11)
    } else {
      await updatePreferences({
        enabledModules: [...PERSONAL_PRESET_MODULES],
        cycleConfig: {
          type: 'calendar_month',
          cutStartDay: 1,
        },
      })
      setCycleType('calendar_month')
    }
  }

  const handleSaveCycle = async (e: React.FormEvent) => {
    e.preventDefault()
    sound.playConfirm()
    await updatePreferences({
      cycleConfig: {
        type: cycleType,
        cutStartDay: cycleType === 'custom_cut' ? Number(cutStartDay) || 11 : 1,
      },
    })
    setCycleSaved(true)
    setTimeout(() => setCycleSaved(false), 2500)
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Cabecera del Centro de Ajustes */}
      <div className="forge-machine-panel rivet-corners p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-[#101d18] border border-emerald-800/80 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
            <PixelSprite name="wrench" size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="led-pilot led-pilot-online"></span>
              <h2 className="font-pixel text-lg sm:text-xl font-bold text-emerald-400 tracking-wider">
                TERMINAL DE CONFIGURACIÓN Y TALLER
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Personalización de módulos V2, ciclos contables, operario, sonido y respaldo
            </p>
          </div>
        </div>
      </div>

      {/* SECCIÓN V2: PERSONALIZAR MI FORJA — GESTOR DE MÓDULOS */}
      <div className="forge-machine-panel rivet-corners p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#213731] pb-3">
          <div className="flex items-center gap-2.5">
            <Sliders size={18} className="text-emerald-400" />
            <div>
              <h3 className="font-stencil text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-wide">
                PERSONALIZAR MI FORJA — GESTOR DE MÓDULOS
              </h3>
              <p className="text-[11px] text-slate-400 font-pixel">
                Enciende o apaga capacidades según tu actividad. El núcleo financiero siempre permanece activo.
              </p>
            </div>
          </div>

          {/* Preajustes rápidos */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleApplyPreset('personal')}
              className="btn-game btn-game-secondary text-[11px] py-1 px-2.5 text-emerald-300 font-bold"
              title="Activar Nómina, Presupuestos, Recurrentes y desactivar Moto/Plataformas"
            >
              PREAJUSTE PERSONAL
            </button>
            <button
              onClick={() => handleApplyPreset('workshop')}
              className="btn-game btn-game-secondary text-[11px] py-1 px-2.5 text-amber-300 font-bold"
              title="Activar Moto, Plataformas, Taller y corte 11 al 10"
            >
              PREAJUSTE TALLER
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(Object.keys(MODULE_REGISTRY) as ModuleId[]).map((modId) => {
            const mod = MODULE_REGISTRY[modId]
            const active = isModuleActive(modId)
            const disableCheck = active ? canDisableModule(modId, preferences.enabledModules) : { allowed: true }

            return (
              <div
                key={modId}
                className={`p-3.5 rounded-sm border transition-all flex flex-col justify-between ${
                  active
                    ? 'bg-[#12201a] border-emerald-600/70 shadow-sm'
                    : 'bg-[#0a0f0d] border-[#1b2b24] opacity-75'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-[#1b2e26]">
                    <div className="flex items-center gap-2 min-w-0">
                      <PixelSprite name={(mod.iconName as PixelSpriteName) || 'cog'} size={18} />
                      <span className="font-pixel text-xs font-bold text-slate-100 truncate">
                        {mod.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={active ? 'led-pilot led-pilot-online' : 'led-pilot led-pilot-amber'} />
                      <span
                        className={`text-[9px] font-stencil uppercase tracking-wider px-1.5 py-0.5 rounded-xs ${
                          active
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-slate-900 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {active ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300 font-pixel leading-snug mb-2">
                    {mod.description}
                  </p>

                  <div className="text-[10px] text-slate-400 space-y-0.5 font-mono">
                    <span className="text-slate-500 block uppercase">Habilita:</span>
                    <span className="text-emerald-400/90 block truncate">
                      {mod.tagline}
                    </span>
                  </div>

                  {mod.dependencies.length > 0 && (
                    <div className="mt-2 text-[10px] text-amber-400/90 font-mono">
                      Requiere: {mod.dependencies.map((d) => MODULE_REGISTRY[d].name).join(', ')}
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-2.5 border-t border-[#1a2d24] flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-pixel">
                    {active ? 'Listo en navegación' : 'Oculto en interfaz'}
                  </span>

                  <button
                    onClick={() => handleToggleModuleAction(modId)}
                    disabled={active && !disableCheck.allowed}
                    className={`btn-game text-xs py-1 px-3 font-pixel font-bold cursor-pointer ${
                      active
                        ? 'btn-game-secondary text-rose-300 hover:text-rose-200'
                        : 'btn-game-primary text-slate-900'
                    }`}
                  >
                    {active ? 'DESACTIVAR' : 'ACTIVAR'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="p-3 rounded-sm bg-[#0a1210] border border-[#1e342c] text-[11px] text-slate-400 font-pixel">
          <strong className="text-emerald-300">Garantía de no pérdida:</strong> Desactivar un módulo solo oculta
          sus paneles y accesos directos. Tus transacciones, kilómetros, registros y balances históricos continúan
          guardados en Supabase. Si reactivas el módulo, toda tu información reaparece intacta.
        </div>
      </div>

      {/* SECCIÓN V2: CICLO FINANCIERO Y FECHAS DE CORTE */}
      <div className="forge-machine-panel rivet-corners p-5 space-y-4">
        <div className="flex items-center gap-2.5 border-b border-[#213731] pb-3">
          <Calendar size={18} className="text-sky-400" />
          <div>
            <h3 className="font-stencil text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-wide">
              CICLO FINANCIERO Y CORTE CONTABLE PERSONALIZADO
            </h3>
            <p className="text-[11px] text-slate-400 font-pixel">
              Define cómo agrupa FORJA tus ingresos, gastos y presupuestos mensuales.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveCycle} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="field-label">Tipo de ciclo contable</label>
              <select
                value={cycleType}
                onChange={(e) => setCycleType(e.target.value as FinancialCycleType)}
                className="field"
              >
                <option value="custom_cut">Corte personalizado (Empieza un día fijo del mes)</option>
                <option value="calendar_month">Mes calendario natural (Día 1 al último día)</option>
              </select>
            </div>

            {cycleType === 'custom_cut' && (
              <div>
                <label className="field-label">Día de inicio del corte mensual (1 al 31)</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={cutStartDay}
                  onChange={(e) => setCutStartDay(Number(e.target.value))}
                  className="field"
                  required
                />
                <span className="text-[10px] text-slate-400 font-pixel mt-1 block">
                  Ej. 11 genera cortes del 11 al 10 del mes siguiente (ciclo tradicional de Alejo).
                </span>
              </div>
            )}
          </div>

          <div className="p-3 bg-[#0a1210] border border-[#1e342c] rounded-sm flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 font-pixel block text-[11px]">Periodo activo actual:</span>
              <span className="text-emerald-300 font-stencil text-sm font-bold">{period.label}</span>
            </div>
            <span className="badge-pixel bg-[#14261f] text-emerald-400 border-[#234235] text-[10px]">
              ID: {period.id}
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-1 border-t border-[#1a2d26]">
            {cycleSaved && (
              <span className="text-emerald-400 text-xs flex items-center gap-1 font-pixel font-bold">
                <Check size={14} /> CICLO ACTUALIZADO CON ÉXITO
              </span>
            )}
            <button type="submit" className="btn-game btn-game-primary text-xs py-2 px-4 font-pixel font-bold">
              GUARDAR CONFIGURACIÓN DE CICLO
            </button>
          </div>
        </form>
      </div>

      {/* 1. RETROALIMENTACIÓN AUDITIVE Y SENSACIÓN TÁCTIL */}
      <div className="forge-machine-panel rivet-corners p-5">
        <h3 className="font-pixel text-xs tracking-wider text-slate-300 mb-3 border-b border-[#213731] pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isMuted ? <VolumeX size={15} className="text-rose-400" /> : <Volume2 size={15} className="text-amber-400" />}
            <span>RETROALIMENTACIÓN SONORA MECÁNICA (WEB AUDIO)</span>
          </div>
          <span className="text-slate-500 font-mono text-[10px]">SÍNTESIS EN TIEMPO REAL</span>
        </h3>

        <div className="space-y-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-[#0a100e] p-3.5 rounded border border-[#1e342c]">
            <div>
              <span className="font-pixel font-bold text-slate-200 block">Efectos de interruptores y maquinaria</span>
              <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                Sonidos sintetizados localmente: clics de microswitches, enganches metálicos y monedas de latón.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleToggleMute}
                className={`btn-game text-xs py-1.5 px-3 font-pixel tracking-wider ${
                  isMuted ? 'btn-game-secondary' : 'btn-game-primary'
                }`}
              >
                {isMuted ? 'SILENCIADO' : 'SONIDO ACTIVO'}
              </button>
            </div>
          </div>

          {!isMuted && (
            <div className="bg-[#0a100e] p-3.5 rounded border border-[#1e342c] space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-pixel font-bold text-[11px] uppercase tracking-wider">
                  VOLUMEN GENERAL: {volume}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-44 accent-amber-400 cursor-pointer"
                />
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-pixel uppercase tracking-wider block mb-2">
                  BANCO DE PRUEBA DE EFECTOS SONOROS:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => sound.playClick()}
                    className="btn-game btn-game-secondary text-[11px] py-1 px-2.5 font-pixel cursor-pointer"
                  >
                    CLIC INTERRUPTOR
                  </button>
                  <button
                    type="button"
                    onClick={() => sound.playConfirm()}
                    className="btn-game btn-game-secondary text-[11px] py-1 px-2.5 font-pixel cursor-pointer"
                  >
                    ENGANCHE METÁLICO
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                      sound.playIncome()
                      triggerPixelSparks(rect.x + rect.width / 2, rect.y, 'amber', 14)
                    }}
                    className="btn-game btn-game-primary text-[11px] py-1 px-2.5 font-pixel font-bold cursor-pointer"
                  >
                    INGRESO (COBRE/LATÓN)
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                      sound.playExpense()
                      triggerPixelSparks(rect.x + rect.width / 2, rect.y, 'rust', 14)
                    }}
                    className="btn-game btn-game-secondary text-[11px] py-1 px-2.5 font-pixel text-rose-300 cursor-pointer"
                  >
                    GASTO (PRENSA/ÓXIDO)
                  </button>
                  <button
                    type="button"
                    onClick={() => sound.playError()}
                    className="btn-game btn-game-secondary text-[11px] py-1 px-2.5 font-pixel text-slate-400 cursor-pointer"
                  >
                    AVISO DE ADVERTENCIA
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. PERFIL Y MOTO */}
      <div className="forge-machine-panel rivet-corners p-5">
        <h3 className="font-pixel text-xs tracking-wider text-slate-300 mb-3 border-b border-[#213731] pb-2 flex items-center gap-2">
          <User size={15} className="text-emerald-400" />
          <span>PARÁMETROS DEL OPERARIO Y VEHÍCULO</span>
        </h3>

        <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 font-pixel text-[11px] mb-1 font-bold uppercase tracking-wider">
                NOMBRE O IDENTIFICADOR
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ej. Juan"
                className="w-full bg-[#070c0a] border border-[#273e34] focus:border-[#d97706] focus:outline-none rounded-xs p-2 text-slate-100 font-pixel text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-pixel text-[11px] mb-1 font-bold uppercase tracking-wider">
                MODELO DE LA MOTOCICLETA
              </label>
              <input
                type="text"
                value={motoName}
                onChange={(e) => setMotoName(e.target.value)}
                placeholder="Ej. Gixxer 150 FI / Boxer CT100"
                className="w-full bg-[#070c0a] border border-[#273e34] focus:border-[#d97706] focus:outline-none rounded-xs p-2 text-slate-100 font-pixel text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-pixel text-[11px] mb-1 font-bold uppercase tracking-wider">
                ODÓMETRO BASE (KM INICIAL)
              </label>
              <input
                type="number"
                value={motoOdometer}
                onChange={(e) => setMotoOdometer(Number(e.target.value))}
                className="w-full bg-[#070c0a] border border-[#273e34] focus:border-[#d97706] focus:outline-none rounded-xs p-2 text-slate-100 font-mono text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#1a2d26]">
            {profileSaved && (
              <span className="text-emerald-400 text-xs flex items-center gap-1 font-pixel font-bold">
                <Check size={14} /> PARÁMETROS GUARDADOS CON ÉXITO
              </span>
            )}
            <button type="submit" className="btn-game btn-game-primary text-xs py-2 px-4 font-pixel font-bold">
              GUARDAR PARÁMETROS
            </button>
          </div>
        </form>
      </div>

      {/* 3. GESTIÓN DE CATEGORÍAS */}
      <div className="forge-machine-panel rivet-corners p-5">
        <h3 className="font-pixel text-xs tracking-wider text-slate-300 mb-3 border-b border-[#213731] pb-2 flex items-center justify-between">
          <span>CATÁLOGO DE CATEGORÍAS ({categories.length})</span>
          <span className="text-slate-500 font-mono text-[10px]">MÓDULO DE CLASIFICACIÓN</span>
        </h3>

        <form onSubmit={handleCreateCategory} className="flex flex-wrap items-end gap-3 mb-4 text-xs">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-slate-400 font-pixel text-[11px] mb-1 font-bold uppercase tracking-wider">
              NUEVA CATEGORÍA
            </label>
            <input
              type="text"
              placeholder="Ej. Mensajería expresa / Lavado y lubricación"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="w-full bg-[#070c0a] border border-[#273e34] focus:border-[#d97706] focus:outline-none rounded-xs p-2 text-slate-100 font-pixel text-xs"
            />
          </div>
          <div>
            <label className="block text-slate-400 font-pixel text-[11px] mb-1 font-bold uppercase tracking-wider">
              TIPO
            </label>
            <select
              value={newCatKind}
              onChange={(e) => setNewCatKind(e.target.value as CategoryKind)}
              className="bg-[#070c0a] border border-[#273e34] focus:border-[#d97706] focus:outline-none rounded-xs p-2 text-slate-100 font-pixel text-xs"
            >
              <option value="expense">Gasto operativo</option>
              <option value="income">Ingreso de producción</option>
            </select>
          </div>
          <div className="flex items-center gap-2 pb-2">
            <input
              type="checkbox"
              id="cat-moto"
              checked={newCatMoto}
              onChange={(e) => setNewCatMoto(e.target.checked)}
              className="rounded bg-[#080d0c] border-[#213731] text-emerald-500"
            />
            <label htmlFor="cat-moto" className="text-slate-300 cursor-pointer text-xs flex items-center gap-1.5 font-pixel">
              <PixelSprite name="moto" size={14} />
              <span>¿VINCULADO A MOTO?</span>
            </label>
          </div>
          <button type="submit" className="btn-game btn-game-primary text-xs py-2 px-3.5 flex items-center gap-1.5 font-pixel font-bold">
            <Plus size={14} />
            <span>AGREGAR</span>
          </button>
        </form>

        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
          {categories.map((c) => (
            <span
              key={c.id}
              className={`badge-pixel text-[10px] px-2.5 py-1 flex items-center gap-1.5 ${
                c.kind === 'income'
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                  : 'bg-rose-950/80 text-rose-300 border-rose-800'
              }`}
            >
              {c.isMoto && <PixelSprite name="moto" size={12} />}
              <span>{c.name}</span>
              {!c.systemKey && (
                <button
                  type="button"
                  onClick={() => handleDeleteCategory(c.id, c.name)}
                  className="ml-1 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                  title="Eliminar categoría"
                  aria-label="Eliminar categoría"
                >
                  <Trash2 size={11} />
                </button>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* 4. COPIAS DE SEGURIDAD Y RESTABLECIMIENTO */}
      <div className="forge-machine-panel rivet-corners p-5">
        <h3 className="font-pixel text-xs tracking-wider text-slate-300 mb-3 border-b border-[#213731] pb-2 flex items-center gap-2">
          <Download size={15} className="text-cyan-400" />
          <span>COPIAS DE SEGURIDAD Y MANTENIMIENTO DE BASE DE DATOS</span>
        </h3>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExportJSON}
            className="btn-game btn-game-secondary text-xs py-2 px-3.5 flex items-center gap-2"
          >
            <Download size={15} />
            <span className="font-pixel">DESCARGAR COPIA COMPLETA (JSON)</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="btn-game btn-game-secondary text-xs py-2 px-3.5 flex items-center gap-2"
          >
            <Download size={15} />
            <span className="font-pixel">EXPORTAR MOVIMIENTOS (CSV)</span>
          </button>
          <button
            onClick={handleResetFactory}
            className="btn-game btn-game-secondary text-xs py-2 px-3.5 flex items-center gap-2 text-amber-300 hover:text-amber-200"
          >
            <RefreshCw size={14} />
            <span className="font-pixel">RESTAURAR DATOS DE DEMOSTRACIÓN DE FÁBRICA</span>
          </button>
        </div>
        <p className="text-[11px] text-slate-400 mt-2 font-mono">
          El archivo JSON preserva el estado completo: cuentas, deudas, préstamos, bitácora de moto, cuotas y catálogo.
        </p>
      </div>

      {/* 5. CONEXIÓN SUPABASE / MODO DEMO */}
      <div className="forge-machine-panel rivet-corners p-5">
        <div className="flex items-start justify-between gap-3 mb-3 border-b border-[#213731] pb-2">
          <div>
            <h3 className="font-pixel text-xs tracking-wider text-slate-300 flex items-center gap-2">
              <Database size={15} className="text-emerald-400" />
              <span>TERMINAL DE CONEXIÓN A BASE DE DATOS</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
              <span className={`led-pilot ${isSupabaseConfigured ? 'led-pilot-online' : 'led-pilot-amber'}`}></span>
              <span>
                Estado:{' '}
                {isSupabaseConfigured ? (
                  <span className="text-emerald-400 font-bold">Credenciales detectadas en entorno (.env)</span>
                ) : (
                  <span className="text-amber-400 font-bold">Persistencia local persistente activa (localStorage)</span>
                )}
              </span>
            </p>
          </div>

          <button
            onClick={toggleDemoMode}
            className={`btn-game text-xs py-1.5 px-3 font-pixel tracking-wider ${
              isDemoMode ? 'btn-game-orange' : 'btn-game-primary'
            }`}
          >
            {isDemoMode ? 'MODO DEMOSTRACIÓN' : 'MODO PRODUCCIÓN'}
          </button>
        </div>

        <div className="bg-[#0b1311] p-3.5 rounded border border-[#213731] text-xs space-y-3 text-slate-300">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#1c3029]">
            <div>
              <span className="font-pixel text-slate-400 text-[10px] block uppercase">USUARIO AUTORIZADO (PROPIETARIO):</span>
              <span className="text-emerald-300 font-mono text-xs font-bold">{user?.email || 'Sesión no detectada'}</span>
            </div>
            {user && (
              <button
                type="button"
                onClick={() => {
                  sound.playClick()
                  signOut()
                }}
                className="btn-game btn-game-secondary text-[11px] py-1.5 px-3 text-amber-300 hover:text-rose-300 flex items-center gap-1.5 cursor-pointer font-pixel"
              >
                <LogOut size={13} />
                <span>CERRAR TALLER (SALIR)</span>
              </button>
            )}
          </div>
          <p className="font-pixel text-xs text-emerald-400">
            POLÍTICAS DE SEGURIDAD Y PRIVACIDAD EN PRODUCCIÓN
          </p>
          <ul className="space-y-1 text-slate-400 pl-1 text-[11px] font-mono">
            <li>• Todas las tablas cuentan con Row Level Security (RLS) activo.</li>
            <li>• Consultas, inserciones y mutaciones aisladas por el identificador de usuario (<code className="text-emerald-400">auth.uid()</code>).</li>
            <li>• Las peticiones anónimas están completamente bloqueadas a nivel de base de datos.</li>
            <li>• El registro público de cuentas en la aplicación permanece inhabilitado.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
