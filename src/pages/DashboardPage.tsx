import React from 'react'
import { WorkshopHero } from '../components/dashboard/WorkshopHero'
import { ProductionFlowModule } from '../components/dashboard/ProductionFlowModule'
import { ResourceGaugesGrid } from '../components/dashboard/ResourceGaugesGrid'
import { MotoStationModule } from '../components/dashboard/MotoStationModule'
import { WarehouseStorageModule } from '../components/dashboard/WarehouseStorageModule'
import { OperationalLogbook } from '../components/dashboard/OperationalLogbook'

export const DashboardPage: React.FC = () => {
  return (
    <div className="space-y-4 w-full">
      {/* 1. HERO VISUAL DEL TALLER Y TELEMETRÍA DEL CORTE */}
      <WorkshopHero />

      {/* 2. LÍNEA DE PRODUCCIÓN FINANCIERA (FLUJO DE RECURSOS) */}
      <ProductionFlowModule />

      {/* 3. PANELES DE RECURSOS Y TESORERÍA (8 MEDIDORES AGRUPADOS) */}
      <ResourceGaugesGrid />

      {/* 4. ESTACIÓN DE MOTO & ALMACÉN DE GASTOS (2 COLUMNAS AMPLIAS) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        <div className="xl:col-span-7">
          <MotoStationModule />
        </div>
        <div className="xl:col-span-5">
          <WarehouseStorageModule />
        </div>
      </div>

      {/* 5. BITÁCORA DE OPERACIONES RECIENTES */}
      <OperationalLogbook />
    </div>
  )
}
