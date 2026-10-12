# FORJA — Taller Financiero Personal

**FORJA** es un sistema web progresivo (PWA), instalable y offline-first, diseñado para la gestión integral de finanzas personales, ingresos variables como trabajador independiente (repartidor en plataformas como Rappi, DiDi, Clicoh y carreras privadas), control de deudas con tarjeta de crédito, amortización de préstamos personales, cuentas por cobrar y seguimiento operativo de motocicleta en Colombia.

---

## 🛠️ Arquitectura y Pila Tecnológica

- **Frontend**: React 19, TypeScript estricto (`verbatimModuleSyntax: true`, `noUnusedLocals: true`), Vite 8, Tailwind CSS v4.
- **Navegación**: `HashRouter` (React Router v7) para compatibilidad total con GitHub Pages sin problemas de enrutamiento 404 en recarga.
- **Gráficas e Iconografía**: Recharts, Lucide React, tipografías `@fontsource/pixelify-sans` e Inter Variable.
- **Persistencia y Backend**:
  - **PostgreSQL en Supabase**: 13 tablas relacionales con Row Level Security (RLS) estricto por usuario (`auth.uid() = user_id`), disparador diferido de partida doble (`trg_postings_balance`) que exige $\sum \text{postings} = 0$, RPC atómico idempotente (`save_transaction_atomic`) y vistas de saldo seguras (`security_invoker = true`).
  - **Motor Demo / Modo Local Reactivo**: Si no se configuran credenciales de Supabase, FORJA opera de forma inmediata mediante un repositorio reactivo en memoria poblado con datos de prueba realistas para Colombia (corte 11 de septiembre a 10 de octubre de 2026).
- **Pruebas Automatizadas**: Vitest con **PGlite 0.5.8** (PostgreSQL compilado a WebAssembly en Node.js), que ejecuta las migraciones SQL reales y valida las políticas RLS y triggers de integridad sin requerir servicios externos.

---

## ⚖️ Principios del Motor Contable

FORJA implementa un motor de partida doble real adaptado a finanzas personales:

1. **Corte del 11 al 10**:
   - El mes operativo inicia el día 11 a las 00:00:00 y finaliza el día 10 del mes siguiente a las 23:59:59 (hora de Bogotá, `America/Bogota`).
   - Evita desajustes por zonas horarias almacenando fechas de negocio en formato ISO estricto `YYYY-MM-DD`.

2. **Convención de Signos y Partida Doble**:
   - Cada movimiento contable genera al menos dos asientos (`postings`).
   - Débitos positivos ($+$), Créditos negativos ($-$). La suma neta de cada transacción debe ser exactamente $0$.
   - **Activos / Cuentas**: Aumentan con débito ($+$) y disminuyen con crédito ($-$).
   - **Pasivos / Deudas**: Aumentan la obligación con crédito ($-$) y disminuyen con débito ($+$).
   - **Ingresos**: Aumentan con crédito ($-$) y se presentan con signo positivo en reportes y resúmenes.
   - **Gastos**: Aumentan con débito ($+$) y se presentan con signo positivo en reportes de consumo.

3. **Separación de Liquidez y Cuentas por Cobrar**:
   - Las cuentas de dinero líquido (Bancolombia, Nequi, Daviplata, Efectivo) se distinguen de las cuentas por cobrar a plataformas (saldo retenido en Rappi o billeteras de apps).
   - Cobrar el saldo retenido de una app hacia Nequi es una transferencia de activos, no un nuevo ingreso, evitando duplicar ingresos.

4. **Tarjetas de Crédito y Deudas**:
   - Las compras con tarjeta de crédito debitan el gasto y acreditan la deuda (aumentan la obligación) sin tocar el saldo en cuentas de ahorro.
   - Los pagos a la tarjeta debitan la deuda (amortizan capital) y acreditan la cuenta bancaria. Los intereses y comisiones bancarias se registran como gastos financieros separados.

5. **Préstamos a Terceros (Cuentas por Cobrar)**:
   - Desembolsar un préstamo acredita una cuenta bancaria y debita el activo por cobrar del prestatario.
   - Los abonos recibidos reducen el saldo pendiente del préstamo e incrementan la cuenta de destino.

6. **Taller de Moto (Unidad de Negocio)**:
   - Contabiliza ingresos brutos de reparto, descuentos de comisiones de plataforma, propinas y gastos operativos (gasolina, aceite, repuestos, SOAT, tecnomecánica).
   - Calcula métricas por kilómetro ($\text{COP}/\text{km}$) únicamente cuando existen lecturas reales de odómetro en las jornadas, evitando promedios inventados.

---

## 🚀 Puesta en Marcha Local

### Prerrequisitos
- Node.js 20+ (recomendado Node.js 22 LTS)
- npm 10+

### Instalación y Ejecución

```bash
# 1. Clonar el repositorio
git clone <url-del-repositorio>
cd Contabilidad

# 2. Instalar dependencias
npm install

# 3. Iniciar servidor de desarrollo en el puerto estándar (5173)
npm run dev

# La aplicación estará disponible en:
# http://localhost:5173/
```

### Comandos de Calidad y Pruebas

```bash
# Ejecutar suite de pruebas unitarias y de integración PostgreSQL/RLS con PGlite
npm test

# Ejecutar verificación de linter (ESLint)
npm run lint

# Compilar paquete de producción y verificar tipos TypeScript estrictos
npm run build

# Previsualizar la compilación de producción
npm run preview
```

---

## 🗄️ Conexión con Supabase (Opcional)

Si deseas sincronizar tus datos en la nube con persistencia en Supabase:

1. Crea un proyecto en [Supabase](https://supabase.com).
2. En el panel de Supabase, ve al **SQL Editor** y ejecuta el script completo ubicado en:
   ```
   supabase/migrations/20261011000000_init_forja.sql
   ```
   Este script crea las 13 tablas, las restricciones de integridad, los triggers de balance, las políticas RLS y la función de inicialización de catálogo.
3. Copia el archivo `.env.example` a `.env`:
   ```bash
   cp .env.example .env
   ```
4. Define las variables en `.env`:
   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-anon-public-key
   VITE_BASE_PATH=/
   ```
5. Reinicia el servidor con `npm run dev`. FORJA detectará las credenciales y cambiará automáticamente del modo demostración local al modo persistente en Supabase.

---

## 🌐 Despliegue en GitHub Pages

El proyecto incluye un flujo de trabajo automatizado en `.github/workflows/deploy.yml`:

1. Al hacer push a la rama `main`, GitHub Actions:
   - Instala dependencias (`npm ci`).
   - Ejecuta las 67 pruebas unitarias, de integración y de base de datos con Vitest y PGlite.
   - Valida la presencia de las credenciales de producción.
   - Compila la aplicación con la ruta base `/forja/`.
   - Despliega el artefacto en GitHub Pages (`https://bamp100310.github.io/forja/`).
2. Configura los secretos en tu repositorio de GitHub (**Settings > Secrets and variables > Actions > Repository secrets**):
   - `VITE_SUPABASE_URL`: `https://wrpttzgjpntquernuerp.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: `sb_publishable_XUp5RgWZ-xEiYEjut8cOZQ_z6lDgszV`
