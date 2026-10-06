# FitCoach: Feature Guide

What the app does, in plain language. Written for the person who requested the app: no technical knowledge needed.

*"FitCoach" is a working name and can be changed.*

*Versi Bahasa Indonesia: [features_idn.md](features_idn.md).*

---

## 1. The idea in one minute

FitCoach is a fitness app for Indonesia with **two ways to train**:

| | **Monthly Membership** | **1-on-1 Coaching** |
| --- | --- | --- |
| Price (sample) | Rp 79,000 / month | Rp 499,000 / month |
| What you get | A library of ready-made workouts with video demos, to follow on your own | A real coach who builds a **personal plan just for you**, adjusts it every week, and meets you by video call |
| Who it's for | People who want guidance and variety | People who want accountability and a plan around their goal (running, swimming, or general fitness) |
| Includes the library? | Yes | Yes, plus everything below |

There are **two programs**:
- **The mobile app** (iPhone and Android) is used by members and coaching clients.
- **The coach dashboard** (a website) is used by coaches to manage clients, plans and content.

Payment is by **QRIS**, so customers can pay with GoPay, OVO, DANA, ShopeePay or mobile banking.

---

## 2. For members and clients (the mobile app)

### 2.1 Getting started
- **Sign up** with name, email and password; **log in**; **log out**.
- **Forgot password:** the user asks for a reset link by email. *(In this prototype the email is printed to the server log instead of being sent. See section 5.)*
- **Quick personal setup (3 questions)** right after signing up: what they want to train for (general fitness, running or swimming), their level, and their goal. This is used to recommend workouts and is shown to their coach.
- **Free to browse:** anyone with an account can look at every workout. Videos and tracking unlock after subscribing.
- **Light, dark or automatic** appearance, chosen in Profile.

### 2.2 Home screen
A daily dashboard that changes with what the user has done:
- **Greeting and date.**
- **Weekly goal ring:** an activity-ring style circle showing training days this week against the user's goal (they choose 2–7 days). Turns green with a 🎉 when reached.
- **This-week strip:** Monday to Sunday, with a tick on each day they trained.
- **Three stat cards:** current **streak** (days in a row), **done this week**, and **library workouts** completed. Numbers count up when the screen opens.
- **Next coaching session** (coaching clients): when it is, a live countdown ("starts in 2h 14m", turning to a red **LIVE NOW**), and a **Join Google Meet** button.
- **Today's training** (coaching clients): the exercises their coach set for today, with ticks, and a **Start today's session** button.
- **Your week in muscles:** a body map that lights up where they trained over the last 7 days. If a big muscle group had no work, the app says so and offers **Find one**.
- **Recommended for you:** workouts picked from their sport and level.
- **Train by muscle:** shortcuts like Chest, Biceps, Glutes that open matching workouts.
- **Membership card** showing the plan and when it's paid until.
- New visitors without a plan see a friendly **"Start training today"** banner.

### 2.3 Workout library (Monthly Membership)
- **11 ready-made workouts** and **31 exercises** to start with. Coaches can add and edit more.
- **Search** by workout name, description or exercise name.
- **Filters:** type (Strength, Cardio, Flexibility, Sport-specific), where you train (**Home, No equipment, Gym**), level (Beginner, Intermediate, Advanced), and **target muscle**.
- Each workout card shows duration, level, where it's done, and the muscles it targets.
- **Workout page:**
  - Video (members only; others see a "Members only" preview and an unlock button).
  - At a glance: time, level, number of exercises, where.
  - **Muscles worked:** a front and back body map for the whole workout.
  - **Every exercise**, numbered, with sets, reps or time, and rest. Tap one to see coaching tips, a **demo video**, its own muscle map, and **alternatives for people without equipment** (for example "no dumbbell? use a backpack filled with books").
  - **Start workout** (the guided player below), or **Already did it? Log it** with an optional note.
- **History** of completed workouts, with notes.

