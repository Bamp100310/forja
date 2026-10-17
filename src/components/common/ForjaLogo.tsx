import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { sound } from '../../services/sound'
import { triggerPixelSparks } from './PixelSparks'

export interface ForjaLogoProps {
  /** 'full' para Login/Bienvenida/Hero, 'compact' para barra lateral y cabecera móvil, 'icon' para emblema compacto */
  variant?: 'full' | 'compact' | 'icon'
  className?: string
  showSubtitle?: boolean
}

export type ThermalHeatStage = 0 | 1 | 2 | 3 | 4 | 5

export const AMBIENT_TEMP_C = 25
export const BRASS_MELT_TEMP_C = 930
export const IRON_MELT_TEMP_C = 1538
export const MAX_PLASMA_TEMP_C = 2500

interface KeyframePalette {
  tempC: number
  phaseName: string
  accessibleDesc: string
  outerBorder: string
  innerTop: string
  innerBottom: string
  bayTop: string
  bayBottom: string
  weldColor: string
  forjaText: string
  pillarMain: string
  pillarCore: string
  crossbar: string
  anvilTop: string
  anvilBody: string
  glowColor: string
  glowAlpha: number
  glowSpread: number
}

/**
 * Curva metalúrgica real de calentamiento y radiación de cuerpo negro del acero/latón:
 * Desde 25°C (Hierro templado) -> 220°C (Pajizo) -> 300°C (Pavón violeta/azul) ->
 * 550°C (Rojo sombrío) -> 780°C (Rojo cereza Curie) -> 980°C (Fusión latón) ->
 * 1280°C (Amarillo fragua) -> 1538°C (Fusión del hierro) -> 2400°C (Plasma de arco).
 */
