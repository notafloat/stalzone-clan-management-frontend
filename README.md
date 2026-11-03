This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Clan history tracker

The Stalzone API only reports the clan's current state, so a scheduled job records changes in Postgres: joins, departures, rank changes, renames and days with a login. The site works without it, but records no history.

1. Create a database: `createdb -U postgres stalzone_clan`
2. Generate a secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
3. Add both to `.env.local`:
   ```
   DATABASE_URL=postgres://postgres:YOUR_PASSWORD@localhost:5432/stalzone_clan
   CRON_SECRET=the-generated-secret
   ```
4. Create the tables: `npm run db:migrate`
5. With the app running, start the job in a second terminal: `npm run tracker`
6. Open `/clan` or `/members` while signed in. Loading the roster needs a member's token, and this is how members get added.

Pages read members from this database, so they load quickly but can be up to one run behind. If the data is more than an hour old, pages go back to the much slower live API, and saving notes or lineups always checks the player's rank live.

Locally, nothing is recorded while the app or `npm run tracker` is stopped. When hosted, replace `npm run tracker` with a scheduler that sends `POST /api/cron/track` with the header `Authorization: Bearer <CRON_SECRET>` every 15 minutes.

After changing `src/lib/db/schema.ts`, run `npm run db:generate` and then `npm run db:migrate`.

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
