-- Add client_temperature enum and column to tickets table
-- Purpose: Track client sentiment/satisfaction level for each ticket

-- Create enum type for client temperature
CREATE TYPE client_temperature AS ENUM ('hot', 'warm', 'cool');

-- Add client_temperature column to tickets table with default 'cool'
ALTER TABLE tickets 
ADD COLUMN client_temperature client_temperature NOT NULL DEFAULT 'cool';

-- Add comment for documentation
COMMENT ON COLUMN tickets.client_temperature IS 'Client sentiment indicator: hot (angry/red), warm (uncertain/yellow), cool (happy/green)';

-- Update RLS policies to allow assigned users to update client_temperature
-- (inherits from existing update policy which allows ticket creator and assigned user to update)
