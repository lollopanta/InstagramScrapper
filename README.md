# DataReach — Lead Generation & Email Outreach

<p align="center">
  <svg width="500" height="150" viewBox="0 0 400 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="DataReach">
    <defs>
      <linearGradient id="primaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#A78BFA; stop-opacity:1" />
        <stop offset="100%" style="stop-color:#7C3AED; stop-opacity:1" />
      </linearGradient>
    </defs>
    <g transform="translate(10, 0)">
      <path d="M30,20 H55 C78,20 95,38 95,60 C95,82 78,100 55,100 H30 V20Z" fill="url(#primaryGrad)" />
      <circle cx="45" cy="60" r="10" fill="#ffffff" />
      <g fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round">
        <path d="M68,45 C72,50 72,70 68,75" opacity="0.6" />
        <path d="M78,35 C85,45 85,75 78,85" opacity="0.9" />
      </g>
      <circle cx="45" cy="60" r="4" fill="#5B21B6" />
    </g>
    <g transform="translate(130, 72)" style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <text x="0" y="0" font-size="36" font-weight="700" fill="#1F2937">Data</text>
      <text x="84" y="0" font-size="36" font-weight="400" fill="#4B5563">Reach</text>
    </g>
  </svg>
</p>

<p align="center">
  <strong>Find public leads. Score them. Reach out safely.</strong>
</p>

<p align="center">
  <a href="https://github.com/lollopanta/InstagramScrapper/actions"><img src="https://img.shields.io/github/actions/workflow/status/lollopanta/InstagramScrapper/ci.yml?branch=main&style=for-the-badge" alt="CI status"></a>
  <a href="https://github.com/lollopanta/InstagramScrapper/releases"><img src="https://img.shields.io/github/v/release/lollopanta/InstagramScrapper?include_prereleases&style=for-the-badge" alt="GitHub release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-BSD--3--Clause-blue.svg?style=for-the-badge" alt="BSD-3-Clause License"></a>
  <a href="docker-compose.yml"><img src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white&style=for-the-badge" alt="Docker Compose"></a>
</p>

**DataReach** is an open-source SaaS-style platform for public Instagram lead discovery, lead processing, and queue-based email outreach.
It includes a Fastify API, BullMQ workers, PostgreSQL, Redis, a React/shadcn dashboard, and Mailcatcher for safe local email testing.

It is built for teams that want a complete local development environment before wiring in real SMTP accounts.

