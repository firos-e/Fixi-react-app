import { io } from "socket.io-client";

let socketInstance = null;

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const configuredSocketUrl = import.meta.env.VITE_SOCKET_URL?.trim();

const defaultSocketUrl = configuredApiUrl
  ? configuredApiUrl.replace(/\/api\/?$/, "")
  : "http://localhost:5000";

const socketUrl = configuredSocketUrl || defaultSocketUrl;

export const connectChatSocket = (token) => {
  if (!token) {
    return null;
  }

  if (socketInstance) {
    socketInstance.auth = { token };
    if (!socketInstance.connected) {
      socketInstance.connect();
    }
    return socketInstance;
  }

  socketInstance = io(socketUrl, {
    autoConnect: true,
    auth: { token }
  });

  return socketInstance;
};

export const disconnectChatSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};
