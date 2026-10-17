import React, { useEffect, useRef } from 'react'

export type SparkPalette = 'amber' | 'rust' | 'cyan' | 'emerald' | 'forge'

interface SparkParticle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  alpha: number
  life: number
  maxLife: number
}

const PALETTES: Record<SparkPalette, string[]> = {
  amber: ['#f1c560', '#e8af3d', '#d09329', '#f6d88d', '#c8743e'],
  rust: ['#db7654', '#c55b3d', '#e69479', '#a3472f', '#fbefe9'],
  cyan: ['#78bcb7', '#57a6a0', '#a2d2ce', '#346f6b', '#cde7e5'],
  emerald: ['#86cc98', '#64b77b', '#4a9b62', '#ade0b8', '#d3ecd8'],
  forge: ['#ffffff', '#fffbeb', '#fef08a', '#fde047', '#f59e0b', '#f97316', '#ef4444', '#b91c1c'],
}

interface SparkEventDetail {
  x: number
  y: number
  palette?: SparkPalette
  count?: number
}

export function triggerPixelSparks(x: number, y: number, palette: SparkPalette = 'amber', count = 14) {
  if (typeof window === 'undefined') return
  const event = new CustomEvent<SparkEventDetail>('forja:sparks', {
    detail: { x, y, palette, count },
  })
  window.dispatchEvent(event)
}

/** Dispara una ráfaga de chispas directamente desde las coordenadas de un botón o elemento interactivo */
export function triggerButtonSparks(
  target: React.MouseEvent<HTMLElement> | HTMLElement,
  palette: SparkPalette = 'forge',
  count = 18
) {
  if (typeof window === 'undefined') return
  let x = window.innerWidth / 2
  let y = window.innerHeight / 2

  if ('clientX' in target && target.clientX !== 0) {
    x = target.clientX
    y = target.clientY
  } else if ('currentTarget' in target && target.currentTarget) {
    const rect = target.currentTarget.getBoundingClientRect()
    x = rect.left + rect.width / 2
    y = rect.top + rect.height / 2
  } else if ('getBoundingClientRect' in target) {
    const rect = target.getBoundingClientRect()
    x = rect.left + rect.width / 2
    y = rect.top + rect.height / 2
  }
  triggerPixelSparks(x, y, palette, count)
}

export const PixelSparks: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<SparkParticle[]>([])
  const animFrameRef = useRef<number | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    const handleSparkEvent = (e: Event) => {
      if (
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        return
      }

      const customEvent = e as CustomEvent<SparkEventDetail>
      const { x, y, palette = 'forge', count = 16 } = customEvent.detail
      const colors = PALETTES[palette] || PALETTES.forge

      for (let i = 0; i < count; i++) {
        // En una forja, las chispas saltan con un cono ascendente y lateral (estilo yunque de herrero)
        const isUpward = Math.random() > 0.25
        const angle = isUpward
          ? -Math.PI * 0.85 + Math.random() * (Math.PI * 0.7) // Abanico hacia arriba
          : Math.random() * Math.PI * 2 // Expansión radial secundaria

        const speed = 2.2 + Math.random() * 4.8
        const size = Math.random() > 0.6 ? 3 : Math.random() > 0.3 ? 2 : 1
        const maxLife = 20 + Math.floor(Math.random() * 16)

        particlesRef.current.push({
          x: x + (Math.random() * 8 - 4),
          y: y + (Math.random() * 6 - 3),
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (isUpward ? 1.5 : 0),
          size,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 1,
          life: 0,
          maxLife,
        })
      }

      if (!animFrameRef.current) {
        animFrameRef.current = requestAnimationFrame(animate)
      }
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const activeParticles: SparkParticle[] = []

      for (const p of particlesRef.current) {
        p.life++
        p.x += p.vx
        p.y += p.vy
        p.vx *= 0.97 // Resistencia del aire de la forja
        p.vy += 0.22 // Gravedad de partículas de hierro fundido
        p.alpha = Math.max(0, 1 - p.life / p.maxLife)

        if (p.alpha > 0.05 && p.life < p.maxLife) {
          ctx.globalAlpha = p.alpha
          ctx.fillStyle = p.color
          // Cuadrados pixel art nítidos y calientes
          ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size)
          activeParticles.push(p)
        }
      }

      particlesRef.current = activeParticles

      if (activeParticles.length > 0) {
        animFrameRef.current = requestAnimationFrame(animate)
      } else {
        animFrameRef.current = null
      }
    }

    window.addEventListener('forja:sparks', handleSparkEvent)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      window.removeEventListener('forja:sparks', handleSparkEvent)
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[9999]"
      style={{ imageRendering: 'pixelated' }}
    />
  )
}
