# Deployment Guide

## Vercel Setup

1. Push the repo to GitHub.
2. In [Vercel](https://vercel.com), click **Add New Project** and import the repo.
3. Vercel auto-detects Next.js — accept the default build settings.
4. Add the environment variables below before deploying.

## Environment Variables

| Variable | Description |
|---|---|
| `STRAVA_CLIENT_ID` | Your Strava API application's Client ID |
| `STRAVA_CLIENT_SECRET` | Your Strava API application's Client Secret |
| `NEXT_PUBLIC_APP_URL` | Full URL of your deployed app (e.g. `https://your-app.vercel.app`) |

Set these in **Project → Settings → Environment Variables** in Vercel, or in `.env.local` for local development. Never commit `.env.local`.

## Strava OAuth Callback

In your [Strava API application settings](https://www.strava.com/settings/api), set the **Authorization Callback Domain** to your app's hostname (e.g. `your-app.vercel.app`).

The callback route is `app/api/auth/strava/callback` — the full URL Strava will redirect to is `${NEXT_PUBLIC_APP_URL}/api/auth/strava/callback`.

## Code Protection

**What Next.js provides out of the box:** All JavaScript is minified and bundled on build. Variable names are mangled and whitespace removed. This raises the bar for casual inspection but provides no real security.

**Practical limits:** Any component marked `'use client'` is shipped to the browser and is fully inspectable — minification notwithstanding. Browser DevTools, source maps (if enabled), and tools like `unminify` can recover readable code. Assume any client-side logic is readable by a motivated user.

Server-side code (API routes, React Server Components without `'use client'`) never leaves the server and cannot be inspected.

**Bottom line:** Minification obscures, it does not protect. Do not rely on it for security.

## Selling as a Service

If you want to protect proprietary analysis logic or charge for access:

- **Move sensitive logic server-side.** Any computation in `lib/analysis/` that represents competitive advantage should move into API routes or React Server Components. The client calls the route and receives only the result — the implementation stays on the server.
- **Add authentication/access control.** The current app relies on Strava OAuth to identify the user but has no access gate. To restrict who can use the app, check the authenticated Strava athlete ID in server-side middleware or API routes and return a 403 for unauthorised users.
- **Protect secrets.** `STRAVA_CLIENT_SECRET` is already server-only (no `NEXT_PUBLIC_` prefix). Keep any licence keys, database credentials, or API keys the same way — never prefix them with `NEXT_PUBLIC_`.

The existing `app/api/auth/strava/` routes are the model to follow: the secret never touches the browser.
