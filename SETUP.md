# Installation and Setup Guide

## Quick Start

Follow these steps to get your Support Ticket Management System running:

### 1. Install Dependencies

Run this command in your terminal:

```bash
npm install
```

This will install all required packages including:

- Next.js, React, TypeScript
- Supabase client libraries
- Tailwind CSS and UI components
- Form validation libraries
- All other dependencies

### 2. Setup Environment Variables

Copy the example environment file:

```bash
cp .env.local.example .env.local
```

Then edit `.env.local` and add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Setup Supabase Database

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the database to be ready (~2 minutes)
3. Go to SQL Editor in your Supabase dashboard
4. Copy the contents of `supabase/migrations/001_initial_schema.sql`
5. Paste and execute the SQL

### 4. Create First User

1. In Supabase dashboard, go to Authentication > Users
2. Click "Add user" > "Create new user"
3. Enter email and password
4. Go to Table Editor > profiles
5. Find the user and set role to 'admin' or 'support_member'

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## All Errors Will Be Resolved After npm install

The red text/errors you see are just TypeScript complaining about missing npm packages. They will ALL disappear after running `npm install`.

## Common Issues

### "Cannot find module" errors

- **Solution**: Run `npm install`

### Login doesn't work

- Verify user exists in Supabase Authentication
- Check user has a profile with correct role
- Verify .env.local has correct credentials

### Database errors

- Ensure migration SQL was executed completely
- Check Supabase dashboard for SQL errors
- Verify RLS policies are enabled

## Need Help?

Check the main README.md for detailed documentation.
