# Nacker News API Documentation

## Base URL

- Local: `http://localhost:8000`
- Production: Your Vercel API deployment URL

## Authentication

The API uses JWT (JSON Web Tokens) for authentication.

### Obtaining a Token

Tokens are returned from the `/auth/signup` and `/auth/login` endpoints.

### Using a Token

Include the token in the `Authorization` header:

```
Authorization: Bearer <your-token>
```

### Token Lifetime

Tokens expire after 7 days by default (configurable via `JWT_EXPIRATION_MINUTES`).

## Error Format

All errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": null
  }
}
```

Common error codes:
- `UNAUTHORIZED` - Missing or invalid token
- `INVALID_TOKEN` - Expired or malformed token
- `FORBIDDEN` - User doesn't have permission
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Invalid request data
- `RATE_LIMITED` - Too many requests

---

## Auth Endpoints

### POST /auth/signup

Register a new user.

**Request Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Validation:**
- `username`: 3-50 characters, alphanumeric + underscore only
- `email`: Valid email format
- `password`: 8-128 characters

**Response (201 Created):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**Errors:**
- `409 Conflict`: Username or email already exists

---

### POST /auth/login

Login with existing credentials.

**Request Body:**
```json
{
  "username": "johndoe",
  "password": "securepassword123"
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**Errors:**
- `401 Unauthorized`: Invalid credentials

---

### POST /auth/logout

Logout the current user.

**Note:** This is a stateless JWT implementation. The server doesn't maintain session state, so logout is a no-op on the server side. The client should discard the token.

**Headers Required:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

---

### GET /auth/me

Get the current authenticated user.

**Headers Required:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "created_at": "2024-01-15T12:00:00Z"
  }
}
```

---

## Posts Endpoints

### GET /posts

List posts with sorting, pagination, and search.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `sort` | string | `new` | Sort order: `new`, `top`, `best` |
| `limit` | int | 30 | Number of posts (1-100) |
| `cursor` | string | null | Pagination cursor |
| `q` | string | null | Search query |

**Sorting Methods:**
- `new`: Newest first (created_at DESC)
- `top`: Most points first (points DESC, created_at DESC)
- `best`: Ranking algorithm: `points / pow(hours_since + 2, 1.5)`

**Response (200 OK):**
```json
{
  "posts": [
    {
      "id": 1,
      "title": "Example Post",
      "url": "https://example.com",
      "text": null,
      "author_id": 1,
      "author_username": "johndoe",
      "points": 42,
      "comments_count": 5,
      "created_at": "2024-01-15T12:00:00Z",
      "user_vote": 1
    }
  ],
  "next_cursor": "eyJjcmVhdGVkX2F0IjoiMjAyNC0wMS0xNVQxMjowMDowMFoiLCJpZCI6MX0=",
  "has_more": true
}
```

**Cursor Format (base64-encoded JSON):**
- `new`: `{"created_at": "ISO-timestamp", "id": 123}`
- `top`: `{"points": 50, "created_at": "ISO-timestamp", "id": 123}`
- `best`: `{"score": 1.234, "id": 123}`

**Headers:**
- `Cache-Control: public, max-age=60, stale-while-revalidate=30`

---

### POST /posts

Create a new post.

**Headers Required:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "title": "My New Post",
  "url": "https://example.com",
  "text": null
}
```

**Validation:**
- `title`: Required, 1-300 characters
- `url`: Optional, must start with http:// or https://
- `text`: Optional, max 40000 characters
- Either `url` or `text` must be provided

**Response (201 Created):**
```json
{
  "id": 1,
  "title": "My New Post",
  "url": "https://example.com",
  "text": null,
  "author_id": 1,
  "author_username": "johndoe",
  "points": 1,
  "comments_count": 0,
  "created_at": "2024-01-15T12:00:00Z",
  "user_vote": 1
}
```

---

### GET /posts/{id}

