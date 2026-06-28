-- ============================================================
-- Fix: Message delivery/read status + RLS policies
-- Run this in your Supabase SQL Editor if status is broken.
-- ============================================================

-- 1. Ensure last_read_at exists on chat_participants
ALTER TABLE chat_participants ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ;

-- 2. Ensure read_by and delivered_to exist on messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_by UUID[] DEFAULT '{}'::UUID[] NOT NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS delivered_to UUID[] DEFAULT '{}'::UUID[] NOT NULL;

-- 3. Enable RLS on chat_participants (if not already)
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;

-- 4. Allow users to UPDATE their own chat_participants row (for last_read_at)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chat_participants' AND policyname = 'Users can update own participant row'
  ) THEN
    CREATE POLICY "Users can update own participant row"
      ON chat_participants FOR UPDATE
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- 5. Allow users to SELECT their own chat_participants rows
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chat_participants' AND policyname = 'Users can select own participant rows'
  ) THEN
    CREATE POLICY "Users can select own participant rows"
      ON chat_participants FOR SELECT
      USING (user_id = auth.uid());
  END IF;
END $$;

-- 6. Allow all chat participants to SELECT each other's rows (needed for last_read_at)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chat_participants' AND policyname = 'Participants can see each other'
  ) THEN
    CREATE POLICY "Participants can see each other"
      ON chat_participants FOR SELECT
      USING (
        chat_id IN (
          SELECT chat_id FROM chat_participants WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;
