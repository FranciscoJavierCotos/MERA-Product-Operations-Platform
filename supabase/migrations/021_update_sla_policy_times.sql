-- Migration 021: Update SLA policy times
-- Urgent: 1h response / 24h resolution
-- High:   4h response / 3 days resolution
-- Medium: 24h response / 1 week resolution
-- Low:    2 days response / 2 weeks resolution

UPDATE sla_policies SET
  response_time_minutes  = 60,
  resolution_time_minutes = 1440,
  updated_at = now()
WHERE priority = 'urgent';

UPDATE sla_policies SET
  response_time_minutes  = 240,
  resolution_time_minutes = 4320,
  updated_at = now()
WHERE priority = 'high';

UPDATE sla_policies SET
  response_time_minutes  = 1440,
  resolution_time_minutes = 10080,
  updated_at = now()
WHERE priority = 'medium';

UPDATE sla_policies SET
  response_time_minutes  = 2880,
  resolution_time_minutes = 20160,
  updated_at = now()
WHERE priority = 'low';
