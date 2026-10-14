import React from 'react'
import {
  Utensils,
  Pizza,
  Coffee,
  Fuel,
  Wrench,
  Cog,
  Hammer,
  ShoppingBag,
  Gamepad2,
  Wifi,
  Smartphone,
  HeartPulse,
  PartyPopper,
  Bike,
  Briefcase,
  Coins,
  Home,
  CreditCard,
  Handshake,
  Receipt,
  Percent,
  Sparkles,
  CircleEllipsis,
  ArrowRightLeft,
  Banknote,
  type LucideIcon,
} from 'lucide-react'

export interface CategoryIconProps {
  icon?: string | null
  categoryName?: string | null
  kind?: string | null
  isMoto?: boolean
  size?: number
  className?: string
  color?: string | null
}

const ICON_KEY_MAP: Record<string, LucideIcon> = {
  utensils: Utensils,
  pizza: Pizza,
  coffee: Coffee,
  fuel: Fuel,
  wrench: Wrench,
  cog: Cog,
  hammer: Hammer,
  'shopping-bag': ShoppingBag,
  shopping: ShoppingBag,
  'gamepad-2': Gamepad2,
  gamepad: Gamepad2,
  wifi: Wifi,
  smartphone: Smartphone,
  phone: Smartphone,
  'heart-pulse': HeartPulse,
  health: HeartPulse,
  'party-popper': PartyPopper,
  party: PartyPopper,
  bike: Bike,
  briefcase: Briefcase,
  salary: Briefcase,
  coins: Coins,
  banknote: Banknote,
  home: Home,
  landmark: Home,
  'credit-card': CreditCard,
  creditcard: CreditCard,
  'heart-handshake': Handshake,
  handshake: Handshake,
  receipt: Receipt,
  percent: Percent,
  sparkles: Sparkles,
  package: ShoppingBag,
  route: Bike,
  'circle-ellipsis': CircleEllipsis,
  'triangle-alert': Wrench,
}

export function resolveCategoryIcon(
  iconKey?: string | null,
  categoryName?: string | null,
  kind?: string | null,
  isMoto?: boolean
): LucideIcon {
  // 1. Coincidencia exacta por clave de icono
  if (iconKey) {
    const normalizedKey = iconKey.toLowerCase().trim()
    if (ICON_KEY_MAP[normalizedKey]) {
      return ICON_KEY_MAP[normalizedKey]
    }
  }

  // 2. Coincidencia semántica por nombre de categoría
  if (categoryName) {
    const name = categoryName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

    if (name.includes('pizza')) return Pizza
    if (name.includes('cafe') || name.includes('cafeteria') || name.includes('panaderia')) return Coffee
    if (
      name.includes('alimento') ||
      name.includes('comida') ||
      name.includes('restaurante') ||
      name.includes('mercado') ||
      name.includes('almuerzo') ||
      name.includes('cena') ||
      name.includes('desayuno') ||
      name.includes('hamburguesa')
    ) {
      return Utensils
    }
    if (name.includes('gasolina') || name.includes('combustible') || name.includes('tanqueo')) {
      return Fuel
    }
    if (name.includes('salario') || name.includes('nomina') || name.includes('sueldo') || name.includes('quincena')) {
      return Briefcase
    }
    if (name.includes('propina')) return Handshake
    if (name.includes('suscrip') || name.includes('netflix') || name.includes('spotify') || name.includes('juego')) {
      return Gamepad2
    }
    if (name.includes('internet') || name.includes('wifi') || name.includes('fibra')) {
      return Wifi
    }
    if (name.includes('celular') || name.includes('datos') || name.includes('telefonia') || name.includes('movil')) {
      return Smartphone
    }
    if (name.includes('salud') || name.includes('medicin') || name.includes('farmacia') || name.includes('drogueria') || name.includes('eps')) {
      return HeartPulse
    }
    if (name.includes('salida') || name.includes('entretenimiento') || name.includes('fiesta') || name.includes('rumba') || name.includes('cine') || name.includes('bar')) {
      return PartyPopper
    }
    if (name.includes('compra') || name.includes('ropa') || name.includes('personal') || name.includes('vestuario') || name.includes('calzado')) {
      return ShoppingBag
    }
    if (name.includes('mantenimiento') || name.includes('taller') || name.includes('reparac') || name.includes('mecanic')) {
      return Wrench
    }
    if (name.includes('repuesto') || name.includes('llanta') || name.includes('aceite')) {
      return Cog
    }
    if (name.includes('rappi') || name.includes('didi') || name.includes('clicoh') || name.includes('reparto') || name.includes('domicilio')) {
      return Bike
    }
    if (name.includes('arriendo') || name.includes('alquiler') || name.includes('hogar') || name.includes('casa') || name.includes('apartamento')) {
      return Home
    }
    if (name.includes('interes') || name.includes('comision') || name.includes('cuota de manejo')) {
      return Receipt
    }
    if (name.includes('ocasional') || name.includes('extra')) {
      return Sparkles
    }
  }

  // 3. Fallbacks por tipo de operación
  if (isMoto) return Bike
  switch (kind) {
    case 'income':
      return Coins
    case 'expense':
      return Utensils
    case 'transfer':
      return ArrowRightLeft
    case 'debt_payment':
    case 'debt_charge':
    case 'debt_disbursement':
      return CreditCard
    case 'loan_given':
    case 'loan_repayment':
      return Handshake
    default:
      return Coins
  }
}

