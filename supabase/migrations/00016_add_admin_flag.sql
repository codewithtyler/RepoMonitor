-- Add is_admin column to auth.users table
ALTER TABLE auth.users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;

-- Create a policy to allow only admins to update the is_admin column
CREATE POLICY "Only admins can update is_admin"
ON auth.users
FOR UPDATE
USING (auth.uid() IN (SELECT id FROM auth.users WHERE is_admin = TRUE))
WITH CHECK (auth.uid() IN (SELECT id FROM auth.users WHERE is_admin = TRUE));

-- Create an index for faster lookups
CREATE INDEX users_is_admin_idx ON auth.users (is_admin);
