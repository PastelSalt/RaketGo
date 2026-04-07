# RaketGo Next.js Migration

This folder contains the migrated architecture from the original PHP codebase to Next.js App Router + React + TypeScript.

## Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- MySQL via mysql2
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

## Database

The app expects the same schema as database/schema.sql from the legacy PHP project.

## Notes

- Uploaded files are expected under public/uploads/{documents,posts,profiles}
- Notification, messaging, and application workflows are wired as server routes
- Admin skill-post creation UI is scaffolded and ready for API completion
