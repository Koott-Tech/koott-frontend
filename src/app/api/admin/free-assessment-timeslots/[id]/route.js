import { NextResponse } from 'next/server';

// Mark route as dynamic since it uses request.headers, request.json(), and params
export const dynamic = 'force-dynamic';

export async function PUT(request, { params }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const { id } = await params;
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'No authentication token provided' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { timeSlot, isActive, maxBookingsPerSlot } = body;

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001/api';

    const response = await fetch(`${backendUrl}/free-assessment-timeslots/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ timeSlot, isActive, maxBookingsPerSlot })
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });

  } catch (error) {
    console.error('Error updating timeslot:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const { id } = await params;
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'No authentication token provided' },
        { status: 401 }
      );
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001/api';

    const response = await fetch(`${backendUrl}/free-assessment-timeslots/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });

  } catch (error) {
    console.error('Error deleting timeslot:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
