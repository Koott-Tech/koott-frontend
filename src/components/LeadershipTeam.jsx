"use client";

import LeadershipMembersShowcase from "@/components/LeadershipMembersShowcase";

const LEADERSHIP_MEMBERS = [
  {
    name: "Faisal Vysam Purath",
    title: "CEO & Founder",
    image: "/api/images/static-files/Faisal.webp",
  },
  {
    name: "Aswathy Usha Raman",
    title: "Chief Psychologist",
    image: "/api/images/static-files/Aswathy Raman.webp",
  },
];

export default function LeadershipTeam() {
  return (
    <LeadershipMembersShowcase
      members={LEADERSHIP_MEMBERS}
      sectionTitle="Leadership"
      sectionSubtitle="Meet the team shaping our unique approach to mental healthcare."
      showSectionHeader
    />
  );
}
