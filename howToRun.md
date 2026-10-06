# How to Run the Prototype

Step-by-step guide to running the fitness coaching app on your own computer. The commands are for Windows (PowerShell or the VS Code terminal) and also work on macOS and Linux.

You'll run **four programs at once**, each in its own terminal window:

| Terminal | What it runs | Address |
| --- | --- | --- |
| 1 | Database (local Postgres) | `localhost:51214` |
| 2 | Backend API | http://localhost:4000 |
| 3 | Client app (in your web browser, or on your phone) | http://localhost:8081 |
| 4 | Coach dashboard (web) | http://localhost:3000 |

---

## Part A: One-time setup

Do this only the first time.

### Step 1: Install the tools

- **Node.js 22 or newer**: download the LTS version from https://nodejs.org.
- **Git** (optional): only needed if you're cloning the project from a repository.

Check that Node is installed by opening a terminal and running:

```powershell
node -v
```

You should see `v22.x.x` or higher.

### Step 2: Open the project folder

```powershell
cd "D:\10. Project\fitnessApp"
```

### Step 3: Install the backend's packages

```powershell
cd backend
npm install
```

This takes a minute or two. It also generates the database client automatically.

### Step 4: Create the backend settings file (`.env`)

```powershell
copy .env.example .env
```

Open `backend\.env` in VS Code and fill in the two blank secrets. To get a value for each one, run the command below in the terminal and paste its output after the `=` sign.

| Setting | Command that prints a value for it |
| --- | --- |
| `DATA_ENCRYPTION_KEY` (required) | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `MAYAR_WEBHOOK_TOKEN` (optional) | `node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"` |

Also replace the placeholder value of `JWT_ACCESS_SECRET`. Generate one with:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Leave `MAYAR_API_KEY` **empty**. When there's no Mayar key, the app uses a **fake checkout page**, so you can test payments without a Mayar account.

> Prices are set in `.env`: `PRICE_MONTHLY_IDR=79000` and `PRICE_COACHING_IDR=499000`. Change them there and restart the API.

### Step 5: Install the app's packages

Open a new terminal:

```powershell
cd "D:\10. Project\fitnessApp\mobile"
npm install
copy .env.example .env
```

Open `mobile\.env` and set it to:

```
EXPO_PUBLIC_API_URL=http://localhost:4000
```

(To run the app on your phone instead, see Part D.)

### Step 5b: Install the coach dashboard's packages

```powershell
cd "D:\10. Project\fitnessApp\coach-web"
npm install
copy .env.example .env.local
```

---

## Part B: Start everything

Do this every time you want to run the prototype.

### Step 6: Terminal 1, start the database

```powershell
cd "D:\10. Project\fitnessApp\backend"
npm run db:dev
```

Wait until you see **"Your local Prisma Postgres server default is now running"**. **Leave this terminal open.** Closing it stops the database.

> The first start downloads the database engine and can take a few minutes.

### Step 7: Terminal 2, set up the tables and start the API

```powershell
cd "D:\10. Project\fitnessApp\backend"
npm run db:deploy
npm run db:seed
npm run dev
```

- `db:deploy` creates the tables. On later runs it just reports "No pending migrations".
- `db:seed` adds demo accounts and sample workouts. It's safe to run again.
- `dev` starts the API. Wait for **"API listening on http://localhost:4000"**.

You only need `db:deploy` and `db:seed` the first time, or after pulling new code. After that, `npm run dev` is enough.

Check that it works by opening http://localhost:4000/health in your browser. You should see `{"ok":true}`.

**Leave this terminal open.**

### Step 8: Terminal 3, start the app

```powershell
cd "D:\10. Project\fitnessApp\mobile"
npx expo start --web
```

When it says **"Waiting on http://localhost:8081"**, open **http://localhost:8081** in your browser. The first load takes 10–30 seconds while the app is built.

> Tip: press **F12**, then the device toolbar button (**Ctrl+Shift+M**) in Chrome or Edge to see the app at phone size.

**Leave this terminal open.**

### Step 9: Terminal 4, start the coach dashboard

```powershell
cd "D:\10. Project\fitnessApp\coach-web"
npm run dev
```

Open **http://localhost:3000** and sign in as a coach (see the accounts below). **Leave this terminal open.**

