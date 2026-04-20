// server/middleware/detectBot.js
import { defineEventHandler, getHeader } from "h3";

export default defineEventHandler((event) => {
  const userAgent = getHeader(event, "user-agent")?.toLowerCase() || "";
  const clientIp = event.node.req.socket.remoteAddress || "";

  // Пример проверки IP (диапазон Googlebot: 66.249.64.0 - 66.249.95.255)
  const isGoogleIp = clientIp.startsWith("66.249.");
  const isBot = /googlebot|lighthouse|pagespeed/i.test(userAgent) || isGoogleIp;

  event.context.isBot = isBot;
});
