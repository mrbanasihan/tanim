// canAccessFeature
// Check if user role has permission for specific feature
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

// getVisibleCropTypes
// Get crop types visible to user based on role and assigned crop groups
export const getVisibleCropTypes = (userRole, cropGroups, allCropTypes) => {
  const selectedGroup = getSelectedCropGroup(userRole, cropGroups);
  if (selectedGroup) {
    return Object.keys(CROP_CATALOG[selectedGroup] || {});
  }

  return allCropTypes || [];
};

// filterByCropGroup
// Filter items by crop group based on user role and permissions
export const filterByCropGroup = (items, userRole, cropGroups) => {
  const inputItems = Array.isArray(items) ? items : [];

  const allowedGroups =
    userRole === "admin"
      ? CROP_GROUPS
      : Array.isArray(cropGroups) && cropGroups.length > 0
        ? cropGroups.filter((group) => CROP_GROUPS.includes(group))
        : ["researcher", "staff"].includes(userRole)
          ? ["legumes"]
          : [];

  if (allowedGroups.length === 0) {
    return [];
  }

  const selectedGroup = getSelectedCropGroup(userRole, allowedGroups);
  const effectiveGroups =
    selectedGroup && allowedGroups.includes(selectedGroup)
      ? [selectedGroup]
      : allowedGroups;

  const visibleCrops = new Set();
  effectiveGroups.forEach((group) => {
    Object.keys(CROP_CATALOG[group] || {}).forEach((crop) => {
      visibleCrops.add(crop);
    });
  });

  return inputItems.filter((item) => visibleCrops.has(item.crop_type));
};

export const getCurrentCropGroup = (userRole, cropGroups) =>
  getSelectedCropGroup(userRole, cropGroups);
