import React, { useState, useEffect, useRef } from 'react'
import { sound } from '../../services/sound'

export interface ForjaLogoProps {
  variant?: 'full' | 'compact' | 'icon'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  showSubtitle?: boolean
}

interface Spark {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  color: string
}

/**
 * FORJA II — Logotipo Oficial y Wordmark de Marca.
 *
 * Inspirado directamente en el arte de portada de Graveyard Keeper 2:
 * - Placa de hierro forjado ajustada sin espacios vacíos.
 * - Wordmark "FORJA" en relieve 3D de piedra y acero pixel art.
 * - Numeral romano "II" GIGANTE, agresivo, hendido en carmesí/sangre con filo dentado,
 *   nestled inmediatamente al lado de la "A" de FORJA y desbordando el marco.
 * - 100% centrado tanto en el menú lateral como en el login.
 *
 * EASTER EGG DE FORJA INCANDESCENTE:
 * - Cada clic golpea el yunque con sonido físico metálico ("CLANGG!").
 * - El metal se calienta progresivamente: ámbar -> naranja -> rojo cereza -> blanco incandescente.
 * - Al nivel máximo (nivel 5), ¡el metal empieza a fundirse y derretirse con gotas de magma!
 * - Un último golpe templa el metal en agua con un siseo de vapor ("PSSSHHHH") y lo resetea.
 */
