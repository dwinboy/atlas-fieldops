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
NEXT_PUBLIC_API_URL=https://backend-production-13c9.up.railway.app
```

`NEXT_PUBLIC_API_URL` is the single frontend API base URL. The frontend app
adds `/api/v1` automatically when the value is a backend root URL.

## Backend Requirements

Before the Vercel frontend is considered live for users, the backend must be deployed and reachable over HTTPS. Configure the backend with:

```bash
BACKEND_CORS_ORIGINS=https://atlas-fieldops.vercel.app,https://atlas-fieldops-l6h6tkdyh-dwinboys-projects.vercel.app,https://atlastfieldops.com
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
