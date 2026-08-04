# Deployment

1. Set production secrets: `AUTH_SECRET` (32+), Stripe keys, `DATABASE_URL`, `NEXT_PUBLIC_APP_URL`, legal emails.
2. Prefer Postgres over SQLite for multi-instance.
3. `npm run build && npm start` or `docker compose up --build` with `AUTH_SECRET` exported.
4. Run migrations / `prisma db push` only with a backup plan.
5. Configure Resend (or SMTP) for password reset / verification.
6. Verify `/privacy`, `/terms`, `/support` on HTTPS.
7. Disable mock payments (`ALLOW_MOCK_PAYMENTS` unset).
8. **Do not deploy publicly or submit to stores without owner approval.**

Environments: local · staging · production must use separate DB, storage, Stripe, and auth secrets.
