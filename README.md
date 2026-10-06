# Fitness Coaching App

Monthly membership (self-guided workout library) and 1-on-1 coaching (personalised plans plus weekly Google Meet sessions), paid via QRIS through [Mayar](https://docs.mayar.id).

| Folder | What | Stack |
| --- | --- | --- |
| [backend/](backend/) | REST API | Node 22+, Express 5, TypeScript, Prisma 7, PostgreSQL |
| [mobile/](mobile/) | Client app (iOS and Android) | Expo SDK 57, Expo Router, React Native Paper, Zustand, Axios |
| [coach-web/](coach-web/) | Coach dashboard (web) | Next.js 16 (App Router) |
| [docs/](docs/) | Decisions, media checklist | |

- **[features.md](features.md)**: every feature in plain language, for the product owner ([Bahasa Indonesia](features_idn.md))
- **[howToRun.md](howToRun.md)**: step-by-step guide to running the prototype
- **[DOCUMENTATION.md](DOCUMENTATION.md)**: architecture, database, payment flow, full API reference
- **[docs/DAILY_LOG.md](docs/DAILY_LOG.md)**: what was built and decided each day
- **[docs/MEDIA.md](docs/MEDIA.md)**: which YouTube videos and images to add, and where

## Getting started

### 1. Backend

```bash
cd backend
npm install                # also runs `prisma generate`
cp .env.example .env       # then set JWT_ACCESS_SECRET, DATA_ENCRYPTION_KEY, MAYAR_WEBHOOK_TOKEN (and MAYAR_API_KEY to take payments)
npm run db:dev             # local Postgres; leave running in its own terminal
npm run db:deploy          # apply migrations
npm run db:seed            # 7 demo accounts (see howToRun.md), workout library, a coached runner with a plan
npm run dev                # http://localhost:4000
npm test                   # unit + integration tests (needs the db:dev server; Mayar is mocked)
```

`npm run db:dev` uses Prisma's built-in local Postgres, so Docker isn't needed. Any Postgres works: point `DATABASE_URL` at it and remove `DATABASE_POOL_MAX`.

**Testing Mayar payments locally:** Mayar must be able to reach your webhook, so expose the API with a tunnel (e.g. `cloudflared tunnel --url http://localhost:4000`). Set `PUBLIC_API_URL` to the tunnel URL, then register `<PUBLIC_API_URL>/api/payments/mayar-callback?token=<MAYAR_WEBHOOK_TOKEN>` as the webhook URL in the Mayar dashboard (Integration → Webhook). Without a webhook, payments still activate through the app's status polling.

### 2. Mobile

```bash
cd mobile
npm install
cp .env.example .env       # set EXPO_PUBLIC_API_URL to your computer's LAN IP, e.g. http://192.168.1.10:4000
npx expo start
```

Add packages with `npx expo install <pkg>` (not `npm i`) so versions match the Expo SDK.

### 3. Coach dashboard

```bash
cd coach-web
npm install
cp .env.example .env.local
npm run dev                # http://localhost:3000
```

## Status

Working prototype of the full MVP flow. Payments use a fake checkout until a Mayar key is added; emails print to the console; notifications are in-app only.

- **Clients (app):** sign up, buy a plan with QRIS, browse and filter the workout library, watch videos, log workouts, follow a coach's weekly plan, log runs and sets, join Google Meet sessions, notification inbox, streaks and stats, manage membership, dark mode
- **Coaches (dashboard):** claim new clients, build multi-week plans from an exercise catalog, publish them, schedule and manage sessions, follow each client's training log, add YouTube demo videos
- **Backend:** 62 passing tests covering auth, payments, library, coaching, permissions and reminders

Next: real media, push notifications (Firebase), real email, CI and deployment. See [DOCUMENTATION.md §13](DOCUMENTATION.md#13-status-and-roadmap) and [docs/decisions.md](docs/decisions.md) for decisions and known risks.
