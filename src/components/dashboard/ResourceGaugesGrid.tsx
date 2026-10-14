import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useForja } from '../../context/ForjaContext'
import { formatCOP, formatCOPCompact } from '../../domain/money'
import { getPaydayProjection, calculateDailyAvailableBudget } from '../../domain/payroll'
import { PixelSprite, type PixelSpriteName } from '../common/PixelSprite'

interface GaugeCardProps {
  title: string
  categoryBadge: string
  amount: number
  subtitle: string
  sprite: PixelSpriteName
  tone: 'mint' | 'rose' | 'amber' | 'cyan' | 'orange'
  metricDetail?: {
    label: string
    value: string
  }
  tooltip?: string
  progressRatio?: number
  onClick?: () => void
}

const TONE_CLASSES = {
  mint: {
    border: 'border-[#294c40] hover:border-emerald-500/80',
    headerBg: 'bg-[#12221d]',
    accentText: 'text-emerald-300',
    badge: 'bg-[#12261a] text-emerald-300 border-[#234b31]',
    led: 'led-pilot-online',
    barFill: 'bg-emerald-400',
  },
  rose: {
    border: 'border-[#4c2929] hover:border-rose-500/80',
    headerBg: 'bg-[#221212]',
    accentText: 'text-rose-300',
    badge: 'bg-[#2b140e] text-rose-300 border-[#5f2a1e]',
    led: 'led-pilot-alert',
    barFill: 'bg-rose-400',
  },
  amber: {
    border: 'border-[#4c3d29] hover:border-amber-500/80',
    headerBg: 'bg-[#221a12]',
    accentText: 'text-amber-300',
    badge: 'bg-[#2a1d0b] text-amber-300 border-[#5e4216]',
    led: 'led-pilot-amber',
    barFill: 'bg-amber-400',
  },
  cyan: {
    border: 'border-[#29454c] hover:border-cyan-500/80',
    headerBg: 'bg-[#121e22]',
    accentText: 'text-cyan-300',
    badge: 'bg-[#0f2121] text-cyan-300 border-[#204443]',
    led: 'led-pilot-cyan',
    barFill: 'bg-cyan-400',
  },
  orange: {
    border: 'border-[#4c3429] hover:border-orange-500/80',
    headerBg: 'bg-[#221612]',
    accentText: 'text-orange-300',
    badge: 'bg-[#27150c] text-orange-300 border-[#582f19]',
    led: 'led-pilot-amber',
    barFill: 'bg-orange-400',
  },
}

