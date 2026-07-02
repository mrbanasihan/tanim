const db = require("../services/db");
const { CROP_CATALOG } = require("../constants/cropCatalog");

const AccessControlUtils = {
  // getUserCropGroups
  // Retrieve all crop groups assigned to user from database
  async getUserCropGroups(userId) {
    try {
      const query = `
        SELECT DISTINCT crop_group 
        FROM user_crop_group 
        WHERE user_id = $1
        ORDER BY crop_group ASC
      `;
      const result = await db.query(query, [userId]);
      return result.rows.map((row) => row.crop_group);
    } catch (error) {
      console.error("Error fetching user crop groups:", error);
      return [];
    }
  },

  // canAccessCropGroup
  // Verify user has permission to access specific crop group (admin has full access)
  async canAccessCropGroup(userId, userRole, cropGroup) {
    if (userRole === "admin") {
      return true;
    }

    const cropGroups = await this.getUserCropGroups(userId);
    return cropGroups.includes(cropGroup);
  },

  // getCropsForGroup
  // Get list of crops available in specified crop group from catalog
  getCropsForGroup(cropGroup) {
    return Object.keys(CROP_CATALOG[cropGroup] || {});
  },

  // getVarietiesForCrop
  // Retrieve all varieties for crop across all crop groups
  getVarietiesForCrop(crop) {
    for (const groupCatalog of Object.values(CROP_CATALOG)) {
      if (groupCatalog[crop]) {
        return groupCatalog[crop];
      }
    }

    return [];
  },

  // hasFeatureAccess
  // Check if user role has permission for specific feature
  hasFeatureAccess(userRole, feature) {
    const featureAccess = {
      admin: [
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
        "view_seeds",
        "create_seed",
        "edit_seed",
        "delete_seed",
        "view_transactions",
        "create_transaction",
        "checkout_transaction",
        "view_germination",
        "create_germination",
        "view_reports",
        "view_notifications",
      ],
      staff: [
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
      guest: [
        "view_seeds",
        "view_transactions",
        "view_reports",
      ],
    };

    return featureAccess[userRole]?.includes(feature) || false;
  },
};

module.exports = AccessControlUtils;
