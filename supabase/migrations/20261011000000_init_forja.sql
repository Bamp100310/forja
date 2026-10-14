-- ============================================================================
-- FORJA: Migración inicial del sistema financiero y contable
-- ============================================================================

-- gen_random_uuid() está incorporado en el núcleo de PostgreSQL 13+ (Supabase y PGlite).

-- ----------------------------------------------------------------------------
-- 1. Perfiles de usuario
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  moto_name text,
  moto_initial_odometer bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 2. Cuentas financieras (efectivo, bancos, billeteras, cuentas por cobrar plataformas)
-- ----------------------------------------------------------------------------
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('cash', 'bank', 'wallet', 'savings', 'platform_receivable', 'other')),
  opening_balance bigint not null default 0,
  opening_date date not null,
  color text,
  is_archived boolean not null default false,
  notes text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique(id, user_id)
);

-- ----------------------------------------------------------------------------
-- 3. Categorías de ingresos y gastos
-- ----------------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('income', 'expense')),
  name text not null,
  icon text,
  color text,
  is_moto boolean not null default false,
  system_key text check (system_key in ('financial_interest', 'financial_fees', 'platform_commission', 'tips', 'interest_income')),
  is_archived boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique(id, user_id)
);

-- ----------------------------------------------------------------------------
-- 4. Deudas y obligaciones (tarjetas de crédito y libre inversión)
-- ----------------------------------------------------------------------------
create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('credit_card', 'personal_loan', 'other')),
  institution text,
  opening_balance bigint not null default 0,
  opening_date date not null,
  credit_limit bigint,
  interest_rate numeric,
  cut_day int check (cut_day between 1 and 31),
  due_day int check (due_day between 1 and 31),
  expected_installment bigint,
  total_installments int,
  status text not null default 'active' check (status in ('active', 'closed')),
  notes text,
  created_at timestamptz not null default now(),
  unique(id, user_id)
);

-- ----------------------------------------------------------------------------
-- 5. Préstamos otorgados a terceros (cuentas por cobrar)
-- ----------------------------------------------------------------------------
create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_name text not null,
  start_date date not null,
  due_date date,
  interest_note text,
  is_archived boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  unique(id, user_id)
);

-- ----------------------------------------------------------------------------
-- 6. Transacciones (cabecera de movimientos)
-- ----------------------------------------------------------------------------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  kind text not null check (kind in ('income', 'expense', 'transfer', 'debt_payment', 'debt_charge', 'debt_disbursement', 'loan_given', 'loan_repayment', 'adjustment')),
  description text not null,
  notes text,
  tags text[] not null default '{}',
  is_moto boolean not null default false,
  debt_id uuid,
  loan_id uuid,
  meta jsonb not null default '{}'::jsonb,
  client_request_id text not null,
  created_at timestamptz not null default now(),
  foreign key (debt_id, user_id) references public.debts(id, user_id) on delete set null,
  foreign key (loan_id, user_id) references public.loans(id, user_id) on delete set null,
  unique(id, user_id),
  unique(user_id, client_request_id)
);

-- ----------------------------------------------------------------------------
-- 7. Postings (asientos contables en partida doble)
-- ----------------------------------------------------------------------------
create table if not exists public.postings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid not null,
  target_type text not null check (target_type in ('account', 'debt', 'loan', 'category', 'equity')),
  target_id uuid,
  amount bigint not null check (amount <> 0),
  role text check (role in ('gross', 'commission', 'tip', 'net', 'principal', 'interest', 'fee', 'payment', 'transfer', 'disbursement', 'adjustment')),
  foreign key (transaction_id, user_id) references public.transactions(id, user_id) on delete cascade,
  check ((target_type = 'equity' and target_id is null) or (target_type <> 'equity' and target_id is not null))
);

create index if not exists idx_postings_tx on public.postings(transaction_id);
create index if not exists idx_postings_user_target on public.postings(user_id, target_type, target_id);
create index if not exists idx_transactions_user_date on public.transactions(user_id, date);

