# Media checklist

Videos and images the prototype can use. Nothing here is required: missing media shows a neat placeholder.

**How to add them:** paste links into `backend/prisma/demo-media.json` (same keys as below), put image files in `backend/public/media/`, then stop the API and run `npm run db:seed`. Exercise videos can also be pasted in the coach dashboard under **Exercise library**.

**Tips**
- Pick short (1–3 min) technique demos that show the movement from the side, ideally in English or Bahasa Indonesia.
- Check the video allows embedding: on YouTube, *Share → Embed* must be available.
- Workout images: landscape, roughly 1280×720, JPG or PNG. Name them after the key (e.g. `full-body-basics.jpg`).
- Use only videos and images you're allowed to use (your own, licensed, or with the creator's permission), since the app is commercial.

## Priority 1: shown in the demo accounts' screens

| Key | Exercise | Where it appears |
| --- | --- | --- |
| `goblet-squat` | Goblet Squat | Raka's running plan, Full-Body Strength Basics |
| `single-leg-rdl` | Single-Leg Romanian Deadlift | Raka's running plan, Runner's Strength Circuit |
| `glute-bridge` | Glute Bridge | Full-Body Strength Basics, Post-Run Recovery Stretch, Runner's Strength Circuit |
| `calf-raise` | Calf Raise | Raka's running plan, Lower Body Power, Runner's Strength Circuit |
| `push-up` | Push-Up | Full-Body Strength Basics, Upper Body Push & Pull, Swimmer's Dryland Strength |
| `dumbbell-row` | Dumbbell Row | Full-Body Strength Basics, Upper Body Push & Pull, Swimmer's Dryland Strength |
| `plank` | Plank | Full-Body Strength Basics, Core Stability in 15, Swimmer's Dryland Strength |
| `side-plank` | Side Plank | Raka's running plan, Core Stability in 15, Runner's Strength Circuit |
| `hip-flexor-stretch` | Hip Flexor Stretch | Raka's running plan, Morning Mobility Flow, Post-Run Recovery Stretch |
| `hamstring-stretch` | Hamstring Stretch | Raka's running plan, Morning Mobility Flow, Post-Run Recovery Stretch |
| `easy-run` | Easy Run | Raka's running plan |
| `interval-run` | Interval Run | Raka's running plan |
| `long-run` | Long Run | Raka's running plan |

## Priority 2: other exercises

| Key | Exercise | Used in |
| --- | --- | --- |
| `romanian-deadlift` | Romanian Deadlift | Lower Body Power, Advanced Full-Body Strength |
| `bulgarian-split-squat` | Bulgarian Split Squat | Lower Body Power, Advanced Full-Body Strength |
| `reverse-lunge` | Reverse Lunge | 20-Minute No-Equipment HIIT, Bodyweight Cardio Ladder |
| `step-up` | Step-Up | Lower Body Power, Runner's Strength Circuit |
| `overhead-press` | Overhead Press | Upper Body Push & Pull, Swimmer's Dryland Strength, Advanced Full-Body Strength |
| `pull-up` | Pull-Up | Upper Body Push & Pull, Advanced Full-Body Strength |
| `dead-bug` | Dead Bug | Core Stability in 15, Swimmer's Dryland Strength |
| `bird-dog` | Bird Dog | Core Stability in 15 |
| `jumping-jack` | Jumping Jack | 20-Minute No-Equipment HIIT, Bodyweight Cardio Ladder |
| `mountain-climber` | Mountain Climber | 20-Minute No-Equipment HIIT, Bodyweight Cardio Ladder |
| `burpee` | Burpee | 20-Minute No-Equipment HIIT, Advanced Full-Body Strength, Bodyweight Cardio Ladder |
| `cat-cow` | Cat-Cow | Morning Mobility Flow, Post-Run Recovery Stretch |
| `worlds-greatest-stretch` | World's Greatest Stretch | Morning Mobility Flow |
| `tempo-run` | Tempo Run | Coach plan builder (swimming plans) |
| `freestyle-catch-up` | Freestyle Catch-Up Drill | Coach plan builder (swimming plans) |
| `kick-set` | Kick Set | Coach plan builder (swimming plans) |
| `pull-buoy-set` | Pull Buoy Set | Coach plan builder (swimming plans) |
| `swim-intervals` | Freestyle Intervals | Coach plan builder (swimming plans) |

## Workouts: thumbnail image (+ optional full follow-along video)

| Key | Workout | Image idea |
| --- | --- | --- |
| `full-body-basics` | Full-Body Strength Basics (30 min) | person lifting / training at home |
| `no-equipment-hiit` | 20-Minute No-Equipment HIIT (20 min) | high-energy bodyweight training |
| `lower-body-gym` | Lower Body Power (45 min) | person lifting / training at home |
| `upper-body-push-pull` | Upper Body Push & Pull (40 min) | person lifting / training at home |
| `core-stability` | Core Stability in 15 (15 min) | person lifting / training at home |
| `morning-mobility` | Morning Mobility Flow (12 min) | stretching / mobility on a mat |
| `recovery-stretch` | Post-Run Recovery Stretch (15 min) | stretching / mobility on a mat |
| `runners-strength` | Runner's Strength Circuit (25 min) | runner doing strength work |
| `swimmers-dryland` | Swimmer's Dryland Strength (30 min) | swimmer / pool-side dryland |
| `advanced-full-body` | Advanced Full-Body Strength (50 min) | person lifting / training at home |
| `cardio-ladder` | Bodyweight Cardio Ladder (30 min) | high-energy bodyweight training |

## Optional extras (not wired in yet)

- **App icon and splash screen**: 1024×1024 PNG icon → `mobile/assets/icon.png`, plus a splash image. Needed before the app store.
- **Coach photos**: the app shows initials for now; photos need a small upload feature.
