# Redesign audit and verification

## Problems found

- The document fixed the body and disabled zoom, interfering with long screens and mobile forms.
- Navigation was hidden in a hamburger menu; the dashboard had abandoned tab state and duplicated layout code.
- Tool components embedded large style blocks and repeatedly overrode global styles.
- There was no coherent light/dark theme, and many labels had low contrast.
- Modals lacked shared keyboard focus handling and several controls lacked accessible names or linked labels.
- Search rendered record titles through raw HTML, stored recent searches globally, and could display stale results.
- Signup could attempt a profile write before email confirmation granted an authenticated session.
- Quota totals differed between the overview and quota board.
- Daily form defaults could use UTC’s previous calendar day near local midnight.
- Failed section-settings reads could subsequently overwrite saved settings with defaults.
- The chat provider key was referenced by browser code, and its prompt focused on medical rather than MedTech internships.
- The database bootstrap dropped existing tables before recreating them.
- Pip’s image was approximately 1.9 MB despite being displayed at small sizes.

## Implemented

A new personal landing page and overview; route-based desktop and mobile navigation; warm light/dark/system themes; calmer cards and typography; reduced-motion support; accessible shared dialogs and document confirmation; quick actions; safe user-scoped search; direct note opening; mood check-ins; appearance preferences; consistent quota rules; improved session/signup handling; local calendar dates; protected settings initialization; a server-only chat proxy; non-destructive bootstrap; focused modules; formatted source; and a 55 KB Pip asset.

The existing personal About content and core rotations/logbook/schedule/notes/document workflows are retained. No production database operations or deployment were performed.

## Automated verification

Run npm test, npm run lint, and npm run build. The suite exercises data, API, and DOM behavior, including all tool routes. API tests use mock provider and auth responses. Real account sign-in, live provider calls, and real storage uploads still require their configured services.

## Visual/device verification

No connected browser surface was available during implementation. DOM tests verify behavior and structure, but cannot establish visual alignment, browser rendering, or actual device ergonomics.

Before publishing, check phone widths of 320, 375, and 390px; iPad widths of 768 and 834px; and desktop widths of 1024 and 1440px. Review both themes, portrait and landscape, page scrolling, sidebar/bottom navigation, keyboard opening, form validation, modal focus/close behavior, calendar scrolling, long names, and increased text size. Review reduced-motion mode. Upload and preview a real PDF/DOCX/PPTX with a test account and confirm live chat using server configuration.

## Screenshot follow-up

Reviewed all six images in `issues/`. Fixed pale profile labels, bright calendar surfaces in dark mode, unreadable wellness tips, and invisible modal cancel labels. Removed inline modal colors, moved the shift modal stylesheet out of JSX, and standardized themed headers, close buttons, inputs, section selections, and action rows. Theme text pairs are checked at a minimum 4.5:1 contrast.

The schedule now has a seven-column grid without horizontal scrolling, an expandable week/month view, a selected-day agenda, and a multi-day creation flow for shifts and exams. Pip uses the visible viewport, with a smaller welcome area, compact suggestions, readable messages, a mobile history dialog, and deletion confirmation.

Regression coverage includes month/year and leap-year boundaries, multi-day saves, isolated edits, cancellation, failed-save retry, mobile history focus/deletion, and keyboard viewport resizing. Browser surfaces were unavailable in this session, so actual rendered phone/iPad layout and live Supabase batch operations still need device verification.

## Simpler onboarding and wellness controls

Removed demo entry points, sample-account behavior, sample Pip replies, export data, and reset controls. Visitors now create an account or sign in. The local client has moved to `tests/fixtures` and is aliased only by the UI test configuration.

Mood check-in buttons retain their text labels on phone screens. The water tracker shows numbered glass counts, explains the interaction, lets users choose an exact count, and has a clear reset action.
