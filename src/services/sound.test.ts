import { describe, it, expect, beforeEach } from 'vitest'
import { sound } from './sound'

describe('sound service', () => {
  beforeEach(() => {
    localStorage.clear()
    sound.setMuted(false)
    sound.setVolume(0.5)
  })

  it('permite alternar el estado de silencio (muted) y persiste en localStorage', () => {
    expect(sound.isMuted()).toBe(false)
    sound.setMuted(true)
    expect(sound.isMuted()).toBe(true)
    expect(localStorage.getItem('forja_sound_muted')).toBe('true')
    sound.setMuted(false)
    expect(sound.isMuted()).toBe(false)
    expect(localStorage.getItem('forja_sound_muted')).toBe('false')
  })

  it('ajusta el volumen asegurando rango [0, 1] y persiste en localStorage', () => {
    sound.setVolume(0.8)
    expect(sound.getVolume()).toBe(0.8)
    expect(localStorage.getItem('forja_sound_volume')).toBe('0.8')

    // Clamping superior
    sound.setVolume(1.5)
    expect(sound.getVolume()).toBe(1)

    // Clamping inferior
    sound.setVolume(-0.2)
    expect(sound.getVolume()).toBe(0)
  })

  it('no arroja excepciones al invocar los métodos de sonido cuando no hay AudioContext o está silenciado', () => {
    expect(() => {
      sound.playClick()
      sound.playConfirm()
      sound.playIncome()
      sound.playExpense()
      sound.playError()
    }).not.toThrow()

    sound.setMuted(true)
    expect(() => {
      sound.playClick()
      sound.playConfirm()
      sound.playIncome()
      sound.playExpense()
      sound.playError()
    }).not.toThrow()
  })
})
