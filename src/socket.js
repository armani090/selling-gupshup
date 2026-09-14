import { io } from "socket.io-client";

export const socket = io("http://localhost:5000", {
  autoConnect: true,
  transports: ["websocket", "polling"],
});
window.gupshupSocket = socket;
socket.on("connect", () => {
  console.log("====================================");
  console.log("SOCKET.JS CONNECTED");
  console.log("SOCKET ID:", socket.id);
  console.log("====================================");
});

socket.on("disconnect", (reason) => {
  console.log("SOCKET.JS DISCONNECTED:", reason);
});

socket.on("connect_error", (error) => {
  console.error(
    "SOCKET.JS CONNECTION ERROR:",
    error.message
  );
});