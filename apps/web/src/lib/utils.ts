import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getErrorMessage(error: any, fallback = 'An error occurred'): string {
  if (error?.response?.data?.detail) {
    const detail = error.response.data.detail;
    
    if (typeof detail === 'string') {
      return detail;
    } else if (Array.isArray(detail)) {
      // Handle Pydantic validation errors with field mapping
      return detail.map((err: any) => {
        const fieldName = err.loc && err.loc.length > 0 ? err.loc[err.loc.length - 1] : 'field';
        const fieldLabel = getFieldLabel(fieldName);
        const enhancedMessage = enhanceErrorMessage(fieldName, err.msg, err.type);
        return `${fieldLabel}: ${enhancedMessage}`;
      }).join('; ');
    } else {
      return 'Validation error occurred';
    }
  }
  
  // Handle standard error messages
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  return fallback;
}

function getFieldLabel(fieldName: string): string {
  const fieldLabels: Record<string, string> = {
    'username': 'Username',
    'password': 'Password',
    'email': 'Email',
    'first_name': 'First Name',
    'last_name': 'Last Name',
    'name': 'Name',
    'description': 'Description',
    'role': 'Role',
    'is_active': 'Status',
    'current_password': 'Current Password',
    'new_password': 'New Password',
    'confirm_password': 'Confirm Password',
    'projectId': 'Project',
    'file': 'File',
    'tags': 'Tags'
  };
  
  return fieldLabels[fieldName] || fieldName.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function enhanceErrorMessage(fieldName: string, message: string, errorType: string): string {
  // Enhanced field-specific error messages
  const fieldSpecificMessages: Record<string, Record<string, string>> = {
    username: {
      'too_short': 'must be at least 3 characters long',
      'too_long': 'must be no more than 50 characters long',
      'string_pattern_mismatch': 'can only contain letters, numbers, hyphens, and underscores',
      'missing': 'is required'
    },
    password: {
      'too_short': 'must be at least 6 characters long',
      'missing': 'is required'
    },
    new_password: {
      'too_short': 'must be at least 6 characters long',
      'missing': 'is required'
    },
    current_password: {
      'missing': 'is required'
    },
    first_name: {
      'too_long': 'is too long'
    },
    last_name: {
      'too_long': 'is too long'
    },
    email: {
      'missing': 'is required',
      'string_pattern_mismatch': 'must be a valid email address'
    },
    name: {
      'missing': 'is required',
      'too_short': 'must be at least 1 character long',
      'too_long': 'must be no more than 255 characters long'
    },
    file: {
      'missing': 'is required',
      'too_large': 'is too large'
    }
  };

  // Check for field-specific enhanced messages
  if (fieldSpecificMessages[fieldName] && fieldSpecificMessages[fieldName][errorType]) {
    return fieldSpecificMessages[fieldName][errorType];
  }

  // Check for generic error type enhancements
  if (errorType === 'missing') {
    return 'is required';
  } else if (errorType === 'too_short') {
    return message.toLowerCase();
  } else if (errorType === 'too_long') {
    return message.toLowerCase();
  } else if (errorType === 'string_pattern_mismatch') {
    if (fieldName === 'username') {
      return 'can only contain letters, numbers, hyphens, and underscores';
    } else if (fieldName === 'email') {
      return 'must be a valid email address';
    }
    return 'format is invalid';
  }

  // Return original message if no enhancement available
  return message.toLowerCase();
}

// Format file size utility
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Format relative time utility
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const target = new Date(date);
  const diffInMs = now.getTime() - target.getTime();
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInSeconds < 30) {
    return 'Just now';
  } else if (diffInSeconds < 60) {
    return `${diffInSeconds}s ago`;
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  } else {
    return target.toLocaleDateString();
  }
}

// Truncate text utility
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// Debounce utility for search and form inputs
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}