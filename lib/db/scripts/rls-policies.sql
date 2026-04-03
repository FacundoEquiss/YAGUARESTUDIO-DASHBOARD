-- RLS hardening for multi-tenant data isolation.
-- This script is idempotent and safe to run multiple times.

create schema if not exists app;

do $$
begin
  -- Ensures the common application role cannot bypass RLS.
  -- If this cannot be changed in managed environments, the script continues.
  if current_user = 'postgres' then
    execute 'alter role postgres nobypassrls';
  end if;
exception
  when insufficient_privilege then
    raise notice 'Could not alter role to NOBYPASSRLS due to privileges.';
end;
$$;

create or replace function app.current_user_id()
returns integer
language plpgsql
stable
as $$
declare
  raw_value text;
begin
  raw_value := nullif(current_setting('app.user_id', true), '');
  if raw_value is null then
    return null;
  end if;

  return raw_value::integer;
exception
  when others then
    return null;
end;
$$;

create or replace function app.current_user_role()
returns text
language sql
stable
as $$
  select coalesce(nullif(current_setting('app.user_role', true), ''), 'user');
$$;

create or replace function app.is_master()
returns boolean
language sql
stable
as $$
  select app.current_user_role() = 'master';
$$;

-- Helper to reduce policy duplication.
create or replace function app.is_tenant_owner(owner_user_id integer)
returns boolean
language sql
stable
as $$
  select owner_user_id = app.current_user_id() or app.is_master();
$$;

-- Clients
alter table if exists public.clients enable row level security;
alter table if exists public.clients force row level security;
drop policy if exists clients_select_policy on public.clients;
create policy clients_select_policy on public.clients
  for select
  using (app.is_tenant_owner(user_id));
drop policy if exists clients_insert_policy on public.clients;
create policy clients_insert_policy on public.clients
  for insert
  with check (app.is_tenant_owner(user_id));
drop policy if exists clients_update_policy on public.clients;
create policy clients_update_policy on public.clients
  for update
  using (app.is_tenant_owner(user_id))
  with check (app.is_tenant_owner(user_id));
drop policy if exists clients_delete_policy on public.clients;
create policy clients_delete_policy on public.clients
  for delete
  using (app.is_tenant_owner(user_id));

-- Orders
alter table if exists public.orders enable row level security;
alter table if exists public.orders force row level security;
drop policy if exists orders_select_policy on public.orders;
create policy orders_select_policy on public.orders
  for select
  using (app.is_tenant_owner(user_id));
drop policy if exists orders_insert_policy on public.orders;
create policy orders_insert_policy on public.orders
  for insert
  with check (app.is_tenant_owner(user_id));
drop policy if exists orders_update_policy on public.orders;
create policy orders_update_policy on public.orders
  for update
  using (app.is_tenant_owner(user_id))
  with check (app.is_tenant_owner(user_id));
drop policy if exists orders_delete_policy on public.orders;
create policy orders_delete_policy on public.orders
  for delete
  using (app.is_tenant_owner(user_id));

-- Order costs inherit ownership from orders
alter table if exists public.order_costs enable row level security;
alter table if exists public.order_costs force row level security;
drop policy if exists order_costs_select_policy on public.order_costs;
create policy order_costs_select_policy on public.order_costs
  for select
  using (
    exists (
      select 1
      from public.orders o
      where o.id = order_costs.order_id
        and app.is_tenant_owner(o.user_id)
    )
  );
drop policy if exists order_costs_insert_policy on public.order_costs;
create policy order_costs_insert_policy on public.order_costs
  for insert
  with check (
    exists (
      select 1
      from public.orders o
      where o.id = order_costs.order_id
        and app.is_tenant_owner(o.user_id)
    )
  );
drop policy if exists order_costs_update_policy on public.order_costs;
create policy order_costs_update_policy on public.order_costs
  for update
  using (
    exists (
      select 1
      from public.orders o
      where o.id = order_costs.order_id
        and app.is_tenant_owner(o.user_id)
    )
  )
  with check (
    exists (
      select 1
      from public.orders o
      where o.id = order_costs.order_id
        and app.is_tenant_owner(o.user_id)
    )
  );
drop policy if exists order_costs_delete_policy on public.order_costs;
create policy order_costs_delete_policy on public.order_costs
  for delete
  using (
    exists (
      select 1
      from public.orders o
      where o.id = order_costs.order_id
        and app.is_tenant_owner(o.user_id)
    )
  );

