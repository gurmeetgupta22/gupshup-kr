-- Add read_by column to messages table for tracking which users have read each message
alter table public.messages
  add column read_by uuid[] default '{}'::uuid[] not null;

-- Add index for read_by queries (used in sidebar unread checks)
create index idx_messages_read_by on public.messages using gin (read_by);
