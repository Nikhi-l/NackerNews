import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { errorResponse, successResponse } from '@/lib/utils';

// POST /api/votes - Vote on a post
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return errorResponse('UNAUTHORIZED', 'Must be logged in to vote', 401);
    }

    const body = await request.json();
    const { postId, value } = body;

    // Validation
    if (!postId) {
      return errorResponse('VALIDATION_ERROR', 'Post ID is required');
    }

    if (value === undefined || ![1, -1, 0].includes(value)) {
      return errorResponse('VALIDATION_ERROR', 'Value must be 1, -1, or 0');
    }

    // Verify post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return errorResponse('NOT_FOUND', 'Post not found', 404);
    }

    // Get existing vote
    const existingVote = await prisma.vote.findUnique({
      where: {
        userId_postId: {
          userId: currentUser.id,
          postId,
        },
      },
    });

    let pointsDelta = 0;

    if (value === 0) {
      // Remove vote
      if (existingVote) {
        pointsDelta = -existingVote.value;
        await prisma.$transaction([
          prisma.vote.delete({
            where: {
              userId_postId: {
                userId: currentUser.id,
                postId,
              },
            },
          }),
          prisma.post.update({
            where: { id: postId },
            data: { points: { increment: pointsDelta } },
          }),
        ]);
      }
    } else if (existingVote) {
      // Update existing vote
      if (existingVote.value !== value) {
        pointsDelta = value - existingVote.value;
        await prisma.$transaction([
          prisma.vote.update({
            where: {
              userId_postId: {
                userId: currentUser.id,
                postId,
              },
            },
            data: { value },
          }),
          prisma.post.update({
            where: { id: postId },
            data: { points: { increment: pointsDelta } },
          }),
        ]);
      }
    } else {
      // Create new vote
      pointsDelta = value;
      await prisma.$transaction([
        prisma.vote.create({
          data: {
            userId: currentUser.id,
            postId,
            value,
          },
        }),
        prisma.post.update({
          where: { id: postId },
          data: { points: { increment: pointsDelta } },
        }),
      ]);
    }

    // Get updated post points
    const updatedPost = await prisma.post.findUnique({
      where: { id: postId },
      select: { points: true },
    });

    return successResponse({
      postId,
      value,
      newPoints: updatedPost?.points || post.points + pointsDelta,
    });
  } catch (error) {
    console.error('Vote error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to vote', 500);
  }
}
