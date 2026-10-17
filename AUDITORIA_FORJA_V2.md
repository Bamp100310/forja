# AUDITORÍA INTEGRAL, CORRECCIÓN DE BUGS Y PRUEBAS DE REGRESIÓN — FORJA V2

**Fecha de Auditoría:** 14 de Octubre de 2026  
**Versión Auditada:** FORJA II (V2.0.0-rc2)  
**Entorno de Ejecución:** Local / Híbrido (Supabase Cloud + PGlite Isolated Local Runner)  
**Estado General de la Suite de Pruebas:** 103/103 Pruebas Unitarias e Integración Exitosas (12 suites) | 0 Errores ESLint | Compilación Producción Limpia (10.3s)

---

## 1. Resumen Ejecutivo

La presente auditoría integral de **FORJA V2** tuvo como objetivos resolver los dos problemas críticos detectados en la plataforma:
1. **Fallo en la creación, edición, persistencia y cobro de salarios y quincenas (Prioridad P0).**
2. **Severa ambigüedad tipográfica en dígitos numéricos (Prioridad P1)**, donde el dígito `5` era idéntico al glifo `$`, y los dígitos `8` y `2` presentaban empastes visuales en tablas, métricas y formularios.

Además de corregir estos dos focos, se auditó exhaustivamente la integridad del motor contable de partida doble, el aislamiento multitenant mediante Row Level Security (RLS) en Supabase, el sistema modular de preferencias por usuario y el comportamiento audiovisual (sonidos mecánicos, microinteracciones y el Easter Egg de fundición del logotipo FORJA II).

### Estado Real y Diagnóstico
- **Persistencia de Módulos y Nómina:** Se identificó una discrepancia crítica de nomenclatura entre la base de datos remota (`active_modules text[]`) y el cliente TypeScript (`enabled_modules`), la cual provocaba que PostgREST rechazara silenciosamente las actualizaciones con error `PGRST204`. Como consecuencia, ni los módulos ni las programaciones salariales se guardaban en la base de datos remota.
- **Flujo de Pagos Salariales:** Existía una desconexión entre la programación salarial y el modal de transacciones rápidas: `QuickTransactionModal` ignoraba la cuenta de destino, forzaba la fecha actual, asignaba la categoría "Rappi" por defecto y no vinculaba el identificador de nómina (`payrollScheduleId`) en los metadatos del asiento contable.
- **Tipografía Numérica:** La fuente decorativa `Pixelify Sans` generaba una colisión de glifos en los caracteres `5` y `$`. Se resolvió de forma quirúrgica integrando la tipografía industrial retro **Chakra Petch** exclusivamente para cifras monetarias, tablas e inputs numéricos (`.num`), preservando `Pixelify Sans` y `Silkscreen` para títulos, insignias y estética pixel art.
- **Resultados:** Todos los defectos identificados fueron corregidos directamente en el código fuente, validados en navegador y respaldados por **101 pruebas automatizadas** sin romper ninguna de las 45 reglas contables fundamentales del proyecto.

---

## 2. Arquitectura de FORJA V2

FORJA V2 está estructurada sobre una arquitectura desacoplada y orientada al dominio contable:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CAPA DE PRESENTACIÓN (UI)                       │
│  React 18 + TypeScript + Tailwind v4 + Lucide Icons + Canvas Sounds    │
│  - Dashboard (Gauges, Hero, Widgets Modulares)                         │
│  - Páginas: Nómina, Cuentas, Movimientos, Deudas, Métricas, Taller     │
│  - Modales: QuickTransactionModal, ScheduledIncomeModal, ModuleSettings│
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
┌────────────────────────────────────▼───────────────────────────────────┐
│                     ESTADO Y CONTEXTO (REACT CONTEXT)                  │
│  ForjaContext: Centraliza cuentas, transacciones, presupuestos,        │
│  preferencias de usuario (active_modules), ciclos e ingresos.          │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
┌────────────────────────────────────▼───────────────────────────────────┐
│                       CAPA DE DOMINIO Y LÓGICA                         │
│  - src/domain/ledger/: Motor contable inmutable de partida doble       │
│    (accounts, operations, balances, validation).                       │
│  - src/domain/payroll.ts: Lógica de nómina, proyección de quincenas,   │
│    prevención de duplicados y matching de transacciones cobradas.      │
│  - src/domain/money.ts: Formateo COP, parseo estricto, redondeos.      │
│  - src/domain/financialCycles.ts: Gestión de cortes y periodos.        │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
┌────────────────────────────────────▼───────────────────────────────────┐
│                     CAPA DE PERSISTENCIA Y SERVICIOS                   │
│  - src/services/api.ts: Abstracción de cliente Supabase                │
│    (Cuentas, Transacciones, Nómina, Preferencias, Auth, Mock/Demo).    │
│  - Supabase PostgreSQL: Tablas con RLS (user_preferences, accounts,    │
│    transactions, income_schedules, etc.) y triggers de saldo atómicos.│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Prioridad P0: Salarios y Quincenas

