import { io, type Socket } from "socket.io-client";

let socketInstance: Socket | null = null;

export function getSocketClient(): Socket {
  if (socketInstance?.connected) return socketInstance;

  const apiUrl = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";
  const token =
    typeof window !== "undefined"
      ? sessionStorage.getItem("apex_access_token")
      : null;

  socketInstance = io(apiUrl, {
    auth: { token },
    path: "/socket.io",
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socketInstance.on("connect", () => {
    console.debug("[Socket] Connected:", socketInstance?.id);
  });

  socketInstance.on("disconnect", (reason) => {
    console.debug("[Socket] Disconnected:", reason);
  });

  socketInstance.on("connect_error", (err) => {
    console.warn("[Socket] Connection error:", err.message);
  });

  return socketInstance;
}

export function disconnectSocket() {
  socketInstance?.disconnect();
  socketInstance = null;
}
