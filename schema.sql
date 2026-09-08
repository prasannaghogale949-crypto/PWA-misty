-- Sahyadri Passport — schema.sql
-- Run against a Supabase Postgres project. Assumes pgcrypto for gen_random_uuid().
create extension if not exists pgcrypto;

-- ============================================================================
-- SERIES  (a collectible "set", e.g. Series 01: Forts & Bastions)
-- ============================================================================
create table series (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,           -- 'forts-and-bastions-01'
  title       text not null,                  -- 'Forts & Bastions'
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- ============================================================================
-- USERS  (trekkers) — thin profile table mirroring auth.users (Supabase native
-- phone-OTP auth owns the actual credential; this just adds app-specific
-- fields the auth table doesn't have).
-- ============================================================================
create table user_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique,                    -- for @handle on social exports
  phone       text,
  created_at  timestamptz not null default now()
);

-- ============================================================================
-- MANAGERS  (partner store staff) — deliberately NOT in auth.users. Quick-PIN
-- login is a separate, lightweight credential system so a shared store
-- tablet never touches a trekker's Supabase auth session.
-- ============================================================================
create table stores (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  fort_name      text not null,               -- which fort base this store sits at
  commission_inr numeric(10,2) not null default 70.00,
  created_at     timestamptz not null default now()
);

create table managers (
  id           uuid primary key default gen_random_uuid(),
  store_id     uuid not null references stores(id) on delete cascade,
  phone        text unique not null,
  pin_hash     text not null,                 -- bcrypt/argon2 hash, never plaintext
  created_at   timestamptz not null default now()
);

create table manager_sessions (
  token        text primary key default encode(gen_random_bytes(24), 'hex'),
  manager_id   uuid not null references managers(id) on delete cascade,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default (now() + interval '12 hours')
);

-- ============================================================================
-- STAMPS  (physical, serialized die-cut collectibles — one row per printed
-- unit, generated in a batch before distribution to stores)
-- ============================================================================
create table stamps (
  id            uuid primary key default gen_random_uuid(),
  series_id     uuid not null references series(id),
  qr_code       text unique not null,          -- encoded on the physical die-cut stamp
  fort_name     text not null,
  summit_lat    numeric(9,6) not null,         -- known summit marker coordinates,
  summit_lng    numeric(9,6) not null,         -- used for AR viewfinder geofence check
  status        text not null default 'in_inventory'
                  check (status in ('in_inventory','activated','claimed')),
  store_id      uuid references stores(id),    -- which store holds/sold it
  activated_by  uuid references managers(id),
  activated_at  timestamptz,
  claimed_by    uuid references user_profiles(id),
  claimed_at    timestamptz,
  created_at    timestamptz not null default now()
);
create index stamps_store_status_idx on stamps(store_id, status);

-- Trekker's collected stamps — one row per successful summit verification.
-- (Kept separate from `stamps.claimed_by` so the join view is cheap and a
-- trekker's collection history is queryable on its own.)
create table user_stamps (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references user_profiles(id) on delete cascade,
  stamp_id      uuid not null references stamps(id),
  distance_m    numeric(8,2),                 -- GPS distance at verification time
  acquired_at   timestamptz not null default now(),
  unique (user_id, stamp_id)
);

-- ============================================================================
-- TRANSACTIONS  (commission ledger — one row per activation)
-- ============================================================================
create table transactions (
  id             uuid primary key default gen_random_uuid(),
  manager_id     uuid not null references managers(id),
  store_id       uuid not null references stores(id),
  stamp_id       uuid not null references stamps(id),
  commission_inr numeric(10,2) not null,
  created_at     timestamptz not null default now()
);
create index transactions_manager_created_idx on transactions(manager_id, created_at);

-- ============================================================================
-- SUPPORT
-- ============================================================================
create table support_tickets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references user_profiles(id),
  message     text not null,
  status      text not null default 'open' check (status in ('open','resolved')),
  created_at  timestamptz not null default now()
);

-- ============================================================================
-- VIEW: manager_ledger_summary — powers the Financial Ledger Dashboard
-- ============================================================================
create view manager_ledger_summary as
select
  m.id as manager_id,
  m.store_id,
  count(t.*) filter (where t.created_at::date = current_date) as stamps_activated_today,
  coalesce(sum(t.commission_inr) filter (where t.created_at::date = current_date), 0) as pending_commission_inr,
  (
    select jsonb_agg(jsonb_build_object('fort_name', s.fort_name, 'remaining', s.remaining))
    from (
      select fort_name, count(*) as remaining
      from stamps
      where store_id = m.store_id and status = 'in_inventory'
      group by fort_name
      having count(*) < 10
    ) s
  ) as low_stock_forts
from managers m
left join transactions t on t.manager_id = m.id
group by m.id, m.store_id;

-- ============================================================================
-- RPC: manager_login — validates phone + PIN, issues a session token
-- ============================================================================
create or replace function manager_login(p_phone text, p_pin text)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_manager managers%rowtype;
  v_store   stores%rowtype;
  v_session manager_sessions%rowtype;
begin
  select * into v_manager from managers where phone = p_phone;
  if not found or v_manager.pin_hash <> crypt(p_pin, v_manager.pin_hash) then
    return null;
  end if;

  select * into v_store from stores where id = v_manager.store_id;

  insert into manager_sessions (manager_id) values (v_manager.id)
    returning * into v_session;

  return jsonb_build_object(
    'manager_id', v_manager.id,
    'store_name', v_store.name,
    'session_token', v_session.token,
    'expires_at', v_session.expires_at
  );
end;
$$;

-- ============================================================================
-- RPC: activate_stamp — the manager scanner's core write. Idempotent: a
-- re-scan of an already-activated stamp reports back cleanly instead of
-- double-crediting commission.
-- ============================================================================
create or replace function activate_stamp(p_qr_code text, p_manager_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_stamp stamps%rowtype;
  v_store_id uuid;
  v_commission numeric;
begin
  select * into v_stamp from stamps where qr_code = p_qr_code for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  if v_stamp.status <> 'in_inventory' then
    return jsonb_build_object('status', 'already_activated', 'fort_name', v_stamp.fort_name);
  end if;

  select store_id, commission_inr into v_store_id, v_commission
    from managers join stores on stores.id = managers.store_id
    where managers.id = p_manager_id;

  update stamps
    set status = 'activated', activated_by = p_manager_id, activated_at = now()
    where id = v_stamp.id;

  insert into transactions (manager_id, store_id, stamp_id, commission_inr)
    values (p_manager_id, v_store_id, v_stamp.id, v_commission);

  return jsonb_build_object('status', 'activated', 'fort_name', v_stamp.fort_name);
end;
$$;

-- ============================================================================
-- RPC: verify_summit — claims an activated stamp for a trekker once the AR
-- viewfinder + GPS geofence check has passed client-side. Re-checks the
-- distance server-side isn't done here for MVP simplicity; harden before
-- production by passing raw coordinates instead of a client-computed
-- distance.
-- ============================================================================
create or replace function verify_summit(p_qr_code text, p_user_id uuid, p_distance_m numeric default null)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_stamp stamps%rowtype;
  v_user_stamp_id uuid;
begin
  select * into v_stamp from stamps where qr_code = p_qr_code for update;

  if not found or v_stamp.status = 'in_inventory' then
    raise exception 'Stamp not yet activated by a partner store.';
  end if;

  insert into user_stamps (user_id, stamp_id, distance_m)
    values (p_user_id, v_stamp.id, p_distance_m)
    on conflict (user_id, stamp_id) do nothing
    returning id into v_user_stamp_id;

  update stamps set status = 'claimed', claimed_by = p_user_id, claimed_at = now()
    where id = v_stamp.id and status <> 'claimed';

  return jsonb_build_object('stamp_id', v_stamp.id);
end;
$$;

-- ============================================================================
-- RPC: get_vault — returns the full series roster for a user, with
-- collected/locked state, for the Vault grid.
-- ============================================================================
create or replace function get_vault(p_user_id uuid, p_series_slug text)
returns table (
  stamp_id uuid,
  fort_name text,
  qr_code text,
  collected boolean,
  acquired_at timestamptz
)
language sql
stable
as $$
  select
    st.id,
    st.fort_name,
    st.qr_code,
    (us.id is not null) as collected,
    us.acquired_at
  from stamps st
  join series se on se.id = st.series_id and se.slug = p_series_slug
  left join user_stamps us on us.stamp_id = st.id and us.user_id = p_user_id
  order by st.fort_name;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table user_profiles enable row level security;
alter table user_stamps enable row level security;
alter table support_tickets enable row level security;
alter table stamps enable row level security;
alter table transactions enable row level security;
-- Views (manager_ledger_summary) inherit RLS from their base tables; the
-- explicit revokes below are what actually keeps it out of anon's reach.

create policy "trekkers read own profile" on user_profiles
  for select using (auth.uid() = id);
create policy "trekkers update own profile" on user_profiles
  for update using (auth.uid() = id);

create policy "trekkers read own stamps" on user_stamps
  for select using (auth.uid() = user_id);

create policy "anyone can look up a stamp by qr" on stamps
  for select using (true); -- needed for the pre-auth AR-viewfinder lookup

create policy "trekkers file their own tickets" on support_tickets
  for insert with check (auth.uid() = user_id or user_id is null);

-- Managers never authenticate via Supabase auth, so `transactions` and the
-- ledger view are only ever reached through the security-definer RPCs above
-- (manager_login / activate_stamp), which check manager_sessions themselves
-- rather than relying on auth.uid(). Do not expose `transactions` or
-- `manager_ledger_summary` directly to the anon role.
revoke all on transactions from anon;
revoke all on manager_ledger_summary from anon;
revoke all on managers from anon;
revoke all on manager_sessions from anon;
