# MedTech Mate architecture

## Routes

Public routes are /landing, /login, /signup, and /about. The protected workspace includes / (overview), /rotations, /reports, /shifts, /notes, /documents, /profile, and /ai-chat. The workspace has a persistent desktop sidebar, a phone/iPad bottom navigation bar, and an accessible More sheet. Page components load lazily so a visitor does not download every tool on first load.

## Module map

| Module                                | Responsibility                                                               |
| ------------------------------------- | ---------------------------------------------------------------------------- |
| src/App.jsx                           | Lazy routes, protected access, loading and error states                      |
| src/components/layout                 | Shared brand, route definitions, sidebar, topbar, mobile navigation          |
| src/auth                              | Session lifecycle, profile persistence, context, and useAuth                 |
| src/theme                             | Persisted light/dark/system preference and appearance controls               |
| src/components/ui/Dialog.jsx          | Portal, focus trap, Escape, focus restoration, scroll locking                |
| src/hooks/useOverview.js              | Parallel user-scoped overview queries with cancellation and retry            |
| src/hooks/useQuickCreate.js           | Consumes quick-action query parameters and opens the correct form            |
| src/components/dashboard              | Rotation, agenda, quota, notebook, and encouragement cards                   |
| src/components/GlobalSearch.jsx       | Debounced search with stale-result protection and safe text rendering        |
| src/components/ProfilePreferences.jsx | Appearance, local JSON backup, and demo reset                                |
| src/lib/demo.js                       | Opt-in local client with independent sample records                          |
| src/lib/dates.js                      | Calendar dates that retain the user’s local day                              |
| src/lib/progress.js                   | Shared manual/logged quota calculations                                      |
| api/chat.js                           | Authenticated provider proxy; secrets remain on the server                   |
| src/styles                            | Tokens, layout, overview, dialogs, landing, responsive rules, feature polish |
| src/styles/features                   | Extracted existing feature styles, contained in the legacy CSS layer         |

## Data responsibilities

Real records remain in Supabase. Auth state callbacks update the session; profile fetching occurs separately so it does not block the auth callback. Profile updates preserve fields omitted by the caller. Signup metadata can initialize the profile after email confirmation.

The dashboard reads rotations, shifts, exams, quotas, notes, and daily reports. Quota progress takes the greater of the manually recorded total and the matching report total, matching the quota board without double-counting the same work. Procedure keys ignore case and surrounding spaces.

Search renders titles as React text, scopes personal records and recent history to the current user, ignores stale requests, and links notes directly to their viewing dialog. Connection errors are shown separately from empty results.

Custom section settings only become writable after a successful initial read, preventing an unsuccessful load from replacing existing settings with defaults.

## Theme and responsive design

The CSS token palette defines surfaces, ink, muted text, borders, and rose/sage/lavender/peach accents. The initial document applies the saved theme before React starts. System mode follows media-query changes. Extracted feature CSS lives in the legacy layer; shared unlayered styles provide the consistent final treatment.

Desktop uses a sidebar, tablet uses bottom navigation, and phone screens stack dashboard cards. Forms use 16px inputs on small screens, safe-area spacing, and viewport-based modal heights. The original fixed body and disabled zoom were removed. Animation respects prefers-reduced-motion. Pip’s original PNG is retained as source; the shipped WebP is 55,284 bytes.

## Study chat

The browser sends conversation messages and the Supabase access token to the same-origin /api/chat endpoint. The server verifies the token with Supabase, validates message roles and lengths, and calls the provider using GROQ_API_KEY. Its in-memory request cap is per running server instance; a shared rate limiter is needed if a deployment requires a global quota across instances. Production chat configuration and provider access are separate from the frontend build.

## Extending the tools

The existing large feature tools retain their original workflows, while their styling and dialogs are shared. Further extraction should move one cohesive feature at a time into a subfolder. Keep state and mutations in the owning tool, keep date/progress rules in shared helpers, and preserve Supabase row-level security. The existing procedure library remains shared under its existing schema; introducing private procedure ownership needs an explicit database migration.