-- Suppliers
alter table if exists public.suppliers enable row level security;
alter table if exists public.suppliers force row level security;
drop policy if exists suppliers_select_policy on public.suppliers;
create policy suppliers_select_policy on public.suppliers
  for select
  using (app.is_tenant_owner(user_id));
drop policy if exists suppliers_insert_policy on public.suppliers;
create policy suppliers_insert_policy on public.suppliers
  for insert
  with check (app.is_tenant_owner(user_id));
drop policy if exists suppliers_update_policy on public.suppliers;
create policy suppliers_update_policy on public.suppliers
  for update
  using (app.is_tenant_owner(user_id))
  with check (app.is_tenant_owner(user_id));
drop policy if exists suppliers_delete_policy on public.suppliers;
create policy suppliers_delete_policy on public.suppliers
  for delete
  using (app.is_tenant_owner(user_id));

-- Transactions
alter table if exists public.transactions enable row level security;
alter table if exists public.transactions force row level security;
drop policy if exists transactions_select_policy on public.transactions;
create policy transactions_select_policy on public.transactions
  for select
  using (app.is_tenant_owner(user_id));
drop policy if exists transactions_insert_policy on public.transactions;
create policy transactions_insert_policy on public.transactions
  for insert
  with check (app.is_tenant_owner(user_id));
drop policy if exists transactions_update_policy on public.transactions;
create policy transactions_update_policy on public.transactions
  for update
  using (app.is_tenant_owner(user_id))
  with check (app.is_tenant_owner(user_id));
drop policy if exists transactions_delete_policy on public.transactions;
create policy transactions_delete_policy on public.transactions
  for delete
  using (app.is_tenant_owner(user_id));

-- Financial accounts
alter table if exists public.financial_accounts enable row level security;
alter table if exists public.financial_accounts force row level security;
drop policy if exists financial_accounts_select_policy on public.financial_accounts;
create policy financial_accounts_select_policy on public.financial_accounts
  for select
  using (app.is_tenant_owner(user_id));
drop policy if exists financial_accounts_insert_policy on public.financial_accounts;
create policy financial_accounts_insert_policy on public.financial_accounts
  for insert
  with check (app.is_tenant_owner(user_id));
drop policy if exists financial_accounts_update_policy on public.financial_accounts;
create policy financial_accounts_update_policy on public.financial_accounts
  for update
  using (app.is_tenant_owner(user_id))
  with check (app.is_tenant_owner(user_id));
drop policy if exists financial_accounts_delete_policy on public.financial_accounts;
create policy financial_accounts_delete_policy on public.financial_accounts
  for delete
  using (app.is_tenant_owner(user_id));

-- Products
alter table if exists public.products enable row level security;
alter table if exists public.products force row level security;
drop policy if exists products_select_policy on public.products;
create policy products_select_policy on public.products
  for select
  using (app.is_tenant_owner(user_id));
drop policy if exists products_insert_policy on public.products;
create policy products_insert_policy on public.products
  for insert
  with check (app.is_tenant_owner(user_id));
drop policy if exists products_update_policy on public.products;
create policy products_update_policy on public.products
  for update
  using (app.is_tenant_owner(user_id))
  with check (app.is_tenant_owner(user_id));
drop policy if exists products_delete_policy on public.products;
create policy products_delete_policy on public.products
  for delete
  using (app.is_tenant_owner(user_id));

-- Product stock movements
alter table if exists public.product_stock_movements enable row level security;
alter table if exists public.product_stock_movements force row level security;
drop policy if exists product_stock_movements_select_policy on public.product_stock_movements;
create policy product_stock_movements_select_policy on public.product_stock_movements
  for select
  using (app.is_tenant_owner(user_id));
drop policy if exists product_stock_movements_insert_policy on public.product_stock_movements;
create policy product_stock_movements_insert_policy on public.product_stock_movements
  for insert
  with check (app.is_tenant_owner(user_id));
drop policy if exists product_stock_movements_update_policy on public.product_stock_movements;
create policy product_stock_movements_update_policy on public.product_stock_movements
  for update
  using (app.is_tenant_owner(user_id))
  with check (app.is_tenant_owner(user_id));
drop policy if exists product_stock_movements_delete_policy on public.product_stock_movements;
create policy product_stock_movements_delete_policy on public.product_stock_movements
  for delete
  using (app.is_tenant_owner(user_id));

-- User DTF settings
alter table if exists public.user_dtf_settings enable row level security;
alter table if exists public.user_dtf_settings force row level security;
drop policy if exists user_dtf_settings_select_policy on public.user_dtf_settings;
create policy user_dtf_settings_select_policy on public.user_dtf_settings
  for select
  using (app.is_tenant_owner(user_id));
