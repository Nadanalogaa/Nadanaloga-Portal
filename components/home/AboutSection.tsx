
import React from 'react';
import { Link } from 'react-router-dom';

const AboutSection: React.FC = () => {
  return (
    <section className="container mx-auto px-6 lg:px-8">
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <div className="order-2 md:order-1">
          <h2 className="text-4xl font-bold text-brand-primary sm:text-5xl tangerine-title">Welcome to Nadanaloga</h2>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Nadanaloga is a premier institution dedicated to fostering artistic excellence. We offer a diverse range of courses including Bharatanatyam, Vocal music, Drawing, and Abacus, taught by passionate and experienced instructors.
          </p>
          <p className="mt-4 text-lg leading-8 text-gray-600">
            Whether you are a beginner taking your first step into the world of arts or an experienced artist looking to refine your skills, we provide a nurturing environment for you to grow.
          </p>
          <div className="mt-8">
            <Link
              to="/about"
              className="inline-block bg-brand-primary text-white font-semibold px-8 py-3 rounded-full shadow-md hover:bg-brand-dark transition-colors duration-300"
            >
              Learn More About Us
            </Link>
          </div>
        </div>
        <div className="order-1 md:order-2">
            <img src="https://picsum.photos/800/600?random=8" alt="About Nadanaloga" className="rounded-2xl shadow-xl w-full h-full object-cover" />
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
