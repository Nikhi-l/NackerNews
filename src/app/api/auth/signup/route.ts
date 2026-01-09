import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword, createToken, setAuthCookie } from '@/lib/auth';
import { errorResponse, successResponse, isValidEmail, isValidUsername } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, password } = body;

    // Validation
    if (!username || !email || !password) {
      return errorResponse('VALIDATION_ERROR', 'Username, email, and password are required');
    }

    if (!isValidUsername(username)) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Username must be 3-50 characters, alphanumeric and underscores only'
      );
    }

    if (!isValidEmail(email)) {
      return errorResponse('VALIDATION_ERROR', 'Invalid email format');
    }

    if (password.length < 8) {
      return errorResponse('VALIDATION_ERROR', 'Password must be at least 8 characters');
    }

    // Check if username exists
    const existingUsername = await prisma.user.findUnique({
      where: { username },
    });
    if (existingUsername) {
      return errorResponse('USERNAME_EXISTS', 'Username already taken', 409);
    }

    // Check if email exists
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });
    if (existingEmail) {
      return errorResponse('EMAIL_EXISTS', 'Email already registered', 409);
    }

    // Create user
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
      },
    });

    // Create token and set cookie
    const token = await createToken({ userId: user.id, username: user.username });
    await setAuthCookie(token);

    return successResponse(
      {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          createdAt: user.createdAt.toISOString(),
        },
      },
      201
    );
  } catch (error) {
    console.error('Signup error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to create account', 500);
  }
}
