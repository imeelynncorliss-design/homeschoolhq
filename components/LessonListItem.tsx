import React, { useState } from 'react';
import LessonActionModal from './LessonActionModal';

interface Lesson {
  id: string;
  title: string;
  description?: string;
  duration: number;
  startDate: string;
  endDate?: string;
  status: 'not_started' | 'in_progress' | 'completed';
}

interface LessonListItemProps {
  lesson: Lesson;
  onEdit: (lessonId: string) => void;
  onDelete: (lessonId: string) => void;
  onGenerateAssessment: (lessonId: string) => void;
}

export default function LessonListItem({
  lesson,
  onEdit,
  onDelete,
  onGenerateAssessment,
}: LessonListItemProps) {
  const [showModal, setShowModal] = useState(false);

  const handleLessonClick = () => {
    setShowModal(true);
  };

  return (
    <>
      <div className="flex items-start gap-4 p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors">
        {/* Checkbox */}
        <input 
          type="checkbox" 
          className="mt-1 flex-shrink-0" 
          onClick={(e) => e.stopPropagation()}
        />
        
        {/* Radio button */}
        <input 
          type="radio" 
          className="mt-1 flex-shrink-0" 
          onClick={(e) => e.stopPropagation()}
        />
        
        {/* Clickable lesson content */}
        <div 
          className="flex-1 cursor-pointer"
          onClick={handleLessonClick}
        >
          <h3 className="font-semibold text-lg text-gray-900 hover:text-blue-600 transition-colors">
            {lesson.title}
          </h3>
          
          {lesson.description && (
            <p className="text-gray-600 text-sm mt-1">
              {lesson.description}
            </p>
          )}
          
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
              ⏱️ {lesson.duration} min
            </span>
            
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
              📅 Start: {lesson.startDate}
            </span>
            
            {lesson.endDate && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                🏁 End: {lesson.endDate}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      <LessonActionModal
        lesson={lesson}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onEdit={onEdit}
        onDelete={onDelete}
        onGenerateAssessment={onGenerateAssessment}
      />
    </>
  );
}