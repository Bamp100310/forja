import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useForja } from '../../context/ForjaContext'
import { getCurrentPeriod, canNavigateToNextPeriod } from '../../domain/period'
import { PixelSprite } from './PixelSprite'
import { sound } from '../../services/sound'

export const PeriodNavigator: React.FC = () => {
  const { period, goToPreviousPeriod, goToNextPeriod, resetToCurrentPeriod } = useForja()
  const currentPeriod = getCurrentPeriod()
  const isCurrent = period.id === currentPeriod.id
  const canGoNext = canNavigateToNextPeriod(period, new Date())

  const handlePrev = () => {
    sound.playClick()
    goToPreviousPeriod()
  }

  const handleNext = () => {
    if (!canGoNext) {
      sound.playError()
      return
    }
    sound.playClick()
    goToNextPeriod()
  }

  const handleReset = () => {
    sound.playClick()
    resetToCurrentPeriod()
  }

  return (
    <div className="flex items-center gap-1.5 bg-[#0a1210] border-2 border-[#1e342c] rounded-sm p-1 shadow-inner">
      <button
        onClick={handlePrev}
        title="Corte anterior (11 al 10)"
        className="p-1.5 rounded-xs text-slate-400 hover:text-emerald-300 hover:bg-[#14231f] transition-all cursor-pointer active:translate-y-0.5"
        aria-label="Corte anterior"
      >
        <ChevronLeft size={16} />
      </button>

      <div className="flex items-center gap-2.5 px-2.5 py-0.5 border-x border-[#1a2c25]">
        <PixelSprite name="calendar" size={18} />
        <div className="flex flex-col">
          <span className="text-xs font-pixel font-bold text-slate-100 tracking-wide">
            {period.label}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="font-stencil text-[10px] text-emerald-400 font-bold">
              CORTE {period.id}
            </span>
            {isCurrent ? (
              <span className="badge-pixel text-[9px] bg-[#12261a] text-emerald-300 border-[#234b31] px-1 py-0 flex items-center gap-1">
                <span className="led-pilot led-pilot-online" />
                ACTIVO
              </span>
            ) : (
              <span className="badge-pixel text-[9px] bg-[#1a2824] text-amber-400/90 border-[#3d331d] px-1 py-0">
                HISTÓRICO
              </span>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={handleNext}
        disabled={!canGoNext}
        title={canGoNext ? "Corte siguiente (11 al 10)" : "Corte activo — No se admiten cortes futuros"}
        className={`p-1.5 rounded-xs transition-all ${
          canGoNext
            ? 'text-slate-400 hover:text-emerald-300 hover:bg-[#14231f] cursor-pointer active:translate-y-0.5'
            : 'text-slate-600 opacity-25 cursor-not-allowed hover:bg-transparent active:translate-y-0'
        }`}
        aria-label="Corte siguiente"
      >
        <ChevronRight size={16} />
      </button>

      {!isCurrent && (
        <button
          onClick={handleReset}
          title="Regresar al corte activo actual"
          className="ml-1 text-[10px] font-stencil font-bold px-2 py-1 rounded-xs bg-[#162923] text-emerald-300 border border-emerald-700/80 hover:bg-[#1e3931] transition-all cursor-pointer active:translate-y-0.5"
        >
          CORTE ACTUAL
        </button>
      )}
    </div>
  )
}
