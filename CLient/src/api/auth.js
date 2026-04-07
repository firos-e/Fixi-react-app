import API from "./axios";

// 🔐 SIGNUP USER
export const signupUser = async (formData) => {
  try {
    const response = await API.post("/auth/signup", formData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Signup failed" };
  }
};

// 🔑 LOGIN USER
export const loginUser = async (formData) => {
  try {
    const response = await API.post("/auth/login", formData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Login failed" };
  }
};

export const getCurrentUser = async () => {
  try {
    const response = await API.get("/auth/me");
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch current user" };
  }
};

export const updateProfile = async (profileData) => {
  try {
    const response = await API.patch("/auth/profile", profileData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to update profile" };
  }
};