### 2.4 Guided workout player
Press **Start workout** and the app coaches the user through it, like a personal trainer:
- **3-2-1 countdown**, then one exercise at a time with the muscles it works and the coach's or exercise's tips.
- **Reps exercises:** a big rep target and a **Set done** button.
- **Timed exercises** (planks, stretches): a countdown ring that moves on by itself.
- **Runs and swims:** a stopwatch showing the target distance and pace.
- **Rest between sets:** a countdown ring with **−15 s**, **Skip rest** and **+15 s**, a short tip, and a preview of what's next.
- **Demo video** and **no-equipment alternatives** available at any moment; **Skip** an exercise; **Pause** everything.
- Progress bar for the whole workout, total time, vibration cues on phones, and the screen stays on.
- **Celebration at the end:** confetti, time, sets and reps (or distance), the muscles worked, and "How did it feel?" (Tough / Just right / Easy) with an optional note.
- **Saving** records the workout and shows the new streak and milestones (1st, 5th, 10th, 25th, 50th, 100th workout).
- Works for library workouts and for **coaching plan days**. For coaching clients, saving sends every exercise to their coach.

### 2.5 1-on-1 coaching (the "My Coach" tab)
What the screen shows depends on where the client is:
1. **Not a coaching client:** a clear explanation of what 1-on-1 adds on top of Monthly, with the price and a **Get my coach** button.
2. **Paid, waiting for a coach:** "We're matching you with a coach", with a button to train with the library meanwhile. They're notified when matched.
3. **Coach assigned, plan not ready:** "Your coach is building your plan".
4. **Active plan:**
   - **Coach card** with photo initials, specialty and short bio.
   - **Next session** card.
   - **Plan card:** name, week X of Y, the coach's note, and an overall progress bar.
   - **Week selector** and a **Monday–Sunday day picker** with dots for days that have work and ticks for finished days.
   - **That day's exercises:** name, what to do ("3 × 10", "6 × 400 m @ 5:00/km"), and the muscles.
   - **Start today's session** to use the guided player.
   - **Rest days** are shown kindly.
- **Exercise page:** the coach's note, demo video, muscle map, no-equipment alternatives, and a **log form**: sets, reps and weight for strength work, or distance and time for runs and swims, plus "how did it feel?". Leaving the numbers empty logs it exactly as prescribed. The coach sees everything straight away.
- **Plans are personal:** two clients never get the same plan unless the coach chooses to.

### 2.6 Coaching sessions
- Weekly **45-minute video session** on Google Meet, plus **in-person sessions** when the coach offers them.
- List of **upcoming and past** sessions.
- **Join** button for online sessions (highlighted from 10 minutes before the start); **Directions** button (opens Maps) for in-person ones.
- **Mark attended** after the session.
- Reschedules and cancellations by the coach appear immediately.

### 2.7 Notifications
- **In-app inbox** with a bell and unread count; tapping a notification opens the related screen; **Mark all read**.
- Sent automatically for: **coach assigned**, **new plan published**, **session scheduled / moved / cancelled**, **payment received**.
- **Automatic reminders:** the day before every session, and 3 days before a plan ends so the customer can renew.
- *Push notifications to the phone's lock screen are planned (needs a Firebase account). See section 5.*

### 2.8 Membership and payments
- **Plan picker** compares both plans side by side, with prices and what's included.
- Coaching clients choose their **focus**: Running, Swimming or General fitness.
- **Pay with QRIS:** the app opens the payment page showing the QR code. The app waits and confirms by itself as soon as the payment arrives, and shows "You're in! 🎉".
- **No double charges:** tapping twice doesn't create two payments.
- **Renew early:** extra time is simply added to what's left.
- **Pause** (days are frozen and given back when resumed), **resume**, and **cancel** (access continues until the paid time ends).
- **Payment history** with receipts.
- *QRIS cannot charge automatically each month, so every month is a new payment. The app reminds people before it ends.*

### 2.9 Profile
- Profile card with name, plan, level, interest and **goal**.
- **Edit profile:** name, birth year, level, interest, goal.
- **Membership and payments**, **Notifications**, **Workout history**, **Coaching sessions**.
- **Appearance:** Auto / Light / Dark.

---

## 3. The muscle map

