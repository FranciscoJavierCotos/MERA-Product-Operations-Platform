-- Update ticket_status enum to replace old values with new ones
-- This migration changes the ticket status values from the old system to the new one

-- Step 1: Add new enum values temporarily
ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'new';
ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'pending_customer';
ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'pending_internal';
ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'escalated';

-- Step 2: Update existing tickets to use new status values
-- Map old statuses to new statuses
UPDATE tickets SET status = 'new' WHERE status = 'open';
UPDATE tickets SET status = 'pending_internal' WHERE status = 'in_progress';
UPDATE tickets SET status = 'pending_customer' WHERE status = 'waiting_response';

-- Step 3: Since we can't directly remove enum values in PostgreSQL,
-- we need to recreate the enum type with only the new values
-- First, create a new enum type with the desired values
CREATE TYPE ticket_status_new AS ENUM (
  'new',
  'pending_customer',
  'pending_internal',
  'escalated',
  'resolved',
  'closed'
);

-- Step 4: Update the tickets table to use the new enum type
-- Using ALTER TABLE with USING clause to convert the values
ALTER TABLE tickets 
  ALTER COLUMN status TYPE ticket_status_new 
  USING status::text::ticket_status_new;

-- Step 5: Update the default value for status column
ALTER TABLE tickets 
  ALTER COLUMN status SET DEFAULT 'new'::ticket_status_new;

-- Step 6: Drop the old enum type and rename the new one
DROP TYPE ticket_status;
ALTER TYPE ticket_status_new RENAME TO ticket_status;

-- Note: This migration is irreversible. Make sure to backup your database before running this.
