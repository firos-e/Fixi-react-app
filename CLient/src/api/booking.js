import API from "./axios";

// ✅ Get nearby technicians
export const getNearbyTechnicians = async (service, coordinates) => {
  try {
    const [longitude, latitude] = coordinates;
    const res = await API.get("/booking/nearby-technicians", {
      params: { service, longitude, latitude }
    });
    return res.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch technicians" };
  }
};

// ✅ Create a booking
export const createBooking = async (bookingData) => {
  try {
    const res = await API.post("/booking/create", bookingData);
    return res.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to create booking" };
  }
};

// ✅ Get user bookings
export const getUserBookings = async () => {
  try {
    const res = await API.get("/booking/user-bookings");
    return res.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch bookings" };
  }
};

export const getTechBookings = async () => {
  try {
    const res = await API.get("/booking/tech-bookings");
    return res.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch technician bookings" };
  }
};

export const updateBookingStatus = async (bookingId, status) => {
  try {
    const res = await API.patch(`/booking/${bookingId}/status`, { status });
    return res.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to update booking status" };
  }
};