Exercises are tagged with the muscles they train, so the app can *show* people what a movement does.
- **14 muscle groups:** chest, shoulders, biceps, triceps, forearms, abs, obliques, traps, lats, lower back, glutes, quads, hamstrings, calves.
- **Two levels:** **main focus** (strong orange) and **also works** (light orange).
- **Coaches set it:** in the dashboard they click the muscles on a body diagram (click once for main focus, twice for also works, three times to clear). Example: Bicep curl → click *Biceps* → members see biceps highlighted.
- **Members see it** on workouts, on each exercise, in the player's results, on coaching exercises, and as a heat map on Home.
- **Search by muscle** with the Target muscle filter.
- It is a clear **2D front and back figure**, not a 3D model. A true 3D anatomy viewer is possible later and needs a licensed 3D model (see section 5).

---

## 4. For coaches (the dashboard website)

Coaches sign in on a website (a **separate login** from clients). The demo login page has one-click demo coaches.

### 4.1 Dashboard (home)
- Greeting and four numbers: **active clients**, **sessions in the next 7 days**, **exercises clients logged this week**, **new clients waiting**.
- **"Needs your attention":** a to-do list with one-click actions:
  - a new client paid for coaching → **Claim client**
  - a client has no plan yet → **Build plan**
  - a client hasn't trained for 3+ days → **View**
  - a client has no session booked → **Schedule**
- **Upcoming sessions** grouped by day (Today, Tomorrow, …) with a **Join** button.
- **Recent client activity** (who did what, results and notes).
- A badge on the menu shows how many new clients are waiting.

### 4.2 Claiming clients
Paying coaching clients appear as "waiting for a coach". A coach can **claim** one with a click (only one coach can). The client is notified straight away. Coaches can only see and change **their own** clients.

### 4.3 Clients
- **Search** and **Active / All** tabs.
- **Client cards:** name, track and level, goal, current plan, next session, last training (turns red after 3 days of silence), and membership end date.
- **Client page** with quick actions (**Open plan**, **New plan**, **Schedule session**) and tabs:
  - **Overview:** goal, this week's and the whole plan's progress, upcoming sessions, latest training.
  - **Training log:** every result with the client's notes.
  - **Sessions** and **Plans.**

### 4.4 Training plans (1-on-1)
- A list of all plans with status (**Draft, Active, Archived**), length and the client's progress.
- **Plan builder:**
  - Weeks in tabs (add a week, **copy a week** to another to build progression fast).
  - One row per day with real dates, today highlighted.
  - **Add** opens a simple form: search the exercise library (or type a custom exercise), pick the day, choose **Reps / Timed / Distance**, add sets, a note for the client, and optionally a video or muscles.
  - Edit or remove any item. Items the client already did show a green edge and their result.
  - **Draft first:** the client sees nothing until the coach clicks **Publish to client**, which notifies them. A newly published plan replaces the old active one.
  - **Archive** or delete a plan.
- Plans cover **running** (distance and pace), **swimming** (distances and pace per 100 m) and **general strength** equally.

### 4.5 Sessions
- Agenda grouped by day.
- **Schedule** an online session (paste a Google Meet link; a **create one** shortcut opens Google Meet) or an in-person session (a place), with length 30–90 minutes (45 is standard) and a note. The client is notified.
- **Join**, **Done**, **Move** (reschedule) and **Cancel**. The client is told about every change and gets a fresh reminder after a move.

### 4.6 Workout library (the Monthly content)
- Every library workout as a card, with Published / Draft, video and how many times members did it.
- **Create a workout:** title, type, level, where, minutes; then add exercises from the library, set sets, reps, time and rest, put them in order, and see the **combined muscle map** update live.
- Add a description, a cover image and an optional follow-along video.
- **Publish to members** or **Unpublish.** New workouts start as drafts. Workouts members have already done are unpublished rather than deleted, so their history stays.

### 4.7 Exercise library
- The building blocks of every workout and plan.
- For each exercise a coach can: paste a **YouTube link** (with a live preview), **click the muscles** on the body map, write coaching tips, list **equipment**, and add **alternatives** for people without equipment (home, outdoors, easier).
- Changes show to members straight away.

### 4.8 Other
- Works on a computer or a narrower screen; light and dark appearance follow the computer.
- Confirmations for risky actions, short messages when something is saved, and helpful empty pages.

