/**
 * Same structure as homepage `Testimonials` — carousel + desktop 5-column grid — workshop copy only.
 */

const YT = "https://www.youtube.com/watch?v=RSge3l2uKSI";

export const WORKSHOP_TESTIMONIALS_PHOTOS = [
  { src: YT, alt: "Workshop families video", type: "video" },
  { src: "/TESTIMONIALS 1.webp", alt: "Parent and child at a workshop", type: "image" },
  {
    text: "We finally had language for big feelings at home. The activities were simple enough to repeat on our own.",
    author: "Mother of an 11-year-old",
    bgImage: "/Our promise bg1.webp",
    gradient: "linear-gradient(135deg, #E6F5EC 0%, #D4EDE0 50%, #C8E8D5 100%)",
    type: "text",
  },
  { src: "/TESTIMONIALS 2.webp", alt: "Family learning together", type: "image" },
  {
    text: "Doing it together with my child made a difference — it wasn’t a lecture, it felt like play with a purpose.",
    author: "Father of two",
    bgImage: "/Our promise bg2.webp",
    gradient: "linear-gradient(135deg, #f2fff1 0%, #E0DEFF 50%, #D4D2FF 100%)",
    type: "text",
  },
  { src: "/TESTIMONIALS 3.webp", alt: "Happy child after a session", type: "image" },
  {
    text: "Clear, warm, and practical. We left with small steps we could use the same evening.",
    author: "Parent & teacher",
    bgImage: "/Our promise bg3.webp",
    gradient: "linear-gradient(135deg, #FFF5E6 0%, #FFEED6 50%, #FFE7C8 100%)",
    type: "text",
  },
  { src: "/TESTIMONIALS 4.webp", alt: "Family moment", type: "image" },
  {
    text: "The workshop helped us talk about emotions without anyone shutting down. Highly recommend for busy parents.",
    author: "Family of four",
    bgImage: "/Our promise bg4.webp",
    gradient: "linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 50%, #D1E9FF 100%)",
    type: "text",
  },
  { src: "/TESTIMONIALS 5.webp", alt: "Happy family", type: "image" },
];

export const WORKSHOP_TESTIMONIALS_DESKTOP_GRID = {
  col1: {
    src: "/testimonial2.PNG",
    alt: "Parents and children at Koott workshops",
  },
  col2: [
    {
      quote:
        "We finally had language for big feelings at home. The activities were simple enough to repeat on our own.",
      author: "Mother of an 11-year-old",
      bg: "/Our promise bg1.webp",
      quoteClassName: "p1",
    },
    {
      quote:
        "Doing it together with my child made a difference — it wasn’t a lecture, it felt like play with a purpose.",
      author: "Father of two",
      bg: "/Our promise bg2.webp",
      quoteClassName: "",
    },
  ],
  col3: {
    topImage: {
      src: "/testimonial3.PNG",
      alt: "Parent and child connecting",
    },
  },
  col4: {
    textCard: {
      quote: "Clear, warm, and practical. We left with small steps we could use the same evening.",
      author: "Parent & teacher",
      bg: "/Our promise bg3.webp",
    },
    bottomImage: {
      src: "/testimonialgirl.png",
      alt: "Child feeling heard after a family workshop",
    },
  },
  col5: {
    topImage: {
      src: "/testimonial5.PNG",
      alt: "Family after a Koott workshop",
    },
    textCard: {
      quote:
        "The workshop helped us talk about emotions without anyone shutting down. Highly recommend for busy parents.",
      author: "Family of four",
      bg: "/Our promise bg4.webp",
    },
  },
};
