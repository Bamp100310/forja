/**
 * FORJA — Motor de Sonido Acústico, Metal y Forja Industrial (Muestras Reales CC0 + Síntesis Procedural de Respaldo)
 *
 * Arquitectura híbrida de baja latencia:
 * 1. Muestras reales de audio analógico de alta fidelidad (Licencia CC0 / Dominio Público):
 *    - Golpe de martillo sobre yunque de 45 libras con resonancia acústica metálica auténtica (VishwaJai / OpenGameArt).
 *    - Impactos secos de hierro, pestillo de caldera, cerrojos y engranajes mecánicos (Rubberduck / OpenGameArt).
 *    - Tintineo de monedas y piezas metálicas de taller.
 * 2. Precarga asíncrona en memoria (AudioBuffer en Web Audio API) para reproducción a 0ms de latencia.
 * 3. Variación microtonal orgánica (pitch jitter ±2%) en clics continuos para evitar sensación robótica.
 * 4. Respaldo procedural instantáneo mediante síntesis modal física de frecuencias de hierro fundido si no hay red.
 * 5. Control de volumen y silencio persistido en localStorage.
 */

const STORAGE_KEY_MUTED = 'forja_sound_muted'
const STORAGE_KEY_VOLUME = 'forja_sound_volume'

let audioCtx: AudioContext | null = null
let sharedNoiseBuffer: AudioBuffer | null = null

// Ruta base según entorno (Vite base path: / o /forja/)
const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/'

export const SOUND_SAMPLES = {
  click: `${baseUrl}sounds/metal_click.ogg`,
  anvil: `${baseUrl}sounds/anvil_strike.mp3`,
  forgeHammer: `${baseUrl}sounds/forge_hammer.ogg`,
  mechanism: `${baseUrl}sounds/mechanism.ogg`,
  coins: `${baseUrl}sounds/coins.ogg`,
  error: `${baseUrl}sounds/metal_error.ogg`,
} as const

type SoundSampleKey = keyof typeof SOUND_SAMPLES

const sampleBuffers: Partial<Record<SoundSampleKey, AudioBuffer>> = {}
let isPreloadStarted = false

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (AudioContextClass) {
      audioCtx = new AudioContextClass()
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (!sharedNoiseBuffer || sharedNoiseBuffer.sampleRate !== ctx.sampleRate) {
    const bufferSize = Math.floor(ctx.sampleRate * 0.5)
    sharedNoiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = sharedNoiseBuffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }
  }
  return sharedNoiseBuffer
}

async function loadSampleBuffer(key: SoundSampleKey, ctx: AudioContext): Promise<AudioBuffer | null> {
  if (sampleBuffers[key]) return sampleBuffers[key]!
  try {
    const url = SOUND_SAMPLES[key]
    const res = await fetch(url)
    if (!res.ok) return null
    const arrayBuffer = await res.arrayBuffer()
    const decoded = await ctx.decodeAudioData(arrayBuffer)
    sampleBuffers[key] = decoded
    return decoded
  } catch {
    return null
  }
}

export function preloadAllSounds() {
  if (isPreloadStarted || typeof window === 'undefined') return
  isPreloadStarted = true
  const ctx = getAudioContext()
  if (!ctx) return
  for (const key of Object.keys(SOUND_SAMPLES) as SoundSampleKey[]) {
    loadSampleBuffer(key, ctx).catch(() => {})
  }
}

// Iniciar precarga de audio en el primer evento de usuario o carga
if (typeof window !== 'undefined') {
  const initAudioTrigger = () => {
    preloadAllSounds()
    window.removeEventListener('pointerdown', initAudioTrigger)
    window.removeEventListener('keydown', initAudioTrigger)
  }
  window.addEventListener('pointerdown', initAudioTrigger, { once: true, passive: true })
  window.addEventListener('keydown', initAudioTrigger, { once: true, passive: true })
}

