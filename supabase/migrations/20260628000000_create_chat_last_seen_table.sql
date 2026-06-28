create table public.chat_last_seen (
  user_id uuid references auth.uid not null references auth.users on delete cascade,
  chat_id uuid not null references chats on delete cascade,
  last_seen_at timestamp with time zone not null,
  primary key (user_id, chat_id)
);