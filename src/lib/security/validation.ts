import DOMPurify from 'isomorphic-dompurify';

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [],
  });
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@ycce\.in$/;
  return emailRegex.test(email);
}

export function validateConfessionContent(content: string): {
  valid: boolean;
  error?: string;
} {
  if (!content || content.trim().length === 0) {
    return { valid: false, error: 'Content cannot be empty' };
  }

  if (content.length > 5000) {
    return { valid: false, error: 'Content too long (max 5000 characters)' };
  }

  // Check for potential spam patterns
  const urlCount = (content.match(/https?:\/\//g) || []).length;
  if (urlCount > 3) {
    return { valid: false, error: 'Too many URLs' };
  }

  return { valid: true };
}

export function validateReplyContent(content: string): {
  valid: boolean;
  error?: string;
} {
  if (!content || content.trim().length === 0) {
    return { valid: false, error: 'Reply cannot be empty' };
  }

  if (content.length > 2000) {
    return { valid: false, error: 'Reply too long (max 2000 characters)' };
  }

  return { valid: true };
}