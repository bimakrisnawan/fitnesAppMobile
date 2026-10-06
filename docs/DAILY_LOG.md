# Daily Log

A day-by-day record of what was built and decided on the fitness coaching app. Newest day first.

For how to run the app, see [howToRun.md](../howToRun.md). For how it's built, see [DOCUMENTATION.md](../DOCUMENTATION.md). For why things were built this way, see [decisions.md](decisions.md).

---

## Monday, 5 October 2026

### Summary

The app went from "login only" to a full working prototype: payments, workout library, 1-on-1 coaching, a coach dashboard, a muscle map, a polished design on both the app and the dashboard, and a guided workout player with a weekly goal ring and muscle heat map on Home.

### Done today

**Spec v1.0 and payments**
- Switched payments from Midtrans to **Mayar** (QRIS), following Mayar's real API docs. The spec's example endpoints didn't exist, so we use Mayar invoices and their hosted QRIS page.
- Mayar webhooks aren't signed, so a webhook is only trusted after re-checking the invoice with Mayar's API (status and amount).
- Built checkout, the webhook, status polling, an audit log of every payment event, and receipts (printed to the console for now).
- Subscriptions can be renewed early (time is added on), paused (days are frozen), resumed and cancelled.
- Phone numbers (required by Mayar) are stored encrypted.
- Sample prices: **Rp 79,000** (Monthly) and **Rp 499,000** (1-on-1 Coaching), changeable in `backend/.env`.
- Added a **fake checkout page** for local demos ("Simulate successful payment"), used automatically when there's no Mayar key.

**Documentation**
- Wrote [howToRun.md](../howToRun.md) (step-by-step setup, demo accounts, walkthroughs, troubleshooting) and [DOCUMENTATION.md](../DOCUMENTATION.md) (architecture, database, full API reference).
- Wrote [docs/MEDIA.md](MEDIA.md): which YouTube videos and images to find. Media can be added in `backend/prisma/demo-media.json` or in the dashboard's Exercise library.

**Features (the full MVP flow)**
- **Workout library:** 11 workouts and 31 exercises with home/outdoor alternatives; search and filters; YouTube player; videos locked for non-members; mark complete; history.
- **1-on-1 coaching (app):** coach card, weekly plan, exercise detail with logging (sets, reps, weight, distance, time), sessions with Google Meet button and directions.
- **Coach dashboard:** claim new clients, plan builder, session scheduling, client training log.
- **Notifications:** in-app inbox, plus automatic reminders 24 h before a session and 3 days before a plan ends.
- **Demo data:** 7 accounts in different states (new user, monthly member, coached runner, swimmer waiting for a coach, 3 coaches).

**Muscle map**
- Each exercise is tagged with **main focus** and **also works** muscles (14 groups).
- Coaches click muscles on a front/back body map in the dashboard (once = main, twice = also, three times = clear).
- Clients see the map on workouts and coaching exercises, and can filter workouts by muscle.
- Decided on **2D instead of 3D**: 3D needs a licensed `.glb` model and a 3D engine. The data works with either, so 3D can be added later.

