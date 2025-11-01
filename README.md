# Support Ticket Management System

A modern, production-ready support ticket management system built with Next.js 14, TypeScript, Supabase, and Tailwind CSS.

## Features

- ✅ **Authentication** - Secure login with Supabase Auth
- ✅ **Ticket Management** - Create, view, and track support tickets
- ✅ **Task Management** - Assign and manage tasks related to tickets
- ✅ **Dashboard** - Real-time overview of ticket statistics
- ✅ **Role-Based Access Control** - Different permissions for admins, support leads, support members, and clients
- ✅ **Real-time Comments** - Add comments and collaborate on tickets
- ✅ **Search Functionality** - Full-text search capabilities (ready to implement)
- ✅ **Responsive Design** - Mobile-first, works on all devices
- ✅ **Type-Safe** - Fully typed with TypeScript

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Backend/Database**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **State Management**: React Query (TanStack Query)
- **Forms**: React Hook Form + Zod validation
- **Deployment**: Vercel + Supabase Cloud

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js 18.17 or later
- npm, yarn, or pnpm
- A Supabase account (free tier works fine)

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd support-ticket-system
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the database to be provisioned (takes ~2 minutes)
3. Go to Project Settings > API
4. Copy your project URL and anon/public key

### 4. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.local.example .env.local
```

Then edit `.env.local` and add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 5. Set Up the Database

Run the migration script in your Supabase SQL editor:

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Create a new query
4. Copy the contents of `supabase/migrations/001_initial_schema.sql`
5. Paste and run the query

This will create:

- All necessary tables (profiles, tickets, tasks, comments, etc.)
- Custom PostgreSQL types (enums)
- Indexes for performance
- Row Level Security (RLS) policies
- Triggers for updated_at timestamps and full-text search

### 6. Create Your First User

1. Go to Authentication > Users in your Supabase dashboard
2. Click "Add user" > "Create new user"
3. Enter email and password
4. After creating the user, go to Table Editor > profiles
5. Update the user's role to 'admin' or 'support_member'

### 7. Run the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 8. Login

Use the credentials you created in step 6 to login at `/login`.

## Project Structure

```
support-ticket-system/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Authentication routes
│   │   ├── login/
│   │   └── layout.tsx
│   ├── (dashboard)/            # Protected dashboard routes
│   │   ├── dashboard/          # Main dashboard
│   │   ├── tickets/            # Ticket management
│   │   ├── my-tickets/         # User's assigned tickets
│   │   ├── tasks/              # Task management
│   │   ├── search/             # Search functionality
│   │   └── layout.tsx
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Home page (redirects to dashboard)
│   └── globals.css             # Global styles
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── layout/                 # Layout components (navbar, sidebar)
│   ├── shared/                 # Shared components (badges, avatars, etc.)
│   └── tickets/                # Ticket-specific components (future)
├── lib/
│   ├── supabase/               # Supabase client and queries
│   │   ├── client.ts           # Client-side Supabase client
│   │   ├── server.ts           # Server-side Supabase client
│   │   ├── middleware.ts       # Auth middleware
│   │   └── queries/            # Database query functions
│   ├── utils/                  # Utility functions
│   └── validations/            # Zod schemas for form validation
├── types/                      # TypeScript type definitions
├── supabase/                   # Supabase configuration
│   ├── migrations/             # Database migrations
│   ├── seed.sql                # Seed data
│   └── config.toml             # Supabase configuration
└── middleware.ts               # Next.js middleware for auth
```

## Database Schema

### Main Tables

- **profiles** - User profiles extending Supabase auth
- **teams** - Support teams
- **tickets** - Support tickets with full-text search
- **tasks** - Tasks assigned to users
- **ticket_comments** - Comments on tickets
- **ticket_history** - Audit trail for ticket changes
- **integrations** - External service integrations

### Key Features

- Full-text search on tickets (title, description, tags)
- Row Level Security (RLS) for data protection
- Automatic timestamp updates
- Foreign key relationships with cascade deletes

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## User Roles

- **Admin** - Full access to all features
- **Support Lead** - Manage tickets and team members
- **Support Member** - Handle assigned tickets
- **Client** - View their own tickets only

## Pages Overview

### Dashboard (`/dashboard`)

- Overview statistics (total tickets, open tickets, my tasks, resolved today)
- Recent tickets list

### All Tickets (`/tickets`)

- Complete list of all tickets
- Filter by status and priority
- Create new tickets

### My Tickets (`/my-tickets`)

- Tickets assigned to the current user

### Ticket Detail (`/tickets/[id]`)

- Full ticket information
- Related tasks
- Comments section

### Tasks (`/tasks`)

- User's assigned tasks
- Task status tracking

### Search (`/search`)

- Placeholder for full-text search implementation

## Future Enhancements

The system is designed to easily accommodate:

- [ ] Real-time updates using Supabase Realtime
- [ ] File attachments using Supabase Storage
- [ ] Email notifications
- [ ] Advanced filtering and search
- [ ] Analytics and reporting dashboards
- [ ] Team management UI
- [ ] Custom fields and forms
- [ ] Integration webhooks (Microsoft Teams, Jira, GitHub, etc.)
- [ ] SLA tracking and automation
- [ ] Knowledge base

## Security

- Row Level Security (RLS) enabled on all tables
- Authentication required for all routes (except login)
- Role-based access control
- Secure password handling via Supabase Auth
- HTTPS enforced in production

## Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Supabase Deployment

Your Supabase project is already cloud-hosted. Just ensure:

- Your database is in the desired region
- RLS policies are properly configured
- API keys are kept secure

## Troubleshooting

### Can't login

- Verify user exists in Supabase Authentication
- Check that the user has a profile entry with the correct role
- Verify environment variables are set correctly

### Database errors

- Ensure all migrations have been run
- Check Supabase logs for specific errors
- Verify RLS policies allow the operation

### Build errors

- Run `npm install` to ensure all dependencies are installed
- Check TypeScript errors with `npm run lint`
- Verify all environment variables are set

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:

- Create an issue in the GitHub repository
- Check existing documentation
- Review Supabase documentation for database-related questions

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Database and Auth by [Supabase](https://supabase.com/)
- Icons from [Lucide](https://lucide.dev/)
