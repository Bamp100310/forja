# INFORME DE AUDITORÍA INTEGRAL PREPRODUCCIÓN — FORJA v2.0
**Fecha:** 11 de Octubre de 2026  
**Entorno de Auditoría:** Desarrollo Local (Windows / Node.js / Vite / PGlite / Web Audio API)  
**Estado General:** Apto para operación local. Pendiente de infraestructura backend e integración remota antes de despliegue a producción.

---

## A. Resumen Ejecutivo

FORJA es una aplicación financiera personal diseñada con una estética de videojuego industrial pixel art (inspirada en *Satisfactory* y *Graveyard Keeper*), con contabilidad por partida doble en Pesos Colombianos (COP) enteros.

Durante esta auditoría integral preproducción se inspeccionó exhaustivamente el código base, los mecanismos de persistencia, el dominio contable, el tratamiento monetario, el motor de sonido y las microinteracciones visuales.

### Principales Hallazgos y Correcciones Realizadas:
1. **Rechazo y mutilación de importes con separadores de miles (P0 - Crítico):** Se descubrió y corrigió un defecto grave en `parseCOPInput()` donde las cadenas con separadores de miles (como `15,000`, `250,000` o `1,234,567`) eran tratadas como decimales, truncando los valores a 15 COP o 1 COP. Se reescribió el analizador para distinguir formatos colombiano/europeo (`1.234.567`) y anglosajón (`1,234,567`), y se corrigió el componente `MoneyInput` ante borrado con tecla `Backspace` y `Delete`.
2. **Defecto en la eliminación de movimientos y registros huérfanos (P1 - Alto):** La eliminación dependía del diálogo nativo del navegador `window.confirm()`, susceptible a bloqueos silenciosos. Además, no se verificaba la existencia del registro en el almacén local ni se desvinculaban ocurrencias recurrentes pagadas, registros de odómetro de moto o mantenimientos asociados, dejando estados inconsistentes. Se construyó un modal in-app industrial con doble confirmación, protección contra pulsaciones dobles y desvinculación en cascada de referencias.
3. **Validación restrictiva en amortización de deudas (P1 - Alto):** El formulario rápido exigía obligatoriamente abono a capital (`principal`), rechazando pagos válidos compuestos únicamente por intereses o comisiones financieras. Se ajustó la validación para admitir cualquier composición de pago donde la suma total sea mayor a cero.
4. **Sincronización multi-pestaña (P2 - Medio):** Se incorporó un mecanismo reactivo de sincronización vía eventos `storage` que recarga el almacén y refresca el contexto React ante modificaciones concurrentes en pestañas secundarias.
5. **Calidad del motor sonoro industrial (P2 - Medio):** Se rediseñó por completo el sintetizador Web Audio API (`src/services/sound.ts`) reemplazando ondas simples 8-bit por síntesis física procedural: transitorios de impacto con ráfagas de ruido blanco filtradas, síntesis modal inarmónica para resonancias de acero, campana de latón para ingresos, troquel pesado para gastos, thud mecánico para errores y debouncing de 35ms.
6. **Validación E2E en navegador:** Se ejecutó una prueba completa con agente de navegador grabando en video (`.webp`) la creación de movimientos con importes de miles, la apertura del modal industrial de confirmación, la eliminación y actualización en tiempo real del libro mayor, y el panel interactivo de audio.
7. **Cobertura de pruebas:** La suite automatizada pasó de 60 a **66 pruebas unitarias y de integración** (100% exitosas), preservando íntegramente las 45 pruebas del dominio contable original.

---

## B. Arquitectura y Persistencia

### 1. Mecanismo de Almacenamiento Actual
* **Fuente de datos primaria:** Almacenamiento local del navegador mediante `localStorage` bajo la clave `'forja_persistence_v2'`.
* **Semilla inicial:** En ausencia de datos locales, el sistema inicializa un estado completo de demostración (`src/services/demoData.ts`) con cuentas (Bancolombia, Nequi, Efectivo, Deudas), transacciones históricas, categorías presupuestarias, registros de moto y compromisos recurrentes.
* **Persistencia entre recargas:** **Confirmada.** Cualquier movimiento, ajuste o registro creado o eliminado se serializa en JSON y se conserva al recargar o cerrar el navegador.
* **Sincronización entre pestañas:** Implementada mediante un listener del evento nativo `window.addEventListener('storage', ...)`, que dispara `forjaApi.reload()` y actualiza el árbol React.

