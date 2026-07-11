# Front End — The Matrix Operator Terminal

Wake up, Neo. This is a Next.js chat UI that looks like you're jacked into the Matrix — green-on-black CRT terminal, cascading code rain, and a direct uplink to the FastAPI mental-coach backend.

## Prerequisites

- Node.js 18+ and npm
- The FastAPI backend running (see `../api/README.md`)

## Setup

From the `frontend` directory:

```bash
npm install
```

Copy the env example if you don't already have `.env.local`:

```bash
cp .env.local.example .env.local
```

Default API target:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Run it locally

**1. Start the backend** (from the repo root, in another terminal):

```bash
export OPENAI_API_KEY=sk-your-key-here
uv run uvicorn api.index:app --reload
```

**2. Start the frontend:**

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you should see the boot sequence, then type like Neo and hit Enter / SEND.

## How it talks to the API

The terminal posts to:

```
POST {NEXT_PUBLIC_API_URL}/api/chat
Body: { "message": "your text" }
Expects: streaming text/plain tokens (rendered live as they arrive)
```

Locally, set `NEXT_PUBLIC_API_URL=http://localhost:8000` in `.env.local`.  
On Vercel, leave it unset — the UI calls same-origin `/api/chat` next to the FastAPI function.

## Deploy (Vercel)

From the repo root, `vercel.json` builds this app into `/public` and keeps `/api/*` on FastAPI. Redeploy with:

```bash
vercel --prod
```

## Scripts

| Command        | What it does              |
| -------------- | ------------------------- |
| `npm run dev`  | Local dev server (port 3000) |
| `npm run build`| Static export to `out/`   |
| `npm run lint` | ESLint                    |

## Vibe check

If the oracle says `CONNECTION SEVERED`, make sure the backend is up on port 8000 and CORS is happy (the API already allows `*`).
