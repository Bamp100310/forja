/**
 * FORJA V2 — Registro Centralizado de Módulos Opcionales
 * 
 * Permite que cada usuario configure las capacidades de su taller financiero
 * sin condiciones dispersas en componentes ni identidades codificadas rígidamente.
 */

export type ModuleId =
  | 'moto'
  | 'platforms'
  | 'payroll'
  | 'budgets'
  | 'debts_loans'
  | 'recurring'
  | 'goals'
  | 'reports'

export interface ModuleDefinition {
  id: ModuleId
  name: string
  shortName: string
  tagline: string
  description: string
  iconName: string // Nombre de PixelSprite o Lucide
  category: 'operations' | 'personal' | 'planning' | 'analytics'
  routes: string[]
  navItem?: {
    to: string
    label: string
    sprite: string
    exact?: boolean
  }
  dependencies: ModuleId[]
  isCore: boolean
  defaultInWorkshop: boolean
  defaultInPersonal: boolean
}

export const MODULE_REGISTRY: Record<ModuleId, ModuleDefinition> = {
  moto: {
    id: 'moto',
    name: 'Taller de Moto y Jornadas',
    shortName: 'Taller Moto',
    tagline: 'Seguimiento de rodaje, combustible, odómetro y mantenimientos',
    description:
      'Control integral del vehículo: registro de turnos de trabajo, consumo y coste por km, cambios de aceite y alertas preventivas/correctivas.',
    iconName: 'moto',
    category: 'operations',
    routes: ['/taller-moto'],
    navItem: {
      to: '/taller-moto',
      label: 'Taller Moto',
      sprite: 'moto',
    },
    dependencies: [],
    isCore: false,
    defaultInWorkshop: true,
    defaultInPersonal: false,
  },
  platforms: {
    id: 'platforms',
    name: 'Ingresos por Plataformas',
    shortName: 'Plataformas',
    tagline: 'Liquidación de saldos de Rappi, DiDi, Clicoh y pedidos en efectivo',
    description:
      'Manejo de cuentas por cobrar de aplicaciones de reparto, desglose de propinas y comisiones, y liquidación de dinero cobrado en mano a efectivo.',
    iconName: 'cargo',
    category: 'operations',
    routes: [],
    dependencies: [],
    isCore: false,
    defaultInWorkshop: true,
    defaultInPersonal: false,
  },
  payroll: {
    id: 'payroll',
    name: 'Nómina y Quincenas',
    shortName: 'Quincenas',
    tagline: 'Calendario de salarios, días hasta el pago y presupuesto disponible',
    description:
      'Programación de pagos quincenales o mensuales, estimación de dinero restante hasta el siguiente sueldo y registro fácil de pagos recibidos.',
    iconName: 'sack',
    category: 'personal',
    routes: ['/nomina'],
    navItem: {
      to: '/nomina',
      label: 'Quincenas',
      sprite: 'sack',
    },
    dependencies: [],
    isCore: false,
    defaultInWorkshop: false,
    defaultInPersonal: true,
  },
  budgets: {
    id: 'budgets',
    name: 'Presupuestos por Categoría',
    shortName: 'Presupuestos',
    tagline: 'Límites de gasto en alimentación, mercado, salidas y servicios',
    description:
      'Fija techos máximos de gasto por categoría para el periodo actual y recibe alertas visuales cuando te aproximes al límite.',
    iconName: 'flag',
    category: 'planning',
    routes: ['/presupuestos'],
    navItem: {
      to: '/presupuestos',
      label: 'Metas y Límites',
      sprite: 'flag',
    },
    dependencies: [],
    isCore: false,
    defaultInWorkshop: true,
    defaultInPersonal: true,
  },
  debts_loans: {
    id: 'debts_loans',
    name: 'Deudas y Préstamos',
    shortName: 'Deudas / Préstamos',
    tagline: 'Obligaciones bancarias, tarjetas de crédito y préstamos a terceros',
    description:
      'Amortización de créditos, días de corte de tarjetas, cálculo de cuotas sugeridas y seguimiento de dinero prestado a amigos o familiares.',
    iconName: 'chain',
    category: 'planning',
    routes: ['/deudas', '/prestamos'],
    navItem: {
      to: '/deudas',
      label: 'Deudas',
      sprite: 'chain',
    },
    dependencies: [],
    isCore: false,
    defaultInWorkshop: true,
    defaultInPersonal: false,
  },
  recurring: {
    id: 'recurring',
    name: 'Compromisos y Gastos Fijos',
    shortName: 'Gastos Fijos',
    tagline: 'Suscripciones, arriendo, servicios públicos y pagos periódicos',
    description:
      'Registro de cobros automáticos e ingresos recurrentes con fechas programadas, recordatorios y distinción de compromisos pendientes.',
    iconName: 'calendar',
    category: 'planning',
    routes: ['/recurrentes'],
    navItem: {
      to: '/recurrentes',
      label: 'Gastos Fijos',
      sprite: 'calendar',
    },
    dependencies: [],
    isCore: false,
    defaultInWorkshop: true,
    defaultInPersonal: true,
  },
  goals: {
    id: 'goals',
    name: 'Metas de Ahorro',
    shortName: 'Ahorro',
    tagline: 'Fondos de emergencia, reservas para viajes y proyectos',
    description:
      'Establece metas financieras con fecha e importe objetivo y monitoriza la evolución del capital acumulado.',
    iconName: 'vault',
    category: 'planning',
    routes: [],
    dependencies: [],
    isCore: false,
    defaultInWorkshop: true,
    defaultInPersonal: true,
  },
  reports: {
    id: 'reports',
    name: 'Informes y Estadísticas',
    shortName: 'Informes',
    tagline: 'Evolución de ingresos/gastos, balance patrimonial y tendencias',
    description:
      'Gráficos detallados de flujo de caja, distribución de gastos por categoría y comparación entre periodos.',
    iconName: 'blueprint',
    category: 'analytics',
    routes: ['/informes'],
    navItem: {
      to: '/informes',
      label: 'Informes',
      sprite: 'blueprint',
    },
    dependencies: [],
    isCore: false,
    defaultInWorkshop: true,
    defaultInPersonal: true,
  },
}

