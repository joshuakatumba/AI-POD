# Next.js App (TypeScript + pnpm + Docker)

This is a **Next.js (App Router)** project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app) and configured with **pnpm**, **strict TypeScript**, **code quality tooling**, and **Docker with hot reload**.

The goal of this setup is to provide a **production-ready developer experience** with strong quality control from day one.

---

## Tech Stack

* **Next.js** (App Router)
* **TypeScript** (strict mode)
* **pnpm** (fast, deterministic package management)
* **ESLint + Prettier** (code quality & formatting)
* **Husky + lint-staged** (pre-commit checks)
* **Docker & Docker Compose** (containerized dev with hot reload)
* **Tailwind CSS** (UI styling)

---

## Prerequisites

Make sure you have the following installed:

* **Node.js 20+**
* **pnpm** (via Corepack)
* **Docker & Docker Compose**

Enable pnpm using Corepack:

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

---

## Local Development (pnpm)

Install dependencies:

```bash
pnpm install
```

Start the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

The app will auto-reload as you edit files.

You can start editing the page at:

```ts
app/page.tsx
```

---

## Development with Docker (Recommended)

This project supports **hot reload inside Docker**, making it ideal for consistent team setups.

### Build and run the app

```bash
docker compose up --build
```

Open:

```
http://localhost:3000
```

Any file changes on your local machine will automatically reload the app in the container.

---

## Useful Scripts

```bash
pnpm dev        # Start dev server
pnpm build      # Production build
pnpm start      # Start production server
pnpm lint       # Run ESLint
pnpm typecheck  # Run TypeScript checks
pnpm format     # Check formatting
pnpm format:fix # Auto-fix formatting
```

---

## Code Quality & Enforcement

This project enforces quality via:

* **Strict TypeScript** (early error detection)
* **ESLint** (Next.js core web vitals + custom rules)
* **Prettier** (consistent formatting)
* **Pre-commit hooks** (lint + format before commit)

Bad code should never reach `main`.

---

## Fonts

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load **Geist**, a font family from Vercel.

---

## Learn More

* [Next.js Documentation](https://nextjs.org/docs)
* [Learn Next.js](https://nextjs.org/learn)
* [Next.js GitHub Repository](https://github.com/vercel/next.js)

---

## Deployment

The easiest way to deploy this app is via **Vercel**:

* [https://vercel.com/new](https://vercel.com/new)

For other platforms or Docker-based deployments, a production-ready multi-stage Docker build can be added.

---

## Notes

* This repository is designed to scale from **solo development to full teams**.
* CI/CD, monitoring (Sentry), and production Docker builds can be added as needed.
