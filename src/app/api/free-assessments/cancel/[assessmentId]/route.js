import { NextResponse } from 'next/server';

// Mark route as dynamic since it uses request.headers and params
export const dynamic = 'force-dynamic';

export async function PUT(request, { params }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const { assessmentId } = params;
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'No authentication token provided' },
        { status: 401 }
      );
    }

    if (!assessmentId) {
      return NextResponse.json(
        { success: false, message: 'Assessment ID is required' },
        { status: 400 }
      );
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001/api';

    const response = await fetch(`${backendUrl}/free-assessments/cancel/${assessmentId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });

  } catch (error) {
    console.error('Error cancelling free assessment:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