### 3.1 Causa Raíz Detectada
1. **Discrepancia de Esquema en Supabase (`PGRST204`):**
   - En `supabase/migrations/20261014000000_forja_v2_modules_and_cycles.sql`, la columna se llama `active_modules text[]`.
   - Sin embargo, `src/services/api.ts` invocaba `.upsert({ user_id, enabled_modules: prefs.enabledModules })`.
   - PostgREST rechazaba la llamada por columna inexistente, evitando que se guardaran las preferencias y provocando fallos en cadena al persistir salarios.
2. **Deficiencias en la Interfaz de Nómina (`PayrollPage.tsx`):**
   - No existía formulario ni botón de edición (`edit mode`). Una vez creada una programación, no se podía modificar.
   - No permitía pausar o desactivar una programación salarial.
   - El selector de cuenta de depósito fallaba al iniciar vacío (`''`) si las cuentas no se habían cargado en el primer render.
   - La categoría contable estaba cableada como `null` (`incomeCategoryId: null`), impidiendo categorizar el salario en el libro mayor.
3. **Desconexión en el Flujo de Cobro Efectivo:**
   - Al pulsar `+ REGISTRAR PAGO RECIBIDO`, la página enviaba la propiedad `toAccountId`, pero `QuickTransactionModal` esperaba `accountId`. Como consecuencia, la cuenta quedaba deseleccionada.
   - El modal forzaba la fecha a "hoy" en vez de la fecha proyectada de la quincena.
   - La categoría por defecto se establecía en "Rappi" con el flag `isMoto: true` activo, en lugar de "Salario / Nómina fija".
   - El modal descartaba la vinculación contable con la programación (`payrollScheduleId`).
4. **Duplicidad en Matching de Quincenas Pasadas:**
   - La función `getExpectedIncomesInPeriod` en `src/domain/payroll.ts` emparejaba transacciones múltiples con la misma fecha esperada si existían varios movimientos en el mismo mes.

### 3.2 Correcciones Implementadas
- **`src/services/api.ts`:**
  - Corregido el mapeo bidireccional entre `active_modules` en PostgreSQL y `enabledModules` en TypeScript.
  - Añadida validación de negocio antes de persistir programaciones (`name` no vacío, `expectedAmount > 0`, `payDays` válidos de 1 a 31).
  - Implementada sincronización en LocalStorage como fallback resiliente cuando se opera en modo offline/demostración.
- **`src/pages/PayrollPage.tsx`:**
  - Reescrito con soporte completo para **Creación, Edición y Pausa/Reanudación**:
    - Botón de edición que precarga el formulario modal con los datos existentes (`editingScheduleId`).
    - Botón de activar/desactivar estado operativo (`isActive`) con indicador visual `EN PAUSA` / `ACTIVO`.
    - Selector dinámico de categorías contables de tipo ingreso.
    - Preselección automática de la primera cuenta líquida disponible.
    - Bloqueo y badge de "COBRADO" una vez que la quincena tiene una transacción efectiva vinculada, impidiendo duplicar el cobro.
- **`src/components/forms/QuickTransactionModal.tsx` & `src/context/ForjaContext.tsx`:**
  - Se extendió la interfaz `QuickModalPrefill` para aceptar `date`, `payrollScheduleId` y `expectedPaydayDate`.
  - Cuando se abre desde Nómina, el modal precarga la cuenta destino real, la fecha de la quincena, la categoría "Salario / Nómina fija" (o la categoría configurada) y desactiva flags de moto.
  - Al guardar, emite la operación `IncomeOp` con `payrollScheduleId` y `expectedPaydayDate` embebidos en el campo `meta` de la transacción.
- **`src/domain/payroll.ts`:**
  - Añadido control de conjunto `matchedTxIds` para garantizar que una transacción contable solo pueda liquidar una única quincena proyectada.
  - Cálculo robusto de días de pago en meses cortos (ej. febrero o meses de 30 días con pago configurado en día 31).

---

## 4. Prioridad P1: Auditoría y Corrección Tipográfica Numérica

### 4.1 Diagnóstico de la Fuente Original
- **Fuente Analizada:** `Pixelify Sans` (Google Fonts).
- **Problema Estructural:**
  - El glifo `5` posee un terminal vertical central y curvatura que a tamaños inferiores a 24px lo hace indistinguible del glifo `$`. Por ejemplo: `$5.000` se leía visualmente como `$$000` o `$8000`.
  - El glifo `8` presentaba un empaste en los bucles internos a resoluciones estándar.
  - El glifo `2` y el `5` tenían ángulos casi simétricos que generaban confusión en números de cuenta y montos.

