import React from 'react';
import Image from 'next/image';

export default function WhyWereHere() {
  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 767px) {
          h1.why-were-here-heading {
            line-height: 1.0 !important;
          }
        }
      `}} />
    <section className="w-full px-4 bg-white mt-24">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left Section - Text Content */}
          <div className="space-y-6">
            <h1 className="font-medium text-black why-were-here-heading">
             We started with a wish <br /> to care a little deeper
            </h1>
            
            <div className="space-y-6 text-[1.125rem] md:text-base text-gray-700 leading-[150%] md:leading-relaxed tracking-[-0.03375rem] md:tracking-tight">
              <p>
                MyKoott was born from a simple truth — children deserve a space where their emotions
                are heard, understood, and cared for. As part of the MyKoott family, we saw how many
                families struggled to find the right kind of mental health support for their children.
                That’s when we decided to build something just for them.
              </p>

              <p>
                We started MyKoott to make mental health care for children warm, accessible, and backed
                by science. From early assessments to child counseling and parenting guidance, every step we
                take is rooted in compassion and evidence-based care.
              </p>

              <p>
                For us, this isn’t just another initiative — it’s a promise.
              </p>

              <p>
                A promise to help every child grow with calm minds, kind hearts, and a MyKoott.
              </p>

              <p>
                Thank you for trusting us to be part of your child’s journey.
              </p>
            </div>
          </div>

          {/* Right Section - Image */}
          <div className="relative w-full h-full">
            <div className="relative w-full aspect-square rounded-2xl">
              <div className="absolute inset-8 rounded-xl overflow-hidden">
                <Image
                  src="/About Us Card 1.webp"
                  alt="MyKoott team illustration - caring deeper for children's mental health and emotional wellbeing"
                  fill
                  className="object-contain"
                  sizes="(min-width: 768px) 50vw, 100vw"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
    </>
  );
}
