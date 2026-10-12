import React, { useState } from 'react'
import { User, Database, Download, Plus, Check, Volume2, VolumeX, Trash2, RefreshCw, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useForja } from '../context/ForjaContext'
import { downloadFile, exportTransactionsToCSV } from '../services/exportImport'
import { isSupabaseConfigured } from '../services/supabase'
import type { CategoryKind } from '../domain/types'
import { PixelSprite } from '../components/common/PixelSprite'
import { sound } from '../services/sound'
import { triggerPixelSparks } from '../components/common/PixelSparks'

export const SettingsPage: React.FC = () => {
  const { user, signOut } = useAuth()
  const {
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
              Ajustes de operario, feedback sonoro, odómetro de la moto, catálogo y respaldo de datos
            </p>
          </div>
        </div>
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
