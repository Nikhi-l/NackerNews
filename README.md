# Nacker News

A full-stack Hacker News clone built with Next.js 15.

## Overview

Nacker News is a feature-complete Hacker News clone with both frontend and backend in a single Next.js application:

- User authentication (signup, login, logout)
- Post submissions (URL links or text posts)
- Upvote/downvote system with optimistic UI
- Threaded comments with edit/delete
- Multiple feed sorting (new, top, best)
- Search functionality
- Paginated post feed
- Mobile-responsive design

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Frontend**: React 19, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with httpOnly cookies
- **Password Hashing**: bcrypt
- **Language**: TypeScript

## Features

### Core Features
- [x] User registration and authentication (secure password hashing)
- [x] Submit posts (URL or text)
- [x] View paginated post feed
- [x] Sort by "new", "top", and "best"
- [x] Upvote and downvote posts
- [x] Threaded comments with replies
- [x] Edit and delete own comments
- [x] Search posts
- [x] Mobile-responsive UI

### Bonus Features
- [x] Both frontend and backend in single app
- [x] Optimistic UI updates for voting
- [x] CI/CD with GitHub Actions
- [x] "Best" ranking algorithm

## Local Development

### Prerequisites
- Node.js 20+
- PostgreSQL 14+

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Nikhi-l/NackerNews.git
   cd NackerNews
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your database URL and JWT secret:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/nacker_news"
   JWT_SECRET="your-secret-key"
   ```

4. **Set up the database**
   ```bash
   npx prisma db push
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret key for JWT tokens (generate with `openssl rand -hex 32`) |

## Vercel Deployment

### One-Click Deploy

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import `Nikhi-l/NackerNews`
3. Add Environment Variables:
   - `DATABASE_URL`: Create Vercel Postgres first (Storage → Create → Postgres)
   - `JWT_SECRET`: Generate with `openssl rand -hex 32`
4. Deploy

### After Deployment

Push the database schema:
```bash
npx prisma db push
```

## API Documentation

See [API.md](./API.md) for complete API documentation.

## Project Structure

```
NackerNews/
├── src/
│   ├── app/
│   │   ├── api/              # API routes (backend)
│   │   │   ├── auth/         # Auth endpoints
│   │   │   ├── posts/        # Posts endpoints
│   │   │   ├── comments/     # Comments endpoints
│   │   │   └── votes/        # Votes endpoint
│   │   ├── (auth)/           # Auth pages
│   │   │   ├── login/
│   │   │   └── signup/
│   │   ├── submit/           # Submit post page
│   │   ├── post/[id]/        # Post detail page
│   │   ├── layout.tsx
│   │   └── page.tsx          # Home/feed page
│   ├── components/           # React components
│   └── lib/                  # Utilities
│       ├── auth.ts           # Auth utilities
│       ├── db.ts             # Database client
│       ├── types.ts          # TypeScript types
│       └── utils.ts          # Helper functions
├── prisma/
│   └── schema.prisma         # Database schema
└── package.json
```

## AI Assistance

This project was built with assistance from AI tools:

- **Claude Code** (Anthropic) - Architecture design, code implementation, and debugging

AI was used for:
- Project structure and boilerplate setup
- Implementing API endpoints and database schema
- Creating React components and pages
- Writing documentation
- Debugging and refactoring

All AI-generated code was reviewed and tested.

## Roadmap

Future improvements:
- [ ] User profiles and karma
- [ ] Email verification
- [ ] Password reset
- [ ] Post editing/deletion
- [ ] Rate limiting
- [ ] Notifications
- [ ] Real-time updates

## License

MIT
