import { io } from "socket.io-client";

let socketInstance = null;

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

  socketInstance = io("http://localhost:5000", {
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