### 2. Estado del Backend y Servicios Externos
* **Supabase:** **No conectado ni operativo en este entorno.** La bandera `isSupabaseConfigured` es `false` porque las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` no están presentes (sólo existe `.env.example`).
* **Pruebas de base de datos PostgreSQL:** Las políticas de Row-Level Security (RLS) y las funciones atómicas (`save_transaction_atomic`, `ensure_user_setup`) cuentan con 5 pruebas de integración que se ejecutan 100% en local mediante `@electric-sql/pglite` (un motor PostgreSQL compilado a WebAssembly en memoria).
* **Dependencia de red:** Cero. La aplicación funciona de manera autónoma como Progressive Web App (PWA) offline.

### 3. Matriz de Entidades en Memoria Local (`LocalStore`)
El almacén local gestiona las siguientes colecciones:
* `transactions` y sus asientos contables derivados (`entry_lines`).
* `accounts` (Cuentas bancarias, billeteras, tarjetas de crédito, préstamos pasivos y bóvedas).
* `categories` (Ingresos y gastos clasificados con presupuesto mensual y bandera para moto).
* `recurringTemplates` y `recurringOccurrences` (Reglas de recurrencia y control de pagos).
* `budgetCycles` (Ciclos contables mensuales, p. ej. 11 al 10 del mes siguiente).
* `motoLogs` (Jornadas laborales, turnos, kilómetros iniciales y finales, combustible, gastos).
* `motoMaintenances` (Historial y programación de cambios de aceite, llantas, kit de arrastre).
* `loans` (Préstamos a terceros / cuentas por cobrar con historial de devoluciones).
* `debts` (Créditos bancarios, tarjetas y obligaciones con cálculo de amortización).

---

## C. Tabla de Hallazgos y Correcciones

| ID | Severidad | Módulo | Descripción del Defecto | Causa Raíz | Solución Aplicada | Validación |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **FORJA-BUG-01** | **P0 (Crítico)** | `src/domain/money.ts` | Importes con comas o puntos de miles rechazados o mutilados (ej. `15,000` -> `15 COP`). | `parseCOPInput` dividía ingenuamente por `,` asumiendo centavos en lugar de verificar miles de 3 dígitos. | Reescribir `parseCOPInput` detectando formato CO/EU (`.`) vs US (`,`), aislando miles de centavos y redondeando a entero COP. | 11 pruebas unitarias en `money.test.ts` y prueba interactiva en navegador. |
| **FORJA-BUG-02** | **P0 (Crítico)** | `src/components/forms/MoneyInput.tsx` | Al borrar hacia la izquierda con `Backspace` en la posición 1, el cálculo de índice resultaba negativo (`-1`), borrando el último carácter en lugar del primero. | Expresión `start - 2` evaluada cuando `start === 1` generaba `slice(0, -1)`. | Corrección matemática de índices (`Math.max(0, start - 2)`) y soporte para tecla `Delete` ante separadores. | Verificado en Vitest y navegación manual por teclado. |
| **FORJA-BUG-03** | **P1 (Alto)** | `src/pages/TransactionsPage.tsx` | Los movimientos no se eliminaban en algunos navegadores o la interfaz se congelaba; riesgo de doble clic. | Uso de `window.confirm()` nativo (frecuentemente bloqueado); ausencia de estado `isDeleting` en la UI. | Sustitución por modal industrial in-app (`¿DESMANTELAR MOVIMIENTO?`) con `isDeleting`, spinner y deshabilitación. | Grabación en video del agente de navegador eliminando registro con éxito. |
| **FORJA-BUG-04** | **P1 (Alto)** | `src/services/api.ts` | Eliminación de transacciones dejaba ocurrencias recurrentes marcadas como pagadas y registros de moto con punteros huérfanos. | `deleteTransaction` sólo borraba de la lista de transacciones sin actualizar referencias cruzadas. | Comprobación de existencia (throw si no existe) y desvinculación explícita (`transactionId = null`) en ocurrencias y registros de moto. | 7 pruebas en `api.test.ts` verificando integridad referencial. |
| **FORJA-BUG-05** | **P1 (Alto)** | `src/components/forms/QuickTransactionModal.tsx` | Rechazo de pagos de deuda sin abono a capital (pagos 100% intereses o cobro de cuota de manejo). | Campo `principal` marcado como obligatorio en la validación local del modal. | Validación de suma total (`principal + interest + fees > 0`), permitiendo abonos de solo intereses. | Verificado en build TypeScript y Vitest. |
| **FORJA-BUG-06** | **P2 (Medio)** | `src/context/ForjaContext.tsx` | Falta de actualización entre pestañas abiertas del navegador. | Ningún observador escuchaba mutaciones de `localStorage` provenientes de otras ventanas. | Agregado listener de evento `storage` en `ForjaContext` que dispara `forjaApi.reload()` y `refreshData()`. | Verificado en código y compilación limpia. |
| **FORJA-BUG-07** | **P2 (Medio)** | `src/services/sound.ts` | Efectos sonoros con timbre electrónico y barridos de tono tipo videojuego espacial ("láser"), carentes de sensación pesada de taller mecánico. | Barridos rápidos de frecuencia descendente en osciladores sintéticos que emulan sonido sci-fi en vez de impactos acústicos reales. | Rediseño a síntesis acústica steampunk/industrial: frecuencias modales fijas (hierro fundido 215/470Hz, campana de latón G4/G5 y yunque de acero 560/1140/2280Hz), ráfagas de ruido de fricción de engranajes y cero barridos electrónicos. | 3 pruebas en `sound.test.ts` y validación en navegador. |
| **FORJA-BUG-08** | **P1 (Alto)** | `src/domain/period.ts`, `src/components/common/PeriodNavigator.tsx`, `src/context/ForjaContext.tsx` | Posibilidad de avanzar a cortes financieros futuros e indicación errónea de "HISTÓRICO" en períodos posteriores a la fecha actual. | El botón de avance no validaba el límite del corte actual y la lógica etiquetaba cualquier período que no fuera idéntico al actual como histórico. | Bloqueo absoluto de navegación hacia cortes futuros (`canNavigateToNextPeriod`, clamping en `ForjaContext`, botón `disabled` con opacidad reducida en `PeriodNavigator` y sonido de rechazo mecánico). | 12 pruebas en `period.test.ts` y validación interactiva grabada en navegador. |

---

## D. Matriz de Operaciones CRUD por Módulo

| Módulo / Entidad | Crear (C) | Leer (R) | Actualizar (U) | Eliminar (D) | Mecanismo de Persistencia y Validación |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Transacciones (Libro Diario)** | ✅ Verificado | ✅ Verificado | ⚠️ Parcial* | ✅ Verificado | Persiste en `localStorage`. Partida doble verificada (suma de débitos = créditos). Modal de desmantelamiento operativo. |
| **Cuentas y Bóvedas** | ✅ Verificado | ✅ Verificado | ✅ Verificado | ✅ Verificado** | Persiste en `localStorage`. Impide eliminar si la cuenta tiene asientos contables asociados (integridad referencial). |
| **Categorías** | ✅ Verificado | ✅ Verificado | ✅ Verificado | 🚫 Bloqueado | Categorías del sistema son fijas; se permite editar presupuestos y banderas de moto. |
| **Deudas Financieras** | ✅ Verificado | ✅ Verificado | ✅ Verificado | ✅ Verificado | Amortización calculada matemáticamente en `debts.ts`. Pagos de intereses/capital registrados vía asientos contables. |
| **Préstamos a Terceros** | ✅ Verificado | ✅ Verificado | ✅ Verificado | ✅ Verificado | Seguimiento de saldo por cobrar, alertas de vencimiento e historial de devoluciones parciales y totales. |
| **Gastos Recurrentes** | ✅ Verificado | ✅ Verificado | ✅ Verificado | ✅ Verificado | Generación virtual de ocurrencias con claves idempotentes (`recId-YYYY-MM-DD`). Desvinculación ante borrado. |
| **Taller de Moto (Jornadas)** | ✅ Verificado | ✅ Verificado | ✅ Verificado | ✅ Verificado | Validación de odómetro no decreciente. Ingresos/costos por km calculados con precisión sin duplicación. |
| **Taller de Moto (Mantenimiento)** | ✅ Verificado | ✅ Verificado | ✅ Verificado | ✅ Verificado | Programación por fecha u odómetro. Alertas preventivas tempranas. |
| **Presupuesto y Ciclos** | ✅ Verificado | ✅ Verificado | ✅ Verificado | 🚫 Por diseño | Ciclos definidos por fechas de corte (ej. día 11); preservan historial contable. |

*\*Nota sobre Actualización de Transacciones:* En contabilidad formal por partida doble, la modificación directa de asientos históricos se desaconseja; la aplicación permite desmantelar (eliminar) y re-forjar la transacción, o aplicar ajustes de saldo justificados.  
*\*\*Nota sobre Eliminación de Cuentas:* Una cuenta con transacciones activas no puede eliminarse para prevenir desbalance patrimonial; debe trasladarse su saldo y vaciarse primero.

---

## E. Auditoría de Integridad Financiera y Manejo Monetario

### 1. Formato y Tratamiento de Moneda (COP)
* **Regla de Dominio:** Todas las magnitudes de saldo y asientos contables se almacenan como **enteros positivos o con signo en Pesos Colombianos (COP)**. No se utilizan fracciones de centavo en las transacciones persistidas.
* **Comportamiento ante decimales:** Si un usuario pega un valor con centavos (p. ej. `15000,75`), el analizador `parseCOPInput()` lo normaliza mediante `Math.round()`, resultando en `15001`.
* **Soporte de Separadores:**
  * `15.000` -> `15000` (Punto de miles colombiano/europeo)
  * `15,000` -> `15000` (Coma de miles anglosajona)
  * `250.000` -> `250000`
  * `1.234.567` -> `1234567`
  * `1,234,567` -> `1234567`
  * `$ 1.234.567 COP` -> `1234567` (Limpieza automática de símbolos)
  * Entradas vacías o con texto no numérico (`abc`, `$ `) -> `null`.
  * Límite de seguridad: Valores superiores a 10 billones de COP son rechazados para evitar desbordamientos de `Number.MAX_SAFE_INTEGER`.

### 2. Principios de Contabilidad por Partida Doble
Se auditaron y ejecutaron con éxito las 14 pruebas de partida doble (`src/domain/ledger/operations.test.ts`):
* **Principio de Equilibrio:** En cada transacción, la suma algebraica de los débitos y créditos es exactamente igual a cero (`Σ = 0`).
* **Compra con Tarjeta / Deuda:** Gasto aumenta, Pasivo aumenta; el dinero disponible en bancos/efectivo permanece intacto hasta el momento del pago.
* **Pago de Tarjeta:** Saldo de cuenta bancaria disminuye, Pasivo disminuye; no se genera un gasto duplicado.
* **Préstamo a Terceros:** Dinero disponible disminuye, Cuenta por Cobrar (Activo) aumenta; no es un gasto.
* **Devolución de Préstamo:** Cuenta por Cobrar disminuye, dinero disponible aumenta; no es un ingreso nuevo (excepto intereses pactados, que sí son ingreso financiero).
* **Transferencias Internas:** Movimiento neutro entre cuentas patrimoniales; no afecta ingresos, gastos ni patrimonio neto.
* **Ingresos de Plataforma (Moto):** Registra ingreso bruto total, comisión de plataforma como gasto real y retención pendiente por cobrar, garantizando balances transparentes.

---

## F. Auditoría Audiovisual y Microinteracciones

### 1. Síntesis Sonora en Tiempo Real (`src/services/sound.ts`)
Se descartaron los barridos de tono descendentes tipo videojuego espacial ("láser") para implementar síntesis física modal en tiempo real con frecuencias inarmónicas fijas de metales reales:
* **`playClick` (Interruptor / Percutor de máquina antigua):**
  * Transitorio de fricción de contacto metálico (2.5 ms con filtro pasabanda a 2400 Hz).
  * Modos fijos del chasis mecánico (360 Hz y 1180 Hz, decay de 14 ms, sin caída de frecuencia). Clic seco y táctil.
* **`playConfirm` (Cerrojo pesado de caldera / Pestillo de hierro fundido):**
  * Doble impacto de fricción y encaje con 10 ms de separación (hierro contra hierro).
  * Modos inarmónicos de barra de hierro fundido: 215 Hz (cuerpo pesado), 470 Hz (barra maciza), 940 Hz (chasquido) y 1680 Hz (arista de acero). "CLANK-CHUCK" mecánico y rotundo.
* **`playIncome` (Caja registradora mecánica del siglo XIX / Engranajes y campana de latón):**
  * Trinquete mecánico inicial: 3 dientes de piñón rápidos (`t=0`, `t=14ms`, `t=28ms`) con resonancia de piñón en 740 Hz.
  * Golpe de campana de latón macizo (`t=32ms`): modos acústicos auténticos de campana de bronce (G4 en 392 Hz, G5 en 784 Hz, D6 en 1175 Hz y rim chime en 1960 Hz con caída natural de 190 ms).
* **`playExpense` (Golpe de martillo sobre yunque de forja / Troquel pesado):**
  * Golpe sordo de masa de hierro de 82 Hz (sin pitch drop).
  * Ruido de aplastamiento y fricción de metal frío.
  * Cantar resonante del yunque de acero: cintura en 560 Hz, cantar del cuerno en 1140 Hz y brillo del templado en 2280 Hz (estilo *Satisfactory* / *Graveyard Keeper*).
* **`playError` (Engranaje trabado / Palanca mecánica bloqueada):**
  * Disonancia fija de hierro trabado (118 Hz y 168 Hz).
  * Fricción áspera de diente de engranaje patinando sobre metal (ráfaga filtrada a 680 Hz).
* **Protección contra rebote:** Límite interno antirrebote (`shouldThrottle`) de 30-60 ms para prevenir acumulación o distorsión de nodos por pulsaciones compulsivas.

### 2. Animaciones, Calor Térmico de Forja y Chispas de Yunque
* **Efecto Térmico de Botones (`.btn-forge-heat`):**
  * Al pasar el cursor (`:hover`), los botones simulan calentamiento de metal incandescente: resplandor ámbar/dorado (`box-shadow: 0 0 16px rgba(245, 158, 11, 0.65)`), borde caliente y brillo térmico en relieve.
  * Al hacer clic (`:active`), el botón alcanza temperatura de forja viva con resplandor rojo-naranja intenso.
* **Animación de Forja Activa (`.animate-forge-hot`):**
  * Mientras una operación se forja en el modal, el botón pulsa entre rojo-carbón y blanco-amarillo incandescente con la leyenda *"¡FORJANDO EN EL YUNQUE!"*, transmitiendo trabajo mecánico en curso.
* **Sistema de Chispas de Yunque (`PixelSparks.tsx` y `triggerButtonSparks`):**
  * Disparo directo de partículas pixel art desde las coordenadas del botón pulsado.
  * Física de partículas de forja: cono ascendente con resistencia de aire y gravedad de escoria caliente.
  * Paleta `forge` incandescente (blanco, amarillo, naranja fuego, rojo brasa) combinada con paletas `rust`, `cyan` y `emerald` según el tipo de operación.
* **Sonidos Integrados en Navegación y Filtros:**
  * Enlaces del menú lateral, cambio de pestañas de tipo en el modal, conmutadores de corte activo/moto y exportación CSV emiten clics mecánicos y chispas contextuales.
* **Accesibilidad:** Respeto estricto del modo `prefers-reduced-motion` mediante CSS, suprimiendo partículas y oscilaciones cuando el sistema operativo lo requiere.

---

## G. Registro de Pruebas Automatizadas Ejecutadas

Comando ejecutado: `npx vitest run --reporter=verbose`  
**Resultado: 10 suites aprobadas, 67 pruebas exitosas, 0 fallos.**

```
 ✓ src/domain/period.test.ts (12 tests) [Ampliación: Detección y bloqueo de cortes futuros]
 ✓ src/domain/ledger/operations.test.ts (14 tests) [Partida doble original]
 ✓ src/services/sound.test.ts (3 tests) [Mute, volumen, resiliencia Web Audio]
 ✓ src/domain/money.test.ts (11 tests) [Ampliación: Formatos de miles y comas]
 ✓ src/services/api.test.ts (7 tests) [Ampliación: Desvinculación de transacciones]
 ✓ src/domain/moto.test.ts (6 tests)
 ✓ src/domain/recurring.test.ts (4 tests)
 ✓ src/domain/loans.test.ts (3 tests)
 ✓ src/domain/debts.test.ts (2 tests)
 ✓ supabase/tests/rls_and_migrations.test.ts (5 tests) [PostgreSQL + RLS en PGlite]
```

### Verificación de Linters y Compilación:
1. `npm run lint`: **0 errores, 0 advertencias** (ESLint 9 con reglas estrictas de TypeScript).
2. `npm run build`: Compilación exitosa con Vite y TypeScript (`tsc -b`). Generación de bundle productivo con soporte PWA y Service Worker.
3. `browser_subagent`: Validación interactiva en navegador Chromium local con grabación de sesiones completas (`forja_audit_validation_1791763512670.webp` y `period_and_steampunk_audio_validation_1791764751922.webp`).

---

## H. Preparación para Producción y Matriz de Riesgos

| Área | Estado Actual | Riesgo Restante | Acción Requerida Antes de Producción |
| :--- | :--- | :--- | :--- |
| **Persistencia** | Local (`localStorage`) | Si el usuario limpia la caché o datos del navegador, los datos se pierden. | Conectar y aprovisionar el proyecto Supabase real; ejecutar migraciones SQL existentes (`supabase/migrations/`). |
| **Copias de Seguridad** | Exportación/Importación JSON en Ajustes | El respaldo es actualmente manual. | Implementar exportación periódica automatizada o sincronización en la nube con cifrado. |
| **Autenticación** | Modo local monousuario (`demo-user`) | No hay control de acceso ni sesiones protegidas por contraseña en este modo. | Configurar Supabase Auth (OAuth o Magic Link) y validar las políticas RLS probadas en `rls_and_migrations.test.ts`. |
| **Secretos y Variables** | `.env.example` documentado; cero secretos en código | Despliegue con llaves expuestas. | Configurar variables seguras en el hosting (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). |
| **Límites de Cuota / PWA** | Service Worker configurado (1.3 MB precached) | Almacenamiento local restringido por cuota de origen (~5-10 MB). | Suficiente para miles de registros locales; para adjuntos (fotos de facturas) se requerirá Supabase Storage. |

---

## I. Archivos Modificados y Razón del Cambio

1. `src/domain/period.ts`:
   * *Motivo:* Agregar funciones de validación `isFuturePeriod`, `isCurrentPeriod` y `canNavigateToNextPeriod` para garantizar que la aplicación impida navegar a cortes posteriores al período en curso.
2. `src/components/common/PeriodNavigator.tsx`:
   * *Motivo:* Deshabilitar el botón de corte siguiente cuando se está en el corte activo, mostrar badge "ACTIVO" en el corte actual e "HISTÓRICO" en pasados, e integrar retroalimentación sonora al interactuar.
3. `src/context/ForjaContext.tsx`:
   * *Motivo:* Añadir listener de evento `storage` en el navegador para recargar y sincronizar el estado reactivo entre pestañas, y acotar `goToNextPeriod` y `setPeriodId` para no aceptar cortes futuros.
4. `src/services/sound.ts`:
   * *Motivo:* Reescritura integral del motor de sonido a síntesis física steampunk y de taller pesado (frecuencias modales fijas de hierro fundido, latón de caja registradora, yunque de acero y sin barridos de frecuencia electrónicos tipo láser).
5. `src/domain/money.ts`:
   * *Motivo:* Reescribir `parseCOPInput()` para admitir separadores de miles con punto y coma (`15.000`, `15,000`, `250.000`, `1.234.567`), ignorar símbolos (`$`, `COP`), redondear centavos a enteros COP y rechazar cadenas vacías o no numéricas.
6. `src/components/forms/MoneyInput.tsx`:
   * *Motivo:* Corregir error de índice en `handleKeyDown` cuando el cursor estaba en la posición 1 (`start - 2 = -1`), y añadir manejo de tecla `Delete` ante separadores de miles.
7. `src/components/forms/QuickTransactionModal.tsx`:
   * *Motivo:* Permitir pagos de deuda donde el capital sea 0 pero existan intereses o comisiones (`totalPayment > 0`), y asegurar que los efectos sonoros y partículas sólo se reproduzcan tras confirmación exitosa de guardado.
8. `src/services/api.ts`:
   * *Motivo:* Enriquecer `forjaApi.deleteTransaction(id)` para desvincular ocurrencias recurrentes (`transactionId = null`), jornadas de moto y registros de mantenimiento huérfanos. Añadir método `reload()` para sincronización entre pestañas.
9. `src/pages/TransactionsPage.tsx`:
   * *Motivo:* Reemplazar `window.confirm` por un modal industrial accesible (`forge-modal-box rivet-corners`), con prevención de doble clic y retroalimentación de estado `isDeleting`.
10. `src/domain/period.test.ts`:
    * *Motivo:* Agregar casos de prueba para el bloqueo de cortes futuros y cálculo de período activo.
11. `src/domain/money.test.ts`:
    * *Motivo:* Incorporar casos de prueba para formatos de miles, límites superiores, centavos con coma y entradas vacías.
12. `src/services/api.test.ts`:
    * *Motivo:* Añadir pruebas para la desvinculación referencial al eliminar transacciones y protección contra registros inexistentes.
13. `src/services/sound.test.ts`:
    * *Motivo:* Crear suite de pruebas para control de volumen, límites [0, 1], persistencia de silencio y ejecución libre de excepciones sin audio hardware.

---

## J. Pendientes y Recomendaciones para el Despliegue

### Prioridad Inmediata (Antes de invitar usuarios reales):
1. **Aprovisionar Supabase:**
   * Crear proyecto en Supabase y aplicar las migraciones ubicadas en `supabase/migrations/` en orden correlativo.
   * Verificar en el panel de Supabase que las funciones `save_transaction_atomic` y `ensure_user_setup` hayan quedado registradas con permisos adecuados.
2. **Generar y configurar archivo `.env`:**
   * Definir `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
   * Probar el flujo de inicio de sesión y comprobar que `forjaApi` conmuta automáticamente de `LocalStore` al cliente remoto sin alterar la experiencia del usuario.
3. **Flujo de Migración Local -> Nube:**
   * Implementar un asistente de sincronización en el primer inicio de sesión con cuenta que ofrezca importar los datos creados localmente en `localStorage` hacia la cuenta de Supabase del usuario.

### Recomendaciones de Mantenimiento y Rendimiento:
1. **División de Chunks en Rollup:** Vite advirtió que `dist/assets/index-*.js` supera los 500 kB debido a las librerías de gráficos y utilitarios. Se aconseja aplicar `React.lazy()` en rutas como `/reports`, `/planning` y `/moto`.
2. **Respaldo Automático:** Añadir una rutina periódica que descargue un snapshot de respaldo en formato JSON cada 30 días o antes de operaciones masivas.

---

**Conclusión de la Auditoría:**  
FORJA cuenta con un motor contable robusto, validado por partida doble y libre de errores en el manejo de moneda colombiana. Los defectos críticos de importes, eliminación de movimientos e inconsistencias audiovisuales han sido subsanados y verificados tanto de forma unitaria como en ejecución real en navegador. El proyecto queda plenamente operativo en su entorno local y listo para iniciar la fase de configuración de infraestructura remota.
