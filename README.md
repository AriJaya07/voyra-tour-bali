# Voyra Tourism — Next.js + Prisma + PostgreSQL

A full-stack travel dashboard built with **Next.js 14 (App Router)**, **Prisma ORM**, and **PostgreSQL**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | NextAuth.js (Credentials) |
| State | TanStack React Query |
| HTTP Client | Axios |
| Styling | Tailwind CSS |
| Storage | Cloudinary |
| Deploy | Vercel |

---

## Prerequisites

Before starting, make sure you have installed:

- **Node.js** v18 or higher
- **npm** v9 or higher
- **PostgreSQL** (local) or a hosted PostgreSQL URL
- **Vercel CLI** — install globally: `npm install -g vercel`

---

## Environment Variables

Create a `.env.local` file in the root of your project with the following:

```env
# Database
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/voyra_tourism"

# NextAuth
NEXTAUTH_SECRET="your-super-secret-key-min-32-chars"
NEXTAUTH_URL="http://localhost:3000"

# Cloudinary
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"
```

Generate a secure `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

---

## Local Development Setup

### 1. Clone & Install

```bash
git clone https://github.com/your-username/voyra-turism.git
cd voyra-turism
npm install
```

### 2. Setup Environment

```bash
# Copy example env file
cp .env.example .env.local

# Fill in your DATABASE_URL and other variables
```

### 3. Run Database Migrations (LOCAL)

```bash
# Create all tables from schema.prisma
npx prisma migrate dev --name init

# If you add a new model, run:
npx prisma migrate dev --name add_your_model_name

# If migration fails or tables are out of sync:
npx prisma db push

# Force reset all tables (⚠️ DELETES ALL DATA):
npx prisma migrate reset --force
```

### 4. Generate Prisma Client

```bash
# Always run after schema changes or fresh install
npx prisma generate
```

### 5. Seed the Database

```bash
# Create the first admin user
npx prisma db seed
```

Default admin credentials after seeding:
- **Email:** `admin@travel.com`
- **Password:** `admin123`

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 7. View Database (Prisma Studio)

```bash
npx prisma studio
```

Opens at [http://localhost:5555](http://localhost:5555) — visual database editor.

---

## Common Migration Commands (LOCAL)

```bash
# Create & apply a new migration
npx prisma migrate dev --name <migration_name>

# Examples:
npx prisma migrate dev --name add_location
npx prisma migrate dev --name add_content
npx prisma migrate dev --name update_destination

# Push schema changes without creating a migration file (dev only)
npx prisma db push

# View migration status
npx prisma migrate status

# Roll back / reset all migrations (⚠️ DELETES ALL DATA)
npx prisma migrate reset --force

# Apply pending migrations without prompts (for CI/CD)
npx prisma migrate deploy

# Regenerate Prisma client after schema changes
npx prisma generate

# Pull real DB schema into schema.prisma (reverse engineer)
npx prisma db pull

# Open visual database editor
npx prisma studio
```

---

## Fix: Stale Prisma Cache (Turbopack)

If you see errors like `The table 'public.X' does not exist` even though Prisma Studio shows the table, run this full cache clear:

```bash
# Stop dev server first, then:
rm -rf .next
rm -rf node_modules/.prisma
rm -rf node_modules/@prisma/client

npm install
npx prisma generate
npm run dev
```

---

## Vercel Deployment Setup

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Login to Vercel

```bash
vercel login
```

### 3. Link Project to Vercel

```bash
vercel link
```

Follow the prompts to connect your local project to your Vercel project.

### 4. Pull Environment Variables from Vercel

```bash
# Pull for local development
vercel env pull .env.development.local

# Pull for production
vercel env pull .env.local
```

### 5. Add Environment Variables to Vercel

Go to **Vercel Dashboard → Your Project → Settings → Environment Variables** and add:

| Key | Value | Environment |
|---|---|---|
| `DATABASE_URL` | your production PostgreSQL URL | Production, Preview |
| `NEXTAUTH_SECRET` | your secret key | Production, Preview |
| `NEXTAUTH_URL` | `https://your-domain.vercel.app` | Production |
| `CLOUDINARY_CLOUD_NAME` | your cloud name | Production, Preview |
| `CLOUDINARY_API_KEY` | your api key | Production, Preview |
| `CLOUDINARY_API_SECRET` | your api secret | Production, Preview |

Or add via CLI:
```bash
vercel env add DATABASE_URL
vercel env add NEXTAUTH_SECRET
vercel env add NEXTAUTH_URL
vercel env add CLOUDINARY_CLOUD_NAME
vercel env add CLOUDINARY_API_KEY
vercel env add CLOUDINARY_API_SECRET
```

### 6. Run Migrations Against Production Database

```bash
# Apply all pending migrations to production DB
npx prisma migrate deploy
```

> ⚠️ Always use `migrate deploy` (not `migrate dev`) in production. It applies existing migration files without creating new ones.

### 7. Seed Production Database

