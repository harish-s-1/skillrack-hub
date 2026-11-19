# SkillRack Hub

Paste your SkillRack resume link and get points by category, a daily streak, a heatmap,
a college leaderboard, and AI explanations of the code you solved.

## 1. Check the reader on a real link first (important)

SkillRack has no public API, so the app reads the public resume page. The reader looks for
the labels Code Tutor, Code Track, Daily Challenge, Daily Test, Code Test and Points. It was
written without a saved copy of a real page, so test it on yours before anything else:

    npm install
    npm run check:link -- "https://www.skillrack.com/profile/<id>/<key>"

If it prints your name and points, you are done. If it fails, it prints the visible page text.
Send that to Claude and the labels in `lib/skillrack.ts` get fixed in one edit.

## 2. Run it

With this project linked to Neon, sign in once and deploy the config to pull the
Postgres connection strings into `.env.local`:

    neon login
    neon deploy

Set `ANTHROPIC_API_KEY`, `CRON_SECRET`, and `IP_SALT` in `.env.local` as needed
(see `.env.example`); Neon supplies `DATABASE_URL` and `DATABASE_URL_UNPOOLED`.

    npm run dev

- `DATABASE_URL`: pooled Neon Postgres connection. Tables are created on first request.
- `ANTHROPIC_API_KEY`: for the code explainer (console.anthropic.com).
- `CRON_SECRET`, `IP_SALT`: any long random strings.

## 3. Deploy

Push to GitHub, import in Vercel, add the same four env vars. `vercel.json` runs the daily
snapshot at 00:00 IST. Streaks come from the day-to-day change in points, so a profile's
history starts the day it is added.

## Limits to know about

- The daily job refreshes up to 150 profiles per run, oldest first. Past about 150 users,
  split it into more runs or move it to a queue.
- Explainer: 15 requests per visitor per hour, 2000 per day overall. Change in `app/api/explain/route.ts`.
- Nothing stops someone adding a classmate's link if they have it. Leaderboard listing is opt-in per profile.
- `npm run test:parser` checks URL safety (only skillrack.com is ever fetched), the parser on a made-up page, and the streak maths.
