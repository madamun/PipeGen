# PipeGen

Web app for creating and editing CI/CD pipeline config (YAML) for **GitHub Actions** and **GitLab CI**. Connect your GitHub or GitLab account, pick a repo and branch, then edit workflow files with a form-based UI or raw editor.

## Tech

- **Next.js 15** (App Router)
- **Better Auth** (GitHub/GitLab OAuth)
- **Prisma** (PostgreSQL) for users, repos, pipeline drafts
- **Tailwind + Radix UI** for the interface

## Getting Started

### 1. Install dependencies

```bash
pnpm install
# or npm install
```

### 2. Environment variables

Create a `.env` file in the project root:

- `DATABASE_URL` – PostgreSQL connection string (required for auth and drafts)
- `BETTER_AUTH_*` – Better Auth config (e.g. secret, GitHub/Gitlab client ID and secret)

See [Better Auth docs](https://www.better-auth.com/docs) for the exact env vars your setup needs.

### 3. Database

```bash
pnpm prisma generate
pnpm prisma migrate dev
# optional: pnpm prisma db seed
```

### 4. Run the app

```bash
pnpm dev
# or npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `pnpm dev` – development server
- `pnpm build` – production build
- `pnpm start` – run production server
- `pnpm lint` – run ESLint

## Project structure (high level)

- `src/app/` – Next.js App Router pages and API routes
- `src/components/` – UI (layout, workspace, repo picker, auth)
- `src/lib/` – pipeline YAML engine, API client, utils
- `src/server/` – auth, DB (Prisma), GitHub/GitLab helpers, pipeline analyzer
- `src/types/` – shared TypeScript types
- `prisma/` – schema and migrations
