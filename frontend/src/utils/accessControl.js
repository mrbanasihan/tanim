// Role-based access control utilities for frontend

export const canAccessFeature = (userRole, feature) => {
  const featureAccess = {
    admin: [
      "view_dashboard",
      "view_seeds",
      "create_seed",
      "edit_seed",
      "delete_seed",
      "view_transactions",
      "create_transaction",
      "checkout_transaction",
      "disposal_transaction",
      "view_germination",
      "create_germination",
      "view_reports",
      "view_notifications",
    ],
    researcher: [
      "view_dashboard",
      "view_seeds",
      "create_seed",
      "edit_seed",
      "view_transactions",
      "create_transaction",
      "checkout_transaction",
      "view_germination",
      "create_germination",
      "view_reports",
      "view_notifications",
    ],
    staff: [
      "view_dashboard",
      "view_seeds",
      "create_seed",
      "edit_seed",
      "view_transactions",
      "create_transaction",
      "checkout_transaction",
      "view_germination",
      "view_notifications",
    ],
    guest: [
      "view_dashboard",
      "view_seeds",
      "view_transactions",
      "create_transaction",
      "checkout_transaction",
    ],
  };

  return featureAccess[userRole]?.includes(feature) || false;
};

export const getVisibleCropTypes = (userRole, cropGroups, allCropTypes) => {
  // Admin can see all crop types
  if (userRole === "admin") {
    return allCropTypes;
  }

  // Map crop groups to their crop types
  const cropGroupMap = {
    legumes: ["soybean", "mungbean", "peanut"],
    cereals: ["rice", "corn", "wheat"],
    vegetables: ["tomato", "lettuce", "carrot"],
  };

  // Combine all crop types from user's assigned crop groups
  const visibleTypes = new Set();
  (cropGroups || []).forEach((group) => {
    (cropGroupMap[group] || []).forEach((crop) => visibleTypes.add(crop));
  });

  return Array.from(visibleTypes);
};

export const filterByCropGroup = (items, userRole, cropGroups) => {
  // Admin sees all items
  if (userRole === "admin") {
    return items;
  }

  const effectiveCropGroups =
    Array.isArray(cropGroups) && cropGroups.length > 0
      ? cropGroups
      : ["researcher", "staff"].includes(userRole)
        ? ["legumes"]
        : [];

  if (effectiveCropGroups.length === 0) {
    return [];
  }

  // Get visible crop types for this user
  const cropGroupMap = {
    legumes: ["soybean", "mungbean", "peanut"],
    cereals: ["rice", "corn", "wheat"],
    vegetables: ["tomato", "lettuce", "carrot"],
  };

  const visibleCrops = new Set();
  effectiveCropGroups.forEach((group) => {
    (cropGroupMap[group] || []).forEach((crop) => visibleCrops.add(crop));
  });

  // Filter items by visible crop types
  return items.filter((item) => visibleCrops.has(item.crop_type));
};
