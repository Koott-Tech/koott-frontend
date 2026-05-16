import { NextResponse } from 'next/server';

// Mark route as dynamic since it uses request.headers and params
export const dynamic = 'force-dynamic';

export async function DELETE(request, { params }) {
  try {
    const { date } = params;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'No authentication token found' },
        { status: 401 }
      );
    }

    if (!date) {
      return NextResponse.json(
        { success: false, message: 'Date parameter is required' },
        { status: 400 }
      );
    }

    // Determine backend URL based on environment
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001/api';

    const response = await fetch(`${backendUrl}/free-assessment-timeslots/date-config/${date}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to delete date configuration' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Date config delete error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}


