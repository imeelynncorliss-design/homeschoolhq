// types/assessment.ts

export interface Assessment {
    id: string;
    title: string;
    description?: string;
    assessment_type: string;
    subject?: string;
    grade_level?: string;
    created_at: string;
    updated_at: string;
    standards_count?: number;
    teacher_id?: string;
    student_id?: string;
  }
  
  export interface Standard {
    id: string;
    framework: string;
    code: string;
    description: string;
    subject?: string;
    grade_level?: string;
    domain?: string;
    subdomain?: string;
    created_at?: string;
  }
  
  export interface AssessmentStandard {
    id: string;
    assessment_id: string;
    standard_id: string;
    added_at: string;
    standard: Standard;
  }
  
  export interface AssessmentFilters {
    subject?: string;
    assessmentType?: string;
    gradeLevel?: string;
    search?: string;
  }
  
  export interface StandardFilters {
    framework?: string;
    subject?: string;
    gradeLevel?: string;
    domain?: string;
    search?: string;
  }
  
  export type AssessmentType = 
    | 'Quiz'
    | 'Test'
    | 'Exam'
    | 'Assignment'
    | 'Project'
    | 'Presentation'
    | 'Lab'
    | 'Other';
  
  export type Framework = 
    | 'Common Core'
    | 'NGSS'
    | 'State Standards'
    | 'Other';