-- Create notification_type enum
CREATE TYPE notification_type AS ENUM (
    'SYSTEM_ERROR', -- For admin-only notifications (OpenAI errors, server issues)
    'DATA_COLLECTION_COMPLETE', -- When all issues are fetched
    'PROCESSING_COMPLETE', -- When all issues are processed
    'ANALYSIS_COMPLETE', -- When analysis is complete
    'REPORT_COMPLETE', -- When report generation is complete
    'PROCESSING_ERROR', -- When one or more issues fail to process
    'ANALYSIS_ERROR' -- When one or more issues fail to analyze
);

-- Create notifications table
CREATE TABLE notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb, -- For storing additional context (repo name, error details, etc.)
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add updated_at trigger
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX notifications_user_id_idx ON notifications(user_id);
CREATE INDEX notifications_type_idx ON notifications(type);
CREATE INDEX notifications_created_at_idx ON notifications(created_at);
CREATE INDEX notifications_is_read_idx ON notifications(is_read);

-- RLS policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view their own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

-- Allow the service role to insert notifications
CREATE POLICY "Service role can insert notifications"
    ON notifications FOR INSERT
    WITH CHECK (true);

-- Users can only update is_read status of their own notifications
CREATE POLICY "Users can update is_read"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Add a trigger to prevent updating anything other than is_read
CREATE OR REPLACE FUNCTION check_notification_update()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.title != OLD.title OR
       NEW.message != OLD.message OR
       NEW.type != OLD.type OR
       NEW.metadata != OLD.metadata OR
       NEW.user_id != OLD.user_id THEN
        RAISE EXCEPTION 'Only is_read field can be updated';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_only_is_read_update
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION check_notification_update();

-- Function to create system notifications for admins
CREATE OR REPLACE FUNCTION create_admin_notification(
    p_title TEXT,
    p_message TEXT,
    p_type notification_type,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS void AS $$
BEGIN
    INSERT INTO notifications (user_id, title, message, type, metadata)
    SELECT
        id as user_id,
        p_title,
        p_message,
        p_type,
        p_metadata
    FROM auth.users
    WHERE is_admin = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
