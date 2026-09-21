# God’s Eye for Business — Deployment & Operations Guide

This guide details how to launch and deploy **God's Eye for Business**, the AI-driven global enterprise intelligence and lead-generation console.

---

## Architecture Overview

- **Frontend**: Next.js 14, React 18, CesiumJS 3D Globe, TailwindCSS, Tactical Blade Runner design system.
- **Backend**: Python 3.11 FastAPI service, SQLAlchemy 2.0, Pydantic v2, Google Gemini 3.6 Flash LLM, SerpApi search worker, BeautifulSoup web scraper.
- **Database**: PostgreSQL with PostGIS extension (production) or SQLite (zero-config local development).

---

## Option 1: Quick Local Launch (Native Node & Python)

### 1. Start the FastAPI Backend
Open a terminal in the project root:
```bash
# Activate Python virtual environment and start FastAPI
.\backend\.venv\Scripts\uvicorn backend.app.main:app --reload --port 8000
```
- Interactive Swagger UI: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`

### 2. Start the Next.js Frontend
Open a second terminal:
```bash
# Run Next.js development server
npm --prefix frontend run dev
```
- Open your browser to `http://localhost:3000`.

---

## Option 2: Full-Stack Docker Deployment (Docker Compose)

Launch PostgreSQL with PostGIS, FastAPI, and Next.js in synchronized containers:

```bash
# Build and start all services
docker compose up --build -d

# View logs
docker compose logs -f
```

- **Frontend (3D Globe)**: `http://localhost:3000`
- **Backend (FastAPI)**: `http://localhost:8000/docs`
- **PostgreSQL Database**: `localhost:5432` (`gods_eye_business`)

To stop all containers:
```bash
docker compose down
```

---

## Option 3: Cloud Production Deployment

### Backend Deployment (Render / Railway / AWS ECS)
1. Set the root directory or build context to the project root.
2. Build command:
   ```bash
   pip install -r backend/requirements.txt
   ```
3. Start command:
   ```bash
   uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT
   ```
4. Environment Variables:
   - `SERPAPI_API_KEY`: `b4b89bbe969eefc54c43f130e867a6a25985bcca03ae4dc92c521803e9295ec`
   - `GEMINI_API_KEY`: `AIzaSyBmDGdsjDg5siVFJEPlZ8SizNjq2pp6uO0`
   - `GEMINI_MODEL`: `gemini-3.6-flash`
   - `DATABASE_URL`: `postgresql://user:password@host:5432/dbname`

### Frontend Deployment (Vercel)
1. In Vercel, set the **Root Directory** to `frontend`.
2. Build command: `npm run build`
3. Output directory: `.next`
4. Environment Variables:
   - `NEXT_PUBLIC_BACKEND_URL`: `https://your-backend-api.onrender.com/api`
   - `NEXT_PUBLIC_CESIUM_ION_TOKEN`: (Optional Google 3D tiles token)

---

## Running Verification Tests

To verify that all backend contracts, scrapers, and the Gemini gap analysis pipeline pass:
```bash
# Run Pytest suite
.\backend\.venv\Scripts\python -m pytest backend/tests -v
```

To verify the Next.js production build:
```bash
npm --prefix frontend run build
```

---

## Operator Usage Flow

1. **Configure Profile**: Click the operator profile icon in the top right to input your technical headline, services offered, and skill matrix.
2. **Trigger Discovery**: Click **DISCOVER TARGETS** in the header to run the live SerpApi search worker $\rightarrow$ BeautifulSoup scraper $\rightarrow$ Gemini LLM gap analysis pipeline.
3. **Explore the 3D Globe**: Glowing cyan pins mark corporate headquarters globally.
4. **Target-Lock & Pitch**: Click any corporate node pin to trigger a smooth cinematic camera fly-in. The Intelligence Sidebar opens with 3 critical operational bottlenecks and a 1-click copyable cold email pitch.
