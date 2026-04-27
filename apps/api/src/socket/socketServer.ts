import { Server as SocketIOServer } from "socket.io";
import type { Server as HttpServer } from "http";
import { createClient } from "@supabase/supabase-js";
import { logger } from "../utils/logger.js";

export type SocketIOInstance = SocketIOServer;

export function createSocketServer(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000",
      credentials: true,
    },
    path: "/socket.io",
  });

  io.use(async (socket, next) => {
    const token =
      socket.handshake.auth["token"] as string | undefined ??
      (socket.handshake.headers["authorization"] as string | undefined)?.slice(7);

    if (!token) {
      return next(new Error("UNAUTHORIZED: No token provided"));
    }

    const supabaseUrl = process.env["SUPABASE_URL"];
    const supabaseAnonKey = process.env["SUPABASE_ANON_KEY"];

    if (!supabaseUrl || !supabaseAnonKey) {
      return next(new Error("Server misconfiguration"));
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return next(new Error("UNAUTHORIZED: Invalid token"));
    }

    socket.data["userId"] = user.id;
    next();
  });

  io.on("connection", (socket) => {
    const userId = socket.data["userId"] as string;
    logger.debug({ socketId: socket.id, userId }, "Socket connected");

    socket.on("join_conversation", (conversationId: string) => {
      socket.join(`conv_${conversationId}`);
      logger.debug({ socketId: socket.id, conversationId }, "Joined conversation room");
    });

    socket.on("leave_conversation", (conversationId: string) => {
      socket.leave(`conv_${conversationId}`);
    });

    socket.on("join_org", (orgSlug: string) => {
      socket.join(`org_${orgSlug}`);
    });

    socket.on("start_typing", (data: { conversationId: string }) => {
      socket.to(`conv_${data.conversationId}`).emit("agent_typing", {
        conversationId: data.conversationId,
        agentId: userId,
        isTyping: true,
      });
    });

    socket.on("stop_typing", (data: { conversationId: string }) => {
      socket.to(`conv_${data.conversationId}`).emit("agent_typing", {
        conversationId: data.conversationId,
        agentId: userId,
        isTyping: false,
      });
    });

    socket.on("disconnect", (reason) => {
      logger.debug({ socketId: socket.id, userId, reason }, "Socket disconnected");
    });
  });

  return io;
}

export function emitNewMessage(
  io: SocketIOServer,
  conversationId: string,
  orgSlug: string,
  message: unknown
) {
  io.to(`conv_${conversationId}`).emit("new_message", message);
  io.to(`org_${orgSlug}`).emit("new_message", { conversationId, message });
}

export function emitConversationAssigned(
  io: SocketIOServer,
  conversationId: string,
  orgSlug: string,
  agentId: string
) {
  io.to(`org_${orgSlug}`).emit("conversation_assigned", { conversationId, agentId });
}

export function emitConversationResolved(
  io: SocketIOServer,
  conversationId: string,
  orgSlug: string
) {
  io.to(`org_${orgSlug}`).emit("conversation_resolved", { conversationId });
}
