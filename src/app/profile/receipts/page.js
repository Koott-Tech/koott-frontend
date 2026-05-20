'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, Download, Receipt, Clock, CreditCard } from 'lucide-react';
import { useNotification } from '@/contexts/NotificationContext';
import { clientApi } from '@/lib/backendApi';
import WheelPagination from '@/components/ui/wheel-pagination';

export default function ReceiptsPage() {
  const { user, token, isLoading: authLoading } = useAuth();
  const { showError } = useNotification();
  const [receipts, setReceipts] = useState([]);
  const [allReceipts, setAllReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    if (!authLoading) {
      if (token && user) {
        fetchReceipts();
      } else if (!token) {
        setError('No authentication token found. Please login again.');
        setLoading(false);
      }
    }
  }, [token, user, authLoading]);

  useEffect(() => {
    // Update displayed receipts when page or allReceipts changes
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setReceipts(allReceipts.slice(startIndex, endIndex));
  }, [currentPage, allReceipts]);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      
      const data = await clientApi.getReceipts();

      if (data.success) {
        setAllReceipts(data.data || []);
        // Initial page will be set by useEffect
      } else {
        setError(data.message || 'Failed to fetch receipts');
      }
    } catch (err) {
      console.error('Error fetching receipts:', err);
      setError('Failed to load receipts');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const downloadReceipt = async (receipt) => {
    try {
      // Use receipt.id if available, otherwise fallback to receipt.receipt_id or session_id
      const receiptId = receipt.id || receipt.receipt_id || receipt.session_id;
      
      if (!token) {
        showError('No authentication token found. Please login again.', 'Authentication Required');
        return;
      }

      // If file_url is directly available (legacy receipts), use it
      if (receipt.file_url) {
        window.open(receipt.file_url, '_blank');
        return;
      }

      // Otherwise, fetch the PDF from the backend API
      const result = await clientApi.downloadReceipt(receiptId);

      // Check if we got a blob (new system - PDF generated on-demand)
      if (result.success && result.blob && result.contentType === 'application/pdf') {
        // Create a blob URL and trigger download
        const url = window.URL.createObjectURL(result.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Receipt-${receipt.receipt_number || receiptId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else if (result.success && (result.data?.downloadUrl || result.downloadUrl)) {
        // Legacy system: Use download URL
        const downloadUrl = result.data?.downloadUrl || result.downloadUrl;
        window.open(downloadUrl, '_blank');
      } else {
        showError(result?.message || 'Failed to download receipt', 'Download Failed');
      }
    } catch (err) {
      console.error('❌ Error downloading receipt:', err);
      showError('Failed to download receipt. Please try again.', 'Download Error');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="absolute inset-0 w-full flex items-center justify-center z-10" style={{ minHeight: 'calc(100vh - 8rem)' }}>
        <div className="flex flex-col items-center justify-center text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mb-4" style={{ borderBottomColor: '#025545' }}></div>
          <p className="text-gray-600">Loading receipts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 text-red-500 mx-auto text-4xl mb-4">❌</div>
          <h6 className="text-gray-900 mb-4">Error</h6>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={fetchReceipts}
            className="text-white py-2 px-4 rounded-lg transition-colors"
            style={{ backgroundColor: '#025545' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#012f23'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#025545'}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h5 className="text-gray-900 mb-2">Payment Receipts</h5>
        </div>
        <Receipt className="h-8 w-8" style={{ color: '#025545' }} />
      </div>
      {allReceipts.length === 0 ? (
        <div className="text-center py-12">
          <Receipt className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h6 className="text-gray-900 mb-2">No receipts found</h6>
          <p className="text-gray-600">
            Receipts will appear here after you complete a paid session.
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {receipts.map((receipt) => (
            <div key={receipt.id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <div className="flex flex-col gap-4">
                {/* Header Section */}
                <div className="flex items-center gap-4">
                  <div className="bg-green-100 p-3 rounded-lg flex-shrink-0">
                    <Receipt className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h6 className="font-semibold text-gray-900 truncate">
                      Session with {receipt.psychologist_name}
                    </h6>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {receipt.session_type === 'package' && receipt.package_session_count
                        ? `Package of ${receipt.package_session_count}`
                        : 'Individual'}
                    </p>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500">Session Date</p>
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {formatDate(receipt.session_date)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500">Session Time</p>
                      <p className="text-sm font-medium text-gray-900">
                        {formatTime(receipt.session_time)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <CreditCard className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500">Amount Paid</p>
                      <p className="text-sm font-medium text-green-600">
                        ₹{receipt.amount}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer Section */}
                <div className="border-t pt-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-3">
                    <button
                      onClick={() => downloadReceipt(receipt)}
                      className="flex items-center gap-2 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium w-full sm:w-auto justify-center"
                      style={{ backgroundColor: '#025545' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#012f23'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#025545'}
                    >
                      <Download className="h-4 w-4" />
                      Download Receipt
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Pagination Controls */}
      {Math.ceil(allReceipts.length / itemsPerPage) > 1 && receipts.length > 0 && (
        <div className="flex items-center justify-center mt-8 pt-6 border-t border-gray-200">
          <WheelPagination
            totalPages={Math.ceil(allReceipts.length / itemsPerPage)}
            visibleCount={7}
            currentPage={currentPage - 1}
            onPageChange={(page) => {
              setCurrentPage(page + 1);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="bg-white"
          />
        </div>
      )}
    </div>
  );
}
