/**
 * INTELLIGENT CSS CLASS NAME MERGER
 * 
 * This utility function merges CSS class names with conflict resolution.
 * It mimics the behavior of tailwind-merge without external dependencies.
 * 
 * Key Features:
 * - Accepts strings, arrays, objects, or any combination
 * - Resolves Tailwind CSS utility conflicts (e.g., p-2 vs px-4)
 * - "Last class wins" strategy for conflicting utilities
 * - Dependency-free implementation
 */

/**
 * Flattens input arguments into a single array of class name strings
 */
function flattenClasses(...args) {
  const result = [];
  
  for (const arg of args) {
    if (!arg) continue;
    
    if (typeof arg === 'string') {
      // Split space-separated classes
      result.push(...arg.split(/\s+/).filter(Boolean));
    } else if (Array.isArray(arg)) {
      // Recursively flatten arrays
      result.push(...flattenClasses(...arg));
    } else if (typeof arg === 'object') {
      // Process object: include keys where value is truthy
      for (const [key, value] of Object.entries(arg)) {
        if (value) {
          result.push(key);
        }
      }
    }
  }
  
  return result;
}

/**
 * Extracts the conflict key for a Tailwind class
 * Classes with the same conflict key will override each other
 */
function getConflictKey(className) {
  // Handle arbitrary values like bg-[#fff] or w-[100px]
  if (className.includes('[')) {
    const base = className.split('-[')[0];
    return base;
  }
  
  // Map directional modifiers to their base property
  const directionalMap = {
    // Padding
    'px': 'p', 'py': 'p', 'pt': 'p', 'pr': 'p', 'pb': 'p', 'pl': 'p', 'ps': 'p', 'pe': 'p',
    // Margin
    'mx': 'm', 'my': 'm', 'mt': 'm', 'mr': 'm', 'mb': 'm', 'ml': 'm', 'ms': 'm', 'me': 'm',
    // Border width
    'border-x': 'border', 'border-y': 'border', 'border-t': 'border', 
    'border-r': 'border', 'border-b': 'border', 'border-l': 'border',
    // Border radius
    'rounded-t': 'rounded', 'rounded-r': 'rounded', 'rounded-b': 'rounded', 'rounded-l': 'rounded',
    'rounded-tl': 'rounded', 'rounded-tr': 'rounded', 'rounded-br': 'rounded', 'rounded-bl': 'rounded',
    // Inset
    'inset-x': 'inset', 'inset-y': 'inset', 'start': 'inset', 'end': 'inset',
    // Gap
    'gap-x': 'gap', 'gap-y': 'gap',
    // Space
    'space-x': 'space', 'space-y': 'space',
    // Scroll margin
    'scroll-mx': 'scroll-m', 'scroll-my': 'scroll-m', 'scroll-mt': 'scroll-m',
    'scroll-mr': 'scroll-m', 'scroll-mb': 'scroll-m', 'scroll-ml': 'scroll-m',
    // Scroll padding
    'scroll-px': 'scroll-p', 'scroll-py': 'scroll-p', 'scroll-pt': 'scroll-p',
    'scroll-pr': 'scroll-p', 'scroll-pb': 'scroll-p', 'scroll-pl': 'scroll-p',
  };
  
  // Get the first part of the class (before the first hyphen after any prefix)
  const parts = className.split('-');
  
  // Check if it's a two-part directional modifier (e.g., 'border-x')
  if (parts.length >= 2) {
    const twoPartKey = `${parts[0]}-${parts[1]}`;
    if (directionalMap[twoPartKey]) {
      return directionalMap[twoPartKey];
    }
  }
  
  // Check if it's a single-part directional modifier (e.g., 'px')
  const firstPart = parts[0];
  if (directionalMap[firstPart]) {
    return directionalMap[firstPart];
  }
  
  // For most utilities, the first part is the conflict key
  // Examples: bg-red-500 → 'bg', text-lg → 'text', w-full → 'w'
  return firstPart;
}

/**
 * Main export: Intelligent class name merger
 * 
 * @param {...(string|Array|Object)} args - Class names in various formats
 * @returns {string} Merged class names as a single string
 * 
 * @example
 * cn('p-2', 'px-4') // Returns: 'px-4' (px-4 wins)
 * cn('bg-red-500', 'bg-blue-500') // Returns: 'bg-blue-500'
 * cn('text-sm font-bold', { 'text-lg': true }) // Returns: 'font-bold text-lg'
 */
export function cn(...args) {
  const classes = flattenClasses(...args);
  const conflictMap = new Map();
  
  // Process each class, storing by conflict key (last one wins)
  for (const className of classes) {
    const key = getConflictKey(className);
    conflictMap.set(key, className);
  }
  
  // Return the final, de-conflicted class list as a string
  return Array.from(conflictMap.values()).join(' ');
}

// Default export for easier importing
export default cn;