[Docker](#docker-quick-start) · [Architecture](#architecture) · [API](#api--swagger) · [Email Testing](#email-testing) · [Security](#security-notes) · [Development](#from-source-development)

New install? Start here: [Docker quick start](#docker-quick-start).

## Highlights

- **Instagram scraper jobs** — enqueue username, hashtag, and location scraping through BullMQ.
- **Lead management** — normalize, deduplicate, tag, filter, and score leads in PostgreSQL.
- **Campaign builder** — create personalized outreach templates with `{{name}}`, `{{username}}`, and `{{email}}`.
- **Queue-based sending** — send email through Nodemailer workers with randomized delays and campaign limits.
- **Email-safe development** — Mailcatcher captures all development email at `http://localhost:1080`.
- **Operational dashboard** — React + TailwindCSS + shadcn-style components for leads, scraper jobs, campaigns, and stats.
- **Production-shaped Docker** — API, workers, frontend, Postgres, Redis, and Mailcatcher run from one Compose file.

## Stack

| Layer | Technology |
| --- | --- |
| API | Node.js, TypeScript, Fastify |
| ORM / DB | Prisma, PostgreSQL |
| Queue | Redis, BullMQ |
| Workers | Scraper worker, email worker |
| Scraping | Playwright with rotating user agents and rate limits |
| Email | Nodemailer, Gmail, Outlook, custom SMTP, Mailcatcher |
| Frontend | React, Vite, TailwindCSS, shadcn-style components |
| Containers | Docker, Docker Compose, Node LTS Alpine, nginx Alpine |
| License | BSD-3-Clause |

## Docker Quick Start

Runtime: Docker Desktop or Docker Engine with Compose.

```bash
cp .env.example .env
docker compose up --build
```

Open:

- Frontend: `http://localhost:5173`
- API health: `http://localhost:4000/health`
- Swagger: `http://localhost:4000/docs`
- Mailcatcher: `http://localhost:1080`

Mailcatcher SMTP is available inside Docker at:

```text
mailcatcher:1025
```

If you changed database credentials after a first run, recreate the local database volume:

```bash
docker compose down -v
docker compose up --build
```

## Services

```text
frontend         React app served by nginx
api              Fastify REST API
scraper-worker   BullMQ Instagram scraping worker
email-worker     BullMQ Nodemailer sending worker
postgres         PostgreSQL database
redis            Queue backend
mailcatcher      SMTP capture server and web UI
```

API and worker containers use `restart: on-failure:5`. The Docker start commands are wrapped with `nodemon --exitcrash` so process crashes are surfaced cleanly to Docker and retried up to five times.

## Email Testing

Development email is configured for Mailcatcher by default:

```env
SMTP_HOST=mailcatcher
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_FROM="DataReach Dev <dev@datareach.local>"
```

All outbound development emails are captured instead of being delivered to real recipients.

Standalone Mailcatcher:

```bash
docker run -p 1080:1080 -p 1025:1025 stpaquet/alpinemailcatcher
```

Open the inbox at `http://localhost:1080`.

## API & Swagger

Swagger UI is available at:

```text
http://localhost:4000/docs
```

Core flow:

1. `POST /api/auth/register`
2. Authorize with the returned Bearer token.
3. `POST /api/scraper/jobs` to enqueue Instagram collection.
4. `GET /api/leads` to review and filter normalized leads.
5. `POST /api/campaigns` to create a campaign.
6. `POST /api/campaigns/:id/start` to queue email sends.
7. Inspect captured email in Mailcatcher.

## Architecture

```text
apps/
  api/
    prisma/                Prisma schema
    src/
      config/              environment validation
      modules/             Fastify route modules
      plugins/             Prisma, queues, authentication
      queues/              BullMQ payload types
      services/            scraper, email, lead normalization
      workers/             scraper and email worker entrypoints
  frontend/
    src/
      components/          app shell and shadcn-style UI
      lib/                 API client and auth persistence
      pages/               dashboard, leads, scraper, campaigns
```

## From Source Development

Runtime: Node LTS with pnpm.

```bash
pnpm install
cp .env.example .env
pnpm prisma:migrate
```

Run the API:

```bash
pnpm dev:api
```

Run the workers:

```bash
pnpm dev:scraper
pnpm dev:email
```

Run the frontend:

```bash
pnpm dev:frontend
```

Build everything:

```bash
pnpm build
```

## Configuration

Important environment variables:

```env
DATABASE_URL=postgresql://datareach:datareach@postgres:5432/datareach?schema=public
REDIS_URL=redis://redis:6379
JWT_SECRET=change-me-in-production-with-at-least-24-chars
VITE_API_URL=http://localhost:4000
SMTP_HOST=mailcatcher
SMTP_PORT=1025
```

Postgres container credentials are also read from `.env`:

```env
POSTGRES_USER=datareach
POSTGRES_PASSWORD=datareach
POSTGRES_DB=datareach
POSTGRES_PORT=5432
```

## Security Notes

DataReach handles outreach automation and public data collection. Treat it as an operator-controlled tool, not an open public scraping gateway.

- Keep `JWT_SECRET` private and change it before deployment.
- Keep real SMTP credentials out of source control.
- Use Mailcatcher in development to prevent accidental real sends.
- Respect platform terms, privacy law, rate limits, and consent requirements.
- Keep scraper concurrency conservative.
- Do not expose the API publicly without authentication, TLS, monitoring, and abuse controls.

## License

DataReach is released under the [BSD-3-Clause License](LICENSE).

## Community

Issues and pull requests are welcome.
Please include reproduction steps, logs, and the command you used when reporting Docker or worker failures.
