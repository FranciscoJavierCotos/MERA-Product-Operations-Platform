# Quick Start Guide - Comment Section Feature

## 🚀 Get Started in 3 Steps

### Step 1: Apply Database Migrations (Required)

Choose one method:

**Method A: Using Supabase CLI (Recommended)**

```bash
supabase db push
```

**Method B: Using Supabase Dashboard**

1. Open SQL Editor in Supabase Dashboard
2. Run `supabase/migrations/006_add_comment_features.sql`
3. Run `supabase/migrations/007_create_storage_bucket.sql`

### Step 2: Start Development Server

```bash
npm run dev
```

### Step 3: Test the Feature

1. Navigate to any ticket detail page
2. Scroll to the bottom to see the new comment section
3. Try these features:
   - ✍️ Write a comment with formatting (bold, italic, lists)
   - 💻 Add a code block
   - 🖼️ Upload or paste an image
   - ⏱️ Add time worked (in minutes)
   - ✏️ Edit your comment
   - 🗑️ Delete your comment

## 📋 Feature Checklist

Use this checklist to verify everything works:

- [ ] Comment form appears at bottom of ticket page
- [ ] Can write and submit a comment
- [ ] Comment appears in the list immediately
- [ ] Can use formatting toolbar (bold, italic, lists)
- [ ] Can insert code blocks
- [ ] Can upload images (drag & drop or paste)
- [ ] Can add time worked to a comment
- [ ] Ticket's total time updates when comment is posted
- [ ] Can see time badge on comments with time tracked
- [ ] Can edit own comments
- [ ] Can see "(edited)" indicator after editing
- [ ] Can delete own comments (with confirmation)
- [ ] Cannot edit/delete other users' comments
- [ ] Toast notifications appear for actions
- [ ] Real-time updates work (test in 2 browser tabs)
- [ ] Responsive on mobile devices
- [ ] Keyboard navigation works
- [ ] Preview toggle works in editor

## 🎯 Quick Feature Demo

### Create a Rich Comment

1. Click in the comment editor
2. Type some text
3. **Select text** and click **Bold** button (or press Ctrl+B)
4. Click **Code** button to insert a code block
5. Type some code (it will be syntax highlighted)
6. Add **Time Worked**: Enter "30" in the time field
7. Click **Post Comment**
8. ✅ Comment appears with formatting and time badge

### Edit a Comment

1. Hover over your comment
2. Click the **Edit** button
3. Modify the text
4. Click **Save**
5. ✅ Comment updates with "(edited)" indicator

### Upload an Image

1. Click the **Image** button in toolbar
2. Select an image file
3. Wait for upload to complete
4. ✅ Image appears in the editor
5. Add some text and post

**Or** simply **paste** an image from clipboard!

## 🔍 What You'll See

### Comment Form

- Rich text editor with toolbar
- Time worked input field (optional)
- Post Comment button
- Live character count (if needed)

### Comment Display

- User avatar and name
- Timestamp (e.g., "2 hours ago")
- Formatted content with proper styling
- Time badge (if time was tracked)
- "(edited)" indicator (if modified)
- Edit and Delete buttons (for own comments)

### Real-time Updates

- Comments appear automatically when added by others
- No page refresh needed
- Smooth animations

## 💡 Pro Tips

1. **Paste Images**: Simply paste from clipboard instead of uploading
2. **Keyboard Shortcuts**:
   - Ctrl+B for bold
   - Ctrl+I for italic
   - Ctrl+Enter to submit
3. **Preview**: Click the eye icon to preview before posting
4. **Time Tracking**: Use the time field to track work on each update
5. **Code Blocks**: Select a language for proper syntax highlighting

## 🐛 Troubleshooting

### Comments not appearing?

- Check browser console for errors
- Verify migrations were applied successfully
- Ensure you're logged in

### Can't upload images?

- Verify storage bucket was created
- Check file size (max 50MB)
- Ensure you have internet connection

### Time not updating on ticket?

- Verify migration 006 was applied
- Check that trigger was created successfully
- Refresh the page to see updated total

### Real-time not working?

- Check that Supabase Realtime is enabled for your project
- Verify you're using latest version of Supabase client
- Check browser console for connection errors

## 📚 More Information

- **Full Documentation**: See `COMMENT_FEATURE_IMPLEMENTATION.md`
- **Migration Guide**: See `MIGRATION_GUIDE.md`
- **Implementation Summary**: See `IMPLEMENTATION_SUMMARY.md`

## 🎉 You're All Set!

The comment section is now fully functional. Enjoy the new features:

- Rich text editing
- Code syntax highlighting
- Image uploads
- Time tracking
- Real-time updates
- Edit & delete capabilities

Happy commenting! 🚀
