# SafeStreets

SafeStreets is a multi-app road-safety platform built around three pieces:

- `client/client_user`: the citizen-facing Next.js app and PWA for reporting incidents, tracking personal reports, viewing hotspot maps, and managing notifications.
- `client/client_admin`: the admin moderation dashboard for reviewing reports, managing users, and monitoring analytics.
- `server`: the FastAPI backend that handles authentication, report ingestion, AI detection orchestration, geocoding, notifications, and admin workflows.

The current codebase supports both AI-assisted traffic violation reporting and a community garbage-reporting mode that skips AI and stores the submission directly.

## What Exists Today

### User app

- Email/password signup, login, forgot-password, and OTP-based reset flow
- Report creation with camera or gallery input
- Traffic report mode with AI detection
- Community garbage issue mode without AI detection
- Device geolocation plus reverse-geocoded address preview
- Image compression before upload
- Offline queue backed by IndexedDB
- Pending-reports screen with retry/sync controls
- Personal dashboard with report stats and history
- Public map and heatmap views of reported incidents
- Leaderboard based on user points
- Notification center and profile page
- PWA manifest and production service worker registration
- Capacitor Android project for mobile packaging

### Admin app

- Separate admin signup and login flow
- Dashboard with totals, recent activity, and charts
- Violation moderation with list and map views
- Single and bulk status updates
- Admin review comments stored in report details
- Bulk delete and per-report delete actions
- User list, user detail page, ban/unban, and delete user actions

### Backend

- JWT-based auth with refresh-token storage
- Role-based access for users vs admins
- Structured logging with request correlation IDs
- Rate limiting on signup, login, password reset, and report submission
- Supabase-backed data access and storage uploads
- LocationIQ reverse geocoding with in-memory caching and rate limiting
- Primary AI detector plus optional Anthropic Claude parallel ensemble
- Resend email alerts for newly reported violations
- Notification creation on admin verification/rejection
- Lightweight `GET /violations/count` endpoint for profile stats

## Repository Layout

```text
.
├── client/
│   ├── client_admin/
│   │   ├── app/                  # Admin auth + dashboard routes
│   │   ├── components/           # Charts, maps, UI primitives
│   │   ├── services/api.ts       # Axios client with admin token handling
│   │   └── package.json
│   └── client_user/
│       ├── app/                  # User routes (auth, dashboard, report, map, etc.)
│       ├── components/           # Navbar, map, notification bell, tables, UI
│       ├── public/               # PWA manifest, icons, service worker
│       ├── services/             # API client, offline queue/sync, image compression
│       ├── android/              # Capacitor Android project
│       ├── capacitor.config.json
│       └── package.json
├── server/
│   ├── core/                     # Config, auth helpers, dependencies, limiter
│   ├── routers/                  # FastAPI route modules
│   ├── services/                 # Detector + email integrations
│   ├── utils/                    # Supabase, logging, geocoding helpers
│   ├── scripts/                  # Maintenance utilities
│   ├── main.py                   # FastAPI app entrypoint
│   └── requirements.txt
└── venv/                         # Local Python virtual environment (if created)
```

## Architecture Summary

1. A user signs in through the user app and receives a JWT access token plus a stored refresh token on the backend.
2. Report submission sends 1 to 3 images plus location and metadata to `POST /violations/`.
3. For traffic reports, the backend calls the primary detector and can optionally run Claude in parallel before merging results.
4. The backend reverse-geocodes the coordinates, uploads evidence images to the Supabase Storage bucket `violation-evidence`, and inserts the report into the `violations` table.
5. Admins review reports in the admin app. Verification awards points and creates a notification for the user; rejection also creates a notification.
6. The user app reads dashboard stats, map data, notifications, leaderboard data, and profile info from the FastAPI backend.

## Tech Stack

| Layer | Implementation |
| --- | --- |
| User frontend | Next.js 15, React 19, TypeScript, Tailwind CSS v4, Framer Motion, Axios, Leaflet |
| Admin frontend | Next.js 15, React 19, TypeScript, Tailwind CSS v4, Recharts, Leaflet |
| Mobile shell | Capacitor 8 with Android project checked in |
| Backend | FastAPI, Uvicorn, Pydantic, SlowAPI |
| Auth and data | Supabase tables + storage |
| Password hashing | Argon2 |
| Geocoding | LocationIQ reverse geocoding |
| AI integrations | External model API plus optional Anthropic Claude |
| Email alerts | Resend |

## Runtime Requirements

- Node.js 18+ and npm
- Python 3.12+
- A Supabase project with the expected tables and storage bucket
- A reachable AI inference endpoint for traffic-report analysis
- A valid `JWT_SECRET`
- Optional but strongly recommended external services:
  - LocationIQ for address lookup
  - Anthropic for parallel Claude validation
  - Resend for alert emails

## Environment Variables

### Backend

The backend reads environment variables through `server/core/config.py`. `JWT_SECRET` is mandatory; the server refuses to boot without it.

