'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { XCircle, AlertTriangle } from 'lucide-react';
import { useNotification } from '../../../contexts/NotificationContext';

export default function PaymentFailure() {
  const router = useRouter();
  const { showError, showInfo } = useNotification();
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      // Get URL parameters safely
      const urlParams = new URLSearchParams(window.location.search);
      const razorpay_order_id = urlParams.get('razorpay_order_id');
      const error_description = urlParams.get('error_description');
      const error_reason = urlParams.get('error_reason');

      console.log('🔍 Payment Failure Params:', { razorpay_order_id, error_description, error_reason });

      if (razorpay_order_id) {
        const details = {
          orderId: razorpay_order_id,
          errorMessage: error_description || error_reason || 'Payment failed'
        };

        setPaymentDetails(details);

        if (window.parent && window.parent !== window) {
          window.parent.postMessage(
            {
              type: 'RAZORPAY_PAYMENT_RESULT',
              status: 'failure',
              payload: details
            },
            window.location.origin
          );
        }

        if (window.opener && !window.opener.closed) {
          try {
            window.opener.postMessage(
              {
                type: 'RAZORPAY_PAYMENT_REFRESH',
                status: 'failure',
                payload: details
              },
              window.location.origin
            );
          } catch (postMessageErr) {
            console.warn('Unable to postMessage to opener on failure:', postMessageErr);
          }

          try {
            window.opener.location.reload();
          } catch (reloadErr) {
            console.warn('Unable to reload opener window on failure:', reloadErr);
          }

          setTimeout(() => {
            window.close();
          }, 1000);
        }
      } else {
        setError('Invalid payment response');
      }
    } catch (err) {
      console.error('❌ Error parsing payment response:', err);
      setError('Error processing payment response');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRetry = () => {
    router.back();
  };

  const handleContactSupport = () => {
    // You can implement contact support functionality
    showInfo('Please contact support at support@koott.com', 'Contact Support');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Processing payment status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <XCircle className="w-16 h-16 text-red-500 mx-auto" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Payment Failed
        </h1>
        
        <p className="text-gray-600 mb-6">
          We're sorry, but your payment could not be processed. Your session slot has been released.
        </p>

        {paymentDetails && (
          <div className="bg-red-50 rounded-lg p-4 mb-6">
            <div className="text-sm text-gray-600 space-y-2">
              <div className="flex justify-between">
                <span>Order ID:</span>
                <span className="font-mono text-xs">{paymentDetails.orderId}</span>
              </div>
              {paymentDetails.errorMessage && (
                <div className="text-left">
                  <span className="text-red-600 font-medium">Error:</span>
                  <p className="text-sm text-gray-700 mt-1">{paymentDetails.errorMessage}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleRetry}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Try Again
          </button>
          
          <button
            onClick={handleContactSupport}
            className="w-full bg-gray-200 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Contact Support
          </button>
          
          <button
            onClick={() => router.push('/')}
            className="w-full bg-gray-100 text-gray-600 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Back to Home
          </button>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
            <p className="text-sm text-yellow-800">
              Your session slot has been automatically released. You can try booking again.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
