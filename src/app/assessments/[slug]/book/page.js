import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function fetchAssessment(slug) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/assessments/${slug}`, {
      cache: 'no-store'
    });
    if (response.ok) {
      const data = await response.json();
      if (data.success) return data.message;
    }
  } catch (_) {}
  return null;
}

export default async function AssessmentBookingPage({ params }) {
  const { slug } = await params;
  const data = await fetchAssessment(slug);
  if (!data) return notFound();

  const title = data?.hero_title || (slug ? slug.replace(/[-_]/g, ' ') : 'Assessment');
  const description = data?.assessment_card_description || data?.hero_subtext || '';
  const sessionsInfo = data?.assessment_card_sessions_info;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
      <div className="h-6 md:h-8" />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left: Assessment details */}
        <div className="lg:col-span-3">
          <h4 className="mb-3">{title}</h4>
          {description && (
            <p className="leading-relaxed mb-4">{description}</p>
          )}
          {sessionsInfo && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              {sessionsInfo}
            </div>
          )}
        </div>

        {/* Right: Booking calendar placeholder (to mirror therapist profile) */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5 md:p-6">
            <h6 className="mb-3">Select date and time</h6>
            <p>This booking calendar will mirror the therapist profile calendar. For now, please select an assessment from the header or go back and choose a therapist to continue.</p>
          </div>
        </div>
      </div>
    </div>
  );
}


