# ControlladorIA UI

Customer-facing web application for the ControlladorIA platform. Document management, financial reports, team/org management, and billing.

## Tech Stack

- **Next.js 16.1** + **React 19** + **TypeScript**
- **Tailwind CSS 4** + **Radix UI**
- **Axios** with JWT auth + auto-refresh
- **Recharts** for data visualization
- **Stripe.js** for payment integration

## Quick Start

```bash
npm install
cp .env.local.example .env.local
npm run dev                        # http://localhost:3000
```

## Environment Variables

| Variable | Default |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` |

## Key Pages

| Route | Purpose |
|-------|---------|
| `/` | Dashboard |
| `/documents` | Document list |
| `/upload` | Upload documents |
| `/validation` | Review AI-extracted data |
| `/dre-balanco` | Financial reports (DRE, balance sheet, cash flow) |
| `/clients` | Suppliers/customers |
| `/account/*` | Profile, security, team, subscription |
| `/admin/*` | Admin dashboard, users, audit logs |

## Deployment

Deployed on **AWS Amplify** with built-in CI/CD from GitHub.
