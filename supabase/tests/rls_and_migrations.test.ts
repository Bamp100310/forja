import { describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const USER_1 = '11111111-1111-1111-1111-111111111111'
const USER_2 = '22222222-2222-2222-2222-222222222222'

async function setupTestDb() {
  const db = new PGlite()

  // Simular esquema estándar de Supabase Auth
  await db.exec(`
    create schema if not exists auth;
    create table if not exists auth.users (
      id uuid primary key,
      email text
    );
    create or replace function auth.uid() returns uuid language sql stable as $$
      select nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'sub','')::uuid
    $$;

    do $$
    begin
      if not exists (select 1 from pg_roles where rolname = 'authenticated') then
        create role authenticated nologin;
      end if;
    end
    $$;

    grant usage on schema auth to authenticated;
    grant select on auth.users to authenticated;
  `)

  // Leer y ejecutar la migración oficial del proyecto
  const migrationPath = resolve(process.cwd(), 'supabase/migrations/20261011000000_init_forja.sql')
  const migrationSql = readFileSync(migrationPath, 'utf8')
  await db.exec(migrationSql)

  // Otorgar permisos al rol autenticado sobre el esquema público
  await db.exec(`
    grant usage on schema public to authenticated;
    grant all on all tables in schema public to authenticated;
    grant all on all sequences in schema public to authenticated;
    grant all on all routines in schema public to authenticated;
  `)

  // Registrar los usuarios en auth.users
  await db.exec(`
    insert into auth.users (id, email) values
      ('${USER_1}', 'usuario1@forja.test'),
      ('${USER_2}', 'usuario2@forja.test');
  `)

  return db
}

async function asUser(db: PGlite, userId: string | null) {
  if (userId) {
    await db.exec(`
      set role authenticated;
      select set_config('request.jwt.claims', '{"sub":"${userId}"}', false);
    `)
  } else {
    await db.exec(`
      reset role;
      select set_config('request.jwt.claims', '', false);
    `)
  }
}

describe('Integración PostgreSQL + RLS con PGlite', () => {
  it('aplica las migraciones y asegura la configuración por usuario con ensure_user_setup', async () => {
    const db = await setupTestDb()

    // Usuario 1 se conecta y corre ensure_user_setup
    await asUser(db, USER_1)
    await db.exec(`select public.ensure_user_setup();`)

    const user1Categories = await db.query(`select count(*) as c from public.categories;`)
    expect(Number(user1Categories.rows[0].c)).toBe(25)

    // La base de datos inicia en 0 cuentas para el usuario (cero semillas financieras)
    const user1Accounts = await db.query(`select count(*) as c from public.accounts;`)
    expect(Number(user1Accounts.rows[0].c)).toBe(0)

    // Usuario 2 se conecta: aún no tiene nada hasta que corre setup
    await asUser(db, USER_2)
    const user2InitialCategories = await db.query(`select count(*) as c from public.categories;`)
    expect(Number(user2InitialCategories.rows[0].c)).toBe(0)

    await db.exec(`select public.ensure_user_setup();`)
    const user2Categories = await db.query(`select count(*) as c from public.categories;`)
    expect(Number(user2Categories.rows[0].c)).toBe(25)
  })

  it('Caso I — aislamiento estricto entre usuarios (RLS)', async () => {
    const db = await setupTestDb()

    // Usuario 1 crea datos
    await asUser(db, USER_1)
    await db.exec(`select public.ensure_user_setup();`)
    await db.exec(`
      insert into public.debts (id, user_id, name, kind, opening_balance, opening_date)
      values ('33333333-3333-3333-3333-333333333333', '${USER_1}', 'Tarjeta Secreta U1', 'credit_card', 500000, '2026-09-01');
    `)

    // Usuario 2 no debe ver las deudas de Usuario 1
    await asUser(db, USER_2)
    await db.exec(`select public.ensure_user_setup();`)
    const debtsVisibleToU2 = await db.query(`select * from public.debts;`)
    expect(debtsVisibleToU2.rows.length).toBe(0)

    // Usuario 2 no puede insertar con el user_id de Usuario 1
    let insertBlocked = false
    try {
      await db.exec(`
        insert into public.accounts (user_id, name, kind, opening_balance, opening_date)
        values ('${USER_1}', 'Cuenta Hack U1', 'cash', 100000, '2026-09-01');
      `)
    } catch {
      insertBlocked = true
    }
    expect(insertBlocked).toBe(true)

    // Usuario 2 no puede modificar datos de Usuario 1
    await db.exec(`
      update public.debts set name = 'Hackeada' where id = '33333333-3333-3333-3333-333333333333';
    `)

    await asUser(db, USER_1)
    const debtU1 = await db.query(`select name from public.debts where id = '33333333-3333-3333-3333-333333333333';`)
    expect(debtU1.rows[0].name).toBe('Tarjeta Secreta U1')
  })

  it('impide asociar asientos contables a cuentas de otros usuarios', async () => {
    const db = await setupTestDb()

    await asUser(db, USER_1)
    await db.exec(`select public.ensure_user_setup();`)
    const u1AccInsert = await db.query(`
      insert into public.accounts (user_id, name, kind, opening_balance, opening_date)
      values ('${USER_1}', 'Bóveda U1', 'cash', 0, '2026-09-01')
      returning id;
    `)
    const u1Acc = u1AccInsert.rows[0].id

    await asUser(db, USER_2)
    await db.exec(`select public.ensure_user_setup();`)

    // Usuario 2 intenta crear una transacción usando una cuenta de Usuario 1
    let crossReferenceBlocked = false
    try {
      await db.exec(`
        insert into public.transactions (id, user_id, date, kind, description, client_request_id)
        values ('44444444-4444-4444-4444-444444444444', '${USER_2}', '2026-09-20', 'expense', 'Test cross', 'req-cross');

        insert into public.postings (user_id, transaction_id, target_type, target_id, amount)
        values ('${USER_2}', '44444444-4444-4444-4444-444444444444', 'account', '${u1Acc}', -50000);
      `)
    } catch {
      crossReferenceBlocked = true
    }
    expect(crossReferenceBlocked).toBe(true)
  })

  it('el trigger diferido rechaza transacciones desbalanceadas', async () => {
    const db = await setupTestDb()

    await asUser(db, USER_1)
    await db.exec(`select public.ensure_user_setup();`)
    const u1AccInsert = await db.query(`
      insert into public.accounts (user_id, name, kind, opening_balance, opening_date)
      values ('${USER_1}', 'Bóveda Balance U1', 'cash', 0, '2026-09-01')
      returning id;
    `)
    const u1Acc = u1AccInsert.rows[0].id

    let unbalancedBlocked = false
    try {
      // Iniciar transacción SQL: insertar posting no balanceado y hacer commit
      await db.exec(`
        begin;
        insert into public.transactions (id, user_id, date, kind, description, client_request_id)
        values ('55555555-5555-5555-5555-555555555555', '${USER_1}', '2026-09-20', 'expense', 'Desbalanceada', 'req-unbal');

        insert into public.postings (user_id, transaction_id, target_type, target_id, amount)
        values ('${USER_1}', '55555555-5555-5555-5555-555555555555', 'account', '${u1Acc}', 50000);
        commit;
      `)
    } catch {
      unbalancedBlocked = true
    }
    expect(unbalancedBlocked).toBe(true)
  })

  it('save_transaction_atomic guarda atómicamente y es idempotente', async () => {
    const db = await setupTestDb()

    await asUser(db, USER_1)
    await db.exec(`select public.ensure_user_setup();`)

    const accInsert = await db.query(`
      insert into public.accounts (user_id, name, kind, opening_balance, opening_date)
      values ('${USER_1}', 'Caja Efectivo U1', 'cash', 0, '2026-09-01')
      returning id;
    `)
    const acc = accInsert.rows[0].id
    const cat = (await db.query(`select id from public.categories where kind = 'expense' limit 1;`)).rows[0].id

    const txPayload = JSON.stringify({
      date: '2026-09-20',
      kind: 'expense',
      description: 'Almuerzo de trabajo',
      client_request_id: 'req-atomic-123',
    })

    const postingsPayload = JSON.stringify([
      { target_type: 'category', target_id: cat, amount: 25000, role: 'payment' },
      { target_type: 'account', target_id: acc, amount: -25000, role: 'payment' },
    ])

    // Primer guardado
    const res1 = await db.query(`select public.save_transaction_atomic($1::jsonb, $2::jsonb, null) as res;`, [
      txPayload,
      postingsPayload,
    ])
    const txId1 = (res1.rows[0].res as { id: string }).id
    expect(txId1).toBeDefined()

    // Verificar en la vista agregada
    const totals = await db.query(`select * from public.ledger_target_totals where target_id = '${acc}';`)
    expect(Number(totals.rows[0].total)).toBe(-25000)

    // Segundo guardado con el mismo client_request_id (reintento idempotente)
    const res2 = await db.query(`select public.save_transaction_atomic($1::jsonb, $2::jsonb, null) as res;`, [
      txPayload,
      postingsPayload,
    ])
    const txId2 = (res2.rows[0].res as { id: string }).id
    expect(txId2).toBe(txId1) // Mismo ID de transacción

    // No se duplicaron las líneas en el libro
    const postingsCount = await db.query(`select count(*) as c from public.postings where transaction_id = '${txId1}';`)
    expect(Number(postingsCount.rows[0].c)).toBe(2)

    const totalsAfter = await db.query(`select * from public.ledger_target_totals where target_id = '${acc}';`)
    expect(Number(totalsAfter.rows[0].total)).toBe(-25000)
  })
})
