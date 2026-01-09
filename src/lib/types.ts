// API Response Types

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface User {
  id: number;
  username: string;
  email: string;
  createdAt: string;
}

export interface Post {
  id: number;
  title: string;
  url: string | null;
  text: string | null;
  author: string;
  authorId: number;
  points: number;
  commentsCount: number;
  createdAt: string;
  userVote?: number | null;
}

export interface Comment {
  id: number;
  postId: number;
  parentId: number | null;
  author: string;
  authorId: number;
  text: string;
  createdAt: string;
  updatedAt: string;
  replies: Comment[];
}

export interface PostsResponse {
  posts: Post[];
  page: number;
  totalPages: number;
  total: number;
}

export type SortType = 'new' | 'top' | 'best';
