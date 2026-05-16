"use client";

import React from 'react';
// import dynamic from 'next/dynamic';
// const AssessmentBookingModal = dynamic(() => import('@/components/AssessmentBookingModal'), { ssr: false });

export default function AssessmentInfoCard({ cmsData = {} }) {
  // const [open, setOpen] = React.useState(false);
  const {
    title = 'Assessment Overview',
    description = 'Our assessment package is designed to give you a clear understanding of your child’s emotional, behavioural, and learning needs.',
    sessionsInfo = 'The first session will be taken by a Consultant Psychologist to understand your child’s background, concerns, and goals, and to plan the right set of assessments.',
    detailedSessionsInfo = 'The other three sessions will be taken by a Clinical Psychologist who will conduct detailed assessments and observations to explore your child’s strengths and areas that may need support.',
    reportInfo = 'After the sessions, you’ll receive a detailed report along with clear guidance on the next steps for therapy, school, or home support.',
    paragraphs = [],
    slug,
    id, // Assessment ID from database
    assigned_doctor_ids = []
  } = cmsData;

  const infoParagraphs = (Array.isArray(paragraphs) && paragraphs.length > 0)
    ? paragraphs
    : [description, sessionsInfo, detailedSessionsInfo, reportInfo].filter(Boolean);

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 mt-8 md:mt-10">
      <div
        className="w-full text-left rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200"
      >
        <div className="p-6 md:p-8 lg:p-10">
          <div className="space-y-5">
            <h3 className="text-lg md:text-xl lg:text-2xl font-semibold text-gray-900">{title}</h3>
            <div className="space-y-3 text-sm md:text-base text-gray-700 leading-relaxed">
              {infoParagraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
            <div className="flex justify-center">
              <a
                href="https://docs.google.com/forms/d/e/1FAIpQLSdz1l5_oKJq0SkAAzaw19hRPoooXVyt9Y3zSEAGBmG9_rKfgw/viewform?usp=header"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm md:text-base font-semibold text-white shadow-sm transition-colors"
                style={{ backgroundColor: '#3f2e73' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1d1733'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#3f2e73'; }}
              >
                Book Assessment Now
              </a>
            </div>
          </div>
        </div>
      </div>
      {/* {open && (
        <AssessmentBookingModal
          open={open}
          onClose={()=> setOpen(false)}
          assessment={{
            id, // Pass assessment ID
            slug, // Pass assessment slug
            hero_title: title,
            assessment_card_title: title,
            assessment_card_description: description,
            assessment_card_sessions_info: sessionsInfo,
          }}
          doctorIds={assigned_doctor_ids}
        />
      )} */}
    </div>
  );
}


