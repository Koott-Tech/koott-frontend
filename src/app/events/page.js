/**
 * Events listing — static cards; detail pages under /events/...
 * Styling: Tailwind + semantic headings as role="heading" to avoid globals.css h1–h6 overrides.
 */
import Link from "next/link";
import Image from "next/image";
import LeadershipMembersShowcase from "@/components/LeadershipMembersShowcase";
import { Calendar, ChevronDown, Clock, MonitorPlay } from "lucide-react";
import {
  BLOG_TYPOGRAPHY_ROOT_CLASS,
  BLOG_TYPOGRAPHY_ROOT_CSS,
  BLOG_LETTER_SPACING_CLASS,
  BLOG_UI_LINE_HEIGHT_CLASS,
  BLOG_FEATURED_TITLE_CLASS,
  BLOG_FEATURED_TITLE_STYLE,
  BLOG_CARD_TITLE_CLASS,
  BLOG_CARD_TITLE_STYLE,
  BLOG_SECTION_HEADING_CLASS,
  BLOG_SECTION_HEADING_STYLE,
  HERO_DISPLAY_HEADING_CLASS,
  HERO_DISPLAY_HEADING_STYLE,
  HERO_BODY_TEXT_CLASS,
  HERO_BODY_TEXT_STYLE,
} from "@/constants/heroTypography";

import { SUMMER_WORKSHOP_2026_HERO_IMAGE } from "@/data/summerWorkshop2026Assets";

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001/api";

