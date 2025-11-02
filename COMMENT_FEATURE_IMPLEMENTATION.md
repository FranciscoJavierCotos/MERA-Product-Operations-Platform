# Comment Section Feature Implementation

## Overview

A complete comment section feature has been implemented for the ticket details page with rich text editing, time tracking integration, and real-time updates.

## Features Implemented

### 1. Rich Text Editor

- **Formatting Options**: Bold, italic, bullet lists, ordered lists
- **Code Blocks**: Syntax highlighting for multiple programming languages using highlight.js
- **Image Support**: Paste or upload screenshots directly into comments
- **Markdown Preview**: Toggle between edit and preview modes
- **Placeholder Text**: Helpful hints for users

### 2. Time Tracking Integration

- **Time Worked Field**: Optional field in comment form to track time spent (in minutes)
- **Automatic Update**: Ticket's total time_worked_minutes is automatically updated via database trigger
- **Visual Indicator**: Comments with time tracked display a badge with clock icon
- **Validation**: Time input validated (0-1440 minutes = 0-24 hours)

### 3. CRUD Operations

- **Create**: Add new comments with rich text content and time tracking
- **Read**: Display all comments with user info, timestamps, and content
- **Update**: Edit own comments (shows "edited" indicator)
- **Delete**: Remove own comments with confirmation dialog

### 4. Real-time Updates

- **Supabase Realtime**: Comments automatically update when changes occur
- **Optimistic UI**: Smooth user experience with proper loading states
- **Error Handling**: Clear error messages and toast notifications

### 5. Security & Permissions

- **Row Level Security (RLS)**: Users can only edit/delete their own comments
- **Authentication**: All comment operations require authentication
- **Image Upload**: Secure storage in Supabase storage bucket with proper policies

### 6. Accessibility

- **ARIA Labels**: All interactive elements have proper labels
- **Keyboard Navigation**: Full keyboard support for forms and buttons
- **Focus Management**: Proper focus handling in dialogs and forms
- **Screen Reader Support**: Semantic HTML and ARIA attributes

### 7. Responsive Design

- **Mobile-First**: Works seamlessly on all screen sizes
- **Tailwind CSS**: Consistent styling using utility classes
- **Adaptive Layout**: Form fields stack on mobile, side-by-side on larger screens

## File Structure

```
components/tickets/
├── comments-section.tsx       # Main container with real-time updates
├── comment-form.tsx          # Form for creating new comments
├── comment-item.tsx          # Individual comment display with edit/delete
├── rich-text-editor.tsx      # Tiptap-based rich text editor
└── index.ts                  # Exports

lib/
├── supabase/queries/
│   └── comments.ts           # Database query functions
└── validations/
    └── comment.schema.ts     # Zod validation schemas

supabase/migrations/
├── 006_add_comment_features.sql    # Database schema updates
└── 007_create_storage_bucket.sql   # Storage bucket setup

types/
└── ticket.types.ts           # TypeScript type definitions (updated)
```

## Database Schema

### ticket_comments Table Updates

```sql
-- New column
time_worked_minutes INTEGER DEFAULT 0

-- New RLS policies
- Users can update their own comments
- Users can delete their own comments

-- Automatic trigger
- Updates ticket.time_worked_minutes when comment is created
```

### Storage Bucket

- **Bucket Name**: `ticket-attachments`
- **Public**: Yes (authenticated users only)
- **Policies**: Users can upload, view, update, and delete their own files

## Dependencies Added

```json
{
  "@tiptap/react": "^2.x",
  "@tiptap/starter-kit": "^2.x",
  "@tiptap/extension-placeholder": "^2.x",
  "@tiptap/extension-code-block-lowlight": "^2.x",
  "@tiptap/extension-image": "^2.x",
  "lowlight": "^3.x",
  "react-markdown": "^9.x",
  "remark-gfm": "^4.x",
  "rehype-highlight": "^7.x"
}
```

## Usage

### In Ticket Detail Page

```tsx
import { CommentsSection } from "@/components/tickets/comments-section";

<CommentsSection
  ticketId={ticket.id}
  initialComments={comments}
  currentUserId={user?.id}
/>;
```

### Standalone Comment Form

```tsx
import { CommentForm } from "@/components/tickets/comment-form";

<CommentForm
  ticketId={ticketId}
  onCommentCreated={() => refreshComments()}
  onCancel={() => setShowForm(false)}
/>;
```

## API Functions

### Creating a Comment

```typescript
import { createComment } from "@/lib/supabase/queries/comments";

await createComment(supabase, {
  ticket_id: "uuid",
  content: "<p>HTML content from editor</p>",
  time_worked_minutes: 30,
  is_internal: false,
});
```

### Updating a Comment

```typescript
import { updateComment } from "@/lib/supabase/queries/comments";

await updateComment(supabase, commentId, newContent);
```

### Deleting a Comment

```typescript
import { deleteComment } from "@/lib/supabase/queries/comments";

await deleteComment(supabase, commentId);
```

### Uploading an Image

```typescript
import { uploadCommentImage } from "@/lib/supabase/queries/comments";

const url = await uploadCommentImage(supabase, file, ticketId);
```

## Styling

Custom styles for the rich text editor and syntax highlighting are defined in `app/globals.css`:

- **ProseMirror Editor**: Custom styles for placeholder, code blocks, and images
- **Syntax Highlighting**: VS Code Dark+ theme colors for code blocks
- **Responsive**: Mobile-friendly with proper spacing

## Testing Checklist

- [x] Create comment with plain text
- [x] Create comment with formatted text (bold, italic, lists)
- [x] Create comment with code blocks
- [x] Upload and display images in comments
- [x] Add time worked to a comment
- [x] Verify ticket time_worked_minutes updates automatically
- [x] Edit own comment
- [x] Delete own comment with confirmation
- [x] View "edited" indicator on updated comments
- [x] Test real-time updates (open in two browsers)
- [x] Test responsive design (mobile, tablet, desktop)
- [x] Test keyboard navigation
- [x] Test screen reader compatibility
- [x] Verify RLS policies prevent editing others' comments

## Future Enhancements

Possible improvements for future iterations:

1. **@Mentions**: Tag users in comments with autocomplete
2. **Reactions**: Add emoji reactions to comments
3. **Attachments**: Support file attachments beyond images
4. **Templates**: Save and reuse common comment templates
5. **Rich Embeds**: Embed links with previews
6. **Search**: Search within comments
7. **Export**: Export comments to PDF or other formats
8. **Notifications**: Email/push notifications for new comments
9. **Threading**: Reply to specific comments
10. **Drafts**: Auto-save comment drafts

## Troubleshooting

### Images not uploading

- Verify Supabase storage bucket is created
- Check storage policies are properly set
- Ensure file size is within limits (default 50MB)

### Comments not appearing in real-time

- Verify Supabase realtime is enabled for your project
- Check browser console for connection errors
- Ensure RLS policies allow reading comments

### Time tracking not updating

- Verify migration 006 has been applied
- Check that the trigger function was created successfully
- Ensure time_worked_minutes column exists on ticket_comments

### Editor not loading

- Check that all Tiptap dependencies are installed
- Verify lowlight is properly imported
- Check browser console for JavaScript errors

## Support

For issues or questions about this implementation:

1. Check the error messages in browser console
2. Review Supabase logs for database errors
3. Verify all migrations have been applied
4. Check that environment variables are properly set
