# RaketGo Next.js Migration

This folder contains the migrated architecture from the original PHP codebase to Next.js App Router + React + TypeScript.

## Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- PostgreSQL via pg (primary)
- MySQL via mysql2 (fallback)
- JWT cookie sessions via jose
- Zod validation

## Route Mapping (PHP -> Next.js)

- index.php -> /
- login.php -> /login
- signup.php -> /signup
- logout.php -> /api/auth/logout
- for-you.php -> /for-you
- skill-learn.php -> /learn
- post-job.php -> /jobs/post
- job-details.php?id= -> /jobs/[id]
- dashboard-worker.php -> /dashboard (worker mode)
- dashboard-employer.php -> /dashboard (employer mode)
- dashboard-admin.php -> /admin/dashboard
- messages.php -> /messages
- notifications.php -> /notifications

## API Mapping

- auth login: /api/auth/login
- auth signup: /api/auth/signup
- auth logout: /api/auth/logout
- jobs CRUD starter: /api/jobs, /api/jobs/[id]
- job actions (apply, withdraw, save, approve, reject): /api/applications
- messages: /api/messages
- notifications: /api/notifications

## Middleware Protections

Protected route checks are in middleware.ts:

- /dashboard/*
- /for-you/*
- /messages/*
- /notifications/*
- /jobs/post/*
- /admin/*

Role checks:

- Admin-only for /admin/*
- Employer-only for /jobs/post

## Setup

1. Copy .env.example to .env.local
2. Fill in database and session secret values
3. Install dependencies
4. Run dev server

Commands:

- npm install
- npm run dev
- npm run typecheck

## Vercel Deployment Checklist

Set these Environment Variables in your Vercel project:

- SESSION_SECRET: minimum 32 characters
- POSTGRES_URL: preferred for Vercel Postgres or Supabase Postgres

Optional Postgres alternatives accepted by the app:

- POSTGRES_PRISMA_URL
- POSTGRES_URL_NON_POOLING
- DATABASE_URL (must use postgres:// or postgresql://)

If you want MySQL instead of Postgres, set this first:

- RAKETGO_DATABASE_URL: preferred single MySQL connection string

If you are not using RAKETGO_DATABASE_URL, set all of these instead:

- RAKETGO_DB_HOST
- RAKETGO_DB_PORT
- RAKETGO_DB_USER
- RAKETGO_DB_PASS
- RAKETGO_DB_NAME

Optional SSL flags for managed MySQL providers:

- RAKETGO_DB_SSL=true
- RAKETGO_DB_SSL_REJECT_UNAUTHORIZED=true (set false only if your provider explicitly requires it)

Notes:

- Localhost values do not work on Vercel unless you are tunneling to a public database endpoint.
- After changing Vercel Environment Variables, trigger a new deployment.
- If the home page loads but shows a data-source warning, your database env values are still incorrect or unreachable from Vercel.

## Database

The app expects the same schema as database/schema.sql from the legacy PHP project.

## Notes

- Uploaded files are expected under public/uploads/{documents,posts,profiles}
- Notification, messaging, and application workflows are wired as server routes
- Admin skill-post creation UI is scaffolded and ready for API completion
