-- Allow ticket viewers (creator or matching client_email) to reopen closed tickets
-- by changing status from 'closed' to any other status.

CREATE POLICY "Ticket viewers can reopen closed tickets"
  ON tickets FOR UPDATE
  USING (
    status = 'closed'
    AND (
      created_by = auth.uid()
      OR client_email = (SELECT email FROM profiles WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    status <> 'closed'
    AND (
      created_by = auth.uid()
      OR client_email = (SELECT email FROM profiles WHERE id = auth.uid())
    )
  );
