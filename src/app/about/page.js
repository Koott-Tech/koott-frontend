import MissionHero from '@/components/MissionHero';
import WhyWereHere from '@/components/WhyWereHere';
import AboutStats from '@/components/AboutStats';
import MeetTheTeam from '@/components/MeetTheTeam';
import TestimonialsAbout from '@/components/TestimonialsAbout';
import LeadershipTeam from '@/components/LeadershipTeam';

export default function About() {
  return (
    <div>
      {/* Mission Hero Section */}
      <MissionHero />
      {/* Why We're Here Section */}
      <WhyWereHere />
      
      <MeetTheTeam />
      {/* About Stats Section */}
      <AboutStats />
      
      {/* Meet The Team Section */}
      
      <LeadershipTeam />
      
      {/* Testimonials Section */}
      <TestimonialsAbout />
      
      {/* Leadership Team Section */}
    </div>
  );
}
