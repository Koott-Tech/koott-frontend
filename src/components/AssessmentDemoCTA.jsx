"use client";

import Image from "next/image";

export default function AssessmentDemoCTA() {
  return (
    <section className="bg-emerald-50/50 border-t border-emerald-100">
      <div className="max-w-6xl mx-auto px-4 py-16 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <h6 className="font-bold text-gray-900 mb-4">Let us show you around</h6>
            <p className="text-gray-700 mb-6">
              We’d love to walk you through the platform we built with therapists' needs in mind.
            </p>
            <a href="/online-child-psychologist" className="inline-flex items-center rounded-full bg-emerald-700 text-white px-6 py-3 hover:bg-emerald-800 transition-colors">
              Meet with us
            </a>
          </div>
          <div className="relative">
            <div className="rounded-xl overflow-hidden shadow-sm ring-1 ring-gray-200">
              <Image
                src="/heroo.webp"
                alt="Platform preview"
                width={1200}
                height={700}
                className="w-full h-auto"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


