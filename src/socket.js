import { io } from "socket.io-client";

const socketURL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000"
    : window.location.origin;

export const socket = io(socketURL, {
  autoConnect: true,
  transports: ["websocket", "polling"],
});

window.gupshupSocket = socket;

socket.on("connect", () => {
  console.log("====================================");
  console.log("SOCKET.JS CONNECTED");
  console.log("SOCKET ID:", socket.id);
  console.log("SOCKET SERVER:", socketURL);
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
