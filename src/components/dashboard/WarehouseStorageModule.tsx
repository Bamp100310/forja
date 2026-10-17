import React from 'react'
import { useForja } from '../../context/ForjaContext'
import { formatCOP, formatCOPCompact } from '../../domain/money'
import { PixelSprite } from '../common/PixelSprite'
import { EmptyState } from '../common/EmptyState'

export const WarehouseStorageModule: React.FC = () => {
  const { summary, index } = useForja()

  const categoriesData = summary.expenseByCategory.slice(0, 7).map((item) => {
    const cat = index.categories.get(item.categoryId)
    const ratio = summary.expense > 0 ? item.amount / summary.expense : 0
    return {
      id: item.categoryId,
      name: cat?.name || 'Varios / Otros',
      amount: item.amount,
      ratio,
    }
  })

  return (
    <div className="forge-panel p-4 sm:p-5 rivet-corners border-[#28443b] flex flex-col justify-between bg-[#121c19] h-full">
      <div>
        {/* Encabezado del almacén */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#213730]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-sm bg-[#162721] border border-emerald-700/50 shadow-inner">
              <PixelSprite name="parcel" size={22} />
            </div>
            <div>
              <h3 className="font-stencil text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-wide">
                ALMACÉN DE GASTOS — SALIDA DE RECURSOS
              </h3>
              <p className="text-[11px] text-slate-400 font-pixel">
                Consumo por categorías en el corte activo
              </p>
            </div>
          </div>

          <span className="badge-pixel num bg-[#14231f] text-slate-300 border-[#254238] text-[10px]">
            {formatCOPCompact(summary.expense)} TOTAL
          </span>
        </div>

        {/* Lista de silos de gasto / barras industriales */}
        {categoriesData.length === 0 ? (
          <EmptyState
            sprite="empty_crate"
            title="Almacén en Reposo"
            description="No se han registrado consumos ni salidas de combustible o repuestos en este corte."
          />
        ) : (
          <div className="space-y-3">
            {categoriesData.map((cat, idx) => {
              const percent = Math.round(cat.ratio * 100)
              return (
                <div key={cat.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-pixel">
                    <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      {cat.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-[11px] font-stencil num">{percent}%</span>
                      <span className="text-slate-100 font-bold num">{formatCOP(cat.amount)}</span>
                    </div>
                  </div>

                  {/* Barra industrial segmentada */}
                  <div className="w-full bg-[#0c1412] h-2 rounded-xs overflow-hidden border border-[#213830] flex">
                    <div
                      className={`h-full transition-all duration-300 ${
                        idx === 0
                          ? 'bg-rose-500'
                          : idx === 1
                          ? 'bg-amber-400'
                          : idx === 2
                          ? 'bg-emerald-400'
                          : 'bg-cyan-400'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-[#1e342d] text-[11px] text-slate-400 flex items-center justify-between font-pixel">
        <span>Categorías activas en el ciclo: {categoriesData.length}</span>
        <span className="text-emerald-400 font-bold font-stencil">PARTIDA DOBLE VERIFICADA</span>
      </div>
    </div>
  )
}
