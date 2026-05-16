import Image from "next/image";

export default function ResultsSplit() {
  return (
    <div className="w-full">
      <section className="w-full mt-6 md:mt-20 mb-6 md:mb-8">
                 <div className="min-h-[120vh] md:h-[100vh] w-full overflow-hidden shadow-sm">
          <div className="flex flex-col md:grid md:grid-cols-2 h-full w-full">
            {/* Left: Text + Stats */}
            <div
              className="flex flex-col justify-center px-5 sm:px-8 md:px-[80px] py-8 md:py-12 text-[#1c331d] order-1 md:order-1"
              style={{ background: "#d3e9d1" }}
            >
              <h2 className="text-3xl md:text-5xl font-medium leading-[1.1] md:leading-normal tracking-tight md:tracking-normal">
                Personalized care.
                <br />
                Proven results.
              </h2>
              <div
                className="mt-4 max-w-xl pl-4 border-l-4"
                style={{ borderColor: "#1c331d" }}
              >
                <p>
                  With LittleMinds, you're not just finding care — you're finding the
                  right care for your needs.
                </p>
              </div>

                             <div className="mt-10 grid grid-cols-2 gap-x-12 gap-y-10">
                 <StatBlock value="15,000+" label="licensed providers with diverse backgrounds and specialties" />
                 <StatBlock value="170+" label="clinical specialties and modalities offered" />
                 <StatBlock value="98%" label="find a provider that meets their unique preferences" />
                 <StatBlock value="93%" label="report feeling better about their symptoms after receiving care through LittleMinds" />
               </div>
               
                                               {/* Get Started Button */}
                <div className="mt-12 flex justify-center md:justify-start">
                  <button className="bg-[#38663a] hover:bg-[#2d4f2e] text-white font-semibold py-2.5 px-6 rounded-3xl transition-colors duration-200">
                    Get Started
                  </button>
                </div>


            </div>

                         {/* Right: Image with quote area */}
             <div className="relative order-2 md:order-2 h-[60vh] md:h-full">
              <Image
                src="/rightside5th.png"
                alt="Person enjoying a cup"
                fill
                className="object-cover"
                sizes="(min-width: 768px) 50vw, 100vw"
                priority
              />
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-8 md:p-10 pl-12 md:pl-14">
                <div className="flex gap-1 text-amber-400 text-2xl md:text-3xl">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i}>★</span>
                  ))}
                </div>
                <p
                  className="mt-3 max-w-2xl text-xl md:text-2xl leading-relaxed text-white"
                  style={{ fontFamily: 'Georgia, "Times New Roman", Times, serif' }}
                >
                  "It was easy to find the right therapist for my needs, and I love
                  seeing my therapist each week. I've seen a lot of growth in
                  myself."
                </p>
              </div>
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
      <div className="text-4xl md:text-5xl font-medium">{value}</div>
      <p className="mt-2 max-w-xs text-sm opacity-90">{label}</p>
    </div>
  );
}


