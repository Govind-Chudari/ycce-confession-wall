export interface ModerationResult {
    isClean: boolean
    toxicityScore: number
    reason?: string
    flaggedTerms?: string[]
    categories?: string[]
  }
  
  const PROFANITY_LIST = [
    'fuck', 'shit', 'bitch', 'asshole', 'bastard',
  ]
  
  const HATE_SPEECH_PATTERNS = [
    /\b(kill myself|suicide|end my life|want to die)\b/i,
    /\b(kms|kys)\b/i,
    /\b(everyone hates|nobody likes you|you should die)\b/i,
    /\b(i will kill|i'll kill|gonna kill)\b/i,
  ]
  
  const SPAM_PATTERNS = [
    /(.)\1{10,}/,
    /[A-Z\s]{50,}/,
    /https?:\/\//i,
  ]
  
  export async function moderateText(text: string): Promise {
    const result: ModerationResult = {
      isClean: true,
      toxicityScore: 0,
      flaggedTerms: [],
      categories: []
    }
    
    const lowerText = text.toLowerCase()
    
    // Check for self-harm content
    for (const pattern of HATE_SPEECH_PATTERNS.slice(0, 2)) {
      if (pattern.test(text)) {
        result.isClean = false
        result.toxicityScore = 1.0
        result.reason = 'Self-harm or suicide-related content detected'
        result.categories?.push('self_harm')
        return result
      }
    }
    
    // Check for threats
    for (const pattern of HATE_SPEECH_PATTERNS.slice(2)) {
      if (pattern.test(text)) {
        result.isClean = false
        result.toxicityScore = Math.max(result.toxicityScore, 0.9)
        result.reason = 'Threatening or harassing language detected'
        result.categories?.push('harassment')
      }
    }
    
    // Check for profanity
    let profanityCount = 0
    for (const word of PROFANITY_LIST) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi')
      const matches = lowerText.match(regex)
      if (matches) {
        profanityCount += matches.length
        result.flaggedTerms?.push(word)
      }
    }
    
    if (profanityCount > 0) {
      result.toxicityScore = Math.max(result.toxicityScore, Math.min(profanityCount * 0.3, 0.9))
      result.categories?.push('profanity')
      
      if (profanityCount >= 3) {
        result.isClean = false
        result.reason = 'Excessive profanity detected'
      }
    }
    
    // Check for spam
    for (const pattern of SPAM_PATTERNS) {
      if (pattern.test(text)) {
        result.toxicityScore = Math.max(result.toxicityScore, 0.7)
        result.categories?.push('spam')
        result.reason = 'Spam-like content detected'
        result.isClean = false
      }
    }
    
    return result
  }
  
  export async function moderateImage(imageUrl: string): Promise {
    return {
      isClean: false,
      toxicityScore: 0,
      reason: 'Image requires manual review by moderator'
    }
  }