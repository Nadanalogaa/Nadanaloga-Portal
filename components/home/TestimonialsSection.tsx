
import React from 'react';
import { TESTIMONIALS } from '../../constants';

const TestimonialsSection: React.FC = () => {
  return (
    <section className="bg-white py-16 md:py-24">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-brand-primary sm:text-5xl tangerine-title">What Our Community Says</h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            We are proud to have touched the lives of many students and parents. Here's some of the feedback we've received.
          </p>
        </div>
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {TESTIMONIALS.map((testimonial, index) => (
            <div key={index} className="bg-brand-light/40 p-8 rounded-xl shadow-lg flex flex-col">
              <p className="text-gray-600 flex-grow">"{testimonial.quote}"</p>
              <div className="mt-6 flex items-center">
                <img src={testimonial.image} alt={testimonial.author} className="w-14 h-14 rounded-full object-cover" />
                <div className="ml-4">
                  <p className="font-semibold text-gray-900">{testimonial.author}</p>
                  <p className="text-sm text-gray-500">{testimonial.relation}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
