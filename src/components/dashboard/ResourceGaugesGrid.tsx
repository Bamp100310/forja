import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { useForja } from '../../context/ForjaContext'
import { formatCOP } from '../../domain/money'
import { buildRecurringSchedule } from '../../domain/recurring'
import { PixelSprite, type PixelSpriteName } from '../common/PixelSprite'
import { sound } from '../../services/sound'
import { triggerButtonSparks } from '../common/PixelSparks'

interface TelemetryGaugeItem {
  id: string
  title: string
  amount: number
  subtitle: string
  statusBadge: string
  sprite: PixelSpriteName
  color: 'emerald' | 'amber' | 'rose' | 'cyan'
  cellsActive: number
  cellsTotal: number
  cellTone: 'green' | 'amber' | 'red'
  to: string
  actionLabel?: string
  onAction?: (e: React.MouseEvent<HTMLButtonElement>) => void
}

export const ResourceGaugesGrid: React.FC = () => {
  const {
    balances,
    recurring,
    occurrences,
    today,
    isModuleActive,
    openQuickModal,
  } = useForja()
  const navigate = useNavigate()

  const upcomingRecurring = useMemo(() => {
    const activeItems = recurring.filter((r) => r.status === 'active')
    let count = 0
    let total = 0

    for (const item of activeItems) {
      const schedule = buildRecurringSchedule(item, occurrences, today)
      if (schedule.next && schedule.next.daysToDue <= 7) {
        count++
        total += item.amount
      }
    }
    return { count, total }
  }, [recurring, occurrences, today])

  const gauges = useMemo(() => {
    const list: TelemetryGaugeItem[] = [
      {
        id: 'available',
        title: 'LIQUIDEZ EN BÓVEDAS',
        amount: balances.available,
        subtitle: 'Efectivo, bancos y billeteras',
        statusBadge: balances.available > 0 ? 'OPERATIVO' : 'SIN FONDOS',
        sprite: 'vault',
        color: 'emerald',
        cellsActive: Math.min(10, Math.max(1, Math.ceil(balances.available / 250000))),
        cellsTotal: 10,
        cellTone: balances.available > 100000 ? 'green' : 'amber',
        to: '/cuentas',
      },
      {
        id: 'net_worth',
        title: 'PATRIMONIO NETO REAL',
        amount: balances.netWorth,
        subtitle: 'Activos + por cobrar − pasivos',
        statusBadge: balances.netWorth >= 0 ? 'SOLVENTE' : 'NEGATIVO',
        sprite: 'anvil',
        color: balances.netWorth >= 0 ? 'cyan' : 'rose',
        cellsActive: balances.netWorth >= 0 ? 8 : 3,
        cellsTotal: 10,
        cellTone: balances.netWorth >= 0 ? 'green' : 'red',
        to: '/cuentas',
      },
    ]

    if (isModuleActive('platforms') || balances.platformReceivable > 0) {
      list.push({
        id: 'platform_receivable',
        title: 'POR LIQUIDAR (APPS)',
        amount: balances.platformReceivable,
        subtitle: 'Saldos retenidos en plataformas',
        statusBadge: balances.platformReceivable > 0 ? 'POR COBRAR' : 'AL DÍA',
        sprite: 'conveyor',
        color: 'amber',
        cellsActive: Math.min(10, Math.max(0, Math.ceil(balances.platformReceivable / 80000))),
        cellsTotal: 10,
        cellTone: 'amber',
        to: '/cuentas',
        actionLabel: balances.platformReceivable > 0 ? '⚡ LIQUIDAR' : undefined,
        onAction:
          balances.platformReceivable > 0
            ? (e) => {
                e.stopPropagation()
                sound.playClick()
                triggerButtonSparks(e, 'amber', 12)
                openQuickModal('loan_repayment', null, { collectionSource: 'platform' })
              }
            : undefined,
      })
    }

    if (isModuleActive('debts_loans')) {
      list.push({
        id: 'total_debt',
        title: 'PASIVOS POR PAGAR',
        amount: balances.totalDebt,
        subtitle: 'Obligaciones y deudas activas',
        statusBadge: balances.totalDebt > 0 ? 'PENDIENTE' : 'LIBRE',
        sprite: 'chain',
        color: balances.totalDebt > 0 ? 'rose' : 'emerald',
        cellsActive: Math.min(10, Math.max(0, Math.ceil(balances.totalDebt / 500000))),
        cellsTotal: 10,
        cellTone: balances.totalDebt > 0 ? 'red' : 'green',
        to: '/deudas',
        actionLabel: balances.totalDebt > 0 ? 'ABONAR' : undefined,
        onAction:
          balances.totalDebt > 0
            ? (e) => {
                e.stopPropagation()
                sound.playClick()
                triggerButtonSparks(e, 'amber', 12)
                openQuickModal('debt_payment')
              }
            : undefined,
      })

      list.push({
        id: 'loan_receivable',
        title: 'PRÉSTAMOS POR COBRAR',
        amount: balances.loansPending,
        subtitle: 'Capital prestado a terceros',
        statusBadge: balances.loansPending > 0 ? 'ACTIVO' : 'SIN SALDOS',
        sprite: 'ingot',
        color: 'cyan',
        cellsActive: Math.min(10, Math.max(0, Math.ceil(balances.loansPending / 150000))),
        cellsTotal: 10,
        cellTone: 'green',
        to: '/prestamos',
        actionLabel: balances.loansPending > 0 ? 'COBRAR' : undefined,
        onAction:
          balances.loansPending > 0
            ? (e) => {
                e.stopPropagation()
                sound.playClick()
                triggerButtonSparks(e, 'cyan', 12)
                openQuickModal('loan_repayment')
              }
            : undefined,
      })
    }

    if (isModuleActive('recurring')) {
      list.push({
        id: 'upcoming_recurring',
        title: 'COMPROMISOS (7 DÍAS)',
        amount: upcomingRecurring.total,
        subtitle:
          upcomingRecurring.count === 0
            ? 'Sin vencimientos en 7 días'
            : `${upcomingRecurring.count} compromiso(s) próximos`,
        statusBadge: upcomingRecurring.count > 0 ? 'ATENCIÓN' : 'DESPEJADO',
        sprite: 'calendar',
        color: upcomingRecurring.count > 0 ? 'amber' : 'emerald',
        cellsActive: Math.min(10, upcomingRecurring.count * 3),
        cellsTotal: 10,
        cellTone: upcomingRecurring.count > 0 ? 'amber' : 'green',
        to: '/recurrentes',
      })
    }

    return list
  }, [balances, isModuleActive, upcomingRecurring, openQuickModal])

  const getColorClasses = (color: TelemetryGaugeItem['color']) => {
    switch (color) {
      case 'emerald':
        return {
          text: 'text-emerald-400',
          badge: 'bg-emerald-950/90 text-emerald-300 border-emerald-700/70',
          border: 'hover:border-emerald-600/70',
          led: 'led-pilot-online',
        }
      case 'amber':
        return {
          text: 'text-amber-300',
          badge: 'bg-amber-950/90 text-amber-300 border-amber-700/70',
          border: 'hover:border-amber-500/70',
          led: 'led-pilot-amber',
        }
      case 'rose':
        return {
          text: 'text-rose-400',
          badge: 'bg-rose-950/90 text-rose-300 border-rose-700/70',
          border: 'hover:border-rose-600/70',
          led: 'led-pilot-alert',
        }
      case 'cyan':
        return {
          text: 'text-cyan-300',
          badge: 'bg-cyan-950/90 text-cyan-300 border-cyan-700/70',
          border: 'hover:border-cyan-500/70',
          led: 'led-pilot-cyan',
        }
    }
  }

  return (
    <section
      aria-label="Tablero de manómetros de recursos y obligaciones"
      className="forge-machine-panel rivet-corners p-4 sm:p-5 space-y-3.5 h-full flex flex-col justify-between"
    >
      <div className="flex items-center justify-between border-b border-[#213731] pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xs bg-[#101e19] border border-[#264237]">
            <PixelSprite name="gauge" size={16} />
          </div>
          <div>
            <h2 className="font-stencil text-xs font-bold text-slate-100 uppercase tracking-wider">
              MANÓMETROS DE TESORERÍA Y OBLIGACIONES
            </h2>
            <p className="text-[10px] text-slate-400 font-pixel">
              Indicadores adaptados a tus módulos activos (pulsa cualquiera para inspeccionar)
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1">
        {gauges.map((g) => {
          const style = getColorClasses(g.color)
          return (
            <div
              key={g.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                sound.playClick()
                navigate(g.to)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  sound.playClick()
                  navigate(g.to)
                }
              }}
              className={`bg-[#0b1310] border border-[#223930] ${style.border} rounded-xs p-3 flex flex-col justify-between transition-all cursor-pointer group`}
            >
              <div>
                <div className="flex items-center justify-between gap-1.5 mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`led-pilot ${style.led}`} />
                    <span className="text-[10px] font-stencil text-slate-300 group-hover:text-slate-100 truncate">
                      {g.title}
                    </span>
                  </div>
                  <span className={`badge-pixel text-[8px] px-1.5 py-0.5 ${style.badge}`}>
                    {g.statusBadge}
                  </span>
                </div>

                <div className="flex items-baseline justify-between gap-2 my-1">
                  <div className={`text-lg sm:text-xl font-bold num tracking-tight ${style.text}`}>
                    {formatCOP(g.amount)}
                  </div>
                  <PixelSprite name={g.sprite} size={16} />
                </div>
              </div>

              <div className="space-y-1.5 mt-1">
                <div className="gauge-cell-bar">
                  {Array.from({ length: g.cellsTotal }).map((_, i) => {
                    const isActive = i < g.cellsActive
                    const activeClass =
                      g.cellTone === 'green'
                        ? 'active-green'
                        : g.cellTone === 'amber'
                          ? 'active-amber'
                          : 'active-red'
                    return (
                      <div
                        key={i}
                        className={`gauge-cell ${isActive ? activeClass : ''}`}
                      />
                    )
                  })}
                </div>

                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <span className="text-[10px] text-slate-400 font-pixel truncate">
                    {g.subtitle}
                  </span>
                  {g.actionLabel && g.onAction ? (
                    <button
                      type="button"
                      onClick={g.onAction}
                      className="px-2 py-0.5 rounded-xs bg-[#182922] hover:bg-[#223b31] border border-amber-500/70 text-[9px] font-pixel font-bold text-amber-300 shrink-0 cursor-pointer"
                    >
                      {g.actionLabel}
                    </button>
                  ) : (
                    <ArrowUpRight
                      size={12}
                      className="text-slate-500 group-hover:text-amber-300 shrink-0 transition-colors"
                    />
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
