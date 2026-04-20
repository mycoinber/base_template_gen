import { defineEventHandler } from "h3";
import { $fetch } from "ofetch";
import type { TLSSocket } from "node:tls";

const isTlsSocket = (socket: unknown): socket is TLSSocket =>
  Boolean(socket && typeof socket === "object" && "encrypted" in socket);

export default defineEventHandler(async (event) => {
  if (event.path === "/robots.txt") {
    const runtimeConfig = useRuntimeConfig();
    const backHost = runtimeConfig.server.backHost || "http://localhost:3077";
    const siteId = runtimeConfig.server.siteId || runtimeConfig.public.siteId || "default-id";

    const host = event.node.req.headers["host"] || "localhost:3000";
    const proto =
      event.node.req.headers["x-forwarded-proto"] ||
      (isTlsSocket(event.node.req.socket) && event.node.req.socket.encrypted
        ? "https"
        : "http");
    const baseUrl = `${proto}://${host}`;
    const siteUrl = baseUrl;

    try {
      const robotsContent = await $fetch(
        `${backHost}/sites/robots?siteId=${siteId}`
      );
      const finalContent = robotsContent.includes("Sitemap")
        ? robotsContent
        : `${robotsContent.trim()}\nSitemap: ${siteUrl}/sitemap.xml`;

      event.node.res.setHeader("Content-Type", "text/plain");
      event.node.res.end(finalContent);
    } catch {
      const defaultContent = `
User-agent: *
Disallow: /
Sitemap: ${siteUrl}/sitemap.xml
      `.trim();

      event.node.res.setHeader("Content-Type", "text/plain");
      event.node.res.end(defaultContent);
    }
  }
});
