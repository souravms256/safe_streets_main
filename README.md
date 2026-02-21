# SafeStreets

AI-powered traffic violation detection and reporting system. Citizens can photograph violations (helmetless driving, no parking, triple riding), and the system uses AI to automatically classify them.

## Project Structure

```text
safe_streets_main/
├── client/
│   ├── client_user/       # User-facing Next.js app (report, dashboard, map)
│   └── client_admin/      # Admin dashboard Next.js app (manage violations, users)
├── server/                # FastAPI backend
│   ├── main.py            # App entrypoint with CORS, logging middleware
│   ├── routers/           # API endpoints
│   │   ├── auth.py        # User authentication (login, signup)
│   │   ├── admin_auth.py  # Admin authentication
│   │   ├── admin.py       # Admin CRUD operations
│   │   ├── violations.py  # Violation reporting & retrieval
│   │   ├── users.py       # User profile management
│   │   ├── notifications.py # Push notifications
│   │   ├── geocode.py     # Reverse geocoding
│   │   └── health.py      # Health check
│   ├── services/
│   │   └── detector.py    # AI violation detection model
│   ├── core/              # Config, settings
│   └── utils/             # Logging, geocoding helpers
└── venv/                  # Python virtual environment
```

## Prerequisites

- **Node.js** ≥ 18 & npm
- **Python** 3.12+
- A `.env` file in the project root (with Supabase keys, etc.)

## Getting Started

### 1. Backend (FastAPI)

```bash
# Activate the virtual environment
source venv/bin/activate

# Navigate to server
cd server

# Install dependencies
pip install -r requirements.txt

# Start the server (port 8000)
uvicorn main:app --reload --port 8000
```

### 2. User Frontend (Next.js)

```bash
# Navigate to user client
cd client/client_user

# Install dependencies
npm install

# Start dev server (port 3000)
npm run dev
```

### 3. Admin Frontend (Next.js)

```bash
# Navigate to admin client
cd client/client_admin

# Install dependencies
npm install

# Start dev server
npm run dev
```

## Tech Stack

| Layer    | Technology                                    |
| -------- | --------------------------------------------- |
| Frontend | Next.js 15, React 19, TypeScript, Tailwind v4 |
| Backend  | FastAPI, Uvicorn, Python 3.12                 |
| Database | Supabase (PostgreSQL + Auth + Storage)        |
| AI/ML    | Custom violation detection model              |
| PWA      | Service Worker, offline support               |

## API Endpoints

| Method | Endpoint           | Description                       |
| ------ | ------------------ | --------------------------------- |
| POST   | `/auth/login`      | User login                        |
| POST   | `/auth/signup`     | User registration                 |
| GET    | `/users/me`        | Get current user profile          |
| POST   | `/violations/`     | Submit a violation report + image |
| GET    | `/violations/`     | List all violations               |
| GET    | `/notifications/`  | Get user notifications            |
| GET    | `/geocode/reverse` | Reverse geocode lat/lng           |
| GET    | `/health`          | Health check                      |