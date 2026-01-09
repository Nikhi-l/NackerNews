import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { errorResponse, successResponse } from '@/lib/utils';

// PATCH /api/comments/[id] - Update a comment
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return errorResponse('UNAUTHORIZED', 'Must be logged in', 401);
    }

    const { id } = await params;
    const commentId = parseInt(id);

    if (isNaN(commentId)) {
      return errorResponse('VALIDATION_ERROR', 'Invalid comment ID');
    }

    const body = await request.json();
    const { text } = body;

    if (!text || text.trim().length === 0) {
      return errorResponse('VALIDATION_ERROR', 'Comment text is required');
    }

    // Find comment
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      return errorResponse('NOT_FOUND', 'Comment not found', 404);
    }

    // Check ownership
    if (comment.authorId !== currentUser.id) {
      return errorResponse('FORBIDDEN', 'Can only edit your own comments', 403);
    }

    // Update comment
    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: { text: text.trim() },
      include: {
        author: { select: { username: true } },
      },
    });

    return successResponse({
      id: updated.id,
      postId: updated.postId,
      parentId: updated.parentId,
      author: updated.author.username,
      authorId: updated.authorId,
      text: updated.text,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      replies: [],
    });
  } catch (error) {
    console.error('Update comment error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to update comment', 500);
  }
}

// DELETE /api/comments/[id] - Delete a comment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return errorResponse('UNAUTHORIZED', 'Must be logged in', 401);
    }

    const { id } = await params;
    const commentId = parseInt(id);

    if (isNaN(commentId)) {
      return errorResponse('VALIDATION_ERROR', 'Invalid comment ID');
    }

    // Find comment
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        _count: { select: { replies: true } },
      },
    });

    if (!comment) {
      return errorResponse('NOT_FOUND', 'Comment not found', 404);
    }

    // Check ownership
    if (comment.authorId !== currentUser.id) {
      return errorResponse('FORBIDDEN', 'Can only delete your own comments', 403);
    }

    // Count total comments to be deleted (including nested replies)
    const countReplies = async (id: number): Promise<number> => {
      const replies = await prisma.comment.findMany({
        where: { parentId: id },
        select: { id: true },
      });
      let total = replies.length;
      for (const reply of replies) {
        total += await countReplies(reply.id);
      }
      return total;
    };

    const repliesCount = await countReplies(commentId);
    const totalDeleted = 1 + repliesCount;

    // Delete comment and update post count in a transaction
    await prisma.$transaction([
      prisma.comment.delete({
        where: { id: commentId },
      }),
      prisma.post.update({
        where: { id: comment.postId },
        data: { commentsCount: { decrement: totalDeleted } },
      }),
    ]);

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Delete comment error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to delete comment', 500);
  }
}
