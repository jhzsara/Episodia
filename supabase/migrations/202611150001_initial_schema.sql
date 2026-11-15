-- Episodia initial schema. All user-owned data is protected by RLS.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (char_length(username) between 3 and 24),
  display_name text not null default '',
  bio text not null default '' check (char_length(bio) <= 240),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.user_shows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tmdb_id integer not null,
  title text not null,
  poster_path text,
  first_air_date date,
  status text not null default 'watchlist' check (status in ('watchlist','watching','completed','paused','dropped')),
  current_season integer not null default 0 check (current_season >= 0),
  current_episode integer not null default 0 check (current_episode >= 0),
  total_episodes integer check (total_episodes is null or total_episodes >= 0),
  personal_rating numeric(2,1) check (personal_rating is null or personal_rating between 0 and 10),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(user_id, tmdb_id)
);
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tmdb_id integer not null,
  show_title text not null,
  body text not null check (char_length(body) between 1 and 2000),
  rating numeric(2,1) check (rating between 0 and 10),
  spoiler boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  followed_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(follower_id, followed_id),
  check (follower_id <> followed_id)
);
create table if not exists public.review_likes (
  user_id uuid not null references auth.users(id) on delete cascade,
  review_id uuid not null references public.reviews(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id, review_id)
);

create index if not exists user_shows_user_status_idx on public.user_shows(user_id,status);
create index if not exists reviews_tmdb_created_idx on public.reviews(tmdb_id,created_at desc);
create index if not exists reviews_user_created_idx on public.reviews(user_id,created_at desc);
create index if not exists follows_followed_idx on public.follows(followed_id);

alter table public.profiles enable row level security;
alter table public.user_shows enable row level security;
alter table public.reviews enable row level security;
alter table public.follows enable row level security;
alter table public.review_likes enable row level security;

create policy "profiles are publicly readable" on public.profiles for select to anon, authenticated using (true);
create policy "users create own profile" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "users update own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "show lists readable by owner" on public.user_shows for select to authenticated using ((select auth.uid()) = user_id);
create policy "users add own shows" on public.user_shows for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "users update own shows" on public.user_shows for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "users delete own shows" on public.user_shows for delete to authenticated using ((select auth.uid()) = user_id);

create policy "reviews publicly readable" on public.reviews for select to anon, authenticated using (true);
create policy "users create own reviews" on public.reviews for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "users edit own reviews" on public.reviews for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "users delete own reviews" on public.reviews for delete to authenticated using ((select auth.uid()) = user_id);

create policy "follows readable" on public.follows for select to authenticated using (true);
create policy "users follow as themselves" on public.follows for insert to authenticated with check ((select auth.uid()) = follower_id);
create policy "users unfollow as themselves" on public.follows for delete to authenticated using ((select auth.uid()) = follower_id);

create policy "likes readable" on public.review_likes for select to authenticated using (true);
create policy "users like as themselves" on public.review_likes for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "users unlike as themselves" on public.review_likes for delete to authenticated using ((select auth.uid()) = user_id);

grant select on public.profiles, public.reviews to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.user_shows to authenticated;
grant insert, update, delete on public.reviews to authenticated;
grant select, insert, delete on public.follows, public.review_likes to authenticated;
