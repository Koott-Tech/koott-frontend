"use client";
import Image from "next/image";

export default function FeatureCards() {
  const cards = [
    {
      src: "/logo.png",
      title: "Accessible Anywhere",
      description: "Connect with licensed experts from the comfort of your home.",
    },
    {
      src: "/360_F_262015638_nxpC4t1wbe8cLiVX3eholwctgVItTqF6.webp",
      title: "Simple Scheduling",
      description: "Book, reschedule, and manage sessions in just a few clicks.",
    },
    {
      src: "/rightside5th.png",
      title: "Personalized Plans",
      description: "Care plans tailored to your needs and your pace.",
    },
  ];

  return (
    <section className="mt-20 md:mt-24">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex flex-col md:flex-row justify-center items-center gap-8 md:gap-12">
          {cards.map((card, index) => (
            <div key={`${card.title}-${index}`} className="flex-shrink-0 w-full md:w-auto">
              <div className="flex h-[450px] w-full md:w-[370px] md:min-w-[350px] flex-col rounded-2xl border border-gray-200 bg-white shadow-sm">
                {/* Top: Image (60% height) */}
                <div className="relative h-[60%] w-full overflow-hidden rounded-t-2xl">
                  <Image
                    src={card.src}
                    alt={card.title}
                    fill
                    className="object-cover"
                    sizes="360px"
                    priority={false}
                  />
                </div>

                {/* Bottom: Content (40% height) */}
                <div className="flex h-[40%] flex-col p-8">
                  <h3 className="text-lg font-semibold text-gray-900">{card.title}</h3>
                  <p className="mt-3 text-base text-gray-600 leading-relaxed">{card.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