const METALLURGICAL_KEYFRAMES: KeyframePalette[] = [
  {
    tempC: 25,
    phaseName: 'HIERRO TEMPLADO',
    accessibleDesc: 'Hierro forjado a temperatura ambiente',
    outerBorder: '#b45309',
    innerTop: '#17231e',
    innerBottom: '#0b120f',
    bayTop: '#24160b',
    bayBottom: '#140c06',
    weldColor: '#d97706',
    forjaText: '#f1f5f9',
    pillarMain: '#f59e0b',
    pillarCore: '#fde047',
    crossbar: '#d97706',
    anvilTop: '#e2e8f0',
    anvilBody: '#94a3b8',
    glowColor: '#d97706',
    glowAlpha: 0.15,
    glowSpread: 6,
  },
  {
    tempC: 190,
    phaseName: 'TEMPLE PAJIZO',
    accessibleDesc: 'Óxido superficial dorado pajizo de templado',
    outerBorder: '#d97706',
    innerTop: '#241d13',
    innerBottom: '#120e09',
    bayTop: '#33200d',
    bayBottom: '#1b1006',
    weldColor: '#f59e0b',
    forjaText: '#fef3c7',
    pillarMain: '#fbbf24',
    pillarCore: '#fef08a',
    crossbar: '#f59e0b',
    anvilTop: '#fde68a',
    anvilBody: '#cbd5e1',
    glowColor: '#f59e0b',
    glowAlpha: 0.28,
    glowSpread: 10,
  },
  {
    tempC: 310,
    phaseName: 'PAVÓN VIOLETA-AZUL',
    accessibleDesc: 'Acero pavonado con iridiscencia térmica violeta y cian',
    outerBorder: '#818cf8',
    innerTop: '#1e1b38',
    innerBottom: '#0f0d1f',
    bayTop: '#2c1d3d',
    bayBottom: '#160d21',
    weldColor: '#a78bfa',
    forjaText: '#e0e7ff',
    pillarMain: '#c084fc',
    pillarCore: '#f5d0fe',
    crossbar: '#818cf8',
    anvilTop: '#c7d2fe',
    anvilBody: '#818cf8',
    glowColor: '#818cf8',
    glowAlpha: 0.36,
    glowSpread: 12,
  },
  {
    tempC: 540,
    phaseName: 'ROJO SOMBRÍO (DRAPER)',
    accessibleDesc: 'Punto de Draper: inicio de incandescencia roja visible',
    outerBorder: '#dc2626',
    innerTop: '#361313',
    innerBottom: '#1c0808',
    bayTop: '#4a1410',
    bayBottom: '#260907',
    weldColor: '#ef4444',
    forjaText: '#fecaca',
    pillarMain: '#ef4444',
    pillarCore: '#fca5a5',
    crossbar: '#dc2626',
    anvilTop: '#fca5a5',
    anvilBody: '#dc2626',
    glowColor: '#dc2626',
    glowAlpha: 0.48,
    glowSpread: 15,
  },
  {
    tempC: 770,
    phaseName: 'ROJO CEREZA (CURIE)',
    accessibleDesc: 'Punto de Curie: hierro no magnético al rojo cereza intenso',
    outerBorder: '#ef4444',
    innerTop: '#4f1212',
    innerBottom: '#2b0707',
    bayTop: '#6b1612',
    bayBottom: '#380907',
    weldColor: '#f97316',
    forjaText: '#fed7aa',
    pillarMain: '#f97316',
    pillarCore: '#fde047',
    crossbar: '#ef4444',
    anvilTop: '#fdba74',
    anvilBody: '#ef4444',
    glowColor: '#ef4444',
    glowAlpha: 0.62,
    glowSpread: 19,
  },
  {
    tempC: 960,
    phaseName: 'FUSIÓN DE LATÓN',
    accessibleDesc: 'Brasa naranja brillante: los remaches de latón comienzan a fundirse',
    outerBorder: '#f97316',
    innerTop: '#66200b',
    innerBottom: '#361005',
    bayTop: '#85290d',
    bayBottom: '#471506',
    weldColor: '#fbbf24',
    forjaText: '#fef08a',
    pillarMain: '#fb923c',
    pillarCore: '#fef9c3',
    crossbar: '#f97316',
    anvilTop: '#fde047',
    anvilBody: '#f97316',
    glowColor: '#f97316',
    glowAlpha: 0.75,
    glowSpread: 24,
  },
  {
    tempC: 1260,
    phaseName: 'AMARILLO DE FRAGUA',
    accessibleDesc: 'Hierro colado al amarillo incandescente con goteo de escoria',
    outerBorder: '#fbbf24',
    innerTop: '#7d340b',
    innerBottom: '#451a05',
    bayTop: '#9e420e',
    bayBottom: '#572206',
    weldColor: '#fef08a',
    forjaText: '#fef9c3',
    pillarMain: '#fde047',
    pillarCore: '#ffffff',
    crossbar: '#fbbf24',
    anvilTop: '#fef9c3',
    anvilBody: '#fbbf24',
    glowColor: '#fbbf24',
    glowAlpha: 0.85,
    glowSpread: 29,
  },
  {
    tempC: 1538,
    phaseName: '¡FUSIÓN DEL HIERRO!',
    accessibleDesc: 'Punto de fusión del hierro puro (1538°C): metal líquido al blanco incandescente',
    outerBorder: '#fef08a',
    innerTop: '#96470c',
    innerBottom: '#542306',
    bayTop: '#b8580f',
    bayBottom: '#692b07',
    weldColor: '#ffffff',
    forjaText: '#ffffff',
    pillarMain: '#fef08a',
    pillarCore: '#ffffff',
    crossbar: '#fef9c3',
    anvilTop: '#ffffff',
    anvilBody: '#fde047',
    glowColor: '#fde047',
    glowAlpha: 0.95,
    glowSpread: 35,
  },
  {
    tempC: 2400,
    phaseName: '¡PLASMA SOLAR DE ARCO!',
    accessibleDesc: 'Sobrecarga extrema de crisol de arco: plasma blanco-azulado',
    outerBorder: '#e0f2fe',
    innerTop: '#855812',
    innerBottom: '#4d2b08',
    bayTop: '#a67116',
    bayBottom: '#5e3809',
    weldColor: '#ffffff',
    forjaText: '#ffffff',
    pillarMain: '#ffffff',
    pillarCore: '#e0f2fe',
    crossbar: '#ffffff',
    anvilTop: '#ffffff',
    anvilBody: '#fef08a',
    glowColor: '#fef9c3',
    glowAlpha: 1.0,
    glowSpread: 42,
  },
]

function parseHex(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const num = parseInt(clean, 16)
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
}

