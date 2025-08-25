

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CAROUSEL_SLIDES } from '../constants';
import type { Slide } from '../types';

interface CarouselProps {
  onLoginClick: () => void;
}

const Carousel: React.FC<CarouselProps> = ({ onLoginClick }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % CAROUSEL_SLIDES.length);
    }, 5000); // Change slide every 5 seconds
    return () => clearInterval(timer);
  }, []);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <div className="relative w-full h-[60vh] md:h-[80vh] overflow-hidden">
      {/* Slides */}
      {CAROUSEL_SLIDES.map((slide: Slide, index: number) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentIndex ? 'opacity-100' : 'opacity-0'}`}
        >
          <img src={slide.image} alt={slide.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black bg-opacity-50"></div>
          <div className="absolute inset-0 flex flex-col justify-center items-center text-center text-white p-6">
            <h2 className="text-4xl md:text-6xl font-bold tangerine-title animate-carousel-fade-in-down">{slide.title}</h2>
            <p className="mt-4 text-lg md:text-xl max-w-2xl animate-carousel-fade-in-up delay-300">{slide.subtitle}</p>
            <div className="mt-8 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 animate-carousel-fade-in-up delay-500">
              <Link to="/register" className="bg-brand-secondary hover:bg-yellow-500 text-brand-dark font-semibold px-8 py-3 rounded-full shadow-lg transition-transform duration-300 hover:scale-105">
                Register Now
              </Link>
              <button onClick={onLoginClick} className="bg-transparent border-2 border-white text-white font-semibold px-8 py-3 rounded-full shadow-lg transition-colors duration-300 hover:bg-white hover:text-black">
                Login
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Dots */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex space-x-2">
        {CAROUSEL_SLIDES.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-3 h-3 rounded-full transition-colors duration-300 ${index === currentIndex ? 'bg-white' : 'bg-white/50'}`}
          ></button>
        ))}
      </div>
    </div>
  );
};

export default Carousel;