```bash
# Run seed on production (only once on first deploy)
npx prisma db seed
```

---

## Deploying to Vercel

### Deploy to Preview (staging)

```bash
vercel deploy
```

This creates a preview URL like `https://voyra-turism-git-main-xxx.vercel.app`.

### Deploy to Production

```bash
vercel --prod
```

This deploys to your main production URL.

### Auto Deploy via Git

Push to your main branch and Vercel will auto-deploy:

```bash
git add .
git commit -m "your commit message"
git push origin main
```

---

## Production Migration Workflow

Every time you change `schema.prisma` in production:

```bash
# Step 1: Create migration locally first
npx prisma migrate dev --name your_change_name

# Step 2: Commit the migration files
git add prisma/migrations/
git commit -m "add migration: your_change_name"
git push origin main

# Step 3: Apply to production DB
npx prisma migrate deploy

# Step 4: Regenerate client
npx prisma generate

# Step 5: Deploy to Vercel
vercel --prod
```

> ✅ Tip: Add `npx prisma migrate deploy` to your Vercel build command in `package.json`:

```json
{
  "scripts": {
    "build": "prisma migrate deploy && prisma generate && next build",
    "dev": "next dev",
    "start": "next start"
  }
}
```

This way every Vercel deployment automatically runs migrations.

---

## Complete Quick Reference

| Task | Command |
|---|---|
| Install dependencies | `npm install` |
| Start dev server | `npm run dev` |
| Build for production | `npm run build` |
| Start production server | `npm start` |
| New migration (local) | `npx prisma migrate dev --name <name>` |
| Apply migrations (prod) | `npx prisma migrate deploy` |
| Push schema (no migration) | `npx prisma db push` |
| Reset all tables ⚠️ | `npx prisma migrate reset --force` |
| Regenerate client | `npx prisma generate` |
| Seed database | `npx prisma db seed` |
| View database | `npx prisma studio` |
| Check migration status | `npx prisma migrate status` |
| Link Vercel project | `vercel link` |
| Pull env vars from Vercel | `vercel env pull .env.local` |
| Deploy to preview | `vercel deploy` |
| Deploy to production | `vercel --prod` |
| Clear Turbopack cache | `rm -rf .next node_modules/.prisma node_modules/@prisma/client && npm install && npx prisma generate` |

---

## Project Structure

```
voyra-turism/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/    # NextAuth handler
│   │   ├── categories/            # Categories API
│   │   ├── contents/              # Contents API
│   │   ├── dashboard/stats/       # Dashboard stats API
│   │   ├── destinations/          # Destinations API
│   │   ├── images/                # Images API
│   │   ├── locations/             # Locations API
│   │   └── packages/              # Packages API
│   ├── dashboard/
│   │   ├── page.tsx               # Overview
│   │   ├── categories/page.tsx
│   │   ├── contents/page.tsx
│   │   ├── destinations/page.tsx
│   │   ├── images/page.tsx
│   │   ├── locations/page.tsx
│   │   └── packages/page.tsx
│   ├── login/page.tsx
│   └── layout.tsx
├── components/
│   └── Dashboard/
│       ├── Sidebar.tsx
│       ├── CategoryForm.tsx / CategoryTable.tsx
│       ├── ContentForm.tsx / ContentTable.tsx
│       ├── DestinationForm.tsx / DestinationTable.tsx
│       ├── LocationForm.tsx / LocationTable.tsx
│       └── PackageForm.tsx / PackageTable.tsx
├── lib/
│   ├── auth.ts                    # NextAuth config
│   ├── axios.ts                   # Axios instance
│   ├── cloudinary.ts              # Cloudinary config
│   └── prisma.ts                  # Prisma client singleton
├── prisma/
│   ├── schema.prisma              # Database schema
│   ├── seed.ts                    # Seed script
│   └── migrations/                # Migration history
├── utils/
│   ├── hooks/                     # React Query hooks
│   └── service/                   # Axios service functions
├── types/
│   └── next-auth.d.ts             # NextAuth type extensions
├── middleware.ts                  # Route protection
└── .env.local                     # Environment variables (git ignored)
```

---

## Database Schema Overview

```
Category  ──→  Destination  ──→  Location
                    │
                    ├──→  Content
                    ├──→  Image
                    └──→  Package ──→ Image
```

| Model | Description |
|---|---|
| `User` | Admin accounts for dashboard login |
| `Category` | Groups destinations and packages |
| `Destination` | Travel destinations with price |
| `Package` | Tour packages linked to destination |
| `Location` | Sub-locations within a destination |
| `Content` | Rich content articles for destinations |
| `Image` | Images linked to destinations or packages |

---

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NextAuth.js Documentation](https://next-auth.js.org)
- [TanStack Query Documentation](https://tanstack.com/query)
- [Vercel Deployment Guide](https://nextjs.org/docs/app/building-your-application/deploying)
- [Cloudinary Documentation](https://cloudinary.com/documentation)