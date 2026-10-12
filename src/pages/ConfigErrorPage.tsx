import React from 'react'
import { AlertOctagon, Terminal, Server } from 'lucide-react'
import { PixelSprite } from '../components/common/PixelSprite'

export const ConfigErrorPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0a0f0d] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden select-none">
      <div className="max-w-lg w-full relative z-10">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 rounded-md bg-[#221010] border-2 border-[#542020] shadow-2xl mb-3">
            <PixelSprite name="cog" size={38} className="text-rose-500" />
          </div>
          <h1 className="font-stencil text-2xl font-black tracking-widest text-rose-400 drop-shadow-md">
            FORJA — CONFIGURACIÓN PENDIENTE
          </h1>
          <p className="text-[11px] font-stencil text-amber-300 tracking-wider uppercase mt-1">
            CONEXIÓN A SUPABASE REQUERIDA
          </p>
        </div>

        <div className="forge-panel bg-[#131215] border-2 border-[#472225] shadow-2xl p-6 rounded-sm rivet-corners">
          <div className="flex items-center gap-2.5 pb-3 mb-4 border-b border-[#3b1d20] text-rose-300">
            <AlertOctagon size={18} className="text-rose-400 shrink-0" />
            <span className="font-stencil text-xs uppercase font-bold tracking-wide">
              Persistencia Remota Desconectada
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            FORJA está diseñado para operar con persistencia cifrada en Supabase. No se detectaron las variables de entorno necesarias para establecer la conexión con la base de datos de producción.
          </p>

          <div className="bg-[#0b0c0e] border border-[#2b1f24] rounded-sm p-3.5 mb-4 text-xs font-mono">
            <div className="flex items-center gap-2 text-amber-300 mb-2 font-bold">
              <Terminal size={14} />
              <span>VARIABLES REQUERIDAS:</span>
            </div>
            <ul className="space-y-1.5 text-slate-300 pl-2">
              <li className="flex items-center gap-1.5">
                <span className="text-emerald-400">•</span>
                <span className="text-slate-200">VITE_SUPABASE_URL</span>
                <span className="text-slate-400 text-[10px]">(URL del proyecto en Supabase)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-emerald-400">•</span>
                <span className="text-slate-200">VITE_SUPABASE_ANON_KEY</span>
                <span className="text-slate-400 text-[10px]">(Publishable / Anon key pública)</span>
              </li>
            </ul>
          </div>

          <div className="bg-[#121c17] border border-[#203a2e] rounded-sm p-3 text-[11px] text-slate-300 flex items-start gap-2 leading-relaxed">
            <Server size={15} className="text-emerald-400 shrink-0 mt-0.5" />
            <p>
              <strong>En Producción (GitHub Pages):</strong> Configura los secretos <code className="text-emerald-300 font-mono">VITE_SUPABASE_URL</code> y <code className="text-emerald-300 font-mono">VITE_SUPABASE_ANON_KEY</code> en tu repositorio de GitHub bajo <em>Settings &rarr; Secrets and variables &rarr; Actions</em>.
            </p>
          </div>
        </div>

        <div className="mt-4 text-center text-[10px] text-slate-400 font-stencil tracking-wider">
          FORJA v2.0 • PROTOCOLO DE INTEGRIDAD FINANCIERA
        </div>
      </div>
    </div>
  )
}