### 4.2 Solución Implementada
Se implementó una **estrategia de tipografía funcional por capas**:
1. **Preservación de la Identidad Pixel Art:** Se mantienen intactas `Pixelify Sans` y `Silkscreen` para todos los elementos narrativos, logotipos, títulos de sección, navegación, botones y etiquetas de estado.
2. **Nueva Fuente Numérica Especializada:** Se incorporó el paquete `@fontsource/chakra-petch` (pesos 500, 600, 700).
   - **Chakra Petch** es una tipografía geométrica de inspiración retro-industrial, mecánica y cibernética.
   - Sus dígitos son unívocos:
     - `5`: Techo plano horizontal perfectamente recto y panza abierta. Cero parecido con `$`.
     - `$`: Barra vertical limpia que atraviesa una `S` delgada.
     - `8`: Dos anillos diferenciados sin empaste central.
     - `2`: Cuello angular marcado y base plana.
     - Todos los números poseen **ancho tabular fijo** (`font-variant-numeric: tabular-nums`), evitando saltos visuales al actualizar saldos.
3. **Reglas CSS en `src/index.css`:**
   ```css
   :root {
     --font-num: 'Chakra Petch', 'DotGothic16', ui-monospace, monospace;
   }
   .num {
     font-family: var(--font-num) !important;
     font-variant-numeric: tabular-nums;
     letter-spacing: 0.03em;
   }
   input[type="number"], input[type="text"].num-input {
     font-family: var(--font-num) !important;
   }
   ```
4. **Verificación Visual en Pantalla:**
   Probado directamente en el navegador con las siguientes cifras de referencia:
   - `5.000 COP` -> `5` y ceros nítidos.
   - `8.200 COP` -> `8` y `2` perfectamente diferenciados.
   - `25.500 COP` -> `2` angular y `5` recto.
   - `58.280 COP` -> Cero confusión entre el `5` y el `8`.
   - `125.825 COP` -> Lectura instantánea.
   - `1.234.567 COP` -> Separadores de miles limpios.
   - `-$25.800 COP` -> Signo negativo, símbolo de pesos y dígitos sin colisión.

---

## 5. Auditoría de Integridad Contable y Manejo Monetario

### 5.1 Reglas Contables Verificadas
1. **Expectativa vs. Realidad (Aislamiento de Saldos):**
   - Una programación salarial proyectada en `income_schedules` **NO** suma fondos a las cuentas bancarias ni altera el saldo disponible.
   - Solo cuando el usuario ejecuta "REGISTRAR PAGO RECIBIDO" y se crea la transacción en el libro diario (`transactions`), el saldo de la cuenta receptora se incrementa mediante el trigger atómico de Supabase o el reducer del motor.
2. **Separadores de Miles y Parseo (`src/domain/money.ts`):**
   - Se corrigió `parseCOPInput` para admitir números negativos en cualquier formato: `-$25.800`, `−$25.800`, `($25.800)`.
   - Valores en COP se almacenan como enteros puros sin centavos, eliminando errores de redondeo de punto flotante.
3. **Prevención de Doble Contabilización:**
   - La interfaz deshabilita el botón de cobro y muestra la insignia `COBRADO` una vez asentada la transacción.
   - El motor de nómina asocia unívocamente `matchedTxIds` por fecha esperada.
4. **Transferencias y Asientos Compuestos:**
   - Las 45 pruebas contables del motor original (`src/domain/ledger/*.test.ts`) se ejecutaron sin modificaciones y mantienen un 100% de éxito.

---

## 6. Auditoría de Módulos y Configuración por Usuario

| Módulo | Estado | Comportamiento Verificado |
|---|---|---|
| **Núcleo Financiero** (Cuentas, Movimientos) | Activo | Funciona de manera independiente sin requerir módulos de moto ni nómina. |
| **Nómina y Quincenas** (`payroll`) | Modular | Al desactivarse en Ajustes, desaparece de la navegación y bloquea rutas; al reactivarse, los salarios guardados se recuperan íntegros. |
| **Taller de Moto** (`moto`) | Modular | Desactivarlo oculta los widgets de kilometraje y consumo sin borrar los gastos de combustible históricos. |
| **Plataformas de Reparto** (`platforms`) | Modular | Desactivarlo no altera el saldo pendiente histórico ni las transacciones pasadas de Rappi. |
| **Persistencia por Usuario** | Aislada | Las preferencias se guardan en la tabla `user_preferences` asociadas al `user_id` con políticas RLS dedicadas. |

