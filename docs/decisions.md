# Architecture decisions

Decisions made at kickoff (2026-10-04), updated for spec v1.0 (2026-10-05), including where the build differs from the spec.

## Accepted risks

**QRIS for both tiers, inside the app.** Apple guideline 3.1.1 and Google Play's billing policy require store billing for digital content such as the workout library. 1-on-1 coaching is a real-time person-to-person service, which Apple exempts (3.1.3(d)); the Monthly tier is not. Expect possible App Store rejection. Fallbacks, if that happens:
- Move the Monthly purchase to a website and make the app login-only.
- Add in-app purchase (RevenueCat) for the Monthly tier only.

Keeping payment logic behind `/api/payments` means either fallback is a client-side change.

**YouTube unlisted videos.** Private videos can't be embedded, and unlisted links can be shared freely, so library content can leak outside the paywall. YouTube's API policies also restrict charging for access to YouTube content. Videos are stored only as `youtubeVideoId`, so moving to Bunny Stream or Cloudflare Stream with signed URLs later means changing the player, not the data model.

## Payments (Mayar)

Based on Mayar's public API docs (docs.mayar.id). Spec v1.0's example endpoints and fields differ from these docs, so the docs were followed:

| Spec v1.0 says | Mayar actually provides | What we do |
| --- | --- | --- |
| `POST /invoices` returns a `qr_string` | `POST /invoice/create` returns `id`, `transactionId`, `link` (a hosted checkout page). No raw QR string. | The app opens the hosted page, which shows the QRIS code. `POST /qrcode/create` returns only an image with no id, so it can't be reconciled. |
| `order_id`, `callback_url` in the request | No such fields. The request needs `name`, `email`, `mobile`, `redirectUrl`, `expiredAt`, `items`, `extraData`. | `mobile` is required, so the app asks for the phone number once and stores it encrypted (AES-256-GCM). Our ids go in `extraData`. |
| Webhook signed with SHA256 + a secret | Webhooks are **not signed**. | A secret `?token=` on the registered webhook URL, compared in constant time. The body is never trusted: every webhook triggers `GET /invoice/{id}`, and only that response (status *and* amount) can settle a payment. |

The flow also differs from the spec's "begin transaction → call Mayar → commit". Holding a database transaction open across a network call ties up a connection, so we:
1. Create the payment as `PENDING`.
2. Call Mayar.
3. Store the invoice ids, or mark the payment `FAILED`.

Settlement is a single transaction: a `PENDING → SETTLED` claim plus the subscription extension, an audit event and a notification. The claim is a conditional update, so duplicate webhooks and status polls racing each other settle a payment exactly once.

