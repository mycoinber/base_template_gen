import axios from "axios";
import Cookies from "js-cookie";

const resolveRequestOrigin = (event) => {
  if (!event) return "";
  const headers = event.node.req.headers;
  const proto =
    headers["x-forwarded-proto"] ||
    (event.node.req.connection && event.node.req.connection.encrypted
      ? "https"
      : "http");
  const host =
    headers["x-forwarded-host"] || headers["host"] || "localhost:3000";
  return `${proto}://${host}`;
};

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig();
  const event = import.meta.server ? useRequestEvent() : null;

  let baseURL = "/api";
  if (import.meta.server) {
    const origin = resolveRequestOrigin(event);
    if (origin) {
      baseURL = `${origin}/api`;
    } else if (config.server.backHost) {
      baseURL = config.server.backHost;
    } else {
      throw new Error("Unable to resolve API base URL on the server side");
    }
  }

  const instance = axios.create({ baseURL });

  instance.interceptors.request.use(
    (config) => {
      if (import.meta.server) {
        return config; // На сервере не используем токены
      }

      const token = Cookies.get("token");

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  nuxtApp.provide("axios", instance);
});
