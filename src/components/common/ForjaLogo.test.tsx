import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ForjaLogo, IRON_MELT_TEMP_C } from './ForjaLogo'
import { sound } from '../../services/sound'

describe('FORJA III — Logotipo e Interacción Termodinámica Procedural (Secciones 5 y 11)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the FORJA III wordmark and subtitle at ambient temperature (25°C)', () => {
    render(<ForjaLogo variant="full" showSubtitle={true} />)
    const logo = screen.getByTestId('forja-iii-logo')
    expect(logo).toBeInTheDocument()
    expect(logo).toHaveAttribute('data-heat-stage', '0')
    expect(logo).toHaveAttribute('data-temp-c', '25')
    expect(screen.getByText('FORJA')).toBeInTheDocument()
    expect(screen.getByText(/TALLER FINANCIERO/i)).toBeInTheDocument()
  })

  it('heats procedurally across dozens of hammer strikes up to iron fusion (1538°C+) and quenches in water without playing financial confirm sounds', () => {
    const anvilSpy = vi.spyOn(sound, 'playAnvilHit')
    const quenchSpy = vi.spyOn(sound, 'playQuenchSteam')
    const incomeSpy = vi.spyOn(sound, 'playIncome')
    const confirmSpy = vi.spyOn(sound, 'playConfirm')

    render(<ForjaLogo variant="compact" />)
    const logo = screen.getByTestId('forja-iii-logo')

    // Strike 45 times in rapid succession to build cadence and surpass 1538°C
    let prevTemp = 25
    for (let i = 1; i <= 45; i++) {
      fireEvent.click(logo)
      const currentTemp = Number(logo.getAttribute('data-temp-c'))
      expect(currentTemp).toBeGreaterThanOrEqual(prevTemp)
      prevTemp = currentTemp
    }

    expect(prevTemp).toBeGreaterThanOrEqual(IRON_MELT_TEMP_C)
    expect(logo).toHaveAttribute('data-heat-stage', '5')
    expect(logo).toHaveAttribute('data-strikes', '45')
    expect(screen.getAllByText(/FUSIÓN DEL HIERRO|PLASMA SOLAR/i).length).toBeGreaterThan(0)
    expect(anvilSpy).toHaveBeenCalledTimes(45)
    expect(incomeSpy).not.toHaveBeenCalled()
    expect(confirmSpy).not.toHaveBeenCalled()

    // Clicking the "💧 TEMPLAR" button quenches in water and resets to 25°C (stage 0)
    const quenchBtn = screen.getByRole('button', { name: /TEMPLAR/i })
    fireEvent.click(quenchBtn)
    expect(logo).toHaveAttribute('data-heat-stage', '0')
    expect(logo).toHaveAttribute('data-temp-c', '25')
    expect(quenchSpy).toHaveBeenCalledTimes(1)
  })

  it('supports keyboard activation with Enter and Space and exposes live temperature in aria-label', () => {
    render(<ForjaLogo variant="compact" />)
    const logo = screen.getByTestId('forja-iii-logo')

    expect(logo).toHaveAttribute('role', 'button')
    expect(logo).toHaveAttribute('tabIndex', '0')

    fireEvent.keyDown(logo, { key: 'Enter' })
    const temp1 = Number(logo.getAttribute('data-temp-c'))
    expect(temp1).toBeGreaterThan(25)

    fireEvent.keyDown(logo, { key: ' ' })
    const temp2 = Number(logo.getAttribute('data-temp-c'))
    expect(temp2).toBeGreaterThan(temp1)
    expect(logo.getAttribute('aria-label')).toContain(`${temp2}°C`)
  })
})
