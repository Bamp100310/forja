/**
 * Categorías base sugeridas. No contienen importes ni datos financieros.
 * La migración SQL `ensure_user_setup` crea exactamente esta misma lista para
 * cada usuario nuevo (mantener sincronizadas).
 */
import type { CategoryKind, SystemCategoryKey } from './types'

export interface DefaultCategory {
  kind: CategoryKind
  name: string
  icon: string
  color: string
  isMoto: boolean
  systemKey: SystemCategoryKey | null
}

export const DEFAULT_CATEGORIES: readonly DefaultCategory[] = [
  // Ingresos
  { kind: 'income', name: 'Salario / Nómina fija', icon: 'briefcase', color: '#34d399', isMoto: false, systemKey: null },
  { kind: 'income', name: 'Quincena', icon: 'briefcase', color: '#10b981', isMoto: false, systemKey: null },
  { kind: 'income', name: 'Honorarios y Trabajos', icon: 'hammer', color: '#b8e05a', isMoto: false, systemKey: null },
  { kind: 'income', name: 'Rappi', icon: 'bike', color: '#ff7a59', isMoto: true, systemKey: null },
  { kind: 'income', name: 'DiDi Food', icon: 'bike', color: '#ffb347', isMoto: true, systemKey: null },
  { kind: 'income', name: 'Clicoh', icon: 'package', color: '#5ee6c9', isMoto: true, systemKey: null },
  { kind: 'income', name: 'Viajes particulares', icon: 'route', color: '#7cc6fe', isMoto: true, systemKey: null },
  { kind: 'income', name: 'Ingresos ocasionales', icon: 'sparkles', color: '#c59bff', isMoto: false, systemKey: null },
  { kind: 'income', name: 'Otros ingresos', icon: 'coins', color: '#9fb4ae', isMoto: false, systemKey: null },
  { kind: 'income', name: 'Propinas', icon: 'heart-handshake', color: '#ffd166', isMoto: true, systemKey: 'tips' },
  { kind: 'income', name: 'Intereses ganados', icon: 'percent', color: '#6ee7b7', isMoto: false, systemKey: 'interest_income' },
  // Gastos
  { kind: 'expense', name: 'Alimentación', icon: 'utensils', color: '#ff7a7a', isMoto: false, systemKey: null },
  { kind: 'expense', name: 'Pizza y Domicilios', icon: 'pizza', color: '#fb923c', isMoto: false, systemKey: null },
  { kind: 'expense', name: 'Mercado y Supermercado', icon: 'shopping-bag', color: '#fbbf24', isMoto: false, systemKey: null },
  { kind: 'expense', name: 'Cafetería y Panadería', icon: 'coffee', color: '#eab308', isMoto: false, systemKey: null },
  { kind: 'expense', name: 'Transporte y Taxis', icon: 'bike', color: '#38bdf8', isMoto: false, systemKey: null },
  { kind: 'expense', name: 'Gasolina', icon: 'fuel', color: '#ff9f43', isMoto: true, systemKey: null },
  { kind: 'expense', name: 'Mantenimiento moto', icon: 'wrench', color: '#f6c453', isMoto: true, systemKey: null },
  { kind: 'expense', name: 'Repuestos, llantas y aceite', icon: 'cog', color: '#e8a33d', isMoto: true, systemKey: null },
  { kind: 'expense', name: 'Reparaciones', icon: 'hammer', color: '#d98b3a', isMoto: true, systemKey: null },
  { kind: 'expense', name: 'Comisiones de plataforma', icon: 'receipt', color: '#c77d4f', isMoto: true, systemKey: 'platform_commission' },
  { kind: 'expense', name: 'Arriendo y Vivienda', icon: 'home', color: '#818cf8', isMoto: false, systemKey: null },
  { kind: 'expense', name: 'Servicios Públicos', icon: 'wifi', color: '#60a5fa', isMoto: false, systemKey: null },
  { kind: 'expense', name: 'Internet hogar', icon: 'wifi', color: '#60a5fa', isMoto: false, systemKey: null },
  { kind: 'expense', name: 'Celular y datos', icon: 'smartphone', color: '#38bdf8', isMoto: false, systemKey: null },
  { kind: 'expense', name: 'Suscripciones', icon: 'gamepad-2', color: '#a78bfa', isMoto: false, systemKey: null },
  { kind: 'expense', name: 'Compras personales', icon: 'shopping-bag', color: '#f472b6', isMoto: false, systemKey: null },
  { kind: 'expense', name: 'Salidas y entretenimiento', icon: 'party-popper', color: '#fb7185', isMoto: false, systemKey: null },
  { kind: 'expense', name: 'Salud y Farmacia', icon: 'heart-pulse', color: '#4ade80', isMoto: false, systemKey: null },
  { kind: 'expense', name: 'Intereses y cargos financieros', icon: 'percent', color: '#ff6b81', isMoto: false, systemKey: 'financial_interest' },
  { kind: 'expense', name: 'Comisiones y cuotas de manejo', icon: 'landmark', color: '#e05f7a', isMoto: false, systemKey: 'financial_fees' },
  { kind: 'expense', name: 'Imprevistos', icon: 'triangle-alert', color: '#facc15', isMoto: false, systemKey: null },
  { kind: 'expense', name: 'Otros gastos', icon: 'circle-ellipsis', color: '#94a3b8', isMoto: false, systemKey: null },
]
