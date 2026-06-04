# Benchmark Catalog Back — Developer & DevOps Guide

## Quick Start


```bash
# Install dependencies
npm install

# Start local PostgreSQL
docker compose --env-file local/.env -f local/docker-compose.yml up -d

# Create/apply a local migration
npx prisma migrate dev --name migration_name

# Generate Prisma Client
npx prisma generate

# Run app in watch mode
npm run start:dev

# Build app
npm run build

# Open Prisma Studio
npx prisma studio

# Apply migrations in deployment pipeline
npx prisma migrate deploy
```

## 1. Project status

Current backend stack:

- NestJS 11
- PostgreSQL
- Prisma 7 with PostgreSQL driver adapter
- JWT access-token authentication
- Users module with repository layer
- Local PostgreSQL via Docker Compose

Current API prefix:

```text
/api
```

Swagger is mounted at:

```text
/api
```

Current startup flow:

1. NestJS starts.
2. Prisma connects to PostgreSQL.
3. `AdminSeeder` checks whether the development superuser exists.
4. If the superuser is missing and `NODE_ENV=dev`, the user is created from environment variables.

---

## 2. Current architecture

### 2.1 Modules

```text
src/
  auth/
  users/
  prisma/
  configs/
  common/
```

### 2.2 Data access pattern

The Users module uses:

```text
Controller → Service → Repository → PrismaService → PostgreSQL
```

This structure is intentional:

- Controllers handle HTTP.
- Services contain business logic.
- Repositories contain database queries.
- PrismaService owns the Prisma Client connection.

### 2.3 Repository abstraction

The project uses an abstract repository class:

```ts
export abstract class IUsersRepository {}
```

It is registered as a Nest provider and implemented by `UsersRepository`.

This keeps the service layer independent from Prisma-specific query code.

---

## 3. Requirements

Recommended local environment:

- Node.js 22 LTS or 24 LTS
- npm
- Docker
- Docker Compose

The project has already been tested locally with PostgreSQL running in Docker.

---

## 4. Environment variables

### 4.1 Root `.env`

Create a root `.env` file in the project root.

Recommended local example:

```env
DB_NAME=benchmark_catalog
DB_USER=admin
DB_PWD=12345
DB_HOST=localhost
DB_PORT=5432

DB_URL="postgresql://admin:12345@localhost:5432/benchmark_catalog?schema=public"

NODE_ENV=dev

JWT_ACCESS_SECRET=replace_me_with_a_long_random_secret
JWT_ACCESS_EXPIRE=7d

ADMIN_LOGIN=admin
ADMIN_PASSWORD=Admin12345!
```

### 4.2 Variables currently not needed

These values are not required in the current access-token-only implementation:

```env
JWT_REFRESH_SECRET=
JWT_REFRESH_EXPIRE=
ADMIN_EMAIL=
```

They may be added back later when refresh-token support is implemented or if the user model is extended.

---

## 5. Local PostgreSQL

The local Docker Compose file is located at:

```text
local/docker-compose.yml
```

### 5.1 Start database

```bash
docker compose --env-file local/.env -f local/docker-compose.yml up -d
```

### 5.2 Stop database

```bash
docker compose --env-file local/.env -f local/docker-compose.yml down
```

### 5.3 View logs

```bash
docker compose --env-file local/.env -f local/docker-compose.yml logs -f db
```

### 5.4 Current local database settings

```text
Database: benchmark_catalog
User: admin
Port: 5432
Host from local NestJS process: localhost
```

---

## 6. Install dependencies

```bash
npm install
```

The project has:

```json
"postinstall": "prisma generate"
```

So Prisma Client generation runs automatically after normal dependency installation.

---

## 7. Prisma workflow

### 7.1 Schema location

```text
prisma/schema.prisma
```

### 7.2 Prisma config

```text
prisma.config.ts
```

The project uses:

- `prisma-client`
- generated client output in `src/generated/prisma`
- CommonJS module format for compatibility with the current NestJS build setup

### 7.3 Generate Prisma Client manually

Run this after schema changes when needed:

```bash
npx prisma generate
```

### 7.4 Create and apply a development migration

Use this only for local development:

```bash
npx prisma migrate dev --name migration_name
```

Example:

