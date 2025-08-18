-- 타입
-- supabase/sql/schema.sql
-- 타입
create type public.loan_status as enum ('reserved','loaned','returned','cancelled');

-- profiles (Auth 연동)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text, -- "unique" 와 "not null" 제약조건 모두 제거
  full_name text,
  role text default 'user',
  created_at timestamptz default now()
);


-- books
create table public.books (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  isbn text,
  title text not null,
  authors text[],
  publisher text,
  published_year int,
  cover_url text,
  available boolean default true,
  created_at timestamptz default now()
);

-- loans
create table public.loans (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  borrower_id uuid not null references public.profiles(id) on delete cascade,
  status loan_status not null default 'reserved',
  requested_at timestamptz default now(),
  approved_at timestamptz,
  due_at timestamptz,
  returned_at timestamptz,
  cancel_reason text
);

-- action tokens (메일 승인 링크)
create table public.action_tokens (
  token uuid primary key default gen_random_uuid(),
  action text not null,
  loan_id uuid not null references public.loans(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz
);

-- notifications (리마인더 중복 방지)
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id) on delete cascade,
  kind text not null,
  sent_at timestamptz default now(),
  unique (loan_id, kind)
);

-- 가용성 동기화 트리거
create or replace function public.sync_book_availability()
returns trigger as $$
begin
  if (new.status in ('reserved','loaned')) then
    update public.books set available=false where id=new.book_id;
  elsif (new.status in ('returned','cancelled')) then
    update public.books b
      set available = not exists (
        select 1 from public.loans l where l.book_id=b.id and l.status in ('reserved','loaned')
      )
    where b.id=new.book_id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_loans_status_sync on public.loans;
create trigger trg_loans_status_sync
after insert or update of status on public.loans
for each row execute function public.sync_book_availability();

-- RLS
alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.loans enable row level security;
alter table public.action_tokens enable row level security;
alter table public.notifications enable row level security;

-- profiles
create policy "profiles self read" on public.profiles for select using ( id = auth.uid() );
create policy "profiles self upsert" on public.profiles for insert with check ( id = auth.uid() );
create policy "profiles self update" on public.profiles for update using ( id = auth.uid() );

-- books
create policy "books read all" on public.books for select using ( true );
create policy "books owner write" on public.books for all using ( owner_id = auth.uid() ) with check ( owner_id = auth.uid() );

-- loans: 오너/차용자만 접근
create policy "loans read" on public.loans for select using ( owner_id = auth.uid() or borrower_id = auth.uid() );
create policy "loans create (borrower only)" on public.loans for insert with check ( borrower_id = auth.uid() );
create policy "loans update (owner only except service)" on public.loans for update using ( owner_id = auth.uid() ) with check ( true );

-- tokens: 함수(서비스롤)만 접근. 일반사용자 차단
create policy "tokens no read" on public.action_tokens for select using ( false );
create policy "tokens no write" on public.action_tokens for all using ( false ) with check ( false );

-- notifications: 함수 전용
create policy "notif no read" on public.notifications for select using ( false );
create policy "notif no write" on public.notifications for all using ( false ) with check ( false );

-- get_due_loans_on 함수 추가
create or replace function public.get_due_loans_on(ymd text)
returns setof public.loans
language sql
security definer
as $$
  select * from public.loans
  where status = 'loaned'::public.loan_status
    and to_char(due_at at time zone 'UTC', 'YYYY-MM-DD') = ymd
$$;
-- ✨ 추가된 코드 시작
-- auth.users 테이블에 새 유저가 추가되면 public.profiles 테이블에도 추가하는 함수
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- "on conflict" 구문 추가: id가 이미 존재하면(충돌하면) 아무것도 하지 않음
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- 위 함수를 호출하는 트리거
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
-- ✨ 추가된 코드 끝