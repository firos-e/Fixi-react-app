import API from "./axios";

export const getUnreadChatSummary = async () => {
  try {
    const response = await API.get("/chat/summary");
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch unread summary" };
  }
};

export const getBookingMessages = async (bookingId) => {
  try {
    const response = await API.get(`/chat/booking/${bookingId}/messages`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch chat messages" };
  }
};

export const markBookingMessagesRead = async (bookingId) => {
  try {
    const response = await API.patch(`/chat/booking/${bookingId}/read`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to mark messages as read" };
  }
};

export const sendBookingMessage = async (bookingId, text) => {
  try {
    const response = await API.post(`/chat/booking/${bookingId}/messages`, { text });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to send message" };
  }
};