const IndustrialGaugeCard: React.FC<GaugeCardProps> = ({
  title,
  categoryBadge,
  amount,
  subtitle,
  sprite,
  tone,
  metricDetail,
  tooltip,
  progressRatio,
  onClick,
}) => {
  const styles = TONE_CLASSES[tone]

  return (
    <div
      onClick={onClick}
      title={tooltip}
      className={`forge-panel ${styles.border} transition-all duration-150 p-3.5 sm:p-4 flex flex-col justify-between rivet-corners bg-[#131d1a] ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''
      }`}
    >
      <div>
        {/* Encabezado con sprite y badge de sección */}
        <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-[#213730]">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-sm bg-[#0c1412] border border-[#233a33] shadow-inner">
              <PixelSprite name={sprite} size={20} />
            </div>
            <span className="text-[11px] font-stencil font-bold text-slate-200 uppercase tracking-wide">
              {title}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`badge-pixel text-[9px] ${styles.badge}`}>{categoryBadge}</span>
            <span className={`led-pilot ${styles.led}`} />
          </div>
        </div>

        {/* Importe numérico destacado con máxima legibilidad */}
        <div className="mt-1">
          <div className={`font-pixel text-xl sm:text-2xl font-black tracking-tight ${styles.accentText}`}>
            {formatCOP(amount)}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1 font-pixel">{subtitle}</p>
        </div>
      </div>

      {/* Detalle complementario o micro-barra de estado */}
      <div className="mt-3 pt-2 border-t border-[#1c2e28]">
        {metricDetail ? (
          <div className="flex items-center justify-between text-[11px] font-pixel">
            <span className="text-slate-400">{metricDetail.label}:</span>
            <span className="text-slate-200 font-bold">{metricDetail.value}</span>
          </div>
        ) : progressRatio !== undefined ? (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-slate-400 font-pixel">
              <span>NIVEL DE ABSORCIÓN</span>
              <span>{Math.round(progressRatio * 100)}%</span>
            </div>
            <div className="w-full bg-[#0c1412] h-1.5 overflow-hidden border border-[#213830]">
              <div
                className={`h-full ${styles.barFill}`}
                style={{ width: `${Math.min(100, Math.max(0, progressRatio * 100))}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export const ResourceGaugesGrid: React.FC = () => {
  const navigate = useNavigate()
  const { summary, balances, openQuickModal, isModuleActive, preferences, accounts } = useForja()

  const incomeDayAvg = summary.incomeDays > 0 ? Math.round(summary.income / summary.incomeDays) : 0
  const expenseRatio = summary.income > 0 ? summary.expense / summary.income : 0

  const hasMoto = isModuleActive('moto')
  const hasPlatforms = isModuleActive('platforms')
  const hasPayroll = isModuleActive('payroll')
  const hasDebts = isModuleActive('debts_loans')

  // Proyección de nómina si el módulo está activo
  const activeSchedules = (preferences.incomeSchedules || []).filter((s) => s.isActive)
  const primarySchedule = activeSchedules[0] || null
  const projection = primarySchedule ? getPaydayProjection(primarySchedule) : null
  const dailyBudget = projection
    ? calculateDailyAvailableBudget(balances.available, projection.daysRemaining, 0)
    : null

  return (
    <div className="space-y-4">
      {/* SECCIÓN 1: PRODUCCIÓN DEL CORTE (Métricas de resultado) */}
      <div>
        <div className="flex items-center gap-2 mb-2.5">
          <PixelSprite name="cog" size={16} />
          <span className="font-stencil text-xs text-emerald-400 font-bold uppercase tracking-wider">
            I. PRODUCCIÓN Y CONSUMO DEL CORTE ACTIVO
          </span>
          <div className="h-px bg-[#20362f] flex-1" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Ingresos */}
          <IndustrialGaugeCard
            title="Ingresos Devengados"
            categoryBadge="PRODUCCIÓN"
            amount={summary.income}
            subtitle={`${summary.incomeDays} días con actividad de cobro`}
            sprite="coins"
            tone="mint"
            metricDetail={{
              label: 'Promedio activo',
              value: `${formatCOPCompact(incomeDayAvg)}/día`,
            }}
            tooltip="Ingresos devengados y reconocidos contablemente en el periodo"
          />

          {/* 2. Gastos */}
          <IndustrialGaugeCard
            title="Gastos Totales"
            categoryBadge="CONSUMO"
            amount={summary.expense}
            subtitle={hasMoto ? 'Combustible, repuestos y compras' : 'Alimentación, mercado y compras'}
            sprite="jerrycan"
            tone="rose"
            progressRatio={expenseRatio}
            tooltip="Gastos totales reconocidos en el periodo, independientemente de la forma de pago"
          />

          {/* 3. Resultado neto */}
          <IndustrialGaugeCard
            title="Resultado del Periodo"
            categoryBadge={summary.result >= 0 ? 'SUPERÁVIT' : 'DÉFICIT'}
            amount={summary.result}
            subtitle="Ingresos contables − Gastos contables"
            sprite="ledger_check"
            tone={summary.result >= 0 ? 'mint' : 'rose'}
            metricDetail={{
              label: 'Balance contable',
              value: summary.result >= 0 ? 'Positivo' : 'Alerta',
            }}
            tooltip="Beneficio contable neto del corte. Puede diferir del flujo por compras a crédito"
          />

          {/* 4. Flujo neto de efectivo */}
          <IndustrialGaugeCard
            title="Flujo Neto de Efectivo"
            categoryBadge="LIQUIDEZ"
            amount={summary.cashFlow}
            subtitle={`Entradas: ${formatCOPCompact(summary.cashIn)} | Salidas: ${formatCOPCompact(summary.cashOut)}`}
            sprite="vault"
            tone={summary.cashFlow >= 0 ? 'cyan' : 'orange'}
            metricDetail={{
              label: 'Entradas netas',
              value: formatCOPCompact(summary.cashIn),
            }}
            tooltip="Variación real de dinero físico y bancario en tus cuentas líquidas"
          />
        </div>
      </div>

      {/* SECCIÓN 2: TESORERÍA, PASIVOS Y UNIDAD OPERATIVA (Posición viva) */}
      <div>
        <div className="flex items-center gap-2 mb-2.5">
          <PixelSprite name="strongbox" size={16} />
          <span className="font-stencil text-xs text-amber-400 font-bold uppercase tracking-wider">
            {hasMoto
              ? 'II. TESORERÍA, OBLIGACIONES Y UNIDAD DE NEGOCIO'
              : 'II. TESORERÍA, OBLIGACIONES Y SUELDOS'}
          </span>
          <div className="h-px bg-[#20362f] flex-1" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 5. Dinero disponible líquido */}
          <IndustrialGaugeCard
            title="Dinero Disponible"
            categoryBadge="ACTIVO LÍQUIDO"
            amount={balances.available}
            subtitle={
              hasPlatforms && balances.platformReceivable > 0
                ? `+ ${formatCOPCompact(balances.platformReceivable)} por cobrar en apps`
                : 'Suma líquida en cuentas y billeteras'
            }
            sprite="vault"
            tone="cyan"
            metricDetail={{
              label: hasPlatforms && balances.platformReceivable > 0 ? 'Apps (clic p/ cobrar)' : 'Liquidez caja',
              value:
                hasPlatforms && balances.platformReceivable > 0
                  ? formatCOPCompact(balances.platformReceivable)
                  : formatCOPCompact(balances.available),
            }}
            tooltip={
              hasPlatforms && balances.platformReceivable > 0
                ? 'Suma líquida. Haz clic aquí para cobrar pedidos en efectivo o liquidar saldos de Rappi/apps.'
                : 'Suma disponible en cuentas de ahorro, billeteras (Nequi, Daviplata) y efectivo'
            }
            onClick={
              hasPlatforms && balances.platformReceivable > 0
                ? () =>
                    openQuickModal('loan_repayment', null, {
                      collectionSource: 'platform',
                    })
                : undefined
            }
          />

          {/* 6. Deudas pendientes */}
          <IndustrialGaugeCard
            title="Deudas Totales"
            categoryBadge={hasDebts ? 'PASIVO' : 'SIN DEUDAS'}
            amount={balances.totalDebt}
            subtitle="Tarjetas de crédito y préstamos bancarios"
            sprite="chain"
            tone="amber"
            metricDetail={{
              label: 'Obligaciones',
              value: hasDebts ? 'Abonos periódicos' : 'Módulo inactivo',
            }}
            tooltip="Monto total adeudado. Haz clic para registrar un abono a capital o cuota."
            onClick={hasDebts ? () => openQuickModal('debt_payment') : undefined}
          />

          {/* 7. Cuentas por cobrar a terceros */}
          <IndustrialGaugeCard
            title="Cuentas por Cobrar"
            categoryBadge={hasDebts ? 'PRÉSTAMOS' : 'CARTERA'}
            amount={balances.loansPending}
            subtitle="Dinero prestado pendiente de devolución"
            sprite="sack"
            tone="orange"
            metricDetail={{
              label: 'Por recuperar',
              value: formatCOPCompact(balances.loansPending),
            }}
            tooltip="Capital prestado a amigos o familiares pendiente de recuperación. Haz clic para registrar una devolución."
            onClick={
              hasDebts
                ? () =>
                    openQuickModal('loan_repayment', null, {
                      collectionSource: 'loan',
                    })
                : undefined
            }
          />

          {/* 8. Rendimiento Moto (si moto activa) O Próxima Quincena (si nómina activa) O Cuentas activas */}
          {hasMoto ? (
            <IndustrialGaugeCard
              title="Rendimiento Moto"
              categoryBadge="TALLER"
              amount={summary.moto.net}
              subtitle={`Bruto: ${formatCOPCompact(summary.moto.income)} | Costo: ${formatCOPCompact(summary.moto.expense)}`}
              sprite="moto"
              tone="mint"
              metricDetail={{
                label: 'Margen moto',
                value: summary.moto.income > 0 ? `${Math.round((summary.moto.net / summary.moto.income) * 100)}%` : '0%',
              }}
              tooltip="Ingresos de reparto menos gasolina, repuestos y comisiones de plataforma"
            />
          ) : hasPayroll ? (
            <IndustrialGaugeCard
              title="Próximo Cobro Nómina"
              categoryBadge={projection?.isDueToday ? '¡COBRAS HOY!' : 'QUINCENA'}
              amount={projection?.expectedAmount || 0}
              subtitle={
                projection
                  ? `${projection.daysRemaining} días restantes (${projection.nextPaydayDate})`
                  : 'Sin salario programado'
              }
              sprite="sack"
              tone="mint"
              metricDetail={{
                label: 'Disponible/día',
                value: dailyBudget ? `${formatCOPCompact(dailyBudget.dailyBudget)}/d` : 'N/A',
              }}
              tooltip="Días restantes hasta tu próximo salario y presupuesto diario recomendado. Haz clic para ver el módulo de quincenas."
              onClick={() => navigate('/nomina')}
            />
          ) : (
            <IndustrialGaugeCard
              title="Bóvedas & Cuentas"
              categoryBadge="DEPÓSITOS"
              amount={balances.available}
              subtitle={`${accounts.length} cuentas registradas en tu taller`}
              sprite="vault"
              tone="mint"
              metricDetail={{
                label: 'Cuentas activas',
                value: `${accounts.length}`,
              }}
              tooltip="Haz clic para ver el estado de todas tus cuentas bancarias y efectivo."
              onClick={() => navigate('/cuentas')}
            />
          )}
        </div>
      </div>
    </div>
  )
}
