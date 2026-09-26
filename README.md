This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run  the development server:

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

## Authentication

Set `NEXT_PUBLIC_API_URL` to the backend URL. Browser authentication and block
mutations use the local `/api` routes, which forward the session cookie to the
backend. Field reads remain public.

Before running the updated backend, apply its migrations and regenerate the client
from `../million-pixels-api`:

```bash
npm run prisma:migrate:deploy
npm run prisma:generate
```

Registration signs the user in immediately. Sessions last seven days and use an
HttpOnly, SameSite=Lax cookie (Secure when the API runs in production, requiring
HTTPS). Signing out revokes the session in the database. Only signed-in users can
create blocks; their owners and administrators can edit or delete them. Existing
blocks without an owner remain visible and can be managed by administrators.

New accounts have the `USER` role. To promote an existing account, run these
commands in `../million-pixels-api` against the intended database:

```bash
npm run prisma:migrate:deploy
npm run build
npm run admin:promote -- user@example.com
```

Replace the email with the registered account's exact email and refresh the
website. Administrators can select an empty area to add a block, or select any
existing block to edit or delete it. In the block form, enter a registered user's
email to assign ownership. Leave it empty to keep an existing owner or assign a
new block to yourself. Public registration cannot assign administrator roles.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
