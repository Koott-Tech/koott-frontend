import { NextResponse } from 'next/server';

// Mark route as dynamic since it uses request.headers and request.json()
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'No authentication token provided' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { scheduledDate, scheduledTime } = body;

    if (!scheduledDate || !scheduledTime) {
      return NextResponse.json(
        { success: false, message: 'Scheduled date and time are required' },
        { status: 400 }
      );
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001/api';

    const response = await fetch(`${backendUrl}/free-assessments/book`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ scheduledDate, scheduledTime })
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });

  } catch (error) {
    console.error('Error booking free assessment:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
