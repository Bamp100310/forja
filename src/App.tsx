import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ForjaProvider } from './context/ForjaContext'
import { AppLayout } from './components/layout/AppLayout'
import { PixelSparks } from './components/common/PixelSparks'
import { PixelSprite } from './components/common/PixelSprite'
import { ModuleGuard } from './components/common/ModuleGuard'
import { LoginPage } from './pages/LoginPage'
import { ConfigErrorPage } from './pages/ConfigErrorPage'
import { DashboardPage } from './pages/DashboardPage'
import { TransactionsPage } from './pages/TransactionsPage'
import { MotoPage } from './pages/MotoPage'
import { AccountsPage } from './pages/AccountsPage'
import { PayrollPage } from './pages/PayrollPage'
import { DebtsPage } from './pages/DebtsPage'
import { LoansPage } from './pages/LoansPage'
import { RecurringPage } from './pages/RecurringPage'
import { PlanningPage } from './pages/PlanningPage'
import { ReportsPage } from './pages/ReportsPage'
import { SettingsPage } from './pages/SettingsPage'

function AuthenticatedApp() {
  const { user, loading, isConfigured } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f0d] flex flex-col items-center justify-center text-slate-200">
        <PixelSprite name="cog" size={44} className="animate-spin-slow" />
        <p className="mt-4 font-stencil text-emerald-400 text-xs tracking-widest animate-pulse">
          ENCENDIENDO LA MAQUINARIA DEL TALLER...
        </p>
      </div>
    )
  }

  // Si Supabase no está configurado (variables ausentes), mostrar pantalla comprensible
  if (!isConfigured) {
    return <ConfigErrorPage />
  }

  // Si Supabase está configurado pero no hay sesión activa, exigir autenticación
  if (!user) {
    return <LoginPage />
  }

  // Usuario autenticado: cargar el taller privado con persistencia en Supabase
  return (
    <ForjaProvider>
      <PixelSparks />
      <HashRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="movimientos" element={<TransactionsPage />} />
            <Route path="cuentas" element={<AccountsPage />} />
            <Route
              path="nomina"
              element={
                <ModuleGuard moduleId="payroll">
                  <PayrollPage />
                </ModuleGuard>
              }
            />
            <Route
              path="taller-moto"
              element={
                <ModuleGuard moduleId="moto">
                  <MotoPage />
                </ModuleGuard>
              }
            />
            <Route
              path="deudas"
              element={
                <ModuleGuard moduleId="debts_loans">
                  <DebtsPage />
                </ModuleGuard>
              }
            />
            <Route
              path="prestamos"
              element={
                <ModuleGuard moduleId="debts_loans">
                  <LoansPage />
                </ModuleGuard>
              }
            />
            <Route
              path="recurrentes"
              element={
                <ModuleGuard moduleId="recurring">
                  <RecurringPage />
                </ModuleGuard>
              }
            />
            <Route
              path="presupuestos"
              element={
                <ModuleGuard moduleId="budgets">
                  <PlanningPage />
                </ModuleGuard>
              }
            />
            <Route
              path="informes"
              element={
                <ModuleGuard moduleId="reports">
                  <ReportsPage />
                </ModuleGuard>
              }
            />
            <Route path="configuracion" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </ForjaProvider>
  )
}

export function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  )
}

export default App