-- ----------------------------------------------------------------------------
-- 8. Trigger de balance contable diferido: sum(amount) = 0 por transacción
-- ----------------------------------------------------------------------------
create or replace function public.check_postings_balance()
returns trigger as $$
declare
  v_sum bigint;
  v_count int;
  v_tx_id uuid;
begin
  v_tx_id := coalesce(new.transaction_id, old.transaction_id);
  select coalesce(sum(amount), 0), count(*)
    into v_sum, v_count
    from public.postings
   where transaction_id = v_tx_id;

  if v_count > 0 and v_sum <> 0 then
    raise exception 'Desbalance contable en transacción %: la suma de líneas es % (debe ser 0)', v_tx_id, v_sum;
  end if;

  return null;
end;
$$ language plpgsql;

drop trigger if exists trg_postings_balance on public.postings;
create constraint trigger trg_postings_balance
after insert or update or delete on public.postings
deferrable initially deferred
for each row
execute function public.check_postings_balance();

-- ----------------------------------------------------------------------------
-- 9. Trigger de integridad referencial cruzada para postings (mismo user_id)
-- ----------------------------------------------------------------------------
create or replace function public.check_posting_target_ownership()
returns trigger as $$
declare
  v_exists boolean;
begin
  if new.target_type = 'account' then
    select exists(select 1 from public.accounts where id = new.target_id and user_id = new.user_id) into v_exists;
    if not v_exists then
      raise exception 'Cuenta inexistente o no autorizada para el usuario: %', new.target_id;
    end if;
  elsif new.target_type = 'debt' then
    select exists(select 1 from public.debts where id = new.target_id and user_id = new.user_id) into v_exists;
    if not v_exists then
      raise exception 'Deuda inexistente o no autorizada para el usuario: %', new.target_id;
    end if;
  elsif new.target_type = 'loan' then
    select exists(select 1 from public.loans where id = new.target_id and user_id = new.user_id) into v_exists;
    if not v_exists then
      raise exception 'Préstamo inexistente o no autorizado para el usuario: %', new.target_id;
    end if;
  elsif new.target_type = 'category' then
    select exists(select 1 from public.categories where id = new.target_id and user_id = new.user_id) into v_exists;
    if not v_exists then
      raise exception 'Categoría inexistente o no autorizada para el usuario: %', new.target_id;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_posting_target_ownership on public.postings;
create trigger trg_posting_target_ownership
before insert or update on public.postings
for each row
execute function public.check_posting_target_ownership();

-- ----------------------------------------------------------------------------
-- 10. Vista agregada de totales por destino (con security_invoker)
-- ----------------------------------------------------------------------------
create or replace view public.ledger_target_totals
with (security_invoker = true) as
select
  user_id,
  target_type,
  target_id,
  sum(amount)::bigint as total,
  count(*)::int as count
from public.postings
group by user_id, target_type, target_id;

-- ----------------------------------------------------------------------------
-- 11. Gastos recurrentes y ocurrencias confirmadas/omitidas
-- ----------------------------------------------------------------------------
create table if not exists public.recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount bigint not null,
  category_id uuid not null,
  frequency text not null check (frequency in ('weekly', 'biweekly', 'monthly', 'bimonthly', 'quarterly', 'semiannual', 'yearly')),
  anchor_date date not null,
  end_date date,
  payment_account_id uuid,
  payment_debt_id uuid,
  status text not null default 'active' check (status in ('active', 'paused', 'ended')),
  notes text,
  created_at timestamptz not null default now(),
  foreign key (category_id, user_id) references public.categories(id, user_id),
  foreign key (payment_account_id, user_id) references public.accounts(id, user_id) on delete set null,
  foreign key (payment_debt_id, user_id) references public.debts(id, user_id) on delete set null,
  unique(id, user_id)
);

create table if not exists public.recurring_occurrences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recurring_id uuid not null,
  due_date date not null,
  status text not null check (status in ('paid', 'skipped')),
  transaction_id uuid,
  created_at timestamptz not null default now(),
  foreign key (recurring_id, user_id) references public.recurring_expenses(id, user_id) on delete cascade,
  foreign key (transaction_id, user_id) references public.transactions(id, user_id) on delete set null,
  unique(recurring_id, due_date),
  unique(id, user_id)
);

-- ----------------------------------------------------------------------------
-- 12. Taller de Moto: Jornadas / viajes y mantenimientos
-- ----------------------------------------------------------------------------
create table if not exists public.moto_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  kind text not null default 'shift' check (kind in ('shift', 'trip')),
  category_id uuid,
  hours numeric,
  trips_count int,
  km numeric,
  odometer_start bigint,
  odometer_end bigint,
  notes text,
  transaction_id uuid,
  created_at timestamptz not null default now(),
  foreign key (category_id, user_id) references public.categories(id, user_id) on delete set null,
  foreign key (transaction_id, user_id) references public.transactions(id, user_id) on delete set null,
  unique(id, user_id)
);

create table if not exists public.moto_maintenance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  kind text not null default 'preventive' check (kind in ('preventive', 'corrective')),
  title text not null,
  odometer bigint,
  next_due_date date,
  next_due_odometer bigint,
  notes text,
  transaction_id uuid,
  created_at timestamptz not null default now(),
  foreign key (transaction_id, user_id) references public.transactions(id, user_id) on delete set null,
  unique(id, user_id)
);

-- ----------------------------------------------------------------------------
-- 13. Presupuestos y Objetivos financieros
-- ----------------------------------------------------------------------------
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null,
  amount bigint not null,
  basis text not null default 'calendar_month' check (basis in ('calendar_month', 'cut')),
  created_at timestamptz not null default now(),
  foreign key (category_id, user_id) references public.categories(id, user_id) on delete cascade,
  unique(user_id, category_id, basis),
  unique(id, user_id)
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('save', 'reduce_debt', 'maintenance_fund', 'reserve')),
  target_amount bigint not null,
  target_date date,
  account_id uuid,
  debt_id uuid,
  baseline_amount bigint,
  status text not null default 'active' check (status in ('active', 'archived')),
  notes text,
  created_at timestamptz not null default now(),
  foreign key (account_id, user_id) references public.accounts(id, user_id) on delete set null,
  foreign key (debt_id, user_id) references public.debts(id, user_id) on delete set null,
  unique(id, user_id)
);

-- ----------------------------------------------------------------------------
-- 14. Habilitación de Row Level Security (RLS) en todas las tablas
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.debts enable row level security;
alter table public.loans enable row level security;
alter table public.transactions enable row level security;
alter table public.postings enable row level security;
alter table public.recurring_expenses enable row level security;
alter table public.recurring_occurrences enable row level security;
alter table public.moto_logs enable row level security;
alter table public.moto_maintenance enable row level security;
alter table public.budgets enable row level security;
alter table public.goals enable row level security;

-- Políticas de aislamiento estricto por usuario:
create policy "own_profiles" on public.profiles for all to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "own_accounts" on public.accounts for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own_categories" on public.categories for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own_debts" on public.debts for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own_loans" on public.loans for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own_transactions" on public.transactions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own_postings" on public.postings for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own_recurring_expenses" on public.recurring_expenses for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own_recurring_occurrences" on public.recurring_occurrences for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own_moto_logs" on public.moto_logs for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own_moto_maintenance" on public.moto_maintenance for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own_budgets" on public.budgets for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own_goals" on public.goals for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select on public.ledger_target_totals to authenticated;

-- ----------------------------------------------------------------------------
-- 15. Función de inicialización automática de catálogo y perfil
-- ----------------------------------------------------------------------------
create or replace function public.ensure_user_setup()
returns void as $$
declare
  v_uid uuid := auth.uid();
  v_cat_count int;
