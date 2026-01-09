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

### Deploy API (Step 1)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FNikhi-l%2FNackerNews%2Ftree%2Fclaude%2Fhacker-news-clone-jvSom&root-directory=apps/api&project-name=nacker-news-api&env=DATABASE_URL,JWT_SECRET)

1. Click the button above
2. Connect your GitHub account
3. Add environment variables:
   - `DATABASE_URL`: Your Vercel Postgres connection string
   - `JWT_SECRET`: Generate with `openssl rand -hex 32`
4. Deploy

**After deployment, copy the API URL** (e.g., `https://nacker-news-api.vercel.app`)

### Deploy Web (Step 2)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FNikhi-l%2FNackerNews%2Ftree%2Fclaude%2Fhacker-news-clone-jvSom&root-directory=apps/web&project-name=nacker-news-web&env=NEXT_PUBLIC_API_BASE_URL)

1. Click the button above
2. Add environment variables:
   - `NEXT_PUBLIC_API_BASE_URL`: The API URL from Step 1
3. Deploy

### Vercel Integrations

1. **Vercel Postgres**: Add from Vercel dashboard → Storage → Create Database
   - The `DATABASE_URL` will be automatically added to your API project

2. **Vercel KV** (Optional, for rate limiting): Add from Storage → Create KV
   - `KV_REST_API_URL` and `KV_REST_API_TOKEN` will be added automatically

### Post-Deployment

After both apps are deployed:
1. Update the API's `CORS_ORIGINS` to include your web app URL
2. Run database migrations:
   ```bash
   # Connect to your Vercel project
   vercel link
   vercel env pull .env.local

   # Run migrations
   cd apps/api
   alembic upgrade head
   ```

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
