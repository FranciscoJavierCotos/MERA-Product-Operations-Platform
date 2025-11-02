# Database Migration Instructions

## Overview

This guide explains how to apply the new database migrations for the comment section feature.

## Prerequisites

- Supabase CLI installed (`npm install -g supabase`)
- Supabase project set up and configured
- Environment variables configured (SUPABASE_URL, SUPABASE_ANON_KEY)

## Migrations to Apply

### Migration 006: Add Comment Features

**File**: `supabase/migrations/006_add_comment_features.sql`

This migration adds:

- `time_worked_minutes` column to `ticket_comments` table
- RLS policies for updating and deleting comments
- Database trigger to automatically update ticket time when comments are added
- Updated_at trigger for comments

### Migration 007: Create Storage Bucket

**File**: `supabase/migrations/007_create_storage_bucket.sql`

This migration creates:

- `ticket-attachments` storage bucket
- Storage policies for authenticated users
- Upload, view, update, and delete permissions

## Option 1: Using Supabase CLI (Recommended)

### Step 1: Link Your Project

```bash
# Navigate to your project directory
cd "c:\Users\javsa\Desktop\DEV\Support Ticket Management System"

# Link to your Supabase project
supabase link --project-ref YOUR_PROJECT_REF
```

### Step 2: Apply Migrations

```bash
# Apply all pending migrations
supabase db push
```

### Step 3: Verify

```bash
# Check migration status
supabase migration list
```

## Option 2: Using Supabase Dashboard (SQL Editor)

### Step 1: Open SQL Editor

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Create a new query

### Step 2: Apply Migration 006

1. Copy the contents of `supabase/migrations/006_add_comment_features.sql`
2. Paste into SQL Editor
3. Click "Run" or press Ctrl+Enter
4. Verify "Success" message

### Step 3: Apply Migration 007

1. Copy the contents of `supabase/migrations/007_create_storage_bucket.sql`
2. Paste into SQL Editor
3. Click "Run" or press Ctrl+Enter
4. Verify "Success" message

### Step 4: Verify Storage Bucket

1. Navigate to Storage in Supabase Dashboard
2. Verify `ticket-attachments` bucket exists
3. Check that it's marked as Public

## Option 3: Using Supabase Database UI

### For Migration 006:

1. **Add Column**:

   - Table: `ticket_comments`
   - Column: `time_worked_minutes`
   - Type: `INTEGER`
   - Default: `0`

2. **Add RLS Policies**:
   Navigate to Authentication > Policies > ticket_comments

   **Policy 1: Users can update their own comments**

   - Policy Name: "Users can update their own comments"
   - Policy Command: UPDATE
   - USING expression: `user_id = auth.uid()`
   - WITH CHECK expression: `user_id = auth.uid()`

   **Policy 2: Users can delete their own comments**

   - Policy Name: "Users can delete their own comments"
   - Policy Command: DELETE
   - USING expression: `user_id = auth.uid()`

3. **Add Trigger Function**:
   Use SQL Editor to run the trigger function and trigger creation from migration file

### For Migration 007:

1. **Create Storage Bucket**:

   - Navigate to Storage
   - Click "Create bucket"
   - Name: `ticket-attachments`
   - Public: Yes

2. **Add Storage Policies**:
   - Click on the bucket
   - Go to Policies tab
   - Add the policies from the migration file

## Verification Steps

### 1. Verify Column Addition

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'ticket_comments'
AND column_name = 'time_worked_minutes';
```

Expected result: Should return one row with INTEGER type and 0 default

### 2. Verify RLS Policies

```sql
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'ticket_comments';
```

Expected result: Should show policies for INSERT, SELECT, UPDATE, and DELETE

### 3. Verify Trigger

```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'ticket_comments';
```

Expected result: Should show `ticket_comment_time_update` trigger

### 4. Verify Storage Bucket

```sql
SELECT id, name, public
FROM storage.buckets
WHERE id = 'ticket-attachments';
```

Expected result: Should return the bucket with public = true

## Rollback Instructions

If you need to rollback the migrations:

### Rollback Migration 007 (Storage)

```sql
-- Remove storage policies
DROP POLICY IF EXISTS "Authenticated users can upload ticket attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view ticket attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own uploads" ON storage.objects;

-- Delete bucket (will fail if files exist)
DELETE FROM storage.buckets WHERE id = 'ticket-attachments';
```

### Rollback Migration 006 (Comments)

```sql
-- Remove trigger
DROP TRIGGER IF EXISTS ticket_comment_time_update ON ticket_comments;

-- Remove trigger function
DROP FUNCTION IF EXISTS update_ticket_time_on_comment();

-- Remove RLS policies
DROP POLICY IF EXISTS "Users can update their own comments" ON ticket_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON ticket_comments;

-- Remove column (WARNING: This will delete data!)
ALTER TABLE ticket_comments DROP COLUMN IF EXISTS time_worked_minutes;
```

## Troubleshooting

### Issue: "relation already exists"

**Solution**: The migration has already been applied. Skip to verification steps.

### Issue: "permission denied"

**Solution**: Ensure you're connected with sufficient privileges (service_role key for CLI, or database owner for dashboard).

### Issue: Storage bucket creation fails

**Solution**:

1. Check if bucket already exists
2. Verify storage extension is enabled
3. Try creating via Dashboard UI instead

### Issue: Trigger function fails

**Solution**:

1. Check that `update_updated_at_column()` function exists (from earlier migration)
2. Verify ticket_comments table has all required columns
3. Check PostgreSQL logs in Dashboard

## Post-Migration Testing

After applying migrations, test the following:

1. **Create a comment** with time worked in the UI
2. **Verify the ticket's time_worked_minutes** increased correctly
3. **Edit a comment** you created
4. **Try to edit someone else's comment** (should fail)
5. **Delete your comment**
6. **Upload an image** in a comment
7. **Verify image appears** in the comment

## Need Help?

If you encounter issues:

1. Check Supabase logs in Dashboard > Logs
2. Review PostgreSQL error messages
3. Verify your Supabase project is on a recent version
4. Check that RLS is enabled on the ticket_comments table

## Migration Files Location

```
supabase/
├── migrations/
│   ├── 001_initial_schema.sql
│   ├── 002_auto_create_profile.sql
│   ├── 003_add_ticket_delete_policy.sql
│   ├── 004_update_ticket_status_enum.sql
│   ├── 005_add_time_worked_to_tickets.sql
│   ├── 006_add_comment_features.sql     ← NEW
│   └── 007_create_storage_bucket.sql    ← NEW
```

## Success Indicators

✅ No errors during migration execution  
✅ All verification queries return expected results  
✅ Comment form appears on ticket detail page  
✅ Can create comments with rich text  
✅ Can upload images  
✅ Time tracking updates ticket correctly  
✅ Can edit and delete own comments  
✅ Cannot edit others' comments

---

**Ready to test!** After migrations are applied, start your dev server and navigate to a ticket detail page to see the new comment section in action.
