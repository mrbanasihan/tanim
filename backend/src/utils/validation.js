// isValidEmail
// Verify email format matches @domain.com pattern
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^@\s]+\.com$/i;
  return emailRegex.test(email);
};

// isValidPassword
// Check password meets minimum 6 character requirement
const isValidPassword = (password) => {
  return password && password.length >= 6;
};

// isValidName
// Validate name contains only letters, spaces, and hyphens
const isValidName = (name) => {
  if (!name || typeof name !== "string") return false;
  const nameRegex = /^[A-Za-z\s\-']+$/;
  return nameRegex.test(name.trim());
};

// isValidQuantity
// Verify positive number with max 2 decimal places
const isValidQuantity = (quantity) => {
  const num = parseFloat(quantity);
  if (isNaN(num)) return false;
  if (num <= 0) return false;
  // Check for max 2 decimal places
  const decimalPlaces = (num.toString().split(".")[1] || "").length;
  return decimalPlaces <= 2;
};

// isValidContactNumber
// Validate Philippine (+63) contact number format (09XXXXXXXXX)
const isValidContactNumber = (contact) => {
  return /^09\d{9}$/.test(String(contact || ""));
};

// isValidInteger
// Check value is positive whole number
const isValidInteger = (value) => {
  return /^\d+$/.test(String(value ?? ""));
};

// isValidDate
// Verify date format (YYYY-MM-DD) and optionally reject future dates
const isValidDate = (dateString, allowFuture = false) => {
  if (!dateString) return true;

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return false;

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return false;

  if (!allowFuture && date > new Date()) return false;

  return true;
};

// isValidUUID
// Check value is valid UUID format (RFC 4122)
const isValidUUID = (uuid) => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// isValidPercentage
// Validate value is between 0 and 100
const isValidPercentage = (value) => {
  const num = parseInt(value);
  if (isNaN(num)) return false;
  return num >= 0 && num <= 100;
};

// isValidEnum
// Check value is in allowed values array
const isValidEnum = (value, allowedValues) => {
  return allowedValues.includes(value);
};

// validateSeedLot
// Check seed lot data for crop type, variety, weights, and moisture content
const validateSeedLot = (data, options = {}) => {
  const errors = [];
  const { requireGrossWeight = false } = options;

  // if (!data.batch_name || data.batch_name.trim() === "") {
  //   errors.push("Batch name is required");
  // }

  if (!data.crop_type) {
    errors.push("Crop type is required");
  }

  if (!data.variety) {
    errors.push("Variety is required");
  }

  if (
    data.moisture_content !== undefined &&
    data.moisture_content !== null &&
    data.moisture_content !== ""
  ) {
    const moisture = parseFloat(data.moisture_content);
    if (Number.isNaN(moisture) || moisture < 0 || moisture > 100) {
      errors.push("Moisture content must be between 0 and 100");
    }
  }

  const grossWeight = data.gross_weight ?? data.initial_quantity;
  if (
    requireGrossWeight &&
    (grossWeight === undefined || grossWeight === null || grossWeight === "")
  ) {
    errors.push("Gross weight is required");
  } else if (
    grossWeight !== undefined &&
    grossWeight !== null &&
    grossWeight !== "" &&
    !isValidQuantity(grossWeight)
  ) {
    errors.push("Gross weight must be a positive number");
  }

  if (
    data.cleaned_quantity !== undefined &&
    data.cleaned_quantity !== null &&
    data.cleaned_quantity !== ""
  ) {
    const cleaned = parseFloat(data.cleaned_quantity);
    if (Number.isNaN(cleaned) || cleaned < 0) {
      errors.push("Cleaned quantity must be zero or a positive number");
    }
  }

  if (data.date_received && !isValidDate(data.date_received)) {
    errors.push(
      "Date received must be in YYYY-MM-DD format and cannot be in the future",
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// validateCheckOut
// Verify seed checkout transaction data (seed_id, quantity, recipient, contact)
const validateCheckOut = (data) => {
  const errors = [];

  if (!data.seed_id || !isValidUUID(data.seed_id)) {
    errors.push("Valid seed ID is required");
  }

  if (!data.quantity || !isValidQuantity(data.quantity)) {
    errors.push("Quantity must be a positive number");
  }

  if (!data.recipient || data.recipient.trim() === "") {
    errors.push("Recipient is required");
  }

  if (data.contact && !isValidContactNumber(data.contact)) {
    errors.push("Contact number must be 11 digits and start with 09");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// validateCheckIn
// Check seed check-in transaction (seed_id, quantity)
const validateCheckIn = (data) => {
  const errors = [];

  if (!data.seed_id || !isValidUUID(data.seed_id)) {
    errors.push("Valid seed ID is required");
  }

  if (!data.quantity || !isValidQuantity(data.quantity)) {
    errors.push("Quantity must be a positive number");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// validateDisposal
// Validate seed disposal transaction (seed_id, quantity, disposal purpose)
const validateDisposal = (data) => {
  const errors = [];

  if (!data.seed_id || !isValidUUID(data.seed_id)) {
    errors.push("Valid seed ID is required");
  }

  if (!data.quantity || !isValidQuantity(data.quantity)) {
    errors.push("Quantity must be a positive number");
  }

  if (!data.purpose || data.purpose.trim() === "") {
    errors.push("Purpose is required for disposal");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// validateAdjustment
// Check inventory adjustment data (seed_id, quantity, adjustment purpose)
const validateAdjustment = (data) => {
  const errors = [];

  if (!data.seed_id || !isValidUUID(data.seed_id)) {
    errors.push("Valid seed ID is required");
  }

  const quantity = parseFloat(data.quantity);
  if (isNaN(quantity)) {
    errors.push("Quantity must be a valid number");
  }

  if (!data.purpose || data.purpose.trim() === "") {
    errors.push("Purpose is required for adjustment");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// validateUserRegistration
// Verify user registration data (email, password, name, role)
const validateUserRegistration = (data) => {
  const errors = [];

  if (!data.email || !isValidEmail(data.email)) {
    errors.push("Valid email address is required");
  }

  if (!data.password || !isValidPassword(data.password)) {
    errors.push("Password must be at least 6 characters");
  }

  if (!data.firstName || !isValidName(data.firstName)) {
    errors.push(
      "First name is required and can only contain letters, spaces, and hyphens",
    );
  }

  if (!data.lastName || !isValidName(data.lastName)) {
    errors.push(
      "Last name is required and can only contain letters, spaces, and hyphens",
    );
  }

  if (data.role && !isValidEnum(data.role, ["admin", "staff", "guest"])) {
    errors.push("Role must be one of: admin, staff, guest");
  }

  if (data.email && !isValidEmail(data.email)) {
    errors.push("Email must be in the format @<domain>.com");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// validateProject
// Check project data (name, dates, date order validity)
const validateProject = (data) => {
  const errors = [];

  if (!data.projectName || data.projectName.trim() === "") {
    errors.push("Project name is required");
  }

  if (data.start_date && !isValidDate(data.start_date, true)) {
    errors.push("Start date must be in YYYY-MM-DD format");
  }

  if (data.end_date && !isValidDate(data.end_date, true)) {
    errors.push("End date must be in YYYY-MM-DD format");
  }

  if (data.start_date && data.end_date) {
    const start = new Date(data.start_date);
    const end = new Date(data.end_date);
    if (end < start) {
      errors.push("End date cannot be before start date");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// validateTemperatureReading
// Validate temperature reading data (celsius value within valid range)
const validateTemperatureReading = (data) => {
  const errors = [];

  const temp = parseFloat(data.temp_celsius);
  if (isNaN(temp)) {
    errors.push("Temperature must be a valid number");
  }

  if (data.humidity_percent !== undefined) {
    const humidity = parseFloat(data.humidity_percent);
    if (isNaN(humidity) || humidity < 0 || humidity > 100) {
      errors.push("Humidity must be between 0 and 100");
    }
  }

  if (
    data.status &&
    !isValidEnum(data.status, ["normal", "warning", "critical"])
  ) {
    errors.push("Status must be one of: normal, warning, critical");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// sanitizeString
// Remove whitespace and HTML-like tags from string input
const sanitizeString = (str) => {
  if (!str || typeof str !== "string") return "";
  return str.trim().replace(/[<>]/g, ""); // Remove potential HTML tags
};

// sanitizeTitleCase
// Convert string to title case format with validation
const sanitizeTitleCase = (str) => {
  // Return empty string for undefined, null, or non-string values
  if (!str || typeof str !== "string") return "";

  const sanitized = sanitizeString(str);
  if (!sanitized) return "";

  return sanitized
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

// sanitizeEmail
// Normalize email to lowercase and trim whitespace
const sanitizeEmail = (email) => {
  if (!email || typeof email !== "string") return "";
  return email.toLowerCase().trim();
};

// sanitizeQuantity
// Extract numeric value and ensure absolute value
const sanitizeQuantity = (quantity) => {
  const num = parseFloat(quantity);
  return isNaN(num) ? 0 : Math.abs(num);
};

// sanitizeContactNumber
// Extract digits and limit to 11 characters for Philippine format
const sanitizeContactNumber = (contact) => {
  if (!contact || typeof contact !== "string") return "";
  return contact.replace(/\D/g, "").slice(0, 11);
};

module.exports = {
  // Validators
  isValidEmail,
  isValidPassword,
  isValidName,
  isValidQuantity,
  isValidContactNumber,
  isValidInteger,
  isValidDate,
  isValidUUID,
  isValidPercentage,
  isValidEnum,

  // Object validators
  validateSeedLot,
  validateCheckOut,
  validateCheckIn,
  validateDisposal,
  validateAdjustment,
  validateUserRegistration,
  validateProject,
  validateTemperatureReading,

  // Sanitizers
  sanitizeString,
  sanitizeTitleCase,
  sanitizeEmail,
  sanitizeQuantity,
  sanitizeContactNumber,
};