| Variable | Required | Purpose |
| --- | --- | --- |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Fallback key if no service-role key is set |
| `SUPABASE_SERVICE_ROLE_KEY` | Recommended | Preferred server-side key for unrestricted backend operations |
| `JWT_SECRET` | Yes | Secret used to sign and verify access tokens |
| `JWT_ALGO` | No | JWT algorithm, defaults to `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | Access-token TTL, defaults to `15` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | No | Refresh-token TTL, defaults to `30` |
| `ALLOWED_ORIGINS` | No | Comma-separated CORS allowlist, defaults to `*` |
| `DEBUG` | No | Enables verbose error responses when truthy |
| `MODEL_API_URL` | Required for traffic AI | External inference endpoint used by `server/services/detector.py` |
| `CLAUDE_PARALLEL_ENABLED` | No | Enables parallel Claude validation when truthy |
| `ANTHROPIC_API_KEY` | Required only if Claude is enabled | Anthropic API key |
| `ANTHROPIC_API_URL` | No | Anthropic messages endpoint override |
| `CLAUDE_MODEL` | No | Claude model name |
| `CLAUDE_TIMEOUT_SECONDS` | No | Timeout for Claude requests |
| `CLAUDE_MAX_TOKENS` | No | Max Claude output tokens |
| `LOCATIONIQ_API_KEY` | Recommended | Reverse geocoding API key |
| `RESEND_API_KEY` | Optional | Enables email alerts |
| `RESEND_FROM_EMAIL` | Optional | Sender address for alert emails |
| `RESEND_REPLY_TO` | Optional | Reply-to address for alert emails |
| `RESEND_TIMEOUT_SECONDS` | No | Timeout for Resend requests |
| `ALERT_RECIPIENT_EMAIL` | Optional | Destination email for new-report alerts |
| `SMTP_HOST` | No | Present in config but not currently used by the active email path |
| `SMTP_PORT` | No | Present in config but not currently used by the active email path |
| `SMTP_USER` | No | Present in config but not currently used by the active email path |
| `SMTP_PASSWORD` | No | Present in config but not currently used by the active email path |
| `SMTP_TLS_MODE` | No | Present in config but not currently used by the active email path |
| `SMTP_TIMEOUT_SECONDS` | No | Present in config but not currently used by the active email path |

Example backend `.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=replace-with-a-long-random-secret
JWT_ALGO=HS256
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
MODEL_API_URL=https://your-model-service.example.com/detect
LOCATIONIQ_API_KEY=your-locationiq-key
CLAUDE_PARALLEL_ENABLED=false
ANTHROPIC_API_KEY=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
ALERT_RECIPIENT_EMAIL=
```

### Frontend

Both frontends use `NEXT_PUBLIC_API_URL`.

| App | Variable | Default in code |
| --- | --- | --- |
| `client/client_user` | `NEXT_PUBLIC_API_URL` | `https://safe-streets-backend.onrender.com` |
| `client/client_admin` | `NEXT_PUBLIC_API_URL` | `http://localhost:8000` |

Set this explicitly in each app's `.env.local` during development so both frontends point at the same backend.

Example:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Local Development

### 1. Backend

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r server/requirements.txt
cd server
uvicorn main:app --reload --port 8000
```

The backend serves:

- `http://localhost:8000/`
- `http://localhost:8000/health/`

### 2. User app

```bash
cd client/client_user
npm install
npm run dev -- --port 3000
```

### 3. Admin app

If you want both Next.js apps running at the same time, start the admin app on a different port:

```bash
cd client/client_admin
npm install
npm run dev -- --port 3001
```

## Mobile and PWA Notes

The user app is configured as a static-exported PWA:

- `client/client_user/next.config.ts` uses `output: 'export'`
- `client/client_user/public/manifest.json` defines install metadata
- `client/client_user/components/ServiceWorkerRegistration.tsx` registers the service worker only in production
- `client/client_user/public/sw.js` caches the app shell and listens for background sync events
- `client/client_user/capacitor.config.json` points Capacitor at `out/`

### Build the user app for Android

```bash
cd client/client_user
npm install
npm run build:mobile
```

That runs `next build && npx cap sync`, which updates the checked-in Android project under `client/client_user/android/`.

The Android project already includes:

- `INTERNET`
- `ACCESS_COARSE_LOCATION`
- `ACCESS_FINE_LOCATION`

Capacitor plugins in use:

- `@capacitor/camera`
- `@capacitor/geolocation`

## Offline Reporting Flow

Offline support is implemented entirely in the user app:

- Pending reports are stored in IndexedDB by `client/client_user/services/offlineQueue.ts`
- Sync and retry logic lives in `client/client_user/services/offlineSync.ts`
- The pending queue UI lives at `/pending-reports`
- The report form compresses large or non-JPEG images before storing or uploading them
- Background sync is requested when supported by the browser

Important deployment note:

- Foreground sync uses the configured Axios `NEXT_PUBLIC_API_URL`
- The production service worker currently posts background-sync submissions to `/api/violations/`

