interface CourseOnboardingGuideProps {
    onCreateCourse: () => void
  }
  
  export default function CourseOnboardingGuide({ onCreateCourse }: CourseOnboardingGuideProps) {
    return (
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-8">
  
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎓</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Set Up Your High School Courses</h3>
          <p className="text-gray-600 max-w-lg mx-auto">
            Courses connect your daily lessons to an official transcript. Here's how it works:
          </p>
        </div>
  
        {/* 3-step workflow */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-5 border border-indigo-100 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shrink-0">1</div>
              <h4 className="font-bold text-gray-900">Create a Course</h4>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Define the course name, subject, grade level, credits, and date range. 
              For example: <em>"Algebra II, Mathematics, 9th grade, 1.0 credit, Aug–May"</em>
            </p>
          </div>
  
          <div className="bg-white rounded-xl p-5 border border-purple-100 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-sm shrink-0">2</div>
              <h4 className="font-bold text-gray-900">Link Your Lessons</h4>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Lessons are linked automatically when you select a course in the Lesson Generator. 
              Or use <strong>Auto-link</strong> to connect all lessons within the course's date range at once.
            </p>
          </div>
  
          <div className="bg-white rounded-xl p-5 border border-green-100 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-green-600 text-white font-bold flex items-center justify-center text-sm shrink-0">3</div>
              <h4 className="font-bold text-gray-900">Generate Transcript</h4>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Once a course is marked <strong>completed</strong> with a final grade, it appears on the 
              official transcript with GPA, credits, and lesson documentation.
            </p>
          </div>
        </div>
  
        {/* Why this matters */}
        <div className="bg-white border border-amber-100 rounded-xl p-4 mb-8 flex gap-3">
          <span className="text-xl shrink-0">💡</span>
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Why link lessons to courses?</p>
            <p className="text-sm text-gray-600">
              Colleges and state compliance reviewers want evidence that coursework was actually completed — 
              not just a grade on a transcript. Linked lessons show the documented work behind each credit. 
              This is how leading homeschool platforms like Syllabird handle it.
            </p>
          </div>
        </div>
  
        <div className="text-center">
          <button
            onClick={onCreateCourse}
            className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-md"
          >
            + Create Your Course
          </button>
          <p className="text-xs text-gray-400 mt-3">
            You can create courses at any point in the year — even retroactively.
          </p>
        </div>
      </div>
    )
  }