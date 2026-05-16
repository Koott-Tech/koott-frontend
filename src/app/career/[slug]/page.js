'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, MapPin, Briefcase, Loader2, ExternalLink, Mail } from 'lucide-react';
import { careersApi } from '@/lib/backendApi';

export default function CareerDetailPage() {
  const params = useParams();
  const slug = params?.slug;
  const [job, setJob] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug) return;
    const fetchJob = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const resp = await careersApi.getCareerBySlug(slug);
        if (resp?.success && resp?.data) {
          setJob(resp.data);
        } else {
          setError('Job not found');
        }
      } catch (err) {
        console.error('Failed to fetch career:', err);
        setError('Unable to load this role. It may have been removed or closed.');
        setJob(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchJob();
  }, [slug]);

  if (isLoading) {
    return (
      <div className="w-full min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#3f2e73]" aria-label="Loading" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="w-full min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">{error || 'Job not found'}</p>
          <Link
            href="/career"
            className="mt-4 inline-flex items-center gap-2 text-[#3f2e73] font-medium hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to careers
          </Link>
        </div>
      </div>
    );
  }

  const parseBullets = (text) =>
    (text || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

  return (
    <div className="w-full min-h-screen bg-white">
      {/* Extra top padding so heading doesn't sit under fixed header */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-16">
        <Link
          href="/career"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-[#3f2e73] text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to careers
        </Link>

        <div className="mt-6">
          <article className="w-full rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <header className="p-6 sm:p-8">
              <div
                role="heading"
                aria-level={1}
                className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight"
              >
                {job.title}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-gray-600">
                {job.department && (
                  <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">
                    {job.department}
                  </span>
                )}
                {job.employment_type && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">
                    <Briefcase className="h-3.5 w-3.5 text-gray-500" />
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

              {job.short_description && (
                <p className="mt-4 text-sm text-gray-600 leading-6">
                  {job.short_description}
                </p>
              )}
            </header>

            <div className="border-t border-gray-200" />

            <div className="p-6 sm:p-8">
              <div className="space-y-6">
                {job.description && (
                  <section>
                    <div className="text-xs sm:text-sm font-semibold uppercase tracking-[0.14em] text-[#3f2e73]/70">
                      About
                    </div>
                    <div className="mt-1 text-sm text-gray-700 whitespace-pre-wrap leading-6">
                      {job.description}
                    </div>
                  </section>
                )}

                {job.responsibilities && parseBullets(job.responsibilities).length > 0 && (
                  <section>
                    <div className="text-xs sm:text-sm font-semibold uppercase tracking-[0.14em] text-[#3f2e73]/70">
                      Responsibilities
                    </div>
                    <ul className="mt-2 space-y-1">
                      {parseBullets(job.responsibilities).map((item, i) => (
                        <li key={i} className="flex gap-3">
                          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-gray-300 shrink-0" />
                          <span className="text-sm text-gray-700 leading-6">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {job.requirements && parseBullets(job.requirements).length > 0 && (
                  <section>
                    <div className="text-xs sm:text-sm font-semibold uppercase tracking-[0.14em] text-[#3f2e73]/70">
                      Requirements
                    </div>
                    <ul className="mt-2 space-y-1">
                      {parseBullets(job.requirements).map((item, i) => (
                        <li key={i} className="flex gap-3">
                          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-gray-300 shrink-0" />
                          <span className="text-sm text-gray-700 leading-6">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {job.benefits && parseBullets(job.benefits).length > 0 && (
                  <section>
                    <div className="text-xs sm:text-sm font-semibold uppercase tracking-[0.14em] text-[#3f2e73]/70">
                      Benefits
                    </div>
                    <ul className="mt-2 space-y-1">
                      {parseBullets(job.benefits).map((item, i) => (
                        <li key={i} className="flex gap-3">
                          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-gray-300 shrink-0" />
                          <span className="text-sm text-gray-700 leading-6">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            </div>

            {(job.application_email || job.application_url) && (
              <>
                <div className="border-t border-gray-200" />
                <div className="p-6 sm:p-8">
                  <div className="text-xs sm:text-sm font-semibold uppercase tracking-[0.14em] text-[#3f2e73]/70">
                    Apply
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    Choose one of the options below to apply.
                  </p>

                  <div className="mt-3 flex flex-col sm:flex-row gap-3">
                    {job.application_email ? (
                      <a
                        href={`mailto:${job.application_email}`}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 hover:border-[#3f2e73]/30 transition-colors"
                      >
                        Apply via email
                        <Mail className="h-4 w-4 text-gray-600" />
                      </a>
                    ) : null}

                    {job.application_url ? (
                      <a
                        href={job.application_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#3f2e73] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1d1733] transition-colors"
                      >
                        Apply on form
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : null}
                  </div>
                </div>
              </>
            )}
          </article>
        </div>
      </div>
    </div>
  );
}
