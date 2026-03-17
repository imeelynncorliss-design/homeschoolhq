// Canonical subject list for HomeschoolHQ
// Used for dropdown suggestions in lesson creation, editing, AI generation, and curriculum import.
// BulkLessonScheduler uses a separate dynamic query (DISTINCT subject FROM lessons) for filtering.

export const CANONICAL_SUBJECTS = [
    // Core
    "English / Language Arts",
    "Mathematics",
    "Science",
    "Social Studies",
    "History",
    // State-specific
    //"North Carolina History",
    //"Virginia History",
    //"New York History",
    // Arts & Electives
    "Art",
    "Music",
    "Physical Education",
    "Health",
    "Foreign Language",
    "Bible / Religious Studies",
    "Computer Science",
    "Life Skills",
    "Logic",
    "Geography",
  ] as const
  
  export type CanonicalSubject = typeof CANONICAL_SUBJECTS[number]