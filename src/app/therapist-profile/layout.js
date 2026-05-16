import React from 'react';

// Default metadata for therapist profile page
// Note: Dynamic metadata based on ?doctor= query param will be handled client-side
// since Next.js layouts don't have access to searchParams
export const metadata = {
  title: "Child Psychologist Profile | Koott",
  description:
    "View details of a Koott child psychologist, including experience, specialization, and available online counseling slots.",
  openGraph: {
    title: "Child Psychologist Profile | Koott",
    description:
      "View details of a Koott child psychologist, including experience, specialization, and available online counseling slots.",
    type: "profile",
    url: "https://www.koott.in/therapist-profile",
    images: [
      {
        url: "https://www.koott.in/favicon.png",
        width: 1200,
        height: 630,
        alt: "Koott logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Child Psychologist Profile | Koott",
    description:
      "View details of a Koott child psychologist, including experience, specialization, and available online counseling slots.",
    images: ["https://www.koott.in/favicon.png"],
  },
  alternates: {
    canonical: "https://www.koott.in/therapist-profile",
  },
};

export default function TherapistProfileLayout({ children }) {
  return children;
}
