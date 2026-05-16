import { NextResponse } from 'next/server';

// Mark route as dynamic since it uses request.headers and request.json()
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'No authentication token found' },
        { status: 401 }
      );
    }

    // Determine backend URL based on environment
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001/api';

    const response = await fetch(`${backendUrl}/free-assessment-timeslots/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to create timeslots' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Bulk timeslot creation error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}


