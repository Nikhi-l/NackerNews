import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { errorResponse, successResponse, calculateBestScore } from '@/lib/utils';
import { Prisma } from '@prisma/client';

// GET /api/posts - List posts with pagination, sorting, and search
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '30')));
    const sort = searchParams.get('sort') || 'new';
    const search = searchParams.get('q') || '';

    const skip = (page - 1) * limit;

    // Build where clause for search
    const where: Prisma.PostWhereInput = search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { text: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    // Get total count
    const total = await prisma.post.count({ where });
    const totalPages = Math.ceil(total / limit);

    // Determine ordering
    let orderBy: Prisma.PostOrderByWithRelationInput[];
    if (sort === 'top') {
      orderBy = [{ points: 'desc' }, { createdAt: 'desc' }];
    } else if (sort === 'best') {
      // For "best", we fetch all and sort in memory (or fetch more and filter)
      orderBy = [{ createdAt: 'desc' }];
    } else {
      // 'new' - default
      orderBy = [{ createdAt: 'desc' }];
    }

    // Fetch posts
    let posts = await prisma.post.findMany({
      where,
      orderBy,
      skip: sort === 'best' ? 0 : skip,
      take: sort === 'best' ? 1000 : limit, // Fetch more for "best" sorting
      include: {
        author: { select: { username: true } },
      },
    });

    // Apply "best" sorting
    if (sort === 'best') {
      posts = posts
        .map((post) => ({
          ...post,
          _score: calculateBestScore(post.points, post.createdAt),
        }))
        .sort((a, b) => b._score - a._score)
        .slice(skip, skip + limit);
    }

    // Get current user for vote info
    const currentUser = await getCurrentUser();
    let userVotes: Record<number, number> = {};

    if (currentUser) {
      const votes = await prisma.vote.findMany({
        where: {
          userId: currentUser.id,
          postId: { in: posts.map((p) => p.id) },
        },
      });
      userVotes = votes.reduce(
        (acc, v) => {
          acc[v.postId] = v.value;
          return acc;
        },
        {} as Record<number, number>
      );
    }

    // Format response
    const formattedPosts = posts.map((post) => ({
      id: post.id,
      title: post.title,
      url: post.url,
      text: post.text ? post.text.substring(0, 500) : null,
      author: post.author.username,
      authorId: post.authorId,
      points: post.points,
      commentsCount: post.commentsCount,
      createdAt: post.createdAt.toISOString(),
      userVote: userVotes[post.id] || null,
    }));

    return successResponse({
      posts: formattedPosts,
      page,
      totalPages,
      total,
    });
  } catch (error) {
    console.error('Get posts error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to get posts', 500);
  }
}

// POST /api/posts - Create a new post
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return errorResponse('UNAUTHORIZED', 'Must be logged in to create a post', 401);
    }

    const body = await request.json();
    const { title, url, text } = body;

    // Validation
    if (!title || title.trim().length === 0) {
      return errorResponse('VALIDATION_ERROR', 'Title is required');
    }

    if (title.length > 300) {
      return errorResponse('VALIDATION_ERROR', 'Title must be 300 characters or less');
    }

    if (!url && !text) {
      return errorResponse('VALIDATION_ERROR', 'Either URL or text is required');
    }

    if (url && !url.match(/^https?:\/\//)) {
      return errorResponse('VALIDATION_ERROR', 'URL must start with http:// or https://');
    }

    // Create post
    const post = await prisma.post.create({
      data: {
        title: title.trim(),
        url: url?.trim() || null,
        text: text?.trim() || null,
        authorId: currentUser.id,
        points: 1, // Author's implicit upvote
      },
      include: {
        author: { select: { username: true } },
      },
    });

    return successResponse(
      {
        id: post.id,
        title: post.title,
        url: post.url,
        text: post.text,
        author: post.author.username,
        authorId: post.authorId,
        points: post.points,
        commentsCount: post.commentsCount,
        createdAt: post.createdAt.toISOString(),
        userVote: 1,
      },
      201
    );
  } catch (error) {
    console.error('Create post error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to create post', 500);
  }
}
