# controlladoria-ui

Customer-facing web application for the ControlladorIA platform. Document management, AI extraction review, financial report generation, team/org management, and Stripe billing — all in pt-BR.

- **Framework:** Next.js 16.1 (App Router) + React 19 + TypeScript
- **Deployed on:** AWS Amplify (auto-deploy on push to `main`)
- **API:** `controlladoria-api` at `NEXT_PUBLIC_API_URL`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.1 (App Router) |
| Language | React 19 + TypeScript |
| Styling | Tailwind CSS 4 |
| Components | Radix UI primitives |
| Charts | Recharts 3 |
| HTTP client | Axios with JWT Bearer + auto-refresh on 401 |
| Payments | Stripe.js 8 |
| Validation | Zod 4 |
| Notifications | Sonner (toast) |
| Icons | Lucide React |

---

## Quick Start

```bash
npm install
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL
npm run dev                         # http://localhost:3000
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend API base URL |
| `NEXT_PUBLIC_FREE_DEMO_MODE` | `false` | `true` bypasses all paywall checks client-side |

---

## Pages (App Router)

### Authentication
| Route | Description |
|-------|-------------|
| `/login` | Email + password, MFA challenge |
| `/register` | Account creation with CNPJ lookup |
| `/forgot-password` | Request password reset email |
| `/reset-password` | Confirm reset with token |
| `/verify-email` | Email verification |

### Core Application
| Route | Description |
|-------|-------------|
| `/` | Dashboard — KPIs, recent documents, quick stats |
| `/documents` | Document list with status, value, upload date, bulk delete |
| `/upload` | Upload PDF/Excel/XML/OFX/images (drag-and-drop or file picker) |
| `/validation` | Review AI-extracted rows — edit categories, amounts, dates; bulk approve |
| `/dre-balanco` | Financial reports: DRE, Balanço Patrimonial, Fluxo de Caixa with exports |
| `/clients` | Supplier/customer CRUD |
| `/cadastro` | Manual transaction entry |

### Account Management
| Route | Description |
|-------|-------------|
| `/account/profile` | Name, email, language, theme preferences |
| `/account/organization` | CNPJ, address, logo, bank accounts |
| `/account/security` | Change password, MFA setup/disable, trusted devices |
| `/account/sessions` | Active session list, remote logout, device trust |
| `/account/team` | Team members, roles, invite by email, remove |
| `/account/subscription` | Current plan, trial status, upgrade/cancel via Stripe portal |

### Organizations
| Route | Description |
|-------|-------------|
| `/organizations/invitations` | Pending org invitations |
| `/organizations/accept-invitation/[token]` | Accept cross-org invite |
| `/team/accept-invitation/[token]` | Accept team invite |

### Admin (org admins)
| Route | Description |
|-------|-------------|
| `/admin` | Org stats, document counts, user activity |
| `/admin/users` | User list, role management |
| `/admin/audit-logs` | Compliance trail for sensitive actions |
| `/admin/contact-submissions` | Messages from contact form |

### Public
| Route | Description |
|-------|-------------|
| `/pricing` | Plan comparison (Starter, Equipe, Enterprise) |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |
| `/contato` | Contact form |

---

## State Management

No Redux. Five React Context providers, nested in this order:

```
AuthProvider
  └── OrganizationProvider
        └── ThemeProvider
              └── FontSizeProvider
                    └── SubscriptionProvider
```

| Context | Key state |
|---------|-----------|
| `AuthContext` | JWT tokens, user object, login/logout |
| `OrganizationContext` | Active org, org list, org switch |
| `ThemeContext` | Light/dark mode preference |
| `FontSizeContext` | Accessibility font scaling |
| `SubscriptionContext` | Plan tier, trial status, Stripe actions |

---

## API Client

`lib/api.ts` — Axios instance with:
- `Authorization: Bearer <access_token>` header
- `X-Requested-With: XMLHttpRequest` CSRF header
- Automatic token refresh on 401 (queues concurrent requests while refreshing)
- Auto-redirect to `/login` if refresh fails

Separate clients: `lib/auth-api.ts` (auth endpoints), `lib/stripe-api.ts` (billing).

---

## UI Rules

- **No native browser dialogs** — always use Radix UI Dialog/AlertDialog
- **No native `<select>` for long lists** — use Command + Popover (combobox)
- **No native date inputs** — use custom `DatePicker` / `MonthPicker` / `YearPicker` from `components/ui/date-picker.tsx`

---

## Deployment

AWS Amplify connects to the GitHub repository and deploys automatically on every push to `main`. No `amplify.yml` needed — Amplify auto-detects Next.js.

**Required Amplify environment variables:**
```
NEXT_PUBLIC_API_URL=https://api.controlladoria.com.br
```

**Production domain:** `app.controlladoria.com.br`
