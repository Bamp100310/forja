import React, { useRef, useLayoutEffect } from 'react'
import { formatPlainNumber, parseCOPInput, MAX_AMOUNT } from '../../domain/money'

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
}

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
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const cursorDigitOffsetRef = useRef<number | null>(null)

  // Valor formateado para presentación visual (cadena con separadores de miles es-CO)
  const displayValue = value && value > 0 ? formatPlainNumber(value) : ''

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
      // Si el cursor está justo después de un separador de miles, borrar el dígito anterior al separador
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
      // Si el cursor está justo antes de un separador de miles, saltar el separador y borrar el dígito siguiente
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

  return (
    <div>
      <div
        className={`relative flex items-center bg-[#070c0a] border ${
          error
            ? 'border-rose-500 ring-1 ring-rose-500/50'
            : 'border-[#273e34] focus-within:border-amber-400 focus-within:ring-1 focus-within:ring-amber-400/40'
        } rounded-xs shadow-inner transition-colors ${className}`}
      >
        <span className="px-2.5 py-2 text-amber-400 font-pixel font-bold text-sm bg-[#101a16] border-r border-[#233a30] select-none shrink-0">
          $
        </span>
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
          className="w-full bg-transparent border-0 pl-3 pr-3 py-1.5 text-amber-300 font-pixel font-bold text-base num placeholder:text-slate-600 focus:outline-none"
        />
      </div>
      {error && <p className="text-xs text-rose-400 font-pixel mt-1">{error}</p>}
    </div>
  )
}
