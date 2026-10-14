import React from 'react'
import { formatCOP } from '../../domain/money'
import type { LucideIcon } from 'lucide-react'
import { PixelSprite, type PixelSpriteName } from './PixelSprite'

interface MetricCardProps {
  title: string
  amount: number
  subtitle?: string
  icon?: LucideIcon
  sprite?: PixelSpriteName
  colorScheme?: 'mint' | 'amber' | 'orange' | 'cyan' | 'rose' | 'slate'
  onClick?: () => void
  badge?: string
  tooltip?: string
}

const SCHEME_STYLES = {
  mint: {
    border: 'border-emerald-800/60 hover:border-emerald-600/80',
    iconBg: 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/60',
    amount: 'text-emerald-300',
    badge: 'bg-emerald-950/90 text-emerald-300 border-emerald-800/80',
  },
  amber: {
    border: 'border-amber-800/60 hover:border-amber-600/80',
    iconBg: 'bg-amber-950/70 text-amber-400 border border-amber-800/60',
    amount: 'text-amber-300',
    badge: 'bg-amber-950/90 text-amber-300 border-amber-800/80',
  },
  orange: {
    border: 'border-orange-800/60 hover:border-orange-600/80',
    iconBg: 'bg-orange-950/70 text-orange-400 border border-orange-800/60',
    amount: 'text-orange-300',
    badge: 'bg-orange-950/90 text-orange-300 border-orange-800/80',
  },
  cyan: {
    border: 'border-cyan-800/60 hover:border-cyan-600/80',
    iconBg: 'bg-cyan-950/70 text-cyan-400 border border-cyan-800/60',
    amount: 'text-cyan-300',
    badge: 'bg-cyan-950/90 text-cyan-300 border-cyan-800/80',
  },
  rose: {
    border: 'border-rose-800/60 hover:border-rose-600/80',
    iconBg: 'bg-rose-950/70 text-rose-400 border border-rose-800/60',
    amount: 'text-rose-300',
    badge: 'bg-rose-950/90 text-rose-300 border-rose-800/80',
  },
  slate: {
    border: 'border-slate-800/60 hover:border-slate-600/80',
    iconBg: 'bg-slate-900/80 text-slate-300 border border-slate-700/60',
    amount: 'text-slate-100',
    badge: 'bg-slate-900 text-slate-300 border-slate-700',
  },
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  amount,
  subtitle,
  icon: Icon,
  sprite,
  colorScheme = 'slate',
  onClick,
  badge,
  tooltip,
}) => {
  const styles = SCHEME_STYLES[colorScheme]

  return (
    <div
      onClick={onClick}
      title={tooltip}
      className={`forge-machine-panel rivet-corners ${
        onClick ? 'forge-panel-interactive cursor-pointer' : ''
      } p-4 transition-all duration-150 ${styles.border} flex flex-col justify-between`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg flex items-center justify-center shrink-0 ${styles.iconBg}`}>
            {sprite ? (
              <PixelSprite name={sprite} size={18} />
            ) : Icon ? (
              <Icon size={18} />
            ) : null}
          </div>
          <span className="text-xs font-pixel font-bold uppercase tracking-wider text-slate-300">
            {title}
          </span>
        </div>
        {badge && (
          <span className={`badge-pixel text-[10px] px-1.5 py-0.5 ${styles.badge}`}>
            {badge}
          </span>
        )}
      </div>

      <div className="mt-1">
        <div className={`num font-bold text-xl sm:text-2xl tracking-tight ${styles.amount}`}>
          {formatCOP(amount)}
        </div>
        {subtitle && (
          <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{subtitle}</p>
        )}
      </div>
    </div>
  )
}