**App polish (mobile)**
- New look: brand colours, cards, large page titles, gradient workout cards.
- Branded login and sign-up, plus a 3-question **onboarding** for new accounts.
- New Home (week strip, stats, next session, today's training, recommendations, "Train by muscle"), a Filters sheet on Workouts, a day picker on My Coach, and a clearer **Monthly vs 1-on-1** comparison on the plan picker.
- Fixed: overlapping text on Coaching, cut-off tab labels, mixed Indonesian/English dates (now English everywhere; Rupiah keeps `Rp 79.000`).

**Coach dashboard: new pages and polish**
- Added **Training plans** (all 1-on-1 plans) and **Workout library** (create and edit the Monthly workouts: groups of exercises, order, sets and reps, publish/unpublish) to the menu.
- Redesigned the whole dashboard:
  - **Login and sidebar:** a login page with one-click demo accounts; a sidebar with icons.
  - **Home:** a "Needs your attention" to-do list (claim client, build plan, inactive client, book session).
  - **Clients:** client cards.
  - **Client page:** tabs.
  - **Plan builder:** one row per day plus an add/edit dialog with Reps / Timed / Distance.
  - **Sessions:** an agenda.
  - **Everywhere:** confirm dialogs and toast messages.

**Bugs fixed**
- Saving only a YouTube link on an exercise wiped its equipment and alternatives.
- The local database (`prisma dev`) only handles one connection, so the pool is set to 1 locally (`DATABASE_POOL_MAX=1`).

**Evening: mobile UX "surprise"**
- **Guided workout player:**
  - A full-screen player for library workouts and for coaching plan days.
  - Shows a 3-2-1 countdown, the current exercise, and rest timers with −15 s / Skip / +15 s.
  - Handles reps, timed holds and runs (stopwatch).
  - Gives vibration cues, keeps the screen awake, and ends with a confetti celebration.
  - Saves the workout, or sends each exercise to the coach, and shows your streak and milestones.
- **Home:**
  - A **weekly goal ring** (tap to set 2–7 days).
  - **"Your week in muscles"**: a heat map with a nudge for neglected muscle groups.
  - A live "starts in 2h 14m / LIVE NOW" session countdown.
  - Count-up stats.
- **Feel:** springy cards, a light vibration on pill taps, and shimmer placeholders while loading.
- **Backend:** a new `GET /api/users/muscle-activity` endpoint for the heat map.
- **Verified in the browser:**
  - A full player run: 28 taps, the workout saved, total went 7→8, streak 3→4.
  - A coaching run: the coach saw the "Easy Run · 5 km" log with the client's note.
- The demo data wasn't reset this time (you were using it). Sinta is now claimed by Coach Bayu.

- Wrote [features.md](../features.md): a plain-language guide to every feature (for clients and coaches), what's simulated, what's missing, risks, and a checklist against the original brief.

### Checks
- Backend: **66 tests passing**.
- Mobile and dashboard: typecheck clean; the dashboard also lints and builds.
- Reviewed with automated screenshots and full browser walkthroughs (buy a plan; claim → build plan → publish → schedule).

### Still open / next
- **Your input needed:**
  - A Mayar sandbox API key, for real payments.
  - YouTube links and images (see [MEDIA.md](MEDIA.md)).
  - A final app name (currently the placeholder **"FitCoach"**, set in `mobile/src/theme/index.ts`).
  - Whether to do a 3D muscle viewer (needs a `.glb` model).
- **To build:**
  - push notifications to the phone (needs a Firebase project)
  - real email (SendGrid/Resend)
  - a Bahasa Indonesia translation
  - offline caching
  - coach–client messaging
  - CI and deployment (Railway)
  - app store builds
- **Accepted risks:** the App Store may require Apple in-app purchase for the Monthly tier, and unlisted YouTube links can be shared.
- **Git:** nothing has been committed yet.

---

## Sunday, 4 October 2026

### Summary

Kick-off: reviewed the brief, made the key decisions, and set up the three projects with login working end to end.

### Done today
- **Reviewed the original brief** and flagged risks:
  - App Store billing rules for in-app QRIS
  - QRIS can't auto-renew
  - unlisted YouTube links can be shared
  - gaps in the database schema
- **Decisions (yours):**
  - QRIS for both tiers
  - coach dashboard as a separate Next.js web app
  - YouTube unlisted for videos
  - start with the project setup and database schema
- **Set up the project:**
  - `backend/` (Express, TypeScript, Prisma 7, Postgres)
  - `mobile/` (Expo SDK 57)
  - `coach-web/` (Next.js)
- **Database schema** for the whole MVP, plus the first migration.
- **Login system:** register, login, refresh tokens that rotate (and detect stolen tokens), logout, password reset.
- **Mobile:** login/register/forgot-password screens, secure token storage, tab layout.
- Wrote the README and [decisions.md](decisions.md).
- 8 backend tests passing.