class SoundSystem {
  private muted: boolean
  private volume: number
  private lastTrigger: Record<string, number> = {}

  constructor() {
    this.muted = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_MUTED) === 'true' : false
    const savedVol = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_VOLUME) : null
    this.volume = savedVol !== null ? Math.max(0, Math.min(1, parseFloat(savedVol))) : 0.6
  }

  isMuted(): boolean {
    return this.muted
  }

  setMuted(muted: boolean) {
    this.muted = muted
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_MUTED, String(muted))
    }
  }

  getVolume(): number {
    return this.volume
  }

  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol))
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_VOLUME, String(this.volume))
    }
  }

  private shouldThrottle(type: string, minIntervalMs = 35): boolean {
    const now = Date.now()
    const last = this.lastTrigger[type] || 0
    if (now - last < minIntervalMs) {
      return true
    }
    this.lastTrigger[type] = now
    return false
  }

  private playSample(
    key: SoundSampleKey,
    volumeFactor = 1.0,
    playbackRate = 1.0,
    fallback?: () => void
  ): boolean {
    try {
      const ctx = getAudioContext()
      if (!ctx) {
        if (fallback) fallback()
        return false
      }
      const buffer = sampleBuffers[key]
      if (!buffer) {
        // Cargar en background para la próxima reproducción y usar fallback inmediato
        loadSampleBuffer(key, ctx).catch(() => {})
        if (fallback) fallback()
        return false
      }

      const now = ctx.currentTime
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.playbackRate.setValueAtTime(Math.max(0.2, Math.min(3.0, playbackRate)), now)

      const gainNode = ctx.createGain()
      gainNode.gain.setValueAtTime(this.volume * volumeFactor, now)

      source.connect(gainNode)
      gainNode.connect(ctx.destination)
      source.start(now)
      return true
    } catch {
      if (fallback) fallback()
      return false
    }
  }

  /**
   * Clic metálico mecánico: sonido real grabado de percutor de palanca/pestillo metálico.
   * Cuenta con variación microtonal para que no se sienta repetitivo.
   */
  playClick() {
    if (this.muted || this.volume <= 0 || this.shouldThrottle('click', 25)) return
    const rate = 0.98 + (Math.random() * 0.08 - 0.04) // Variación sutil ±4%
    this.playSample('click', 0.85, rate, () => this.synthClick())
  }

  /**
   * Confirmación / cerrojo pesado: pestillo y muelle de hierro encajando.
   */
  playConfirm() {
    if (this.muted || this.volume <= 0 || this.shouldThrottle('confirm', 45)) return
    this.playSample('mechanism', 0.75, 1.0, () => this.synthConfirm())
  }

  /**
   * Ingreso / cobro: tintineo de monedas de metal y latón.
   */
  playIncome() {
    if (this.muted || this.volume <= 0 || this.shouldThrottle('income', 50)) return
    this.playSample('coins', 0.8, 1.0, () => this.synthIncome())
  }

  /**
   * Gasto / forjado: golpe de martillo de herrero pesado contra metal.
   */
  playExpense() {
    if (this.muted || this.volume <= 0 || this.shouldThrottle('expense', 60)) return
    this.playSample('forgeHammer', 0.85, 1.0, () => this.synthExpense())
  }

  /**
   * Error / bloqueo: golpe seco de hierro trabado.
   */
  playError() {
    if (this.muted || this.volume <= 0 || this.shouldThrottle('error', 60)) return
    this.playSample('error', 0.8, 1.0, () => this.synthError())
  }

  /**
   * Golpe de yunque (Easter egg del logo FORJA II y forjado principal):
   * Muestra real de un yunque de 45 libras golpeado por martillo con armónicos de acero templado.
   */
  playAnvilHit(heatLevel = 0) {
    if (this.muted || this.volume <= 0 || this.shouldThrottle('anvil_hit', 40)) return
    const rate = 1.0 + heatLevel * 0.03
    this.playSample('anvil', 0.95, rate, () => this.synthAnvilHit(heatLevel))
  }

  /**
   * Siseo de templado al enfriar metal ardiente en agua.
   */
  playQuenchSteam() {
    if (this.muted || this.volume <= 0 || this.shouldThrottle('quench_steam', 100)) return
    try {
      const ctx = getAudioContext()
      if (!ctx) return
      const now = ctx.currentTime

      const master = ctx.createGain()
      master.gain.setValueAtTime(this.volume * 0.55, now)
      master.connect(ctx.destination)

      const noise = ctx.createBufferSource()
      noise.buffer = getNoiseBuffer(ctx)
      const filter = ctx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.setValueAtTime(3200, now)
      filter.frequency.exponentialRampToValueAtTime(1200, now + 0.6)
      filter.Q.setValueAtTime(1.5, now)

      const g = ctx.createGain()
      g.gain.setValueAtTime(0.65, now)
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.65)

      noise.connect(filter)
      filter.connect(g)
      g.connect(master)

      noise.start(now)
      noise.stop(now + 0.7)
    } catch {
      // Audio seguro
    }
  }

  // ==========================================================================
  // SÍNTESIS PROCEDURAL FÍSICA DE RESPALDO (Sin dependencias externas ni red)
  // ==========================================================================

  private synthClick() {
    try {
      const ctx = getAudioContext()
      if (!ctx) return
      const now = ctx.currentTime

      const master = ctx.createGain()
      master.gain.setValueAtTime(this.volume * 0.45, now)
      master.connect(ctx.destination)

      const noise = ctx.createBufferSource()
      noise.buffer = getNoiseBuffer(ctx)
      const noiseFilter = ctx.createBiquadFilter()
      noiseFilter.type = 'bandpass'
      noiseFilter.frequency.setValueAtTime(2400, now)
      noiseFilter.Q.setValueAtTime(2.2, now)

      const noiseGain = ctx.createGain()
      noiseGain.gain.setValueAtTime(0.7, now)
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.006)

      noise.connect(noiseFilter)
      noiseFilter.connect(noiseGain)
      noiseGain.connect(master)
      noise.start(now)
      noise.stop(now + 0.008)

      const clickModes = [
        { freq: 360, gain: 0.6, decay: 0.014 },
        { freq: 1180, gain: 0.35, decay: 0.012 },
      ]

      clickModes.forEach((m) => {
        const osc = ctx.createOscillator()
        const g = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(m.freq, now)
        g.gain.setValueAtTime(m.gain, now)
        g.gain.exponentialRampToValueAtTime(0.001, now + m.decay)
        osc.connect(g)
        g.connect(master)
        osc.start(now)
        osc.stop(now + m.decay + 0.005)
      })
    } catch {
      // Audio seguro
    }
  }

  private synthConfirm() {
    try {
      const ctx = getAudioContext()
      if (!ctx) return
      const now = ctx.currentTime

      const master = ctx.createGain()
      master.gain.setValueAtTime(this.volume * 0.42, now)
      master.connect(ctx.destination)

      ;[0, 0.01].forEach((offset, idx) => {
        const t = now + offset
        const noise = ctx.createBufferSource()
        noise.buffer = getNoiseBuffer(ctx)
        const filter = ctx.createBiquadFilter()
        filter.type = 'bandpass'
        filter.frequency.setValueAtTime(idx === 0 ? 1400 : 2100, t)
        filter.Q.setValueAtTime(3.0, t)

        const g = ctx.createGain()
        g.gain.setValueAtTime(idx === 0 ? 0.35 : 0.6, t)
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.012)

        noise.connect(filter)
        filter.connect(g)
        g.connect(master)
        noise.start(t)
        noise.stop(t + 0.015)
      })

      const ironModes = [
        { freq: 215, gain: 0.5, decay: 0.055 },
        { freq: 470, gain: 0.45, decay: 0.065 },
        { freq: 940, gain: 0.35, decay: 0.045 },
        { freq: 1680, gain: 0.2, decay: 0.03 },
      ]

      ironModes.forEach((m) => {
        const osc = ctx.createOscillator()
        const g = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(m.freq, now + 0.005)
        g.gain.setValueAtTime(m.gain, now + 0.005)
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.005 + m.decay)
        osc.connect(g)
        g.connect(master)
        osc.start(now + 0.005)
        osc.stop(now + 0.005 + m.decay + 0.01)
      })
    } catch {
      // Audio seguro
    }
  }

  private synthIncome() {
    try {
      const ctx = getAudioContext()
      if (!ctx) return
      const now = ctx.currentTime

      const master = ctx.createGain()
      master.gain.setValueAtTime(this.volume * 0.45, now)
      master.connect(ctx.destination)

      ;[0, 0.014, 0.028].forEach((offset) => {
        const t = now + offset
        const noise = ctx.createBufferSource()
        noise.buffer = getNoiseBuffer(ctx)
        const filter = ctx.createBiquadFilter()
        filter.type = 'bandpass'
        filter.frequency.setValueAtTime(3100, t)
        filter.Q.setValueAtTime(4.0, t)

        const g = ctx.createGain()
        g.gain.setValueAtTime(0.3, t)
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.008)

        noise.connect(filter)
        filter.connect(g)
        g.connect(master)
        noise.start(t)
        noise.stop(t + 0.01)

        const toothOsc = ctx.createOscillator()
        const toothG = ctx.createGain()
        toothOsc.type = 'triangle'
        toothOsc.frequency.setValueAtTime(740, t)
        toothG.gain.setValueAtTime(0.25, t)
        toothG.gain.exponentialRampToValueAtTime(0.001, t + 0.009)
        toothOsc.connect(toothG)
        toothG.connect(master)
        toothOsc.start(t)
        toothOsc.stop(t + 0.01)
      })

      const bellTime = now + 0.032
      const brassModes = [
        { freq: 392.0, gain: 0.35, decay: 0.13 },
        { freq: 783.99, gain: 0.65, decay: 0.19 },
        { freq: 1174.66, gain: 0.45, decay: 0.15 },
        { freq: 1960.0, gain: 0.25, decay: 0.09 },
      ]

      brassModes.forEach((m) => {
        const osc = ctx.createOscillator()
        const g = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(m.freq, bellTime)
        g.gain.setValueAtTime(m.gain, bellTime)
        g.gain.exponentialRampToValueAtTime(0.001, bellTime + m.decay)
        osc.connect(g)
        g.connect(master)
        osc.start(bellTime)
        osc.stop(bellTime + m.decay + 0.01)
      })
    } catch {
      // Audio seguro
    }
  }

  private synthExpense() {
    try {
      const ctx = getAudioContext()
      if (!ctx) return
      const now = ctx.currentTime

      const master = ctx.createGain()
      master.gain.setValueAtTime(this.volume * 0.48, now)
      master.connect(ctx.destination)

      const thud = ctx.createOscillator()
      const thudG = ctx.createGain()
      thud.type = 'sine'
      thud.frequency.setValueAtTime(82, now)
      thudG.gain.setValueAtTime(0.7, now)
      thudG.gain.exponentialRampToValueAtTime(0.001, now + 0.075)
      thud.connect(thudG)
      thudG.connect(master)
      thud.start(now)
      thud.stop(now + 0.08)

      const noise = ctx.createBufferSource()
      noise.buffer = getNoiseBuffer(ctx)
      const filter = ctx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.setValueAtTime(1100, now)
      filter.Q.setValueAtTime(2.0, now)

      const noiseGain = ctx.createGain()
      noiseGain.gain.setValueAtTime(0.55, now)
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025)
      noise.connect(filter)
      filter.connect(noiseGain)
      noiseGain.connect(master)
      noise.start(now)
      noise.stop(now + 0.03)

      const anvilModes = [
        { freq: 560, gain: 0.5, decay: 0.09 },
        { freq: 1140, gain: 0.45, decay: 0.13 },
        { freq: 2280, gain: 0.3, decay: 0.07 },
      ]

      anvilModes.forEach((m) => {
        const osc = ctx.createOscillator()
        const g = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(m.freq, now)
        g.gain.setValueAtTime(m.gain, now)
        g.gain.exponentialRampToValueAtTime(0.001, now + m.decay)
        osc.connect(g)
        g.connect(master)
        osc.start(now)
        osc.stop(now + m.decay + 0.01)
      })
    } catch {
      // Audio seguro
    }
  }

  private synthError() {
    try {
      const ctx = getAudioContext()
      if (!ctx) return
      const now = ctx.currentTime

      const master = ctx.createGain()
      master.gain.setValueAtTime(this.volume * 0.44, now)
      master.connect(ctx.destination)

      const ironHits = [
        { freq: 118, gain: 0.55, decay: 0.055 },
        { freq: 168, gain: 0.5, decay: 0.05 },
      ]

      ironHits.forEach((hit) => {
        const osc = ctx.createOscillator()
        const g = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(hit.freq, now)
        g.gain.setValueAtTime(hit.gain, now)
        g.gain.exponentialRampToValueAtTime(0.001, now + hit.decay)
        osc.connect(g)
        g.connect(master)
        osc.start(now)
        osc.stop(now + hit.decay + 0.01)
      })

      const scrape = ctx.createBufferSource()
      scrape.buffer = getNoiseBuffer(ctx)
      const scrapeFilter = ctx.createBiquadFilter()
      scrapeFilter.type = 'bandpass'
      scrapeFilter.frequency.setValueAtTime(680, now)
      scrapeFilter.Q.setValueAtTime(4.0, now)

      const scrapeGain = ctx.createGain()
      scrapeGain.gain.setValueAtTime(0.5, now)
      scrapeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.038)
      scrape.connect(scrapeFilter)
      scrapeFilter.connect(scrapeGain)
      scrapeGain.connect(master)
      scrape.start(now)
      scrape.stop(now + 0.04)
    } catch {
      // Audio seguro
    }
  }

  private synthAnvilHit(heatLevel = 0) {
    try {
      const ctx = getAudioContext()
      if (!ctx) return
      const now = ctx.currentTime

      const master = ctx.createGain()
      master.gain.setValueAtTime(this.volume * Math.min(0.65, 0.48 + heatLevel * 0.04), now)
      master.connect(ctx.destination)

      const baseFreq = 90 + heatLevel * 8
      const thud = ctx.createOscillator()
      const thudG = ctx.createGain()
      thud.type = 'triangle'
      thud.frequency.setValueAtTime(baseFreq, now)
      thudG.gain.setValueAtTime(0.75, now)
      thudG.gain.exponentialRampToValueAtTime(0.001, now + 0.08)
      thud.connect(thudG)
      thudG.connect(master)
      thud.start(now)
      thud.stop(now + 0.085)

      const pitchMult = 1 + heatLevel * 0.05
      const modes = [
        { freq: 580 * pitchMult, gain: 0.55, decay: 0.12 },
        { freq: 1180 * pitchMult, gain: 0.5, decay: 0.18 },
        { freq: 2360 * pitchMult, gain: 0.35, decay: 0.1 },
      ]

      modes.forEach((m) => {
        const osc = ctx.createOscillator()
        const g = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(m.freq, now)
        g.gain.setValueAtTime(m.gain, now)
        g.gain.exponentialRampToValueAtTime(0.001, now + m.decay)
        osc.connect(g)
        g.connect(master)
        osc.start(now)
        osc.stop(now + m.decay + 0.01)
      })
    } catch {
      // Audio seguro
    }
  }
}

export const sound = new SoundSystem()
