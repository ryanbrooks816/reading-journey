# Reading Journey

Reading Journey is a self-hosted reading tracker for organizing a book library, planning what to read next, recording reading sessions and reviews, and exploring reading stats and series paths.

## Features

- Track books, series, reading status, dates, ratings, and reviews.
- Import books from CSV.
- Plan reading paths with a visual flow chart.
- Upload book covers and customize the library name and accent color.
- Review reading history and statistics.

## Storage and privacy

Persistent app data is stored in Cloudflare: library records and preferences use D1, and uploaded cover images use R2. The Worker serves cover images through the app API.

The app is a single-library instance and has no built-in authentication. Anyone who can reach an unprotected deployment can read and change its library data and upload covers. Protect the deployment with Cloudflare Access before exposing it on a public hostname.

Local development runs the Worker code on your machine while D1 and R2 requests go to the configured Cloudflare resources. Changes made in the app while developing are real writes to those resources. Do not point a development configuration at data you do not want to change.

## Requirements

- Node.js and npm
- A Cloudflare account with Workers, D1, and R2 available
- Wrangler authentication (`npx wrangler login`)

## Setup

Install dependencies and authenticate with Cloudflare:

```sh
npm install
npx wrangler login
```

If you have not created the Cloudflare resources yet, create them:

```sh
npx wrangler d1 create reading
npx wrangler r2 bucket create reading-journey-covers
```

Copy the example config to the local config file and set its D1 database ID and R2 bucket name to your resources:

```sh
cp wrangler.example.json wrangler.jsonc
```

The example uses [Wrangler remote bindings](https://developers.cloudflare.com/workers/local-development/) for D1 and R2, so `npm run dev` reads and writes to Cloudflare instead of creating local database or bucket data.

The final D1 schema is in [`schema.sql`](schema.sql). Apply it manually to your remote D1 database before first use. The file defines tables and indexes only, with no seeded or user data. On an existing database, it creates only missing tables/indexes; it does not alter existing columns or rows, so ensure its existing schema already matches this file.

```sh
npx wrangler d1 execute reading --remote --file=./schema.sql
```

## Commands

```sh
npm run dev      # Local app and Worker, with remote D1/R2 bindings
npm run build    # Type-check and build the app
npm run deploy   # Build and deploy the Worker and static assets
```
