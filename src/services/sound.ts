/**
 * FORJA — Motor de Sonido Mecánico, Steampunk e Industrial (Web Audio API)
 *
 * Síntesis acústica procedural en tiempo real:
 * - Sin barridos de frecuencia electrónicos ("zero laser pitch-drops").
 * - Síntesis modal física basada en frecuencias resonantes fijas de hierro fundido,
 *   acero de yunque y campana de latón (estilo Satisfactory, Graveyard Keeper y relojería industrial).
 * - Transitorios de fricción e impactos de dientes de engranaje mediante ráfagas de ruido moldeadas.
 * - Cero dependencias externas, cero latencia, protección contra saturación por rebote (debouncing).
 * - Accesible con controles de volumen y silenciado persistidos en localStorage.
 */

const STORAGE_KEY_MUTED = 'forja_sound_muted'
const STORAGE_KEY_VOLUME = 'forja_sound_volume'

let audioCtx: AudioContext | null = null
let sharedNoiseBuffer: AudioBuffer | null = null

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
    audioCtx.resume().catch(() => {
      // Ignorar rechazo silencioso si el usuario aún no ha interactuado
    })
  }
  return audioCtx
}

function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (!sharedNoiseBuffer || sharedNoiseBuffer.sampleRate !== ctx.sampleRate) {
    const bufferSize = Math.floor(ctx.sampleRate * 0.5) // 500ms de ruido estático
    sharedNoiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = sharedNoiseBuffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }
  }
  return sharedNoiseBuffer
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

  /**
   * Clic mecánico steampunk: pulsación seca de interruptor de cuchilla de latón
   * o percutor de máquina de escribir antigua.
   * Sin caída de tono electrónica: solo impacto de metal sólido y rebote de resorte.
   */
  playClick() {
    if (this.muted || this.volume <= 0 || this.shouldThrottle('click', 30)) return
    try {
      const ctx = getAudioContext()
      if (!ctx) return
      const now = ctx.currentTime

      const master = ctx.createGain()
      master.gain.setValueAtTime(this.volume * 0.45, now)
      master.connect(ctx.destination)

      // 1. Ruido de contacto seco (fricción de latón/hierro, 2.5ms)
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

      // 2. Resonancias modales fijas del cuerpo de latón/acero (sin barrido de tono)
      const clickModes = [
        { freq: 360, gain: 0.6, decay: 0.014 },  // golpe en el chasis
        { freq: 1180, gain: 0.35, decay: 0.012 }, // lámina metálica
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

  /**
   * Enganche metálico / cerrojo steampunk: pestillo de caldera de hierro fundido
   * o seguro de engranaje encajando con fuerza en su muesca.
   * "CLANK-CHUCK" mecánico y pesado.
   */
  playConfirm() {
    if (this.muted || this.volume <= 0 || this.shouldThrottle('confirm', 45)) return
    try {
      const ctx = getAudioContext()
      if (!ctx) return
      const now = ctx.currentTime

      const master = ctx.createGain()
      master.gain.setValueAtTime(this.volume * 0.42, now)
      master.connect(ctx.destination)

      // 1. Fricción y choque de hierro contra hierro (doble impacto 10ms)
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

      // 2. Modos resonantes acústicos de barra y placa de hierro fundido (frecuencias fijas)
      const ironModes = [
        { freq: 215, gain: 0.5, decay: 0.055 },  // masa de hierro pesado
        { freq: 470, gain: 0.45, decay: 0.065 }, // cuerpo de la barra
        { freq: 940, gain: 0.35, decay: 0.045 }, // chasquido metálico
        { freq: 1680, gain: 0.2, decay: 0.03 },  // arista de acero
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

  /**
   * Ingreso / cobro steampunk: caja registradora mecánica antigua del siglo XIX.
   * Trinquete de engranajes de cuerda ("kr-r-r") seguido del golpe de campana de latón macizo.
   */
  playIncome() {
    if (this.muted || this.volume <= 0 || this.shouldThrottle('income', 60)) return
    try {
      const ctx = getAudioContext()
      if (!ctx) return
      const now = ctx.currentTime

      const master = ctx.createGain()
      master.gain.setValueAtTime(this.volume * 0.45, now)
      master.connect(ctx.destination)

      // 1. Trinquete mecánico: 3 pasos de dientes de engranaje rápidos (t=0, t=14ms, t=28ms)
      ;[0, 0.014, 0.028].forEach((offset) => {
        const t = now + offset
        // Chasquido de diente
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

        // Resonancia metálica del piñón
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

      // 2. Golpe de campana de latón de la caja (se dispara a los 32ms)
      const bellTime = now + 0.032

      // Impacto del percutor sobre el latón
      const strikeNoise = ctx.createBufferSource()
      strikeNoise.buffer = getNoiseBuffer(ctx)
      const strikeFilter = ctx.createBiquadFilter()
      strikeFilter.type = 'highpass'
      strikeFilter.frequency.setValueAtTime(2600, bellTime)

      const strikeG = ctx.createGain()
      strikeG.gain.setValueAtTime(0.35, bellTime)
      strikeG.gain.exponentialRampToValueAtTime(0.001, bellTime + 0.01)

      strikeNoise.connect(strikeFilter)
      strikeFilter.connect(strikeG)
      strikeG.connect(master)

      strikeNoise.start(bellTime)
      strikeNoise.stop(bellTime + 0.012)

      // Modos acústicos de campana de latón (frecuencias fijas reales de latón macizo)
      const brassModes = [
        { freq: 392.0, gain: 0.35, decay: 0.13 },  // subarmónico de campana (G4)
        { freq: 783.99, gain: 0.65, decay: 0.19 }, // fundamental brillante (G5)
        { freq: 1174.66, gain: 0.45, decay: 0.15 },// quinta superior metálica (D6)
        { freq: 1960.0, gain: 0.25, decay: 0.09 }, // borde de campana brillante
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

  /**
   * Gasto / pago steampunk: golpe de martillo en yunque de herrero / troquel de forja pesada.
   * "CLANG-THUMP" con el cantar característico del acero macizo (Satisfactory / Graveyard Keeper).
   */
  playExpense() {
    if (this.muted || this.volume <= 0 || this.shouldThrottle('expense', 60)) return
    try {
      const ctx = getAudioContext()
      if (!ctx) return
      const now = ctx.currentTime

      const master = ctx.createGain()
      master.gain.setValueAtTime(this.volume * 0.48, now)
      master.connect(ctx.destination)

      // 1. Golpe sordo de masa de hierro (choque pesado)
      const thud = ctx.createOscillator()
      const thudG = ctx.createGain()
      thud.type = 'sine'
      thud.frequency.setValueAtTime(82, now) // Masa fija de 82 Hz (sin pitch drop)

      thudG.gain.setValueAtTime(0.7, now)
      thudG.gain.exponentialRampToValueAtTime(0.001, now + 0.075)

      thud.connect(thudG)
      thudG.connect(master)

      thud.start(now)
      thud.stop(now + 0.08)

      // 2. Ruido de aplastamiento y fricción de metal frío
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

      // 3. El cantar resonante del yunque de acero (frecuencias fijas del cuerno y cuerpo)
      const anvilModes = [
        { freq: 560, gain: 0.5, decay: 0.09 },   // cintura del yunque
        { freq: 1140, gain: 0.45, decay: 0.13 }, // cantar del cuerno de acero
        { freq: 2280, gain: 0.3, decay: 0.07 },  // brillo del templado
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

  /**
   * Error / aviso steampunk: engranaje trabado o palanca mecánica bloqueada.
   * Golpe sordo disonante de hierro con fricción de dientes que resbalan ("CLONK-GRR").
   */
  playError() {
    if (this.muted || this.volume <= 0 || this.shouldThrottle('error', 60)) return
    try {
      const ctx = getAudioContext()
      if (!ctx) return
      const now = ctx.currentTime

      const master = ctx.createGain()
      master.gain.setValueAtTime(this.volume * 0.44, now)
      master.connect(ctx.destination)

      // 1. Golpe disonante de hierro trabado (dos masas fijas sin deslizamiento)
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

      // 2. Fricción áspera de diente de engranaje patinando
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
}

export const sound = new SoundSystem()