function lerpHex(hexA: string, hexB: string, t: number): string {
  const clamped = Math.max(0, Math.min(1, t))
  const [r1, g1, b1] = parseHex(hexA)
  const [r2, g2, b2] = parseHex(hexB)
  const r = Math.round(r1 + (r2 - r1) * clamped)
  const g = Math.round(g1 + (g2 - g1) * clamped)
  const b = Math.round(b1 + (b2 - b1) * clamped)
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

export function deriveHeatStageFromTemp(tempC: number): ThermalHeatStage {
  if (tempC < 80) return 0
  if (tempC < 320) return 1
  if (tempC < 680) return 2
  if (tempC < 1085) return 3
  if (tempC < IRON_MELT_TEMP_C) return 4
  return 5
}

export interface ProceduralThermalState {
  phaseName: string
  accessibleStatus: string
  outerBorder: string
  innerBg: string
  bayBg: string
  weldColor: string
  forjaText: string
  pillarMain: string
  pillarCore: string
  crossbar: string
  anvilTop: string
  anvilBody: string
  glowShadow: string
  meltFactor: number
}

export function computeProceduralThermalState(tempC: number): ProceduralThermalState {
  const clamped = Math.max(AMBIENT_TEMP_C, Math.min(MAX_PLASMA_TEMP_C, tempC))

  let lower = METALLURGICAL_KEYFRAMES[0]
  let upper = METALLURGICAL_KEYFRAMES[METALLURGICAL_KEYFRAMES.length - 1]

  for (let i = 0; i < METALLURGICAL_KEYFRAMES.length - 1; i++) {
    const curr = METALLURGICAL_KEYFRAMES[i]
    const next = METALLURGICAL_KEYFRAMES[i + 1]
    if (clamped >= curr.tempC && clamped <= next.tempC) {
      lower = curr
      upper = next
      break
    }
  }

  const span = Math.max(1, upper.tempC - lower.tempC)
  const t = Math.max(0, Math.min(1, (clamped - lower.tempC) / span))
  const activeMeta = t >= 0.55 ? upper : lower

  const outerBorder = lerpHex(lower.outerBorder, upper.outerBorder, t)
  const innerTop = lerpHex(lower.innerTop, upper.innerTop, t)
  const innerBottom = lerpHex(lower.innerBottom, upper.innerBottom, t)
  const bayTop = lerpHex(lower.bayTop, upper.bayTop, t)
  const bayBottom = lerpHex(lower.bayBottom, upper.bayBottom, t)
  const weldColor = lerpHex(lower.weldColor, upper.weldColor, t)
  const forjaText = lerpHex(lower.forjaText, upper.forjaText, t)
  const pillarMain = lerpHex(lower.pillarMain, upper.pillarMain, t)
  const pillarCore = lerpHex(lower.pillarCore, upper.pillarCore, t)
  const crossbar = lerpHex(lower.crossbar, upper.crossbar, t)
  const anvilTop = lerpHex(lower.anvilTop, upper.anvilTop, t)
  const anvilBody = lerpHex(lower.anvilBody, upper.anvilBody, t)
  const glowColor = lerpHex(lower.glowColor, upper.glowColor, t)
  const glowAlpha = lower.glowAlpha + (upper.glowAlpha - lower.glowAlpha) * t
  const glowSpread = Math.round(lower.glowSpread + (upper.glowSpread - lower.glowSpread) * t)

  const [gr, gg, gb] = parseHex(glowColor)
  const glowShadow =
    clamped <= 45
      ? 'inset 0 1px 0 rgba(251,191,36,0.22), 0 4px 12px rgba(0,0,0,0.75)'
      : `0 0 ${glowSpread}px rgba(${gr},${gg},${gb},${glowAlpha.toFixed(2)}), inset 0 0 ${Math.round(
          glowSpread * 0.55,
        )}px rgba(${gr},${gg},${gb},${(glowAlpha * 0.65).toFixed(2)})`

  // Factor continuo de fusión plástica (0.0 bajo 900°C -> 1.0 a 1850°C+)
  const meltFactor = Math.max(0, Math.min(1, (clamped - 900) / (1850 - 900)))

  return {
    phaseName: activeMeta.phaseName,
    accessibleStatus: `${activeMeta.phaseName} (${Math.round(clamped)}°C): ${activeMeta.accessibleDesc}`,
    outerBorder,
    innerBg: `linear-gradient(180deg, ${innerTop} 0%, ${innerBottom} 100%)`,
    bayBg: `linear-gradient(180deg, ${bayTop} 0%, ${bayBottom} 100%)`,
    weldColor,
    forjaText,
    pillarMain,
    pillarCore,
    crossbar,
    anvilTop,
    anvilBody,
    glowShadow,
    meltFactor,
  }
}

/**
 * Emblema SVG pixel-art del Yunque + III con deformación plástica procedural al fundirse.
 */
const ForgedAnvilCrestSvg: React.FC<{
  size?: number
  thermal: ProceduralThermalState
}> = ({ size = 28, thermal }) => {
  const sag = Math.round(thermal.meltFactor * 2)

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      shapeRendering="crispEdges"
      aria-hidden="true"
      className="shrink-0 block"
    >
      {/* Pilares III incandescentes sobre el yunque (se asientan al fundirse) */}
      <rect x="5" y={3 + sag} width="14" height="1" fill={thermal.pillarCore} />
      <rect x="6" y={4 + sag} width="2" height={6 - sag} fill={thermal.pillarMain} />
      <rect x="5" y={4 + sag} width="1" height={6 - sag} fill={thermal.crossbar} />
      <rect x="11" y={3 + sag} width="2" height={7 - sag} fill={thermal.pillarMain} />
      <rect x="10" y={4 + sag} width="1" height={6 - sag} fill={thermal.crossbar} />
      <rect x="16" y={4 + sag} width="2" height={6 - sag} fill={thermal.pillarMain} />
      <rect x="18" y={4 + sag} width="1" height={6 - sag} fill={thermal.crossbar} />
      <rect x="5" y="10" width="14" height="1" fill={thermal.weldColor} />

      {/* Mesa y cuerno del yunque */}
      <rect x="2" y="13" width="3" height="2" fill={thermal.anvilBody} />
      <rect x="5" y="12" width="15" height="1" fill={thermal.anvilTop} />
      <rect x="5" y="13" width="16" height="3" fill={thermal.anvilBody} />
      {/* Cintura del yunque */}
      <rect x="8" y="16" width="8" height="3" fill="#475569" />
      <rect x="9" y="17" width="6" height="1" fill={thermal.pillarMain} />
      {/* Base del yunque */}
      <rect x="5" y="19" width="14" height="2" fill="#64748b" />
      <rect x="4" y="21" width="16" height="2" fill="#334155" />

      {/* Escoria fundida goteando del cuerno del yunque cuando meltFactor > 0.35 */}
      {thermal.meltFactor > 0.35 && (
        <>
          <rect x="3" y="15" width="1" height={Math.min(5, Math.ceil(thermal.meltFactor * 5))} fill={thermal.pillarCore} />
          <rect x="19" y="16" width="1" height={Math.min(4, Math.ceil(thermal.meltFactor * 4))} fill={thermal.pillarMain} />
        </>
      )}
    </svg>
  )
}

