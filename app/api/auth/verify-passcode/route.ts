import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { passcode } = body;

    if (passcode === '106') {
      return NextResponse.json({ valid: true });
    }

    return NextResponse.json(
      { valid: false, error: 'Unauthorized: Invalid passcode.' },
      { status: 403 }
    );
  } catch (error) {
    return NextResponse.json(
      { valid: false, error: 'Server error verifying passcode.' },
      { status: 500 }
    );
  }
}
