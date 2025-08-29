// Utility functions for currency formatting

/**
 * Formats a number to Indonesian currency format with thousand separators
 * @param value - The number to format
 * @returns Formatted string with thousand separators (e.g., "10,000")
 */
export const formatCurrency = (value: number | string): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
  return numValue.toLocaleString('id-ID');
};

/**
 * Removes all non-digit characters from a string
 * @param value - The string to clean
 * @returns String containing only digits
 */
export const removeNonDigits = (value: string): string => {
  return value.replace(/\D/g, '');
};

/**
 * Formats currency input while typing - shows formatted value but stores raw digits
 * @param value - The raw input value
 * @returns Formatted string for display
 */
export const formatCurrencyInput = (value: string): string => {
  const digits = removeNonDigits(value);
  if (digits === '') return '';
  const numValue = parseInt(digits, 10);
  return formatCurrency(numValue);
};

/**
 * Converts formatted currency string back to number
 * @param formattedValue - The formatted string (e.g., "10,000")
 * @returns Number value
 */
export const parseFormattedCurrency = (formattedValue: string): number => {
  const digits = removeNonDigits(formattedValue);
  return parseInt(digits, 10) || 0;
};