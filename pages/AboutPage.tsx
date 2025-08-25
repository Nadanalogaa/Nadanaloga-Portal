
import React from 'react';

const AboutPage: React.FC = () => {
  return (
    <div className="bg-white py-16 sm:py-24">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold tracking-tight text-brand-primary sm:text-5xl tangerine-title text-center">About Nadanaloga</h1>
          <p className="mt-6 text-lg leading-8 text-gray-600 text-center">
            Nadanaloga is more than just an arts school; it's a sanctuary for creativity, culture, and personal growth. Our mission is to preserve and promote traditional art forms while adapting to contemporary learning methods.
          </p>

          <div className="mt-16">
            <img 
              src="https://picsum.photos/1200/600?random=20" 
              alt="Nadanaloga Studio" 
              className="aspect-[2/1] w-full rounded-2xl object-cover shadow-lg"
            />
          </div>

          <div className="mt-16 space-y-12">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">Our Vision</h2>
              <p className="mt-4 text-gray-600">
                We envision a world where art is an integral part of everyone's life, fostering discipline, joy, and a deep connection to culture. We strive to be a leading institution where students of all ages can discover their passion and unlock their potential under the guidance of world-class instructors.
              </p>
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">Our Approach</h2>
              <p className="mt-4 text-gray-600">
                Our curriculum is built on a foundation of authentic traditions, ensuring that students receive a comprehensive education in their chosen art form. We blend time-honored techniques with modern pedagogical tools, offering both in-person and online classes to provide a flexible and enriching learning experience for our global community of students.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
