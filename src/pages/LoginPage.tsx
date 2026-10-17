import React, { useState } from 'react'
import { Lock, Mail, AlertTriangle, ShieldCheck, Key } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { PixelSprite } from '../components/common/PixelSprite'
import { ForjaLogo } from '../components/common/ForjaLogo'
import { sound } from '../services/sound'
import { triggerButtonSparks } from '../components/common/PixelSparks'

export const LoginPage: React.FC = () => {
  const { signIn, enterDemoMode } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return

    setIsSubmitting(true)
    setErrorMessage(null)
    sound.playClick()

    try {
      await signIn(email.trim(), password)
      sound.playConfirm()
    } catch (err) {
      sound.playError()
      const rawMsg = (err as Error).message || ''
      if (rawMsg.toLowerCase().includes('invalid login credentials')) {
        setErrorMessage('Credenciales inválidas. Verifica tu correo y contraseña registrados en Supabase.')
      } else if (rawMsg.toLowerCase().includes('email not confirmed')) {
        setErrorMessage('El correo no ha sido confirmado en el panel de Supabase.')
      } else {
        setErrorMessage(rawMsg || 'Error al autenticar con el servidor de Supabase.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0f0d] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Patrón de fondo industrial de rejilla de taller */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(#1f382f 1.5px, transparent 1.5px), radial-gradient(#142620 1.5px, #0a0f0d 1.5px)',
          backgroundSize: '36px 36px',
          backgroundPosition: '0 0, 18px 18px',
        }}
      />

      <div className="max-w-md w-full relative z-10">
        {/* Placa de Cabecera Oficial FORJA II */}
        <div className="text-center mb-6">
          <ForjaLogo variant="full" showSubtitle={true} />
          <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#16251f] border border-[#264438] text-[10px] text-emerald-300 font-pixel">
            <span className="led-pilot led-pilot-online" />
            <span>ESTACIÓN DE ACCESO SEGURO</span>
          </div>
        </div>

        {/* Panel Principal de Autenticación */}
        <div className="forge-panel bg-[#111815] border-2 border-[#263e34] shadow-2xl p-6 sm:p-7 rounded-sm rivet-corners">
          <div className="flex items-center justify-between pb-3 mb-5 border-b border-[#21372e]">
            <div className="flex items-center gap-2">
              <Key size={16} className="text-amber-400" />
              <span className="font-stencil text-xs text-slate-200 uppercase tracking-wide font-bold">
                Control de Identidad
              </span>
            </div>
            <span className="badge-pixel text-[9px] bg-[#1d120a] text-amber-300 border-[#5e3814]">
              PROPIETARIO
            </span>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3 rounded-sm bg-[#2b1212] border border-[#6b2525] flex items-start gap-2.5 text-xs text-rose-200">
              <AlertTriangle size={16} className="shrink-0 text-rose-400 mt-0.5" />
              <div className="leading-snug">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-pixel text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Mail size={12} className="text-emerald-400" />
                <span>CORREO ELECTRÓNICO</span>
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="propietario@taller.forja"
                className="w-full bg-[#0b100e] border border-[#274035] focus:border-emerald-500 rounded-sm px-3 py-2.5 text-xs text-slate-100 placeholder-slate-600 outline-none transition-colors font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-pixel text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Lock size={12} className="text-emerald-400" />
                <span>CLAVE DE AUTORIZACIÓN</span>
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#0b100e] border border-[#274035] focus:border-emerald-500 rounded-sm px-3 py-2.5 text-xs text-slate-100 placeholder-slate-600 outline-none transition-colors font-mono"
              />
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="submit"
                disabled={isSubmitting}
                onClick={(e) => triggerButtonSparks(e, 'forge', 16)}
                className="w-full btn-game btn-game-primary btn-forge-heat py-3 text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg font-pixel font-bold disabled:opacity-50"
              >
                <PixelSprite name="tools" size={16} />
                <span>{isSubmitting ? 'VERIFICANDO EN EL REGISTRO...' : 'ACCEDER AL TALLER'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playConfirm()
                  enterDemoMode()
                }}
                className="w-full btn-game btn-game-secondary py-2 text-xs text-amber-300 font-pixel font-bold flex items-center justify-center gap-2 cursor-pointer border border-[#394d43]"
              >
                <PixelSprite name="cog" size={14} />
                <span>ENTRAR EN MODO SIMULACIÓN / OPERARIO LOCAL</span>
              </button>
            </div>
          </form>

          {/* Advertencia de Políticas de Privacidad y No Registro */}
          <div className="mt-5 pt-4 border-t border-[#1e332a] text-[10px] text-slate-400 leading-relaxed flex items-start gap-2">
            <ShieldCheck size={14} className="text-emerald-400 shrink-0 mt-0.5" />
            <p>
              FORJA es una estación de uso privado. Los registros públicos de nuevas cuentas están inhabilitados.
              Los datos financieros se custodian en Supabase protegidos con Row Level Security.
            </p>
          </div>
        </div>

        {/* Pie de página con versión */}
        <div className="mt-4 text-center text-[10px] text-slate-400 font-stencil tracking-wider">
          FORJA III • TERMINAL DE PRODUCCIÓN SUPABASE
        </div>
      </div>
    </div>
  )
}
