import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { passcode, displayName, email, role, partnerName } = body;

    // Server-side passcode enforcement
    if (passcode !== '106') {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Invalid passcode. Account creation requires passcode authorization.',
        },
        { status: 403 }
      );
    }

    if (!displayName || !email) {
      return NextResponse.json(
        { success: false, error: 'Name and email are required.' },
        { status: 400 }
      );
    }

    const newUser = {
      uid: `usr-${Date.now()}`,
      displayName,
      email: email.toLowerCase().trim(),
      role: role || 'portfolio_owner',
      partnerId: role === 'partner' ? `partner-${Date.now()}` : undefined,
      partnerName: role === 'partner' ? (partnerName || 'Independent Partner') : undefined,
      avatarUrl: undefined,
    };

    return NextResponse.json({ success: true, user: newUser });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error during account creation.' },
      { status: 500 }
    );
  }
}