/**
 * Numeral Romano III forjado como pieza ornamental integrada en la placa,
 * con ablandamiento plástico procedural cuando supera los 1000°C.
 */
const OrnamentalRomanThree: React.FC<{
  compact?: boolean
  thermal: ProceduralThermalState
}> = ({ compact = false, thermal }) => {
  const w = compact ? 32 : 46
  const h = compact ? 22 : 32
  const sag = Math.round(thermal.meltFactor * 2)
  const puddleWidth = Math.round(thermal.meltFactor * 4)

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 46 32"
      shapeRendering="crispEdges"
      aria-hidden="true"
      className="block shrink-0"
    >
      {/* Travesaño superior forjado */}
      <rect x={3 - Math.floor(puddleWidth / 2)} y={2 + sag} width={40 + puddleWidth} height="4" fill={thermal.crossbar} />
      <rect x="5" y={3 + sag} width="36" height="2" fill={thermal.pillarCore} />

      {/* Pilar I */}
      <rect x="7" y={6 + sag} width="7" height={20 - sag} fill={thermal.pillarMain} />
      <rect x="9" y={6 + sag} width="3" height={20 - sag} fill={thermal.pillarCore} />

      {/* Pilar II */}
      <rect x="19" y={6 + sag} width="8" height={20 - sag} fill={thermal.pillarMain} />
      <rect x="21" y={6 + sag} width="4" height={20 - sag} fill={thermal.pillarCore} />

      {/* Pilar III */}
      <rect x="32" y={6 + sag} width="7" height={20 - sag} fill={thermal.pillarMain} />
      <rect x="34" y={6 + sag} width="3" height={20 - sag} fill={thermal.pillarCore} />

      {/* Travesaño inferior forjado (se ensancha al fundirse) */}
      <rect x={3 - Math.floor(puddleWidth / 2)} y="26" width={40 + puddleWidth} height="4" fill={thermal.crossbar} />
      <rect x="5" y="27" width="36" height="2" fill={thermal.pillarMain} />
    </svg>
  )
}

interface MoltenDropSpec {
  id: number
  leftPct: number
  widthPx: number
  heightPx: number
  delaySec: number
  durationSec: number
}

