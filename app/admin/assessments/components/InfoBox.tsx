export default function InfoBox() {
    return (
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-8 rounded-r-md">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <span className="text-2xl">💡</span>
          </div>
          <div className="ml-3">
            <p className="text-sm text-gray-800">
              <strong className="font-semibold">How assessments work:</strong> Click any assessment 
              card to view details, edit questions, or align with educational standards. Use the{' '}
              <span className="font-medium">"Assign to Student"</span> button to have your child take 
              the assessment. Results automatically track standards mastery so you can see which 
              learning objectives they've achieved.
            </p>
          </div>
        </div>
      </div>
    )
  }