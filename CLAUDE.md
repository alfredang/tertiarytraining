# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Training Environment Management for Docker-based labs (WordPress, Ubuntu, Linux Desktop, Cybersecurity, …) with three roles: **Learner**, **Trainer**, **Admin**. Built with Next.js 16 (App Router) + TypeScript + Prisma + PostgreSQL + Tailwind. Production runs on Coolify at https://www.tertiarytraining.com.

## Common commands

```bash
# Local dev (requires .env with DATABASE_URL, JWT_SECRET, SEED_TOKEN)
npm install
npx prisma migrate dev --name <slug>   # generate + apply local migration
npx next dev -p 8016                   # ALWAYS run the dev server on port 8016 locally — `PUBLIC_BASE_URL` in .env and the Google/GitHub dev OAuth callback URLs are pinned to http://localhost:8016. Do not use `npm run dev` (defaults to 3000) or social sign-in will fail.

# Production build (also runs `prisma generate`)
npm run build
npm start

# Prisma
npm run prisma:generate
npm run prisma:migrate                 # alias for `prisma migrate dev`
npm run prisma:deploy                  # `prisma migrate deploy` (used at container start)
npm run prisma:seed                    # runs prisma/seed.ts

# Local stack via docker compose (Postgres + app)
JWT_SECRET=$(openssl rand -hex 32) docker compose up --build

# Seed bootstrap admin against any deployment
curl -X POST $BASE/api/admin/seed \
  -H "x-seed-token: $SEED_TOKEN" \
  -H "content-type: application/json" \
  -d '{"email":"...","password":"...","name":"..."}'
```

There is **no test runner** — feature changes are verified manually against a running app. `npm run lint` exists but isn't part of CI.

## High-level architecture

### Roles, visibility, and approval flow

This is the *most important* concept and the visibility rules have changed over time — don't infer them from old commits.

