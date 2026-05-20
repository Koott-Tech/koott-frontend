"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function ResourcesTeaser() {
  const router = useRouter();

  const handleExploreClick = () => {
    router.push('/resources');
  };

  const resources = [
    {
      src: "/logo.png",
      alt: "Therapy session",
      author: "Dr. Sarah Johnson",
      date: "Updated regularly",
      title: "Understanding different therapy approaches",
      highlight: false,
    },
    {
      src: "/360_F_262015638_nxpC4t1wbe8cLiVX3eholwctgVItTqF6.webp",
      alt: "Mental health support",
      author: "Dr. Michael Chen",
      date: "Updated regularly",
      title: "Self-care strategies for mental wellness",
      highlight: false,
    },
    {
      src: "/rightside5th.png",
      alt: "Online therapy benefits",
      author: "Dr. Emily Rodriguez",
      date: "Updated regularly",
      title: "Making the most of online therapy sessions",
      highlight: true,
    },
  ];

  return (
    <section className="min-h-[100vh] w-full mt-6 md:mt-8">
      <div className="mx-auto max-w-[1400px] px-[50px] py-10 md:py-14">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-base text-gray-700 leading-tight">Therapy resources</p>
            <h3 className="mt-3" style={{ fontWeight: 500 }}>
              Tools and guides for your mental health journey
            </h3>
          </div>
          <button
            type="button"
            onClick={handleExploreClick}
            className="mt-3 inline-flex items-center rounded-full bg-gray-900 px-5 py-3 text-sm font-normal text-white hover:bg-black/90"
          >
            Explore more resources
          </button>
        </div>

        <div className="mt-16 md:mt-20 grid grid-cols-1 gap-8 md:grid-cols-3">
          {resources.map((resource) => (
            <article key={resource.title} className="group">
              <div
                className={`relative aspect-[16/9] w-full overflow-hidden rounded-2xl ${
                  resource.highlight ? "ring-8 ring-sky-100" : ""
                }`}
              >
                <Image
                  src={resource.src}
                  alt={resource.alt}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  sizes="(min-width: 1024px) 33vw, 100vw"
                />
              </div>
              <div className="mt-4 text-sm text-gray-600 leading-relaxed">
                <span>{resource.author}</span>
                <span className="px-2">•</span>
                <span>{resource.date}</span>
              </div>
              <h3 className="mt-3 font-medium text-gray-900">
                {resource.title}
              </h3>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

