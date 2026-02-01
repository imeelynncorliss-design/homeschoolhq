// src/types/compliance.ts

/**
 * Database table: user_compliance_settings
 */
export interface UserComplianceSetting {
    id: string;
    organization_id: string;
    kid_id: string;
    
    // State/Location Context
    state_code: string | null;
    state_name: string | null;
    
    // User-defined compliance goals
    school_year_start_month: number; // 1-12, default 8 (August)
    school_year_end_month: number; // 1-12, default 5 (May)
    
    // Hour requirements (annual)
    required_annual_hours: number | null;
    required_annual_days: number | null;
    
    // Subject requirements
    required_subjects: RequiredSubject[];
    
    // Testing/Assessment requirements
    assessment_frequency: 'annual' | 'quarterly' | 'biannual' | 'none' | string | null;
    assessment_notes: string | null;
    
    // External reference materials
    state_website_url: string | null;
    uploaded_documentation_url: string | null;
    
    // Template source
    template_source: string | null;
    template_disclaimer_accepted: boolean;
    template_last_verified_at: string | null;
    
    // Tracking preferences
    track_by_hours: boolean;
    track_by_days: boolean;
    track_by_subjects: boolean;
    
    // Alert thresholds
    alert_threshold_percentage: number; // 0-100, default 80
    
    // Custom notes
    notes: string | null;
    
    // Metadata
    created_at: string;
    updated_at: string;
    created_by: string | null;
    updated_by: string | null;
  }
  
  /**
   * Required subject in compliance settings
   */
  export interface RequiredSubject {
    name: string;
    hours?: number;
    description?: string;
  }
  
  /**
   * Insert/Update payload for user_compliance_settings
   */
  export interface UserComplianceSettingInsert {
    organization_id: string;
    kid_id: string;
    state_code?: string | null;
    state_name?: string | null;
    school_year_start_month?: number;
    school_year_end_month?: number;
    required_annual_hours?: number | null;
    required_annual_days?: number | null;
    required_subjects?: RequiredSubject[];
    assessment_frequency?: string | null;
    assessment_notes?: string | null;
    state_website_url?: string | null;
    uploaded_documentation_url?: string | null;
    template_source?: string | null;
    template_disclaimer_accepted?: boolean;
    template_last_verified_at?: string | null;
    track_by_hours?: boolean;
    track_by_days?: boolean;
    track_by_subjects?: boolean;
    alert_threshold_percentage?: number;
    notes?: string | null;
  }
  
  export interface UserComplianceSettingUpdate extends Partial<UserComplianceSettingInsert> {
    id: string;
  }
  
  /**
   * Return type from calculate_compliance_hours() function
   */
  export interface ComplianceHours {
    total_hours: number;
    total_days: number;
    subject_hours: Record<string, number>; // e.g., { "Math": 45.5, "Science": 30 }
    hours_by_month: Record<string, number>; // e.g., { "2024-09": 120, "2024-10": 140 }
  }
  
  /**
   * Return type from get_compliance_health_score() function
   */
  export interface ComplianceHealthScore {
    overall_score: number; // 0-100
    hours_score: number; // 0-100
    days_score: number; // 0-100
    subjects_score: number; // 0-100
    status: 'on_track' | 'at_risk' | 'behind' | 'no_settings';
    alerts: ComplianceAlert[];
    recommendations: ComplianceRecommendation[];
  }
  
  /**
   * Alert from health score function
   */
  export interface ComplianceAlert {
    type: 'hours_behind' | 'days_behind' | 'subjects_incomplete' | string;
    message: string;
    severity: 'high' | 'medium' | 'low';
  }
  
  /**
   * Recommendation from health score function
   */
  export interface ComplianceRecommendation {
    type: 'increase_hours' | 'add_subjects' | string;
    message: string;
  }
  
  /**
   * Parameters for calculate_compliance_hours function
   */
  export interface CalculateComplianceHoursParams {
    kid_id: string;
    organization_id: string;
    start_date?: string; // ISO date string
    end_date?: string; // ISO date string
  }
  
  /**
   * Parameters for get_compliance_health_score function
   */
  export interface GetComplianceHealthScoreParams {
    kid_id: string;
    organization_id: string;
    start_date?: string; // ISO date string
    end_date?: string; // ISO date string
  }
  
  /**
   * US State codes for compliance settings
   */
  export const US_STATES = {
    AL: 'Alabama',
    AK: 'Alaska',
    AZ: 'Arizona',
    AR: 'Arkansas',
    CA: 'California',
    CO: 'Colorado',
    CT: 'Connecticut',
    DE: 'Delaware',
    FL: 'Florida',
    GA: 'Georgia',
    HI: 'Hawaii',
    ID: 'Idaho',
    IL: 'Illinois',
    IN: 'Indiana',
    IA: 'Iowa',
    KS: 'Kansas',
    KY: 'Kentucky',
    LA: 'Louisiana',
    ME: 'Maine',
    MD: 'Maryland',
    MA: 'Massachusetts',
    MI: 'Michigan',
    MN: 'Minnesota',
    MS: 'Mississippi',
    MO: 'Missouri',
    MT: 'Montana',
    NE: 'Nebraska',
    NV: 'Nevada',
    NH: 'New Hampshire',
    NJ: 'New Jersey',
    NM: 'New Mexico',
    NY: 'New York',
    NC: 'North Carolina',
    ND: 'North Dakota',
    OH: 'Ohio',
    OK: 'Oklahoma',
    OR: 'Oregon',
    PA: 'Pennsylvania',
    RI: 'Rhode Island',
    SC: 'South Carolina',
    SD: 'South Dakota',
    TN: 'Tennessee',
    TX: 'Texas',
    UT: 'Utah',
    VT: 'Vermont',
    VA: 'Virginia',
    WA: 'Washington',
    WV: 'West Virginia',
    WI: 'Wisconsin',
    WY: 'Wyoming',
  } as const;
  
  export type StateCode = keyof typeof US_STATES;
  
  /**
   * Helper type for state selection
   */
  export interface StateOption {
    code: StateCode;
    name: string;
  }
  
  /**
   * Common subject names for quick selection
   */
  export const COMMON_SUBJECTS = [
    'Mathematics',
    'Language Arts',
    'Science',
    'Social Studies',
    'History',
    'Geography',
    'Art',
    'Music',
    'Physical Education',
    'Foreign Language',
    'Computer Science',
    'Health',
    'Life Skills',
  ] as const;
  
  export type CommonSubject = typeof COMMON_SUBJECTS[number];