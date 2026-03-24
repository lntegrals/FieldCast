-- FieldCast Database Schema
-- Run this in Supabase SQL Editor to set up the database

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Users table (extends Supabase auth.users)
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  role text not null check (role in ('farmer', 'buyer')) default 'buyer',
  full_name text not null,
  email text not null unique,
  phone text,
  created_at timestamptz not null default now()
);

-- Farms
create table public.farms (
  id uuid primary key default uuid_generate_v4(),
  owner_user_id uuid references public.users(id) on delete cascade not null,
  farm_name text not null,
  description text,
  city text not null,
  state text not null,
  pickup_instructions text,
  created_at timestamptz not null default now()
);

-- Voice Notes
create table public.voice_notes (
  id uuid primary key default uuid_generate_v4(),
  farm_id uuid references public.farms(id) on delete cascade not null,
  audio_url text not null,
  transcript_raw text,
  transcript_clean text,
  transcription_status text not null check (transcription_status in ('pending', 'processing', 'completed', 'failed')) default 'pending',
  created_at timestamptz not null default now()
);

-- Listing Drafts
create table public.listing_drafts (
  id uuid primary key default uuid_generate_v4(),
  farm_id uuid references public.farms(id) on delete cascade not null,
  voice_note_id uuid references public.voice_notes(id) on delete set null,
  title text not null default '',
  category text,
  product_name text not null default '',
  description text,
  quantity_available numeric,
  quantity_unit text,
  price_amount numeric,
  price_unit text,
  harvest_date date,
  fulfillment_type text check (fulfillment_type in ('pickup', 'delivery', 'both')),
  pickup_location text,
  pickup_start_time timestamptz,
  pickup_end_time timestamptz,
  status text not null check (status in ('draft', 'review', 'published', 'discarded')) default 'draft',
  ai_confidence numeric,
  missing_fields_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Published Listings
create table public.listings (
  id uuid primary key default uuid_generate_v4(),
  farm_id uuid references public.farms(id) on delete cascade not null,
  draft_id uuid references public.listing_drafts(id) on delete set null,
  title text not null,
  category text,
  product_name text not null,
  description text,
  quantity_available numeric,
  quantity_unit text,
  price_amount numeric,
  price_unit text,
  harvest_date date,
  fulfillment_type text check (fulfillment_type in ('pickup', 'delivery', 'both')),
  pickup_location text,
  pickup_start_time timestamptz,
  pickup_end_time timestamptz,
  published_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- Buyer Subscriptions
create table public.buyer_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  farm_id uuid references public.farms(id) on delete cascade not null,
  category text,
  product_keyword text,
  notification_channel text not null check (notification_channel in ('email', 'sms')) default 'email',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Notifications
create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  subscription_id uuid references public.buyer_subscriptions(id) on delete cascade not null,
  listing_id uuid references public.listings(id) on delete cascade not null,
  channel text not null check (channel in ('email', 'sms')),
  delivery_status text not null default 'pending',
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================
-- INDEXES
-- ============================================

create index idx_farms_owner on public.farms(owner_user_id);
create index idx_voice_notes_farm on public.voice_notes(farm_id);
create index idx_listing_drafts_farm on public.listing_drafts(farm_id);
create index idx_listings_farm on public.listings(farm_id);
create index idx_listings_published on public.listings(published_at desc);
create index idx_listings_expires on public.listings(expires_at) where expires_at is not null;
create index idx_buyer_subscriptions_farm on public.buyer_subscriptions(farm_id);
create index idx_buyer_subscriptions_user on public.buyer_subscriptions(user_id);
create index idx_notifications_listing on public.notifications(listing_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table public.users enable row level security;
alter table public.farms enable row level security;
alter table public.voice_notes enable row level security;
alter table public.listing_drafts enable row level security;
alter table public.listings enable row level security;
alter table public.buyer_subscriptions enable row level security;
alter table public.notifications enable row level security;

-- Users: can read/update own profile
create policy "Users can view own profile" on public.users for select using (auth.uid() = id);
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.users for insert with check (auth.uid() = id);

-- Farms: owners full access, everyone can read
create policy "Anyone can view farms" on public.farms for select using (true);
create policy "Farm owners can insert" on public.farms for insert with check (auth.uid() = owner_user_id);
create policy "Farm owners can update" on public.farms for update using (auth.uid() = owner_user_id);
create policy "Farm owners can delete" on public.farms for delete using (auth.uid() = owner_user_id);

-- Voice Notes: only farm owner
create policy "Farm owners can manage voice notes" on public.voice_notes for all using (
  farm_id in (select id from public.farms where owner_user_id = auth.uid())
);

-- Listing Drafts: only farm owner
create policy "Farm owners can manage drafts" on public.listing_drafts for all using (
  farm_id in (select id from public.farms where owner_user_id = auth.uid())
);

-- Listings: anyone can read published, owners can manage
create policy "Anyone can view published listings" on public.listings for select using (true);
create policy "Farm owners can manage listings" on public.listings for insert with check (
  farm_id in (select id from public.farms where owner_user_id = auth.uid())
);
create policy "Farm owners can update listings" on public.listings for update using (
  farm_id in (select id from public.farms where owner_user_id = auth.uid())
);
create policy "Farm owners can delete listings" on public.listings for delete using (
  farm_id in (select id from public.farms where owner_user_id = auth.uid())
);

-- Buyer Subscriptions: users manage own
create policy "Users can manage own subscriptions" on public.buyer_subscriptions for all using (auth.uid() = user_id);

-- Notifications: users can view own
create policy "Users can view own notifications" on public.notifications for select using (
  subscription_id in (select id from public.buyer_subscriptions where user_id = auth.uid())
);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-update updated_at on listing_drafts
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at
  before update on public.listing_drafts
  for each row execute function update_updated_at();

-- Handle new user signup: create profile
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'buyer')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
