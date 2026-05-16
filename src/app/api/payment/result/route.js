import { NextResponse } from 'next/server';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    console.log('🔍 Razorpay webhook POST request received');
    
    // Note: Razorpay uses webhooks for payment notifications
    // This endpoint may be used for legacy redirects or can be removed
    // Razorpay payments are handled via JavaScript callbacks in the frontend
    
    // Handle null URL gracefully
    let requestUrl = req.url;
    if (!requestUrl) {
      console.log('⚠️ Request URL is null, using fallback');
      requestUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/payment/result`;
    }
    
    console.log('🔍 Request URL:', requestUrl);
    
    // Parse Razorpay webhook data if present
    try {
      const body = await req.json();
      console.log('🔍 Razorpay Webhook Data:', body);

      // Forward to backend for processing
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001/api';
      const backendResponse = await fetch(`${backendUrl}/payment/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (backendResponse.ok) {
        console.log('✅ Backend webhook processing successful');
        return NextResponse.json({ success: true });
      } else {
        console.log('⚠️ Backend webhook processing failed');
        return NextResponse.json({ success: false }, { status: 500 });
    }
    } catch (parseError) {
      console.error('❌ Error parsing webhook data:', parseError);
      return NextResponse.json({ error: 'Invalid webhook data' }, { status: 400 });
    }
    
  } catch (error) {
    console.error('❌ Error in POST handler:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    console.log('🔍 Razorpay redirect GET request received');
    
    // Note: Razorpay typically uses JavaScript callbacks, not GET redirects
    // This endpoint is kept for legacy support or manual redirects
    
    // Validate req.url before using it
    if (!req.url) {
      console.error('❌ No URL provided in request');
      
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000' 
        : 'https://www.koott.in');
        
      return NextResponse.redirect(`${baseUrl}/payment/failure?error=no_url`, { status: 302 });
    }
    
    let url;
    try {
      url = new URL(req.url);
    } catch (urlError) {
      console.error('❌ Invalid URL in request:', req.url, urlError);
      
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000' 
        : 'https://www.koott.in');
        
      return NextResponse.redirect(`${baseUrl}/payment/failure?error=invalid_url`, { status: 302 });
    }
    
    const razorpay_order_id = url.searchParams.get('razorpay_order_id') || '';
    const razorpay_payment_id = url.searchParams.get('razorpay_payment_id') || '';
    const status = url.searchParams.get('status') || 'success';
    
    console.log('🔍 Razorpay GET Data:', { razorpay_order_id, razorpay_payment_id, status });

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000' 
        : 'https://www.koott.in');

    // Redirect to success/failure page with Razorpay parameters
    const dest = status === "success" ? "/payment/success" : "/payment/failure";
    const params = new URLSearchParams();
    if (razorpay_order_id) params.set('razorpay_order_id', razorpay_order_id);
    if (razorpay_payment_id) params.set('razorpay_payment_id', razorpay_payment_id);
    
    return NextResponse.redirect(`${baseUrl}${dest}?${params.toString()}`, { status: 302 });
    
  } catch (error) {
    console.error('❌ Error in GET handler:', error);
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3000' 
      : 'https://www.koott.in');
      
    return NextResponse.redirect(`${baseUrl}/payment/failure?error=processing`, { status: 302 });
  }
}