export const ForjaLogo: React.FC<ForjaLogoProps> = ({
  variant = 'compact',
  size = 'md',
  className = '',
  showSubtitle = true,
}) => {
  const [heat, setHeat] = useState<number>(0)
  const [sparks, setSparks] = useState<Spark[]>([])
  const [isQuenching, setIsQuenching] = useState<boolean>(false)
  const coolTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sparkIdCounter = useRef<number>(0)

  // Auto-enfriamiento si el herrero deja de golpear
  useEffect(() => {
    if (heat > 0 && !isQuenching) {
      if (coolTimerRef.current) clearTimeout(coolTimerRef.current)
      coolTimerRef.current = setTimeout(() => {
        setHeat((prev) => Math.max(0, prev - 1))
      }, 3500)
    }
    return () => {
      if (coolTimerRef.current) clearTimeout(coolTimerRef.current)
    }
  }, [heat, isQuenching])

  // Manejo del martillazo en el logo
  const handleStrike = (e: React.MouseEvent) => {
    e.stopPropagation()

    if (heat >= 5) {
      // Nivel máximo alcanzado: ¡Templar en agua fría!
      sound.playQuenchSteam()
      setIsQuenching(true)
      setHeat(0)
      setTimeout(() => setIsQuenching(false), 900)
      return
    }

    const nextHeat = heat + 1
    setHeat(nextHeat)
    sound.playAnvilHit(nextHeat)

    // Generar chispas de herrero al golpear
    const newSparks: Spark[] = []
    const sparkCount = 6 + nextHeat * 3
    const colors = ['#fef08a', '#facc15', '#f97316', '#ef4444', '#ffffff']

    for (let i = 0; i < sparkCount; i++) {
      const angle = (Math.random() * Math.PI) + Math.PI // Hacia arriba
      const speed = 2 + Math.random() * 4
      newSparks.push({
        id: ++sparkIdCounter.current,
        x: 100 + (Math.random() - 0.5) * 60,
        y: 30 + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
      })
    }

    setSparks((prev) => [...prev.slice(-12), ...newSparks])
    setTimeout(() => {
      setSparks([])
    }, 450)
  }

  // Estilos de calor incandescente dinámicos
  const getHeatFilters = () => {
    if (isQuenching) {
      return {
        filter: 'brightness(1.1) drop-shadow(0 0 16px rgba(147, 197, 253, 0.9))',
        plaqueBorder: '#60a5fa',
        plaqueBg: 'from-[#0f172a] to-[#020617]',
        textFill: '#93c5fd',
        iiFill: '#38bdf8',
      }
    }
    switch (heat) {
      case 1:
        return {
          filter: 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.45))',
          plaqueBorder: '#d97706',
          plaqueBg: 'from-[#24180e] to-[#0d0905]',
          textFill: '#fcd34d',
          iiFill: '#f87171',
        }
      case 2:
        return {
          filter: 'drop-shadow(0 0 14px rgba(249, 115, 22, 0.75))',
          plaqueBorder: '#ea580c',
          plaqueBg: 'from-[#3a1d0f] to-[#170a04]',
          textFill: '#fed7aa',
          iiFill: '#ef4444',
        }
      case 3:
        return {
          filter: 'drop-shadow(0 0 20px rgba(239, 68, 68, 0.9)) contrast(1.1)',
          plaqueBorder: '#dc2626',
          plaqueBg: 'from-[#450a0a] to-[#1c0303]',
          textFill: '#fef08a',
          iiFill: '#f43f5e',
        }
      case 4:
        return {
          filter: 'brightness(1.25) drop-shadow(0 0 28px rgba(254, 240, 138, 0.95)) contrast(1.2)',
          plaqueBorder: '#fef08a',
          plaqueBg: 'from-[#7c2d12] to-[#450a0a]',
          textFill: '#ffffff',
          iiFill: '#fbbf24',
        }
      case 5:
        // ¡FUNDIÉNDOSE / DERRETIMIENTO!
        return {
          filter: 'brightness(1.35) drop-shadow(0 0 36px #ff4500) drop-shadow(0 0 12px #ffdd00) contrast(1.3)',
          plaqueBorder: '#ffffff',
          plaqueBg: 'from-[#991b1b] via-[#ea580c] to-[#78350f]',
          textFill: '#fffbeb',
          iiFill: '#fef08a',
        }
      default:
        return {
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.9))',
          plaqueBorder: '#3d564a',
          plaqueBg: 'from-[#182621] to-[#0a110e]',
          textFill: '#6ee7b7',
          iiFill: '#ef4444',
        }
    }
  }

  const heatStyle = getHeatFilters()

  if (variant === 'icon') {
    const dim = size === 'sm' ? 24 : size === 'md' ? 32 : size === 'lg' ? 44 : 60
    return (
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`pixel-art shrink-0 select-none cursor-pointer ${className}`}
        onClick={handleStrike}
        aria-label="FORJA II"
      >
        <rect width="32" height="32" rx="4" fill="#0b1311" stroke="#254236" strokeWidth="1.5" />
        <rect x="2" y="2" width="28" height="28" rx="2.5" stroke="#101c18" strokeWidth="1" />
        <circle cx="3.5" cy="3.5" r="1.2" fill="#d6a443" />
        <circle cx="28.5" cy="3.5" r="1.2" fill="#d6a443" />
        <circle cx="3.5" cy="28.5" r="1.2" fill="#80581a" />
        <circle cx="28.5" cy="28.5" r="1.2" fill="#80581a" />
        <path d="M5 22H27V26H5V22Z" fill="#1b3a27" />
        <path d="M9 18H23V22H9V18Z" fill="#2d623e" />
        <g id="numeral-ii-icon">
          <path d="M6 5H13V8H11V21H13V24H6V21H8V8H6V5Z" fill={heatStyle.iiFill} />
          <path d="M11 8H13V21H11V8ZM6 21H13V24H6V21Z" fill="#7f1d1d" />
          <path d="M6 5H13V6.5H8.5V21H7V8H6V5Z" fill="#fecdd3" />
          <path d="M19 5H26V8H24V21H26V24H19V21H21V8H19V5Z" fill={heatStyle.iiFill} />
          <path d="M24 8H26V21H24V8ZM19 21H26V24H19V21Z" fill="#7f1d1d" />
          <path d="M19 5H26V6.5H21.5V21H20V8H19V5Z" fill="#fecdd3" />
        </g>
      </svg>
    )
  }

  // Proporciones ajustadas: FORJA y el II forman un solo bloque sin espacios muertos
  const isMelting = heat >= 5

  return (
    <div
      className={`w-full flex flex-col items-center justify-center text-center select-none ${className}`}
      style={{ margin: '0 auto' }}
    >
      {/* CONTENEDOR CLICKABLE PARA EL EASTER EGG DE FORJA */}
      <div
        onClick={handleStrike}
        className="relative group cursor-pointer transition-transform duration-75 active:scale-95 flex items-center justify-center"
        title="¡Golpea el yunque con clic para forjar el metal!"
        style={{
          width: variant === 'full' ? '340px' : '205px',
          height: variant === 'full' ? '86px' : '56px',
        }}
      >
        {/* COMPOSICIÓN UNIFICADA SVG: PLACA + FORJA + II ADYACENTE */}
        <svg
          viewBox="0 0 204 60"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`w-full h-full pixel-art overflow-visible transition-all duration-200 ${
            isMelting ? 'animate-bounce' : ''
          }`}
          style={{
            filter: heatStyle.filter,
            transform: isMelting ? 'scale(1.04) rotate(-0.5deg)' : 'none',
          }}
          aria-label="FORJA II"
        >
          {/* DEFINICIÓN DE GRADIENTES TÉRMICOS PARA DERRETIMIENTO */}
          <defs>
            <linearGradient id="plaqueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={heat >= 4 ? '#ea580c' : heat >= 2 ? '#3b1f13' : '#182621'} />
              <stop offset="100%" stopColor={heat >= 4 ? '#7c2d12' : heat >= 2 ? '#170c06' : '#0b120f'} />
            </linearGradient>
            <filter id="meltGlow">
              <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* 1. PLACA BASE DE HIERRO CON BISEL AJUSTADO EXACTAMENTE A "FORJA" (x=10 a x=154) */}
          <g id="plaque-base">
            {/* Sombra de relieve */}
            <rect x="12" y="10" width="144" height="42" rx="2" fill="#030605" />
            {/* Marco exterior de acero forjado */}
            <rect
              x="10"
              y="8"
              width="144"
              height="42"
              rx="2"
              fill="#0d1411"
              stroke={heatStyle.plaqueBorder}
              strokeWidth="2"
            />
            {/* Relleno interior metálico */}
            <rect
              x="12"
              y="10"
              width="140"
              height="38"
              rx="1"
              fill="url(#plaqueGrad)"
              stroke={heat >= 2 ? '#f59e0b' : '#a9741f'}
              strokeWidth="1"
            />

            {/* Remaches mecánicos dorados en esquinas */}
            <circle cx="15" cy="13" r="1.5" fill={heat >= 2 ? '#ffffff' : '#f0c868'} />
            <circle cx="15" cy="45" r="1.5" fill={heat >= 2 ? '#facc15' : '#80581a'} />
            <circle cx="149" cy="13" r="1.5" fill={heat >= 2 ? '#ffffff' : '#f0c868'} />
            <circle cx="149" cy="45" r="1.5" fill={heat >= 2 ? '#facc15' : '#80581a'} />
            <circle cx="82" cy="10" r="1" fill={heat >= 2 ? '#ffffff' : '#f0c868'} />
            <circle cx="82" cy="48" r="1" fill={heat >= 2 ? '#facc15' : '#80581a'} />
          </g>

          {/* 2. TEXTO "FORJA" LABRADO EN CANTERÍA (Ocupa de x=20 a x=142, sin vacíos) */}
          <g
            fontFamily="'Pixelify Sans', sans-serif"
            fontWeight="700"
            fontSize="32"
            letterSpacing="3"
            id="text-forja"
          >
            {/* Capa de sombra profunda */}
            <text x="21" y="39" fill="#000000" opacity="0.9">FORJA</text>
            {/* Capa de bisel oscuro */}
            <text x="20" y="38" fill={heat >= 3 ? '#991b1b' : '#1e3328'}>FORJA</text>
            {/* Capa frontal del relieve */}
            <text x="19" y="37" fill={heatStyle.textFill}>FORJA</text>
            {/* Brillo superior de la arista */}
            <text x="19" y="36" fill={heat >= 4 ? '#ffffff' : '#e6fbf1'} opacity="0.85">FORJA</text>
          </g>

          {/* 3. NUMERAL ROMANO "II" GIGANTE (x=142 a x=194, inmediatamente pegado a la A) */}
          {/* Desborda arriba (y=2) y abajo (y=58) estilo Graveyard Keeper 2 */}
          <g transform="translate(140, 0)" id="numeral-ii-slashed">
            {/* Sombras negras de fondo */}
            <path
              d="M8 6 L20 2 L17 16 L25 13 L20 34 L28 40 L22 56 L12 60 L15 42 L5 47 L10 24 L3 20 Z"
              fill="#000000"
              opacity="0.85"
            />
            <path
              d="M26 2 L38 0 L33 14 L42 12 L36 36 L44 43 L35 60 L24 62 L27 42 L18 45 L24 22 L16 17 Z"
              fill="#000000"
              opacity="0.85"
            />

            {/* COLUMNA I IZQUIERDA (Carmesí intenso) */}
            <path
              d="M7 7 L18 4 L15 17 L21 30 L15 44 L19 53 L10 55 L12 41 L6 27 L11 16 Z"
              fill={heat >= 3 ? '#991b1b' : '#58081a'}
            />
            <path
              d="M8 8 L17 5 L14 17 L20 30 L14 43 L18 52 L11 54 L12 41 L7 27 L11 16 Z"
              fill={heat >= 4 ? '#f59e0b' : '#b91c1c'}
            />
            <path
              d="M9 9 L15 7 L13 18 L17 30 L13 42 L16 50 L12 51 L13 40 L8 28 L11 17 Z"
              fill={heatStyle.iiFill}
            />
            <path d="M10 10 L12 8 L11 17 L13 30 L11 40 L13 46 L11 41 L9 28 L11 18 Z" fill="#ffffff" opacity="0.8" />

            {/* COLUMNA I DERECHA (Más alta, imponente) */}
            <path
              d="M25 3 L37 1 L32 15 L39 27 L32 46 L37 57 L26 60 L29 43 L22 28 L28 14 Z"
              fill={heat >= 3 ? '#991b1b' : '#58081a'}
            />
            <path
              d="M26 4 L36 2 L31 15 L38 27 L31 45 L36 56 L27 58 L29 43 L23 28 L28 14 Z"
              fill={heat >= 4 ? '#f59e0b' : '#b91c1c'}
            />
            <path
              d="M27 5 L34 3 L30 16 L35 27 L29 44 L33 53 L28 55 L30 42 L24 29 L29 15 Z"
              fill={heatStyle.iiFill}
            />
            <path d="M28 6 L30 4 L28 15 L31 27 L27 42 L30 49 L28 42 L25 29 L28 16 Z" fill="#ffffff" opacity="0.8" />

            {/* Tajos y muescas de hacha */}
            <path d="M18 24 L24 22 L22 30 L17 29 Z" fill={heat >= 2 ? '#fef08a' : '#7f1d1d'} />
            <path d="M15 38 L20 36 L18 42 L14 41 Z" fill={heat >= 2 ? '#ffffff' : '#fecdd3'} />
          </g>

          {/* EFECTO DE GOTAS Y DERRETIMIENTO SI HEAT === 5 */}
          {isMelting && (
            <g id="melting-lava-drips">
              <path d="M30 48 Q32 58 30 62 Q28 62 28 54 Z" fill="#ff4500" />
              <path d="M80 48 Q82 60 79 66 Q77 64 77 52 Z" fill="#ffaa00" />
              <path d="M120 48 Q122 56 120 60 Q118 58 118 50 Z" fill="#ff4500" />
              <path d="M165 52 Q167 64 164 70 Q162 68 162 56 Z" fill="#ffcc00" />
              <path d="M185 54 Q187 66 184 72 Q182 70 182 58 Z" fill="#ff4500" />
            </g>
          )}
        </svg>

        {/* CHISPAS DE IMPACTO PROCEDURALES */}
        {sparks.map((spark) => (
          <span
            key={spark.id}
            className="absolute w-1.5 h-1.5 rounded-full pointer-events-none transition-all duration-300"
            style={{
              left: `${spark.x}%`,
              top: `${spark.y}%`,
              backgroundColor: spark.color,
              boxShadow: `0 0 6px ${spark.color}`,
              transform: `translate(${spark.vx * 12}px, ${spark.vy * 12}px) scale(0.6)`,
              opacity: 0.9,
            }}
          />
        ))}

        {/* EFECTO DE VAPOR DE ENFRIAMIENTO (QUENCH STEAM) */}
        {isQuenching && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-ping">
            <span className="text-3xl">💨</span>
          </div>
        )}
      </div>

      {/* SUBTÍTULO CENTRADO CON FEEDBACK DEL ESTADO DE CALOR */}
      {showSubtitle && (
        <div className="mt-1 flex items-center justify-center gap-1.5 font-stencil drop-shadow-sm">
          {isMelting ? (
            <span className="text-[10px] sm:text-xs text-rose-400 font-bold tracking-widest uppercase animate-pulse">
              🔥 ¡METAL FUNDIÉNDOSE! (CLICK PARA TEMPLAR) 🔥
            </span>
          ) : isQuenching ? (
            <span className="text-[10px] sm:text-xs text-cyan-300 font-bold tracking-widest uppercase">
              ♨️ ACERO TEMPLADO EN AGUA ♨️
            </span>
          ) : heat > 0 ? (
            <span className="text-[10px] sm:text-xs text-amber-400 font-bold tracking-wider uppercase">
              FORJA AL ROJO (NIVEL {heat}/5) · MARTILLA DE NUEVO
            </span>
          ) : (
            <span className="text-[10px] sm:text-xs text-amber-300 font-bold tracking-widest uppercase">
              {variant === 'full' ? 'PLATAFORMA FINANCIERA MODULAR' : 'TALLER FINANCIERO V2'}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