async function getPublishedEventCards() {
  try {
    const res = await fetch(`${BACKEND_BASE_URL}/event-pages/public?limit=24`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const json = await res.json().catch(() => null);
    const rows = Array.isArray(json?.data) ? json.data : [];

    return rows.map((row) => {
      const cms = row?.cms_data || {};
      const listCard = cms?.eventListCard || {};
      const details = Array.isArray(cms?.sessionBanner?.details) ? cms.sessionBanner.details : [];
      const date = cms.date || details.find((d) => String(d?.label || "").toLowerCase().includes("date"))?.value || "";
      const time = cms.time || details.find((d) => String(d?.label || "").toLowerCase().includes("time"))?.value || "";
      const schedule = String(listCard?.scheduleText || "").trim() || [date, time].filter(Boolean).join(" at ");
      const slug = row?.slug || "";
      return {
        id: row?.id || slug,
        category: cms.method || listCard?.category || cms?.whatIsThis?.eyebrow || "Family Workshop",
        title: cms.topic || listCard?.title || cms?.sessionBanner?.title || cms?.hero?.title || row?.seo_title || "Event",
        description: cms.speaker ? `Speaker: ${cms.speaker}` : listCard?.description || cms?.hero?.body || row?.seo_description || "Join this event with MyKoott.",
        organizer: listCard?.organizer || "MyKoott",
        schedule: schedule || "Schedule to be announced",
        image: cms.posterUrl || listCard?.imageUrl || cms?.heroImageUrl || SUMMER_WORKSHOP_2026_HERO_IMAGE,
        detailsHref: `/events/${slug}`,
        ticketHref: `/events/${slug}`,
      };
    });
  } catch {
    return [];
  }
}

export const metadata = {
  title: "Events",
  description:
    "MyKoott workshops and family events — parent–child sessions on emotions, communication, and growing together.",
  openGraph: {
    title: "Events | MyKoott",
    description:
      "Join MyKoott workshops for parents and children — safe spaces to learn, feel, and grow together.",
    type: "website",
    url: "https://www.koott.in/events",
    siteName: "MyKoott",
  },
  alternates: {
    canonical: "https://www.koott.in/events",
  },
};

const PANELISTS = [
  {
    name: "Sreerag Babu",
    title: "Workshop panelist",
    image:
      "https://iylutfwntoqcnqnjdnnp.supabase.co/storage/v1/object/sign/static-files/Sreerag.webp?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9iMzNiMzNkZC0wYWM1LTRhN2UtYTE3NC04MDU2NTQ4MjE0YjQiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzdGF0aWMtZmlsZXMvU3JlZXJhZy53ZWJwIiwiaWF0IjoxNzc1NTgzMjg5LCJleHAiOjE3NTQzNTgzMjg5fQ.ztMDN_5ZweAxTcUArCOAYAyHhz8tJmzDEkkdfqg1h00",
  },
  {
    name: "Irene Cherian",
    title: "Workshop panelist",
    image: "https://www.koott.in/api/images/profile-pictures/irene-1761805889946.webp",
  },
  {
    name: "Lakshmi",
    title: "Workshop panelist",
    image:
      "https://static.wixstatic.com/media/624142_20fd35759ae94c32bc333c9ba016dc89~mv2.webp/v1/fill/w_256,h_300,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/Image-empty-state.webp",
  },
  {
    name: "Shuhaima Katti",
    title: "Workshop panelist",
    image: "https://www.koott.in/api/images/profile-pictures/katti-1762803574350.webp",
  },
  {
    name: "Anjala",
    title: "Workshop panelist",
    image: "https://www.koott.in/api/images/profile-pictures/29ea19f6-feff-48e3-af67-4c451f8175f4.webp",
  },
  {
    name: "Ambili",
    title: "Workshop panelist",
    image: "https://www.koott.in/api/images/profile-pictures/57950d98-1d92-4b7f-990f-8a9b5825da8e.webp",
  },
  {
    name: "Shinjuna",
    title: "Workshop panelist",
    image: "https://www.koott.in/api/images/profile-pictures/8318404d-96eb-428c-b61e-5da72e683f40.webp",
  },
  {
    name: "Aswathy Sampath",
    title: "Workshop panelist",
    image: "https://www.koott.in/api/images/profile-pictures/8c586c80-a0d1-4fcf-96a4-faf7fdfcae11.webp",
  },
  {
    name: "Albin",
    title: "Workshop panelist",
    image:
      "https://iylutfwntoqcnqnjdnnp.supabase.co/storage/v1/object/sign/static-files/Albin%201.webp?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9iMzNiMzNkZC0wYWM1LTRhN2UtYTE3NC04MDU2NTQ4MjE0YjQiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzdGF0aWMtZmlsZXMvQWxiaW4gMS53ZWJwIiwiaWF0IjoxNzc1NTgzMzIwLCJleHAiOjE3NTQzNTgzMzIwfQ.VdE1OBco4irvMiEhBo0a8viKQ_b7GhA1fYP59BYcrHE",
  },
  {
    name: "Taniya",
    title: "Workshop panelist",
    image: "https://www.koott.in/api/images/profile-pictures/thaniya-1761831177583.webp",
  },
];

export default async function EventsPage() {
  const events = await getPublishedEventCards();

  return (
    <div className={`min-h-screen bg-white ${BLOG_TYPOGRAPHY_ROOT_CLASS} ${BLOG_LETTER_SPACING_CLASS}`}>
      <style dangerouslySetInnerHTML={{ __html: BLOG_TYPOGRAPHY_ROOT_CSS }} />
      {/* Hero Section - 80vh */}
      <section className="relative flex min-h-[80vh] flex-col items-center justify-center bg-gradient-to-b from-[#f2fff1] to-white px-5 pt-20 sm:px-8 sm:pt-24 lg:px-12">
        <div className="mx-auto max-w-4xl text-center mt-12 sm:mt-16">
          <span className={`inline-flex rounded-full border border-[#025545]/20 bg-[#025545]/10 px-5 py-1.5 text-sm font-semibold text-[#025545] ${BLOG_UI_LINE_HEIGHT_CLASS}`}>
            Events
          </span>
          <div
            className={`mt-6 text-gray-900 ${HERO_DISPLAY_HEADING_CLASS}`}
            role="heading"
            aria-level={1}
            style={HERO_DISPLAY_HEADING_STYLE}
          >
            Grow Your Network &amp; Skills with Our Events
          </div>
          <p className={`mx-auto mt-6 max-w-2xl text-gray-600 ${HERO_BODY_TEXT_CLASS}`} style={HERO_BODY_TEXT_STYLE}>
            Join our workshops and family events designed to help parents and children learn, connect, and grow together.
          </p>
        </div>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            className="whitespace-nowrap rounded-full bg-[#025545] px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-[#012f23] transition-colors"
          >
            All Events
          </button>
          <button
            type="button"
            className="whitespace-nowrap rounded-full border border-[#025545]/25 bg-white px-6 py-2.5 text-sm font-medium text-[#025545] hover:bg-[#f4f1ff] transition-colors"
          >
            Nearest Events
          </button>
          <button
            type="button"
            className="whitespace-nowrap rounded-full border border-[#025545]/25 bg-white px-6 py-2.5 text-sm font-medium text-[#025545] hover:bg-[#f4f1ff] transition-colors"
          >
            Latest Event
          </button>
        </div>
      </section>

      <div className="mx-auto max-w-[1280px] px-5 pb-16 sm:px-8 lg:px-12">

        <div className="space-y-6">
          {events.length > 0 ? events.map((event) => (
            <article
              key={event.id}
              className="rounded-3xl border border-[#025545]/15 bg-white/95 p-3 shadow-[0_8px_30px_rgba(63,46,115,0.08)] backdrop-blur-[1px] sm:p-4 lg:p-5"
            >
              <div className="grid gap-4 md:grid-cols-[300px_1fr_auto] md:items-center md:gap-6">
                <Link href={event.detailsHref} className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-[#025545]/10 md:aspect-[5/4] cursor-pointer group">
                  <Image
                    src={event.image}
                    alt={event.title}
                    fill
                    className="object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                    sizes="(min-width: 768px) 300px, 100vw"
                    priority
                  />
                </Link>

                <div className="min-w-0 px-1 md:pr-2">
                  <span className={`inline-flex rounded-full border border-[#025545]/20 bg-[#025545]/10 px-3 py-1 text-xs font-semibold text-[#025545] ${BLOG_UI_LINE_HEIGHT_CLASS}`}>
                    {event.category}
                  </span>
                  <div
                    className={`mt-3 text-gray-900 ${BLOG_FEATURED_TITLE_CLASS}`}
                    style={BLOG_FEATURED_TITLE_STYLE}
                    role="heading"
                    aria-level={2}
                  >
                    {event.title}
                  </div>
                  <p className={`mt-3 line-clamp-2 text-gray-600 ${HERO_BODY_TEXT_CLASS}`} style={HERO_BODY_TEXT_STYLE}>
                    {event.description}
                  </p>
                  <div className={`mt-7 space-y-1.5 text-sm text-gray-700 ${BLOG_UI_LINE_HEIGHT_CLASS}`}>
                    <p>
                      <span className="font-semibold text-[#012f23]">Organizer:</span> {event.organizer}
                    </p>
                    <p>
                      <span className="font-semibold text-[#012f23]">Date:</span> {event.schedule}
                    </p>
                  </div>
                </div>

                <div className="flex w-full flex-col gap-2.5 px-1 md:w-[160px] md:px-0">
                  <Link
                    href={event.ticketHref}
                    className="inline-flex w-full items-center justify-center rounded-full bg-[#025545] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#012f23]"
                  >
                    Book a slot
                  </Link>
                  <Link
                    href={event.detailsHref}
                    className="inline-flex w-full items-center justify-center text-sm font-semibold text-[#025545] transition-colors hover:text-[#012f23]"
                  >
                    See details
                  </Link>
                </div>
              </div>
            </article>
          )) : (
            <article className="rounded-3xl border border-[#025545]/15 bg-white/95 p-6 text-center text-gray-600 shadow-[0_8px_30px_rgba(63,46,115,0.08)]">
              No published events yet. Create and publish an event in Events CMS.
            </article>
          )}
        </div>

        <div className="pt-24 pb-10 sm:pt-32 sm:pb-16">
          <section className="mx-auto max-w-5xl rounded-3xl border border-[#025545]/15 bg-[#f4f1ff] px-6 py-8 text-center sm:px-8 sm:py-10">
            <span className="inline-flex rounded-full border border-[#025545]/20 bg-[#025545]/10 px-4 py-1 text-xs font-semibold text-[#025545]">
              Our mission
            </span>
          <h3
              className={`mt-4 text-center text-gray-900 ${BLOG_SECTION_HEADING_CLASS}`}
              style={{ ...BLOG_SECTION_HEADING_STYLE, lineHeight: 1.05 }}
            >
              Building emotionally safer homes for every family
          </h3>
            <p className={`mx-auto mt-2 max-w-2xl text-gray-600 ${HERO_BODY_TEXT_CLASS}`} style={HERO_BODY_TEXT_STYLE}>
              At MyKoott, we design practical workshops where parents and children learn together, understand
              emotions better, and build stronger day-to-day communication with confidence.
            </p>
          </section>
        </div>

        <section className="w-full pt-20 sm:pt-28" aria-labelledby="events-how-it-works-heading">
          <h3
            id="events-how-it-works-heading"
            className={`text-center text-gray-900 ${BLOG_SECTION_HEADING_CLASS}`}
            style={{ ...BLOG_SECTION_HEADING_STYLE, lineHeight: 1.05 }}
          >
            How it works
          </h3>
          <p className={`mx-auto mt-1.5 max-w-2xl text-center text-gray-600 ${HERO_BODY_TEXT_CLASS}`} style={HERO_BODY_TEXT_STYLE}>
            Register for your preferred event, receive the joining details, and attend the live session with your family.
          </p>

          <div className="mt-16 grid gap-5 md:grid-cols-3">
            <article className="rounded-2xl border border-[#025545]/15 bg-white p-5 shadow-[0_8px_22px_rgba(63,46,115,0.07)]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#025545]/10 text-[#025545]">
                <Calendar className="h-5 w-5" />
              </div>
              <div className={`mt-4 text-gray-900 ${BLOG_CARD_TITLE_CLASS}`} style={BLOG_CARD_TITLE_STYLE} role="heading" aria-level={3}>
                Pick your event date
              </div>
              <p className={`mt-2 text-gray-600 ${HERO_BODY_TEXT_CLASS}`} style={HERO_BODY_TEXT_STYLE}>
                Choose the event that suits your family and complete your booking in a few steps.
              </p>
            </article>

            <article className="rounded-2xl border border-[#025545]/15 bg-white p-5 shadow-[0_8px_22px_rgba(63,46,115,0.07)]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#025545]/10 text-[#025545]">
                <MonitorPlay className="h-5 w-5" />
              </div>
              <div className={`mt-4 text-gray-900 ${BLOG_CARD_TITLE_CLASS}`} style={BLOG_CARD_TITLE_STYLE} role="heading" aria-level={3}>
                Get joining details
              </div>
              <p className={`mt-2 text-gray-600 ${HERO_BODY_TEXT_CLASS}`} style={HERO_BODY_TEXT_STYLE}>
                We share your event link, reminders, and session instructions on email and WhatsApp.
              </p>
            </article>

            <article className="rounded-2xl border border-[#025545]/15 bg-white p-5 shadow-[0_8px_22px_rgba(63,46,115,0.07)]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#025545]/10 text-[#025545]">
                <Clock className="h-5 w-5" />
              </div>
              <div className={`mt-4 text-gray-900 ${BLOG_CARD_TITLE_CLASS}`} style={BLOG_CARD_TITLE_STYLE} role="heading" aria-level={3}>
                Attend live session
              </div>
              <p className={`mt-2 text-gray-600 ${HERO_BODY_TEXT_CLASS}`} style={HERO_BODY_TEXT_STYLE}>
                Join on time with your child and learn practical tools you can use right away at home.
              </p>
            </article>
          </div>
        </section>

        <section className="pt-24 sm:pt-32 lg:pt-40">
          <h3
            className={`text-center text-gray-900 ${BLOG_SECTION_HEADING_CLASS}`}
            style={{ ...BLOG_SECTION_HEADING_STYLE, lineHeight: 1.05 }}
          >
            Our panelists
          </h3>
          <p className={`mt-1.5 !text-center text-gray-600 ${HERO_BODY_TEXT_CLASS}`} style={HERO_BODY_TEXT_STYLE}>
            Facilitators and voices guiding our event sessions.
          </p>
        </section>

        <div className="w-full relative overflow-x-clip md:w-screen md:max-w-[100vw] md:left-1/2 md:-translate-x-1/2">
          <LeadershipMembersShowcase
            members={PANELISTS}
            showSectionHeader={false}
            useAccessibleNameHeading
            className="!px-0 w-full max-w-none"
            sectionClassName="w-full mt-16 md:mt-20 px-4 sm:px-6 md:px-0"
            layout="carousel"
            carouselFullBleed
            naturalMemberImageHeight
            activeDotClassName="w-8 bg-[#025545]"
            inactiveDotClassName="w-4 bg-[#025545]/25"
            dotBaseClassName="h-1.5 rounded-full"
          />
        </div>

      </div>



      <div className="mx-auto max-w-6xl px-4 pb-16 pt-20 sm:px-6 sm:pt-28 lg:px-8">
        <div className="pb-12 sm:pb-16">
          <section className="mx-auto max-w-4xl" aria-labelledby="events-faq-heading">
            <h3
              id="events-faq-heading"
              className={`text-center text-gray-900 ${BLOG_SECTION_HEADING_CLASS}`}
              style={{ ...BLOG_SECTION_HEADING_STYLE, lineHeight: 1.05 }}
            >
              Frequently asked questions
            </h3>

            <div className="mt-8">
              <details className="group">
                <summary className={`flex cursor-pointer list-none items-center justify-between gap-4 border-b border-[#025545]/15 px-1 py-5 text-left text-base font-medium text-gray-900 ${BLOG_LETTER_SPACING_CLASS}`}>
                  <span>Is this event online or offline?</span>
                  <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <p className={`px-1 pb-5 text-gray-600 ${HERO_BODY_TEXT_CLASS}`} style={HERO_BODY_TEXT_STYLE}>
                  Most sessions are hosted online. Final venue or join-link details are shared after booking.
                </p>
              </details>

              <details className="group">
                <summary className={`flex cursor-pointer list-none items-center justify-between gap-4 border-b border-[#025545]/15 px-1 py-5 text-left text-base font-medium text-gray-900 ${BLOG_LETTER_SPACING_CLASS}`}>
                  <span>Can parents and children join together?</span>
                  <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <p className={`px-1 pb-5 text-gray-600 ${HERO_BODY_TEXT_CLASS}`} style={HERO_BODY_TEXT_STYLE}>
                  Yes. Our events are designed for parent-child participation unless mentioned otherwise on the event card.
                </p>
              </details>

              <details className="group">
                <summary className={`flex cursor-pointer list-none items-center justify-between gap-4 border-b border-[#025545]/15 px-1 py-5 text-left text-base font-medium text-gray-900 ${BLOG_LETTER_SPACING_CLASS}`}>
                  <span>How will I receive reminders and updates?</span>
                  <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <p className={`px-1 pb-5 text-gray-600 ${HERO_BODY_TEXT_CLASS}`} style={HERO_BODY_TEXT_STYLE}>
                  You will receive confirmations and reminders by email and WhatsApp after successful registration.
                </p>
              </details>

              <details className="group">
                <summary className={`flex cursor-pointer list-none items-center justify-between gap-4 border-b border-[#025545]/15 px-1 py-5 text-left text-base font-medium text-gray-900 ${BLOG_LETTER_SPACING_CLASS}`}>
                  <span>Where can I read more parenting and child mental health articles?</span>
                  <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <p className={`px-1 pb-5 text-gray-600 ${HERO_BODY_TEXT_CLASS}`} style={HERO_BODY_TEXT_STYLE}>
                  Visit{" "}
                  <Link href="/blog" className="font-medium text-[#025545] underline underline-offset-2 hover:text-[#012f23]">
                    The MyKoott Blog
                  </Link>{" "}
                  for expert-written guides, family stories, and practical tips that complement what we cover in live events.
                </p>
              </details>

              <details className="group">
                <summary className={`flex cursor-pointer list-none items-center justify-between gap-4 border-b border-[#025545]/15 px-1 py-5 text-left text-base font-medium text-gray-900 ${BLOG_LETTER_SPACING_CLASS}`}>
                  <span>Do workshop topics also appear as blog posts?</span>
                  <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <p className={`px-1 pb-5 text-gray-600 ${HERO_BODY_TEXT_CLASS}`} style={HERO_BODY_TEXT_STYLE}>
                  We often expand on event themes in articles—search by topic or browse categories on the blog to go deeper
                  on emotions, communication, and everyday parenting strategies.
                </p>
              </details>
            </div>
          </section>
        </div>

      </div>
    </div>
  );
}
