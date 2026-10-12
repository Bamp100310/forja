import React, { useMemo } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from 'recharts'
import { useForja } from '../context/ForjaContext'
import { formatCOP, formatCOPCompact } from '../domain/money'
import { getRecentPeriods } from '../domain/period'
import { summarizeByPeriods } from '../domain/ledger/aggregate'
import { PixelSprite } from '../components/common/PixelSprite'

export const ReportsPage: React.FC = () => {
  const { period, transactions, index } = useForja()

  // Últimos 5 cortes terminando en el corte activo
  const recentPeriods = useMemo(() => {
    return getRecentPeriods(period, 5)
  }, [period])

  const periodPoints = useMemo(() => {
    return summarizeByPeriods(transactions, index, recentPeriods)
  }, [transactions, index, recentPeriods])

  const chartData = periodPoints.map((pt) => ({
    name: pt.period.shortLabel,
    Ingresos: pt.summary.income,
    Gastos: pt.summary.expense,
    Resultado: pt.summary.result,
    Flujo: pt.summary.cashFlow,
    MotoNeto: pt.summary.moto.net,
  }))

  return (
    <div className="space-y-5">
      {/* Cabecera del Centro de Telemetría */}
      <div className="forge-machine-panel rivet-corners p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-[#101d18] border border-emerald-800/80 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
            <PixelSprite name="blueprint" size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="led-pilot led-pilot-online"></span>
              <h2 className="font-pixel text-lg sm:text-xl font-bold text-emerald-400 tracking-wider">
                TELEMETRÍA E INFORMES HISTÓRICOS
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Rendimiento comparativo a través de los ciclos financieros de corte 11 al 10
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="badge-pixel bg-[#101d18] text-emerald-300 border-emerald-800 text-[10px] px-2.5 py-1">
            ÚLTIMOS {periodPoints.length} CORTES
          </span>
        </div>
      </div>

      {/* Gráfica 1: Comparativa de Ingresos vs Gastos */}
      <div className="forge-machine-panel rivet-corners p-4">
        <div className="flex items-center justify-between mb-3 border-b border-[#213731] pb-2">
          <h3 className="font-pixel text-xs tracking-wider text-slate-300">
            PRODUCCIÓN BRUTA VS COSTES OPERATIVOS POR CICLO
          </h3>
          <span className="led-pilot led-pilot-online"></span>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={10} tickFormatter={(val) => formatCOPCompact(val)} />
              <Tooltip
                formatter={(val) => formatCOP(Number(val))}
                contentStyle={{
                  backgroundColor: '#0a1210',
                  borderColor: '#213731',
                  borderRadius: '4px',
                  fontSize: '11px',
                  color: '#e2e8f0',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar dataKey="Ingresos" fill="#34d399" radius={[2, 2, 0, 0]} />
              <Bar dataKey="Gastos" fill="#f87171" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfica 2: Resultado Neto y Rendimiento de la Moto */}
      <div className="forge-machine-panel rivet-corners p-4">
        <div className="flex items-center justify-between mb-3 border-b border-[#213731] pb-2">
          <h3 className="font-pixel text-xs tracking-wider text-slate-300">
            MARGEN NETO Y APORTE DIRECTO DE LA MOTOCICLETA
          </h3>
          <span className="led-pilot led-pilot-amber"></span>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={10} tickFormatter={(val) => formatCOPCompact(val)} />
              <Tooltip
                formatter={(val) => formatCOP(Number(val))}
                contentStyle={{
                  backgroundColor: '#0a1210',
                  borderColor: '#213731',
                  borderRadius: '4px',
                  fontSize: '11px',
                  color: '#e2e8f0',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Line type="monotone" dataKey="Resultado" stroke="#38bdf8" strokeWidth={2.5} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="MotoNeto" stroke="#fbbf24" strokeWidth={2.5} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="Flujo" stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="4 4" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabla comparativa de cifras por corte */}
      <div className="forge-machine-panel rivet-corners overflow-hidden">
        <div className="p-3 bg-[#0b1311] border-b border-[#213731]">
          <h3 className="font-pixel text-xs text-emerald-400">MATRIZ COMPARATIVA DE CORTE</h3>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-[#0e1715] text-slate-400 uppercase text-[10px] border-b border-[#213731]">
            <tr>
              <th className="py-2.5 px-3 font-pixel">CORTE</th>
              <th className="py-2.5 px-3 text-right font-pixel">INGRESOS</th>
              <th className="py-2.5 px-3 text-right font-pixel">GASTOS</th>
              <th className="py-2.5 px-3 text-right font-pixel">RESULTADO NETO</th>
              <th className="py-2.5 px-3 text-right font-pixel">FLUJO DE EFECTIVO</th>
              <th className="py-2.5 px-3 text-right font-pixel">NETO MOTO</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#182622]">
            {periodPoints.map((pt) => (
              <tr key={pt.period.id} className="hover:bg-[#121f1c]/80 transition-colors">
                <td className="py-2.5 px-3 font-bold text-slate-200 font-pixel">
                  {pt.period.label}
                </td>
                <td className="py-2.5 px-3 text-right font-pixel font-bold num text-emerald-400">
                  {formatCOP(pt.summary.income)}
                </td>
                <td className="py-2.5 px-3 text-right font-pixel font-bold num text-rose-400">
                  {formatCOP(pt.summary.expense)}
                </td>
                <td
                  className={`py-2.5 px-3 text-right font-pixel font-bold num ${
                    pt.summary.result >= 0 ? 'text-cyan-400' : 'text-rose-400'
                  }`}
                >
                  {formatCOP(pt.summary.result)}
                </td>
                <td
                  className={`py-2.5 px-3 text-right font-pixel font-bold num ${
                    pt.summary.cashFlow >= 0 ? 'text-slate-200' : 'text-amber-400'
                  }`}
                >
                  {formatCOP(pt.summary.cashFlow)}
                </td>
                <td className="py-2.5 px-3 text-right font-pixel font-bold num text-amber-300">
                  {formatCOP(pt.summary.moto.net)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

