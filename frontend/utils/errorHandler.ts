/**
 * Utility function to safely format error messages for Alert dialogs
 * Handles cases where FastAPI returns errors as arrays or strings
 */
export const formatErrorMessage = (error: any, fallbackMessage: string = 'An error occurred'): string => {
  try {
    const detail = error?.response?.data?.detail;
    
    // If detail is an array (validation errors), join them
    if (Array.isArray(detail)) {
      return detail.map((err: any) => {
        if (typeof err === 'string') return err;
        if (err.msg) return err.msg;
        if (err.message) return err.message;
        return JSON.stringify(err);
      }).join('\n');
    }
    
    // If detail is a string, return it
    if (typeof detail === 'string') {
      return detail;
    }
    
    // If detail is an object with message property
    if (detail && typeof detail === 'object' && detail.message) {
      return detail.message;
    }
    
    // Fallback to error message if available
    if (error?.message) {
      return error.message;
    }
    
    // Return fallback
    return fallbackMessage;
  } catch (e) {
    console.error('Error formatting error message:', e);
    return fallbackMessage;
  }
};
