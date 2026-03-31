import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

/**
 * Reset a user's password using Better Auth's API
 * 
 * This endpoint should only be called by admin endpoints, not users.
 * Better Auth handles the password hashing internally.
 */
export async function POST(request: Request) {
  try {
    const { email, newPassword } = await request.json();

    if (!email || !newPassword) {
      return NextResponse.json(
        { error: 'Email and newPassword required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Get user by email
    const users = await sql`SELECT id FROM "user" WHERE LOWER(email) = LOWER(${email})`;
    if (users.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userId = users[0].id;

    // Use Better Auth's server API to reset password
    // This ensures the password is hashed using Better Auth's standard algorithm
    const result = await auth.api.changePassword({
      userId: userId,
      newPassword: newPassword,
    });

    if (result.error) {
      console.error('Better Auth changePassword error:', result.error);
      return NextResponse.json(
        { error: result.error?.message || 'Failed to reset password' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
}