begin
  if v_uid is null then
    raise exception 'ensure_user_setup requiere un usuario autenticado';
  end if;

  -- 1. Perfil
  insert into public.profiles (id, display_name)
  values (v_uid, 'Piloto FORJA')
  on conflict (id) do nothing;

  -- 2. Categorías base si el usuario no tiene ninguna (catálogo inicial, sin saldos ni movimientos)
  select count(*) into v_cat_count from public.categories where user_id = v_uid;
  if v_cat_count = 0 then
    insert into public.categories (user_id, kind, name, icon, color, is_moto, system_key, sort_order) values
      -- Ingresos
      (v_uid, 'income', 'Rappi', 'bike', '#ff7a59', true, null, 1),
      (v_uid, 'income', 'DiDi Food', 'bike', '#ffb347', true, null, 2),
      (v_uid, 'income', 'Clicoh', 'package', '#5ee6c9', true, null, 3),
      (v_uid, 'income', 'Viajes particulares', 'route', '#7cc6fe', true, null, 4),
      (v_uid, 'income', 'Otros trabajos', 'hammer', '#b8e05a', false, null, 5),
      (v_uid, 'income', 'Ingresos ocasionales', 'sparkles', '#c59bff', false, null, 6),
      (v_uid, 'income', 'Otros ingresos', 'coins', '#9fb4ae', false, null, 7),
      (v_uid, 'income', 'Propinas', 'heart-handshake', '#ffd166', true, 'tips', 8),
      (v_uid, 'income', 'Intereses ganados', 'percent', '#6ee7b7', false, 'interest_income', 9),
      -- Gastos
      (v_uid, 'expense', 'Gasolina', 'fuel', '#ff9f43', true, null, 10),
      (v_uid, 'expense', 'Mantenimiento moto', 'wrench', '#f6c453', true, null, 11),
      (v_uid, 'expense', 'Repuestos, llantas y aceite', 'cog', '#e8a33d', true, null, 12),
      (v_uid, 'expense', 'Reparaciones', 'hammer', '#d98b3a', true, null, 13),
      (v_uid, 'expense', 'Comisiones de plataforma', 'receipt', '#c77d4f', true, 'platform_commission', 14),
      (v_uid, 'expense', 'Alimentación', 'utensils', '#ff7a7a', false, null, 15),
      (v_uid, 'expense', 'Intereses y cargos financieros', 'percent', '#ff6b81', false, 'financial_interest', 16),
      (v_uid, 'expense', 'Comisiones y cuotas de manejo', 'landmark', '#e05f7a', false, 'financial_fees', 17),
      (v_uid, 'expense', 'Suscripciones', 'gamepad-2', '#a78bfa', false, null, 18),
      (v_uid, 'expense', 'Internet hogar', 'wifi', '#60a5fa', false, null, 19),
      (v_uid, 'expense', 'Celular y datos', 'smartphone', '#38bdf8', false, null, 20),
      (v_uid, 'expense', 'Compras personales', 'shopping-bag', '#f472b6', false, null, 21),
      (v_uid, 'expense', 'Salidas y entretenimiento', 'party-popper', '#fb7185', false, null, 22),
      (v_uid, 'expense', 'Salud', 'heart-pulse', '#4ade80', false, null, 23),
      (v_uid, 'expense', 'Imprevistos', 'triangle-alert', '#facc15', false, null, 24),
      (v_uid, 'expense', 'Otros gastos', 'circle-ellipsis', '#94a3b8', false, null, 25);
  end if;
  -- Cuentas: la base de datos de producción inicia sin cuentas registradas para el usuario.
end;
$$ language plpgsql security invoker;

