## Roamly Backend / Storage

This directory contains the backend and storage configuration for Roamly.

The goal is to run against a **managed PostgreSQL (with PostGIS)** instance in the cloud, while still supporting local development with Docker.

### 1. Cloud PostgreSQL (recommended)

- Provision a managed PostgreSQL 14+ instance with **PostGIS** enabled (e.g. Supabase, Neon, RDS, Cloud SQL).
- Create two databases:
  - `roamly_dev`
  - `roamly_prod`
- Set a single connection URL per environment:
  - `DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/roamly_dev`
  - `DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/roamly_prod`
- Configure this variable in your backend runtime (CI/CD or hosting provider secrets).

The Prisma datasource in `prisma/schema.prisma` will read from `DATABASE_URL`.

### 2. Local development database (Docker)

For local work you can run Postgres (with PostGIS) via Docker:

```bash
cd backend
docker compose up -d
```

This uses `docker-compose.yml` in this directory and exposes Postgres on `localhost:5432` with:

- user: `roamly`
- password: `roamly`
- database: `roamly_dev`

Example local env var:

```bash
DATABASE_URL=postgres://roamly:roamly@localhost:5432/roamly_dev
```

### 3. Environment variables

Create a `.env` file in `backend/` based on `.env.example`:

```bash
cp backend/.env.example backend/.env
```

At minimum it should define:

```bash
DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/roamly_dev
NODE_ENV=development
PORT=4000
```

### 4. Next steps

The rest of the plan is implemented via:

- `prisma/schema.prisma` — relational schema for users, creators, videos, locations, itineraries, collections, and passport entries.
- `src/` — backend API service (Express) that connects the React frontend to this database.

