# FORJA V2 — ESPECIFICACIÓN TÉCNICA Y ARQUITECTURA MODULAR

**Versión del documento:** 2.0.0  
**Fecha:** 14 de Octubre de 2026  
**Estado:** Aprobado para Implementación  
**Autor:** Antigravity Architect & Engineering Team  

---

## 1. Visión y Objetivos del Producto

FORJA evoluciona de una herramienta hiperespecializada en operaciones de motocicleta y reparto independiente a una **plataforma financiera personal modular, multiusuario y adaptable**.

### 1.1. Propósito Central
Permitir que perfiles con realidades económicas completamente dispares compartan el mismo motor contable de partida doble y la misma identidad visual de taller industrial pixel art (inspirada en *Graveyard Keeper* y *Satisfactory*), sin comprometer la experiencia de ninguno:
* **Perfil Operativo / Taller (Alejo):** Motocicleta, jornadas, odómetro, combustible, mantenimiento preventivo/correctivo, ingresos por plataformas (Rappi, DiDi, Clicoh), cobranzas en efectivo, ciclo de corte 11 al 10 y deudas estructuradas.
* **Perfil Finanzas Personales / Asalariado (Pareja):** Salario fijo/variable quincenal (fechas 1 y 15, o 15 y 30), control riguroso de gastos corrientes (alimentación, mercado, transporte, compras), cálculo de dinero disponible hasta el próximo pago, presupuestos por categoría y ciclo de mes natural.

### 1.2. Principios de Diseño Arquitectural
1. **Zero Hardcoding:** Prohibido el uso de comprobaciones del tipo `if (isAlejo)` o condicionales basadas en nombres de usuario. Todo el sistema opera bajo **capacidades habilitadas (`ModuleId`)**, datos de dominio y preferencias del usuario.
2. **Núcleo Financiero Soberano (FORJA CORE):** El libro contable, el registro de ingresos/gastos, las cuentas/bóvedas, las transferencias, la edición atómica y los balances funcionan de manera completa con **cero módulos opcionales activos**.
3. **Persistencia No Destructiva:** Desactivar un módulo **jamás elimina datos contables ni históricos**. Oculta la navegación, widgets y rutas, pero los asientos y tablas subyacentes se conservan intactos en la base de datos.
4. **Aislamiento Multiusuario Estricto:** Cada usuario autenticado en Supabase habita su propio universo financiero blindado por Row Level Security (`auth.uid() = user_id`).
5. **Identidad Visual FORJA II:** Estreno de la nueva marca gráfica con el numeral romano «II» tratado como placa metálica remachada artesanalmente.

---

## 2. Delimitación Arquitectural: FORJA CORE vs Módulos

```
                               ┌─────────────────────────────────────────────────────────┐
                               │                 APLICACIÓN FORJA V2                     │
                               │        (Identidad FORJA II · Pixel Art Industrial)       │
                               └────────────────────────────┬────────────────────────────┘
                                                            │
                     ┌──────────────────────────────────────┴──────────────────────────────────────┐
                     │                                                                            │
      ┌──────────────▼─────────────┐                                               ┌──────────────▼─────────────┐
      │         FORJA CORE         │                                               │     MÓDULOS OPCIONALES     │
      │   (Siempre Activo / Base)  │                                               │    (Activables por Usuario) │
      ├────────────────────────────┤                                               ├────────────────────────────┤
      │ • Motor Contable (Σ = 0)   │                                               │ [A] Moto y Taller          │
      │ • Cuentas y Bóvedas        │                                               │ [B] Plataformas de Reparto │
      │ • Ingresos y Gastos Base   │◄─────────────────────────────────────────────┤ [C] Nómina y Quincenas     │
      │ • Transferencias           │                                               │ [D] Presupuestos/Límites   │
      │ • Libro Diario y Edición   │                                               │ [E] Deudas y Préstamos     │
      │ • Categorías y Fuentes     │                                               │ [F] Gastos Recurrentes     │
      │ • Ciclo Financiero Dinámico│                                               │ [G] Metas de Ahorro        │
      │ • Auth y RLS Multiusuario  │                                               │ [H] Informes Avanzados     │
      │ • Sonido y Microchispas    │                                               │                            │
      └────────────────────────────┘                                               └────────────────────────────┘
```

### 2.1. FORJA CORE (Núcleo)
Componentes esenciales e inmutables:
* **Entidades:** `accounts` (bancos, efectivo, billeteras, ahorros), `categories` (ingresos y gastos básicos), `transactions` y `postings` (partida doble estricta).
* **Vistas y Navegación:**
  * `/` &rarr; Consola de Control (Dashboard adaptable).
  * `/movimientos` &rarr; Libro Diario (Historial, filtros, búsqueda, modal de detalle contable y edición atómica).
  * `/cuentas` &rarr; Gestión de Bóvedas (Saldos líquidos, aperturas, transferencias).
  * `/configuracion` &rarr; Perfil, Preferencias del Taller y Gestor de Módulos («Personalizar mi FORJA»).