- All new signups (`/api/auth/signup/learner` and `/api/auth/signup/trainer`) create a `PENDING` user. `getSessionUser()` and `/api/auth/login` reject anything non-`ACTIVE`.
- Approve / reject via `/api/admin/approve-user` and `/api/admin/reject-user`. Both endpoints are open to **`ADMIN` and `TRAINER`**, but trainers may only approve/reject `LEARNER` accounts (enforced server-side).
- Account expiry (`User.expiresAt`): learners get `now + default_signup_validity_days` (a `SystemSetting`, default 7) on signup. **Trainers never expire** — `expiresAt` is forced to `null` whenever their role is set. Expired non-trainer users are blocked at login.
- Extend via `/api/admin/extend-user`. Admin can extend anyone (except trainers — trainers don't have expiry); trainer can only extend learners.
- **Visibility on the dashboards** (environment-scoped only — per-container assignment was removed for simplicity):
  - **Learner** sees every container under environments that have an `EnvironmentAssignment` for them.
  - **Trainer** sees only environments that have an `EnvironmentAssignment` for them, and may refresh containers under those environments.
  - **Admin** sees everything; the admin "View as" topbar buttons let them preview any role's dashboard (admin role bypasses the middleware role check).
- `EnvironmentAssignment` is the **only** way to grant access. Manage via the "Envs" button on `/admin/users` (calls `GET/PUT /api/users/[id]/environments`). The `DockerContainer.assignedUserId` column still exists in the schema but is no longer surfaced in the admin UI — new containers are created with `assignedUserId = null`.

### Auth

- JWT in an httpOnly cookie (`tt_session`), signed with `JWT_SECRET` using `jose`. No NextAuth.
- Use `getSessionUser()` (server) — it returns `null` if no token, invalid token, non-`ACTIVE` status, or expired non-trainer. Use `requireRole(...)` in API routes for role gating.
- Middleware (`src/middleware.ts`) guards `/dashboard/*` and `/admin/*` by reading the JWT. Trainers are explicitly carved-out for `/admin/signup-approvals` and `/admin/users`; everywhere else under `/admin` is admin-only. Admins can enter any `/dashboard/*`.

### Docker / Refresh

`src/lib/docker.ts` exports a `DockerService` interface with two implementations:
- `MockDockerService` — default, simulates stop/run, generates fake URLs. **This is what production currently runs** (`DOCKER_HOST_MODE=mock`).
- A commented-out `dockerode` implementation. To enable real Docker control: `npm i dockerode @types/dockerode`, uncomment the block in `docker.ts`, mount `/var/run/docker.sock` into the Coolify app container, set `DOCKER_HOST_MODE=dockerode`.

The actual refresh sequence lives in `src/lib/refresh.ts` (`refreshOneContainer`, `refreshByEnvironment`): set status `REFRESHING` → call DockerService → update URL + status `RUNNING` (or `ERROR`) → write `RefreshLog` row. **Always go through these helpers**, never call DockerService directly from a route.

### Production deployment quirks

- Coolify on Hostinger VPS (168.231.119.201). There's a **host-level nginx** (1.24, Ubuntu) sitting in front — Hostinger pre-installed it and serves other tenants (n8n, etc.) on the same box. **There is no Coolify Traefik.**
- Routing path: public → host nginx (port 443) → `proxy_pass http://10.0.1.X:3000` (the app container on the `coolify` Docker network). The vhost file is `/etc/nginx/sites-available/tertiarytraining` (do **not** touch `evolution-ssl` — that's the n8n vhost).
- Container IP **changes on every Coolify rebuild**. A systemd timer `tt-nginx-sync.timer` (script at `/usr/local/bin/tt-nginx-sync.sh`) runs every 30s, detects the new IP, rewrites the vhost upstream, and reloads nginx. If a deploy 502s for more than ~60s, that timer is the first thing to check.
- Let's Encrypt cert is at `/etc/letsencrypt/live/www.tertiarytraining.com/`. Issued via `certbot certonly --webroot -w /var/www/html`. Auto-renews via certbot's own systemd timer.
- GitHub → Coolify webhook auto-deploys on push to `main`. Webhook URL is `http://168.231.119.201:8000/webhooks/source/github/events/manual` (http, not https; SSL verification must be **disabled** in the GitHub webhook config).

### Dockerfile gotchas (already fixed — don't regress)

- The runtime stage uses Node 20-alpine with `prisma migrate deploy && node server.js` as `CMD`.
- We deliberately `COPY` `node_modules/prisma` (the full directory) into the runner, then invoke it as `node node_modules/prisma/build/index.js migrate deploy`. **Do not** revert to `npx prisma` — it will fetch the latest Prisma CLI (currently 7.x) which has breaking schema validation vs. our `@prisma/client` 5.22 and the container will crash-loop. **Do not** invoke via `./node_modules/.bin/prisma` either — the symlink confuses Prisma's WASM resolution.
- We have a deliberately-empty `public/.gitkeep` — without it, the runner stage's `COPY --from=builder /app/public ./public` fails the build.

### Schema highlights

`prisma/schema.prisma` defines:
- `User { role, status, expiresAt }` — see "Roles, visibility, and approval flow" above.
- `Environment` (immutable identity by `name`), `DockerContainer` (per-container status + URL), `EnvironmentAssignment` (M:N user↔env), `RefreshLog`, `AuditLog`, `SystemSetting`.
- After any schema change, generate a migration with `npx prisma migrate dev --name <slug>`. The runtime applies pending migrations automatically at container start (`prisma migrate deploy` in the Dockerfile `CMD`).

### Sidebar navigation

`src/lib/adminNav.ts` exports `adminNav`, `trainerNav`, and `navForRole(role)`. **Use `navForRole`** in any page that may be reached by more than one role (e.g. `/admin/signup-approvals`, `/admin/users`) so the trainer sees only the trainer-permitted entries.

### How-To guides

User-facing operator docs live in-app under `/admin/how-to/*`. When adding a guide:
1. Add an entry to the `guides` array in `src/app/admin/how-to/page.tsx`.
2. Create a new page under `src/app/admin/how-to/<slug>/page.tsx`. Existing guides (`setup-coolify-cicd`, `wordpress-environment`) are good templates — they reuse the `Section`/`Issue` helpers defined inline.

## Branding

Every page footer (rendered inside `DashboardShell` or `Footer`) shows:
> Powered by [Tertiary Infotech Academy Pte Ltd](https://www.tertiarycourses.com.sg)

Don't remove or change this link.
