// Email validation
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
  return emailRegex.test(email);
};

// Password validation (minimum 6 characters)
const isValidPassword = (password) => {
  return password && password.length >= 6;
};

// Name validation (not empty, only letters, spaces, hyphens)
const isValidName = (name) => {
  if (!name || typeof name !== "string") return false;
  const nameRegex = /^[A-Za-z\s\-']+$/;
  return nameRegex.test(name.trim());
};

// Quantity validation (positive number, max 2 decimal places)
const isValidQuantity = (quantity) => {
  const num = parseFloat(quantity);
  if (isNaN(num)) return false;
  if (num <= 0) return false;
  // Check for max 2 decimal places
  const decimalPlaces = (num.toString().split(".")[1] || "").length;
  return decimalPlaces <= 2;
};

// Date validation (YYYY-MM-DD format and not future date)
const isValidDate = (dateString, allowFuture = false) => {
  if (!dateString) return true; // Allow optional dates

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return false;

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return false;

  if (!allowFuture && date > new Date()) return false;

  return true;
};

// UUID validation
const isValidUUID = (uuid) => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Percentage validation (0-100)
const isValidPercentage = (value) => {
  const num = parseInt(value);
  if (isNaN(num)) return false;
  return num >= 0 && num <= 100;
};

// Enum validation
const isValidEnum = (value, allowedValues) => {
  return allowedValues.includes(value);
};

// Seed lot validation
const validateSeedLot = (data) => {
  const errors = [];

  if (!data.batch_name || data.batch_name.trim() === "") {
    errors.push("Batch name is required");
  }

  if (!data.crop_type) {
    errors.push("Crop type is required");
  }

  if (!data.variety) {
    errors.push("Variety is required");
  }

  // Gross weight is required for creation, optional for updates
  // Also check initial_quantity as fallback for backwards compatibility
  const weight = data.gross_weight || data.initial_quantity;
  if (weight !== undefined && weight !== "" && !isValidQuantity(weight)) {
    errors.push("Gross weight must be a positive number");
  }

  if (
    data.cleaned_quantity !== undefined &&
    data.cleaned_quantity !== "" &&
    !isValidQuantity(data.cleaned_quantity)
  ) {
    errors.push("Cleaned quantity must be a positive number");
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

// Transaction validation
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

  return {
    isValid: errors.length === 0,
    errors,
  };
};

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

// User validation
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

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Project validation
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

// Temperature reading validation
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

// Sanitization functions
const sanitizeString = (str) => {
  if (!str || typeof str !== "string") return "";
  return str.trim().replace(/[<>]/g, ""); // Remove potential HTML tags
};

const sanitizeEmail = (email) => {
  if (!email || typeof email !== "string") return "";
  return email.toLowerCase().trim();
};

const sanitizeQuantity = (quantity) => {
  const num = parseFloat(quantity);
  return isNaN(num) ? 0 : Math.abs(num);
};

module.exports = {
  // Validators
  isValidEmail,
  isValidPassword,
  isValidName,
  isValidQuantity,
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
  sanitizeEmail,
  sanitizeQuantity,
};
