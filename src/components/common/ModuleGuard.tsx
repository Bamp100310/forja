import React from 'react'
import { Navigate } from 'react-router-dom'
import { useForja } from '../../context/ForjaContext'
import type { ModuleId } from '../../domain/modules'
import { MODULE_REGISTRY } from '../../domain/modules'
import { PixelSprite, type PixelSpriteName } from './PixelSprite'
import { sound } from '../../services/sound'

interface ModuleGuardProps {
  moduleId: ModuleId
  children: React.ReactNode
  fallbackRedirect?: string
}

/**
 * Route Guard para FORJA V2:
 * Evita que rutas de módulos desactivados se abran por navegación directa.
 */
export const ModuleGuard: React.FC<ModuleGuardProps> = ({
  moduleId,
  children,
  fallbackRedirect,
}) => {
  const { isModuleActive, toggleModule } = useForja()
  const active = isModuleActive(moduleId)

  if (active) {
    return <>{children}</>
  }

  if (fallbackRedirect) {
    return <Navigate to={fallbackRedirect} replace />
  }

  const modDef = MODULE_REGISTRY[moduleId]

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="forge-panel bg-[#111815] border-2 border-[#263e34] p-6 sm:p-8 rounded-sm max-w-lg w-full text-center rivet-corners shadow-2xl">
        <div className="inline-flex items-center justify-center p-3 rounded-md bg-[#192721] border border-[#2c473c] mb-4">
          <PixelSprite name={(modDef?.iconName as PixelSpriteName) || 'cog'} size={36} />
        </div>

        <h2 className="font-stencil text-lg sm:text-xl font-bold text-amber-400 tracking-wider mb-2">
          MÓDULO DESACTIVADO
        </h2>

        <p className="font-pixel text-xs text-slate-300 leading-relaxed mb-4">
          La funcionalidad <span className="text-emerald-300 font-bold">«{modDef?.name || moduleId}»</span> se
          encuentra deshabilitada en la configuración de tu taller.
        </p>

        <p className="text-[11px] text-slate-400 mb-6 font-mono">
          {modDef?.description}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={async () => {
              sound.playConfirm()
              await toggleModule(moduleId, true)
            }}
            className="w-full sm:w-auto btn-game btn-game-primary py-2.5 px-5 text-xs font-bold cursor-pointer"
          >
            ACTIVAR MÓDULO AHORA
          </button>
          <a
            href="#/"
            onClick={() => sound.playClick()}
            className="w-full sm:w-auto btn-game btn-game-secondary py-2.5 px-4 text-xs font-bold cursor-pointer text-slate-300"
          >
            VOLVER AL CONTROL
          </a>
        </div>
      </div>
    </div>
  )
}
