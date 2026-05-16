import { NextResponse } from 'next/server';

// Mark route as dynamic since it uses request.headers and request.url
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    // Validate request.url before using it
    if (!request.url) {
      return NextResponse.json(
        { success: false, message: 'Invalid request URL' },
        { status: 400 }
      );
    }
    
    let searchParams;
    try {
      const url = new URL(request.url);
      searchParams = url.searchParams;
    } catch (urlError) {
      console.error('❌ Invalid URL in request:', request.url, urlError);
      return NextResponse.json(
        { success: false, message: 'Invalid request URL format' },
        { status: 400 }
      );
    }
    
    const date = searchParams.get('date');
    
    if (!date) {
      return NextResponse.json(
        { success: false, message: 'Date parameter is required' },
        { status: 400 }
      );
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001/api';

    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${backendUrl}/free-assessments/available-slots?date=${date}`, {
      headers
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });

  } catch (error) {
    console.error('Error fetching available time slots:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
