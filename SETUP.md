# Local setup

```bash
npm install
cp .env.example .env
npx prisma db push
npm run db:seed        # demo@buildiq.app / demo12345
npm run dev            # http://localhost:3000
```

In a second terminal, run the background job worker (RFQ send, etc.) so jobs process even without the dev-only
inline fallback:

```bash
npm run worker
```

## Tests

```bash
npm test           # tenant isolation, permissions, policy engine, AI extraction
npm run typecheck
npm run launch:check   # typecheck + test + production build
```

Tests use the same `DATABASE_URL` as `.env` — run `npx prisma db push` first if you haven't.

## Using a real AI provider

By default `AI_PROVIDER=mock` — every AI-backed flow runs on a deterministic, offline heuristic (see
`src/lib/ai/heuristicExtractor.ts`), which is what tests and CI use. To use Anthropic instead:

```bash
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
AI_MODEL=claude-sonnet-4-5
```

## Docker

```bash
export AUTH_SECRET="$(openssl rand -hex 32)"
docker compose up --build
```
