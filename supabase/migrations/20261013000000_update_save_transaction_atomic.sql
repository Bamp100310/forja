-- ============================================================================
-- FORJA — Migración 20261013000000: Actualización atómica de movimientos
-- ============================================================================
-- Soporte para edición de transacciones existentes por su ID (p_tx->>'id')
-- preservando idempotencia por client_request_id y manteniendo la integridad
-- de los asientos contables mediante reemplazo atómico balanceado.
-- ============================================================================

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

grant execute on function public.save_transaction_atomic(jsonb, jsonb, jsonb) to authenticated;
