-- ============================================================================
-- FORJA — Migración 20261016000000: Corrección de integridad referencial en préstamos,
-- deudas y gastos recurrentes al eliminar registros padre, y soporte de transferencias.
-- ============================================================================
-- Corrige el error en ON DELETE SET NULL de claves foráneas compuestas (target_id, user_id),
-- donde PostgreSQL por omisión intentaba anular user_id (restringido con NOT NULL).
-- La sintaxis estándar ON DELETE SET NULL (columna) asegura que solo se anule la
-- referencia específica (loan_id, debt_id, etc.) conservando el propietario user_id.
-- ============================================================================

-- 1. Transacciones -> Préstamos
alter table public.transactions
  drop constraint if exists transactions_loan_id_user_id_fkey;

alter table public.transactions
  add constraint transactions_loan_id_user_id_fkey
  foreign key (loan_id, user_id) references public.loans(id, user_id) on delete set null (loan_id);

-- 2. Transacciones -> Deudas
alter table public.transactions
  drop constraint if exists transactions_debt_id_user_id_fkey;

alter table public.transactions
  add constraint transactions_debt_id_user_id_fkey
  foreign key (debt_id, user_id) references public.debts(id, user_id) on delete set null (debt_id);

-- 3. Gastos recurrentes -> Bóvedas / Cuentas
alter table public.recurring_expenses
  drop constraint if exists recurring_expenses_payment_account_id_user_id_fkey;

alter table public.recurring_expenses
  add constraint recurring_expenses_payment_account_id_user_id_fkey
  foreign key (payment_account_id, user_id) references public.accounts(id, user_id) on delete set null (payment_account_id);

-- 4. Gastos recurrentes -> Deudas
alter table public.recurring_expenses
  drop constraint if exists recurring_expenses_payment_debt_id_user_id_fkey;

alter table public.recurring_expenses
  add constraint recurring_expenses_payment_debt_id_user_id_fkey
  foreign key (payment_debt_id, user_id) references public.debts(id, user_id) on delete set null (payment_debt_id);
