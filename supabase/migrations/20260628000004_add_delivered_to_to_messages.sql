ALTER TABLE messages ADD COLUMN delivered_to uuid[] DEFAULT '{}'::uuid[] NOT NULL;
CREATE INDEX idx_messages_delivered_to ON messages USING GIN (delivered_to);