* **Motor de Periodos:** Abstracción del cálculo de cortes (`FinancialCycleConfig`), parametrizable por usuario.

### 2.2. Registro de Módulos Opcionales (`src/domain/modules.ts`)

| Módulo ID | Nombre Oficial | Rutas Habilitadas | Dependencias | Widgets en Dashboard | Acceso Rápido |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `moto` | **Taller de Moto** | `/taller-moto` | Ninguna | Odómetro, consumo de combustible, horas de rodaje | Registrar turno / odómetro |
| `platforms` | **Plataformas de Reparto** | Integrado en `/cuentas` y modal | Ninguna | Saldo pendiente por cobrar en apps | Cobro de saldo a efectivo |
| `payroll` | **Nómina y Quincenas** | `/nomina` (o sección en `/`) | Ninguna | Próximo pago, días restantes, disponible proyectado | Registrar pago recibido |
| `budgets` | **Presupuestos y Límites** | `/presupuestos` | Ninguna | Barra de consumo por categoría del corte | Ajustar presupuesto |
| `debts_loans`| **Deudas y Préstamos** | `/deudas`, `/prestamos` | Ninguna | Nivel de apalancamiento, cuotas del mes | Pago de deuda / Préstamo |
| `recurring` | **Compromisos Fijos** | `/recurrentes` | Ninguna | Próximos vencimientos de la semana | Marcar recurrente pagado |
| `goals` | **Metas de Ahorro** | `/presupuestos#metas` | Ninguna | Progreso de objetivos de ahorro | Abonar a meta |
| `reports` | **Informes Avanzados** | `/informes` | Ninguna | Gráficos de tendencia y flujo neto | Exportar reporte |

---

## 3. Modelo de Configuración y Preferencias del Usuario

### 3.1. Esquema de Datos de Preferencias (`UserPreferences`)
```typescript
export type ModuleId =
  | 'moto'
  | 'platforms'
  | 'payroll'
  | 'budgets'
  | 'debts_loans'
  | 'recurring'
  | 'goals'
  | 'reports'

export type FinancialCycleType = 'custom_cut' | 'calendar_month' | 'biweekly'

export interface FinancialCycleConfig {
  type: FinancialCycleType
  /** Día de corte para custom_cut (ej. 11 para ciclo 11-10) */
  cutStartDay: number
  /** Días de quincena para biweekly (ej. [1, 15] o [15, 30]) */
  quincenaDays?: [number, number]
}

export interface IncomeSchedule {
  id: string
  name: string
  expectedAmount: number
  targetAccountId: string | null
  scheduleType: 'biweekly' | 'monthly' | 'custom_days'
  payDays: number[] // Ej: [1, 15] o [15, 30] o [5]
  isActive: boolean
  notes?: string | null
}

export interface UserPreferences {
  userId: string
  enabledModules: ModuleId[]
  cycleConfig: FinancialCycleConfig
  incomeSchedules: IncomeSchedule[]
  onboardingCompleted: boolean
  theme: 'industrial_dark'
}
```

### 3.2. Perfiles Predeterminados de Incorporación (Presets)

* **Preset Operador / Taller (Alejo):**
  * `enabledModules`: `['moto', 'platforms', 'debts_loans', 'recurring', 'budgets', 'goals', 'reports']`
  * `cycleConfig`: `{ type: 'custom_cut', cutStartDay: 11 }` (Ciclo histórico 11 al 10 de mes siguiente).
  * `incomeSchedules`: `[]`

* **Preset Finanzas Personales / Asalariado (Pareja):**
  * `enabledModules`: `['payroll', 'budgets', 'recurring', 'goals', 'reports']`
  * `cycleConfig`: `{ type: 'calendar_month', cutStartDay: 1 }`
  * `incomeSchedules`: `[{ name: 'Salario Quincenal', expectedAmount: 0, payDays: [1, 15], scheduleType: 'biweekly', isActive: true }]`

---

## 4. Lógica de Dominio: Nómina, Quincenas y Ciclos

### 4.1. Separación de Conceptos: Ingreso Previsto vs Ingreso Real
* **Regla Contable Inquebrantable:** Un ingreso previsto (quincena programada) **NUNCA genera un asiento contable ni altera el saldo disponible real**.
* **Cálculo de Proyección:**
  $$\text{Días hasta el pago} = \text{Días}(\text{FechaHoy}, \text{FechaPróximaQuincena})$$
  $$\text{Dinero Disponible Diario} = \frac{\text{Saldo Líquido Real}}{\max(1, \text{Días hasta el pago})}$$
