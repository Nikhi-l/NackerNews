import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { errorResponse, successResponse } from '@/lib/utils';
import { Comment } from '@prisma/client';

interface CommentWithAuthor extends Comment {
  author: { username: string };
}

interface CommentTree {
  id: number;
  postId: number;
  parentId: number | null;
  author: string;
  authorId: number;
  text: string;
  createdAt: string;
  updatedAt: string;
  replies: CommentTree[];
}

function buildCommentTree(comments: CommentWithAuthor[]): CommentTree[] {
  const commentMap = new Map<number, CommentTree>();
  const roots: CommentTree[] = [];

  // First pass: create all comment objects
  for (const comment of comments) {
    commentMap.set(comment.id, {
      id: comment.id,
      postId: comment.postId,
      parentId: comment.parentId,
      author: comment.author.username,
      authorId: comment.authorId,
      text: comment.text,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      replies: [],
    });
  }

  // Second pass: build tree structure
  for (const comment of comments) {
    const node = commentMap.get(comment.id)!;
    if (comment.parentId === null) {
      roots.push(node);
    } else {
      const parent = commentMap.get(comment.parentId);
      if (parent) {
        parent.replies.push(node);
      }
    }
  }

  // Sort replies by createdAt
  function sortReplies(nodes: CommentTree[]) {
    nodes.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    for (const node of nodes) {
      sortReplies(node.replies);
    }
  }

  sortReplies(roots);
  return roots;
}

// GET /api/posts/[id]/comments - Get all comments for a post as a tree
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const postId = parseInt(id);

    if (isNaN(postId)) {
      return errorResponse('VALIDATION_ERROR', 'Invalid post ID');
    }

    // Verify post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return errorResponse('NOT_FOUND', 'Post not found', 404);
    }

    // Get all comments for the post
    const comments = await prisma.comment.findMany({
      where: { postId },
      include: {
        author: { select: { username: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const tree = buildCommentTree(comments);

    return successResponse({ comments: tree });
  } catch (error) {
    console.error('Get comments error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to get comments', 500);
  }
}
