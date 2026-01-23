/**
 * Utility functions for handling datetime-local inputs correctly
 * Fixes timezone issues between browser, input fields, and backend
 */

/**
 * Get local date-time string for datetime-local input (YYYY-MM-DDTHH:mm)
 * This preserves the user's local time without timezone conversion
 * 
 * @param date - Optional Date object. If not provided, uses current time
 * @returns String formatted for datetime-local input
 */
export const getLocalDateTimeString = (date?: Date): string => {
    const d = date || new Date();
    // Adjust for timezone offset to keep local time in the ISO string
    const offsetMs = d.getTimezoneOffset() * 60 * 1000;
    const localTime = new Date(d.getTime() - offsetMs);
    return localTime.toISOString().slice(0, 16);
};

/**
 * Convert datetime-local input string to UTC ISO string for backend
 * The browser treats the input value as local time, so we create a Date object
 * which captures the timezone, then convert to UTC
 * 
 * @param localDateTimeString - String from datetime-local input (YYYY-MM-DDTHH:mm)
 * @returns UTC ISO string for backend storage
 */
export const convertLocalToUTC = (localDateTimeString: string): string => {
    // Create Date object - browser automatically treats this as local timezone
    const localDate = new Date(localDateTimeString);
    // Convert to UTC ISO string
    return localDate.toISOString();
};

/**
 * Convert UTC ISO string from backend to local datetime-local format
 * Used when populating inputs with existing data
 * 
 * @param utcISOString - UTC ISO string from backend
 * @returns String formatted for datetime-local input
 */
export const convertUTCToLocal = (utcISOString: string): string => {
    const date = new Date(utcISOString);
    return getLocalDateTimeString(date);
};
