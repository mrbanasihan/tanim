// toTitleCase
// Convert string value to title case format (first letter of each word capitalized)
export const toTitleCase = (value) => {
  if (!value && value !== 0) return "";

  return String(value)
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};
