
import React from 'react';
import { GALLERY_IMAGES } from '../constants';

const GalleryPage: React.FC = () => {
  return (
    <div className="py-16 sm:py-24">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold tracking-tight text-brand-primary sm:text-5xl tangerine-title">Gallery</h1>
          <p className="mt-4 text-lg text-gray-600">
            A glimpse into the vibrant world of Nadanaloga. Explore moments from our classes, performances, and events.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {GALLERY_IMAGES.map((src, index) => (
            <div key={index} className="overflow-hidden rounded-lg shadow-lg hover:shadow-2xl transition-shadow duration-300">
              <img 
                src={src} 
                alt={`Gallery image ${index + 1}`} 
                className="w-full h-full object-cover aspect-video transform hover:scale-105 transition-transform duration-300"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GalleryPage;
