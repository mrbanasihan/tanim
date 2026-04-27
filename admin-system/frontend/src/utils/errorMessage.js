export const getErrorMessage = (error, fallback) => {
  const apiError = error?.response?.data?.error;

  if (typeof apiError === "string") {
    return apiError;
  }

  if (apiError && typeof apiError === "object") {
    return apiError.message || apiError.error || JSON.stringify(apiError);
  }

  if (error?.message) {
    return error.message;
  }

  return fallback;
};
