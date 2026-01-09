import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { errorResponse, successResponse } from '@/lib/utils';

// GET /api/posts/[id] - Get a single post
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

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: { select: { username: true } },
      },
    });

    if (!post) {
      return errorResponse('NOT_FOUND', 'Post not found', 404);
    }

    // Get current user's vote
    const currentUser = await getCurrentUser();
    let userVote = null;

    if (currentUser) {
      const vote = await prisma.vote.findUnique({
        where: {
          userId_postId: {
            userId: currentUser.id,
            postId: post.id,
          },
        },
      });
      userVote = vote?.value || null;
    }

    return successResponse({
      id: post.id,
      title: post.title,
      url: post.url,
      text: post.text,
      author: post.author.username,
      authorId: post.authorId,
      points: post.points,
      commentsCount: post.commentsCount,
      createdAt: post.createdAt.toISOString(),
      userVote,
    });
  } catch (error) {
    console.error('Get post error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to get post', 500);
  }
}
