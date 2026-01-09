import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPassword, createToken, setAuthCookie } from '@/lib/auth';
import { errorResponse, successResponse } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Validation
    if (!username || !password) {
      return errorResponse('VALIDATION_ERROR', 'Username and password are required');
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return errorResponse('INVALID_CREDENTIALS', 'Invalid username or password', 401);
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return errorResponse('INVALID_CREDENTIALS', 'Invalid username or password', 401);
    }

    // Create token and set cookie
    const token = await createToken({ userId: user.id, username: user.username });
    await setAuthCookie(token);

    return successResponse({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to login', 500);
  }
}
