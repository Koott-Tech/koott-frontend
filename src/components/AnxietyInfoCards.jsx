"use client";

import Link from "next/link";

export default function AnxietyInfoCards() {
  const items = [
    {
      icon: "speech-bubble",
      iconColor: "purple",
      title: "ADHD → Why ADHD Isn't Laziness: Changing the Way We See Kids",
      description:
        "Understand ADHD beyond stereotypes and learn how support and structure help kids thrive.",
      cta: "Learn more",
    },
    {
      icon: "clipboard",
      iconColor: "green",
      title:
        "Depression → How to Talk to Your Child About Sadness and Mental Health",
      description:
        "Gentle ways to start conversations about feelings and support your child's wellbeing.",
      cta: "Read guide",
    },
    {
      icon: "handshake",
      iconColor: "orange",
      title:
        "Behavioural Issues → Understanding What's Behind Your Child's Anger and Tantrums",
      description:
        "Explore the root causes and learn practical strategies to respond with calm and care.",
      cta: "See strategies",
    },
  ];

  const iconMap = {
    "speech-bubble": (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-6 h-6"
      >
        <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
      </svg>
    ),
    clipboard: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-6 h-6"
      >
        <rect x="8" y="2" width="8" height="4" rx="1" />
        <path d="M16 4h1a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h1" />
      </svg>
    ),
    handshake: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-6 h-6"
      >
        <path d="M12 5l3 3-3 3-3-3z" />
        <path d="M2 12h5l5 5 5-5h5" />
      </svg>
    ),
  };

  const colorMap = {
    purple: "text-indigo-700",
    green: "text-emerald-700",
    orange: "text-amber-700",
  };

  return (
    <section className="w-full py-10">
      <div className="mx-auto max-w-[1200px] px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-gray-200 bg-white p-5 md:p-6"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50 ${colorMap[item.iconColor]}`}
                >
                  {iconMap[item.icon]}
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-medium text-gray-900">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-gray-600">
                    {item.description}
                  </p>
                  <div className="mt-3">
                    <button className="text-sm font-semibold text-[#38663a] hover:text-[#2d4f2e] inline-flex items-center gap-1">
                      {item.cta}
                      <span>→</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 text-center">
          <Link href="#" className="text-sm font-semibold text-gray-900">
            Explore More Child Therapy Options Online
          </Link>
        </div>
      </div>
    </section>
  );
}


