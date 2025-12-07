-- Migration: Enhanced Task Management System
-- This migration enhances the existing tasks table with priority, action tags, and time tracking

-- Create task priority enum
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Create task action tag enum
CREATE TYPE task_action_tag AS ENUM (
  'meeting',
  'pending_customer',
  'for_review',
  'send_email',
  'follow_up',
  'internal_review',
  'documentation',
  'testing',
  'deployment',
  'other'
);

-- Handle task_status enum migration carefully
-- Step 1: Add a temporary text column
ALTER TABLE tasks ADD COLUMN status_temp text;

-- Step 2: Copy and transform data to temporary column
UPDATE tasks SET status_temp = CASE 
  WHEN status::text IN ('todo', 'in_progress') THEN 'pending'
  WHEN status::text = 'completed' THEN 'completed'
  ELSE 'pending'
END;

-- Step 3: Drop the old column with its enum type dependency
ALTER TABLE tasks DROP COLUMN status;

-- Step 4: Drop the old enum type
DROP TYPE IF EXISTS task_status;

-- Step 5: Create the new enum type
CREATE TYPE task_status AS ENUM ('pending', 'completed');

-- Step 6: Add the new status column with the correct enum type
ALTER TABLE tasks ADD COLUMN status task_status NOT NULL DEFAULT 'pending';

-- Step 7: Copy data from temp column to new status column
UPDATE tasks SET status = status_temp::task_status;

-- Step 8: Drop the temporary column
ALTER TABLE tasks DROP COLUMN status_temp;

-- Add new columns to tasks table
ALTER TABLE tasks 
  ADD COLUMN IF NOT EXISTS priority task_priority NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS action_tag task_action_tag NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS time_spent_minutes INTEGER;

-- Add additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_action_tag ON tasks(action_tag);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);

-- Drop existing task policies if they exist
DROP POLICY IF EXISTS "Users can view assigned or created tasks" ON tasks;
DROP POLICY IF EXISTS "Admins can view all tasks" ON tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
DROP POLICY IF EXISTS "Task creators can update tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;

-- RLS Policies for tasks
-- Users can view tasks assigned to them or created by them
CREATE POLICY "Users can view assigned or created tasks"
  ON tasks FOR SELECT
  USING (
    assigned_to = auth.uid() OR 
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Users can create tasks
CREATE POLICY "Users can create tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update tasks they created or are assigned to
CREATE POLICY "Users can update assigned or created tasks"
  ON tasks FOR UPDATE
  USING (
    assigned_to = auth.uid() OR 
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Users can delete tasks they created
CREATE POLICY "Users can delete own tasks"
  ON tasks FOR DELETE
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Function to aggregate task time to parent ticket
CREATE OR REPLACE FUNCTION update_ticket_time_from_task()
RETURNS TRIGGER AS $$
BEGIN
  -- When a task is completed with time tracking, add to ticket's total time
  IF NEW.status = 'completed' AND NEW.ticket_id IS NOT NULL AND NEW.time_spent_minutes IS NOT NULL THEN
    -- Only add time if this is a new completion or time changed
    IF OLD.status != 'completed' OR OLD.time_spent_minutes IS NULL OR OLD.time_spent_minutes != NEW.time_spent_minutes THEN
      UPDATE tickets 
      SET time_worked_minutes = COALESCE(time_worked_minutes, 0) + 
        COALESCE(NEW.time_spent_minutes, 0) - COALESCE(OLD.time_spent_minutes, 0)
      WHERE id = NEW.ticket_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for time aggregation
DROP TRIGGER IF EXISTS task_time_aggregation ON tasks;
CREATE TRIGGER task_time_aggregation
  AFTER UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_ticket_time_from_task();