---

## 5. What is simulated, and what's still needed

### Simulated in this prototype
| Item | What happens now | To make it real |
| --- | --- | --- |
| **Payments** | A **fake checkout page** ("Simulate successful payment") is used automatically | A **Mayar API key** (sandbox first, then live) |
| **Emails** (receipts, password reset) | Printed in the server log | An email service (SendGrid or Resend) |
| **Push notifications** | In-app inbox only | A **Firebase** project |
| **Videos** | "Video coming soon" placeholders | YouTube links (see `docs/MEDIA.md`) |
| **Images** | Colourful gradient covers | Image files for the 11 workouts |
| **Google Meet links** | Coaches paste a link | Optional later: auto-create through Google Calendar |

### Not built yet
- **Google sign-in** (email and password only today).
- **Offline use** (the app needs a connection).
- **Coach–client chat** (planned for a later phase).
- **Progress charts** over time (today: streak, weekly goal, history, muscle heat map).
- **Bahasa Indonesia** (the app is in English; the translation is a separate step).
- **App Store and Google Play** release, plus Terms of Service and Privacy Policy.
- A **3D muscle viewer** (needs a licensed 3D model).
- **Admin screens** (for example assigning a specific coach; today coaches claim clients).

### Risks to know about
- **App Store review:** Apple requires in-app purchase for digital content. Payment by QRIS inside the app for the Monthly library may be rejected on iPhone. Options: sell Monthly on a website, or use Apple's purchase for Monthly only. 1-on-1 coaching is a human service and is generally allowed.
- **YouTube:** unlisted videos can be shared by anyone with the link, so videos are not fully protected behind the paywall. A video service with signed links is a later upgrade.

### Decisions only you can make
- The **final app name** and logo.
- **Prices** (Rp 79,000 and Rp 499,000 are samples).
- Whether to launch on **iPhone and Android together**, or Android first.
- Whether you want the **3D muscle viewer**.
- How coaches are **onboarded** (today, coaches are created by an administrator).

---

## 6. How it matches your original brief

| Requirement from the brief | Status |
| --- | --- |
| Register and log in | ✅ |
| Profile (age, level, goals, specialty) | ✅ |
| Password reset | ✅ (email simulated) |
| Google sign-in | ⏳ Not yet |
| Two subscription tiers | ✅ |
| QRIS payment | ✅ with a fake checkout until a Mayar key is added (Mayar used instead of Midtrans, as in the later spec) |
| Payment status and receipt | ✅ (receipt email simulated) |
| Pause and cancel subscription | ✅ (plus resume and renew early) |
| Workout library by type, with search and filters | ✅ |
| Video demonstrations | ✅ built in; videos to be added |
| Workout details (time, difficulty, equipment) | ✅ |
| Completion tracking and history | ✅ |
| Personalized plans from a coach | ✅ |
| Specialized tracks (running, swimming, general) | ✅ |
| Equipment substitution guide | ✅ on every exercise |
| Weekly 45-minute Google Meet sessions | ✅ (link pasted by the coach) |
| In-person session notifications | ✅ |
| Coach login, client list, plan builder, scheduling | ✅ |
| Notifications and reminders | ✅ in-app; ⏳ lock-screen push |
| Dark and light mode | ✅ |
| Error handling and feedback | ✅ |
| Offline support | ⏳ Not yet |
| Coach–client chat | ⏳ Later phase |
| Progress analytics | 🟡 Basic (streak, goal ring, history, muscle heat map) |

**Beyond the brief:** the guided workout player, the muscle map and heat map, the weekly goal ring, the "needs your attention" coach to-do list, and onboarding.

---

## 7. Where to find more

- **Try it yourself:** [howToRun.md](howToRun.md), with demo accounts and walkthroughs.
- **Day-by-day progress:** [docs/DAILY_LOG.md](docs/DAILY_LOG.md).
- **Videos and images to provide:** [docs/MEDIA.md](docs/MEDIA.md).
- **Technical detail (for developers):** [DOCUMENTATION.md](DOCUMENTATION.md) and [docs/decisions.md](docs/decisions.md).
