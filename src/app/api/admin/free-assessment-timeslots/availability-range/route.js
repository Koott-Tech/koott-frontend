import { NextResponse } from 'next/server';

// Mark route as dynamic since it uses request.url and request.headers
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
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
    
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'No authentication token found' },
        { status: 401 }
      );
    }

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, message: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    // Determine backend URL based on environment
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001/api';

    const response = await fetch(`${backendUrl}/free-assessment-timeslots/availability-range?startDate=${startDate}&endDate=${endDate}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to fetch availability' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Admin availability range error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}


