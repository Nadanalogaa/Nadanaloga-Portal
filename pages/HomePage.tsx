

import React from 'react';
import Carousel from '../components/Carousel';
import AboutSection from '../components/home/AboutSection';
import TestimonialsSection from '../components/home/TestimonialsSection';
import ContactSection from '../components/home/ContactSection';
import CoursesSection from '../components/home/CoursesSection';

interface HomePageProps {
  onLoginClick: () => void;
}

const HomePage: React.FC<HomePageProps> = ({ onLoginClick }) => {
  return (
    <div>
      <Carousel onLoginClick={onLoginClick} />
      <div className="space-y-16 md:space-y-24 py-16 md:py-24">
        <AboutSection />
        <CoursesSection />
        <TestimonialsSection />
        <ContactSection />
      </div>
    </div>
  );
};

export default HomePage;