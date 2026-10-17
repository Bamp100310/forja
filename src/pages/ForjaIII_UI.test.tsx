import { describe, expect, it } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { formatCOP } from '../domain/money'
import { forjaApi } from '../services/api'
import { ForjaProvider } from '../context/ForjaContext'
import { AuthContext } from '../context/AuthContext'
import { DashboardPage } from './DashboardPage'
import { TransactionsPage } from './TransactionsPage'
import { SettingsPage } from './SettingsPage'
import { AccountsPage } from './AccountsPage'

const mockAuthValue = {
  user: {
    id: '00000000-0000-0000-0000-000000000000',
    email: 'operario@forja.local',
  } as never,
  session: null,
  loading: false,
  isConfigured: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  enterDemoMode: () => {},
}

describe('FORJA III — Verificación de interfaz, perfiles adaptativos y legibilidad numérica', () => {
  it('formatea con precisión y distinción visual los montos críticos de control ($5.000, $8.200, $25.500, $58.280, $1.234.567)', () => {
    const criticalAmounts = [
      { raw: 5000, expected: '5.000' },
      { raw: 8200, expected: '8.200' },
      { raw: 25500, expected: '25.500' },
      { raw: 58280, expected: '58.280' },
      { raw: 1234567, expected: '1.234.567' },
    ]

    for (const item of criticalAmounts) {
      const formatted = formatCOP(item.raw).replace(/\u00a0/g, ' ')
      expect(formatted).toContain(item.expected)
    }
  })

  it('renderiza el Dashboard en modo Taller Industrial Completo con bahía de motocicleta cuando moto está activo', async () => {
    await forjaApi.updateUserPreferences({
      enabledModules: [
        'payroll',
        'moto',
        'platforms',
        'debts_loans',
        'recurring',
        'budgets',
        'goals',
        'reports',
      ],
      cycleConfig: { type: 'custom_cut', cutStartDay: 11 },
      onboardingCompleted: true,
    })

    render(
      <MemoryRouter>
        <AuthContext.Provider value={mockAuthValue}>
          <ForjaProvider>
            <DashboardPage />
          </ForjaProvider>
        </AuthContext.Provider>
      </MemoryRouter>,
    )

    expect(await screen.findByText(/PUENTE DE MANDO Y PRODUCCIÓN/i)).toBeTruthy()
    expect(screen.getByText(/LÍNEA DE PRODUCCIÓN Y FLUJO DE CAJA/i)).toBeTruthy()
    expect(screen.getByText(/ESTACIÓN MECÁNICA:/i)).toBeTruthy()
  })

  it('reorganiza el Dashboard al Perfil de Finanzas Personales ocultando la bahía de motocicleta cuando moto y platforms están desactivados', async () => {
    await forjaApi.updateUserPreferences({
      enabledModules: [
        'payroll',
        'debts_loans',
        'recurring',
        'budgets',
        'goals',
        'reports',
      ],
      cycleConfig: { type: 'calendar_month', cutStartDay: 1 },
      onboardingCompleted: true,
    })

    render(
      <MemoryRouter>
        <AuthContext.Provider value={mockAuthValue}>
          <ForjaProvider>
            <DashboardPage />
          </ForjaProvider>
        </AuthContext.Provider>
      </MemoryRouter>,
    )

    expect(await screen.findByText(/CENTRO DE TESORERÍA Y LIQUIDEZ/i)).toBeTruthy()
    expect(screen.queryByText(/ESTACIÓN MECÁNICA:/i)).toBeNull()
    expect(screen.getByText(/COMPROMISOS Y VENCIMIENTOS PRÓXIMOS/i)).toBeTruthy()
  })

  it('renderiza el Libro de Movimientos con soporte dual (tarjetas móviles y tabla de escritorio) y oculta filtro SOLO MOTO si el módulo moto está inactivo', async () => {
    await forjaApi.updateUserPreferences({
      enabledModules: ['payroll'],
      cycleConfig: { type: 'calendar_month', cutStartDay: 1 },
      onboardingCompleted: true,
    })

    render(
      <MemoryRouter>
        <AuthContext.Provider value={mockAuthValue}>
          <ForjaProvider>
            <TransactionsPage />
          </ForjaProvider>
        </AuthContext.Provider>
      </MemoryRouter>,
    )

    expect(await screen.findByText(/REGISTRO OPERATIVO DE MOVIMIENTOS/i)).toBeTruthy()
    expect(screen.queryByText(/SOLO MOTO/i)).toBeNull()
  })

  it('permite alternar presets modulares en SettingsPage manteniendo FORJA CORE blindado', async () => {
    render(
      <MemoryRouter>
        <AuthContext.Provider value={mockAuthValue}>
          <ForjaProvider>
            <SettingsPage />
          </ForjaProvider>
        </AuthContext.Provider>
      </MemoryRouter>,
    )

    expect(await screen.findByText(/TERMINAL DE CONFIGURACIÓN Y TALLER/i)).toBeTruthy()
    const personalBtn = screen.getByRole('button', { name: /PREAJUSTE PERSONAL/i })
    fireEvent.click(personalBtn)
    expect(screen.getByText(/PERSONALIZAR MI FORJA/i)).toBeTruthy()
  })

  it('permite entrar individualmente a una bóveda en AccountsPage y ver su extracto Kardex con saldo corrido', async () => {
    render(
      <MemoryRouter>
        <AuthContext.Provider value={mockAuthValue}>
          <ForjaProvider>
            <AccountsPage />
          </ForjaProvider>
        </AuthContext.Provider>
      </MemoryRouter>,
    )

    expect(await screen.findByText(/BÓVEDAS Y DISPONIBILIDAD LÍQUIDA/i)).toBeTruthy()
    const openButtons = await screen.findAllByRole('button', { name: /VER TODOS LOS MOVIMIENTOS/i })
    expect(openButtons.length).toBeGreaterThan(0)

    fireEvent.click(openButtons[0])
    expect(await screen.findByText(/EXTRACTO DE BÓVEDA:/i)).toBeTruthy()
    expect(screen.getByText(/1\. SALDO INICIAL DE APERTURA/i)).toBeTruthy()
    expect(screen.getByText(/2\. TOTAL ENTRADAS A BÓVEDA/i)).toBeTruthy()
    expect(screen.getByText(/3\. TOTAL SALIDAS DE BÓVEDA/i)).toBeTruthy()
    expect(screen.getByText(/4\. SALDO ACTUAL EN BÓVEDA/i)).toBeTruthy()
  })
})

