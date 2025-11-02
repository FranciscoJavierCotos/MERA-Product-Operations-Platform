-- Add DELETE policy for tickets
-- Allow ticket creators to delete their own tickets
CREATE POLICY "Ticket creators can delete their own tickets"
  ON tickets FOR DELETE
  USING (created_by = auth.uid());

-- Optionally, also allow admins and support leads to delete any ticket
CREATE POLICY "Admins and support leads can delete any ticket"
  ON tickets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'support_lead')
    )
  );
