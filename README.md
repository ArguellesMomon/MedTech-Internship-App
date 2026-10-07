# MedTech Mate

A personal internship workspace for medical technology students, built with React, Vite, Supabase, and a little love. The interface combines warm rose accents, quiet sage and lavender surfaces, and an editorial type style. Pip and the personal About page preserve the app’s original character.

## Run locally

- Install dependencies with npm install.
- Copy .env.example to .env and configure Supabase for real accounts.
- Run npm run dev and open the URL printed by Vite.
- Choose “Take a look around” or “Explore the demo” on the landing page to explore without an account or backend setup.

The demo uses a separate local client. Sample records and edits stay in this browser’s localStorage. Uploads and password changes require a real account. Demo chat returns an explicitly labeled sample response. Use the profile’s Reset demo control to restore the sample records.

## Checks

- npm run lint
- npm test
- npm run build
- npm run format
- npm run optimize:assets

The tests cover local data persistence, date handling, quota calculations, authenticated chat, note and report creation, search safety, theme persistence, dialog focus, document confirmation, demo chat, and route loading. DOM tests use jsdom; they do not measure visual layout or simulate an actual phone browser.

## Deploy

The existing Vercel configuration supports SPA routes and the /api/chat function. Configure VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and the server-only GROQ_API_KEY in the deployment environment. GROQ_API_KEY must never have a VITE_ prefix. The local Vite server provides the same chat endpoint for development. Vite preview is a static preview and does not host the API.

Real sign-in, uploads, and live chat depend on the configured Supabase project, its tables and storage policies, and the provider service. The bootstrap in supabase/schema.sql now preserves existing tables and records, recreates named policies, and skips duplicate seed entries. It is not a migration tool and does not add columns to existing tables. No database changes are automatically applied by this app.

See docs/architecture.md for the module map and docs/redesign.md for the audit, changes, and visual testing checklist.