const PROCEDURAL_DROPS: MoltenDropSpec[] = [
  { id: 0, leftPct: 12, widthPx: 5, heightPx: 9, delaySec: 0.0, durationSec: 1.05 },
  { id: 1, leftPct: 28, widthPx: 6, heightPx: 12, delaySec: 0.22, durationSec: 0.92 },
  { id: 2, leftPct: 46, widthPx: 7, heightPx: 14, delaySec: 0.11, durationSec: 0.85 },
  { id: 3, leftPct: 63, widthPx: 5, heightPx: 10, delaySec: 0.37, durationSec: 1.1 },
  { id: 4, leftPct: 79, widthPx: 6, heightPx: 13, delaySec: 0.19, durationSec: 0.95 },
  { id: 5, leftPct: 91, widthPx: 5, heightPx: 9, delaySec: 0.44, durationSec: 1.0 },
  { id: 6, leftPct: 36, widthPx: 6, heightPx: 11, delaySec: 0.31, durationSec: 0.88 },
  { id: 7, leftPct: 71, widthPx: 7, heightPx: 15, delaySec: 0.08, durationSec: 0.82 },
]

/**
 * FORJA III — Logotipo Oficial e Insignia Interactiva con Termodinámica Procedural Continua.
 * - Responde a decenas y cientos de golpes de martillo (25°C -> 1538°C fusión del hierro -> 2500°C plasma).
 * - Multiplicador de cadencia en tiempo real según velocidad de martilleo.
 * - Enfriamiento continuo por ley de Newton + radiación térmica de Stefan-Boltzmann.
 */
