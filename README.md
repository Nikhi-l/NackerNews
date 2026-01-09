# Nacker News

A full-stack Hacker News clone built with Next.js and FastAPI.

## Overview

Nacker News is a feature-complete Hacker News clone with:
- User authentication (signup, login, logout)
- Post submissions (URL links or text posts)
- Upvote/downvote system
- Threaded comments
- Multiple feed sorting (new, top, best)
- Search functionality
- Mobile-responsive design

## Stack

### Frontend (`apps/web`)
- **Next.js 15** with App Router
- **React 19** for UI
- **Tailwind CSS** for styling
- **TypeScript** for type safety

### Backend (`apps/api`)
- **FastAPI** for REST API
- **PostgreSQL** for database
- **SQLAlchemy 2.0** for ORM
- **Alembic** for migrations
- **JWT** for authentication
- **bcrypt** for password hashing

### Infrastructure
- **Vercel** for deployment (both frontend and backend)
- **Vercel Postgres** for database
- **Vercel KV** for rate limiting (optional)

## Features

### Core Features
- [x] User registration and authentication
- [x] Submit posts (URL or text)
- [x] View post feed with sorting (new/top/best)
- [x] Upvote and downvote posts
- [x] Threaded comments with replies
- [x] Edit and delete own comments
- [x] Search posts
- [x] Cursor-based pagination
- [x] Mobile-responsive UI

### Bonus Features
- [x] Optimistic UI updates for voting
- [x] Rate limiting via Vercel KV
- [x] Cache-Control headers for CDN
- [x] "Best" ranking algorithm

## Local Development

### Prerequisites
- Node.js 20+
- Python 3.11+
- PostgreSQL 14+

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Nikhi-l/NackerNews.git
   cd NackerNews
   ```

2. **Set up the API**
   ```bash
   cd apps/api
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt

   # Create a .env file
   cp ../../.env.example .env
   # Edit .env with your DATABASE_URL and JWT_SECRET

   # Run migrations
   alembic upgrade head

   # Start the API server
   uvicorn app.main:app --reload
   ```
   API will be running at http://localhost:8000

3. **Set up the Web app**
   ```bash
   cd apps/web
   npm install

   # Create .env.local
   echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:8000" > .env.local

   # Start the dev server
   npm run dev
   ```
   Web app will be running at http://localhost:3000

## Environment Variables

See `.env.example` for all available environment variables.

### API (`apps/api`)
| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret key for JWT tokens |
| `JWT_EXPIRATION_MINUTES` | No | Token expiry (default: 10080 = 7 days) |
| `CORS_ORIGINS` | No | Comma-separated allowed origins |
| `KV_REST_API_URL` | No | Vercel KV URL for rate limiting |
| `KV_REST_API_TOKEN` | No | Vercel KV token |

### Web (`apps/web`)
| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | Yes | URL of the API server |

## Vercel Deployment

This monorepo deploys as **two Vercel projects** from the **same GitHub repo**.

### Step 1: Create Vercel Postgres Database

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click **Storage** → **Create Database** → **Postgres**
3. Name it `nacker-news-db`
4. Copy the `DATABASE_URL` for later

### Step 2: Deploy API

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import Git Repository**
3. Select `Nikhi-l/NackerNews`
4. Configure:
   - **Project Name**: `nacker-news-api`
   - **Root Directory**: `apps/api`
5. Add Environment Variables:
   - `DATABASE_URL`: Paste from Step 1
   - `JWT_SECRET`: Generate with `openssl rand -hex 32`
6. Click **Deploy**

**Copy the API URL** (e.g., `https://nacker-news-api.vercel.app`)

### Step 3: Deploy Web

1. Go to [vercel.com/new](https://vercel.com/new) again
2. Import the **same repo** `Nikhi-l/NackerNews`
3. Configure:
   - **Project Name**: `nacker-news-web`
   - **Root Directory**: `apps/web`
4. Add Environment Variables:
   - `NEXT_PUBLIC_API_BASE_URL`: Your API URL from Step 2
5. Click **Deploy**

### Step 4: Configure CORS

1. Go to your API project in Vercel dashboard
2. Settings → Environment Variables
3. Add `CORS_ORIGINS` = your web URL (e.g., `https://nacker-news-web.vercel.app`)
4. Redeploy the API

### Step 5: Run Database Migrations

```bash
# Install Vercel CLI
npm i -g vercel

# Link to API project and pull env vars
cd apps/api
vercel link
vercel env pull .env

# Run migrations
pip install -r requirements.txt
alembic upgrade head
```

### Auto-Deploy on Push

Once set up, both projects auto-deploy when you push to the repo:
- Changes in `apps/api/` → API redeploys
- Changes in `apps/web/` → Web redeploys

### Optional: Vercel KV (Rate Limiting)

1. Go to Vercel dashboard → Storage → Create KV
2. Link it to your API project
3. `KV_REST_API_URL` and `KV_REST_API_TOKEN` are added automatically
4. Redeploy API to enable rate limiting

## API Documentation

See [API.md](./API.md) for complete API documentation.

## AI Assistance

This project was built with assistance from AI tools:
- **Claude Code** (Anthropic) - Code scaffolding, implementation, and debugging
- **GitHub Copilot** - Code completion and suggestions

AI was used for:
- Initial project structure and boilerplate
- Implementing API endpoints and database models
- Creating React components and pages
- Writing documentation
- Debugging and refactoring

All AI-generated code was reviewed and tested.

## Iteration Log

| Date | Changes |
|------|---------|
| Initial | MVP with auth, posts, comments, votes |

## Roadmap

Future improvements:
- [ ] User profiles
- [ ] Karma system
- [ ] Email verification
- [ ] Password reset
- [ ] Post editing/deletion
- [ ] Flagging/moderation
- [ ] Real-time updates (WebSocket)
- [ ] Dark mode
- [ ] Notification system

## License

MIT