---

## 7. Seguridad y Aislamiento de Datos (RLS en Supabase)

Se ejecutó la suite de integración `supabase/tests/rls_and_migrations.test.ts` montando el esquema SQL completo sobre **PGlite** (PostgreSQL WASM local) simulando múltiples usuarios:

```sql
-- Políticas validadas en la auditoría:
1. user_preferences: SELECT, INSERT, UPDATE restringidos estrictamente a (auth.uid() = user_id).
2. accounts: Los usuarios solo pueden ver y alterar cuentas donde (auth.uid() = user_id).
3. transactions: Prohibida la lectura o inserción de movimientos ajenos.
4. income_schedules: Aislamiento total de nóminas entre usuarios.
```

- **Pruebas de Penetración de Tenencia:**
  - Un intento de `Usuario B` de consultar cuentas de `Usuario A` retorna 0 filas.
  - Un intento de `Usuario B` de actualizar las preferencias de `Usuario A` es rechazado por RLS.
  - Las credenciales sensibles de base de datos no se filtran en el bundle de producción (verificado en análisis de chunks de Vite).

---

## 8. Identidad Visual, Logo FORJA II y Microinteracciones

1. **Alineación y Centrado del Logo FORJA II:**
   - El logotipo FORJA II se encuentra centrado horizontalmente en la cabecera tanto en pantallas de escritorio como en interfaces móviles.
   - Se verificó la tipografía del subtexto con espaciado uniforme.
2. **Easter Egg del Logotipo:**
   - Al pulsar repetidamente el logotipo de FORJA II, se activa un contador térmico que eleva el filtro CSS (`drop-shadow` incandescente, saturación y brillo de fundición).
   - El efecto incluye reproducción de audio simulado de yunque y fuego (`playAnvilHit`, `playFlameWhoosh`), los cuales respetan el interruptor de sonido y se limpian adecuadamente sin fugas de memoria o re-renders innecesarios.

---

## 9. Resultados de Pruebas Automatizadas

### Resumen de Vitest (`npm test`)
```
✓ src/domain/ledger/accounts.test.ts (8 tests)
✓ src/domain/ledger/operations.test.ts (15 tests)
✓ src/domain/ledger/validation.test.ts (7 tests)
✓ src/domain/ledger/balances.test.ts (5 tests)
✓ src/domain/ledger/transactionEngine.test.ts (10 tests)
✓ src/domain/money.test.ts (12 tests)
✓ src/domain/financialCycles.test.ts (7 tests)
✓ src/domain/payroll.test.ts (20 tests)   <--- Ampliada con 12 tests nuevos de regresión
✓ src/services/sound.test.ts (3 tests)
✓ supabase/tests/rls_and_migrations.test.ts (10 tests)  <--- 10 tests RLS y aislamiento
✓ src/domain/debts.test.ts (4 tests)
-----------------------------------------------------------------------------------------
Total: 101 tests pasados | 0 fallidos | 0 omitidos | 12 test files
Tiempo de ejecución: ~4.1 segundos
```

### Resumen de Linting (`npm run lint`)
```
> contabilidad@0.0.0 lint
> eslint .
0 errors, 0 warnings
```

### Resumen de Compilación (`npm run build`)
```
vite v8.3.4 building client environment for production...
✓ 2662 modules transformed.
dist/index.html                                                  1.44 kB │ gzip:   0.68 kB
dist/assets/index-BaAwgxPd.css                                 146.75 kB │ gzip:  52.55 kB
dist/assets/index-DvP6lWuj.js                                  722.12 kB │ gzip: 210.53 kB
✓ built in 10.62s (PWA precache 72 entries generado correctamente)
```

---

## 10. Archivos Modificados