export const ForjaLogo: React.FC<ForjaLogoProps> = ({
  variant = 'full',
  className = '',
  showSubtitle = true,
}) => {
  const [tempC, setTempC] = useState<number>(AMBIENT_TEMP_C)
  const [totalStrikes, setTotalStrikes] = useState<number>(0)
  const [cadenceMult, setCadenceMult] = useState<number>(1.0)
  const [strikeRecoil, setStrikeRecoil] = useState<{ dx: number; dy: number; rot: number } | null>(null)
  const [isQuenching, setIsQuenching] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(() => sound.isReducedMotionPreferred())

  const lastStrikeTimeRef = useRef<number>(0)
  const recentStrikesRef = useRef<number[]>([])
  const strikeTimerRef = useRef<number | null>(null)
  const quenchTimerRef = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const clearTimers = useCallback(() => {
    if (strikeTimerRef.current !== null) {
      window.clearTimeout(strikeTimerRef.current)
      strikeTimerRef.current = null
    }
    if (quenchTimerRef.current !== null) {
      window.clearTimeout(quenchTimerRef.current)
      quenchTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleChange = () => setReducedMotion(mq.matches)
    mq.addEventListener?.('change', handleChange)
    return () => {
      mq.removeEventListener?.('change', handleChange)
    }
  }, [])

  useEffect(() => {
    return () => {
      clearTimers()
    }
  }, [clearTimers])

  const isHeated = tempC > AMBIENT_TEMP_C

  // Simulación física de enfriamiento continuo (Newton + Stefan-Boltzmann T^4)
  useEffect(() => {
    if (!isHeated) return

    const interval = window.setInterval(() => {
      const now = Date.now()
      const idleMs = now - lastStrikeTimeRef.current
      // Retención adiabática breve (900ms) tras cada martillazo para permitir forjado continuo
      if (idleMs < 900) return

      setTempC((prev) => {
        if (prev <= AMBIENT_TEMP_C + 1) {
          setTotalStrikes(0)
          setCadenceMult(1.0)
          recentStrikesRef.current = []
          return AMBIENT_TEMP_C
        }
        const dt = 0.08 // paso de integración
        // Convección lineal de Newton + radiación térmica proporcional a (T/1000)^4
        const convectiveLoss = (prev - AMBIENT_TEMP_C) * 0.12 * dt
        const radiativeLoss = Math.pow(prev / 650, 3.2) * 6.5 * dt
        const next = Math.max(AMBIENT_TEMP_C, prev - (convectiveLoss + radiativeLoss))
        return next
      })
    }, 80)

    return () => window.clearInterval(interval)
  }, [isHeated])

  // Acción explícita de templado en agua (Quench)
  const triggerWaterQuench = useCallback(
    (e?: React.MouseEvent) => {
      if (e) e.stopPropagation()
      sound.playQuenchSteam()
      setTempC(AMBIENT_TEMP_C)
      setTotalStrikes(0)
      setCadenceMult(1.0)
      recentStrikesRef.current = []
      setStrikeRecoil(null)
      setIsQuenching(true)

      if (!reducedMotion && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        triggerPixelSparks(rect.left + rect.width / 2, rect.top + rect.height / 2, 'emerald', 22)
      }

      if (quenchTimerRef.current !== null) window.clearTimeout(quenchTimerRef.current)
      quenchTimerRef.current = window.setTimeout(() => {
        setIsQuenching(false)
        quenchTimerRef.current = null
      }, 850)
    },
    [reducedMotion],
  )

  const triggerHammerStrike = useCallback(
    (clientX?: number, clientY?: number, shiftKey?: boolean) => {
      // Shift+Clic cuando está caliente templa inmediatamente en agua
      if (shiftKey && tempC > 120) {
        triggerWaterQuench()
        return
      }

      const now = Date.now()
      lastStrikeTimeRef.current = now

      // Filtrar golpes en la ventana rodante de 1.8 segundos para calcular cadencia (CPS)
      const windowStrikes = recentStrikesRef.current.filter((t) => now - t <= 1800)
      windowStrikes.push(now)
      recentStrikesRef.current = windowStrikes

      // Multiplicador de cadencia: 1 golpe aislado = x1.0 (~18°C), ráfaga intensa = hasta x4.2 (~68°C/golpe)
      const cps = windowStrikes.length / 1.8
      const computedMult = Number(Math.min(4.2, 1.0 + Math.max(0, cps - 0.8) * 0.42).toFixed(1))
      setCadenceMult(computedMult)

      // Energía cinética convertida en calor (con ligero rendimiento decreciente cerca del plasma solar)
      const baseDelta = 16.5 * computedMult
      const highTempDamping = tempC > IRON_MELT_TEMP_C ? 0.65 : tempC > BRASS_MELT_TEMP_C ? 0.85 : 1.0
      const deltaT = Math.max(8, baseDelta * highTempDamping)

      const nextTemp = Math.min(MAX_PLASMA_TEMP_C, tempC + deltaT)
      const nextStrikes = totalStrikes + 1

      setTempC(nextTemp)
      setTotalStrikes(nextStrikes)
      sound.playAnvilHit(nextTemp, computedMult)

      if (!reducedMotion) {
        // Vector procedural de retroceso/impacto según dónde o cómo se golpea
        const dx = ((nextStrikes % 3) - 1) * 1.5
        const dy = 1.5 + Math.min(2.5, computedMult * 0.5)
        const rot = ((nextStrikes % 2 === 0 ? 1 : -1) * Math.min(2.2, 0.4 + computedMult * 0.35))
        setStrikeRecoil({ dx, dy, rot })

        if (strikeTimerRef.current !== null) window.clearTimeout(strikeTimerRef.current)
        strikeTimerRef.current = window.setTimeout(() => {
          setStrikeRecoil(null)
          strikeTimerRef.current = null
        }, 120)

        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect()
          const sx = clientX ?? rect.left + rect.width / 2
          const sy = clientY ?? rect.top + rect.height / 2
          const sparkCount = Math.min(
            36,
            Math.round(6 + (nextTemp / 150) + computedMult * 2.5),
          )
          const sparkPalette =
            nextTemp >= IRON_MELT_TEMP_C
              ? 'forge'
              : nextTemp >= 520
                ? 'rust'
                : 'amber'
          triggerPixelSparks(sx, sy, sparkPalette, sparkCount)
        }
      }
    },
    [tempC, totalStrikes, reducedMotion, triggerWaterQuench],
  )

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
    triggerHammerStrike(e.clientX, e.clientY, e.shiftKey)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      e.stopPropagation()
      triggerHammerStrike(undefined, undefined, e.shiftKey)
    }
  }

  const heatStage = deriveHeatStageFromTemp(tempC)
  const thermal = useMemo(() => computeProceduralThermalState(tempC), [tempC])
  const isCompact = variant === 'compact'
  const isIconOnly = variant === 'icon'

  // Gotas procedurales activas según el factor continuo de fusión (meltFactor > 0)
  const activeDropsCount =
    !reducedMotion && thermal.meltFactor > 0.05
      ? Math.max(1, Math.min(PROCEDURAL_DROPS.length, Math.ceil(thermal.meltFactor * PROCEDURAL_DROPS.length)))
      : 0

  const recoilStyle: React.CSSProperties =
    !reducedMotion && strikeRecoil
      ? {
          transform: `translate(${strikeRecoil.dx}px, ${strikeRecoil.dy}px) rotate(${strikeRecoil.rot}deg) scale(0.975)`,
        }
      : {}

  const thermalProgressPct = Math.min(
    100,
    Math.round(((tempC - AMBIENT_TEMP_C) / (IRON_MELT_TEMP_C - AMBIENT_TEMP_C)) * 100),
  )

  return (
    <div
      ref={containerRef}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`Insignia FORJA III. ${thermal.accessibleStatus}`}
      data-testid="forja-iii-logo"
      data-heat-stage={heatStage}
      data-temp-c={Math.round(tempC)}
      data-strikes={totalStrikes}
      data-melt-factor={thermal.meltFactor.toFixed(2)}
      title="Martillea repetidamente el yunque de FORJA III para elevar la temperatura hasta fundir el hierro a 1.538°C (Shift+Clic para templar en agua)"
      className={`inline-flex flex-col items-center justify-center select-none cursor-pointer group outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090d0b] rounded-sm ${className}`}
    >
      {/* Texto accesible en vivo para lectores de pantalla */}
      <span className="sr-only" aria-live="polite">
        {thermal.accessibleStatus}
      </span>

      {isIconOnly ? (
        <div
          className="relative p-1.5 rounded-sm border-2 transition-colors duration-100 hover:brightness-110"
          style={{
            background: thermal.innerBg,
            borderColor: thermal.outerBorder,
            boxShadow: thermal.glowShadow,
            ...recoilStyle,
          }}
        >
          <ForgedAnvilCrestSvg size={28} thermal={thermal} />
        </div>
      ) : (
        /* Placa Maestra Unificada FORJA III */
        <div
          className="relative flex items-stretch rounded-sm border-2 transition-colors duration-100 hover:brightness-105"
          style={{
            borderColor: thermal.outerBorder,
            boxShadow: thermal.glowShadow,
            ...recoilStyle,
          }}
        >
          {/* Remaches de esquina superiores e inferiores */}
          <span
            aria-hidden="true"
            className="w-1.5 h-1.5 rounded-full absolute top-1 left-1 z-20 pointer-events-none"
            style={{ backgroundColor: thermal.pillarCore, boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.8)' }}
          />
          <span
            aria-hidden="true"
            className="w-1.5 h-1.5 rounded-full absolute bottom-1 left-1 z-20 pointer-events-none"
            style={{ backgroundColor: thermal.crossbar, boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.8)' }}
          />
          <span
            aria-hidden="true"
            className="w-1.5 h-1.5 rounded-full absolute top-1 right-1 z-20 pointer-events-none"
            style={{ backgroundColor: thermal.pillarCore, boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.8)' }}
          />
          <span
            aria-hidden="true"
            className="w-1.5 h-1.5 rounded-full absolute bottom-1 right-1 z-20 pointer-events-none"
            style={{ backgroundColor: thermal.crossbar, boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.8)' }}
          />

          {/* Bahía Izquierda: Emblema de Yunque + Wordmark FORJA */}
          <div
            className={`flex items-center gap-2 ${
              isCompact ? 'px-2.5 py-1.5' : 'px-4 py-2 sm:px-5 sm:py-2.5'
            }`}
            style={{ background: thermal.innerBg }}
          >
            <ForgedAnvilCrestSvg size={isCompact ? 20 : 30} thermal={thermal} />
            <div className="flex flex-col justify-center">
              <span
                className={`font-stencil font-black tracking-[0.12em] leading-none transition-colors duration-100 ${
                  isCompact ? 'text-base sm:text-lg' : 'text-2xl sm:text-3xl'
                }`}
                style={{
                  color: thermal.forjaText,
                  textShadow:
                    tempC >= 520
                      ? `0 0 ${Math.min(18, Math.round((tempC - 400) / 80))}px ${thermal.pillarMain}, 0 2px 0 #2a0804`
                      : '0 2px 0 #050807',
                }}
              >
                FORJA
              </span>
              {/* Subrayado estructural de latón/brasa */}
              <span
                aria-hidden="true"
                className="w-full h-[2px] mt-0.5 rounded-xs transition-colors duration-100"
                style={{ backgroundColor: thermal.weldColor }}
              />
            </div>
          </div>

          {/* Costura de soldadura vertical entre FORJA y III */}
          <div
            aria-hidden="true"
            className="w-[2px] shrink-0"
            style={{ backgroundColor: thermal.weldColor }}
          />

          {/* Bahía Derecha: Numeral Romano III Ornamental Integrado */}
          <div
            className={`flex items-center justify-center ${
              isCompact ? 'px-2 py-1' : 'px-3 py-1.5 sm:px-3.5 sm:py-2'
            }`}
            style={{ background: thermal.bayBg }}
          >
            <OrnamentalRomanThree compact={isCompact} thermal={thermal} />
          </div>

          {/* Escoria y gotas de metal fundido procedurales (escalan con la temperatura > 930°C) */}
          {activeDropsCount > 0 && (
            <div
              aria-hidden="true"
              className="absolute -bottom-3 inset-x-2 h-4 pointer-events-none z-20 overflow-visible"
            >
              {PROCEDURAL_DROPS.slice(0, activeDropsCount).map((drop) => (
                <span
                  key={drop.id}
                  className="absolute top-0 rounded-full animate-molten-drip"
                  style={{
                    left: `${drop.leftPct}%`,
                    width: `${drop.widthPx}px`,
                    height: `${Math.round(drop.heightPx * (0.65 + thermal.meltFactor * 0.55))}px`,
                    backgroundColor: drop.id % 2 === 0 ? thermal.pillarCore : thermal.pillarMain,
                    boxShadow: `0 0 8px ${thermal.pillarMain}`,
                    animationDelay: `${drop.delaySec}s`,
                    animationDuration: `${Math.max(0.45, drop.durationSec - thermal.meltFactor * 0.3)}s`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pirómetro Digital en Vivo de la Fragua o Subtítulo de Marca */}
      {tempC > AMBIENT_TEMP_C + 5 ? (
        <div
          className={`mt-1.5 flex flex-col items-center gap-1 w-full max-w-[270px] px-2 py-1 rounded-xs border text-[9px] font-stencil font-bold tracking-wider uppercase transition-colors ${
            tempC >= IRON_MELT_TEMP_C
              ? 'bg-amber-950/95 border-yellow-300 text-yellow-100 shadow-[0_0_12px_rgba(250,204,21,0.5)]'
              : tempC >= 520
                ? 'bg-[#281009]/95 border-orange-500/80 text-amber-200'
                : 'bg-[#17131d]/95 border-amber-600/70 text-amber-300'
          }`}
        >
          <div className="w-full flex items-center justify-between gap-1.5">
            <span className="inline-flex items-center gap-1 truncate">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: thermal.pillarCore }}
              />
              <span className="num font-black text-[10px]" style={{ color: thermal.pillarCore }}>
                {Math.round(tempC).toLocaleString('es-CO')}°C
              </span>
              <span className="truncate text-[8px] opacity-95">• {thermal.phaseName}</span>
            </span>

            <button
              type="button"
              onClick={triggerWaterQuench}
              title="Templar inmediatamente en agua fría (reiniciar temperatura)"
              className="px-1.5 py-0.2 rounded-xs bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/70 text-cyan-200 text-[8px] font-pixel shrink-0 cursor-pointer transition-colors"
            >
              💧 TEMPLAR
            </button>
          </div>

          {/* Barra espectral de temperatura y contador de martillazos */}
          <div className="w-full flex items-center gap-1.5">
            <div className="flex-1 h-1.5 bg-black/70 border border-amber-900/60 rounded-xs overflow-hidden">
              <div
                className="h-full transition-all duration-100"
                style={{
                  width: `${thermalProgressPct}%`,
                  background: `linear-gradient(90deg, #d97706 0%, #818cf8 22%, #ef4444 50%, #fbbf24 80%, #ffffff 100%)`,
                }}
              />
            </div>
            <span className="text-[8px] font-pixel text-slate-300 num shrink-0">
              {totalStrikes} GOLPES {cadenceMult > 1.1 ? `• x${cadenceMult.toFixed(1)}` : ''}
            </span>
          </div>
        </div>
      ) : isQuenching ? (
        <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xs border bg-cyan-950/90 border-cyan-400 text-cyan-200 text-[9px] font-stencil font-bold tracking-wider uppercase shadow-[0_0_10px_rgba(34,211,238,0.4)]">
          <span>💨 ACERO TEMPLADO EN AGUA (25°C)</span>
        </div>
      ) : (
        variant === 'full' &&
        showSubtitle && (
          <div className="mt-2 inline-flex items-center gap-2 px-3 py-0.5 rounded-xs bg-[#111c18] border border-[#284237] shadow-md">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="font-pixel text-[10px] sm:text-[11px] font-bold tracking-[0.16em] text-amber-300/95 uppercase">
              TALLER FINANCIERO &amp; GESTIÓN INDUSTRIAL
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          </div>
        )
      )}
    </div>
  )
}