export function resolveCategoryColor(
  iconKey?: string | null,
  categoryName?: string | null,
  kind?: string | null,
  isMoto?: boolean
): string {
  if (iconKey) {
    const k = iconKey.toLowerCase().trim()
    if (k === 'pizza') return '#fb923c'
    if (k === 'utensils') return '#f87171'
    if (k === 'coffee') return '#f59e0b'
    if (k === 'fuel') return '#ff9f43'
    if (k === 'briefcase' || k === 'salary') return '#34d399'
    if (k === 'heart-pulse') return '#4ade80'
    if (k === 'shopping-bag') return '#f472b6'
    if (k === 'gamepad-2') return '#a78bfa'
  }

  if (categoryName) {
    const name = categoryName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    if (name.includes('pizza')) return '#fb923c' // Naranja cálido dorado
    if (name.includes('cafe') || name.includes('cafeteria') || name.includes('panaderia')) return '#f59e0b'
    if (
      name.includes('alimento') ||
      name.includes('comida') ||
      name.includes('restaurante') ||
      name.includes('almuerzo') ||
      name.includes('cena') ||
      name.includes('desayuno') ||
      name.includes('hamburguesa') ||
      name.includes('empanada')
    ) {
      return '#f87171' // Coral / rojo apetitoso
    }
    if (name.includes('mercado') || name.includes('supermercado')) return '#fbbf24'
    if (name.includes('gasolina') || name.includes('combustible') || name.includes('tanqueo')) return '#ff9f43'
    if (name.includes('salario') || name.includes('nomina') || name.includes('sueldo') || name.includes('quincena')) return '#34d399'
    if (name.includes('suscrip') || name.includes('netflix') || name.includes('spotify') || name.includes('juego')) return '#a78bfa'
    if (name.includes('internet') || name.includes('wifi') || name.includes('fibra')) return '#60a5fa'
    if (name.includes('celular') || name.includes('datos') || name.includes('telefonia') || name.includes('movil')) return '#38bdf8'
    if (name.includes('salud') || name.includes('medicin') || name.includes('farmacia') || name.includes('drogueria') || name.includes('eps')) return '#4ade80'
    if (name.includes('salida') || name.includes('entretenimiento') || name.includes('fiesta') || name.includes('rumba') || name.includes('cine') || name.includes('bar')) return '#fb7185'
    if (name.includes('compra') || name.includes('ropa') || name.includes('personal') || name.includes('vestuario') || name.includes('calzado')) return '#f472b6'
    if (name.includes('mantenimiento') || name.includes('taller') || name.includes('reparac') || name.includes('mecanic')) return '#f6c453'
    if (name.includes('repuesto') || name.includes('llanta') || name.includes('aceite')) return '#e8a33d'
    if (name.includes('arriendo') || name.includes('alquiler') || name.includes('hogar') || name.includes('casa') || name.includes('apartamento')) return '#818cf8'
    if (name.includes('rappi') || name.includes('didi') || name.includes('reparto')) return '#ff7a59'
  }

  if (isMoto) return '#ff9f43'
  switch (kind) {
    case 'income':
      return '#34d399'
    case 'expense':
      return '#f87171'
    case 'transfer':
      return '#38bdf8'
    case 'debt_payment':
    case 'debt_charge':
    case 'debt_disbursement':
      return '#fbbf24'
    case 'loan_given':
    case 'loan_repayment':
      return '#c084fc'
    default:
      return '#34d399'
  }
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  icon,
  categoryName,
  kind,
  isMoto,
  size = 16,
  className = '',
  color,
}) => {
  const isTooDark = color && (color === '#000000' || color === '#000' || color === '#111111' || color.toLowerCase() === 'black')
  const effectiveColor = (!isTooDark && color) ? color : resolveCategoryColor(icon, categoryName, kind, isMoto)
  return React.createElement(resolveCategoryIcon(icon, categoryName, kind, isMoto), {
    size,
    className,
    style: { color: effectiveColor },
  })
}
