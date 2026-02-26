This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


# Vercel Deployment with Prisma Postgres and Next.js

This guide will walk you through setting up a Next.js CRUD app with Prisma and PostgreSQL, linking it to **Vercel**, and deploying it to both **preview** and **production** environments.

---

## Steps:

### 1. Set up a Next.js Project with Prisma and PostgreSQL

First, create a new Next.js project using the Prisma PostgreSQL template. This will set up a basic Next.js project with Prisma connected to PostgreSQL.

Run the following commands:

```bash
npx create-next-app@latest --template prisma-postgres my-prisma-postgres-app
cd my-prisma-postgres-app
npm install
```

### 2. Connect Vercel Project

Now, connect your local project to a Vercel project. This allows Vercel to manage your deployments and environment variables.

Run this command to link the project:

```bash
vercel link
```

### 3. Pull the Database URL from Vercel

Next, you need to pull the DATABASE_URL environment variable from Vercel to configure the database connection for your Prisma instance.

Run the following command to pull the environment variables:

```bash
vercel env pull .env.development.local
```

### 4. Run Migrations and Seed the Database

Now that the database connection is set up, you need to create the database schema and seed it with some initial data.

  #### 1. Run the migration command to set up the database schema:

  ```bash
  npx prisma migrate dev --name init
  ```

  This command generates a migration file and applies it to your PostgreSQL database on Vercel.

  #### 2. Seed the database with sample data so the UI won’t be empty when you run the app:

  ```bash
  npx prisma db seed
  ```

  This will populate your database with the initial data, such as sample records for testing.

### 5. Deploy the App to Vercel

Once everything is set up, you can deploy the app to Vercel.

  #### Deploy to Preview

  To deploy your app to a preview environment (which Vercel automatically generates for each deployment),
  
  ```bash
  vercel deploy
  ```
  
  #### Deploy to Production
  
  ```bash
  vercel --prod
  ```
  Once you're ready to deploy the app to production, use the --prod flag:
