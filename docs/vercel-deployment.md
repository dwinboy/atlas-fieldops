# Vercel Deployment Guide

Atlas FieldOps is a monorepo. Deploy the Next.js web application as the Vercel project and keep the FastAPI backend on a runtime that supports long-running API services, PostgreSQL, Redis, and Kafka.

## Vercel Project Settings

- Root Directory: `frontend`
- Framework Preset: Next.js
- Install Command: `npm ci`
- Build Command: `npm run build`
- Output Directory: keep the Vercel default for Next.js

## Required Environment Variables

Set these variables in the Vercel project for Production, Preview, and Development:

```bash
NEXT_PUBLIC_API_BASE_URL=https://api.your-domain.com/api/v1
INTERNAL_API_BASE_URL=https://api.your-domain.com/api/v1
```

`NEXT_PUBLIC_API_BASE_URL` is used by browser-side requests. `INTERNAL_API_BASE_URL` is used by server-rendered routes such as public collection pages.

## Backend Requirements

Before the Vercel frontend is considered live for users, the backend must be deployed and reachable over HTTPS. Configure the backend with:

```bash
CORS_ORIGINS=["https://your-vercel-domain.vercel.app","https://your-production-domain.com"]
```

Also configure production values for `DATABASE_URL`, `REDIS_URL`, `KAFKA_BOOTSTRAP_SERVERS`, `JWT_SECRET`, and any provider keys. Do not add secrets to the repository.

## GitHub Integration Flow

1. Push the repository to GitHub.
2. In Vercel, import the GitHub repository.
3. Set the project Root Directory to `frontend`.
4. Add the environment variables above.
5. Deploy.

Every push to the connected production branch will create a new Vercel deployment. Pull requests will create preview deployments.

## Local Validation Before Deploy

Run these from the repository before pushing:

```bash
cd frontend
npm run lint
npm test -- --run
npm run build
```

The backend API should also pass:

```bash
cd backend
.venv312/bin/python -m pytest
```
