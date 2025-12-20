/*
  # Add chat tables and relationships

  1. New Tables
    - `private_messages`
      - `id` (uuid, primary key)
      - `content` (text)
      - `sender_id` (uuid, references auth.users)
      - `receiver_id` (uuid, references auth.users)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `read` (boolean)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to:
      - Read their own messages (sent or received)
      - Send messages to other users
      - Update read status of received messages
*/

-- Create private messages table
CREATE TABLE IF NOT EXISTS private_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    content text NOT NULL,
    sender_id uuid REFERENCES auth.users NOT NULL,
    receiver_id uuid REFERENCES auth.users NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    read boolean DEFAULT false
);

-- Enable RLS
ALTER TABLE private_messages ENABLE ROW LEVEL SECURITY;

-- Policies for private messages
CREATE POLICY "Users can read their own messages"
    ON private_messages
    FOR SELECT
    TO authenticated
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages"
    ON private_messages
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can mark messages as read"
    ON private_messages
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = receiver_id)
    WITH CHECK (auth.uid() = receiver_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_private_messages_sender_id ON private_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_private_messages_receiver_id ON private_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_private_messages_created_at ON private_messages(created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_private_messages_updated_at
    BEFORE UPDATE ON private_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();