If you deploy the statically exported user app behind a domain that does not proxy `/api/*` to FastAPI, service-worker background sync will need a reverse proxy or an implementation adjustment.

## Expected Supabase Resources

The code references these Supabase resources directly:

### Tables

- `profiles`
- `admins`
- `violations`
- `notifications`
- `refresh_tokens`
- `auth_logs`

### Storage

- Bucket: `violation-evidence`

### Optional RPC

- `increment_points(u_id, amount)`

If the RPC is missing, the backend falls back to a fetch-and-update path when awarding points after verification.

## API Summary

### Public and authenticated user endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/` | Basic API status payload |
| `GET` | `/health/` | Health-check endpoint |
| `POST` | `/auth/signup` | User signup |
| `POST` | `/auth/login` | User login; returns access and refresh tokens |
| `POST` | `/auth/refresh` | Issues a new access token from a stored refresh token |
| `POST` | `/auth/forgot-password` | Generates reset OTP |
| `POST` | `/auth/reset-password` | Resets password using email + OTP |
| `GET` | `/users/me` | Current user profile |
| `GET` | `/users/leaderboard` | Top users by points |
| `GET` | `/geocode/reverse?lat=...&lon=...` | Reverse-geocodes coordinates |
| `GET` | `/notifications/` | Current user's notifications |
| `PUT` | `/notifications/{notification_id}/read` | Marks one notification as read |
| `GET` | `/violations/public` | Public hotspot data for the map |
| `GET` | `/violations/` | Current user's full report list |
| `GET` | `/violations/count` | Current user's total report count |
| `POST` | `/violations/` | Creates a new report |
| `DELETE` | `/violations/{violation_id}` | Deletes one of the user's own reports |

### Report payload notes

`POST /violations/` expects multipart form data with:

- `files`: 1 to 3 uploaded images
- `latitude`
- `longitude`
- `timestamp`
- `report_mode`: `traffic` or `community_garbage`
- Optional `user_violation_type`
- Optional `description`
- Optional `severity`
- Optional `vehicle_number`

Behavior:

- `traffic` reports go through AI detection
- `community_garbage` reports skip AI and are stored as community issues

### Admin authentication

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/admin/auth/signup` | Create an admin account |
| `POST` | `/admin/auth/login` | Log in as admin |

### Admin moderation and user management

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/admin/dashboard` | Aggregate admin dashboard stats |
| `GET` | `/admin/violations` | Paginated violation list with optional `status` filter |
| `PUT` | `/admin/violations/{violation_id}/status` | Verify/reject/update a report and optionally attach admin comments |
| `PUT` | `/admin/violations/bulk-status` | Bulk verify or reject up to 50 reports |
| `DELETE` | `/admin/violations/bulk` | Bulk delete reports |
| `DELETE` | `/admin/violations/{violation_id}` | Hard-delete one report |
| `GET` | `/admin/users` | List user accounts |
| `GET` | `/admin/users/{user_id}` | Fetch one user profile and stats |
| `GET` | `/admin/users/{user_id}/violations` | Fetch one user's reports |
| `PUT` | `/admin/users/{user_id}/ban` | Ban or unban a user |
| `DELETE` | `/admin/users/{user_id}` | Delete a user and related records |

## Important Implementation Notes

- `client/client_user/app/scan/page.tsx` is an alias of the main report page.
- The dedicated admin experience lives in `client/client_admin`, but `client/client_user/app/admin/page.tsx` still contains a simple legacy admin screen that also hits admin endpoints.
- The user dashboard still fetches the full `/violations/` list because it needs report rows for the table and chart; the profile page now uses `/violations/count` for the lightweight report-count stat.
- The backend's default `MODEL_API_URL` points to `/detect`, but the FastAPI server itself does not expose that route. A separate model service is expected.
- Email alerts use Resend, not the SMTP settings currently exposed in config.
- The service worker is intentionally disabled in development to avoid stale caches and route artifacts.

## Useful Commands

### Frontend

```bash
cd client/client_user && npm run lint
cd client/client_user && npm run build
cd client/client_user && npm run build:mobile

cd client/client_admin && npm run lint
cd client/client_admin && npm run build
```

### Backend

```bash
source venv/bin/activate
cd server
python check_setup.py
python scripts/fix_addresses.py
```

`check_setup.py` currently verifies access to the `violations` table. `fix_addresses.py` backfills address details for stored reports.

## Troubleshooting

- If the backend fails on startup, check `JWT_SECRET` first.
- If traffic reports fail but community garbage reports work, verify `MODEL_API_URL`.
- If addresses do not resolve, verify `LOCATIONIQ_API_KEY`.
- If admin verification works but no alert email is sent, check `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `ALERT_RECIPIENT_EMAIL`.
- If the user app and admin app appear to talk to different backends locally, set `NEXT_PUBLIC_API_URL` explicitly in both apps.
- If offline sync behaves differently between foreground sync and background sync, verify whether `/api/*` is proxied to FastAPI in your deployment.

