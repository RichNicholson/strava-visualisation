## Deployment guidance spike

**As a** developer  
**I want** a written guide covering Vercel deployment, environment variable configuration, and basic code protection advice  
**So that** I can confidently deploy the app and understand the practical limits of client-side code protection

### Acceptance criteria

- [ ] A `docs/deployment.md` file is created covering: Vercel project setup, required environment variables (`STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `NEXT_PUBLIC_APP_URL`), and the Strava OAuth callback URL configuration
- [ ] The guide includes a section on code protection: what Next.js minification provides out of the box, the practical limits of obfuscation for client-side JS, and a realistic assessment of what can and cannot be hidden
- [ ] The guide addresses the scenario of selling the app as a service: recommendations for protecting business logic (e.g. moving sensitive analysis to API routes / server components) and authentication/access control considerations
- [ ] The guide is concise (≤ 500 words) and actionable — no boilerplate or marketing language

### Implementation notes

- Relevant files: new `docs/deployment.md`
- This is a research/documentation spike — no code changes
- Reference the existing `app/api/auth/strava/` routes as the only current server-side code
- Next.js 15 App Router uses React Server Components by default; note that any `'use client'` component ships to the browser and is inspectable regardless of minification
