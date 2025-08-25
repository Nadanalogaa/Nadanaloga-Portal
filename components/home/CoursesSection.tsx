import React, { useState, useEffect } from 'react';
import type { Course } from '../../types';
import { getCourses } from '../../api';
import { CourseIcon } from '../icons';
import Tooltip from '../Tooltip';

const CoursesSection: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const fetchedCourses = await getCourses();
        setCourses(fetchedCourses);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load courses.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchCourses();
  }, []);

  return (
    <section className="bg-brand-light/40 py-16 md:py-24">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-brand-primary sm:text-5xl tangerine-title">Our Courses</h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            We offer a variety of courses designed to cater to different artistic interests and skill levels.
          </p>
        </div>
        <div className="mt-16">
          {isLoading && <p className="text-center text-gray-500">Loading courses...</p>}
          {error && <p className="text-center text-red-500">{error}</p>}
          {!isLoading && !error && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {courses.map((course) => (
                <div key={course.id} className="bg-white p-8 rounded-xl shadow-lg text-center transform hover:-translate-y-2 transition-transform duration-300 flex flex-col items-center">
                  <Tooltip content={course.name} position="top">
                    <div className="flex justify-center items-center mb-4 h-12 w-12">
                      <CourseIcon iconName={course.icon} />
                    </div>
                  </Tooltip>
                  <h3 className="text-xl font-semibold text-gray-900">{course.name}</h3>
                  <p className="mt-2 text-gray-600 flex-grow">{course.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default CoursesSection;
