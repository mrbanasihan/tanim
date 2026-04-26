const db = require("../services/db");
const { CROP_CATALOG } = require("../constants/cropCatalog");

const AccessControlUtils = {
  // Get all crop groups assigned to a user
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

  // Check if user can access a specific crop group
  async canAccessCropGroup(userId, userRole, cropGroup) {
    // Admins can access all crop groups
    if (userRole === "admin") {
      return true;
    }

    // Others must have explicit assignment
    const cropGroups = await this.getUserCropGroups(userId);
    return cropGroups.includes(cropGroup);
  },

  // Get all crops for a specific crop group
  getCropsForGroup(cropGroup) {
    return Object.keys(CROP_CATALOG[cropGroup] || {});
  },

  // Get varieties for a crop within a crop group
  getVarietiesForCrop(crop) {
    for (const groupCatalog of Object.values(CROP_CATALOG)) {
      if (groupCatalog[crop]) {
        return groupCatalog[crop];
      }
    }

    return [];
  },

  // Check if user has access to specific features based on role
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
        "view_transactions",
        "create_transaction",
        "checkout_transaction",
        "view_germination",
        "create_germination",
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
        "view_notifications",
      ],
      guest: [
        "view_seeds",
        "view_transactions",
        "create_transaction",
        "checkout_transaction",
      ],
    };

    return featureAccess[userRole]?.includes(feature) || false;
  },
};

module.exports = AccessControlUtils;
