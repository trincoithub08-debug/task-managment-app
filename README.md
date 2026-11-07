# TaskFlow (Next.js + Supabase)

A dark-themed task and reminder manager with colourful note cards, built with Next.js (App Router, TypeScript) and Supabase (Auth + Postgres).

## Features
- Email/password sign up and sign in (Supabase Auth)
- Create, edit, delete and complete tasks
- Colour-coded cards, labels, priority, due date and link
- Checklists inside each task
- Reminders with in-app (and browser) alerts when due
- Search, plus filters: All / Due today / Open / Completed
- Dashboard stats: tasks completed per day, progress ring, tasks by label
- Per-user data protected with Row Level Security

## Run it
```bash
npm install
npm run dev
```
Open http://localhost:3000

Copy `.env.example` to `.env.local` and fill in your Supabase project URL and publishable key.

## Supabase
Tables (all with RLS, each user only sees their own rows):
- `tm_tasks`
- `tm_checklist_items`
- `tm_reminders`

If sign up says "check your email", email confirmation is on. For local testing you can turn it off in the Supabase dashboard: Authentication > Providers > Email > "Confirm email".

## Structure
- `src/app` - layout, page, global styles
- `src/components` - Dashboard, TaskCard, modals, StatsPanel, AuthForm
- `src/lib` - Supabase client, types, helpers
