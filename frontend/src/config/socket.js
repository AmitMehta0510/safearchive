import { io } from "socket.io-client";
import { BASE_URL } from "./api";

// Initialize Socket.IO connection
const socket = io(BASE_URL, {
  autoConnect: true,
  transports: ["websocket", "polling"],
});

export default socket;
