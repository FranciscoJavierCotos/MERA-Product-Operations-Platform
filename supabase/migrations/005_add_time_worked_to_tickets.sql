-- Add time_worked_minutes column to tickets table
-- This column stores the total time worked on a ticket in minutes
-- It defaults to 0 and cannot be negative

ALTER TABLE tickets
ADD COLUMN time_worked_minutes INTEGER NOT NULL DEFAULT 0
CHECK (time_worked_minutes >= 0);

-- Add a comment to the column for documentation
COMMENT ON COLUMN tickets.time_worked_minutes IS 'Total time worked on this ticket in minutes';

-- Create an index for performance if querying by time worked
CREATE INDEX idx_tickets_time_worked ON tickets(time_worked_minutes);
