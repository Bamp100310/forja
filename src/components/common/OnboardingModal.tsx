import React, { useState } from 'react'
import { Check, ArrowRight, ShieldCheck, Sparkles, X } from 'lucide-react'
import { useForja } from '../../context/ForjaContext'
import {
  MODULE_REGISTRY,
  PERSONAL_PRESET_MODULES,
  WORKSHOP_PRESET_MODULES,
  type ModuleId,
} from '../../domain/modules'
import { ForjaLogo } from './ForjaLogo'
import { PixelSprite, type PixelSpriteName } from './PixelSprite'
import { sound } from '../../services/sound'
import { triggerButtonSparks } from './PixelSparks'

export const OnboardingModal: React.FC = () => {
  const { preferences, updatePreferences, updateProfile, addIncomeSchedule, accounts } = useForja()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedPreset, setSelectedPreset] = useState<'personal' | 'workshop'>('personal')
  const [selectedModules, setSelectedModules] = useState<ModuleId[]>(PERSONAL_PRESET_MODULES)

  // Datos opcionales para nómina
  const [salaryName, setSalaryName] = useState('Salario Quincenal')
  const [salaryAmount, setSalaryAmount] = useState<number>(1800000)
  const [salaryDay1, setSalaryDay1] = useState(15)
  const [salaryDay2, setSalaryDay2] = useState(30)

  // Datos opcionales para moto
  const [motoName, setMotoName] = useState('')
  const [motoOdometer, setMotoOdometer] = useState<number>(0)

  // Si ya completó el onboarding, no mostrar el modal
  if (preferences.onboardingCompleted) {
    return null
  }

  const handleSelectPreset = (preset: 'personal' | 'workshop') => {
    sound.playClick()
    setSelectedPreset(preset)
    if (preset === 'personal') {
      setSelectedModules([...PERSONAL_PRESET_MODULES])
    } else {
      setSelectedModules([...WORKSHOP_PRESET_MODULES])
    }
  }

  const handleToggleModule = (modId: ModuleId) => {
    sound.playClick()
    if (selectedModules.includes(modId)) {
      setSelectedModules(selectedModules.filter((m) => m !== modId))
    } else {
      setSelectedModules([...selectedModules, modId])
    }
  }

  const handleFinish = async () => {
    sound.playConfirm()

    const cycleConfig =
      selectedPreset === 'personal'
        ? { type: 'calendar_month' as const, cutStartDay: 1 }
        : { type: 'custom_cut' as const, cutStartDay: 11 }

    // Guardar perfil si se indicó moto
    if (motoName.trim() && selectedModules.includes('moto')) {
      await updateProfile({
        motoName: motoName.trim(),
        motoInitialOdometer: motoOdometer > 0 ? motoOdometer : null,
      })
    }

    // Guardar nómina inicial si aplica
    if (selectedModules.includes('payroll') && salaryName.trim() && salaryAmount > 0) {
      await addIncomeSchedule({
        name: salaryName.trim(),
        expectedAmount: Number(salaryAmount) || 0,
        targetAccountId: accounts[0]?.id || null,
        incomeCategoryId: null,
        scheduleType: 'biweekly',
        payDays: [salaryDay1, salaryDay2],
        isActive: true,
        notes: 'Creado durante la configuración inicial',
      })
    }

    // Actualizar preferencias completando onboarding
    await updatePreferences({
      enabledModules: selectedModules,
      cycleConfig,
      onboardingCompleted: true,
    })
  }

  const handleDismissWithoutConfig = async () => {
    sound.playClick()
    await updatePreferences({
      onboardingCompleted: true,
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#070b09]/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="forge-machine-panel rivet-corners border-2 border-[#2b4b3e] max-w-2xl w-full bg-[#101916] text-slate-100 shadow-2xl relative my-auto animate-fade-in">
        {/* Barra superior de bienvenida */}
        <div className="p-4 sm:p-5 border-b border-[#213730] bg-[#0c1412] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ForjaLogo variant="compact" />
            <div className="hidden sm:block h-6 w-px bg-[#263c34]" />
            <span className="hidden sm:inline font-stencil text-xs text-amber-400 font-bold tracking-wider">
              CONFIGURACIÓN INICIAL FORJA III
            </span>
          </div>

          <button
            onClick={handleDismissWithoutConfig}
            title="Omitir y configurar después desde Ajustes"
            className="p-1.5 text-slate-400 hover:text-slate-100 cursor-pointer text-xs font-mono flex items-center gap-1"
          >
            <span>OMITIR</span>
            <X size={15} />
          </button>
        </div>

        {/* Cuerpo del Asistente */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* PASO 1: Elegir experiencia */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center max-w-lg mx-auto">
                <h2 className="font-stencil text-lg sm:text-xl font-bold text-slate-100 tracking-wide">
                  BIENVENIDO A TU NUEVA FORJA
                </h2>
                <p className="text-xs text-slate-300 mt-1.5 font-pixel leading-relaxed">
                  FORJA se adapta a tus necesidades financieras. Selecciona el perfil que mejor encaje
                  contigo; podrás cambiar o ajustar cada módulo en cualquier momento.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                {/* Opción 1: Finanzas Personales & Quincenas */}
                <div
                  onClick={() => handleSelectPreset('personal')}
                  className={`p-4 rounded-sm border-2 cursor-pointer transition-all flex flex-col justify-between ${
                    selectedPreset === 'personal'
                      ? 'bg-[#14261f] border-emerald-400 shadow-lg'
                      : 'bg-[#0d1613] border-[#223932] hover:border-[#35594e]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 rounded bg-[#0b1310] border border-emerald-800/80 text-emerald-400">
                        <PixelSprite name="sack" size={24} />
                      </div>
                      {selectedPreset === 'personal' && (
                        <span className="badge-pixel bg-emerald-950 text-emerald-300 border-emerald-600 text-[10px]">
                          SELECCIONADO ✓
                        </span>
                      )}
                    </div>
                    <h3 className="font-stencil text-sm font-bold text-slate-100 uppercase tracking-wide">
                      Finanzas Personales
                    </h3>
                    <p className="text-[11px] text-slate-300 mt-1 font-pixel leading-relaxed">
                      Para asalariados o independientes sin vehículos de trabajo. Control de quincenas,
                      disponible diario, cuentas y gastos personales de mercado y comida.
                    </p>
                  </div>

                  <div className="mt-4 pt-2 border-t border-[#1c3029] text-[10px] text-emerald-300 font-pixel">
                    • Módulos: Quincenas, Deudas, Gastos fijos, Metas e Informes.
                  </div>
                </div>

                {/* Opción 2: Taller y Operación Especializada */}
                <div
                  onClick={() => handleSelectPreset('workshop')}
                  className={`p-4 rounded-sm border-2 cursor-pointer transition-all flex flex-col justify-between ${
                    selectedPreset === 'workshop'
                      ? 'bg-[#1e2417] border-amber-400 shadow-lg'
                      : 'bg-[#0d1613] border-[#223932] hover:border-[#35594e]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 rounded bg-[#0b1310] border border-amber-800/80 text-amber-400">
                        <PixelSprite name="moto" size={24} />
                      </div>
                      {selectedPreset === 'workshop' && (
                        <span className="badge-pixel bg-amber-950 text-amber-300 border-amber-600 text-[10px]">
                          SELECCIONADO ✓
                        </span>
                      )}
                    </div>
                    <h3 className="font-stencil text-sm font-bold text-slate-100 uppercase tracking-wide">
                      Taller & Operaciones
                    </h3>
                    <p className="text-[11px] text-slate-300 mt-1 font-pixel leading-relaxed">
                      Para operarios de reparto y trabajo independiente. Seguimiento de moto, odómetro,
                      combustible, ingresos por Rappi / DiDi y corte del 11 al 10.
                    </p>
                  </div>

                  <div className="mt-4 pt-2 border-t border-[#292e1e] text-[10px] text-amber-300 font-pixel">
                    • Módulos: Moto, Plataformas, Deudas, Recurrentes y Taller.
                  </div>
                </div>
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  onClick={(e) => {
                    sound.playClick()
                    triggerButtonSparks(e, 'emerald', 10)
                    setStep(2)
                  }}
                  className="btn-game btn-game-primary py-2.5 px-5 text-xs font-bold flex items-center gap-2 cursor-pointer"
                >
                  <span>CONTINUAR A MÓDULOS</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* PASO 2: Selección granular de módulos */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-stencil text-base font-bold text-slate-100 uppercase tracking-wide">
                  PERSONALIZA TUS CAPACIDADES ACTIVAS
                </h3>
                <p className="text-xs text-slate-300 font-pixel mt-0.5">
                  El núcleo financiero (Cuentas, Registro, Transferencias y Libro) siempre está activo.
                  Enciende o apaga los módulos adicionales según lo que desees ver:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[320px] overflow-y-auto pr-1">
                {(Object.keys(MODULE_REGISTRY) as ModuleId[]).map((modId) => {
                  const mod = MODULE_REGISTRY[modId]
                  const isChecked = selectedModules.includes(modId)
                  return (
                    <div
                      key={modId}
                      onClick={() => handleToggleModule(modId)}
                      className={`p-3 rounded-sm border cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                        isChecked
                          ? 'bg-[#14231e] border-emerald-500/80 text-slate-100'
                          : 'bg-[#0a100e] border-[#1e342c] text-slate-400 opacity-70'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <PixelSprite name={(mod.iconName as PixelSpriteName) || 'cog'} size={20} />
                        <div className="min-w-0">
                          <span className="font-pixel text-xs font-bold block truncate">
                            {mod.name}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate font-mono">
                            {mod.description}
                          </span>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-xs flex items-center justify-center border shrink-0 ${
                          isChecked
                            ? 'bg-emerald-600 border-emerald-400 text-white'
                            : 'border-slate-600 bg-transparent'
                        }`}
                      >
                        {isChecked && <Check size={13} />}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="pt-2 flex justify-between items-center">
                <button
                  onClick={() => setStep(1)}
                  className="btn-game btn-game-secondary py-2 px-3 text-xs"
                >
                  VOLVER
                </button>
                <button
                  onClick={(e) => {
                    sound.playClick()
                    triggerButtonSparks(e, 'emerald', 10)
                    setStep(3)
                  }}
                  className="btn-game btn-game-primary py-2.5 px-5 text-xs font-bold flex items-center gap-2"
                >
                  <span>CONTINUAR A DATOS INICIALES</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* PASO 3: Datos iniciales opcionales y confirmación */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-stencil text-base font-bold text-slate-100 uppercase tracking-wide">
                  DATOS INICIALES (OPCIONAL)
                </h3>
                <p className="text-xs text-slate-300 font-pixel mt-0.5">
                  Puedes registrar tus primeros parámetros ahora o terminar e iniciar directamente
                  con balances limpios en cero. No crearemos cuentas ni transacciones ficticias.
                </p>
              </div>

              {selectedModules.includes('payroll') && (
                <div className="p-3.5 rounded-sm bg-[#0a120f] border border-[#21382f] space-y-2.5">
                  <span className="text-xs font-stencil text-emerald-400 font-bold block uppercase">
                    CONFIGURACIÓN DE TU SALARIO HABITUAL
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="field-label">Concepto de ingreso</label>
                      <input
                        type="text"
                        value={salaryName}
                        onChange={(e) => setSalaryName(e.target.value)}
                        className="field"
                        placeholder="Ej. Quincena Empresa"
                      />
                    </div>
                    <div>
                      <label className="field-label">Monto esperado (COP)</label>
                      <input
                        type="number"
                        value={salaryAmount}
                        onChange={(e) => setSalaryAmount(Number(e.target.value))}
                        className="field"
                      />
                    </div>
                    <div>
                      <label className="field-label">Día del primer cobro</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={salaryDay1}
                        onChange={(e) => setSalaryDay1(Number(e.target.value))}
                        className="field"
                      />
                    </div>
                    <div>
                      <label className="field-label">Día del segundo cobro</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={salaryDay2}
                        onChange={(e) => setSalaryDay2(Number(e.target.value))}
                        className="field"
                      />
                    </div>
                  </div>
                </div>
              )}

              {selectedModules.includes('moto') && (
                <div className="p-3.5 rounded-sm bg-[#0a120f] border border-[#21382f] space-y-2.5">
                  <span className="text-xs font-stencil text-amber-400 font-bold block uppercase">
                    CONFIGURACIÓN DE MOTOCICLETA
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="field-label">Modelo del vehículo</label>
                      <input
                        type="text"
                        value={motoName}
                        onChange={(e) => setMotoName(e.target.value)}
                        className="field"
                        placeholder="Ej. Suzuki Gixxer 150 FI"
                      />
                    </div>
                    <div>
                      <label className="field-label">Odómetro base (KM actual)</label>
                      <input
                        type="number"
                        value={motoOdometer}
                        onChange={(e) => setMotoOdometer(Number(e.target.value))}
                        className="field"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="p-3 rounded-sm bg-[#0c1411] border border-[#1d3027] text-xs text-slate-300 flex items-center gap-2.5">
                <ShieldCheck size={20} className="text-emerald-400 shrink-0" />
                <span className="font-pixel text-[11px]">
                  Tus datos están protegidos por Supabase RLS y aislados exclusivamente para tu cuenta.
                </span>
              </div>

              <div className="pt-2 flex justify-between items-center">
                <button
                  onClick={() => setStep(2)}
                  className="btn-game btn-game-secondary py-2 px-3 text-xs"
                >
                  VOLVER
                </button>
                <button
                  onClick={(e) => {
                    triggerButtonSparks(e, 'emerald', 20)
                    handleFinish()
                  }}
                  className="btn-game btn-game-primary py-2.5 px-6 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xl"
                >
                  <Sparkles size={14} />
                  <span>ENCENDER MI FORJA III</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