drop policy if exists user_dtf_settings_insert_policy on public.user_dtf_settings;
create policy user_dtf_settings_insert_policy on public.user_dtf_settings
  for insert
  with check (app.is_tenant_owner(user_id));
drop policy if exists user_dtf_settings_update_policy on public.user_dtf_settings;
create policy user_dtf_settings_update_policy on public.user_dtf_settings
  for update
  using (app.is_tenant_owner(user_id))
  with check (app.is_tenant_owner(user_id));
drop policy if exists user_dtf_settings_delete_policy on public.user_dtf_settings;
create policy user_dtf_settings_delete_policy on public.user_dtf_settings
  for delete
  using (app.is_tenant_owner(user_id));

-- User subscriptions
alter table if exists public.user_subscriptions enable row level security;
alter table if exists public.user_subscriptions force row level security;
drop policy if exists user_subscriptions_select_policy on public.user_subscriptions;
create policy user_subscriptions_select_policy on public.user_subscriptions
  for select
  using (app.is_tenant_owner(user_id));
drop policy if exists user_subscriptions_insert_policy on public.user_subscriptions;
create policy user_subscriptions_insert_policy on public.user_subscriptions
  for insert
  with check (app.is_tenant_owner(user_id));
drop policy if exists user_subscriptions_update_policy on public.user_subscriptions;
create policy user_subscriptions_update_policy on public.user_subscriptions
  for update
  using (app.is_tenant_owner(user_id))
  with check (app.is_tenant_owner(user_id));
drop policy if exists user_subscriptions_delete_policy on public.user_subscriptions;
create policy user_subscriptions_delete_policy on public.user_subscriptions
  for delete
  using (app.is_tenant_owner(user_id));

-- Usage counters
alter table if exists public.usage_counters enable row level security;
alter table if exists public.usage_counters force row level security;
drop policy if exists usage_counters_select_policy on public.usage_counters;
create policy usage_counters_select_policy on public.usage_counters
  for select
  using (app.is_tenant_owner(user_id));
drop policy if exists usage_counters_insert_policy on public.usage_counters;
create policy usage_counters_insert_policy on public.usage_counters
  for insert
  with check (app.is_tenant_owner(user_id));
drop policy if exists usage_counters_update_policy on public.usage_counters;
create policy usage_counters_update_policy on public.usage_counters
  for update
  using (app.is_tenant_owner(user_id))
  with check (app.is_tenant_owner(user_id));
drop policy if exists usage_counters_delete_policy on public.usage_counters;
create policy usage_counters_delete_policy on public.usage_counters
  for delete
  using (app.is_tenant_owner(user_id));

-- Usage events
alter table if exists public.usage_events enable row level security;
alter table if exists public.usage_events force row level security;
drop policy if exists usage_events_select_policy on public.usage_events;
create policy usage_events_select_policy on public.usage_events
  for select
  using (app.is_tenant_owner(user_id));
drop policy if exists usage_events_insert_policy on public.usage_events;
create policy usage_events_insert_policy on public.usage_events
  for insert
  with check (app.is_tenant_owner(user_id));
drop policy if exists usage_events_update_policy on public.usage_events;
create policy usage_events_update_policy on public.usage_events
  for update
  using (app.is_tenant_owner(user_id))
  with check (app.is_tenant_owner(user_id));
drop policy if exists usage_events_delete_policy on public.usage_events;
create policy usage_events_delete_policy on public.usage_events
  for delete
  using (app.is_tenant_owner(user_id));

-- Feedbacks
alter table if exists public.feedbacks enable row level security;
alter table if exists public.feedbacks force row level security;
drop policy if exists feedbacks_select_policy on public.feedbacks;
create policy feedbacks_select_policy on public.feedbacks
  for select
  using (app.is_tenant_owner(user_id));
drop policy if exists feedbacks_insert_policy on public.feedbacks;
create policy feedbacks_insert_policy on public.feedbacks
  for insert
  with check (app.is_tenant_owner(user_id));
drop policy if exists feedbacks_update_policy on public.feedbacks;
create policy feedbacks_update_policy on public.feedbacks
  for update
  using (app.is_tenant_owner(user_id))
  with check (app.is_tenant_owner(user_id));
drop policy if exists feedbacks_delete_policy on public.feedbacks;
create policy feedbacks_delete_policy on public.feedbacks
  for delete
  using (app.is_tenant_owner(user_id));
