-- Add time_worked_minutes to ticket_comments
ALTER TABLE ticket_comments
ADD COLUMN IF NOT EXISTS time_worked_minutes INTEGER DEFAULT 0;

-- Add comment to track last edit
COMMENT ON COLUMN ticket_comments.updated_at IS 'Timestamp when comment was last updated. Used to show "edited" status.';

-- Update RLS policies for comments to allow users to update their own comments
CREATE POLICY "Users can update their own comments"
  ON ticket_comments FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add policy to allow users to delete their own comments
CREATE POLICY "Users can delete their own comments"
  ON ticket_comments FOR DELETE
  USING (user_id = auth.uid());

-- Create a function to automatically update ticket time_worked_minutes when a comment is added
CREATE OR REPLACE FUNCTION update_ticket_time_on_comment()
RETURNS TRIGGER AS $$
BEGIN
  -- Add the comment's time to the ticket's total time
  IF NEW.time_worked_minutes > 0 THEN
    UPDATE tickets
    SET time_worked_minutes = COALESCE(time_worked_minutes, 0) + NEW.time_worked_minutes
    WHERE id = NEW.ticket_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new comments
DROP TRIGGER IF EXISTS ticket_comment_time_update ON ticket_comments;
CREATE TRIGGER ticket_comment_time_update
  AFTER INSERT ON ticket_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_time_on_comment();

-- Create a function to update the updated_at timestamp on comments
DROP TRIGGER IF EXISTS update_ticket_comments_updated_at ON ticket_comments;
CREATE TRIGGER update_ticket_comments_updated_at 
  BEFORE UPDATE ON ticket_comments
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
