# Society Management System

## Architecture

Unified **Next.js 14** application with API routes (no separate Express backend). Deployed to **Vercel** with **Supabase** PostgreSQL.

```
app/
  api/            ← Server-side API routes (converted from Express routers)
  (auth)/         ← Login, register, password reset pages
  (admin)/        ← Admin dashboard pages
  (dashboard)/    ← Homeowner dashboard pages
lib/
  api.ts          ← Frontend API client (fetch-based, token injection)
  utils.ts        ← Shared frontend utilities
  server/         ← Server-only code (never imported from client components)
    prisma.ts     ← Prisma client singleton
    auth.ts       ← JWT authentication helpers (authenticateRequest, requireAdmin, etc.)
    errors.ts     ← Error handling (createError, apiErrorResponse)
    types.ts      ← Backend shared types (JwtPayload, ApiResponse, etc.)
    services/     ← Business logic (7 service files, unchanged from original agents)
prisma/
  schema.prisma   ← Database schema (Supabase-compatible with pooler + direct URLs)
  seed.ts         ← Demo data seeder
```

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase PostgreSQL via Prisma ORM
- **Payment**: Razorpay
- **Notifications**: Twilio (SMS) + SendGrid (email)
- **Deployment**: Vercel
- **Styling**: Tailwind CSS

## Commands

```bash
npm run dev              # Start Next.js dev server (localhost:3000)
npm run build            # Prisma generate + Next.js build
npm run start            # Production server
npm run lint             # ESLint
npm run type-check       # TypeScript check
npm run db:migrate       # Run Prisma migrations (dev)
npm run db:migrate:deploy # Deploy migrations (production)
npm run db:studio        # Open Prisma Studio
npm run db:seed          # Seed demo data
```

## Agent Architecture (Services)

| Service | Responsibility |
|---------|---------------|
| `authService` | JWT sessions, OTP, account locking (5 failed logins = 30min lock) |
| `adminService` | Expense categories, posting expenses, flat management |
| `expenseService` | Splits expenses across flats, generates flat bills, tracks payments |
| `paymentService` | Razorpay order creation, webhook handling, receipt generation |
| `notificationService` | Email (SendGrid), SMS (Twilio) alerts for bills/payments/announcements |
| `reportService` | Monthly/yearly summaries, CSV/PDF exports |
| `reconciliationService` | Matches gateway transactions to bill records, flags mismatches |

## Key Conventions

- All DB access through Prisma — no raw SQL
- Server-only code lives under `lib/server/` — never import from client components
- API routes follow pattern: `authenticateRequest` → role check → validate → service call → `NextResponse.json`
- Errors handled via `apiErrorResponse()` which catches AppError, ZodError, and Prisma errors
- Environment variables for all secrets (see Vercel dashboard)

## Environment Variables

`DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `SENDGRID_FROM_NAME`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `SOCIETY_NAME`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`