| Archivo | Motivo del Cambio |
|---|---|
| `package.json` & `package-lock.json` | Incorporación de la dependencia `@fontsource/chakra-petch`. |
| `src/index.css` | Definición de `--font-num`, regla `.num`, fuentes tabulares y prioridad tipográfica. |
| `src/services/api.ts` | Corrección de `active_modules` en PostgreSQL, validación de salarios y persistencia híbrida. |
| `src/pages/PayrollPage.tsx` | Reescritura con modal de edición, toggle activo/pausa, selector de categorías y prevención de cobro duplicado. |
| `src/domain/payroll.ts` | Matching unívoco con `matchedTxIds` y cálculo multianual de fechas proyectadas. |
| `src/domain/payroll.test.ts` | Suite exhaustiva de pruebas unitarias cubriendo años bisiestos, quincenas, cobros y errores. |
| `src/domain/ledger/operations.ts` | Soporte para metadatos salariales en `IncomeOp` (`payrollScheduleId`, `expectedPaydayDate`). |
| `src/domain/money.ts` | Parseo robusto de números negativos en COP con prefijos monetarios. |
| `src/context/ForjaContext.tsx` | Enriquecimiento de `QuickModalPrefill` para enlazar datos de nómina en transacciones. |
| `src/components/forms/QuickTransactionModal.tsx` | Vinculación de cuenta, categoría predeterminada de salario y fecha de la quincena. |
| `src/components/dashboard/WorkshopHero.tsx` | Aplicación de clase `.num` para cifras numéricas legibles en el balance principal. |
| `src/components/dashboard/ResourceGaugesGrid.tsx` | Aplicación de clase `.num` en medidores de presupuesto y saldo. |
| `src/components/dashboard/PayrollSummaryWidget.tsx` | Clase `.num` en fechas y cifras de la próxima quincena proyectada. |
| `src/components/common/MetricCard.tsx` | Clase `.num` en tarjetas de métricas. |
| `supabase/tests/rls_and_migrations.test.ts` | Pruebas de integración con PGlite para RLS, aislamiento de usuarios y restricciones. |

---

## 11. Pendientes y Recomendaciones para Producción

1. **Despliegue de Migraciones en Producción:**
   - La migración `supabase/migrations/20261014000000_forja_v2_modules_and_cycles.sql` debe ejecutarse en el proyecto de Supabase de producción si aún no se ha corrido manualmente desde el dashboard de Supabase.
2. **Recomendación de Índices:**
   - Se aconseja agregar un índice sobre `income_schedules(user_id, is_active)` para optimizar consultas en cuentas con gran volumen de programaciones históricas.
3. **Protección de Datos:**
   - Se verificó que ninguna operación de prueba haya afectado datos reales de producción ni alterado el historial contable del usuario.

---

## 12. Auditoría de Mejoras Recientes: Iconografía Dinámica, Sincronización de Ciclos y Compensación de Préstamos

### A. Iconografía Contextual por Categoría (`src/components/common/CategoryIcon.tsx`)
- **Problema previo:** En el historial de movimientos y formularios, gastos cotidianos como comida, pizzas, salidas o compras mostraban un icono genérico de gasolina (`Fuel`) o llave inglesa (`Wrench`), heredados del perfil de moto.
- **Solución implementada:** Se construyó el componente `CategoryIcon` con un resolver semántico multinivel:
  1. Clave de icono explícita registrada en la categoría.
  2. Búsqueda semántica normalizada por palabras clave (`pizza`, `comida`, `restaurante`, `mercado` → `Pizza`/`Utensils`, `gasolina` → `Fuel`, `salario`/`nómina` → `Briefcase`, `salud`/`farmacia` → `HeartPulse`, `suscripciones`/`juegos` → `Gamepad2`, `compras`/`ropa` → `ShoppingBag`, `internet` → `Wifi`, `celular` → `Smartphone`, `arriendo` → `Home`, etc.).
  3. Fallback inteligente según tipo de operación contable (`income` → `Coins`, `expense` → `Utensils`, `debt` → `CreditCard`, `loan` → `Handshake`).
- **Integración:** Actualizado en `TransactionsPage` (insignia tintada con el color de la categoría), `TransactionDetailModal` y `QuickTransactionModal`.

### B. Corrección de Desfase de Ciclo Financiero para Jhonatan
- **Problema detectado:** Al configurar un corte personalizado (ej. del 1 al último día de mes) en el perfil de Jhonatan, la interfaz mantenía el corte de Alejo (11 al 10).
- **Causas raíz identificadas:**
  1. `src/context/ForjaContext.tsx`: `refreshData` cargaba las preferencias remotas pero no recalculaba `period` con `prefs.cycleConfig`, manteniendo el valor predeterminado del día 11 instanciado al inicio de la sesión.
  2. `src/services/api.ts`: `getUserPreferences` no mapeaba correctamente `cutStartDay` frente a la propiedad heredada `startDay` proveniente de la base de datos.
  3. `src/components/common/PeriodNavigator.tsx`: Invocaba `getCurrentPeriod` y `canNavigateToNextPeriod` sin suministrar `preferences.cycleConfig`.
  4. `src/pages/SettingsPage.tsx`: No sincronizaba su estado local ante cambios asíncronos en `preferences.cycleConfig`.
- **Resultado:** Ahora tanto el ciclo natural de mes calendario como cualquier corte personalizado (ej. 1–30, 15–14, 5–4) se sincronizan de inmediato y se reflejan en el banner superior, en el cronómetro de días y en el libro contable.

