import React, { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, AlertCircle } from 'lucide-react'
import { PixelSprite } from '../common/PixelSprite'
import { useForja } from '../../context/ForjaContext'
import { MoneyInput } from './MoneyInput'
import { buildTransactionDraft, type OperationInput } from '../../domain/ledger/operations'
import type { TransactionKind } from '../../domain/types'
import { sound } from '../../services/sound'
import { triggerPixelSparks } from '../common/PixelSparks'

export const QuickTransactionModal: React.FC = () => {
  const {
    quickModalOpen,
    quickModalKind,
    closeQuickModal,
    saveTransaction,
    today,
    categories,
    accounts,
    debts,
    loans,
  } = useForja()

  const [kind, setKind] = useState<TransactionKind>(quickModalKind)
  const [date, setDate] = useState<string>(today)
  const [description, setDescription] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [isMoto, setIsMoto] = useState<boolean>(false)

  // Campos específicos
  const [amount, setAmount] = useState<number>(0)
  const [commission, setCommission] = useState<number>(0)
  const [tip, setTip] = useState<number>(0)
  const [categoryId, setCategoryId] = useState<string>('')
  const [accountId, setAccountId] = useState<string>('')
  const [toAccountId, setToAccountId] = useState<string>('')
  const [fee, setFee] = useState<number>(0)

  // Deudas
  const [debtId, setDebtId] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<'account' | 'debt'>('account')
  const [principal, setPrincipal] = useState<number>(0)
  const [interest, setInterest] = useState<number>(0)
  const [debtFees, setDebtFees] = useState<number>(0)

  // Préstamos
  const [loanId, setLoanId] = useState<string>('')
  const [loanPersonName, setLoanPersonName] = useState<string>('')
  const [loanDueDate, setLoanDueDate] = useState<string>('')

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (quickModalOpen) {
      setKind(quickModalKind)
      setDate(today)
      setErrorMessage(null)
      setDescription('')
      setNotes('')
      setAmount(0)
      setCommission(0)
      setTip(0)
      setFee(0)
      setPrincipal(0)
      setInterest(0)
      setDebtFees(0)
      setLoanPersonName('')
      setLoanDueDate('')

      // Seleccionar valores por defecto razonables
      const incCats = categories.filter((c) => c.kind === 'income' && !c.isArchived)
      const expCats = categories.filter((c) => c.kind === 'expense' && !c.isArchived)
      if (quickModalKind === 'income' && incCats.length > 0) {
        setCategoryId(incCats[0].id)
        setIsMoto(Boolean(incCats[0].isMoto))
      } else if (quickModalKind === 'expense' && expCats.length > 0) {
        setCategoryId(expCats[0].id)
        setIsMoto(Boolean(expCats[0].isMoto))
      }

      if (accounts.length > 0) {
        setAccountId(accounts[0].id)
        if (accounts.length > 1) setToAccountId(accounts[1].id)
      }
      if (debts.length > 0) setDebtId(debts[0].id)
      if (loans.length > 0) setLoanId(loans[0].id)
    }
  }, [quickModalOpen, quickModalKind, today, categories, accounts, debts, loans])

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    setCategoryId(val)
    const cat = categories.find((c) => c.id === val)
    if (cat) setIsMoto(Boolean(cat.isMoto))
  }

  const handleKindChange = (nextKind: TransactionKind) => {
    sound.playClick()
    triggerPixelSparks(
      window.innerWidth / 2,
      window.innerHeight * 0.3,
      nextKind === 'income' ? 'forge' : nextKind === 'expense' ? 'rust' : 'cyan',
      8
    )
    setKind(nextKind)
    if (nextKind === 'income') {
      const inc = categories.find((c) => c.kind === 'income' && !c.isArchived)
      if (inc) {
        setCategoryId(inc.id)
        setIsMoto(Boolean(inc.isMoto))
      }
    } else if (nextKind === 'expense') {
      const exp = categories.find((c) => c.kind === 'expense' && !c.isArchived)
      if (exp) {
        setCategoryId(exp.id)
        setIsMoto(Boolean(exp.isMoto))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)
    sound.playClick()
    triggerPixelSparks(window.innerWidth / 2, window.innerHeight * 0.5, 'forge', 14)

    try {
      let op: OperationInput

      if (kind === 'income') {
        op = {
          kind: 'income',
          date,
          description: description.trim() || 'Ingreso registrado',
          notes: notes.trim() || null,
          isMoto,
          categoryId,
          accountId,
          amount,
          commission: commission > 0 ? commission : undefined,
          tip: tip > 0 ? tip : undefined,
        }
      } else if (kind === 'expense') {
        op = {
          kind: 'expense',
          date,
          description: description.trim() || 'Gasto registrado',
          notes: notes.trim() || null,
          isMoto,
          categoryId,
          amount,
          payment:
            paymentMethod === 'debt'
              ? { method: 'debt', debtId }
              : { method: 'account', accountId },
        }
      } else if (kind === 'transfer') {
        op = {
          kind: 'transfer',
          date,
          description: description.trim() || 'Transferencia entre cuentas',
          notes: notes.trim() || null,
          fromAccountId: accountId,
          toAccountId,
          amount,
          fee: fee > 0 ? fee : undefined,
        }
      } else if (kind === 'debt_payment') {
        const totalPayment = principal + (interest || 0) + (debtFees || 0)
        if (totalPayment <= 0) {
          throw new Error('El pago de deuda debe ser mayor que cero (ingresa abono a capital, intereses o cargos).')
        }
        op = {
          kind: 'debt_payment',
          date,
          description: description.trim() || 'Pago de deuda',
          notes: notes.trim() || null,
          debtId,
          accountId,
          principal,
          interest: interest > 0 ? interest : undefined,
          fees: debtFees > 0 ? debtFees : undefined,
        }
      } else if (kind === 'loan_given') {
        const isNewLoan = loanId === '__new__'
        const targetLoanId = isNewLoan ? `loan-${Date.now()}` : loanId
        op = {
          kind: 'loan_given',
          date,
          description: description.trim() || `Préstamo a ${loanPersonName || 'familiar'}`,
          notes: notes.trim() || null,
          loanId: targetLoanId,
          accountId: accountId || null,
          amount,
          newLoan: isNewLoan
            ? {
                id: targetLoanId,
                personName: loanPersonName.trim(),
                dueDate: loanDueDate || null,
                interestNote: null,
                notes: notes.trim() || null,
              }
            : undefined,
        }
      } else if (kind === 'loan_repayment') {
        op = {
          kind: 'loan_repayment',
          date,
          description: description.trim() || 'Devolución de préstamo',
          notes: notes.trim() || null,
          loanId,
          accountId,
          principal,
          interest: interest > 0 ? interest : undefined,
        }
      } else {
        throw new Error('Tipo de operación no soportado en formulario rápido')
      }

      const draft = buildTransactionDraft(op, { categories })
      await saveTransaction(draft)

      // Feedback audiovisual confirmado tras persistencia exitosa
      if (kind === 'income' || kind === 'loan_repayment') {
        sound.playIncome()
        triggerPixelSparks(window.innerWidth / 2, window.innerHeight * 0.45, 'forge', 32)
      } else if (kind === 'expense' || kind === 'debt_payment') {
        sound.playExpense()
        triggerPixelSparks(window.innerWidth / 2, window.innerHeight * 0.45, 'rust', 32)
      } else {
        sound.playConfirm()
        triggerPixelSparks(window.innerWidth / 2, window.innerHeight * 0.45, 'cyan', 24)
      }

      closeQuickModal()
    } catch (err) {
      console.error('Error guardando transacción:', err)
      sound.playError()
      setErrorMessage((err as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog.Root open={quickModalOpen} onOpenChange={(open) => !open && closeQuickModal()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/85 backdrop-blur-xs z-[60]" />
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 pointer-events-none">
          <Dialog.Content className="pointer-events-auto w-full max-w-lg max-h-[90vh] overflow-y-auto forge-modal-box rivet-corners p-4 sm:p-5 shadow-2xl focus:outline-none">
          <div className="flex items-center justify-between pb-3 border-b-2 border-[#233a30]">
            <Dialog.Title className="font-stencil text-base text-emerald-400 font-bold flex items-center gap-2 tracking-wide">
              <PixelSprite name="tools" size={20} />
              <span>FORJAR MOVIMIENTO</span>
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                className="p-1 rounded-xs text-slate-400 hover:text-slate-100 hover:bg-[#1a2d25] border border-transparent hover:border-[#2f5243] transition-colors cursor-pointer"
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          {/* Selector de pestañas por tipo de operación con PixelSprites auténticos */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 my-3.5 bg-[#070c0a] p-1.5 rounded-xs border-2 border-[#233a30]">
            <button
              type="button"
              onClick={() => handleKindChange('income')}
              className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xs text-[10px] font-stencil uppercase tracking-wider transition-all cursor-pointer ${
                kind === 'income'
                  ? 'bg-[#12261a] text-emerald-300 border-2 border-emerald-600 font-bold shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#101b17] border border-transparent'
              }`}
            >
              <PixelSprite name="coins" size={18} />
              <span>INGRESO</span>
            </button>
            <button
              type="button"
              onClick={() => handleKindChange('expense')}
              className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xs text-[10px] font-stencil uppercase tracking-wider transition-all cursor-pointer ${
                kind === 'expense'
                  ? 'bg-[#2b140e] text-rose-300 border-2 border-rose-600 font-bold shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#101b17] border border-transparent'
              }`}
            >
              <PixelSprite name="jerrycan" size={18} />
              <span>GASTO</span>
            </button>
            <button
              type="button"
              onClick={() => handleKindChange('transfer')}
              className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xs text-[10px] font-stencil uppercase tracking-wider transition-all cursor-pointer ${
                kind === 'transfer'
                  ? 'bg-[#0f2121] text-cyan-300 border-2 border-cyan-600 font-bold shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#101b17] border border-transparent'
              }`}
            >
              <PixelSprite name="conveyor" size={18} />
              <span>TRANSFERIR</span>
            </button>
            <button
              type="button"
              onClick={() => handleKindChange('debt_payment')}
              className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xs text-[10px] font-stencil uppercase tracking-wider transition-all cursor-pointer ${
                kind === 'debt_payment'
                  ? 'bg-[#2a1d0b] text-amber-300 border-2 border-amber-600 font-bold shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#101b17] border border-transparent'
              }`}
            >
              <PixelSprite name="chain" size={18} />
              <span>DEUDA</span>
            </button>
            <button
              type="button"
              onClick={() => handleKindChange('loan_given')}
              className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xs text-[10px] font-stencil uppercase tracking-wider transition-all cursor-pointer ${
                kind === 'loan_given'
                  ? 'bg-[#27150c] text-orange-300 border-2 border-orange-600 font-bold shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#101b17] border border-transparent'
              }`}
            >
              <PixelSprite name="sack" size={18} />
              <span>PRESTAR</span>
            </button>
            <button
              type="button"
              onClick={() => handleKindChange('loan_repayment')}
              className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xs text-[10px] font-stencil uppercase tracking-wider transition-all cursor-pointer ${
                kind === 'loan_repayment'
                  ? 'bg-[#12261a] text-emerald-300 border-2 border-emerald-600 font-bold shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#101b17] border border-transparent'
              }`}
            >
              <PixelSprite name="ledger_check" size={18} />
              <span>COBRAR</span>
            </button>
          </div>

          {errorMessage && (
            <div className="flex items-start gap-2 bg-rose-950/80 border-2 border-rose-800 text-rose-300 p-2.5 rounded-xs text-xs font-pixel my-3">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Fecha y Descripción */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                  FECHA
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full bg-[#070c0a] border border-[#273e34] rounded-xs p-2 text-xs font-pixel text-slate-200 focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                  DESCRIPCIÓN OPERATIVA
                </label>
                <input
                  type="text"
                  placeholder="Ej. Gasolina Terpel / Rappi tarde"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#070c0a] border border-[#273e34] rounded-xs p-2 text-xs font-pixel text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* FORMULARIO DE INGRESO */}
            {kind === 'income' && (
              <>
                <div>
                  <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                    INGRESO BRUTO (COP)
                  </label>
                  <MoneyInput value={amount} onChange={setAmount} required placeholder="0" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                      COMISIÓN PLATAFORMA (DESCUENTO)
                    </label>
                    <MoneyInput value={commission} onChange={setCommission} placeholder="Opcional" />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                      PROPINAS RECIBIDAS
                    </label>
                    <MoneyInput value={tip} onChange={setTip} placeholder="Opcional" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                      CATEGORÍA / FUENTE
                    </label>
                    <select
                      value={categoryId}
                      onChange={handleCategoryChange}
                      required
                      className="w-full bg-[#070c0a] border border-[#273e34] rounded-xs p-2 text-xs font-pixel text-slate-200 focus:outline-none focus:border-amber-400"
                    >
                      {categories
                        .filter((c) => c.kind === 'income' && !c.isArchived)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} {c.isMoto ? '🏍️' : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                      BÓVEDA DE DESTINO
                    </label>
                    <select
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      required
                      className="w-full bg-[#070c0a] border border-[#273e34] rounded-xs p-2 text-xs font-pixel text-slate-200 focus:outline-none focus:border-amber-400"
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.kind === 'platform_receivable' ? 'Por cobrar' : 'Disponible'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* FORMULARIO DE GASTO */}
            {kind === 'expense' && (
              <>
                <div>
                  <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                    VALOR DEL GASTO (COP)
                  </label>
                  <MoneyInput value={amount} onChange={setAmount} required placeholder="0" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                      CATEGORÍA
                    </label>
                    <select
                      value={categoryId}
                      onChange={handleCategoryChange}
                      required
                      className="w-full bg-[#070c0a] border border-[#273e34] rounded-xs p-2 text-xs font-pixel text-slate-200 focus:outline-none focus:border-amber-400"
                    >
                      {categories
                        .filter((c) => c.kind === 'expense' && !c.isArchived)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} {c.isMoto ? '🏍️' : ''}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                      MEDIO DE PAGO
                    </label>
                    <div className="flex gap-2 mb-1.5">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('account')}
                        className={`flex-1 py-1 text-xs font-pixel tracking-wider uppercase rounded-xs border transition-colors ${
                          paymentMethod === 'account'
                            ? 'btn-game btn-game-primary'
                            : 'btn-game btn-game-secondary'
                        }`}
                      >
                        CUENTA / EFECTIVO
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('debt')}
                        className={`flex-1 py-1 text-xs font-pixel tracking-wider uppercase rounded-xs border transition-colors ${
                          paymentMethod === 'debt'
                            ? 'btn-game btn-game-primary'
                            : 'btn-game btn-game-secondary'
                        }`}
                      >
                        TARJETA CRÉDITO
                      </button>
                    </div>

                    {paymentMethod === 'account' ? (
                      <select
                        value={accountId}
                        onChange={(e) => setAccountId(e.target.value)}
                        required
                        className="w-full bg-[#070c0a] border border-[#273e34] rounded-xs p-2 text-xs font-pixel text-slate-200 focus:outline-none focus:border-amber-400"
                      >
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <select
                        value={debtId}
                        onChange={(e) => setDebtId(e.target.value)}
                        required
                        className="w-full bg-[#070c0a] border border-[#273e34] rounded-xs p-2 text-xs font-pixel text-slate-200 focus:outline-none focus:border-amber-400"
                      >
                        {debts
                          .filter((d) => d.kind === 'credit_card' || d.status === 'active')
                          .map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} ({d.institution || 'Tarjeta'})
                            </option>
                          ))}
                      </select>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* FORMULARIO DE TRANSFERENCIA */}
            {kind === 'transfer' && (
              <>
                <div>
                  <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                    VALOR A TRANSFERIR (COP)
                  </label>
                  <MoneyInput value={amount} onChange={setAmount} required placeholder="0" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                      BÓVEDA DE ORIGEN
                    </label>
                    <select
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      required
                      className="w-full bg-[#070c0a] border border-[#273e34] rounded-xs p-2 text-xs font-pixel text-slate-200 focus:outline-none focus:border-amber-400"
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                      BÓVEDA DE DESTINO
                    </label>
                    <select
                      value={toAccountId}
                      onChange={(e) => setToAccountId(e.target.value)}
                      required
                      className="w-full bg-[#070c0a] border border-[#273e34] rounded-xs p-2 text-xs font-pixel text-slate-200 focus:outline-none focus:border-amber-400"
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                    COSTO TRANSFERENCIA (COMISIÓN BANCARIA)
                  </label>
                  <MoneyInput value={fee} onChange={setFee} placeholder="0 si es gratuita" />
                </div>
              </>
            )}

            {/* FORMULARIO DE PAGO DE DEUDA */}
            {kind === 'debt_payment' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                      OBLIGACIÓN / PASIVO
                    </label>
                    <select
                      value={debtId}
                      onChange={(e) => setDebtId(e.target.value)}
                      required
                      className="w-full bg-[#070c0a] border border-[#273e34] rounded-xs p-2 text-xs font-pixel text-slate-200 focus:outline-none focus:border-amber-400"
                    >
                      {debts.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.institution || 'Entidad'})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                      BÓVEDA DE PAGO
                    </label>
                    <select
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      required
                      className="w-full bg-[#070c0a] border border-[#273e34] rounded-xs p-2 text-xs font-pixel text-slate-200 focus:outline-none focus:border-amber-400"
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                    ABONO A CAPITAL (REDUCE DEUDA)
                  </label>
                  <MoneyInput value={principal} onChange={setPrincipal} placeholder="0" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                      INTERESES INCLUIDOS (GASTO FINANCIERO)
                    </label>
                    <MoneyInput value={interest} onChange={setInterest} placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                      SEGUROS / CUOTA DE MANEJO
                    </label>
                    <MoneyInput value={debtFees} onChange={setDebtFees} placeholder="0" />
                  </div>
                </div>
              </>
            )}

            {/* FORMULARIO DE PRÉSTAMO OTORGADO */}
            {kind === 'loan_given' && (
              <>
                <div>
                  <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                    MONTO PRESTADO (COP)
                  </label>
                  <MoneyInput value={amount} onChange={setAmount} required placeholder="0" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                      DEUDOR / PERSONA
                    </label>
                    <select
                      value={loanId}
                      onChange={(e) => setLoanId(e.target.value)}
                      className="w-full bg-[#070c0a] border border-[#273e34] rounded-xs p-2 text-xs font-pixel text-slate-200 focus:outline-none focus:border-amber-400 mb-1.5"
                    >
                      <option value="__new__">+ Crear nuevo registro de deudor</option>
                      {loans.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.personName}
                        </option>
                      ))}
                    </select>

                    {loanId === '__new__' && (
                      <input
                        type="text"
                        placeholder="Nombre de la persona"
                        value={loanPersonName}
                        onChange={(e) => setLoanPersonName(e.target.value)}
                        required
                        className="w-full bg-[#070c0a] border border-[#273e34] rounded-xs p-2 text-xs font-pixel text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                      BÓVEDA DESDE LA QUE ENTREGO EL DINERO
                    </label>
                    <select
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      required
                      className="w-full bg-[#070c0a] border border-[#273e34] rounded-xs p-2 text-xs font-pixel text-slate-200 focus:outline-none focus:border-amber-400"
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {loanId === '__new__' && (
                  <div>
                    <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                      FECHA PACTADA DE DEVOLUCIÓN (OPCIONAL)
                    </label>
                    <input
                      type="date"
                      value={loanDueDate}
                      onChange={(e) => setLoanDueDate(e.target.value)}
                      className="w-full bg-[#070c0a] border border-[#273e34] rounded-xs p-2 text-xs font-pixel text-slate-200 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                )}
              </>
            )}

            {/* FORMULARIO DE COBRO DE PRÉSTAMO */}
            {kind === 'loan_repayment' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                      PRÉSTAMO / DEUDOR
                    </label>
                    <select
                      value={loanId}
                      onChange={(e) => setLoanId(e.target.value)}
                      required
                      className="w-full bg-[#070c0a] border border-[#273e34] rounded-xs p-2 text-xs font-pixel text-slate-200 focus:outline-none focus:border-amber-400"
                    >
                      {loans.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.personName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                      BÓVEDA DONDE RECIBO EL DINERO
                    </label>
                    <select
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      required
                      className="w-full bg-[#070c0a] border border-[#273e34] rounded-xs p-2 text-xs font-pixel text-slate-200 focus:outline-none focus:border-amber-400"
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                    CAPITAL DEVUELTO (REDUCE SALDO)
                  </label>
                  <MoneyInput value={principal} onChange={setPrincipal} required placeholder="0" />
                </div>

                <div>
                  <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                    INTERESES PACTADOS RECIBIDOS (INGRESO)
                  </label>
                  <MoneyInput value={interest} onChange={setInterest} placeholder="0" />
                </div>
              </>
            )}

            {/* Checkbox de Motocicleta */}
            {(kind === 'income' || kind === 'expense') && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="moto-check"
                  checked={isMoto}
                  onChange={(e) => setIsMoto(e.target.checked)}
                  className="rounded-xs border border-[#273e34] text-amber-500 focus:ring-amber-500 bg-[#070c0a] cursor-pointer"
                />
                <label htmlFor="moto-check" className="text-xs text-slate-300 font-pixel uppercase tracking-wider cursor-pointer select-none font-bold">
                  Vincular a la Motocicleta (Taller de Moto)
                </label>
              </div>
            )}

            {/* Notas adicionales */}
            <div>
              <label className="block text-slate-300 font-pixel text-[11px] mb-1 tracking-wider uppercase font-bold">
                NOTAS ADICIONALES (OPCIONAL)
              </label>
              <textarea
                rows={2}
                placeholder="Detalles adicionales, recordatorio..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-[#070c0a] border border-[#273e34] rounded-xs p-2 text-xs font-pixel text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Botones de acción con calor de forja */}
            <div className="flex items-center justify-end gap-2.5 pt-3.5 border-t-2 border-[#233a30]">
              <button
                type="button"
                onClick={() => {
                  sound.playClick()
                  closeQuickModal()
                }}
                disabled={isSubmitting}
                className="btn-game btn-game-secondary text-xs py-2 px-3.5 font-pixel"
              >
                CANCELAR
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`btn-game btn-game-primary btn-forge-heat text-xs py-2 px-4.5 font-pixel font-bold flex items-center gap-2 shadow-xl transition-all ${
                  isSubmitting ? 'animate-forge-hot' : ''
                }`}
              >
                <PixelSprite name="tools" size={17} className={isSubmitting ? 'animate-spin' : ''} />
                <span>{isSubmitting ? '¡FORJANDO EN EL YUNQUE!' : 'FORJAR MOVIMIENTO'}</span>
              </button>
            </div>
          </form>
        </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
