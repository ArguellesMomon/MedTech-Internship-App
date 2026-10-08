# MedTech Mate

A personal internship workspace for medical technology students, built with React, Vite, Supabase, and a little love. The interface combines warm rose accents, quiet sage and lavender surfaces, and an editorial type style. Pip and the personal About page preserve the app’s original character.

## Run locally

- Install dependencies with npm install.
- Copy .env.example to .env and configure Supabase for real accounts.
- Run npm run dev and open the URL printed by Vite.
- Create an account or sign in from the landing page to open your workspace.

Workspace records belong to the signed-in user and are stored in Supabase.

## Checks

- npm run lint
- npm test
- npm run build
- npm run format
- npm run optimize:assets

The tests cover record persistence, date handling, quota calculations, authenticated chat, note and report creation, search safety, theme persistence, dialog focus, document confirmation, study chat, and route loading. DOM tests use jsdom; they do not measure visual layout or simulate an actual phone browser.

## Deploy

The existing Vercel configuration supports SPA routes and the /api/chat function. Configure VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and the server-only GROQ_API_KEY in the deployment environment. GROQ_API_KEY must never have a VITE_ prefix. Pip defaults to openai/gpt-oss-120b; the optional server-only GROQ_MODEL variable can override the model without a code change. The local Vite server provides the same chat endpoint for development. Vite preview is a static preview and does not host the API.

Real sign-in, uploads, and live chat depend on the configured Supabase project, its tables and storage policies, and the provider service. The bootstrap in supabase/schema.sql now preserves existing tables and records, recreates named policies, and skips duplicate seed entries. It is not a migration tool and does not add columns to existing tables. No database changes are automatically applied by this app.

See docs/architecture.md for the module map and docs/redesign.md for the audit, changes, and visual testing checklist.

UI regression tests use a local test fixture through a Vite test alias. The fixture lives under tests/fixtures and is excluded from the production app.

## Pip connection troubleshooting

Pip previously used llama-3.3-70b-versatile, which Groq retired for free and developer accounts on August 16, 2026. The supported replacement is now the default. See [Groq model deprecations](https://console.groq.com/docs/deprecations).

After deploying updated code, check that GROQ_API_KEY is set for the environment serving your site. If GROQ_MODEL is set, use an available model such as openai/gpt-oss-120b, then redeploy. On failure, Vercel runtime logs include “Pip provider request failed” with the Groq HTTP status and a known error code. Raw provider messages, API keys, and chat text are excluded from these logs. HTTP 401 indicates a rejected provider key, 403 indicates permissions, model_not_found/model_decommissioned indicates an unavailable model, and 429 indicates a provider rate limit.