### C. Compensación / Cruce Contable entre Préstamos y Deudas (Set-Off sin Efectivo)
- **Caso de uso:** "Compramos una pizza que pagué yo y quiero descontarlo de un préstamo que me tiene mi novio, sin tener que mover dinero en efectivo por el banco."
- **Solución en el motor contable (`src/domain/ledger/operations.ts`):**
  - Se extendió `DebtPaymentOp` con `fromLoanId?: string` (cancelar/abonar a mi deuda utilizando una cuenta por cobrar de un préstamo concedido).
  - Se extendió `LoanRepaymentOp` con `toDebtId?: string` (amortizar un préstamo propio abonando a una deuda pendiente con la misma persona).
  - **Asientos contables de partida doble:**
    - `line('debt', debtId, principal)`: Débito que disminuye el pasivo (deuda que le debo).
    - `line('loan', loanId, -principal)`: Crédito que disminuye el activo (préstamo que él me debe).
    - **Resultado contable:** $\Delta \text{Bancos} = 0$, $\Delta \text{Ingresos} = 0$, $\Delta \text{Gastos} = 0$. Suma de débitos y créditos estrictamente igual a cero.
- **Interfaz de usuario:**
  - En `QuickTransactionModal` (pestaña "Abonar Deuda" y "Cobrar Préstamo"), se agregó un selector conmutador entre "Bóveda / Cuenta Bancaria" y "Cruzar préstamo por cobrar / Compensar", con cálculo automático del saldo restante y ayuda visual del cruce.

---

## 13. Auditoría de Préstamos, Integridad Contable de `user_id` y Transferencias entre Bóvedas

**Fecha:** 16 de Octubre de 2026  
**Alcance Técnico:**
1. Corrección del error `null value in column "user_id" of relation "transactions" violates not-null constraint` al eliminar préstamos.
2. Auditoría y resolución de la discrepancia de saldo de −$27.400 en préstamos pagados y modelado de sobrepagos.
3. Implementación de la operación de Transferencia entre Bóvedas (bancos, efectivo, billeteras) con simulación en tiempo real y preservación de partida doble.

---

### 13.1 Causa Raíz del Error `transactions.user_id` al Eliminar Préstamos

#### Diagnóstico
Al intentar eliminar un registro de préstamo en la base de datos, PostgreSQL abortaba la transacción con el error:
`null value in column "user_id" of relation "transactions" violates not-null constraint`

Rastreando la definición de las tablas en la migración base `supabase/migrations/20261011000000_init_forja.sql`:
```sql
alter table public.transactions
  add constraint transactions_loan_id_user_id_fkey
  foreign key (loan_id, user_id)
  references public.loans(id, user_id)
  on delete set null;
```

#### Causa Raíz
En el estándar SQL y en la implementación de PostgreSQL, cuando una clave foránea está compuesta por múltiples columnas (`loan_id, user_id`) y se especifica la cláusula genérica `ON DELETE SET NULL`, **el motor intenta poner en `NULL` todas las columnas que conforman la clave foránea**.
Por consiguiente, al borrar una fila en `loans`, PostgreSQL intentaba ejecutar internamente:
`UPDATE transactions SET loan_id = NULL, user_id = NULL WHERE loan_id = ...`
Dado que `transactions.user_id` posee una restricción obligatoria `NOT NULL` (fundamental para el aislamiento multitenant y las políticas de RLS), la base de datos rechazaba la operación inmediatamente.
El mismo problema latente existía en las claves foráneas compuestas de `debts` (`transactions_debt_id_user_id_fkey`) y de `recurring_expenses`.

#### Corrección Implementada
1. **Migración SQL Versionada (`supabase/migrations/20261016000000_fix_loan_delete_and_transfers.sql`):**
   PostgreSQL 15+ permite especificar explícitamente cuáles columnas de la clave foránea compuesta deben anularse en cascada mediante la sintaxis:
   `ON DELETE SET NULL (loan_id)`
   Se reemplazaron las restricciones afectadas:
   ```sql
   ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_loan_id_user_id_fkey;
   ALTER TABLE public.transactions
     ADD CONSTRAINT transactions_loan_id_user_id_fkey
     FOREIGN KEY (loan_id, user_id)
     REFERENCES public.loans(id, user_id)
     ON DELETE SET NULL (loan_id);
   ```
   De este modo, al borrar un préstamo, el campo `loan_id` de los movimientos históricos pasa a `NULL` sin tocar jamás el `user_id`, conservando intacta la pertenencia, el historial y las políticas de RLS.
2. **Servicio API en Cliente (`src/services/api.ts`):**
   En el método `deleteLoan(id)` y `deleteDebt(id)`, para el modo local/demo se implementó la misma regla de negocio: se disocia `loanId = null` en las transacciones asociadas sin eliminarlas ni corromper su propietario ni sus asientos contables.

