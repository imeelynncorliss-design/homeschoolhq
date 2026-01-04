import React, { useState } from 'react';
import { useRouter } from 'next/router';
import LessonListItem from './LessonListItem';

interface Lesson {
  id: string;
  title: string;
  description?: string;
  duration: number;
  startDate: string;
  endDate?: string;
  status: 'not_started' | 'in_progress' | 'completed';
}

export default function LessonListPage() {
  const router = useRouter();
  const [lessons, setLessons] = useState<Lesson[]>([
    // Your lessons from Supabase will be here
  ]);

  const handleEdit = (lessonId: string) => {
    // Navigate to edit page or open edit modal
    router.push(`/lessons/${lessonId}/edit`);
  };

  const handleDelete = async (lessonId: string) => {
    // Show confirmation dialog first
    const confirmed = window.confirm('Are you sure you want to delete this lesson?');
    
    if (confirmed) {
      try {
        // Call your Supabase delete function
        // await supabase.from('lessons').delete().eq('id', lessonId);
        
        // Update local state
        setLessons(lessons.filter(lesson => lesson.id !== lessonId));
        
        // Show success message
        alert('Lesson deleted successfully!');
      } catch (error) {
        console.error('Error deleting lesson:', error);
        alert('Failed to delete lesson. Please try again.');
      }
    }
  };

  const handleGenerateAssessment = (lessonId: string) => {
    // Navigate to assessment generation or trigger AI generation
    router.push(`/lessons/${lessonId}/generate-assessment`);
    // Or if you want to generate inline:
    // await generateAssessment(lessonId);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📚</span>
            <h2 className="text-xl font-bold text-gray-900">
              Math <span className="text-gray-500 font-normal">(16 lessons)</span>
            </h2>
          </div>
        </div>

        {/* Not Started Section */}
        <div className="border-b border-gray-200">
          <div className="flex items-center justify-between p-4 bg-gray-50">
            <div className="flex items-center gap-2">
              <span className="text-blue-600">▼</span>
              <h3 className="font-semibold text-blue-600">Not Started (10)</h3>
            </div>
            <button className="text-blue-600 text-sm font-medium hover:underline">
              Select All
            </button>
          </div>

          {/* Lesson List */}
          <div>
            {lessons
              .filter(lesson => lesson.status === 'not_started')
              .map(lesson => (
                <LessonListItem
                  key={lesson.id}
                  lesson={lesson}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onGenerateAssessment={handleGenerateAssessment}
                />
              ))}
          </div>
        </div>

        {/* In Progress Section */}
        <div className="border-b border-gray-200">
          <div className="flex items-center justify-between p-4 bg-gray-50">
            <div className="flex items-center gap-2">
              <span className="text-blue-600">▼</span>
              <h3 className="font-semibold text-blue-600">In Progress (4)</h3>
            </div>
          </div>

          <div>
            {lessons
              .filter(lesson => lesson.status === 'in_progress')
              .map(lesson => (
                <LessonListItem
                  key={lesson.id}
                  lesson={lesson}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onGenerateAssessment={handleGenerateAssessment}
                />
              ))}
          </div>
        </div>

        {/* Completed Section */}
        <div>
          <div className="flex items-center justify-between p-4 bg-gray-50">
            <div className="flex items-center gap-2">
              <span className="text-blue-600">▼</span>
              <h3 className="font-semibold text-blue-600">Completed (2)</h3>
            </div>
          </div>

          <div>
            {lessons
              .filter(lesson => lesson.status === 'completed')
              .map(lesson => (
                <LessonListItem
                  key={lesson.id}
                  lesson={lesson}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onGenerateAssessment={handleGenerateAssessment}
                />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}