# Safe Streets

## Project Structure
- `client/client_user`: Frontend (Next.js)
- `server`: Backend (FastAPI)
- `venv`: Python Virtual Environment

## Prerequisites
- Node.js & npm
- Python 3.12 (Virtual Environment set up)

## How to Run

### 1. Backend (FastAPI)
The backend runs on port `8000`.

**Terminal 1:**
```bash
# Activate the virtual environment
source venv/bin/activate

# Navigate to the server directory
cd server

# Install dependencies (if not already done)
pip install -r requirements.txt

# Start the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend (Next.js)
The frontend usually runs on port `3000`.

**Terminal 2:**
```bash
# Navigate to the client directory
cd client/client_user

# Install dependencies (if not already done)
npm install

# Start the development server
npm run dev
```

Your app should now be accessible at `http://localhost:3000` (frontend), communicating with `http://localhost:8000` (backend).