---

## Part C: Try the prototype

### Demo accounts

`npm run db:seed` creates these accounts, each in a different state, so every screen has something to show. Re-running the seed resets them.

| Who | Email | Password | What you'll see |
| --- | --- | --- | --- |
| New user | `client@example.com` | `client-password-123` | No plan yet: good for trying checkout and seeing locked content |
| Monthly member | `member@example.com` | `client-password-123` | Workout library unlocked, 7 workouts of history, a 3-day streak |
| Coached runner | `runner@example.com` | `client-password-123` | Coach Bayu, a 4-week 10K plan in week 2, logged runs, a video session tomorrow and a track session later this week |
| Swimmer waiting for a coach | `swimmer@example.com` | `client-password-123` | Paid for coaching, no coach yet ("Matching you with a coach") |
| Running coach | `coach.run@example.com` | `coach-password-123` | Coach dashboard with Raka as a client |
| Swimming coach | `coach.swim@example.com` | `coach-password-123` | No clients yet; Sinta is waiting to be claimed |
| General coach | `coach@example.com` | `coach-password-123` | Empty dashboard |

Clients log in to the **app** (http://localhost:8081); coaches log in to the **dashboard** (http://localhost:3000).

### Walkthrough 1: Browse the library and buy a plan (`client@example.com`)

1. **Workouts** tab: search (try "squat") and filter by type (**Strength / Cardio / Flexibility / Sport-specific**), equipment (**Home / No equipment / Gym**) and level.
2. Open a workout. You see the exercises, sets and reps, and **home alternatives** ("No dumbbell? Use a backpack"), but the video is **locked**.
3. Tap **Unlock with a plan**, choose a plan, enter a mobile number (e.g. `081234567890`) and tap **Pay with QRIS**.
4. On the **fake checkout page** that opens, click **Simulate successful payment**, then go back to the app tab. It shows **"You're in! 🎉"**.

### Walkthrough 2: A member's day (`member@example.com`)

1. **Home** shows a streak, stats, membership status and recommended workouts.
2. Open a workout, tap **Mark as complete** and add a note. The streak and history update.
3. Try **Profile → Workout history**, **Profile → Membership & payments** (pause, cancel, receipts) and **Profile → Appearance** (dark mode).

### Walkthrough 2b: The guided workout player (`member@example.com`)

1. Open any workout and tap **Start workout**.
2. Follow along: 3-2-1, then **Set done** after each set, rest with the countdown ring (**−15 s / Skip rest / +15 s**), and see what's next. Try **pause** (top right) and **Demo** or **Swap**.
3. At the end: confetti, your stats and the muscles you worked. Pick how it felt and tap **Save workout**. Your streak updates.
4. Back on **Home**, see the **weekly goal ring** (tap it to change your goal) and **Your week in muscles** glowing where you trained.

On a phone (Expo Go) you also feel vibration cues, and the screen stays on while training.

### Walkthrough 3: Coaching from the client's side (`runner@example.com`)

1. **Home** shows *Next coaching session* (with a live "starts in …" countdown) and *Today's training* with **Start today's session**, the guided player for the coach's plan. Saving sends every exercise to the coach.
2. **Coaching** tab: coach card, plan progress, **Week 1–4** tabs, and a Monday–Sunday schedule with ✓ next to done items.
3. Tap an exercise: coach's note, home alternatives and a log form (distance and time for runs; sets, reps and weight for strength). Tap **Mark as done**.
4. **All sessions** lists upcoming and past sessions; in-person sessions have a **Directions** button.
5. The 🔔 bell (top right) shows reminders, new plans and payment receipts.

### Walkthrough 4: The coach's side (dashboard and app together)

1. Sign in to the dashboard as **`coach.swim@example.com`**. The Dashboard shows **Sinta Dewi** under *New clients waiting for a coach*. Click **Claim client**.
2. Go to **Clients → Sinta Dewi → + New plan**, give it a title and click **Create plan & open builder**.
3. In the **plan builder**, click **+ Add** on a day and pick an exercise (e.g. *Freestyle Catch-Up Drill*). Set `Sets 6` and `Metres 50`, add a note, then click **Add**. Add a few more, use **Copy week 1 to week 2**, then click **Publish to client**.
4. Back on Sinta's page, click **+ Schedule** to book a session. Online sessions need a Meet link: use *create one ↗*, or paste any `https://meet.google.com/...` link.
5. Log in to the **app** as **`swimmer@example.com`**. The bell shows the notifications, and **Coaching** shows the new plan and session.
6. Log an exercise as Sinta, then refresh her client page in the dashboard. It appears under **Training log** and in the Dashboard's *Recent client activity*.

### Walkthrough 5: Manage plans and the Monthly library (dashboard)

The dashboard menu separates the two kinds of training:
- **Training plans (1-on-1):** personal plans, one per client. Open a plan to edit it in the plan builder, or use **+ New plan** and pick a client.
- **Workout library (Monthly):** ready-made workouts that every member can follow. Click **+ New workout**, give it a title, then add exercises from the list, set sets, reps and rest, put them in order and click **Save exercises**. Fill in the details (description, cover image, optional follow-along video) and click **Publish to members**. It appears in the app's Workouts tab straight away.

### Walkthrough 6: Tag the muscles an exercise trains

1. In the dashboard, open **Exercise library** and click an exercise, for example **Push-Up**.
2. Paste a YouTube link under *1. Demo video*. A preview appears.
3. Under *2. Muscles*, click **Chest** once (main focus, dark orange) and **Shoulders** twice (also works, light orange). A third click clears a muscle. Then click **Save changes**.
4. In the app, open a workout that contains a push-up (e.g. *Full-Body Strength Basics*). *Muscles worked* shows the combined map, and each exercise shows its own when you expand it.
5. On Home, tap a muscle under **Train by muscle**, or use **Workouts → Filters → Target muscle**.

Also try **`coach.run@example.com`**. Raka's plan already has a week of logged runs, and the **Sessions** page lets you mark a session done, reschedule it or cancel it (the client is notified).

### Still simulated in this prototype

- **Payments** use the fake checkout until you add a Mayar key (see the end of this guide).
- **Emails** (receipts, password reset) are printed in **Terminal 2** instead of being sent.
- **Push notifications** to the phone's lock screen need a Firebase project. For now, notifications show in the app's 🔔 inbox.
- **Videos and images** are placeholders until you add them (see Part H).
- The demo Google Meet link (`abc-defg-hij`) isn't a real meeting.

---

## Part D (optional): Run on your phone with Expo Go

1. Install **Expo Go** from the App Store or Google Play.
2. Connect your phone and computer to the **same Wi-Fi network**.
3. Find your computer's local IP address:
   ```powershell
   ipconfig
   ```
   Look for **IPv4 Address** under your Wi-Fi adapter, for example `192.168.1.25`.
4. Edit `mobile\.env`:
   ```
   EXPO_PUBLIC_API_URL=http://192.168.1.25:4000
   ```
5. Edit `backend\.env`:
   ```
   PUBLIC_API_URL=http://192.168.1.25:4000
   ```
   Then restart the API (Ctrl+C in Terminal 2, then `npm run dev`).
6. In Terminal 3, stop the web version (Ctrl+C) and run:
   ```powershell
   npx expo start
   ```
7. Scan the QR code shown in the terminal. On iPhone, use the Camera app; on Android, use Expo Go.

> If the phone can't connect, Windows Firewall may be blocking port 4000 or 8081. Allow Node.js on **private networks** when Windows asks.

---

## Part E: Stopping and restarting

- **Stop:** press **Ctrl+C** in each terminal.
- **Start again later:** repeat **Steps 6, 7, 8 and 9**. In Step 7 you can skip `db:deploy` and `db:seed`.

---

## Part F: Run the automated tests

The database (Terminal 1) must be running. Then, in any terminal:

```powershell
cd "D:\10. Project\fitnessApp\backend"
npm test
```

You should see **66 passed**. The tests use a fake Mayar, so no internet connection is needed.

> Stop the API (Terminal 2) first: the local database works best with one program at a time.

Typecheck the code (checks for coding mistakes without running it):

```powershell
cd "D:\10. Project\fitnessApp\backend"; npm run typecheck
cd "D:\10. Project\fitnessApp\mobile"; npm run typecheck
cd "D:\10. Project\fitnessApp\coach-web"; npx tsc --noEmit
```

---

## Part G: Useful extras

| Command (run in `backend/`) | What it does |
| --- | --- |
| `npm run db:studio` | Opens a web page where you can browse and edit database tables |
| `npm run db:seed` | Resets the demo accounts and applies `prisma/demo-media.json` (stop the API first) |
| `npm run build` then `npm start` | Runs the API the way production does |

---

## Part H: Adding videos and images

Everything works without media: exercises show "Video coming soon" and workouts show a coloured banner. To add real media:

**Option 1: the coach dashboard (quickest for videos).** Go to **Exercise library**, paste a YouTube link next to an exercise and click **Save**. The video appears straight away in library workouts, and in plan items created after that.

**Option 2: `backend/prisma/demo-media.json` (videos and images).**
1. Open `backend\prisma\demo-media.json`. Every exercise and workout has a `search` hint telling you what to look for.
2. Paste YouTube links into `"youtube"`. Any format works: `watch?v=`, `youtu.be/` or `shorts/`.
3. For workout images, put the file in `backend\public\media\` (e.g. `full-body-basics.jpg`) and write just the file name in `"thumbnail"`. Landscape images (16:9, about 1280×720) look best.
4. Stop the API (Ctrl+C in Terminal 2), run `npm run db:seed`, then run `npm run dev` again.

The full list, with suggestions, is in [docs/MEDIA.md](docs/MEDIA.md).

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `Invalid environment variables: DATA_ENCRYPTION_KEY …` | You skipped Step 4. Generate the key and paste it into `backend\.env`. |
| `P1001: Can't reach database server at localhost:51214` | The database isn't running. Start Terminal 1 (`npm run db:dev`). |
| `bind message supplies … parameters` | Make sure `DATABASE_POOL_MAX=1` is in `backend\.env`. The local database handles only one connection reliably. |
| Stuck or odd errors when running scripts while the API is running | Same cause: the local database prefers one program at a time. Stop the API (Ctrl+C), run the script, then start the API again. |
| `EADDRINUSE: address already in use :::4000` | The API is already running in another terminal. Close it, or change `PORT` in `.env`. |
| App shows **"Can't reach the server"** | The API isn't running, or `EXPO_PUBLIC_API_URL` in `mobile\.env` is wrong. After changing `mobile\.env`, restart Terminal 3. |
| Checkout tab doesn't open | Your browser blocked the pop-up. Allow pop-ups for `localhost:8081` and try again. |
| **"Checkout not found"** on the fake payment page | The API restarted and fake invoices are kept only in memory. Start a new checkout in the app. |
| `npm run db:seed` or `npm test` seems stuck | The API (Terminal 2) is holding the local database. Stop it with Ctrl+C, run the command, then start the API again. |
| A video says "An error occurred" on a phone | Some YouTube videos block embedding. Pick another video. |
| The dashboard says "This dashboard is for coaches" | You signed in with a client account. Use a coach account from Part C. |
| **"Too many requests"** when logging in | 5 failed logins for that email are allowed per 15 minutes. Wait, or restart the API to reset the limit. |
| `prisma migrate dev` says the environment is "non-interactive" | Run it in a normal terminal window, or use `npm run db:deploy` instead. |

---

## Using real Mayar payments (later)

1. Get an API key from your Mayar dashboard (a sandbox key for testing).
2. In `backend\.env`, set:
   ```
   MAYAR_API_KEY=<your key>
   MAYAR_BASE_URL=https://api.mayar.io/hl/v1      # sandbox
   # MAYAR_BASE_URL=https://api.mayar.id/hl/v1    # production
   ```
3. Mayar needs a public address to send payment notifications to. Expose your API with a tunnel:
   ```powershell
   npx cloudflared tunnel --url http://localhost:4000
   ```
   Copy the `https://….trycloudflare.com` address it prints.
4. Set `PUBLIC_API_URL=<that https address>` in `backend\.env` and restart the API.
5. In the Mayar dashboard, go to **Integration → Webhook** and enter:
   ```
   <PUBLIC_API_URL>/api/payments/mayar-callback?token=<your MAYAR_WEBHOOK_TOKEN>
   ```

The fake checkout page turns off automatically as soon as `MAYAR_API_KEY` is set.
