import React from 'react';
import { formatLessonDescription } from '@/lib/formatLessonDescription';

interface Lesson {
  id: string;
  kid_id: string;
  title: string;
  subject: string;
  description?: string;
  lesson_date: string | null;
  duration_minutes: number | null;
  status: 'not_started' | 'in_progress' | 'completed';
}

interface LessonActionModalProps {
  lesson: Lesson | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (lesson: Lesson) => void;
  onDelete: (lessonId: string) => void;
  onGenerateAssessment?: (lesson: Lesson) => void;
}

export default function LessonActionModal({
  lesson,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onGenerateAssessment,
}: LessonActionModalProps) {
  if (!isOpen || !lesson) return null;

  const handleEdit = () => {
    onClose(); // Close action modal first
    // Small delay to let modal close before opening Dashboard edit modal
    setTimeout(() => {
      onEdit(lesson);
    }, 50);
  };

  const handleDelete = () => {
    onDelete(lesson.id);
    onClose();
  };

  const handleGenerateAssessment = () => {
    if (onGenerateAssessment) {
      onGenerateAssessment(lesson);
      onClose();
    }
  };

  // Safely format description
  const formattedDescription = lesson.description 
    ? formatLessonDescription(lesson.description)
    : '';

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-semibold mb-2 text-gray-900">
          {lesson.title}
        </h3>
        {formattedDescription && (
          <p className="text-sm text-gray-600 mb-6 line-clamp-2">
            {formattedDescription}
          </p>
        )}
        
        <div className="space-y-3">
          <button
            onClick={handleEdit}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <span>✏️</span>
            <span>Edit Lesson</span>
          </button>
          
          {onGenerateAssessment && (
            <button
              onClick={handleGenerateAssessment}
              className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <span>✨</span>
              <span>Generate Assessment</span>
            </button>
          )}
          
          <button
            onClick={handleDelete}
            className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <span>🗑️</span>
            <span>Delete Lesson</span>
          </button>
          
          <button
            onClick={onClose}
            className="w-full px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}