import React from 'react'
import { useForja } from '../context/ForjaContext'
import { WorkshopHero } from '../components/dashboard/WorkshopHero'
import { ProductionFlowModule } from '../components/dashboard/ProductionFlowModule'
import { ResourceGaugesGrid } from '../components/dashboard/ResourceGaugesGrid'
import { MotoStationModule } from '../components/dashboard/MotoStationModule'
import { PayrollSummaryWidget } from '../components/dashboard/PayrollSummaryWidget'
import { WarehouseStorageModule } from '../components/dashboard/WarehouseStorageModule'
import { PersonalCommitmentsAndGoalsModule } from '../components/dashboard/PersonalCommitmentsAndGoalsModule'
import { OperationalLogbook } from '../components/dashboard/OperationalLogbook'

export const DashboardPage: React.FC = () => {
  const { isModuleActive } = useForja()

  const isMotoActive = isModuleActive('moto')
  const isPlatformsActive = isModuleActive('platforms')
  const isPayrollActive = isModuleActive('payroll')
  const isSpecializedWorkshopProfile = isMotoActive || isPlatformsActive

  return (
    <div className="space-y-5 2xl:space-y-6 w-full">
      {/* 1. Cubierta Superior: Puente de Mando Central + Línea de Producción (En 2K se acoplan en cabina panorámica) */}
      <div className="grid grid-cols-1 2xl:grid-cols-12 gap-5 2xl:gap-6 items-stretch">
        <div className="2xl:col-span-7 flex flex-col">
          <WorkshopHero />
        </div>
        <div className="2xl:col-span-5 flex flex-col">
          <ProductionFlowModule />
        </div>
      </div>

      {isSpecializedWorkshopProfile ? (
        /* ===================================================================
           EXPERIENCIA A: PERFIL TALLER Y OPERACIONES ESPECIALIZADAS
           Prioriza bahía de motocicleta, manómetros de recursos, silos y bitácora
           sin dejar huecos vacíos en monitores 1080p, 2K o 4K
           =================================================================== */
        <>
          {/* 2. Planta Industrial Simétrica/Asimétrica sin huecos muertos */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 2xl:gap-6 items-stretch">
            {isMotoActive ? (
              <>
                <div className="xl:col-span-7 flex flex-col">
                  <MotoStationModule />
                </div>
                <div className="xl:col-span-5 flex flex-col">
                  <ResourceGaugesGrid />
                </div>
              </>
            ) : (
              <div className="xl:col-span-12">
                <ResourceGaugesGrid />
              </div>
            )}
          </div>

          {/* 3. Nómina (si está activa) + Compromisos Próximos y Metas */}
          {isPayrollActive && <PayrollSummaryWidget />}
          <PersonalCommitmentsAndGoalsModule />

          {/* 4. Cubierta Inferior en Paralelo para 2K/Wide: Almacén de Gastos + Bitácora Operativa */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 2xl:gap-6 items-stretch">
            <div className="xl:col-span-5 flex flex-col">
              <WarehouseStorageModule />
            </div>
            <div className="xl:col-span-7 flex flex-col">
              <OperationalLogbook />
            </div>
          </div>
        </>
      ) : (
        /* ===================================================================
           EXPERIENCIA B: PERFIL DE FINANZAS PERSONALES
           Prioriza liquidez disponible, quincenas/disponible diario, gastos y metas
           =================================================================== */
        <>
          {/* 2. Estación de Quincenas y Disponible Diario + Manómetros de Tesorería */}
          {isPayrollActive ? (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 2xl:gap-6 items-stretch">
              <div className="xl:col-span-6 flex flex-col">
                <PayrollSummaryWidget />
              </div>
              <div className="xl:col-span-6 flex flex-col">
                <ResourceGaugesGrid />
              </div>
            </div>
          ) : (
            <ResourceGaugesGrid />
          )}

          {/* 3. Compromisos Próximos y Presupuestos/Metas */}
          <PersonalCommitmentsAndGoalsModule />

          {/* 4. Almacén de Gastos + Bitácora Operativa en Paralelo */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 2xl:gap-6 items-stretch">
            <div className="xl:col-span-5 flex flex-col">
              <WarehouseStorageModule />
            </div>
            <div className="xl:col-span-7 flex flex-col">
              <OperationalLogbook />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
