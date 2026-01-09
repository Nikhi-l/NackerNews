import { getCurrentUser } from '@/lib/auth';
import { errorResponse, successResponse } from '@/lib/utils';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
    }

    return successResponse({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Get me error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to get user', 500);
  }
}