-- ----------------------------------------------------------------------------
-- 16. Guardado atómico e idempotente de transacciones (RPC)
-- ----------------------------------------------------------------------------
create or replace function public.save_transaction_atomic(
  p_tx jsonb,
  p_postings jsonb,
  p_new_loan jsonb default null
)
returns jsonb as $$
declare
  v_uid uuid := auth.uid();
  v_client_req_id text;
  v_existing_tx_id uuid;
  v_tx_id uuid;
  v_posting jsonb;
  v_target_id uuid;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  v_client_req_id := p_tx->>'client_request_id';
  if v_client_req_id is null or trim(v_client_req_id) = '' then
    raise exception 'client_request_id es requerido para garantizar idempotencia';
  end if;

  -- Crear préstamo nuevo si fue solicitado
  if p_new_loan is not null and (p_new_loan->>'id') is not null then
    insert into public.loans (id, user_id, person_name, start_date, due_date, interest_note, notes)
    values (
      (p_new_loan->>'id')::uuid,
      v_uid,
      p_new_loan->>'person_name',
      (p_new_loan->>'start_date')::date,
      nullif(p_new_loan->>'due_date', '')::date,
      nullif(p_new_loan->>'interest_note', ''),
      nullif(p_new_loan->>'notes', '')
    )
    on conflict (id) do nothing;
  end if;

  -- Comprobar si ya existe por ID explícito (edición) o por client_request_id (idempotencia)
  if (p_tx->>'id') is not null and trim(p_tx->>'id') <> '' then
    select id into v_existing_tx_id
      from public.transactions
     where user_id = v_uid and id = (p_tx->>'id')::uuid;
  elsif v_client_req_id is not null and trim(v_client_req_id) <> '' then
    select id into v_existing_tx_id
      from public.transactions
     where user_id = v_uid and client_request_id = v_client_req_id;
  end if;

  if v_existing_tx_id is not null then
    v_tx_id := v_existing_tx_id;
    -- Actualizar cabecera
    update public.transactions set
      date = (p_tx->>'date')::date,
      kind = p_tx->>'kind',
      description = p_tx->>'description',
      notes = nullif(p_tx->>'notes', ''),
      tags = coalesce((select array_agg(x.value::text) from jsonb_array_elements_text(p_tx->'tags') x), '{}'),
      is_moto = coalesce((p_tx->>'is_moto')::boolean, false),
      debt_id = nullif(p_tx->>'debt_id', '')::uuid,
      loan_id = nullif(p_tx->>'loan_id', '')::uuid,
      meta = coalesce(p_tx->'meta', '{}'::jsonb)
    where id = v_tx_id and user_id = v_uid;

    -- Reemplazar líneas
    delete from public.postings where transaction_id = v_tx_id and user_id = v_uid;
  else
    v_tx_id := coalesce(nullif(p_tx->>'id', '')::uuid, gen_random_uuid());
    insert into public.transactions (
      id, user_id, date, kind, description, notes, tags, is_moto, debt_id, loan_id, meta, client_request_id
    ) values (
      v_tx_id,
      v_uid,
      (p_tx->>'date')::date,
      p_tx->>'kind',
      p_tx->>'description',
      nullif(p_tx->>'notes', ''),
      coalesce((select array_agg(x.value::text) from jsonb_array_elements_text(p_tx->'tags') x), '{}'),
      coalesce((p_tx->>'is_moto')::boolean, false),
      nullif(p_tx->>'debt_id', '')::uuid,
      nullif(p_tx->>'loan_id', '')::uuid,
      coalesce(p_tx->'meta', '{}'::jsonb),
      v_client_req_id
    );
  end if;

  -- Insertar cada línea contable
  for v_posting in select * from jsonb_array_elements(p_postings)
  loop
    v_target_id := nullif(v_posting->>'target_id', '')::uuid;
    insert into public.postings (
      user_id, transaction_id, target_type, target_id, amount, role
    ) values (
      v_uid,
      v_tx_id,
      v_posting->>'target_type',
      v_target_id,
      (v_posting->>'amount')::bigint,
      nullif(v_posting->>'role', '')
    );
  end loop;

  return jsonb_build_object('id', v_tx_id, 'client_request_id', v_client_req_id);
end;
$$ language plpgsql security invoker;

-- ----------------------------------------------------------------------------
-- 17. Permisos de seguridad por roles (anon denegado, authenticated habilitado)
-- ----------------------------------------------------------------------------
do $$
begin
  -- Revocar accesos del rol no autenticado (anon) si existe en el entorno
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on all tables in schema public from anon;
    revoke all on all sequences in schema public from anon;
    revoke all on all routines in schema public from anon;
  end if;

  -- Habilitar permisos de ejecución y DML para usuarios autenticados
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant usage on schema public to authenticated;
    grant all on all tables in schema public to authenticated;
    grant all on all sequences in schema public to authenticated;
    grant all on all routines in schema public to authenticated;
    grant select on public.ledger_target_totals to authenticated;
  end if;
end;
$$;