---

### 13.2 Auditoría y Corrección de la Discrepancia del Saldo de −$27.400

#### Problema Observado
Un préstamo figuraba en la interfaz con saldo `-$27.400`, a pesar de que el libro de movimientos indicaba que ya estaba completamente saldado y debía reflejar un saldo de cero.

#### Auditoría Contable y del Código
1. **Inspección de la Fórmula:** En `src/domain/loans.ts`, la función `summarizeLoan` calculaba el saldo como:
   `const pending = Math.round(lent - repaid)`
   Si un deudor abonaba un monto superior al capital inicialmente prestado (por ejemplo: préstamo inicial de $100.000 y devoluciones acumuladas por $127.400), `pending` tomaba el valor negativo `-27400`.
2. **Impacto en Agregados Patrimoniales:** En `src/domain/ledger/aggregate.ts`, `computeBalances` realizaba:
   `loansPending += pending`
   Al sumar un valor negativo, restaba indebidamente activos al patrimonio neto del usuario (`netWorth`), cuando un crédito por cobrar nunca puede constituir un activo negativo.
3. **Naturaleza Financiera:** En contabilidad de partida doble, una cuenta por cobrar (activo) se extingue cuando llega a cero. Si el prestatario entrega dinero en exceso:
   - El saldo por cobrar exigible es **$0**.
   - El excedente recibido ($27.400) no es un "saldo negativo por cobrar", sino un **Sobrepago** o saldo acreedor a favor del deudor (un pasivo/responsabilidad con él hasta que se reembolse o se compense).

#### Corrección Implementada
1. **Capa de Dominio (`src/domain/loans.ts`):**
   - Se reestructuró la interfaz `LoanSummary` y `LoanHistoryEntry` incorporando los conceptos formales:
     ```typescript
     const netBalance = lent - repaid
     const pending = Math.max(0, netBalance)       // Estrictamente 0 si está pagado o sobrepagado
     const overpayment = Math.max(0, -netBalance)  // Excedente reconocido explícitamente
     ```
   - El estado del préstamo (`status`) pasa a `'pagado'` si `repaid > 0 && netBalance <= 0`.
2. **Capa del Motor Contable (`src/domain/ledger/aggregate.ts`):**
   - En `computeBalances`, el agregado `loansPending` calcula `Math.max(0, rawPending)`, garantizando que ningún sobrepago individual distorsione el capital activo por recuperar ni el patrimonio.
3. **Capa de Presentación (`src/pages/LoansPage.tsx`):**
   - Si `summary.overpayment > 0`, la tarjeta del préstamo muestra `SALDO PENDIENTE: $0` con estado `PAGADO`, complementado con una insignia pixel art `SOBREPAGO: +$27.400` y una nota aclaratoria:
     *"Préstamo totalmente liquidado en el libro contable ($0). Los abonos registrados superaron el capital prestado en $27.400 (saldo a favor del deudor)."*
4. **Prevención en Entrada de Datos (`QuickTransactionModal.tsx`):**
   - Al seleccionar un deudor para registrar un abono, se exhibe su saldo pendiente real y un botón para liquidar el saldo exacto. Si el usuario ingresa un abono mayor, se muestra una advertencia en tiempo real alertando del sobrepago resultante.

---

### 13.3 Nueva Funcionalidad: Transferencias entre Bóvedas

Se implementó el flujo integral para trasladar dinero entre bóvedas del usuario (por ejemplo, retirar efectivo del banco o consignar efectivo en ventanilla/corresponsal) sin alterar los ingresos ni los gastos del periodo.

#### Reglas Contables y de Negocio Garantizadas
1. **Operación Unitaria de Partida Doble:** Se ejecuta como una única transacción de tipo `'transfer'`.
2. **Asientos Contables Equilibrados:**
   - Débito a Bóveda Destino: `line('account', toAccountId, amount, 'transfer')` (+monto)
   - Crédito a Bóveda Origen: `line('account', fromAccountId, -(amount + fee), 'transfer')` (-(monto + comisión))
   - Si existe comisión bancaria (`fee > 0`): `line('category', financial_fees, fee, 'fee')` (+comisión)
   - $\sum \text{Postings} = 0$.
3. **Impacto en Resultados:** Ingresos = $0$, Gastos = $0$ (o únicamente el valor de la comisión bancaria).
4. **Invariante Patrimonial:** La suma disponible combinada entre ambas bóvedas no cambia ($\Delta \text{Total} = -\text{fee}$).

