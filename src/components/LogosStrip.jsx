"use client";
import Image from "next/image";

export default function LogosStrip({ bgColor = "bg-white", height = "py-8", logosCount = 8, swapSecondThird = false }) {
  
  // Check if using dark background to determine text and logo colors
  const isDarkBg = bgColor !== "bg-white";
  const textColor = isDarkBg ? "text-white" : "text-gray-700";
  const logoFilter = isDarkBg ? "brightness-0 invert" : "";

  // Logo array
  const allLogos = [
    "University of Hyd.webp",
    "Christ University.webp",
    "Delhi University.webp",
    "calicut.webp",
    "Manipal University.webp",
    "Pondichery University.webp",
    "umr-logo.png",
    "anthem_logo_blue.svg",
  ];

  // Slice to get only the requested number of logos
  let logosToShow = allLogos.slice(0, logosCount);
  if (swapSecondThird && logosToShow.length >= 3) {
    const temp = logosToShow[1];
    logosToShow[1] = logosToShow[2];
    logosToShow[2] = temp;
  }

  // Duplicate logos for seamless infinite scroll (mobile only)
  const loopLogos = [...logosToShow, ...logosToShow, ...logosToShow];

  return (
         <section className={`w-full ${bgColor} ${height} mt-0`}>
      <style jsx>{`
        @media (max-width: 767px) {
          .logo-marquee {
            display: flex;
            gap: 0;
            width: max-content;
            animation: scroll-left 20s linear infinite;
          }
          .logo-marquee:hover { animation-play-state: paused; }
        }
        @keyframes scroll-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
       <div className="flex flex-col lg:flex-row items-center justify-between gap-2 lg:gap-8 px-2 sm:px-4 lg:px-[70px]">
                 {/* Text Section - Left aligned on both mobile and desktop */}
          <div className="flex flex-col items-center lg:items-start gap-2 order-1 lg:order-1">
                     <div className="text-center lg:text-left">
             <p className={`text-sm font-normal ${textColor} leading-[1.5] m-0`}>
               Industry experts from <br className="hidden lg:inline" /> renowned universities.
             </p>
           </div>
         </div>
         
                                    {/* Logo Grid - Center on mobile, centered on laptop */}
          <div className="flex flex-col lg:flex-row items-center lg:items-center lg:justify-center lg:flex-1 order-2 lg:order-2">
                        <div className="hidden md:flex md:flex-nowrap items-center justify-center gap-6">
              {logosToShow.map((src) => (
                <div key={src} className="flex-shrink-0">
                  <Image
                    src={`/${src}`}
                    alt={`${src.replace('-logo-1.png', '').replace('-logo.png', '').replace('_', '').replace('.svg', '')} logo`}
                    width={144}
                    height={56}
                    className={`h-14 w-auto object-contain ${logoFilter}`}
                    style={{ height: 'auto' }}
                  />
                </div>
              ))}
            </div>
            
                                                   {/* Mobile Logo Carousel - Infinite scroll */}
              <div className="md:hidden w-full overflow-hidden">
                <div className="logo-marquee">
                  {loopLogos.map((src, idx) => (
                    <div key={`${src}-${idx}`} className="flex items-center justify-center flex-shrink-0 min-w-[100px] p-0">
                        <Image
                          src={`/${src}`}
                          alt={`${src.replace('-logo-1.png', '').replace('-logo.png', '').replace('_', '').replace('.svg', '')} logo`}
                          width={144}
                          height={56}
                          className={`h-12 sm:h-14 w-auto object-contain ${logoFilter}`}
                          style={{ height: 'auto' }}
                        />
                      </div>
                    ))}
                </div>
              </div>
              
              {/* About us text - under logos on mobile/tablet, to the right on laptop */}
              <div className="mt-2 lg:mt-0 lg:ml-8 w-full lg:w-auto flex justify-center lg:justify-start">
                <a href="/about" className={`text-sm font-medium ${textColor} leading-[1.5] hover:opacity-80 transition-opacity`}>About us →</a>
              </div>
         </div>
      </div>
    </section>
  );
}
