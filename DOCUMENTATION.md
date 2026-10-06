# Fitness Coaching App: Technical Documentation

How the system is built, what each part does, and the full API reference.

- To run it, see [howToRun.md](howToRun.md).
- For why things were built this way, and where the build differs from the spec, see [docs/decisions.md](docs/decisions.md).

---

## 1. Overview

A subscription fitness app for the Indonesian market, with two paid tiers:

| Tier | Price (sample) | What you get |
| --- | --- | --- |
| **Monthly Membership** | Rp 79,000 / month | Self-guided workout library with video demonstrations |
| **1-on-1 Coaching** | Rp 499,000 / month | A personal plan from a coach (Running, Swimming or General track), weekly 45-minute Google Meet session, plus the library |

Payment is by **QRIS through Mayar**. QRIS can't charge a customer automatically each month, so every month is a separate payment. Renewing early adds a month onto the time the user has left.

---

## 2. Architecture

```
┌──────────────────────┐        HTTPS/JSON        ┌───────────────────────────┐
│  Mobile app (Expo)   │ ───────────────────────▶ │  Backend API (Express)    │
│  iOS / Android / web │ ◀─────────────────────── │  Node 22, TypeScript      │
└─────────┬────────────┘                          └──────┬──────────┬─────────┘
          │ opens checkout page                          │ Prisma   │ HTTPS
          ▼                                              ▼          ▼
┌──────────────────────┐   webhook (payment.received)  ┌────────┐ ┌──────────┐
│  Mayar hosted page   │ ─────────────────────────────▶│Postgres│ │  Mayar   │
│  (shows QRIS code)   │                                └────────┘ │   API    │
└──────────────────────┘                                           └──────────┘
┌──────────────────────┐
│ Coach dashboard      │ ──────────▶ same Backend API
│ (Next.js)            │
└──────────────────────┘
```

| Part | Folder | Technology |
| --- | --- | --- |
| Backend API | `backend/` | Node.js 22+, Express 5, TypeScript, Prisma 7, PostgreSQL, Zod, Vitest |
| Mobile app | `mobile/` | Expo SDK 57, React Native, Expo Router, React Native Paper, Zustand, Axios |
| Coach dashboard | `coach-web/` | Next.js 16 (App Router, client components), plain CSS with light/dark themes |
| Payments | n/a | Mayar Headless API (invoices + webhook) |
| Video | n/a | YouTube embeds (`youtube-nocookie.com`); WebView on phones, iframe on web |

