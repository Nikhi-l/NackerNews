import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { errorResponse, successResponse } from '@/lib/utils';

// POST /api/comments - Create a new comment
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return errorResponse('UNAUTHORIZED', 'Must be logged in to comment', 401);
    }

    const body = await request.json();
    const { postId, parentId, text } = body;

    // Validation
    if (!postId) {
      return errorResponse('VALIDATION_ERROR', 'Post ID is required');
    }

    if (!text || text.trim().length === 0) {
      return errorResponse('VALIDATION_ERROR', 'Comment text is required');
    }

    if (text.length > 10000) {
      return errorResponse('VALIDATION_ERROR', 'Comment must be 10000 characters or less');
    }

    // Verify post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return errorResponse('NOT_FOUND', 'Post not found', 404);
    }

    // Verify parent comment exists if provided
    if (parentId) {
      const parent = await prisma.comment.findFirst({
        where: { id: parentId, postId },
      });
      if (!parent) {
        return errorResponse('NOT_FOUND', 'Parent comment not found', 404);
      }
    }

    // Create comment and update post comment count in a transaction
    const [comment] = await prisma.$transaction([
      prisma.comment.create({
        data: {
          postId,
          parentId: parentId || null,
          authorId: currentUser.id,
          text: text.trim(),
        },
        include: {
          author: { select: { username: true } },
        },
      }),
      prisma.post.update({
        where: { id: postId },
        data: { commentsCount: { increment: 1 } },
      }),
    ]);

    return successResponse(
      {
        id: comment.id,
        postId: comment.postId,
        parentId: comment.parentId,
        author: comment.author.username,
        authorId: comment.authorId,
        text: comment.text,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString(),
        replies: [],
      },
      201
    );
  } catch (error) {
    console.error('Create comment error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to create comment', 500);
  }
}
