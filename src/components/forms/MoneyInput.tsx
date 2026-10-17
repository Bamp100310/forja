import React, { useRef, useLayoutEffect } from 'react'
import { X } from 'lucide-react'
import { formatPlainNumber, formatCOPCompact, parseCOPInput, MAX_AMOUNT } from '../../domain/money'
import { sound } from '../../services/sound'

interface MoneyInputProps {
  id?: string
  name?: string
  value: number | undefined
  onChange: (value: number) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
  error?: string
  autoFocus?: boolean
  /** Muestra lingotes rápidos de incremento (+10k, +20k, +50k, +100k) debajo del visor */
  showQuickIngots?: boolean
  quickIngots?: number[]
}

const DEFAULT_INGOTS = [10_000, 20_000, 50_000, 100_000]

export const MoneyInput: React.FC<MoneyInputProps> = ({
  id,
  name,
  value,
  onChange,
  placeholder = '0',
  required = false,
  disabled = false,
  className = '',
  error,
  autoFocus,
  showQuickIngots = false,
  quickIngots = DEFAULT_INGOTS,
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const cursorDigitOffsetRef = useRef<number | null>(null)

  const numericVal = value && value > 0 ? value : 0
  // Valor formateado para presentación visual (cadena con separadores de miles es-CO)
  const displayValue = numericVal > 0 ? formatPlainNumber(numericVal) : ''

  // Preservar la posición del cursor de forma natural después de formatear con puntos
  useLayoutEffect(() => {
    if (cursorDigitOffsetRef.current !== null && inputRef.current) {
      const targetDigits = cursorDigitOffsetRef.current
      const currentVal = inputRef.current.value
      let digitsSeen = 0
      let newPos = currentVal.length

      for (let i = 0; i < currentVal.length; i++) {
        if (/\d/.test(currentVal[i])) {
          digitsSeen++
          if (digitsSeen === targetDigits) {
            newPos = i + 1
            break
          }
        }
      }

      if (targetDigits === 0) {
        newPos = 0
      }

      inputRef.current.setSelectionRange(newPos, newPos)
      cursorDigitOffsetRef.current = null
    }
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    const selStart = e.target.selectionStart ?? raw.length

    // Contar cuántos dígitos había antes del cursor antes del formateo
    const digitsBeforeCursor = raw.slice(0, selStart).replace(/[^\d]/g, '').length
    cursorDigitOffsetRef.current = digitsBeforeCursor

    const parsed = parseCOPInput(raw)
    const finalVal = parsed !== null ? Math.min(parsed, MAX_AMOUNT) : 0
    onChange(finalVal)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const input = inputRef.current
    if (!input) return
    const start = input.selectionStart ?? 0
    const end = input.selectionEnd ?? 0

    if (e.key === 'Backspace') {
      if (start === end && start > 0) {
        const text = input.value
        if (text[start - 1] === '.' || text[start - 1] === ',') {
          e.preventDefault()
          const before = text.slice(0, Math.max(0, start - 2))
          const after = text.slice(start)
          const newRaw = before + after
          const digitsBefore = before.replace(/[^\d]/g, '').length
          cursorDigitOffsetRef.current = digitsBefore

          const parsed = parseCOPInput(newRaw)
          const finalVal = parsed !== null ? Math.min(parsed, MAX_AMOUNT) : 0
          onChange(finalVal)
        }
      }
    } else if (e.key === 'Delete') {
      if (start === end && start < input.value.length) {
        const text = input.value
        if (text[start] === '.' || text[start] === ',') {
          e.preventDefault()
          const before = text.slice(0, start)
          const after = text.slice(Math.min(text.length, start + 2))
          const newRaw = before + after
          const digitsBefore = before.replace(/[^\d]/g, '').length
          cursorDigitOffsetRef.current = digitsBefore

          const parsed = parseCOPInput(newRaw)
          const finalVal = parsed !== null ? Math.min(parsed, MAX_AMOUNT) : 0
          onChange(finalVal)
        }
      }
    }
  }

  const handleAddIngot = (inc: number) => {
    if (disabled) return
    sound.playClick()
    const next = Math.min(MAX_AMOUNT, numericVal + inc)
    onChange(next)
  }

  const handleClear = () => {
    if (disabled) return
    sound.playClick()
    onChange(0)
    inputRef.current?.focus()
  }

  return (
    <div className="space-y-1.5">
      <div
        className={`relative flex items-stretch bg-[#050908] border-2 ${
          error
            ? 'border-rose-500 ring-1 ring-rose-500/50'
            : numericVal > 0
              ? 'border-amber-500/80 shadow-[inset_0_2px_8px_rgba(0,0,0,0.9),0_0_12px_rgba(245,158,11,0.14)] focus-within:border-amber-400'
              : 'border-[#274036] shadow-[inset_0_2px_8px_rgba(0,0,0,0.9)] focus-within:border-amber-400'
        } rounded-xs transition-all ${className}`}
      >
        <div className="px-2.5 py-2 bg-[#101c17] border-r-2 border-[#233a30] flex items-center gap-1.5 select-none shrink-0">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              numericVal > 0
                ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
                : 'bg-amber-500/60'
            }`}
          />
          <span className="text-[10px] font-stencil text-slate-400 tracking-wider hidden sm:inline">
            COP
          </span>
          <span className="text-amber-400 font-stencil font-black text-sm">$</span>
        </div>

        <input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={displayValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoFocus={autoFocus}
          className="w-full bg-transparent border-0 pl-3 pr-8 py-2 text-amber-300 font-stencil font-bold text-base sm:text-lg num tracking-wide placeholder:text-slate-600 focus:outline-none"
        />

        {numericVal > 0 && !disabled && (
          <button
            type="button"
            tabIndex={-1}
            onClick={handleClear}
            title="Vaciar crisol ($0)"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-xs text-slate-500 hover:text-rose-300 hover:bg-rose-950/60 transition-colors cursor-pointer"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {showQuickIngots && !disabled && (
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[9px] font-stencil text-slate-400 uppercase tracking-wider mr-0.5">
            + LINGOTES:
          </span>
          {quickIngots.map((inc) => (
            <button
              key={inc}
              type="button"
              onClick={() => handleAddIngot(inc)}
              className="px-2 py-0.5 rounded-xs bg-[#101c17] hover:bg-[#192b24] border border-[#264136] hover:border-amber-500/70 text-[10px] font-pixel font-bold text-amber-300 num transition-colors cursor-pointer"
            >
              +{formatCOPCompact(inc)}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-rose-400 font-pixel mt-1">{error}</p>}
    </div>
  )
}
