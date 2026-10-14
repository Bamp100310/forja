-- ============================================================================
-- FORJA V2: Módulos configurables, ciclos financieros y preferencias por usuario
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tabla de preferencias de usuario y módulos habilitados
-- ----------------------------------------------------------------------------
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active_modules text[] not null default array['moto', 'platforms', 'debts_loans', 'recurring', 'budgets', 'reports']::text[],
  cycle_config jsonb not null default '{"type": "custom_cut", "startDay": 11, "name": "Corte de Alejo (11 al 10)"}'::jsonb,
  income_schedules jsonb not null default '[]'::jsonb,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Habilitar RLS estricto
alter table public.user_preferences enable row level security;

-- Políticas de seguridad para aislamiento multiusuario
drop policy if exists "user_preferences_select" on public.user_preferences;
create policy "user_preferences_select"
  on public.user_preferences for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user_preferences_insert" on public.user_preferences;
create policy "user_preferences_insert"
  on public.user_preferences for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "user_preferences_update" on public.user_preferences;
create policy "user_preferences_update"
  on public.user_preferences for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_preferences_delete" on public.user_preferences;
create policy "user_preferences_delete"
  on public.user_preferences for delete
  to authenticated
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 2. Migración no destructiva: inicializar preferencias para perfiles existentes
-- ----------------------------------------------------------------------------
insert into public.user_preferences (user_id, active_modules, cycle_config, income_schedules, onboarding_completed)
select
  p.id as user_id,
  array['moto', 'platforms', 'debts_loans', 'recurring', 'budgets', 'reports']::text[] as active_modules,
  '{"type": "custom_cut", "startDay": 11, "name": "Corte de Alejo (11 al 10)"}'::jsonb as cycle_config,
  '[]'::jsonb as income_schedules,
  true as onboarding_completed
from public.profiles p
on conflict (user_id) do nothing;

-- ----------------------------------------------------------------------------
-- 3. Actualizar ensure_user_setup para inicializar preferencias en nuevos usuarios
-- ----------------------------------------------------------------------------
create or replace function public.ensure_user_setup()
returns void as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  -- 1. Perfil del operario si no existe
  insert into public.profiles (id, display_name)
  values (v_uid, 'Operario Forja')
  on conflict (id) do nothing;

  -- 2. Preferencias iniciales de V2 si no existen (módulos, ciclo y nómina)
  insert into public.user_preferences (
    user_id,
    active_modules,
    cycle_config,
    income_schedules,
    onboarding_completed
  )
  values (
    v_uid,
    array['moto', 'platforms', 'debts_loans', 'recurring', 'budgets', 'reports']::text[],
    '{"type": "custom_cut", "startDay": 11, "name": "Corte de Alejo (11 al 10)"}'::jsonb,
    '[]'::jsonb,
    false
  )
  on conflict (user_id) do nothing;

  -- 3. Categorías contables si no tiene ninguna
  if not exists (select 1 from public.categories where user_id = v_uid) then
    insert into public.categories (user_id, kind, name, icon, color, is_moto, system_key, sort_order) values
      -- Ingresos de producción / plataformas
      (v_uid, 'income', 'Rappi', 'package', '#ff4d4d', true, null, 1),
      (v_uid, 'income', 'DiDi Food', 'bike', '#ff8c00', true, null, 2),
      (v_uid, 'income', 'Clicoh', 'truck', '#00b4d8', true, null, 3),
      (v_uid, 'income', 'Viajes / Envíos particulares', 'sparkles', '#10b981', true, null, 4),
      (v_uid, 'income', 'Propinas', 'coins', '#f59e0b', true, 'tips', 5),
      (v_uid, 'income', 'Salario / Nómina fija', 'wallet', '#34d399', false, null, 6),
      (v_uid, 'income', 'Rendimientos de ahorros', 'trending-up', '#06b6d4', false, 'interest_income', 7),
      (v_uid, 'income', 'Otros ingresos', 'plus-circle', '#94a3b8', false, null, 8),
      -- Gastos operativos / moto / personales
      (v_uid, 'expense', 'Gasolina', 'fuel', '#f59e0b', true, null, 9),
      (v_uid, 'expense', 'Mantenimiento preventivo moto', 'wrench', '#f97316', true, null, 10),
      (v_uid, 'expense', 'Mantenimiento correctivo moto', 'flame', '#ef4444', true, null, 11),
      (v_uid, 'expense', 'Lavado moto', 'droplet', '#38bdf8', true, null, 12),
      (v_uid, 'expense', 'SOAT y Tecnicomecánica', 'shield-alert', '#a855f7', true, null, 13),
      (v_uid, 'expense', 'Comisión plataforma', 'scissors', '#fb7185', true, 'platform_commission', 14),
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
end;
$$ language plpgsql security invoker;

-- ----------------------------------------------------------------------------
-- 4. Permisos de acceso
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant all on public.user_preferences to authenticated;
  end if;
end;
$$;
