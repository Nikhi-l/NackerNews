# Nacker News API Documentation

## Base URL

- Local: `http://localhost:3000/api`
- Production: `https://your-app.vercel.app/api`

## Authentication

The API uses JWT tokens stored in httpOnly cookies. Tokens are automatically sent with requests.

## Error Format

All errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

Common error codes:
- `VALIDATION_ERROR` - Invalid request data
- `UNAUTHORIZED` - Not authenticated
- `FORBIDDEN` - Not authorized
- `NOT_FOUND` - Resource not found
- `INTERNAL_ERROR` - Server error

---

## Auth Endpoints

### POST /api/auth/signup

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
- `password`: At least 8 characters

**Response (201 Created):**
```json
{
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "createdAt": "2024-01-15T12:00:00.000Z"
  }
}
```

**Errors:**
- `409`: Username or email already exists

---

### POST /api/auth/login

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
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "createdAt": "2024-01-15T12:00:00.000Z"
  }
}
```

**Errors:**
- `401`: Invalid credentials

---

### POST /api/auth/logout

Logout the current user (clears the auth cookie).

**Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

---

### GET /api/auth/me

Get the current authenticated user.

**Response (200 OK):**
```json
{
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "createdAt": "2024-01-15T12:00:00.000Z"
  }
}
```

**Errors:**
- `401`: Not authenticated

---

## Posts Endpoints

### GET /api/posts

List posts with pagination, sorting, and search.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | int | 1 | Page number |
| `limit` | int | 30 | Posts per page (max 100) |
| `sort` | string | "new" | Sort order: "new", "top", "best" |
| `q` | string | - | Search query |

**Sorting Methods:**
- `new`: Newest first (created_at DESC)
- `top`: Most points first (points DESC)
- `best`: Ranking algorithm: `points / pow(hours + 2, 1.5)`

**Response (200 OK):**
```json
{
  "posts": [
    {
      "id": 1,
      "title": "Example Post",
      "url": "https://example.com",
      "text": null,
      "author": "johndoe",
      "authorId": 1,
      "points": 42,
      "commentsCount": 5,
      "createdAt": "2024-01-15T12:00:00.000Z",
      "userVote": 1
    }
  ],
  "page": 1,
  "totalPages": 10,
  "total": 300
}
```

---

### POST /api/posts

Create a new post. **Requires authentication.**

**Request Body:**
```json
{
  "title": "My New Post",
  "url": "https://example.com",
  "text": null
}
```

**Validation:**
- `title`: Required, max 300 characters
- `url`: Optional, must start with http:// or https://
- `text`: Optional
- Either `url` or `text` must be provided

**Response (201 Created):**
```json
{
  "id": 1,
  "title": "My New Post",
  "url": "https://example.com",
  "text": null,
  "author": "johndoe",
  "authorId": 1,
  "points": 1,
  "commentsCount": 0,
  "createdAt": "2024-01-15T12:00:00.000Z",
  "userVote": 1
}
```

---

### GET /api/posts/[id]

Get a single post by ID.

**Response (200 OK):**
```json
{
  "id": 1,
  "title": "Example Post",
  "url": "https://example.com",
  "text": null,
  "author": "johndoe",
  "authorId": 1,
  "points": 42,
  "commentsCount": 5,
  "createdAt": "2024-01-15T12:00:00.000Z",
  "userVote": null
}
```

**Errors:**
- `404`: Post not found

---

### GET /api/posts/[id]/comments

Get all comments for a post as a threaded tree.

**Response (200 OK):**
```json
{
  "comments": [
    {
      "id": 1,
      "postId": 1,
      "parentId": null,
      "author": "alice",
      "authorId": 2,
      "text": "Great post!",
      "createdAt": "2024-01-15T13:00:00.000Z",
      "updatedAt": "2024-01-15T13:00:00.000Z",
      "replies": [
        {
          "id": 2,
          "postId": 1,
          "parentId": 1,
          "author": "johndoe",
          "authorId": 1,
          "text": "Thanks!",
          "createdAt": "2024-01-15T13:30:00.000Z",
          "updatedAt": "2024-01-15T13:30:00.000Z",
          "replies": []
        }
      ]
    }
  ]
}
```

---

## Comments Endpoints

### POST /api/comments

Create a new comment. **Requires authentication.**

**Request Body:**
```json
{
  "postId": 1,
  "parentId": null,
  "text": "This is my comment"
}
```

**Validation:**
- `postId`: Required, must exist
- `parentId`: Optional, must exist and belong to same post
- `text`: Required, max 10000 characters

**Response (201 Created):**
```json
{
  "id": 3,
  "postId": 1,
  "parentId": null,
  "author": "johndoe",
  "authorId": 1,
  "text": "This is my comment",
  "createdAt": "2024-01-15T14:00:00.000Z",
  "updatedAt": "2024-01-15T14:00:00.000Z",
  "replies": []
}
```

---

### PATCH /api/comments/[id]

Update a comment. **Requires authentication. Author only.**

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
  "postId": 1,
  "parentId": null,
  "author": "johndoe",
  "authorId": 1,
  "text": "Updated comment text",
  "createdAt": "2024-01-15T14:00:00.000Z",
  "updatedAt": "2024-01-15T14:30:00.000Z",
  "replies": []
}
```

**Errors:**
- `403`: Not the comment author
- `404`: Comment not found

---

### DELETE /api/comments/[id]

Delete a comment. **Requires authentication. Author only.**

Also deletes all nested replies.

**Response:** `204 No Content`

**Errors:**
- `403`: Not the comment author
- `404`: Comment not found

---

## Votes Endpoint

### POST /api/votes

Vote on a post. **Requires authentication.**

**Request Body:**
```json
{
  "postId": 1,
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
  "postId": 1,
  "value": 1,
  "newPoints": 43
}
```

**Errors:**
- `404`: Post not found
