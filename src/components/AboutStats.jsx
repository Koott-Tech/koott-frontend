"use client";

import Image from "next/image";

export default function AboutStats() {
  return (
    <div className="w-full">
      <style jsx>{`
        @media (min-width: 768px) and (max-width: 1180px) and (max-height: 1180px) {
          .about-stats-container {
            min-height: 90vh !important;
            height: 90vh !important;
          }
          .about-stats-left {
            padding-left: 40px !important;
            padding-right: 40px !important;
            padding-top: 40px !important;
            padding-bottom: 40px !important;
          }
          .about-stats-title {
            font-size: 2rem !important;
            letter-spacing: -0.125rem !important;
            line-height: 1.1 !important;
          }
          .about-stats-description {
            letter-spacing: normal !important;
            font-size: 0.9rem !important;
            line-height: 1.5 !important;
          }
          .about-stats-grid {
            gap: 20px 24px !important;
          }
          .about-stats-button {
            letter-spacing: normal !important;
            font-size: 13px !important;
            padding: 10px 20px !important;
          }
          .about-stats-stat-value {
            font-size: 1.5rem !important;
            line-height: 1.2 !important;
          }
          .about-stats-stat-value.text-4xl,
          .about-stats-stat-value.text-5xl {
            font-size: 1.5rem !important;
          }
          .about-stats-stat-label {
            letter-spacing: normal !important;
            font-size: 13px !important;
            line-height: 1.4 !important;
          }
        }
      `}</style>
      <section className="w-full mt-24">
        <div className="about-stats-container min-h-[120vh] md:h-[100vh] w-full overflow-hidden shadow-sm">
          <div className="flex flex-col md:grid md:grid-cols-2 h-full w-full">
            {/* Left: Text + Stats */}
            <div
              className="about-stats-left flex flex-col justify-center px-5 sm:px-8 md:px-[100px] lg:px-[120px] py-8 md:py-12 text-[#1c331d] order-1 md:order-1"
              style={{ background: "#d3e9d1" }}
            >
              <h2 
                className="about-stats-title text-[2.5rem] md:text-[3.75rem] font-medium leading-[110%] md:leading-[106%] tracking-[-0.125rem] md:tracking-[-0.195rem]"
                style={{
                  color: '#1c331d',
                  letterSpacing: '-65px'
                }}
              >
                We Care A Lot
              </h2>
              <div
                className="mt-4 max-w-xl"
              >
                <p className="about-stats-description" style={{ letterSpacing: '-65px' }}>
                 Every number here tells a story of trust, healing, and care that reached a little farther.

                </p>
              </div>

              <div className="about-stats-grid mt-10 grid grid-cols-2 gap-x-12 gap-y-10">
                <StatBlock value="14,000+" label="Session hours completed with care" />
                <StatBlock value="4,500 +" label="families" />
                <StatBlock value="10,500+" label="individuals took their first step with us" />
                <StatBlock value="90%" label=" of parents notices positive changes within months" />
              </div>

              {/* Find Care Button */}
              <div className="mt-8 flex justify-center md:justify-start">
                <button className="about-stats-button px-25 md:px-8 py-2 bg-[#1c331d] text-white font-medium rounded-full hover:bg-[#152a18] transition-colors duration-200 shadow-lg" style={{ letterSpacing: '-65px' }}>
                  Find care that fits your child
                </button>
              </div>
            </div>

            {/* Right: Image */}
            <div className="relative order-2 md:order-2 h-[60vh] md:h-full">
              <Image
                src="/Aboutus 2.webp"
                alt="Child and family receiving mental health care and support from MyKoott"
                fill
                className="object-cover"
                sizes="(min-width: 768px) 50vw, 100vw"
                priority
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatBlock({ value, label }) {
  return (
    <div className="pl-3 border-l border-[#1c331d]">
      <div className="about-stats-stat-value text-4xl lg:text-5xl font-medium">{value}</div>
      <p className="about-stats-stat-label mt-2 max-w-xs text-sm opacity-90" style={{ letterSpacing: '-65px' }}>{label}</p>
    </div>
  );
}
