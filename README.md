# Tertiary Training

Training Environment Management for Docker-based labs (WordPress, Ubuntu, Linux Desktop, Web Dev, Cybersecurity, …) with role-based access for **Learners**, **Trainers**, and **Admins**.

Built with **Next.js 16**, **TypeScript**, **Tailwind CSS**, **Prisma**, and **PostgreSQL**. Designed to deploy on **Coolify** as two resources (App + Postgres).

---

## Features

- Modern, dark, mobile-responsive dashboard UI
- Email + password login (OTP and social login slots in UI; stubs ready for an OAuth/OTP provider)
- Separate **Learner** and **Trainer** signup flows
- Admin **approval workflow** — accounts start as `PENDING` and cannot log in until approved
- Three role-based dashboards:
  - **Learner** — view assigned environment cards and click through to the container URL
  - **Trainer** — view assigned environments + one-click "Refresh all" per environment
  - **Admin** — full CRUD over users, environments, and containers + refresh logs
- Refresh orchestration: stop → remove → recreate → update URL → log
- Pluggable Docker driver (`mock` by default, `dockerode` integration path documented)
- Audit and refresh logs persisted in Postgres

---

## Local development

```bash
cp .env.example .env
# Edit .env: at minimum set DATABASE_URL, JWT_SECRET, SEED_TOKEN

npm install
npx prisma migrate dev --name init
npx prisma db seed     # creates admin@tertiary.local / ChangeMe123! + sample environments
npm run dev
```

Open <http://localhost:3000> and sign in.

### With Docker Compose

```bash
JWT_SECRET=$(openssl rand -hex 32) docker compose up --build
```

Then bootstrap the first admin:

```bash
curl -X POST http://localhost:3000/api/admin/seed \
  -H "x-seed-token: change-me-seed" \
  -H "content-type: application/json" \
  -d '{"email":"admin@tertiary.local","password":"ChangeMe123!","name":"Administrator"}'
```

---

## Coolify deployment (Host 1)

The system runs as **two Coolify resources**:

### 1. Database resource — PostgreSQL

1. In Coolify, **+ New Resource → Database → PostgreSQL** on **Host 1**.
2. Set a strong password. Note the connection string Coolify generates, e.g.
   `postgresql://postgres:<password>@<service-host>:5432/postgres`.
3. Save and start.

### 2. App resource — Next.js (Dockerfile)

1. **+ New Resource → Application** on **Host 1**.
2. Source: this Git repository.
3. Build pack: **Dockerfile** (uses the `Dockerfile` at repo root).
4. Port: `3000`.
5. Environment variables:
   ```
   DATABASE_URL=postgresql://postgres:<password>@<db-service-host>:5432/postgres
   JWT_SECRET=<long-random-hex>
   SEED_TOKEN=<long-random-hex>
   DOCKER_HOST_MODE=mock
   PUBLIC_BASE_URL=https://<your-coolify-domain>
   NEXT_PUBLIC_APP_NAME=Tertiary Training
   ```
6. Deploy. Prisma migrations run automatically on container start (`prisma migrate deploy`).
7. Bootstrap the first admin once the app is live:
   ```bash
   curl -X POST https://<your-coolify-domain>/api/admin/seed \
     -H "x-seed-token: $SEED_TOKEN" \
     -H "content-type: application/json" \
     -d '{"email":"admin@yourdomain.com","password":"<StrongPassword>","name":"Administrator"}'
   ```

### Real Docker integration (optional)

To make the **Refresh** flow actually control Docker containers on the host:

1. `npm i dockerode @types/dockerode`
2. Uncomment the `DockerodeService` block in [`src/lib/docker.ts`](src/lib/docker.ts).
3. In Coolify, mount the host Docker socket into the App container:
   `Volumes` → `/var/run/docker.sock:/var/run/docker.sock`.
4. Set `DOCKER_HOST_MODE=dockerode`.
5. Re-deploy.

Until then, refresh uses a mock that simulates the lifecycle and regenerates URLs — useful for UX testing without touching the daemon.

---

## Project structure

```
prisma/              Prisma schema + seed
src/app/             App Router pages + API routes
src/components/      UI primitives (Shell, Modal, Toast, tables, …)
src/lib/             prisma client, auth, docker driver, validation, refresh logic
src/middleware.ts    Route guards by role
Dockerfile           Multi-stage build (standalone Next output)
docker-compose.yml   Local stack (Postgres + app)
.env.example         All required env vars
```

## API surface

| Method | Path                                                  | Auth        |
| ------ | ----------------------------------------------------- | ----------- |
| POST   | `/api/auth/login`                                     | public      |
| POST   | `/api/auth/logout`                                    | session     |
| GET    | `/api/auth/me`                                        | session     |
| POST   | `/api/auth/signup/learner`                            | public      |
| POST   | `/api/auth/signup/trainer`                            | public      |
| GET    | `/api/environments`                                   | any role    |
| POST   | `/api/environments`                                   | admin       |
| PUT    | `/api/environments/:id`                               | admin       |
| DELETE | `/api/environments/:id`                               | admin       |
| GET    | `/api/containers`                                     | any role    |
| POST   | `/api/containers`                                     | admin       |
| PUT    | `/api/containers/:id`                                 | admin       |
| DELETE | `/api/containers/:id`                                 | admin       |
| POST   | `/api/containers/:id/refresh`                         | admin/trainer |
| POST   | `/api/containers/refresh-by-environment`              | admin/trainer |
| GET    | `/api/users`                                          | admin       |
| POST   | `/api/users`                                          | admin       |
| PUT    | `/api/users/:id`                                      | admin       |
| DELETE | `/api/users/:id`                                      | admin       |
| POST   | `/api/admin/approve-user`                             | admin       |
| POST   | `/api/admin/reject-user`                              | admin       |
| POST   | `/api/admin/seed`                                     | seed-token  |

---

Powered by [Tertiary Infotech Academy Pte Ltd](https://www.tertiarycourses.com.sg).
