/**
 * Utility functions for the Agentic Epistemology Framework
 */

/**
 * Capitalize the first letter of a string
 * 
 * @param str String to capitalize
 * @returns Capitalized string
 */
export function capitalize(str: string): string {
  if (!str || str.length === 0) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Debounce a function call
 * 
 * @param fn Function to debounce
 * @param delay Delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T, 
  delay: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null; // Use NodeJS.Timeout type
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout); // Use global clearTimeout
    }
    
    timeout = setTimeout(() => { // Use global setTimeout
      fn(...args);
      timeout = null;
    }, delay);
  };
}

/**
 * Throttle a function call
 * 
 * @param fn Function to throttle
 * @param limit Time limit in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T, 
  limit: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastCall >= limit) {
      fn(...args);
      lastCall = now;
    }
  };
}

/**
 * Create a memoized version of a function
 * 
 * @param fn Function to memoize
 * @returns Memoized function
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T
): (...args: Parameters<T>) => ReturnType<T> {
  const cache = new Map<string, ReturnType<T>>();
  
  return (...args: Parameters<T>) => {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key) as ReturnType<T>;
    }
    
    const result = fn(...args);
    cache.set(key, result);
    
    return result;
  };
}

/**
 * Check if two objects are deeply equal
 * 
 * @param a First object
 * @param b Second object
 * @returns True if the objects are deeply equal
 */
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  
  if (a == null || b == null) return false;
  
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  return keysA.every(key => 
    keysB.includes(key) && deepEqual(a[key], b[key])
  );
}

/**
 * Create a deep copy of an object
 * 
 * @param obj Object to copy
 * @returns Deep copy of the object
 */
export function deepCopy<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepCopy(item)) as unknown as T;
  }
  
  const copy = {} as any;
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      copy[key] = deepCopy((obj as any)[key]);
    }
  }
  
  return copy as T;
}

/**
 * Parse a string into a normalized proposition
 * 
 * @param input String to parse into a proposition
 * @returns Normalized proposition
 */
export function parseProposition(input: string): string {
  // Remove multiple spaces and trim
  let normalized = input.replace(/\s+/g, ' ').trim();
  
  // Ensure the first letter is capitalized
  normalized = capitalize(normalized);
  
  // Make sure the proposition ends with a period if it doesn't already
  // have a terminal punctuation mark
  if (!/[.?!]$/.test(normalized)) {
    normalized += '.';
  }
  
  return normalized;
}

/**
 * Check if a proposition is negated
 * 
 * @param proposition Proposition to check
 * @returns True if the proposition is negated
 */
export function isNegatedProposition(proposition: string): boolean {
  return proposition.startsWith('¬') ||
         proposition.startsWith('not ') ||
         proposition.startsWith('Not ');
}

/**
 * Negate a proposition
 * 
 * @param proposition Proposition to negate
 * @returns Negated proposition
 */
export function negateProposition(proposition: string): string {
  if (isNegatedProposition(proposition)) {
    if (proposition.startsWith('¬')) {
      return proposition.substring(1);
    } else if (proposition.startsWith('not ')) {
      return proposition.substring(4);
    } else if (proposition.startsWith('Not ')) {
      return proposition.substring(4);
    }
  }

  return `¬${proposition}`;
}

/**
 * Get a subset of an object's properties
 * 
 * @param obj Object to get properties from
 * @param keys Keys to include
 * @returns New object with only the specified properties
 */
export function pick<T extends object, K extends keyof T>(
  obj: T, 
  keys: K[]
): Pick<T, K> {
  return keys.reduce((result, key) => {
    if (key in obj) {
      result[key] = obj[key];
    }
    return result;
  }, {} as Pick<T, K>);
}

/**
 * Omit properties from an object
 * 
 * @param obj Object to omit properties from
 * @param keys Keys to exclude
 * @returns New object without the specified properties
 */
export function omit<T extends object, K extends keyof T>(
  obj: T, 
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  keys.forEach(key => {
    delete result[key];
  });
  return result as Omit<T, K>;
}
