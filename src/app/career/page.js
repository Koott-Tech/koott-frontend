'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Briefcase, MapPin, Loader2, ArrowRight, Search, Sparkles } from 'lucide-react';
import { careersApi } from '@/lib/backendApi';

export default function CareerPage() {
  const [jobs, setJobs] = useState([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const resp = await careersApi.getCareers({ status: 'open' });
        if (resp?.success && resp?.data?.careers) {
          setJobs(resp.data.careers);
        } else {
          setJobs([]);
        }
      } catch (err) {
        console.error('Failed to fetch careers:', err);
        setError('Unable to load open positions. Please try again later.');
        setJobs([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchJobs();
  }, []);

  if (isLoading) {
    return (
      <div className="w-full min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#025545]" aria-label="Loading" />
      </div>
    );
  }

  const q = query.trim().toLowerCase();
  const filteredJobs = q
    ? jobs.filter((job) => {
        const hay = [
          job?.title,
          job?.short_description,
          job?.department,
          job?.location,
          job?.employment_type,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      })
    : jobs;

  return (
    <div className="w-full min-h-screen bg-white">
      {/* Extra top padding so heading doesn't sit under fixed header */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-16">
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-b from-gray-50 to-white">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[#025545]/10 blur-3xl" />
            <div className="absolute -bottom-28 -left-16 h-72 w-72 rounded-full bg-gray-200/40 blur-3xl" />
          </div>

          <div className="relative p-6 sm:p-10">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-[#025545]">
              <Sparkles className="h-4 w-4" />
              We’re hiring
            </div>
            <h1 className="mt-2 text-3xl sm:text-4xl font-semibold text-gray-900 tracking-tight">
              Careers
            </h1>
            <p className="mt-3 max-w-2xl text-sm sm:text-base text-gray-600">
              Explore open roles and join our team.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search roles by title, department, or location…"
                  className="w-full rounded-xl border border-gray-200 bg-white/80 px-10 py-3 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#025545]/30"
                />
              </div>
              <div className="text-xs text-gray-500">
                {filteredJobs.length} role{filteredJobs.length === 1 ? '' : 's'}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="mt-8">
          {filteredJobs.length === 0 && !error ? (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-10 sm:p-12 text-center">
              <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <div
                role="heading"
                aria-level={2}
                className="text-lg sm:text-xl font-semibold text-gray-900"
              >
                No open positions right now
              </div>
              <p className="mt-2 text-sm text-gray-600">
                Keep an eye out for new updates.
              </p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredJobs.map((job) => (
                <li key={job.id}>
                  <Link
                    href={`/career/${job.slug}`}
                    className="group block h-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-[#025545]/25 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div
                          role="heading"
                          aria-level={2}
                          className="text-xl sm:text-2xl font-semibold text-gray-900 group-hover:text-[#025545] transition-colors"
                        >
                          {job.title}
                        </div>
                        {job.short_description && (
                          <div className="mt-1">
                            <p className="text-[13px] leading-5 text-gray-600 line-clamp-3">
                              {job.short_description}
                            </p>
                            <div className="mt-1 text-[13px] font-medium text-[#025545]">
                              Read more
                            </div>
                          </div>
                        )}
                      </div>
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-[#025545] shrink-0">
                        View
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                      {job.department && (
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">
                          {job.department}
                        </span>
                      )}
                      {job.employment_type && (
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">
                          {job.employment_type}
                        </span>
                      )}
                      {job.location && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">
                          <MapPin className="h-3.5 w-3.5 text-gray-500" />
                          {job.location}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