export const ALL_MODULE_IDS: ModuleId[] = [
  'moto',
  'platforms',
  'payroll',
  'budgets',
  'debts_loans',
  'recurring',
  'goals',
  'reports',
]

/** Configuración de módulos para el perfil de Taller / Operación (Alejo) */
export const WORKSHOP_PRESET_MODULES: ModuleId[] = [
  'moto',
  'platforms',
  'debts_loans',
  'recurring',
  'budgets',
  'goals',
  'reports',
]

/** Configuración de módulos para el perfil de Finanzas Personales / Asalariado (Pareja) */
export const PERSONAL_PRESET_MODULES: ModuleId[] = [
  'payroll',
  'budgets',
  'recurring',
  'goals',
  'reports',
]

export function isModuleEnabled(enabledModules: ModuleId[] | undefined, moduleId: ModuleId): boolean {
  if (!enabledModules || !Array.isArray(enabledModules)) {
    // Si no está definido (usuario previo sin tabla), activa módulos de taller para compatibilidad retroactiva 100%
    return WORKSHOP_PRESET_MODULES.includes(moduleId)
  }
  return enabledModules.includes(moduleId)
}

export function canDisableModule(
  moduleId: ModuleId,
  currentEnabled: ModuleId[]
): { allowed: boolean; reason?: string } {
  // Verificar si otros módulos activos dependen de este
  const dependents = currentEnabled.filter((id) => {
    const def = MODULE_REGISTRY[id]
    return def && def.dependencies.includes(moduleId)
  })

  if (dependents.length > 0) {
    const dependentNames = dependents.map((id) => MODULE_REGISTRY[id]?.name || id).join(', ')
    return {
      allowed: false,
      reason: `No puedes desactivar ${MODULE_REGISTRY[moduleId].name} porque los siguientes módulos activos dependen de él: ${dependentNames}.`,
    }
  }

  return { allowed: true }
}
