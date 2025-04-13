import { User } from "@shared/schema";

// Helper function to get current user from localStorage
export const getCurrentUser = (): User | null => {
  const storedUser = localStorage.getItem("user");
  if (storedUser) {
    try {
      return JSON.parse(storedUser);
    } catch (error) {
      localStorage.removeItem("user");
    }
  }
  return null;
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  return !!getCurrentUser();
};

// Check if user is admin
export const isAdmin = (): boolean => {
  const user = getCurrentUser();
  return user?.role === "admin";
};

// Check if user status is active
export const isActive = (): boolean => {
  const user = getCurrentUser();
  return user?.status === "active";
};

// Store user in localStorage
export const setUser = (user: User): void => {
  localStorage.setItem("user", JSON.stringify(user));
};

// Clear user from localStorage
export const clearUser = (): void => {
  localStorage.removeItem("user");
};
