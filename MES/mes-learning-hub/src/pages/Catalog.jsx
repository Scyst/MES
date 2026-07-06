import React from 'react';
import { useNavigate } from 'react-router-dom';
import { courses } from '../data/courses';
import { FiClock, FiUser, FiPlayCircle } from 'react-icons/fi';

export default function Catalog() {
  const navigate = useNavigate();

  return (
    <div className="learning-container">
      <div className="header-section">
        <h1>MES Learning Hub</h1>
        <p className="subtitle">Choose a course to start upgrading your skills</p>
      </div>

      <div className="courses-grid">
        {courses.map(course => (
          <div key={course.id} className="course-card" onClick={() => navigate(`/course/${course.id}`)}>
            <div className="course-image" style={{ backgroundImage: `url(${course.image})` }}>
              <div className="course-category">{course.category}</div>
            </div>
            <div className="course-content">
              <h2>{course.title}</h2>
              <p className="course-desc">{course.description}</p>
              
              <div className="course-meta">
                <div className="meta-item">
                  <FiUser className="icon" />
                  <span>{course.instructor}</span>
                </div>
                <div className="meta-item">
                  <FiClock className="icon" />
                  <span>{course.duration}</span>
                </div>
              </div>
              
              <div className="course-action">
                <button className="start-btn">
                  <FiPlayCircle className="icon" />
                  Start Learning
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
