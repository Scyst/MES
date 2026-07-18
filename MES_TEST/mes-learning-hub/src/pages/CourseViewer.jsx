import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { courses } from '../data/courses';
import { FiArrowLeft, FiCheckCircle, FiCircle } from 'react-icons/fi';
import CourseContent from '../components/CourseContent';

export default function CourseViewer() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const course = courses.find(c => c.id === courseId);
  
  const [activeModuleId, setActiveModuleId] = useState('');

  useEffect(() => {
    if (course && course.modules.length > 0) {
      setActiveModuleId(course.modules[0].id);
    }
  }, [course]);

  if (!course) {
    return (
      <div className="viewer-not-found">
        <h2>Course not found</h2>
        <button onClick={() => navigate('/')}>Back to Catalog</button>
      </div>
    );
  }

  const activeModule = course.modules.find(m => m.id === activeModuleId);
  const currentIndex = course.modules.findIndex(m => m.id === activeModuleId);

  return (
    <div className="course-viewer">
      {/* Sidebar / Syllabus */}
      <div className="viewer-sidebar">
        <div className="sidebar-header">
          <button className="back-btn" onClick={() => navigate('/')}>
            <FiArrowLeft /> Back
          </button>
          <h3>{course.title}</h3>
        </div>
        <div className="module-list">
          {course.modules.map((module, index) => (
            <div 
              key={module.id} 
              className={`module-item ${activeModuleId === module.id ? 'active' : ''}`}
              onClick={() => setActiveModuleId(module.id)}
            >
              <div className="module-icon">
                {activeModuleId === module.id ? <FiCheckCircle className="icon-active" /> : <FiCircle />}
              </div>
              <div className="module-info">
                <span className="module-number">Lesson {index + 1}</span>
                <span className="module-title">{module.title}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="viewer-content">
        <div className="content-header">
          <h2>{activeModule?.title}</h2>
        </div>
        <div className="content-body">
          {activeModule && <CourseContent courseId={course.id} moduleContent={activeModule.content} />}
          
          <div className="flex justify-between items-center mt-12 pt-6 border-t border-slate-800">
            {currentIndex > 0 ? (
              <button 
                onClick={() => setActiveModuleId(course.modules[currentIndex - 1].id)}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors border border-slate-700"
              >
                ← Previous Lesson
              </button>
            ) : <div></div>}
            
            {currentIndex < course.modules.length - 1 ? (
              <button 
                onClick={() => setActiveModuleId(course.modules[currentIndex + 1].id)}
                className="px-6 py-2.5 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-lg font-bold transition-colors shadow-lg shadow-fuchsia-500/20"
              >
                Next Lesson →
              </button>
            ) : (
              <button 
                onClick={() => navigate('/')}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition-colors shadow-lg shadow-emerald-500/20 flex items-center gap-2"
              >
                <FiCheckCircle /> Complete Course
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