**Background jobs.** The API runs a small scheduler every minute (`src/jobs/scheduler.ts`). It:
- sends a **session reminder** once, within 24 hours of each session;
- sends a **renewal reminder** 3 days before a plan ends (QRIS can't auto-renew);
- marks checkouts that expired over 10 minutes ago as `EXPIRED`.

It runs inside the API process, which is fine for one server. Move it to `pg-boss` before running several API instances.

---

## 3. Project structure

```
fitnessApp/
├── howToRun.md               ← how to start everything
├── DOCUMENTATION.md          ← this file
├── README.md
├── docs/
│   ├── decisions.md          ← architecture decisions and accepted risks
│   └── MEDIA.md              ← which videos/images to add
│
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma     ← database schema (all tables)
│   │   ├── migrations/       ← SQL migrations, applied in order
│   │   ├── seed.ts           ← demo accounts with realistic history
│   │   ├── seed-data.ts      ← exercise catalog, library workouts, plan templates
│   │   └── demo-media.json   ← paste YouTube links / image names here
│   ├── public/media/         ← local images served at /media/<file>
│   ├── src/
│   │   ├── server.ts         ← starts the HTTP server and the scheduler
│   │   ├── app.ts            ← Express app: middleware and routes
│   │   ├── config/env.ts     ← reads and validates .env
│   │   ├── jobs/scheduler.ts ← reminders and payment expiry (every minute)
│   │   ├── lib/
│   │   │   ├── prisma.ts     ← database client
│   │   │   ├── tokens.ts     ← JWT and refresh-token helpers
│   │   │   ├── crypto.ts     ← AES-256-GCM encryption (phone numbers)
│   │   │   ├── phone.ts      ← Indonesian mobile number validation
│   │   │   ├── youtube.ts    ← turns any YouTube link into a video id
│   │   │   ├── dates.ts      ← Jakarta-time weeks, days and streaks
│   │   │   ├── media.ts      ← absolute URLs for /media images
│   │   │   ├── mayar.ts      ← Mayar API client
│   │   │   ├── mayar-mock.ts ← fake checkout for local development
│   │   │   ├── mailer.ts     ← email (prints to console for now)
│   │   │   └── http-error.ts ← error helpers (400/401/403/404/409)
│   │   ├── middleware/
│   │   │   ├── auth.ts       ← requireAuth, requireRole
│   │   │   └── error.ts      ← turns errors into JSON responses
│   │   └── modules/
│   │       ├── auth/          ← register, login, refresh, logout, password reset
│   │       ├── users/         ← profile, stats, workout history, push token
│   │       ├── subscriptions/ ← plans, pricing, entitlements, cancel/pause/resume
│   │       ├── payments/      ← checkout, Mayar webhook, status polling
│   │       ├── workouts/      ← library: browse, filter, detail, complete
│   │       ├── coaching/      ← client side: my plan, logging, my sessions
│   │       ├── coach/         ← coach side: clients, plan builder, sessions, catalog
│   │       └── notifications/ ← in-app inbox
│   └── tests/                ← unit and integration tests
│
├── mobile/
│   └── src/
│       ├── app/                    ← screens (Expo Router: each file is a route)
│       ├── components/             ← Screen, WorkoutCard, YouTubePlayer, SessionCard, Alternatives, …
│       ├── lib/
│       │   ├── api.ts              ← HTTP client with automatic token refresh
│       │   ├── useFetch.ts         ← data loading that refreshes when a screen regains focus
│       │   ├── billing.ts          ← plans, checkout, payment status, entitlements
│       │   ├── format.ts           ← labels, dates, "3 × 10 @ 5:30/km" formatting
│       │   ├── types.ts            ← API response types
│       │   ├── token-storage.ts    ← secure storage for the refresh token
│       │   └── config.ts           ← API address
│       ├── stores/                 ← auth state, appearance setting (Zustand)
│       └── theme/index.ts          ← light and dark colours
│
└── coach-web/
    └── src/
        ├── app/
        │   ├── login/              ← coach sign-in
        │   └── (dashboard)/        ← Dashboard, Clients, client detail, plan builder, Sessions, Exercise library
        ├── components/             ← ScheduleForm, badges, avatars
        └── lib/                    ← API client, auth context, formatting, types
```

---

## 4. Database

Defined in [backend/prisma/schema.prisma](backend/prisma/schema.prisma). Conventions:
- All ids are UUIDs.
- All timestamps are stored with a timezone (`timestamptz`).
- Money is whole rupiah stored as an integer.

### Tables

| Area | Table | Purpose |
| --- | --- | --- |
| **Identity** | `User` | Every account. `role` is `CLIENT`, `COACH` or `ADMIN`. Stores profile fields and the encrypted phone number. |
| | `CoachProfile` | Extra details for coaches: specialization, bio, years of experience |
| | `RefreshToken` | Login sessions; tokens are stored hashed |
| | `PasswordResetToken` | One-hour reset links; stored hashed |
| | `PushToken` | Device push-notification tokens (for later) |
| **Billing** | `Subscription` | One row per user per tier. Holds status and the paid-until date (`currentPeriodEnd`). |
| | `Payment` | One row per checkout attempt: amount, status, Mayar ids, checkout link, the period it paid for |
| | `PaymentEvent` | Audit log of everything that happened to a payment, including rejected or unmatched webhooks |
| **Library** | `Exercise` | Shared exercise catalog: equipment, home/outdoor alternatives, video, and the muscles it trains (`primaryMuscles` = main focus, `secondaryMuscles` = also works) |
| | `Workout` | Library workouts: category, difficulty, duration, equipment setting (Gym/Home/None), YouTube video |
| | `WorkoutExercise` | The exercises in a workout, in order, with sets/reps/rest |
| | `WorkoutCompletion` | A user finished a library workout |
| **Coaching** | `CoachingPlan` | A personal plan: coach → client, track, dates, status |
| | `PlanExercise` | Plan items by week and day. Includes sets/reps/weight-style fields and distance/pace for runners and swimmers. |
| | `ExerciseLog` | A client logged a plan item: sets, reps, weight, distance |
| | `CoachingSession` | A scheduled session: online (Meet link) or offline (location), 45 minutes by default |
| **Other** | `Notification` | In-app notifications (payment received, new plan, session reminder…) |

### Equipment alternatives format

`Exercise.alternatives` and `PlanExercise.alternatives` are JSON lists:

```json
[
  { "setting": "home",    "replace": "dumbbell",     "with": "filled backpack" },
  { "setting": "outdoor", "replace": "dumbbell row", "with": "inverted row under a low bar", "note": "optional" }
]
```

### Migrations

| Migration | What it does |
| --- | --- |
| `20261004142922_init` | All tables |
| `20261005090000_mayar_payments` | Switches payments to Mayar; adds `PaymentEvent`, one subscription per tier, encrypted phone, equipment setting |
| `20261006090000_content_slugs` | Stable `slug` keys on `Exercise` and `Workout`, so the seed can update catalog content and media without duplicating it |
| `20261007090000_muscles` | `primaryMuscles` / `secondaryMuscles` on `Exercise` and `PlanExercise` for the body map |

---

## 5. Authentication

| Token | Lifetime | Where it's kept | Contents |
| --- | --- | --- | --- |
| **Access token** (JWT, HS256) | 15 minutes | App memory only | User id (`sub`) and `role` |
| **Refresh token** (random string) | 30 days | Phone's secure storage (Keychain/Keystore); `localStorage` in the web demo | Nothing; only a hash is stored on the server |

How it works:
1. **Login or register** returns both tokens.
2. Every API call sends `Authorization: Bearer <accessToken>`.
3. When the access token expires (the API returns 401), the app automatically calls `/api/auth/refresh-token` and retries the request. Only one refresh happens at a time, even if several requests fail together.
4. **Every refresh replaces the refresh token** (rotation). If an old, already-used refresh token is presented again, the server assumes it was stolen and **logs that user out everywhere**.
5. **Logout** revokes the refresh token. A **password reset** logs out every session.

Other details:
- Passwords are hashed with bcrypt, cost 12.
- If a login email doesn't exist, the server still runs a dummy password check, so response timing doesn't reveal which emails are registered.
- A password reset request returns the same answer whether or not the email exists.

---

## 6. Subscriptions and access

### Who can use what

A user has access while a subscription's status is `ACTIVE` or `CANCELLED` **and** its paid-until date is in the future.

| Has active… | Library | Coaching |
| --- | --- | --- |
| Monthly | ✅ | ❌ |
| Coaching | ✅ | ✅ |
| Nothing | ❌ | ❌ |

Coaches and admins always pass access checks. Routes are protected with `requireEntitlement("library")` or `requireEntitlement("coaching")`.

### Subscription states

```
           first payment settles
 PENDING ─────────────────────────▶ ACTIVE ◀─────────────┐
                                     │  │                 │ resume (end date pushed
                               pause │  │ cancel          │ out by the pause length)
                                     ▼  ▼                 │
                                PAUSED  CANCELLED ────────┘ (paying again re-activates)
```

| Action | Effect |
| --- | --- |
| **Pay** | Adds one month. If time is left, it's added after the current end date; otherwise it starts now. A month is the same date next month, adjusted for short months (31 Jan → 28/29 Feb). |
| **Cancel** | No automatic renewal happens anyway (QRIS). Access continues until the paid-until date. |
| **Pause** | Access stops immediately and the remaining days are frozen. |
| **Resume** | Access returns, and the paid-until date moves later by however long the pause lasted. |

---

## 7. Payments (Mayar QRIS)

### Checkout flow

```
App                         Backend                         Mayar
 │ POST /payments/create     │                               │
 │──────────────────────────▶│ create Payment (PENDING)      │
 │                           │ POST /invoice/create ────────▶│
 │                           │◀──────── invoice id + link ───│
 │◀── paymentUrl ────────────│                               │
 │ opens checkout page ─────────────────────────────────────▶│ user scans QRIS
 │                           │◀── webhook ?token=… ──────────│ payment.received
 │                           │ GET /invoice/{id} ───────────▶│ (re-check: paid? right amount?)
 │                           │◀──────── status: paid ────────│
 │                           │ settle: Payment SETTLED,      │
 │                           │ Subscription extended,        │
 │                           │ audit event, notification     │
 │ GET /payments/:id/status  │                               │
 │──────────────────────────▶│ (also re-checks Mayar if the  │
 │◀── SETTLED ───────────────│  webhook hasn't arrived yet)  │
```

### Safety rules

- **Webhooks aren't trusted.** Mayar doesn't sign them. The webhook address carries a secret token, and even with the right token, the backend always asks Mayar's API whether the invoice is paid and for the right amount before granting access.
- **Each payment is settled exactly once.** Settlement only succeeds if the payment is still `PENDING` (or `EXPIRED`). Duplicate webhooks and status checks arriving together can't add two months.
- **No duplicate invoices.** The app sends an `Idempotency-Key` header. Repeating a request with the same key returns the same payment. An open, unexpired invoice is also reused instead of creating a new one.
- **Lost webhooks are covered.** The app polls `/payments/:orderId/status`, which checks Mayar directly at most every 10 seconds.
- **Late payments still count.** An `EXPIRED` payment is re-checked, so paying just before expiry still activates.
- **Everything is logged** in `PaymentEvent`.
- **Phone numbers** (required by Mayar) are encrypted with AES-256-GCM before being stored.

### Payment states

`PENDING` → `SETTLED` (paid) / `EXPIRED` (invoice closed or 1 hour passed) / `FAILED` (the Mayar call errored)

### Development mode

If `MAYAR_API_KEY` is empty and `NODE_ENV` isn't `production`, the backend uses **`mayar-mock.ts`**. It serves a local checkout page at `/dev/mock-checkout/:id` with a **"Simulate successful payment"** button. Fake invoices are kept in memory only.

---

## 8. API reference

Base address: `http://localhost:4000` (local). All bodies are JSON.

🔒 = needs `Authorization: Bearer <accessToken>`

### Health

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Returns `{ "ok": true }` |

### Auth: `/api/auth`

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| POST | `/register` | `{ email, password (8–128 chars), fullName }` | `201 { user, tokens }` |
| POST | `/login` | `{ email, password }` | `200 { user, tokens }` |
| POST | `/refresh-token` | `{ refreshToken }` | `200 { tokens }` |
| POST | `/logout` | `{ refreshToken }` | `204` |
| POST | `/password-reset/request` | `{ email }` | `204` (always) |
| POST | `/password-reset/confirm` | `{ token, password }` | `204` |

`tokens` = `{ accessToken, accessTokenExpiresIn (seconds), refreshToken }`

`user` = `{ id, email, fullName, role, birthYear, fitnessLevel, goals, preferredSpecialization, hasPhone, createdAt, updatedAt }`

### Users: `/api/users` 🔒

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| GET | `/profile` | n/a | `{ user }` |
| PUT | `/profile` | Any of: `fullName`, `birthYear`, `fitnessLevel` (`BEGINNER`/`INTERMEDIATE`/`ADVANCED`), `goals`, `preferredSpecialization` (`RUNNING`/`SWIMMING`/`GENERAL`) | `{ user }` |
| GET | `/subscription-status` | n/a | `{ entitlements: { library, coaching, activeTiers, accessUntil } }` |

### Subscriptions: `/api/subscriptions`

| Method | Path | Auth | Body | Response |
| --- | --- | --- | --- | --- |
| GET | `/plans` | public | n/a | `{ plans: [{ tier, name, priceIdr, description }] }` |
| GET | `/` | 🔒 | n/a | `{ subscriptions, entitlements }` |
| POST | `/monthly` | 🔒 | `{ phone? }` | Same as `POST /api/payments/create` with tier `MONTHLY` |
| POST | `/1on1` | 🔒 | `{ specialization, phone? }` | Same as `POST /api/payments/create` with tier `COACHING` |
| POST | `/:id/cancel` | 🔒 | n/a | `{ subscription }` |
| POST | `/:id/pause` | 🔒 | n/a | `{ subscription }` |
| POST | `/:id/resume` | 🔒 | n/a | `{ subscription }` |

### Payments: `/api/payments`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/create` | 🔒 | Start a checkout. Body: `{ tier: "MONTHLY" \| "COACHING", specialization?, phone? }`. Optional header `Idempotency-Key`. Returns `201 { payment }`. |
| GET | `/history` | 🔒 | Last 50 payments, newest first: `{ payments }` |
| GET | `/:orderId/status` | 🔒 | Current status (re-checks Mayar if still pending): `{ payment }` |
| POST | `/mayar-callback?token=…` | token | Mayar webhook. Always `200` if the token is valid. |
| GET | `/return?orderId=…` | public | Where Mayar sends the customer after paying; redirects into the app |

`payment` = `{ orderId, tier, amount, currency, status, paymentUrl, expiresAt, paidAt, periodStart, periodEnd, createdAt }`. `paymentUrl` is only included while the payment is `PENDING`.

Rules for `POST /create`:
- `phone`: an Indonesian mobile number (`08…`, `628…` or `+628…`). Required the first time; it's then remembered.
- `specialization`: required for `COACHING`.

### Users: more endpoints 🔒

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/users/stats` | Home dashboard: `{ stats: { workoutsThisWeek, exercisesThisWeek, totalWorkouts, streakDays, activeDaysThisWeek }, weekActivity: boolean[7] (Mon–Sun), nextSession }`. Weeks and days follow Jakarta time. |
| GET | `/api/users/muscle-activity?days=7` | `{ days, counts: { muscle: score }, sessions }` for the "week in muscles" heat map. A primary muscle scores 1 per exercise done, a secondary muscle 0.5; counts both library workouts and coaching logs. |
| GET | `/api/users/completed-workouts?page=&pageSize=` | Library workout history (also at the spec path `/api/user/completed-workouts`) |
| POST | `/api/users/push-token` | `{ token, platform: "IOS" \| "ANDROID" }`: stores the device's Expo push token for later push delivery |

### Workouts: `/api/workouts` 🔒

Any signed-in user can browse the library. Videos and logging need an active plan.

| Method | Path | Description |
| --- | --- | --- |
| GET | `/` | Filters: `category` (`STRENGTH`/`CARDIO`/`FLEXIBILITY`/`SPORT_SPECIFIC`), `equipment` (`GYM`/`HOME`/`NONE`), `difficulty`, `specialization`, `muscle` (a muscle id, matches workouts with an exercise that trains it as main focus), `q` (searches titles, descriptions and exercise names), `page`, `pageSize`. Returns `{ items, total, page, pageSize }`; each item has `muscles: { primary, secondary }`. |
| GET | `/category/:category`, `/search?query=` | Spec aliases for the filters above |
| GET | `/:id` | Workout with exercises, cues, alternatives and each exercise's muscles, plus the combined `muscles` of the whole workout. `locked: true` and `youtubeVideoId: null` for non-members. Includes `myCompletions`. |
| POST | `/:id/complete` | `{ notes? }` → `201 { completion }`. Needs library access (`403 SUBSCRIPTION_REQUIRED` otherwise). |

### Coaching (client side): `/api/coaching` 🔒 coaching plan required

| Method | Path | Description |
| --- | --- | --- |
| GET | `/my-plan` | `{ plan, coach, specialization }`. `plan` is null until the coach publishes one; `coach` is null until a coach claims the client. A plan includes `currentWeek`, `totalWeeks`, `progress` and each item's `completed` / `lastLog`. |
| GET | `/my-plan/exercises`, `/my-plan/exercises/:id` | Flat list / one item with its log history |
| POST | `/my-plan/exercises/:id/log` | `{ setsCompleted?, repsCompleted?, weightKg?, durationSeconds?, distanceMeters?, notes? }` → `201 { log }` |
| GET | `/sessions?scope=upcoming\|past\|all` | The client's sessions. Each has `joinable: true` from 10 minutes before the start until the end. |
| GET | `/sessions/:id` | One session |
| POST | `/sessions/:id/complete` | Client marks a started session as attended |

### Coach: `/api/coach` 🔒 role `COACH` or `ADMIN`

A coach can only see or change clients whose coaching subscription is assigned to them (`403 NOT_YOUR_CLIENT`). Admins can act on everyone.

| Method | Path | Description |
| --- | --- | --- |
| GET | `/me`, `/dashboard` | Profile; stats, next sessions, recent client activity |
| GET | `/clients` | Assigned clients with membership, active plan, next session, last activity |
| GET | `/clients/unassigned` | Paying coaching clients without a coach |
| POST | `/clients/:id/claim` | Take on an unassigned client (once only; `409` if someone else did). The client is notified. |
| GET | `/clients/:id` (also `/clients/:id/history`) | Profile, subscription, plans, last 50 logs, sessions, library workouts |
| GET / POST / PUT | `/exercises`, `/exercises/:id` | Exercise catalog. `youtube` accepts any YouTube link or id; `alternatives` is the substitution list; `primaryMuscles` / `secondaryMuscles` are muscle ids. A `PUT` only changes the fields you send. |
| GET | `/plans?status=` | All plans of the coach's clients, with `totalWeeks` and client `progress` |
| POST | `/plans` | `{ clientId, title, description?, specialization, startDate, endDate? }` → a `DRAFT` plan |
| GET / PUT / DELETE | `/plans/:id` | Read, edit, delete (drafts) or archive (active plans) |
| POST | `/plans/:id/publish` | Makes it the client's active plan (archives the previous one) and notifies the client |
| POST | `/plans/:id/exercises` | `{ exerciseId? \| name, weekNumber, dayOfWeek (1=Mon), sets?, reps?, durationSeconds?, distanceMeters?, targetPace?, notes?, youtube? }`. Picking from the catalog copies its name, video, equipment, alternatives and muscles; `primaryMuscles` / `secondaryMuscles` override them. |
| PUT / DELETE | `/plans/:id/exercises/:exerciseId` | Edit or remove a plan item |
| POST | `/plans/:id/copy-week` | `{ from, to }`: replaces week `to` with a copy of week `from` |
| GET | `/sessions?scope=` | The coach's sessions |
| POST | `/sessions/schedule` | `{ clientId, planId?, type: "ONLINE" \| "OFFLINE", startsAt (ISO), durationMinutes = 45, meetUrl (online), location (in person), notes? }`. The client is notified. |
| PUT | `/sessions/:id` | Reschedule, edit, or set `status` to `COMPLETED` / `CANCELLED`. Rescheduling or cancelling notifies the client and re-arms the reminder. |

### Workout library management: `/api/coach/workouts` 🔒 role `COACH` or `ADMIN`

The Monthly library: each workout is an ordered group of catalog exercises.

| Method | Path | Description |
| --- | --- | --- |
| GET | `/` | Every library workout, drafts included, with exercise and completion counts |
| GET | `/:id` | One workout with its exercises and combined `muscles` |
| POST | `/` | `{ title, category, difficulty, durationMinutes, equipmentSetting, description?, specialization?, equipment?, youtube?, thumbnailUrl? }` → a **draft** (`isPublished: false`) |
| PUT | `/:id` | Change any of those fields, or `isPublished`. Only sent fields change. Publishing needs at least one exercise. `thumbnailUrl` is `/media/<file>` or an `https://` URL. |
| PUT | `/:id/exercises` | `{ items: [{ exerciseId, sets?, reps?, durationSeconds?, restSeconds?, notes? }] }` replaces the list; array order = workout order |
| DELETE | `/:id` | Deletes it if nobody has done it; otherwise unpublishes it so members keep their history (`{ deleted: false, unpublished: true }`) |

### Notifications: `/api/notifications` 🔒

| Method | Path | Description |
| --- | --- | --- |
| GET | `/` | Latest 50 plus `unreadCount` |
| POST | `/:id/read`, `/read-all` | Mark as read |

Types: `SESSION_REMINDER`, `SESSION_SCHEDULED` (also used for reschedules and cancellations), `NEW_PLAN` (also coach assigned), `PAYMENT_SUCCESS`, `RENEWAL_REMINDER`.

### Media

| Method | Path | Description |
| --- | --- | --- |
| GET | `/media/<file>` | Images from `backend/public/media/`. API responses return absolute URLs built from `PUBLIC_API_URL`. |

### Development only

| Method | Path | Description |
| --- | --- | --- |
| GET | `/dev/mock-checkout/:id` | Fake checkout page |
| POST | `/dev/mock-checkout/:id/pay` | Marks the fake invoice as paid |

### Errors

Every error has the same shape:

```json
{ "error": { "message": "Readable text", "code": "MACHINE_CODE", "details": {} } }
```

| Code | Status | Meaning |
| --- | --- | --- |
| `VALIDATION` | 400 | Body or parameters invalid (`details` lists the fields) |
| `EMAIL_TAKEN` | 409 | Email already registered |
| `BAD_CREDENTIALS` | 401 | Wrong email or password |
| `TOKEN_INVALID` | 401 | Access token missing, invalid or expired |
| `REFRESH_INVALID` / `REFRESH_REUSED` | 401 | Refresh token unknown or expired / reused (every session revoked) |
| `RESET_INVALID` | 400 | Reset link invalid, used or expired |
| `SUBSCRIPTION_REQUIRED` | 403 | No active subscription for this feature |
| `PHONE_REQUIRED` | 400 | Mobile number needed for the first payment |
| `SPECIALIZATION_REQUIRED` | 400 | Coaching checkout without a track |
| `SUBSCRIPTION_PAUSED` | 409 | Resume before renewing |
| `IDEMPOTENCY_CONFLICT` | 409 | Idempotency key already used by another user |
| `PAYMENTS_DISABLED` | 503 | No Mayar key (production only) |
| `PAYMENT_PROVIDER_ERROR` | 502 | Mayar failed or returned something unexpected |
| `NOT_YOUR_CLIENT` | 403 | A coach tried to access another coach's client |

### Rate limits

| Applies to | Limit | Counted per |
| --- | --- | --- |
| All `/api` routes (except the webhook) | 100 / minute (`API_RATE_LIMIT_PER_MIN`; 1000 in the local `.env`) | IP address |
| Register, login, password reset | 5 **failed** attempts / 15 minutes | IP address + email |
| Starting a checkout | 5 / minute | User |

Over the limit, the API returns `429`.

---

## 8b. Muscle map

Exercises are tagged with the muscles they train, shown on a front/back body map.

- **14 muscle groups** (ids in `backend/src/lib/muscles.ts`): chest, shoulders, biceps, triceps, forearms, abs, obliques, traps, lats, lower-back, glutes, quads, hamstrings, calves.
- **Two levels:** *main focus* (brand colour) and *also works* (light tint).
- **Coaches set them** in the dashboard's **Exercise library**: click a muscle once for main focus, twice for also works, a third time to clear. The plan builder copies them into plan items and lets the coach change them per item.
- **Clients see them** on workout pages (combined map for the whole workout, plus one per exercise), on coaching exercises ("Muscles this trains"), as labels in lists, and through the **Target muscle** filter and **Train by muscle** shortcuts.
- **Drawing:** a 2D SVG (`body-map-data.ts`, one copy each in `mobile/` and `coach-web/`; keep them in sync). Each region is drawn once and mirrored. No 3D model or extra download is needed. See docs/decisions.md for why it's 2D.

---

## 9. Mobile app

### Navigation

```
src/app/_layout.tsx                 Theme (system / light / dark) + auth gate (Stack.Protected)
├── (auth)/                         shown when logged out
│   ├── login.tsx
│   ├── register.tsx
│   └── forgot-password.tsx
└── (app)/                          shown when logged in
    ├── (tabs)/                     bottom tabs, 🔔 notification bell in the header
    │   ├── index.tsx               Home: greeting, streak/stats, next session, today's training, membership, recommendations
    │   ├── workouts.tsx            Library: search, category/equipment/level filters
    │   ├── coaching.tsx            "My Coach": coach card, next session, plan progress, week pills, Mon–Sun day picker (or the 1-on-1 offer)
    │   └── profile.tsx             Profile, membership, history, notifications, appearance, logout
    ├── workout/[id].tsx            Video (or locked/placeholder), exercises with cues, demos and alternatives, mark complete
    ├── workout-history.tsx         Completed library workouts
    ├── plan-exercise/[id].tsx      Coach's note, video, alternatives, log form, log history
    ├── sessions.tsx                Upcoming / past sessions: Google Meet, directions, mark attended
    ├── notifications.tsx           Inbox; tapping opens the related screen
    ├── onboarding.tsx              3 questions after sign-up: interest, level, goal (opens automatically once)
    ├── player.tsx                  Guided workout player (?workoutId= or ?plan=1&week=&day=): get ready → work → rest → celebration
    ├── edit-profile.tsx            Name, birth year, level, interest, goal
    ├── subscription.tsx            Memberships (renew, pause, resume, cancel) + payment history
    └── subscribe.tsx               Plan picker → QRIS checkout → waiting → success
```

### What each kind of user sees

| User | Workouts tab | Coaching tab |
| --- | --- | --- |
| No plan | Browse everything; videos locked; "Subscribe" prompts | Coaching offer with features and price |
| Monthly member | Full library with videos and logging | Coaching offer |
| Coaching, no coach yet | Full library | "Matching you with a coach" |
| Coaching, coach assigned, no plan | Full library | Coach card + "preparing your plan" |
| Coaching with a plan | Full library | Full plan, sessions and logging |

When the app starts, it tries to restore the session using the saved refresh token. If that works, the logged-in screens appear. Otherwise, the login screen does.

### Checkout screen (`subscribe.tsx`)

1. Loads the plans from `/api/subscriptions/plans`.
2. The user picks a tier (and a track, for coaching) and enters a phone number if none is saved yet.
3. Calls `/api/payments/create` with a new `Idempotency-Key`.
4. Opens the checkout page:
   - On a phone: an in-app browser session.
   - On web: a new tab, opened before the network call so pop-up blockers allow it.
5. Polls `/api/payments/:orderId/status` every 3 seconds, for up to 3 minutes.
6. Shows **success**, **still waiting** (with "Check again"), or **expired** (with "Try again").

### Settings: `mobile/.env`

| Variable | Meaning |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | The backend's address. Use `http://localhost:4000` for web, or your computer's local IP for a phone. |

Add packages with `npx expo install <name>` (not `npm install`) so their versions match Expo SDK 57.

### Guided workout player (`player.tsx`)

A full-screen, always-dark screen that coaches the user through a library workout or a day of their coaching plan.

| Phase | What happens |
| --- | --- |
| Get ready | 3-2-1 countdown ring with the first exercise |
| Work | Exercise name and muscles, set X of Y. **Reps:** big rep target and a **Set done** button. **Timed:** countdown ring that moves on by itself (or **Done early**). **Distance:** stopwatch with target distance and pace, then **Finished**. Coach's note or cues, demo video, "No equipment?" alternatives, **Skip** exercise |
| Rest | Countdown ring with **−15 s / Skip rest / +15 s**, a tip, and **Up next** |
| Celebration | Confetti, time, exercises, sets, reps or distance, muscles worked, "How did it feel?", note → **Save**. Library workouts are logged as completed; plan days log each exercise for the coach. Then it shows the updated streak and milestones (1, 5, 10, 25, 50, 100 workouts). |

Also: a progress bar per exercise, total time, pause (all timers freeze), vibration cues (set done, last 3 seconds, phase change; phones only), and the screen stays awake. Closing asks whether to keep going, finish and save, or discard. Timers are computed from timestamps, so they don't drift.

Entry points: **Start workout** on a workout page, **Start today's session** on Home, and **Start … session** on the My Coach day picker.

### Home extras

- **Weekly goal ring:** active days this week vs. the user's goal (2–7 days, tap to change; saved on the device).
- **Your week in muscles:** heat map of the last 7 days, plus a nudge with **Find one** if a big muscle group had no work.
- **Live session countdown:** the next-session card shows "STARTS IN 2H 14M" or a red **LIVE NOW**.
- Stat numbers count up; content shows shimmer placeholders while loading; cards spring when pressed; pills give a light vibration.

**Design system:** brand theme and gradients in `src/theme/index.ts` (the working name `APP_NAME = "FitCoach"` is set there too); shared pieces in `src/components/ui.tsx` (`PageHeader`, `Panel`, `Section`, `Pill`, `ProgressLine`, `IconBubble`, `Meta`), `WorkoutCard`, `BodyMap`, `AuthShell`. Light and dark themes are both defined. Dates are shown in English (`en-GB`) and money as `Rp 79.000`.

**Videos:** `YouTubePlayer` uses an `<iframe>` on web and a `react-native-webview` page on phones. The WebView loads the embed from an HTML page with a base URL, because YouTube rejects embeds that have no referrer. Some videos disable embedding; choose ones that allow it.

---

## 9b. Coach dashboard (`coach-web/`)

A Next.js web app for coaches, at http://localhost:3000 locally.

| Page | What it does |
| --- | --- |
| `/login` | Coach sign-in with one-click demo accounts (client accounts are refused) |
| `/` Dashboard | Stats; **Needs your attention** (new clients to claim, clients without a plan, clients who haven't trained for 3+ days, clients without a booked session, each with a one-click action); upcoming sessions by day; recent client activity |
| `/clients` | Searchable client cards: track, level, goal, active plan, next session, last training (flagged red after 3 days) |
| `/plans` | **Training plans (1-on-1)**: every plan across your clients with status filters, length and client progress; **+ New plan** (pick a client); a reminder lists clients without an active plan |
| `/clients/[id]` | Client header with quick actions (Open plan, New plan, Schedule session); tabs: Overview (goal, this week's and whole-plan progress, upcoming sessions, latest training), Training log, Sessions, Plans |
| `/plans/[id]` | **Plan builder**: week tabs, Monday–Sunday columns, add from catalog or custom (with optional muscle editing), edit/remove, copy a week, publish/archive. Done items get a green edge, with the client's last log. |
| `/sessions` | Agenda grouped by day (Today, Tomorrow, …) with Join, Done, Move (reschedule dialog) and Cancel (confirm dialog); Schedule session dialog |
| `/workouts` | **Workout library (Monthly)**: all ready-made workouts as cards (published/draft, video, times done); **+ New workout** |
| `/workouts/[id]` | Workout editor: ordered exercise list from the catalog (sets, reps, seconds, rest, note, reorder, remove), details (type, sport, level, minutes, where, equipment, description, follow-along video, cover image), live combined muscle map, publish/unpublish, delete |
| `/exercises` | Exercise editor: pick an exercise (or **+ New**), paste a **YouTube link** (live preview), **click the muscles** on the body map, write cues, add equipment alternatives, save |

UI kit: icons from `lucide-react`; `components/feedback.tsx` (toasts, confirm dialogs, modals); `components/ui.tsx` (page header, stat cards, empty states, progress bars, tabs, skeleton loading). Light and dark themes follow the computer's setting. On narrow screens the sidebar becomes a slide-out menu.

Settings: `coach-web/.env.local` → `NEXT_PUBLIC_API_URL=http://localhost:4000`. The dashboard's origin must be listed in the backend's `CORS_ORIGINS`.

Prototype note: the dashboard keeps its tokens in `localStorage`. Before going live, move the refresh token to an httpOnly cookie.

---

## 10. Backend settings (`backend/.env`)

| Variable | Required | Default | Meaning |
| --- | --- | --- | --- |
| `NODE_ENV` | | `development` | `development`, `test` or `production` |
| `PORT` | | `4000` | API port |
| `DATABASE_URL` | ✅ | n/a | Postgres connection string |
| `SHADOW_DATABASE_URL` | dev only | n/a | Scratch database Prisma uses when creating migrations |
| `DATABASE_POOL_MAX` | | pg default (10) | Max database connections. Set to `1` for the local `prisma dev` database. |
| `JWT_ACCESS_SECRET` | ✅ | n/a | At least 32 characters; signs access tokens |
| `JWT_ACCESS_TTL_SECONDS` | | `900` | Access token lifetime |
| `REFRESH_TOKEN_TTL_DAYS` | | `30` | Refresh token lifetime |
| `CORS_ORIGINS` | | `http://localhost:3000` | Comma-separated browser origins allowed to call the API (local: dashboard `:3000` and web app `:8081`) |
| `APP_RESET_PASSWORD_URL` | | `fitnessapp://reset-password` | Link in password reset emails |
| `PUBLIC_API_URL` | | `http://localhost:4000` | Public address of the API (used for the Mayar redirect and the mock checkout) |
| `APP_PAYMENT_RETURN_URL` | | `fitnessapp://payment-complete` | Where `/payments/return` sends the user |
| `DATA_ENCRYPTION_KEY` | ✅ | n/a | 32 random bytes, base64. Encrypts phone numbers. **Never change it once real data exists**, or stored phone numbers can't be read. |
| `MAYAR_BASE_URL` | | sandbox URL | `https://api.mayar.io/hl/v1` (sandbox) or `https://api.mayar.id/hl/v1` (production) |
| `MAYAR_API_KEY` | prod | n/a | Empty means the fake checkout is used (development only) |
| `MAYAR_WEBHOOK_TOKEN` | prod | n/a | Secret (at least 24 characters) in the webhook URL |
| `API_RATE_LIMIT_PER_MIN` | | `100` | Requests per minute per IP on `/api` (the local `.env` uses 1000, because the app and dashboard share localhost) |
| `PRICE_MONTHLY_IDR` | | `79000` | Monthly tier price |
| `PRICE_COACHING_IDR` | | `499000` | Coaching tier price |

---

## 11. Testing

Run the tests with `cd backend && npm test`. The local database must be running.

| File | Covers |
| --- | --- |
| `tests/units.test.ts` | Billing-period dates (including short and leap months), pause/resume dates, encryption and tamper detection, phone validation, YouTube link parsing, Jakarta weeks and streaks |
| `tests/auth.test.ts` | Register, duplicate email, wrong password, profile, refresh rotation and stolen-token detection, validation |
| `tests/payments.test.ts` | Plans, phone required/invalid, coaching track required, invoice creation, encrypted phone, idempotency, invoice reuse, Mayar failure, webhook token, webhook not trusted, amount mismatch, duplicate webhooks settling once, unmatched webhooks, early renewal stacking, other users' payments hidden, pause/resume/cancel, history |
| `tests/features.test.ts` | Library browse/filter/search aliases, locked videos for non-members, completion needs a plan, history and stats; coaching closed without a plan, waiting state, claiming a client once, other coaches locked out, building a plan from the catalog, copy-week, publish, client sees and logs the plan, coach sees the log, session scheduling validation, notifications and one reminder per session, YouTube link editing (and that a partial update leaves other fields alone), muscle tagging flowing into plans, workout details and the muscle filter; plans list scoped per coach; library workout create → fill → publish → visible to members → delete only unpublishes once done; input validation |

Mayar is replaced with a fake in tests; the database is real. Currently **66 tests, all passing**. Stop the API before running them (the local database prefers one program at a time).

The mobile app and coach dashboard are checked with TypeScript (`npm run typecheck` / `npx tsc --noEmit`), and the dashboard also with ESLint and `next build`.

---

## 12. Security summary

| Concern | How it's handled |
| --- | --- |
| Passwords | bcrypt, cost 12 |
| Session theft | Short access tokens; rotating refresh tokens with reuse detection; stored hashed |
| Token storage on the device | Keychain/Keystore via `expo-secure-store` |
| Personal data at rest | Phone numbers encrypted with AES-256-GCM |
| Payment tampering | Webhook token checked in constant time; every payment confirmed with Mayar's API, including the amount |
| Double charging or double crediting | Idempotency keys; one-time settlement claim inside a database transaction |
| Brute force | Rate limits (see section 8) |
| Input | All request bodies validated with Zod; all database access through Prisma (no raw SQL) |
| Coach access | Every client-specific coach action checks the coach is assigned to that client |
| Headers and CORS | Helmet security headers; CORS restricted to listed origins |
| Secrets | Only in `.env`, which git ignores |

---

## 13. Status and roadmap

**Built (prototype)**
- Accounts: register, login, logout, token refresh, password reset, profile editing
- Mayar QRIS payments (fake checkout locally): checkout, webhook, status polling, audit log, receipts (printed to the console)
- Subscriptions: plans, renew early, pause, resume, cancel, payment history
- Workout library: 11 workouts and 31 exercises with home/outdoor alternatives; search and filters; video player; locked previews; mark complete; history
- Coaching (client): coach card, weekly plan with progress, exercise detail with logging, sessions with Google Meet and directions
- Coach dashboard: claim clients, client overview and training log, plan builder (catalog, custom items, copy week, publish), session scheduling and management, exercise catalog with YouTube links
- Notifications: in-app inbox and bell; new plan, session scheduled/rescheduled/cancelled, session reminder (24 h), renewal reminder (3 days), payment received
- Home dashboard: streak, weekly stats, next session, today's training, recommendations
- Dark/light/system appearance
- Demo data: 7 accounts in different states

**Next**
1. Real media: YouTube links and images (see [docs/MEDIA.md](docs/MEDIA.md))
2. Push notifications to the lock screen (Firebase project + Expo push), plus a development build of the app
3. Real email (SendGrid or Resend) for receipts and password reset
4. Logging (pino), Sentry, GitHub Actions CI, OpenAPI docs, deployment to Railway
5. Offline caching of the plan and library; coach–client messaging (Phase 2)
6. Move the scheduler to `pg-boss` when running more than one API instance; httpOnly cookie for the dashboard's refresh token
7. App icon and splash screen, app store builds and submission, Terms of Service and Privacy Policy

**Known risks** (details in [docs/decisions.md](docs/decisions.md))
- App Store review may require Apple in-app purchase for the Monthly tier instead of QRIS.
- Unlisted YouTube links can be shared outside the paywall.
