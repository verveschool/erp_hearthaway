import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

interface ChatMessage {
  role: 'user' | 'model' | 'assistant';
  content: string;
}

interface ChatContextPayload {
  currentUser?: {
    id?: string;
    displayName?: string;
    email?: string;
    role?: string;
    partnerName?: string;
  };
  currentPath?: string;
  selectedStudent?: {
    id?: string;
    fullName?: string;
    email?: string;
    university?: string;
    targetCity?: string;
    bookingStatus?: string;
    budgetWeekly?: number;
    assignedSalesOwnerName?: string;
    sourcePartnerName?: string;
    propertyName?: string;
  } | null;
  platformSummary?: {
    totalStudents?: number;
    totalPartners?: number;
    totalBookings?: number;
    pendingPayments?: number;
  };
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'GEMINI_API_KEY is not configured on the server.',
          reply: 'I am currently unable to connect to the Gemini service because the server API key is not configured. Please verify your environment setup.',
        },
        { status: 500 }
      );
    }

    const body = await req.json();
    const {
      messages = [],
      context = {},
    }: {
      messages: ChatMessage[];
      context?: ChatContextPayload;
    } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required and cannot be empty.' },
        { status: 400 }
      );
    }

    // Initialize Google GenAI client with required header
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // Construct context-aware system instruction
    const userRole = context.currentUser?.role || 'Guest';
    const userName = context.currentUser?.displayName || 'User';
    const currentPath = context.currentPath || '/';
    const partnerOrg = context.currentUser?.partnerName || 'None';

    let pathDescription = 'Root portal';
    if (currentPath.includes('/portfolio')) {
      pathDescription = 'Management Portfolio Dashboard (portfolio trends, owner metrics, partner allocations, 6M growth charts, global lead search)';
    } else if (currentPath.includes('/partners')) {
      pathDescription = 'Partners Directory & Commission Management (B2B agent roster, lead injection, contract terms, partner reassignment)';
    } else if (currentPath.includes('/sales')) {
      pathDescription = 'Sales Pipeline & Lead Conversion (pipeline stages, student assignments, tenancy agreements, notes)';
    } else if (currentPath.includes('/finance')) {
      pathDescription = 'Finance & Settlements (payment verification, holding deposits, commission invoices, remittance audits)';
    } else if (currentPath.includes('/sign-up')) {
      pathDescription = 'Authorized Personnel Account Creation';
    }

    let activeStudentContext = 'No student lead is currently opened in the drawer.';
    if (context.selectedStudent) {
      const s = context.selectedStudent;
      activeStudentContext = `Currently Inspected Lead:
- ID: ${s.id || 'N/A'}
- Name: ${s.fullName || 'N/A'} (${s.email || 'N/A'})
- University: ${s.university || 'N/A'} | Target City: ${s.targetCity || 'N/A'}
- Booking Stage: ${s.bookingStatus || 'Inquiry'}
- Weekly Budget: £${s.budgetWeekly || 0}/wk
- Assigned Sales Owner: ${s.assignedSalesOwnerName || 'Unassigned'}
- Sourcing Partner: ${s.sourcePartnerName || 'Direct'}
- Selected Property: ${s.propertyName || 'Pending selection'}`;
    }

    const statsContext = context.platformSummary
      ? `Live Platform Snapshot:
- Total Student Leads: ${context.platformSummary.totalStudents ?? 'N/A'}
- Registered B2B Partners: ${context.platformSummary.totalPartners ?? 'N/A'}
- Active Tenancy Bookings: ${context.platformSummary.totalBookings ?? 'N/A'}
- Pending Payment Verifications: ${context.platformSummary.pendingPayments ?? 'N/A'}`
      : '';

    const systemInstruction = `You are HearthAway Assistant, an intelligent operational support agent built into HearthAway (Master Accommodation Marketplace & CRM Platform).

ROLE & ATTITUDE:
- You are knowledgeable, concise, operationally helpful, and context-aware.
- Maintain a warm, polished, and professional tone suited for student housing operations, international education consultancies, and property managers.
- You remember conversation history across turns and can answer follow-ups naturally.
- When formatting, use clean Markdown bullet points, bold key terms, and short paragraphs. Keep answers scannable and direct.

CURRENT CONTEXT:
- Active User: ${userName} (Role: ${userRole}${partnerOrg !== 'None' ? `, Agency: ${partnerOrg}` : ''})
- Active Screen / Route: ${currentPath} (${pathDescription})
- ${activeStudentContext}
${statsContext ? `\n${statsContext}` : ''}

PLATFORM ARCHITECTURE & WORKFLOW RULES:
1. Roles:
   - "portfolio_owner": Oversees portfolios of B2B partners, monitors 6-month growth analytics, assigns sales owners.
   - "partner": B2B education agency submitting student accommodation leads, tracking commission payouts.
   - "sales": Engages students, negotiates tenancy agreements, manages room selection and conversion.
   - "finance": Reviews payment receipts, verifies holding deposits and remittances, oversees settlement audits.
   - "management": Executive oversight with full system-wide access and platform audit trail logs.
2. Lead Progression Stages:
   - Inquiry -> Qualified -> Room Selected -> Tenancy Agreement Sent -> Deposit Paid -> Move-in Confirmed (or Closed Lost).
3. Payment Verification:
   - Payments uploaded with proof (wire/receipt) must be verified by Finance before a booking can transition to "Move-in Confirmed".
4. Navigation & Tools:
   - Management Portfolio header includes "Global Lead Search" across all owners and "Table / Card View" toggles.
   - 6-Month Growth Analytics visualizes Lead Generation Volume vs. Tenancy Conversions.
   - Quick CSV exports are available on table headers.

Always tailor your guidance to the user's role (${userRole}) and the active screen (${currentPath}). If they ask about a specific lead or feature, leverage the provided context accurately.`;

    // Format contents for @google/genai
    const formattedContents = messages.map((m) => ({
      role: m.role === 'model' || m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: formattedContents,
      config: {
        systemInstruction,
      },
    });

    const reply = response.text || 'I could not generate a response. Please try again.';

    return NextResponse.json({
      reply,
      contextMeta: {
        role: userRole,
        route: currentPath,
        studentSelected: Boolean(context.selectedStudent),
      },
    });
  } catch (error: any) {
    console.error('Error in /api/chat route:', error);
    return NextResponse.json(
      {
        error: error?.message || 'Internal Server Error while communicating with Gemini.',
        reply: 'Sorry, I encountered an issue processing your request. Please try again in a moment.',
      },
      { status: 500 }
    );
  }
}
