// Helper function to format parsed objects
function formatParsedDescription(parsed: any): string {
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
  
  // If it's just a simple string in parsed form, return it
  if (typeof parsed === 'string') {
    return parsed
  }
  
  // Otherwise return the stringified version
  return JSON.stringify(parsed, null, 2)
}

// Utility to parse and format JSON lesson descriptions
export function formatLessonDescription(description: string | any): string {
  // SAFETY CHECK: If it's null or undefined, return empty string
  if (description == null) return ''
  
  // SAFETY CHECK: If it's already an object (not a string), format it directly
  if (typeof description !== 'string') {
    try {
      return formatParsedDescription(description)
    } catch (e) {
      // Last resort - stringify it
      return JSON.stringify(description)
    }
  }
  
  // If it's an empty string, return it
  if (!description) return ''
  
  // Try to parse as JSON string
  try {
    const parsed = JSON.parse(description)
    return formatParsedDescription(parsed)
  } catch (e) {
    // Not valid JSON, return the string as-is
    return description
  }
}