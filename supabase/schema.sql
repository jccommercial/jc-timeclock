-- JC Commercial Time Clock — database schema
-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.

create extension if not exists pgcrypto;

-- Cleaners / contractors
create table if not exists contractors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pin text not null,                 -- 4-digit PIN the cleaner enters
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Client sites
create table if not exists sites (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  qr_token uuid not null unique default gen_random_uuid(),  -- unguessable token baked into the QR code
  expected_hours_per_week numeric,   -- for expected-vs-actual reporting
  lat double precision,              -- optional: site coordinates for GPS distance check
  lng double precision,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Clock-in / clock-out records
create table if not exists shifts (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references contractors(id),
  site_id uuid not null references sites(id),
  clock_in timestamptz not null default now(),
  clock_out timestamptz,
  in_lat double precision,
  in_lng double precision,
  in_accuracy double precision,
  in_distance_m double precision,    -- distance from site at clock-in (if site has coords)
  out_lat double precision,
  out_lng double precision,
  out_accuracy double precision,
  out_distance_m double precision,
  note text,                         -- cleaner's note at clock-out
  has_issue boolean not null default false,  -- cleaner flagged an issue
  flagged boolean not null default false,    -- system/admin flag (GPS mismatch, long shift, etc.)
  flag_reason text,
  edited_by_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists shifts_open_idx on shifts (contractor_id) where clock_out is null;
create index if not exists shifts_site_time_idx on shifts (site_id, clock_in);
create index if not exists shifts_time_idx on shifts (clock_in);

-- Lock everything down. No policies are created, so the public anon key
-- has zero access. The app talks to the database exclusively through
-- Next.js API routes using the service-role key (which bypasses RLS).
alter table contractors enable row level security;
alter table sites enable row level security;
alter table shifts enable row level security;
