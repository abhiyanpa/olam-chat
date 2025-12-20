// Security utilities for input sanitization and validation

/**
 * Sanitize user input to prevent XSS attacks
 */
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  
  // Remove any HTML tags
  const div = document.createElement('div');
  div.textContent = input;
  const sanitized = div.innerHTML;
  
  return sanitized
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Validate username format
 */
export const validateUsername = (username: string): { valid: boolean; error?: string } => {
  if (!username) {
    return { valid: false, error: 'Username is required' };
  }
  
  if (username.length < 3 || username.length > 20) {
    return { valid: false, error: 'Username must be 3-20 characters' };
  }
  
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { valid: false, error: 'Username can only contain letters, numbers, and underscores' };
  }
  
  return { valid: true };
};

/**
 * Validate message content
 */
export const validateMessage = (content: string): { valid: boolean; error?: string } => {
  if (!content || !content.trim()) {
    return { valid: false, error: 'Message cannot be empty' };
  }
  
  if (content.length > 4096) {
    return { valid: false, error: 'Message is too long (max 4096 characters)' };
  }
  
  return { valid: true };
};

/**
 * Validate email format
 */
export const validateEmail = (email: string): { valid: boolean; error?: string } => {
  if (!email) {
    return { valid: false, error: 'Email is required' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }
  
  return { valid: true };
};

/**
 * Rate limiter for client-side actions
 */
export class RateLimiter {
  private timestamps: Map<string, number[]> = new Map();
  
  /**
   * Check if action is allowed based on rate limit
   * @param key - Unique identifier for the action
   * @param maxActions - Maximum number of actions allowed
   * @param windowMs - Time window in milliseconds
   */
  isAllowed(key: string, maxActions: number, windowMs: number): boolean {
    const now = Date.now();
    const timestamps = this.timestamps.get(key) || [];
    
    // Remove old timestamps outside the window
    const validTimestamps = timestamps.filter(ts => now - ts < windowMs);
    
    if (validTimestamps.length >= maxActions) {
      return false;
    }
    
    validTimestamps.push(now);
    this.timestamps.set(key, validTimestamps);
    
    return true;
  }
  
  /**
   * Clear rate limit for a key
   */
  clear(key: string): void {
    this.timestamps.delete(key);
  }
}

export const messageSendLimiter = new RateLimiter();