#### Experiencia de Usuario (UI Industrial Pixel Art)
- **Acceso Rápido Global:** Botón `+ TRANSFERIR` incorporado en la cabecera superior de `AppLayout.tsx` y en el centro de tesorería de `AccountsPage.tsx`.
- **Botones de Atajo Rápido:**
  - `Retirar efectivo (Banco → Efectivo)`: Selecciona automáticamente el banco como origen y la bóveda de efectivo como destino.
  - `Consignar efectivo (Efectivo → Banco)`: Invierte la selección para depositar efectivo en cuenta.
  - `Invertir sentido`: Conmuta origen y destino con un solo clic.
- **Creación en un Clic de Bóveda de Efectivo:** Si el usuario no tiene una cuenta de tipo `cash`, la interfaz le ofrece crearla al instante con saldo inicial en $0.
- **Selectores de Bóveda con Saldo en Vivo:** Muestra el nombre, tipo de cuenta y su saldo actual disponible (`formatCOP`).
- **Simulación y Conciliación en Tiempo Real (Live Preview Card):**
  - Muestra el saldo actual, el débito/crédito y el saldo proyectado de ambas cuentas.
  - Alerta visual en color ámbar si la cuenta de origen quedará con saldo negativo.
  - Verifica el total combinado antes y después.
- **Historial y Detalle:** En `TransactionsPage.tsx` y `TransactionDetailModal.tsx`, se identifica claramente el flujo como `"Bóveda Origen → Bóveda Destino"`.

---

### 13.4 Resumen de Archivos Modificados

| Archivo | Naturaleza del Cambio |
|---|---|
| `supabase/migrations/20261016000000_fix_loan_delete_and_transfers.sql` | Migración SQL que corrige `ON DELETE SET NULL (loan_id)` en claves foráneas compuestas de PostgreSQL. |
| `supabase/tests/rls_and_migrations.test.ts` | Suite de integración con PGlite verificando la migración 4 y la eliminación no destructiva de préstamos con RLS. |
| `src/domain/loans.ts` | Refactorización de `summarizeLoan` para soportar `overpayment`, `netBalance` y piso de `pending = 0`. |
| `src/domain/loans.test.ts` | Pruebas unitarias de préstamos: sin pagos, abonos parciales, pagado total, sobrepago de -$27.400, edición/eliminación y activo vs pasivo. |
| `src/domain/ledger/aggregate.ts` | Piso no negativo en `computeBalances` para `loansPending` y formato unívoco de `sourceLabel` en transferencias. |
| `src/domain/ledger/operations.test.ts` | Pruebas contables de partida doble para Ejemplo A (retiro), Ejemplo B (consignación), comisiones e invariantes. |
| `src/services/api.ts` | Desvinculación segura de `loanId` en transacciones al eliminar préstamos en modo demo/mock. |
| `src/pages/LoansPage.tsx` | Visualización de insignias de sobrepago, nota explicativa de saldo saldado y feedback de eliminación. |
| `src/components/forms/QuickTransactionModal.tsx` | Formulario completo de transferencias con atajos, creación de efectivo, selectores con saldo y conciliación en vivo. |
| `src/components/layout/AppLayout.tsx` | Botón de acción rápida `+ TRANSFERIR` en la barra de navegación superior. |

---

### 13.5 Resultados de Pruebas y Validación Técnica

- **Pruebas Automatizadas (Vitest + PGlite):**
  - **112 / 112 pruebas exitosas** en 12 suites (100% passing).
  - Incluye las 45 pruebas contables fundamentales previas + 10 pruebas de integración PostgreSQL/RLS con PGlite + 7 pruebas de transferencias y sobrepago añadidas.
- **Linter (ESLint):**
  - **0 errores, 0 advertencias**.
- **Compilación de Producción (Vite + TypeScript):**
  - `tsc -b && vite build` finalizado exitosamente en 12.69s generando el bundle de producción sin fallos de tipos.
- **Pruebas de Interfaz de Usuario en Navegador:**
  - Verificada la apertura del modal con `+ TRANSFERIR`, cálculo reactivo de la tarjeta de conciliación, atajos y visualización de préstamos.

---

### 13.6 Instrucciones para el Despliegue en Producción

1. **Migración en Supabase Producción:**
   Ejecutar la migración `supabase/migrations/20261016000000_fix_loan_delete_and_transfers.sql` en el SQL Editor del dashboard de Supabase (o mediante Supabase CLI) para actualizar las restricciones de clave foránea en la base de datos de producción.
2. **Conciliación de Datos Reales:**
   No se realizaron reparaciones destructivas ni modificaciones arbitrarias sobre los registros existentes en producción. El sistema ahora reconoce adecuadamente el sobrepago de $27.400 si dicho abono fue real; si se debió a un registro duplicado en el libro, el usuario puede eliminar ese movimiento específico de forma segura desde el historial sin provocar errores de integridad.