* **Registro del Cobro de Quincena:**
  Cuando el usuario cobra su sueldo, pulsa el botón *"REGISTRAR PAGO RECIBIDO"*. El sistema precarga un formulario de ingreso normal (categoría de ingreso salarial &rarr; bóveda bancaria o efectivo) con el importe esperado prellenado (editable si llegó más o menos). Se asienta formalmente en el Libro Diario evitando duplicados.

### 4.2. Parametrización del Motor de Periodos (`period.ts`)
La función `getPeriodForDate(date, cycleConfig)` evalúa dinámicamente:
* Si `cycleConfig.type === 'custom_cut'`:
  * Aplica corte desde el día `cutStartDay` hasta `cutStartDay - 1` del mes siguiente. (Para `cutStartDay = 11`, replica al 100% el comportamiento original).
* Si `cycleConfig.type === 'calendar_month'`:
  * Inicia el día 1 del mes y finaliza el último día del mismo mes.
* Si `cycleConfig.type === 'biweekly'`:
  * Divide el mes en subperiodos según los días estipulados (ej. día 1 al 14, y día 15 al fin de mes).

---

## 5. Diseño y Arquitectura de la Base de Datos (Supabase)

### 5.1. Migración Incremental `20261014000000_forja_v2_modules_and_cycles.sql`
1. **Nueva tabla `public.user_preferences`:**
   ```sql
   create table if not exists public.user_preferences (
     user_id uuid primary key references auth.users(id) on delete cascade,
     enabled_modules text[] not null default '{moto,platforms,debts_loans,recurring,budgets,goals,reports}',
     cycle_config jsonb not null default '{"type": "custom_cut", "cutStartDay": 11}'::jsonb,
     income_schedules jsonb not null default '[]'::jsonb,
     onboarding_completed boolean not null default false,
     created_at timestamptz not null default now(),
     updated_at timestamptz not null default now()
   );
   ```
2. **Seguridad y RLS:**
   * RLS activado: `user_preferences` sólo es legible y editable por `auth.uid() = user_id`.
3. **Actualización de `ensure_user_setup()`:**
   * Al registrarse o iniciar sesión por primera vez, crea automáticamente el registro de preferencias si no existe, preservando la configuración completa de taller para usuarios previos y arrancando con asistentes limpios para usuarios nuevos.

---

## 6. Nueva Identidad de Marca: Wordmark FORJA II

### 6.1. Concepto Creativo
* Inspiración en la placa de forja y en el tratamiento de secuelas artesanales (referencia conceptual *Graveyard Keeper 2*).
* El término **FORJA** se mantiene con tipografía de bloque pixel art de hierro forjado con bisel de óxido y carbón.
* El numeral romano **`II`** se concibe como una **placa física superpuesta en latón pulido o cobre**, sujeta al cuerpo principal mediante **4 remaches/tachuelas mecánicas**, con sutil relieve de sombra 3D escalonada (estilo pixel art).
* **Variantes implementadas:**
  * `full`: Wordmark completo para Login, Onboarding y Welcome.
  * `compact`: Versión horizontal optimizada para la barra lateral (Sidebar) y encabezado móvil.
  * `icon`: Favicon e icono de PWA con el yunque de forja coronado con los dos remaches del número II.

---

## 7. Estrategia de Pruebas y Aceptación

1. **Pruebas de Partida Doble:** Las 14 pruebas de balance y las 78 pruebas unitarias deben continuar pasando al 100%.
2. **Pruebas de Módulos (`modules.test.ts`):**
   * Verificación de activación/desactivación sin mutar almacenes contables.
   * Route Guard: Intento de acceso a `/taller-moto` con módulo deshabilitado redirige a `/`.
3. **Pruebas de Ciclos Financieros (`period.test.ts`):**
   * Validación del corte 11-10 histórico.
   * Validación del corte de mes natural (1 al 30/31).
   * Validación de saltos de periodo y prevención de navegación a meses futuros.
4. **Pruebas de Nómina y Quincenas (`payroll.test.ts`):**
   * Estimación de días restantes hasta el próximo pago.
   * Cálculo de disponible diario sin inflar el balance contable real.
5. **Pruebas de Aislamiento PostgreSQL / PGlite:**
   * Creación de dos usuarios independientes en motor PGlite con RLS. Comprobar que el usuario B no lee las preferencias, transacciones ni cuentas del usuario A.