Other payment details:
- Status polling (`GET /api/payments/:orderId/status`) also asks Mayar directly, at most every 10 seconds. This covers webhooks that never arrive or can't be matched (Mayar notes the webhook id isn't always the invoice id).
- `EXPIRED` payments are rechecked, so a payment made just before expiry still activates.
- Every webhook, verification and settlement is written to `PaymentEvent` (the spec's `payment_audit_log`), including rejected and unmatched webhooks.

## Where the build differs from spec v1.0

| Spec | Build | Why |
| --- | --- | --- |
| Refresh token in an httpOnly cookie, CSRF double-submit | Refresh token in the request body, stored in `expo-secure-store` | The client is a native app: cookies there are unreliable and add CSRF exposure for no benefit. The coach dashboard can use a cookie later if needed. |
| Redis for token revocation | `RefreshToken` table: hashed, rotated, reuse revokes every session | Same guarantees without paying for Redis. |
| Access token carries `tier` and scopes | Token carries only user id and role; entitlements are looked up per request | A tier inside the token would be stale for up to 15 minutes after payment or cancellation. |
| Separate `coaches` table | One `User` table with `role`, plus `CoachProfile` | One login system; a coach can also be a client. |
| Bull (Redis) | `pg-boss` on Postgres (when jobs are added) | No Redis cost. |
| bcrypt cost 10 | Cost 12 | Stronger; about 250 ms is fine for login. |
| Node 18 LTS | Node 22+ | Node 18 reached end of life in April 2025. |
| React Navigation v6 | Expo Router (built on React Navigation 7) | The Expo SDK 57 default. |
| Jest | Vitest | Same API, native ESM and TypeScript; no extra configuration. |
| Auth rate limit of 5 per 15 min | 5 failed attempts per 15 min, keyed by IP + email | Indonesian mobile carriers put many users behind one IP (CGNAT), so an IP-only key would lock out strangers. |
| Payment rate limit of 5 per min | 5 per min per user | Same CGNAT reason. |
| `UNIQUE(user_id, tier)` on subscriptions | Adopted | |
| Equipment filter (Gym / Home / No equipment) | Adopted as `Workout.equipmentSetting` | |
| Idempotency key on payments | Adopted, via the `Idempotency-Key` header on checkout | |

## Other decisions

| Area | Decision | Why |
| --- | --- | --- |
| Recurring billing | No auto-charge. A renewal is a new QRIS payment that extends `currentPeriodEnd`. An early renewal stacks onto the remaining time. A period is one calendar month, clamped (31 Jan → 28/29 Feb). | QRIS is single-use and push-based. |
| Access rule | Access while status is `ACTIVE` or `CANCELLED` and `currentPeriodEnd > now`. Coaching includes library access. | Cancelling stops renewal but keeps the paid period. |
| Pause | Pausing freezes access; resuming pushes `currentPeriodEnd` out by the pause length. No maximum pause length yet. | Paused days aren't lost. |
| Prices | Rp 79,000 (Monthly) and Rp 499,000 (Coaching), set by the `PRICE_*_IDR` environment variables. | Can change without a code change. |
| Refresh concurrency | The mobile client sends one refresh request at a time; the server claims each token atomically. | Without this, parallel 401s would trigger reuse detection and log users out. |
| Google Meet | MVP: the coach pastes a Meet link and the app opens it in the browser. Phase 2: auto-create links via the Calendar API. | Meet can't be embedded. |
| Coach dashboard | Separate Next.js app. | Building plans needs a desktop screen. |
| Prisma | Pinned to 7.10.0. | npm's `latest` tag currently points to an 8.0 release candidate. |
| API changes | `/auth/password-reset` became `/password-reset/request` and `/password-reset/confirm`. Added `/subscriptions/plans`, `/subscriptions/:id/resume` and `/payments/return`. | A reset needs two steps; Mayar's `redirectUrl` must be a web URL that bounces back into the app. |
| Coach assignment | Paying coaching clients appear as "waiting for a coach"; any coach can claim one, exactly once. The claim is a conditional update, so two coaches can't both get the same client. | Simple for a small team. An admin assignment screen can replace this later. |
| Scheduled jobs | In-process scheduler (every minute) for session reminders, renewal reminders and expiring stale checkouts. Reminders are claimed before sending, so overlapping runs can't double-send. | No extra infrastructure for one API instance. Move to `pg-boss` before scaling out. |
| Video access | Anyone signed in can browse workouts (the shop window); video ids and logging need an active plan. | Lets free users see the value before paying. Unlisted links remain shareable (accepted risk above). |
| Time zone | "Today", "this week" and streaks use Jakarta time (UTC+7) on the server; the app shows times in the device's zone. | Users are in Indonesia; a week starts on Monday. |
| Muscle map | 2D front/back SVG with 14 clickable muscle groups, main focus vs also works. | Works everywhere (phone, web, dashboard) with no download, is clear at a glance, and is what most fitness apps use. A true 3D anatomy viewer needs a licensed 3D model (GLB) plus a 3D renderer (three.js / expo-gl), which adds megabytes and is hard to tap accurately on a phone. The data model (muscle ids per exercise) works with either, so a 3D viewer can be added later without changing the backend. |
| Guided workout player | One full-screen player for library workouts and coaching plan days. Timers are computed from timestamps (so pausing and backgrounding don't drift), the screen stays awake, and vibration cues are skipped on web. Saving a library workout logs one completion; saving a plan day logs one entry per exercise so the coach sees it. | Following along is the main thing people do in a fitness app. Reusing the existing log endpoints meant no backend change for the player itself. |
| Weekly goal | Stored on the device (2–7 days, default 3), not on the server. | Cheap to ship and easy to change; move it to the profile if it should sync across devices. |
| Language | UI and dates in English (`en-GB`); money as `Rp 79.000`. | Consistent while the copy is being written. A Bahasa Indonesia translation is a separate step (i18n). |
| Local database | `prisma dev` with `DATABASE_POOL_MAX=1`. | Its PGlite engine mishandles concurrent connections. Real Postgres doesn't need the pool limit. |
