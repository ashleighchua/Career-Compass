# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Deploy to Vercel

1. Push the project to GitHub, then import the repository in Vercel.
2. Keep the detected build command: `npm run build`. Nitro writes the Vercel-ready output automatically.
3. Add these environment variables in Vercel for Preview and Production:

   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `LOVABLE_API_KEY` (only if live AI analysis is enabled)

Use `.env.example` as the local reference. Keep `SUPABASE_SERVICE_ROLE_KEY` and
`LOVABLE_API_KEY` server-only: never give them a `VITE_` prefix or commit them.

After the first deployment, add its URL to Supabase Auth's allowed redirect URLs.

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS
