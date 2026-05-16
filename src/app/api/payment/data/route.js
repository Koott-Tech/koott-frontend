import { NextResponse } from 'next/server';
import { getPaymentData } from '@/lib/paymentDataStorage';

// Mark route as dynamic (uses in-memory storage that changes)
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Return the most recent payment data
    const data = getPaymentData();
    
    if (data) {
      console.log('📤 Returning payment data:', data);
      return NextResponse.json({ success: true, data });
    } else {
      console.log('📤 No payment data found');
      return NextResponse.json({ success: false, message: 'No payment data found' });
    }
  } catch (error) {
    console.error('❌ Error getting payment data:', error);
    return NextResponse.json({ success: false, message: 'Error retrieving payment data' });
  }
}
