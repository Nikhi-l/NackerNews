import { NextResponse } from 'next/server';

export function errorResponse(code: string, message: string, status: number = 400) {
  return NextResponse.json(
    { error: { code, message } },
    { status }
  );
}

export function successResponse<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status });
}

/**
 * Calculate "best" ranking score
 * Formula: points / pow(hours_since + 2, 1.5)
 */
export function calculateBestScore(points: number, createdAt: Date): number {
  const now = new Date();
  const hoursSince = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
  return points / Math.pow(hoursSince + 2, 1.5);
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatTimeAgo(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return d.toLocaleDateString();
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate username format (alphanumeric + underscore, 3-50 chars)
 */
export function isValidUsername(username: string): boolean {
  const usernameRegex = /^[a-zA-Z0-9_]{3,50}$/;
  return usernameRegex.test(username);
}
