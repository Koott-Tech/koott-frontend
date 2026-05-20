"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../contexts/AuthContext";
import { clientApi } from "../../../lib/backendApi";
import { FileText } from "lucide-react";
import WheelPagination from "../../../components/ui/wheel-pagination";
import { formatCurrency } from "../../../lib/utils";
import { normalizeImageUrl } from "@/utils/urlNormalizer";

export default function PackagesPage() {
  const { user, hasRole } = useAuth();
  const router = useRouter();
  const [clientPackages, setClientPackages] = useState([]);
  const [allPackages, setAllPackages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  // Store all booked sessions to check if package has booked sessions
  const [bookedSessions, setBookedSessions] = useState([]);

  useEffect(() => {
    loadPackages();
    loadBookedSessions();
  }, []);

  // Load booked sessions to check if packages have booked sessions
  const loadBookedSessions = async () => {
    try {
      const sessionsData = await clientApi.getSessions({ status: 'upcoming', page: 1, limit: 1000 });
      const sessions = sessionsData.data?.sessions || [];
      setBookedSessions(sessions);
      return sessions;
    } catch (err) {
      console.error('Error loading booked sessions for packages page:', err);
      setBookedSessions([]);
      return [];
    }
  };

  // Check if package has any booked/pending sessions
  const hasBookedSessionsForPackage = (packageId) => {
    if (!packageId) return false;
    return bookedSessions.some(s => {
      return s.package_id === packageId && 
        s.status !== 'completed' && 
        s.status !== 'no_show' && s.status !== 'noshow' &&
        s.status !== 'cancelled' &&
        ['booked', 'scheduled', 'reschedule_requested', 'rescheduled'].includes(s.status);
    });
  };

  useEffect(() => {
    // Update displayed packages when page or allPackages changes
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setClientPackages(allPackages.slice(startIndex, endIndex));
  }, [currentPage, allPackages]);

  const loadPackages = async () => {
    try {
      setIsLoading(true);
      if (hasRole('client')) {
        // Load packages and booked sessions in parallel
        const [packagesData] = await Promise.all([
          clientApi.getClientPackages(),
          loadBookedSessions().catch(err => {
            console.error('Error loading booked sessions:', err);
            return [];
          }) // Reload booked sessions to keep check accurate
        ]);
        const rawPackages = packagesData.data?.clientPackages || [];
        const normalized = rawPackages.map(pkg => {
          const totalSessions = Number.isFinite(pkg.total_sessions)
            ? pkg.total_sessions
            : Number(pkg.package?.session_count) || 0;

          const remainingSessions = Number.isFinite(pkg.remaining_sessions)
            ? pkg.remaining_sessions
            : Math.max(totalSessions - 1, 0);

          return {
            ...pkg,
            total_sessions: totalSessions,
            remaining_sessions: remainingSessions
          };
        });
        setAllPackages(normalized);
        // Initial page will be set by useEffect
      }
    } catch (err) {
      console.error('Error loading packages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="absolute inset-0 w-full flex items-center justify-center z-10" style={{ minHeight: 'calc(100vh - 8rem)' }}>
        <div className="flex flex-col items-center justify-center text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mb-4" style={{ borderBottomColor: '#025545' }}></div>
          <p className="text-gray-600">Loading packages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6">
      <h5 className="text-gray-900 mb-6">My Packages</h5>
      {allPackages.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h6 className="text-gray-900 mb-2">No packages purchased yet</h6>
          <p className="text-gray-600">You can browse therapists and purchase packages from the guide page.</p>
          <button
            onClick={() => router.push('/online-child-psychologist')}
            className="mt-4 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200"
            style={{ backgroundColor: '#025545' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#012f23'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#025545'}
          >
            Browse Therapists
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {clientPackages.map((pkg) => (
            <div key={pkg.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex gap-4 items-start">
                {/* Avatar - Left Side */}
                {pkg.psychologist && (
                  <div className="flex-shrink-0 w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200">
                    {pkg.psychologist.cover_image_url ? (
                      <img 
                        src={normalizeImageUrl(pkg.psychologist.cover_image_url)}
                        alt={`${pkg.psychologist.first_name} ${pkg.psychologist.last_name}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white font-semibold text-2xl">
                        {pkg.psychologist.first_name?.[0]}{pkg.psychologist.last_name?.[0]}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Package Details */}
                <div className="flex-1 flex justify-between items-start">
                  <div>
                    {/* Doctor Name - First */}
                    {pkg.psychologist && (
                      <p className="font-semibold text-gray-900 mb-2" style={{ fontSize: '1rem' }}>
                        {pkg.psychologist.first_name} {pkg.psychologist.last_name}
                      </p>
                    )}
                    {/* Package Name */}
                    {pkg.package?.name && (
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Package:</span> {pkg.package.name}
                      </p>
                    )}
                    <div className="mt-2">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Total Sessions:</span> {pkg.total_sessions}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Remaining:</span> 
                        <span className={`ml-1 ${pkg.remaining_sessions > 0 ? 'text-[#025545]' : 'text-red-600'}`}>
                          {pkg.remaining_sessions}
                        </span>
                      </p>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Purchased: {new Date(pkg.purchased_at).toLocaleDateString()}
                    </p>
                  </div>
                  
                  {/* Right Side - Total Amount and Package Status */}
                  <div className="flex flex-col gap-2 ml-4 text-right">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Total Amount:</span> {formatCurrency(pkg.total_amount, pkg.currency)}
                    </p>
                    <span className="text-gray-500 text-sm px-3 py-2 bg-gray-100 rounded-lg">
                      {pkg.remaining_sessions > 0 && hasBookedSessionsForPackage(pkg.id) ? 'Complete booked sessions first' : 
                       pkg.remaining_sessions > 0 ? `${pkg.remaining_sessions} session${pkg.remaining_sessions !== 1 ? 's' : ''} remaining` :
                       'No sessions remaining'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Pagination Controls */}
      {Math.ceil(allPackages.length / itemsPerPage) > 1 && clientPackages.length > 0 && (
        <div className="flex items-center justify-center mt-8 pt-6 border-t border-gray-200">
          <WheelPagination
            totalPages={Math.ceil(allPackages.length / itemsPerPage)}
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