Get a single post by ID.

**Response (200 OK):**
```json
{
  "id": 1,
  "title": "Example Post",
  "url": "https://example.com",
  "text": "Full post text here...",
  "author_id": 1,
  "author_username": "johndoe",
  "points": 42,
  "comments_count": 5,
  "created_at": "2024-01-15T12:00:00Z",
  "user_vote": null
}
```

**Errors:**
- `404 Not Found`: Post doesn't exist

---

## Comments Endpoints

### GET /posts/{id}/comments

Get all comments for a post as a threaded tree.

**Response (200 OK):**
```json
{
  "comments": [
    {
      "id": 1,
      "post_id": 1,
      "parent_id": null,
      "author_id": 2,
      "author_username": "alice",
      "text": "Great post!",
      "created_at": "2024-01-15T13:00:00Z",
      "updated_at": "2024-01-15T13:00:00Z",
      "replies": [
        {
          "id": 2,
          "post_id": 1,
          "parent_id": 1,
          "author_id": 1,
          "author_username": "johndoe",
          "text": "Thanks!",
          "created_at": "2024-01-15T13:30:00Z",
          "updated_at": "2024-01-15T13:30:00Z",
          "replies": []
        }
      ]
    }
  ]
}
```

---

### POST /comments

Create a new comment.

**Headers Required:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "post_id": 1,
  "parent_id": null,
  "text": "This is my comment"
}
```

**Validation:**
- `post_id`: Required, must exist
- `parent_id`: Optional, must exist and belong to same post
- `text`: Required, 1-10000 characters

**Response (201 Created):**
```json
{
  "id": 3,
  "post_id": 1,
  "parent_id": null,
  "author_id": 1,
  "author_username": "johndoe",
  "text": "This is my comment",
  "created_at": "2024-01-15T14:00:00Z",
  "updated_at": "2024-01-15T14:00:00Z",
  "replies": []
}
```

---

### PATCH /comments/{id}

Update a comment (author only).

**Headers Required:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "text": "Updated comment text"
}
```

**Response (200 OK):**
```json
{
  "id": 3,
  "post_id": 1,
  "parent_id": null,
  "author_id": 1,
  "author_username": "johndoe",
  "text": "Updated comment text",
  "created_at": "2024-01-15T14:00:00Z",
  "updated_at": "2024-01-15T14:30:00Z",
  "replies": []
}
```

**Errors:**
- `403 Forbidden`: Not the comment author
- `404 Not Found`: Comment doesn't exist

---

### DELETE /comments/{id}

Delete a comment (author only). Also deletes all nested replies.

**Headers Required:** `Authorization: Bearer <token>`

**Response:** `204 No Content`

**Errors:**
- `403 Forbidden`: Not the comment author
- `404 Not Found`: Comment doesn't exist

---

## Votes Endpoint

### POST /votes

Vote on a post. Creates, updates, or removes a vote.

**Headers Required:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "post_id": 1,
  "value": 1
}
```

**Values:**
- `1`: Upvote
- `-1`: Downvote
- `0`: Remove vote

**Response (200 OK):**
```json
{
  "post_id": 1,
  "value": 1,
  "new_points": 43
}
```

**Errors:**
- `404 Not Found`: Post doesn't exist

---

## Rate Limiting

When Vercel KV is configured, the following rate limits apply:

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /auth/signup | 5 | 1 hour |
| POST /auth/login | 10 | 15 minutes |
| POST /posts | 10 | 1 hour |
| POST /comments | 30 | 1 hour |
| POST /votes | 100 | 1 hour |

**Rate Limit Response (429 Too Many Requests):**
```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "retry_after": 3600
    }
  }
}
```

If Vercel KV is not configured, rate limiting is disabled.

---

## Health Check

### GET /

```json
{
  "status": "ok",
  "service": "Nacker News API"
}
```

### GET /health

```json
{
  "status": "healthy"
}
```