```bash
npx prisma migrate dev --name create_users
```

### 7.5 Apply migrations in CI / production-like environments

Use:

```bash
npx prisma migrate deploy
```

This should be part of the deployment pipeline, not a manual developer habit for local feature work.

### 7.6 Open Prisma Studio

```bash
npx prisma studio
```

---

## 8. Recommended npm scripts

Current scripts are valid, but the following additions are recommended for developer and CI convenience:

```json
{
  "scripts": {
    "build": "nest build",
    "prebuild": "prisma generate",
    "postinstall": "prisma generate",

    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:debug": "nest start --debug --watch",
    "start:prod": "node dist/main",

    "db:up": "docker compose --env-file local/.env -f local/docker-compose.yml up -d",
    "db:down": "docker compose --env-file local/.env -f local/docker-compose.yml down",
    "db:logs": "docker compose --env-file local/.env -f local/docker-compose.yml logs -f db",

    "prisma:generate": "prisma generate",
    "prisma:migrate:dev": "prisma migrate dev",
    "prisma:migrate:deploy": "prisma migrate deploy",
    "prisma:studio": "prisma studio",

    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\"",
    "lint:fix": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",

    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  }
}
```

### Why `prebuild` is useful

`prebuild` makes sure the generated Prisma Client exists before a production build or CI build.

---

## 9. Run the project locally

### 9.1 Typical first launch

```bash
npm install
docker compose --env-file local/.env -f local/docker-compose.yml up -d
npx prisma migrate dev
npm run start:dev
```

### 9.2 Expected successful startup logs

A healthy startup currently looks similar to:

```text
Prisma connected to PostgreSQL
UsersModule dependencies initialized
AuthModule dependencies initialized
Nest application successfully started
```

On the first development start, the app may also create the superuser:

```text
Seeded SuperUser: admin
```

On later starts:

```text
SuperUser "admin" already exists, seed skipped
```

---

## 10. Authentication

### 10.1 Current auth mode

Current MVP implementation uses:

```text
JWT Access Token only
```

Refresh token support is intentionally not active yet.

### 10.2 Login

```http
POST /api/auth/login
```

Body:

```json
{
  "username": "admin",
  "password": "Admin12345!"
}
```

Response:

```json
{
  "access_token": "..."
}
```

### 10.3 Register

```http
POST /api/auth/register
```

Current accepted body:

```json
{
  "username": "user_1",
  "password": "Str0ngP@ssw0rd!"
}
```

Response:

```json
{
  "access_token": "..."
}
```

### 10.4 Using access token

Protected endpoints require:

```http
Authorization: Bearer <access_token>
```

---

## 11. Users API

### 11.1 Create user

```http
POST /api/users
```

Body:

```json
{
  "username": "example_user",
  "password": "Str0ngP@ssw0rd!"
}
```

### 11.2 Get users list

```http
GET /api/users?page=1&limit=10
```

Search example:

```http
GET /api/users?page=1&limit=10&search=admin
```

Sort example:

```http
GET /api/users?page=1&limit=10&sortColumn=createdAt&sortDirection=DESC
```

Supported sort columns in the current repository:

```text
createdAt
username
role
```

### 11.3 Get user by ID

```http
GET /api/users/:id
```

### 11.4 Update user

```http
PATCH /api/users/:id
```

Body:

```json
{
  "username": "renamed_user"
}
```

or:

```json
{
  "password": "NewStr0ngP@ssw0rd!"
}
```

### 11.5 Delete user

```http
DELETE /api/users/:id
```

---

## 12. Postman testing

A ready Postman collection and environment were prepared separately.

Recommended execution order:

1. Login seeded admin
2. Create test user
3. Get users with search and pagination
4. Get user by id
5. Patch user
6. Delete user
7. Verify deleted user returns 404
8. Run negative auth checks

Before running, set the Postman environment variable:

```text
admin_password
```

to the value of your local `ADMIN_PASSWORD`.

---

## 14. Git hygiene

Recommended `.gitignore` entries:

```gitignore
node_modules/
dist/
.env
*.tsbuildinfo
/src/generated/prisma/
.DS_Store
```

Keep tracked:

```text
prisma/schema.prisma
prisma/migrations/
prisma.config.ts
```

---

