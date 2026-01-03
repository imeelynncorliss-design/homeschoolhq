// Utility to parse and format JSON lesson descriptions
export function formatLessonDescription(description: string): string {
    if (!description) return ''
    
    // Try to parse as JSON
    try {
      const parsed = JSON.parse(description)
      
      // If it's a JSON object with specific fields, format it nicely
      if (typeof parsed === 'object' && parsed !== null) {
        let formatted = ''
        
        // Common AI response fields
        if (parsed.title) formatted += `${parsed.title}\n\n`
        if (parsed.approach) formatted += `Approach: ${parsed.approach}\n\n`
        if (parsed.description) formatted += `${parsed.description}\n\n`
        
        if (parsed.materials && Array.isArray(parsed.materials)) {
          formatted += `Materials:\n${parsed.materials.map((m: string) => `• ${m}`).join('\n')}\n\n`
        }
        
        if (parsed.activities && Array.isArray(parsed.activities)) {
          formatted += `Activities:\n`
          parsed.activities.forEach((activity: any, index: number) => {
            if (typeof activity === 'object') {
              formatted += `\n${index + 1}. ${activity.name || 'Activity'}`
              if (activity.duration) formatted += ` (${activity.duration})`
              if (activity.description) formatted += `\n   ${activity.description}`
            } else {
              formatted += `${index + 1}. ${activity}\n`
            }
          })
          formatted += '\n'
        }
        
        if (parsed.assessment) formatted += `Assessment: ${parsed.assessment}\n\n`
        if (parsed.extensions && Array.isArray(parsed.extensions)) {
          formatted += `Extensions:\n${parsed.extensions.map((e: string) => `• ${e}`).join('\n')}`
        }
        
        return formatted.trim()
      }
      
      // If it's just a simple string in JSON, return it
      if (typeof parsed === 'string') {
        return parsed
      }
      
      // Otherwise return the stringified version
      return JSON.stringify(parsed, null, 2)
      
    } catch (e) {
      // Not valid JSON, return as-is
      return description
    }
  }
  
  // Use this function when displaying lesson descriptions:
  // Example in your dashboard component:
  // <div>{formatLessonDescription(lesson.description)}</div>