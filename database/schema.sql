create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz not null default now()
);

create table if not exists paintings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text,
  description text,
  medium text,
  dimensions text,
  year int,
  price numeric(10,2) not null check (price >= 0),
  image_url text,
  status text not null default 'available' check (status in ('available','sold')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  painting_id uuid not null references paintings on delete restrict,
  customer_id uuid not null references profiles on delete restrict,
  price numeric(10,2) not null check (price >= 0),
  status text not null default 'placed' check (status in ('placed','cancelled')),
  created_at timestamptz not null default now(),
  cancelled_at timestamptz
);

create table if not exists settings (
  key text primary key,
  value text not null
);

create table if not exists wall_bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles on delete restrict,
  booking_date date not null,
  wall_size_sqft int not null check (wall_size_sqft between 10 and 500),
  address text not null,
  rate_per_sqft numeric(10,2) not null check (rate_per_sqft >= 0),
  price numeric(10,2) not null check (price >= 0),
  status text not null default 'requested' check (status in ('requested','confirmed','declined','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists pottery_items (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text,
  price numeric(10,2),
  source_id text unique
);

create table if not exists glazes (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text,
  color_hex text,
  price numeric(10,2),
  source_id text unique
);

create table if not exists pottery_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles on delete restrict,
  item_id uuid not null references pottery_items on delete restrict,
  glaze_id uuid not null references glazes on delete restrict,
  quantity int not null check (quantity between 1 and 12),
  needed_by date not null,
  notes text,
  status text not null default 'requested' check (status in ('requested','accepted','declined','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists paintings_title_unique on paintings(title);
create unique index if not exists one_active_order_per_painting on orders(painting_id) where status = 'placed';
create unique index if not exists one_active_booking_per_date on wall_bookings(booking_date) where status in ('requested','confirmed');
create index if not exists orders_customer_idx on orders(customer_id);
create index if not exists orders_status_idx on orders(status);
create index if not exists bookings_customer_idx on wall_bookings(customer_id);
create index if not exists bookings_status_idx on wall_bookings(status);
create index if not exists pottery_customer_idx on pottery_requests(customer_id);
create index if not exists pottery_status_idx on pottery_requests(status);
create index if not exists paintings_status_idx on paintings(status);

create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists paintings_updated_at on paintings;
create trigger paintings_updated_at before update on paintings for each row execute function set_updated_at();
drop trigger if exists wall_bookings_updated_at on wall_bookings;
create trigger wall_bookings_updated_at before update on wall_bookings for each row execute function set_updated_at();
drop trigger if exists pottery_requests_updated_at on pottery_requests;
create trigger pottery_requests_updated_at before update on pottery_requests for each row execute function set_updated_at();

create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))) on conflict (id) do update set full_name = excluded.full_name;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

create or replace function place_order(p_painting_id uuid, p_customer_id uuid) returns orders language plpgsql security definer set search_path = public as $$
declare
  painting_row paintings;
  order_row orders;
begin
  if auth.uid() is not null and auth.uid() <> p_customer_id then raise exception 'CUSTOMER_MISMATCH'; end if;
  select * into painting_row from paintings where id = p_painting_id for update;
  if not found then raise exception 'PAINTING_NOT_FOUND'; end if;
  if painting_row.status <> 'available' then raise exception 'PAINTING_SOLD'; end if;
  insert into orders (painting_id, customer_id, price) values (p_painting_id, p_customer_id, painting_row.price) returning * into order_row;
  update paintings set status = 'sold' where id = p_painting_id;
  return order_row;
exception when unique_violation then raise exception 'PAINTING_SOLD';
end; $$;

create or replace function cancel_order(p_order_id uuid, p_customer_id uuid) returns orders language plpgsql security definer set search_path = public as $$
declare
  order_row orders;
begin
  if auth.uid() is not null and auth.uid() <> p_customer_id then raise exception 'CUSTOMER_MISMATCH'; end if;
  select * into order_row from orders where id = p_order_id and customer_id = p_customer_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if order_row.status <> 'placed' then raise exception 'ORDER_ALREADY_CANCELLED'; end if;
  update orders set status = 'cancelled', cancelled_at = now() where id = p_order_id returning * into order_row;
  update paintings set status = 'available' where id = order_row.painting_id;
  return order_row;
end; $$;

alter table profiles enable row level security;
alter table paintings enable row level security;
alter table orders enable row level security;
alter table settings enable row level security;
alter table wall_bookings enable row level security;
alter table pottery_items enable row level security;
alter table glazes enable row level security;
alter table pottery_requests enable row level security;

revoke execute on function place_order(uuid, uuid) from public, anon, authenticated;
revoke execute on function cancel_order(uuid, uuid) from public, anon, authenticated;
grant execute on function place_order(uuid, uuid) to service_role;
grant execute on function cancel_order(uuid, uuid) to service_role;
