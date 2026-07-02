import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";
import { getSelectedCropGroup } from "../constants/cropCatalog";

const AuthContext = createContext();

// useAuth
// Custom hook to access authentication context (user, login, logout, loading)
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// AuthProvider
// Context provider for authentication state and user session management
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCropGroup, setSelectedCropGroup] = useState(
    localStorage.getItem("selectedCropGroup") || "legumes"
  );

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      // Verify token and get user info
      api
        .get("/auth/me")
        .then((response) => {
          setUser(response.data.user);
        })
        .catch(() => {
          localStorage.removeItem("token");
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  // Sync selected crop group when user changes
  useEffect(() => {
    if (user) {
      const active = getSelectedCropGroup(user.role, user.crop_groups);
      if (active) {
        localStorage.setItem("selectedCropGroup", active);
        setSelectedCropGroup(active);
      }
    }
  }, [user]);

  const login = async (email, password) => {
    try {
      const response = await api.post("/auth/login", { email, password });
      const { token, user: userData } = response.data;
      localStorage.setItem("token", token);
      setUser(userData);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.error ||
          error.response?.data?.message ||
          "Login failed",
      };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  const changeCropGroup = (cropGroup) => {
    localStorage.setItem("selectedCropGroup", cropGroup);
    setSelectedCropGroup(cropGroup);
  };

  const value = {
    user,
    login,
    logout,
    loading,
    selectedCropGroup,
    changeCropGroup,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
